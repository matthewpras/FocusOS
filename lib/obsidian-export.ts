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
}

export type CaptureExportOptions = {
  vaultPath: string | null
  target?: string | null
  now?: Date
}

export type CaptureExport = {
  markdown: string
  relativePath: string
  filePath: string | null
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatUtcMinute(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC"
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
  const parts = (target || "Inbox")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"\\|?*\u0000-\u001F]/g, "-"))

  return parts.length ? parts.join("/") : "Inbox"
}

export function buildCaptureExport(
  capture: CaptureExportInput,
  options: CaptureExportOptions,
): CaptureExport {
  const target = sanitizeObsidianTarget(options.target)
  const key = dateKey(options.now ?? new Date())
  const relativePath = path.posix.join("Focus OS", target, `${key}-captures.md`)
  const filePath = options.vaultPath
    ? path.join(/*turbopackIgnore: true*/ options.vaultPath, relativePath)
    : null
  const markdown = `## Capture - ${formatUtcMinute(capture.created_at)}\n\n${capture.text.trim()}${formatHermesPacket(capture)}`

  return {
    markdown,
    relativePath,
    filePath,
  }
}
