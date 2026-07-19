"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send, User } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/error-banner"
import { useAuth } from "@/hooks/use-auth"

export const OPEN_ASSISTANT_CHAT_EVENT = "focusos:open-assistant-chat"

type RawMessage = {
  role: "user" | "assistant" | "tool" | "system"
  content?: string | null
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

type PendingConfirmation = { id: string; tool: string; label: string } | null

type ChatResponse = {
  ok: boolean
  reply?: string
  pendingConfirmation?: PendingConfirmation
  history?: RawMessage[]
  error?: string
}

export function AssistantChatPanel() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [rawHistory, setRawHistory] = useState<RawMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConfirmation>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOpen() {
      setOpen(true)
    }
    window.addEventListener(OPEN_ASSISTANT_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_ASSISTANT_CHAT_EVENT, onOpen)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [rawHistory, pending])

  async function callChat(payload: { userMessage?: string; confirmToolCall?: { id: string } }) {
    if (!session?.access_token) {
      setError("Sign in again before chatting with Hermes.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ history: rawHistory, ...payload }),
      })
      const data = (await response.json()) as ChatResponse
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Assistant chat failed.")
        return
      }
      setRawHistory(data.history ?? [])
      setPending(data.pendingConfirmation ?? null)
    } catch {
      setError("Couldn't reach the assistant.")
    } finally {
      setSending(false)
    }
  }

  function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    void callChat({ userMessage: text })
  }

  function confirmPending() {
    if (!pending) return
    void callChat({ confirmToolCall: { id: pending.id } })
  }

  function cancelPending() {
    if (!pending) return
    setRawHistory((items) => [
      ...items,
      { role: "tool", tool_call_id: pending.id, content: JSON.stringify({ ok: false, cancelled: true }) },
    ])
    setPending(null)
  }

  const visibleMessages = rawHistory.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0,
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="border-[var(--today-line)] bg-[var(--today-sidebar)] text-[var(--today-ink)] sm:max-w-md"
      >
        <SheetHeader className="border-b border-[var(--today-line)]">
          <SheetTitle className="flex items-center gap-2 text-[var(--today-ink)]">
            <Bot className="size-4" />
            Chat with Hermes
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!visibleMessages.length ? (
            <p className="text-sm text-[var(--today-muted)]">
              Ask about your tasks, inbox, habits, or calendar — or tell it to create, update, or clean things up.
            </p>
          ) : null}
          {visibleMessages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" ? (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--today-panel-muted)] text-[var(--today-muted)]">
                  <Bot className="size-3.5" />
                </span>
              ) : null}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[var(--today-blue)] text-white"
                    : "bg-[var(--today-panel)] text-[var(--today-ink)]"
                }`}
              >
                {message.content}
              </div>
              {message.role === "user" ? (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--today-panel-muted)] text-[var(--today-muted)]">
                  <User className="size-3.5" />
                </span>
              ) : null}
            </div>
          ))}

          {pending ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={confirmPending} disabled={sending}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPending} disabled={sending}>
                Cancel
              </Button>
            </div>
          ) : null}

          {sending ? <p className="text-xs text-[var(--today-muted)]">Thinking…</p> : null}
          {error ? <ErrorBanner message={error} onRetry={() => setError(null)} /> : null}
        </div>

        <div className="flex items-end gap-2 border-t border-[var(--today-line)] p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            placeholder="Ask Hermes anything…"
            rows={1}
            className="min-h-9 flex-1 resize-none rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] px-2.5 py-2 text-sm text-[var(--today-ink)] outline-none placeholder:text-[var(--today-muted)] focus-visible:border-[var(--today-blue)]"
          />
          <Button size="icon" aria-label="Send message" disabled={sending || !input.trim()} onClick={send}>
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
