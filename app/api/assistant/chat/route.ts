import { NextRequest, NextResponse } from "next/server"
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import { ASSISTANT_MODEL, getOpenRouterClient, stripJsonFences } from "@/lib/openrouter"
import { google } from "googleapis"
import { getGoogleAuthClient, runAssistant } from "@/lib/assistant"
import { computeCurrentStreak } from "@/lib/streak"

const SYSTEM_PROMPT = `You are Hermes, Matthew's personal productivity assistant inside Focus OS.
Chat with him directly and use the provided tools to read and act on his real tasks, captures, habits, and calendar — never invent data, always call a tool to check before answering questions about his state.
Keep replies short and direct, no filler.
Only call delete_task or discard_capture when Matthew has clearly asked to remove something. Always pass a short human-readable "label" for those two tools so he can see exactly what he's confirming.
For every other action (create/update/complete tasks, create captures, toggle habits, run Hermes now) just do it and briefly confirm what happened.
When Matthew asks for a written deliverable (a brief, plan, or summary) saved somewhere he can keep it, use create_drive_deliverable and share the link.`

const DESTRUCTIVE_TOOLS = new Set(["delete_task", "discard_capture"])
const MAX_TOOL_ITERATIONS = 4

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List Matthew's tasks, optionally filtered by completion state.",
      parameters: {
        type: "object",
        properties: {
          completed: { type: "boolean", description: "Filter to only completed or only open tasks. Omit for all." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_captures",
      description: "List open (unconverted) inbox captures.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_habits",
      description: "List active habits with current streak length.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_events",
      description: "List upcoming calendar commitments.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max events to return. Default 10." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string", description: "YYYY-MM-DD, or omit for no due date." },
          category: { type: "string", enum: ["work", "personal", "health", "other"] },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update fields on an existing task.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string" },
          category: { type: "string", enum: ["work", "personal", "health", "other"] },
          completed: { type: "boolean" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task complete.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_capture",
      description: "Drop a new note into the inbox for later triage.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_habit",
      description: "Toggle today's completion for a habit.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_hermes_now",
      description: "Trigger a full assistant run right now (syncs calendar/gmail, regenerates the daily brief).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_drive_deliverable",
      description: "Save a finished write-up (brief, plan, summary) as a file in Matthew's Google Drive and return the link.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "File name, without extension." },
          content: { type: "string", description: "Full text content of the deliverable." },
          as_google_doc: {
            type: "boolean",
            description: "If true, saves as an editable Google Doc. If false/omitted, saves as a plain text file.",
          },
        },
        required: ["name", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Permanently delete a task. Only call after Matthew has clearly asked for this.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string", description: "Short human-readable description of the task, for confirmation." },
        },
        required: ["id", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discard_capture",
      description: "Permanently delete an inbox capture. Only call after Matthew has clearly asked for this.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string", description: "Short human-readable description of the capture, for confirmation." },
        },
        required: ["id", "label"],
      },
    },
  },
]

type Supabase = NonNullable<ReturnType<typeof getSupabaseServerAdmin>>

async function logAgentEvent(
  supabase: Supabase,
  userId: string,
  action: string,
  status: "success" | "warning" | "failed",
  summary: string,
  targetTable?: string,
  targetId?: string,
) {
  await supabase.from("agent_events").insert({
    user_id: userId,
    agent_name: "Hermes",
    event_type: "chat",
    action,
    status,
    summary,
    target_table: targetTable ?? null,
    target_id: targetId ?? null,
  })
}

async function executeTool(
  supabase: Supabase,
  userId: string,
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "list_tasks": {
      let query = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)
      if (typeof args.completed === "boolean") query = query.eq("completed", args.completed)
      const { data, error } = await query
      if (error) throw error
      return data
    }
    case "list_captures": {
      const { data, error } = await supabase
        .from("captures")
        .select("*")
        .eq("user_id", userId)
        .eq("converted", false)
        .order("created_at", { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    }
    case "list_habits": {
      const { data: habits, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
      if (error) throw error
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", userId)
      return (habits ?? []).map((habit) => ({
        id: habit.id,
        name: habit.name,
        currentStreak: computeCurrentStreak((logs ?? []).filter((log) => log.habit_id === habit.id)),
      }))
    }
    case "list_upcoming_events": {
      const limit = typeof args.limit === "number" ? args.limit : 10
      const { data, error } = await supabase
        .from("external_commitments")
        .select("*")
        .eq("user_id", userId)
        .eq("source", "google_calendar")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(limit)
      if (error) throw error
      return data
    }
    case "create_task": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          text: String(args.text ?? "").trim(),
          priority: args.priority ?? "medium",
          due_date: args.due_date ?? null,
          category: args.category ?? "other",
        })
        .select("id")
        .single()
      if (error) throw error
      await logAgentEvent(supabase, userId, "create_task", "success", `Created task via chat: ${args.text}`, "tasks", data?.id)
      return { ok: true, id: data?.id }
    }
    case "update_task": {
      const { id, ...patch } = args
      await supabase.from("tasks").update(patch).eq("id", id).eq("user_id", userId)
      await logAgentEvent(supabase, userId, "update_task", "success", `Updated task via chat.`, "tasks", String(id))
      return { ok: true }
    }
    case "complete_task": {
      await supabase.from("tasks").update({ completed: true }).eq("id", args.id).eq("user_id", userId)
      await logAgentEvent(supabase, userId, "complete_task", "success", `Completed task via chat.`, "tasks", String(args.id))
      return { ok: true }
    }
    case "create_capture": {
      const { data, error } = await supabase
        .from("captures")
        .insert({ user_id: userId, text: String(args.text ?? "").trim(), obsidian_export_status: "pending" })
        .select("id")
        .single()
      if (error) throw error
      await logAgentEvent(supabase, userId, "create_capture", "success", `Created capture via chat.`, "captures", data?.id)
      return { ok: true, id: data?.id }
    }
    case "toggle_habit": {
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from("habit_logs")
        .select("id")
        .eq("habit_id", args.id)
        .eq("user_id", userId)
        .eq("logged_date", today)
        .maybeSingle()
      if (existing) {
        await supabase.from("habit_logs").delete().eq("id", existing.id)
      } else {
        await supabase.from("habit_logs").insert({ user_id: userId, habit_id: args.id, logged_date: today })
      }
      await logAgentEvent(supabase, userId, "toggle_habit", "success", `Toggled habit via chat.`, "habits", String(args.id))
      return { ok: true }
    }
    case "run_hermes_now": {
      const result = await runAssistant(userId, "manual")
      return { ok: true, summary: result.summary, topPriorities: result.topPriorities }
    }
    case "create_drive_deliverable": {
      const auth = getGoogleAuthClient()
      if (!auth) throw new Error("Google Drive isn't configured.")

      const drive = google.drive({ version: "v3", auth })
      const name = String(args.name ?? "Untitled").trim()
      const content = String(args.content ?? "")
      const asGoogleDoc = args.as_google_doc === true

      const { data } = await drive.files.create({
        requestBody: {
          name,
          mimeType: asGoogleDoc ? "application/vnd.google-apps.document" : "text/plain",
        },
        media: { mimeType: "text/plain", body: content },
        fields: "id,webViewLink",
      })

      await logAgentEvent(supabase, userId, "create_drive_deliverable", "success", `Saved Drive deliverable via chat: ${name}`)
      return { ok: true, webViewLink: data.webViewLink }
    }
    case "delete_task": {
      await supabase.from("tasks").delete().eq("id", args.id).eq("user_id", userId)
      await logAgentEvent(supabase, userId, "delete_task", "warning", `Deleted task via chat: ${args.label}`, "tasks", String(args.id))
      return { ok: true }
    }
    case "discard_capture": {
      await supabase.from("captures").delete().eq("id", args.id).eq("user_id", userId)
      await logAgentEvent(supabase, userId, "discard_capture", "warning", `Discarded capture via chat: ${args.label}`, "captures", String(args.id))
      return { ok: true }
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function findPendingToolCall(history: ChatCompletionMessageParam[], toolCallId: string) {
  for (const message of history) {
    if (message.role !== "assistant" || !message.tool_calls) continue
    const match = message.tool_calls.find((call) => call.id === toolCallId)
    if (match && match.type === "function") return match
  }
  return null
}

export async function POST(request: NextRequest) {
  const bearerToken = getBearerToken(request.headers.get("authorization"))
  const verification = await verifyAccessToken(bearerToken)
  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: verification.error }, { status: verification.status })
  }
  const userId = verification.user.id

  const client = getOpenRouterClient()
  const supabase = getSupabaseServerAdmin()
  if (!client || !supabase) {
    return NextResponse.json({ ok: false, error: "Assistant chat is not configured." }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as {
    history?: ChatCompletionMessageParam[]
    userMessage?: string
    confirmToolCall?: { id: string }
  } | null

  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 })
  }

  const history: ChatCompletionMessageParam[] = Array.isArray(body.history) ? body.history : []
  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history]

  try {
    if (body.confirmToolCall) {
      const pending = findPendingToolCall(history, body.confirmToolCall.id)
      if (!pending || !DESTRUCTIVE_TOOLS.has(pending.function.name)) {
        return NextResponse.json({ ok: false, error: "No matching pending action to confirm." }, { status: 400 })
      }

      const args = JSON.parse(stripJsonFences(pending.function.arguments || "{}")) as Record<string, unknown>
      const result = await executeTool(supabase, userId, pending.function.name, args)
      messages.push({ role: "tool", tool_call_id: pending.id, content: JSON.stringify(result) })
    } else if (body.userMessage) {
      messages.push({ role: "user", content: body.userMessage })
    } else {
      return NextResponse.json({ ok: false, error: "Missing userMessage or confirmToolCall." }, { status: 400 })
    }

    let pendingConfirmation: { id: string; tool: string; label: string } | null = null
    let iterations = 0

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1

      const response = await client.chat.completions.create({
        model: ASSISTANT_MODEL,
        messages,
        tools,
      })

      const message = response.choices[0]?.message
      if (!message) break

      messages.push(message)

      const toolCalls = message.tool_calls ?? []
      if (!toolCalls.length) break

      const destructiveCall = toolCalls.find((call) => call.type === "function" && DESTRUCTIVE_TOOLS.has(call.function.name))
      if (destructiveCall && destructiveCall.type === "function") {
        const args = JSON.parse(stripJsonFences(destructiveCall.function.arguments || "{}")) as Record<string, unknown>
        pendingConfirmation = {
          id: destructiveCall.id,
          tool: destructiveCall.function.name,
          label: typeof args.label === "string" ? args.label : "this item",
        }
        break
      }

      for (const call of toolCalls) {
        if (call.type !== "function") continue
        const args = JSON.parse(stripJsonFences(call.function.arguments || "{}")) as Record<string, unknown>
        try {
          const result = await executeTool(supabase, userId, call.function.name, args)
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) })
        } catch (toolError) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ ok: false, error: toolError instanceof Error ? toolError.message : "Tool failed." }),
          })
        }
      }
    }

    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    const reply =
      typeof lastAssistantMessage?.content === "string" && lastAssistantMessage.content.trim()
        ? lastAssistantMessage.content
        : pendingConfirmation
          ? `Confirm: ${pendingConfirmation.tool === "delete_task" ? "delete" : "discard"} ${pendingConfirmation.label}?`
          : "Done."

    return NextResponse.json({
      ok: true,
      reply,
      pendingConfirmation,
      history: messages.filter((m) => m.role !== "system"),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Assistant chat failed." },
      { status: 500 },
    )
  }
}
