import type { SupabaseClient } from "@supabase/supabase-js"
import { execFile as execFileCb } from "node:child_process"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { ASSISTANT_MODEL, ENRICHMENT_MODEL, getOpenRouterClient, stripJsonFences } from "@/lib/openrouter"
import { OBSIDIAN_FOLDER_OPTIONS } from "@/lib/obsidian-folders"
import type { CaptureLink, CaptureMediaItem } from "@/types"

const execFile = promisify(execFileCb)

const FETCH_TIMEOUT_MS = 8000
const YT_DLP_TIMEOUT_MS = 45000
const MAX_CONTENT_CHARS = 20000
const MAX_TRANSCRIPT_CHARS = 60000

export type LinkContent = {
  url: string
  kind: string
  title: string | null
  author: string | null
  contentText: string | null
  note: string | null
}

export type ImageDescription = {
  name: string
  description: string | null
  error: string | null
}

export type CaptureSynthesis = {
  title: string
  summary: string
  tags: string[]
  keyTakeaways: string[]
  whatThisMeansForMe: string | null
  suggestedObsidianTarget: string | null
}

export type CaptureIntakeRow = {
  id: string
  user_id: string
  capture_id: string | null
  raw_note: string | null
  links: CaptureLink[] | null
  media_items: CaptureMediaItem[] | null
  obsidian_target: string | null
  payload: Record<string, unknown> | null
}

export type EnrichResult = {
  ok: boolean
  synthesis: CaptureSynthesis | null
  linkContents: LinkContent[]
  imageDescriptions: ImageDescription[]
  error: string | null
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function extractBalancedJsonArray(html: string, marker: string): string | null {
  const markerIndex = html.indexOf(marker)
  if (markerIndex === -1) return null

  let i = markerIndex + marker.length
  while (i < html.length && html[i] !== "[") i++
  if (html[i] !== "[") return null

  const start = i
  let depth = 0
  let inString = false
  let escaped = false

  for (; i < html.length; i++) {
    const char = html[i]

    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === "[") depth++
    else if (char === "]") {
      depth--
      if (depth === 0) return html.slice(start, i + 1)
    }
  }

  return null
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1) || null
    if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] ?? null
    return parsed.searchParams.get("v")
  } catch {
    return null
  }
}

function parseVttToPlainText(vtt: string): string {
  const lines = vtt.split("\n")
  const textLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith("WEBVTT")) continue
    if (trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) continue
    if (trimmed.includes("-->")) continue
    if (/^\d+$/.test(trimmed)) continue

    const stripped = trimmed.replace(/<[^>]+>/g, "")
    if (stripped) textLines.push(stripped)
  }

  const deduped = textLines.filter((line, index) => line !== textLines[index - 1])
  return decodeHtmlEntities(deduped.join(" "))
}

async function fetchTranscriptViaYtDlp(url: string): Promise<{ text: string | null; note: string | null }> {
  let tmpDir: string | null = null
  let execError: unknown = null

  try {
    tmpDir = await mkdtemp(path.join(tmpdir(), "focusos-yt-"))

    try {
      await execFile(
        "yt-dlp",
        [
          "--skip-download",
          "--write-subs",
          "--write-auto-subs",
          "--sub-langs",
          "en",
          "--sub-format",
          "vtt",
          "-o",
          path.join(tmpDir, "sub.%(ext)s"),
          url,
        ],
        { timeout: YT_DLP_TIMEOUT_MS },
      )
    } catch (error) {
      // yt-dlp can exit non-zero after already writing the subtitle file (e.g. a transient
      // network hiccup on an unrelated step) — check disk before giving up on the whole call.
      execError = error
    }

    const files = await readdir(tmpDir)
    const vttFile = files.find((name) => name.endsWith(".vtt"))
    if (!vttFile) {
      const message = execError instanceof Error ? execError.message : "yt-dlp found no captions for this video."
      const note = message.includes("ENOENT") ? "yt-dlp is not installed on this host." : message
      return { text: null, note }
    }

    const vtt = await readFile(path.join(tmpDir, vttFile), "utf8")
    const text = parseVttToPlainText(vtt).slice(0, MAX_TRANSCRIPT_CHARS)
    return { text: text || null, note: text ? null : "yt-dlp returned an empty transcript." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "yt-dlp transcript fetch failed."
    const note = message.includes("ENOENT") ? "yt-dlp is not installed on this host." : message
    return { text: null, note }
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function fetchTranscriptViaScrape(videoId: string): Promise<{ text: string | null; note: string | null }> {
  try {
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+cb",
      },
    })
    const html = await pageResponse.text()
    const tracksJson = extractBalancedJsonArray(html, '"captionTracks":')
    if (!tracksJson) return { text: null, note: "No captions available for this video." }

    const tracks = JSON.parse(tracksJson) as Array<{ baseUrl: string; languageCode: string }>
    const track = tracks.find((item) => item.languageCode?.startsWith("en")) ?? tracks[0]
    if (!track?.baseUrl) return { text: null, note: "No captions available for this video." }

    const transcriptResponse = await fetch(track.baseUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    const transcriptXml = await transcriptResponse.text()
    const transcriptText = decodeHtmlEntities(transcriptXml.replace(/<[^>]+>/g, " ")).slice(
      0,
      MAX_TRANSCRIPT_CHARS,
    )

    return { text: transcriptText || null, note: transcriptText ? null : "Scraped transcript was empty." }
  } catch (error) {
    return { text: null, note: error instanceof Error ? error.message : "Transcript fetch failed." }
  }
}

async function fetchYouTubeContent(url: string): Promise<LinkContent> {
  const base: LinkContent = { url, kind: "youtube", title: null, author: null, contentText: null, note: null }
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return { ...base, note: "Could not parse a video ID from this URL." }

  try {
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    )
    if (oembedResponse.ok) {
      const oembed = (await oembedResponse.json()) as { title?: string; author_name?: string }
      base.title = oembed.title ?? null
      base.author = oembed.author_name ?? null
    }
  } catch {
    // oEmbed is best-effort metadata; transcript fetch below is the important part.
  }

  // yt-dlp keeps up with YouTube's anti-scraping changes and is what the local Mac (the only
  // place this runs against a real vault) already has installed; the HTML-scrape fallback below
  // covers cloud deploys or hosts where the binary isn't present.
  const viaYtDlp = await fetchTranscriptViaYtDlp(url)
  if (viaYtDlp.text) return { ...base, contentText: viaYtDlp.text }

  const viaScrape = await fetchTranscriptViaScrape(videoId)
  if (viaScrape.text) return { ...base, contentText: viaScrape.text }

  return { ...base, note: viaYtDlp.note || viaScrape.note || "No captions available for this video." }
}

async function fetchGenericLinkContent(url: string, kind: string): Promise<LinkContent> {
  const base: LinkContent = { url, kind, title: null, author: null, contentText: null, note: null }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    })
    const html = await response.text()

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    base.title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : null

    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
    base.contentText = decodeHtmlEntities(stripped).slice(0, MAX_CONTENT_CHARS) || null

    return base
  } catch (error) {
    return { ...base, note: error instanceof Error ? error.message : "Could not fetch this link." }
  }
}

export async function fetchLinkContent(link: CaptureLink): Promise<LinkContent> {
  if (link.kind === "youtube") return fetchYouTubeContent(link.url)
  return fetchGenericLinkContent(link.url, link.kind || "link")
}

export async function describeImage(item: CaptureMediaItem, noteContext: string): Promise<ImageDescription> {
  if (!item.data_url) return { name: item.name, description: null, error: "No image data attached." }

  const client = getOpenRouterClient()
  if (!client) return { name: item.name, description: null, error: "OpenRouter is not configured." }

  try {
    const response = await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "Describe this image factually for a personal knowledge vault: what's shown, any visible text, and why it might be worth keeping. 3-5 short bullet points. Only describe what you can actually see.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Capture note for context: ${noteContext || "(none)"}` },
            { type: "image_url", image_url: { url: item.data_url } },
          ],
        },
      ],
    })

    const description = response.choices[0]?.message?.content?.trim() || null
    return { name: item.name, description, error: description ? null : "Model returned no description." }
  } catch (error) {
    return { name: item.name, description: null, error: error instanceof Error ? error.message : "Vision call failed." }
  }
}

const SYNTHESIS_SYSTEM_PROMPT = `You are Hermes, Matthew's assistant inside Focus OS, turning a raw capture into a clean Obsidian vault entry.
Matthew's goal: read the note instead of watching the video or reading the article. The note must stand on its own — if he only reads this and never opens the source, he should still know everything that mattered in it. Thin, generic summaries defeat the entire point.
You will receive the raw note Matthew typed, plus content fetched from any links (including YouTube transcripts) and descriptions of any attached images.
Produce strict JSON with this exact shape and nothing else:
{"title": string, "summary": string, "tags": string[], "keyTakeaways": string[], "whatThisMeansForMe": string, "suggestedObsidianTarget": string}

Rules:
- Base everything strictly on the provided note, link content, and image descriptions. Never invent facts, names, or claims not present in the input.
- If a link's content couldn't be fetched, rely on its title/note field and say less rather than guessing — don't pad with filler to compensate.
- "title": a short, specific note title (a few words), not a generic label like "Capture". This becomes the actual vault filename, so keep it filesystem-friendly and free of dates (Obsidian notes here are never dated).
- "summary": a thorough breakdown of the actual content in Markdown OUTLINE form, never flowing prose paragraphs. Use "## " subheadings for each distinct section/topic/step in the order the source presents them, and "- " bullets underneath each for the specific names, numbers, examples, and claims made. A short video/article still gets a couple of headed sections; a long one gets as many as it needs to be fully reconstructable from the note alone. Skip padding and repetition, but never compress substance down to a single vague bullet.
- "tags": at most 6 short lowercase-kebab-case tags relevant to the content.
- "keyTakeaways": at most 15 concrete, specific bullet points — the facts, figures, steps, or claims worth remembering. Each bullet should be self-contained enough to be useful without the summary.
- "whatThisMeansForMe": 2-4 sentences on why this might matter to Matthew given the note's context, or why it's worth revisiting. If genuinely unclear, say so plainly instead of inventing relevance.
- "suggestedObsidianTarget": pick exactly one folder from this list based on the content's topic, not its source format: ${OBSIDIAN_FOLDER_OPTIONS.join(", ")}. A YouTube video about pharmacy still goes to "school", not "youtube" — "youtube" is for manual use only, never auto-suggest it. Prefer the existing target if it already looks reasonable.
- Output raw JSON only, no markdown fences, no commentary.`

export async function synthesizeCaptureIntake(input: {
  rawNote: string | null
  currentObsidianTarget: string | null
  linkContents: LinkContent[]
  imageDescriptions: ImageDescription[]
}): Promise<CaptureSynthesis | null> {
  const client = getOpenRouterClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: ENRICHMENT_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            note: input.rawNote,
            currentObsidianTarget: input.currentObsidianTarget,
            links: input.linkContents,
            images: input.imageDescriptions,
          }),
        },
      ],
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(stripJsonFences(raw)) as Partial<CaptureSynthesis>
    if (typeof parsed.title !== "string" || typeof parsed.summary !== "string") return null

    return {
      title: parsed.title.slice(0, 120),
      summary: parsed.summary.slice(0, 6000),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map(String) : [],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 15).map(String) : [],
      whatThisMeansForMe:
        typeof parsed.whatThisMeansForMe === "string" ? parsed.whatThisMeansForMe.slice(0, 1000) : null,
      suggestedObsidianTarget:
        typeof parsed.suggestedObsidianTarget === "string" ? parsed.suggestedObsidianTarget.trim() : null,
    }
  } catch (error) {
    console.error("Capture synthesis failed", error)
    return null
  }
}

export async function enrichCaptureIntake(
  supabase: SupabaseClient,
  intake: CaptureIntakeRow,
): Promise<EnrichResult> {
  await supabase
    .from("capture_intake")
    .update({ agent_status: "processing" })
    .eq("id", intake.id)

  const links = intake.links ?? []
  const mediaItems = intake.media_items ?? []
  const noteContext = intake.raw_note ?? ""

  const [linkContents, imageDescriptions] = await Promise.all([
    Promise.all(links.map((link) => fetchLinkContent(link))),
    Promise.all(mediaItems.map((item) => describeImage(item, noteContext))),
  ])

  const synthesis = await synthesizeCaptureIntake({
    rawNote: intake.raw_note,
    currentObsidianTarget: intake.obsidian_target,
    linkContents,
    imageDescriptions,
  })

  if (!synthesis) {
    await supabase
      .from("capture_intake")
      .update({
        agent_status: "failed",
        payload: {
          ...(intake.payload ?? {}),
          enrichment_error: "Synthesis failed — check OPENROUTER_API_KEY and model availability.",
        },
      })
      .eq("id", intake.id)

    return {
      ok: false,
      synthesis: null,
      linkContents,
      imageDescriptions,
      error: "Synthesis failed.",
    }
  }

  await supabase
    .from("capture_intake")
    .update({
      title: synthesis.title,
      summary: synthesis.summary,
      tags: synthesis.tags,
      key_takeaways: synthesis.keyTakeaways,
      what_this_means_for_me: synthesis.whatThisMeansForMe,
      obsidian_target: intake.obsidian_target?.trim() || synthesis.suggestedObsidianTarget || "Inbox",
      agent_status: "analyzed",
      payload: {
        ...(intake.payload ?? {}),
        enrichment: { links: linkContents, images: imageDescriptions },
      },
    })
    .eq("id", intake.id)

  return { ok: true, synthesis, linkContents, imageDescriptions, error: null }
}
