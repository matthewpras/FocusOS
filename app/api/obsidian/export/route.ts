import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { writeCaptureNote, buildCaptureExport, getObsidianStatus } from "@/lib/obsidian-export"
import { enrichCaptureIntake, type CaptureIntakeRow } from "@/lib/capture-enrichment"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"
import type { CaptureLink } from "@/types"

type ExportBody = {
  target?: "capture" | "brief"
  captureId?: string
  obsidianTarget?: string
}

function getVaultPath() {
  return process.env.OBSIDIAN_VAULT_PATH || null
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function verifyRequest(request: NextRequest) {
  const verification = await verifyAccessToken(
    getBearerToken(request.headers.get("authorization")),
  )

  if (!verification.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: verification.error },
        { status: verification.status },
      ),
    }
  }

  return { ok: true as const, user: verification.user }
}

export async function GET(request: NextRequest) {
  const verification = await verifyRequest(request)
  if (!verification.ok) return verification.response

  return NextResponse.json({
    ok: true,
    status: getObsidianStatus(getVaultPath()),
  })
}

export async function POST(request: NextRequest) {
  const verification = await verifyRequest(request)
  if (!verification.ok) return verification.response

  const vaultPath = getVaultPath()

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
      .select("id,text,created_at,obsidian_export_path")
      .eq("user_id", verification.user.id)
      .eq("id", body.captureId)
      .maybeSingle()

    if (!capture) {
      return NextResponse.json({ ok: false, error: "Capture not found." }, { status: 404 })
    }

    let { data: intake } = await supabase
      .from("capture_intake")
      .select("id,user_id,capture_id,raw_note,links,media_items,payload,obsidian_target,agent_status,title,summary,tags,key_takeaways,what_this_means_for_me")
      .eq("user_id", verification.user.id)
      .eq("capture_id", body.captureId)
      .maybeSingle()

    let enrichedLinks: CaptureLink[] = Array.isArray(intake?.links) ? intake.links : []

    // Give the capture skill a chance to synthesize a title/summary before this write is the
    // permanent record in the vault, so we don't export a bare "Capture - <timestamp>" heading.
    if (intake && intake.agent_status !== "analyzed" && intake.agent_status !== "synced") {
      const result = await enrichCaptureIntake(supabase, intake as CaptureIntakeRow)
      if (result.ok) {
        enrichedLinks = enrichedLinks.map((link) => {
          const fetched = result.linkContents.find((content) => content.url === link.url)
          return fetched?.title ? { ...link, title: fetched.title } : link
        })
        const { data: refreshed } = await supabase
          .from("capture_intake")
          .select("id,user_id,capture_id,raw_note,links,media_items,payload,obsidian_target,agent_status,title,summary,tags,key_takeaways,what_this_means_for_me")
          .eq("id", intake.id)
          .maybeSingle()
        if (refreshed) intake = refreshed
      }
    }

    const exportItem = buildCaptureExport(
      {
        ...capture,
        links: enrichedLinks,
        media_items: Array.isArray(intake?.media_items) ? intake.media_items : [],
        intake: intake
          ? {
              obsidian_target: intake.obsidian_target,
              agent_status: intake.agent_status,
              title: intake.title,
              summary: intake.summary,
              tags: intake.tags,
              key_takeaways: intake.key_takeaways,
              what_this_means_for_me: intake.what_this_means_for_me,
            }
          : null,
      },
      {
        vaultPath,
        target: body.obsidianTarget ?? intake?.obsidian_target,
        previousFilePath: capture.obsidian_export_path,
      },
    )

    if (exportItem.filePath) {
      await writeCaptureNote(exportItem.filePath, exportItem.markdown, capture.obsidian_export_path)
    }

    await supabase
      .from("captures")
      .update({
        obsidian_export_status: exportItem.filePath ? "exported" : "fallback",
        obsidian_exported_at: new Date().toISOString(),
        obsidian_export_path: exportItem.filePath ?? exportItem.relativePath,
      })
      .eq("user_id", verification.user.id)
      .eq("id", body.captureId)

    await supabase
      .from("capture_intake")
      .update({
        agent_status: exportItem.filePath
          ? "synced"
          : intake?.agent_status === "analyzed"
            ? "analyzed"
            : "queued",
        obsidian_target: body.obsidianTarget ?? intake?.obsidian_target ?? null,
      })
      .eq("user_id", verification.user.id)
      .eq("capture_id", body.captureId)

    return NextResponse.json({
      ok: true,
      mode: exportItem.filePath ? "local" : "fallback",
      path: exportItem.filePath ?? exportItem.relativePath,
      relativePath: exportItem.relativePath,
      markdown: exportItem.filePath ? undefined : exportItem.markdown,
    })
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

  const relativePath = path.posix.join("Focus OS", "Briefs", `${todayKey()}-daily-brief.md`)
  const targetPath = vaultPath
    ? path.join(/*turbopackIgnore: true*/ vaultPath, relativePath)
    : null
  const content = `# Focus OS Daily Brief — ${todayKey()}\n\n## Summary\n${brief.summary}\n\n## Top Priorities\n${brief.top_priorities.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Focus Block\n${brief.first_focus_block ?? "Not available"}\n\n${brief.focus_note ? `> ${brief.focus_note}\n\n` : ""}## Next Actions\n${brief.next_actions.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Risks\n${brief.risks.map((item: string) => `- ${item}`).join("\n") || "- None"}\n\n## Upcoming Calendar\n${scheduleLines || "- No calendar items synced."}\n`
  if (targetPath) {
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, content)
  }

  return NextResponse.json({
    ok: true,
    mode: targetPath ? "local" : "fallback",
    path: targetPath ?? relativePath,
    relativePath,
    markdown: targetPath ? undefined : content,
  })
}
