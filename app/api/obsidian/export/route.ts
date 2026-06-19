import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"

type ExportBody = {
  target?: "capture" | "brief"
  captureId?: string
}

function getVaultPath() {
  return process.env.OBSIDIAN_VAULT_PATH || null
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function appendMarkdown(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })

  try {
    const existing = await readFile(filePath, "utf8")
    await writeFile(filePath, `${existing.trimEnd()}\n\n${content}\n`)
  } catch {
    await writeFile(filePath, `${content}\n`)
  }
}

export async function POST(request: NextRequest) {
  const verification = await verifyAccessToken(
    getBearerToken(request.headers.get("authorization")),
  )

  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: verification.error }, { status: verification.status })
  }

  const vaultPath = getVaultPath()
  if (!vaultPath) {
    return NextResponse.json(
      { ok: false, error: "Obsidian export is disabled in this environment." },
      { status: 503 },
    )
  }

  const supabase = getSupabaseServerAdmin()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as ExportBody

  if (body.target === "capture") {
    if (!body.captureId) {
      return NextResponse.json({ ok: false, error: "captureId is required." }, { status: 400 })
    }

    const { data: capture } = await supabase
      .from("captures")
      .select("id,text,created_at")
      .eq("user_id", verification.user.id)
      .eq("id", body.captureId)
      .maybeSingle()

    if (!capture) {
      return NextResponse.json({ ok: false, error: "Capture not found." }, { status: 404 })
    }

    const targetPath = path.join(vaultPath, "Focus OS", "Inbox", `${todayKey()}-captures.md`)
    await appendMarkdown(
      targetPath,
      `## Capture • ${new Date(capture.created_at).toLocaleString()}\n\n${capture.text}`,
    )

    return NextResponse.json({ ok: true, path: targetPath })
  }

  const [{ data: brief }, { data: events }] = await Promise.all([
    supabase
      .from("assistant_briefs")
      .select("*")
      .eq("user_id", verification.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("external_commitments")
      .select("title,starts_at,source,action_hint")
      .eq("user_id", verification.user.id)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(8),
  ])

  if (!brief) {
    return NextResponse.json({ ok: false, error: "No assistant brief available yet." }, { status: 404 })
  }

  const scheduleLines = (events ?? [])
    .filter((item) => item.source === "google_calendar")
    .map((item) => `- ${item.starts_at ? new Date(item.starts_at).toLocaleString() : "No time"} — ${item.title}${item.action_hint ? ` (${item.action_hint})` : ""}`)
    .join("\n")

  const targetPath = path.join(vaultPath, "Focus OS", "Briefs", `${todayKey()}-daily-brief.md`)
  const content = `# Focus OS Daily Brief — ${todayKey()}\n\n## Summary\n${brief.summary}\n\n## Top Priorities\n${brief.top_priorities.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Focus Block\n${brief.first_focus_block ?? "Not available"}\n\n${brief.focus_note ? `> ${brief.focus_note}\n\n` : ""}## Next Actions\n${brief.next_actions.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Risks\n${brief.risks.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Upcoming Calendar\n${scheduleLines || "- No calendar items synced."}\n`
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content)

  return NextResponse.json({ ok: true, path: targetPath })
}