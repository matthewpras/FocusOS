import type { CaptureLink } from "@/types"

const urlPattern = /https?:\/\/[^\s<>"']+/gi

function normalizeUrl(url: string) {
  return url.trim().replace(/[),.;!?]+$/g, "")
}

export function detectLinkKind(url: string) {
  let host: string

  try {
    host = new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "link"
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok"
  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    return "youtube"
  }

  return "link"
}

export function extractCaptureLinks(values: string[]): CaptureLink[] {
  const seen = new Set<string>()
  const links: CaptureLink[] = []

  for (const value of values) {
    for (const match of value.matchAll(urlPattern)) {
      const url = normalizeUrl(match[0])
      if (!url || seen.has(url)) continue

      seen.add(url)
      links.push({
        url,
        kind: detectLinkKind(url),
      })
    }
  }

  return links
}

export function buildCaptureText(input: {
  note: string
  links?: CaptureLink[]
}) {
  const sections = [input.note.trim()].filter(Boolean)
  const explicitLinks = input.links?.filter((link) => link.url.trim()) ?? []

  if (explicitLinks.length) {
    sections.push(`Links:\n${explicitLinks.map((link) => `- ${link.url.trim()}`).join("\n")}`)
  }

  return sections.join("\n\n")
}
