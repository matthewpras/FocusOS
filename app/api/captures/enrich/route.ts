import { NextRequest, NextResponse } from "next/server"
import { writeCaptureNote, buildCaptureExport } from "@/lib/obsidian-export"
import { enrichCaptureIntake, type CaptureIntakeRow } from "@/lib/capture-enrichment"
import { isCronRequest, resolveCronUserId } from "@/lib/cron-user"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import type { CaptureLink } from "@/types"

const BATCH_LIMIT = 5

function getVaultPath() {
  return process.env.OBSIDIAN_VAULT_PATH || null
}

type EnrichSummary = {
  ok: boolean
  processed: number
  exported: number
  failed: number
  errors: string[]
}

async function runEnrichmentForUser(userId: string): Promise<EnrichSummary> {
  const supabase = getSupabaseServerAdmin()
  if (!supabase) {
    return { ok: false, processed: 0, exported: 0, failed: 0, errors: ["Supabase admin client is not configured."] }
  }

  const vaultPath = getVaultPath()
  const { data, error } = await supabase
    .from("capture_intake")
    .select("id,user_id,capture_id,raw_note,links,media_items,obsidian_target,payload")
    .eq("user_id", userId)
    .eq("agent_status", "queued")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT)

  if (error) return { ok: false, processed: 0, exported: 0, failed: 0, errors: [error.message] }

  const rows = (data ?? []) as CaptureIntakeRow[]
  if (!rows.length) return { ok: true, processed: 0, exported: 0, failed: 0, errors: [] }

  let exported = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const result = await enrichCaptureIntake(supabase, row)

    if (!result.ok) {
      failed++
      if (result.error) errors.push(result.error)
      continue
    }

    if (!row.capture_id) continue

    const { data: capture } = await supabase
      .from("captures")
      .select("id,text,created_at,obsidian_export_path")
      .eq("id", row.capture_id)
      .maybeSingle()

    if (!capture) continue

    const { data: updatedIntake } = await supabase
      .from("capture_intake")
      .select("obsidian_target,agent_status,title,summary,tags,key_takeaways,what_this_means_for_me")
      .eq("id", row.id)
      .maybeSingle()

    // Fold fetched link titles (e.g. real YouTube titles) back onto the links for a nicer export.
    const enrichedLinks: CaptureLink[] = (row.links ?? []).map((link) => {
      const fetched = result.linkContents.find((content) => content.url === link.url)
      return fetched?.title ? { ...link, title: fetched.title } : link
    })

    const exportItem = buildCaptureExport(
      {
        ...capture,
        links: enrichedLinks,
        media_items: row.media_items ?? [],
        intake: updatedIntake ?? null,
      },
      { vaultPath, target: updatedIntake?.obsidian_target, previousFilePath: capture.obsidian_export_path },
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
      .eq("id", row.capture_id)

    await supabase.from("capture_intake").update({ agent_status: "synced" }).eq("id", row.id)
    exported++
  }

  return { ok: failed === 0, processed: rows.length, exported, failed, errors }
}

async function handleRun(request: NextRequest) {
  const bearerToken = getBearerToken(request.headers.get("authorization"))

  let userId: string | null = null

  if (isCronRequest(bearerToken)) {
    userId = await resolveCronUserId()
  } else if (bearerToken) {
    const verification = await verifyAccessToken(bearerToken)
    if (!verification.ok) {
      return NextResponse.json({ ok: false, error: verification.error }, { status: verification.status })
    }
    userId = verification.user.id
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  const result = await runEnrichmentForUser(userId)
  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
