import OpenAI from "openai"

export const ASSISTANT_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5"

export function hasOpenRouterEnv() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://focus-os-neon.vercel.app",
      "X-Title": "Focus OS",
    },
  })
}

const BRIEF_SYSTEM_PROMPT = `You are Hermes, Matthew's personal productivity assistant inside Focus OS.
You will receive a JSON snapshot of his current tasks, inbox captures, and calendar/email commitments.
Produce a short brief as strict JSON with this exact shape and nothing else:
{"summary": string, "topPriorities": string[], "risks": string[], "nextActions": string[]}

Rules:
- Base everything strictly on the provided data. Never invent tasks, dates, or facts not present in the input.
- "summary": one or two sentences, plain and direct, no greetings.
- "topPriorities": at most 3 short items (a few words each), the most urgent or important things today, ranked.
- "risks": at most 5 short items, things that could slip, conflict, or need attention. Omit if nothing stands out.
- "nextActions": at most 4 short, concrete, actionable items.
- Keep every string terse — these render in small UI badges, not paragraphs.
- Output raw JSON only, no markdown fences, no commentary.`

export type BriefSynthesisInput = {
  today: string
  tasks: Array<{ text: string; priority: string; due_date: string | null; completed: boolean }>
  captures: Array<{ text: string }>
  commitments: Array<{ title: string; startsAt: string | null; dueDate: string | null; source: string }>
  overdueCount: number
  meetingCountToday: number
  firstFocusBlock: string | null
  sourceErrors: string[]
  fallback: {
    summary: string
    topPriorities: string[]
    risks: string[]
    nextActions: string[]
  }
}

export type BriefSynthesisOutput = {
  summary: string
  topPriorities: string[]
  risks: string[]
  nextActions: string[]
}

/**
 * Some models return JSON wrapped in markdown fences even with response_format:
 * json_object requested. Strip ```json / ``` wrappers before parsing.
 */
export function stripJsonFences(raw: string) {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

export async function synthesizeAssistantBrief(
  input: BriefSynthesisInput,
): Promise<BriefSynthesisOutput | null> {
  const client = getOpenRouterClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 800,
      messages: [
        { role: "system", content: BRIEF_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(stripJsonFences(raw)) as Partial<BriefSynthesisOutput>
    if (typeof parsed.summary !== "string" || !Array.isArray(parsed.topPriorities)) return null

    return {
      summary: parsed.summary.slice(0, 500),
      topPriorities: parsed.topPriorities.slice(0, 3).map(String),
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5).map(String) : [],
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 4).map(String) : [],
    }
  } catch (error) {
    console.error("OpenRouter brief synthesis failed", error)
    return null
  }
}
