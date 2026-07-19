import { existsSync } from "node:fs"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

export type ObsidianMode = "local" | "fallback" | "disabled"

export type ObsidianStatus = {
  mode: ObsidianMode
  enabled: boolean
  writable: boolean
  message: string
}

export type CaptureExportInput = {
  id: string
  text: string
  created_at: string
  links?: CaptureLink[] | null
  media_items?: CaptureMediaItem[] | null
  intake?: CaptureIntakeExport | null
}

export type CaptureLink = {
  url: string
  kind?: string | null
  title?: string | null
}

export type CaptureMediaItem = {
  name: string
  type: string
  size: number
  data_url?: string | null
}

export type CaptureIntakeExport = {
  obsidian_target?: string | null
  agent_status?: string | null
  title?: string | null
  summary?: string | null
  tags?: string[] | null
  key_takeaways?: string[] | null
  what_this_means_for_me?: string | null
}

export type CaptureExportOptions = {
  vaultPath: string | null
  target?: string | null
  previousFilePath?: string | null
}

export type CaptureExport = {
  markdown: string
  relativePath: string
  filePath: string | null
}

function formatLinks(links: CaptureLink[] | null | undefined) {
  const validLinks = (links ?? []).filter((link) => link.url?.trim())
  if (!validLinks.length) return ""

  return `\n\n### Links\n${validLinks
    .map((link) => {
      const kind = link.kind?.trim() || "link"
      const title = link.title?.trim() ? ` - ${link.title.trim()}` : ""
      return `- [${kind}] ${link.url.trim()}${title}`
    })
    .join("\n")}`
}

function formatMediaItems(mediaItems: CaptureMediaItem[] | null | undefined) {
  const validItems = (mediaItems ?? []).filter((item) => item.name?.trim())
  if (!validItems.length) return ""

  return `\n\n### Media\n${validItems
    .map((item) => {
      const size = Number.isFinite(item.size) ? item.size : 0
      const line = `- ${item.name.trim()} (${item.type || "unknown"}, ${size} bytes)`
      return item.data_url?.startsWith("data:image/")
        ? `${line}\n\n![${item.name.trim()}](${item.data_url})`
        : line
    })
    .join("\n")}`
}

function formatHermesPacket(capture: CaptureExportInput) {
  const agentStatus = capture.intake?.agent_status?.trim() || "new"
  const target = capture.intake?.obsidian_target?.trim()
  const targetLine = target ? `\nObsidian target: ${target}` : ""

  return `\n\n## Hermes Intake Packet\nAgent status: ${agentStatus}${targetLine}${formatLinks(
    capture.links,
  )}${formatMediaItems(capture.media_items)}`
}

function formatKeyTakeaways(takeaways: string[] | null | undefined) {
  const items = (takeaways ?? []).filter((item) => item?.trim())
  if (!items.length) return ""

  return `\n\n## Key Takeaways\n${items.map((item) => `- ${item.trim()}`).join("\n")}`
}

function cleanTags(tags: string[] | null | undefined) {
  return (tags ?? [])
    .map((tag) => tag?.trim().replace(/^#/, ""))
    .filter((tag): tag is string => Boolean(tag))
}

function formatTags(tags: string[] | null | undefined) {
  const items = cleanTags(tags)
  if (!items.length) return ""

  return `\n\nTags: ${items.map((tag) => `[[${tag}]]`).join(" ")}`
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim()
}

function resolveUniqueFilePath(
  vaultPath: string,
  targetDir: string,
  baseName: string,
  previousFilePath?: string | null,
): { relativePath: string; filePath: string } {
  for (let attempt = 0; ; attempt++) {
    const name = attempt === 0 ? `${baseName}.md` : `${baseName} ${attempt + 1}.md`
    const relativePath = path.posix.join(targetDir, name)
    const filePath = path.join(/*turbopackIgnore: true*/ vaultPath, relativePath)
    if (filePath === previousFilePath || !existsSync(filePath)) return { relativePath, filePath }
  }
}

function yamlString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function formatFrontmatter(options: { title: string; created: string; tags: string[] }) {
  const tagsLine = options.tags.length
    ? `[${options.tags.map((tag) => yamlString(tag)).join(", ")}]`
    : "[]"

  return `---\ntitle: ${yamlString(options.title)}\ndate: ${options.created}\ntags: ${tagsLine}\ntype: capture\n---\n\n`
}

function formatWhatThisMeansForMe(text: string | null | undefined) {
  if (!text?.trim()) return ""

  return `\n\n> [!info] What this means for me\n> ${text.trim().replace(/\n/g, "\n> ")}`
}

function isEnriched(capture: CaptureExportInput) {
  return Boolean(capture.intake?.summary?.trim())
}

function formatEnrichedBody(capture: CaptureExportInput) {
  const intake = capture.intake
  const summary = intake?.summary?.trim() ?? ""

  return `${summary}${formatKeyTakeaways(intake?.key_takeaways)}${formatWhatThisMeansForMe(
    intake?.what_this_means_for_me,
  )}${formatTags(intake?.tags)}\n\n## Raw Capture\n${capture.text.trim()}`
}

export function getObsidianStatus(vaultPath: string | null): ObsidianStatus {
  if (!vaultPath) {
    return {
      mode: "fallback",
      enabled: true,
      writable: false,
      message: "Local Obsidian vault not configured. Export returns markdown for manual save.",
    }
  }

  return {
    mode: "local",
    enabled: true,
    writable: true,
    message: "Local Obsidian vault configured.",
  }
}

export function sanitizeObsidianTarget(target?: string | null) {
  const parts = (target || "inbox")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"\\|?*\u0000-\u001F]/g, "-"))

  return parts.length ? parts.join("/") : "inbox"
}

export function buildCaptureExport(
  capture: CaptureExportInput,
  options: CaptureExportOptions,
): CaptureExport {
  const target = sanitizeObsidianTarget(options.target)
  const heading = isEnriched(capture) ? capture.intake!.title?.trim() || "Capture" : "Capture"
  const baseName = sanitizeFilename(heading) || "Capture"

  let relativePath: string
  let filePath: string | null
  if (options.vaultPath) {
    const resolved = resolveUniqueFilePath(options.vaultPath, target, baseName, options.previousFilePath)
    relativePath = resolved.relativePath
    filePath = resolved.filePath
  } else {
    relativePath = path.posix.join(target, `${baseName}.md`)
    filePath = null
  }

  const body = isEnriched(capture) ? formatEnrichedBody(capture) : capture.text.trim()
  const tags = isEnriched(capture) ? cleanTags(capture.intake?.tags) : []
  const frontmatter = formatFrontmatter({ title: heading, created: capture.created_at, tags })
  const markdown = `${frontmatter}# ${heading}\n\n${body}${formatHermesPacket(capture)}\n`

  return {
    markdown,
    relativePath,
    filePath,
  }
}
export async function writeCaptureNote(
  filePath: string,
  content: string,
  previousFilePath?: string | null,
) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content)

  if (previousFilePath && previousFilePath !== filePath && path.isAbsolute(previousFilePath)) {
    await unlink(previousFilePath).catch(() => {})
  }
}
