import { ExternalLink } from "lucide-react"
import { hasSupabaseEnv } from "@/lib/supabase-browser"

export function SetupNotice() {
  if (hasSupabaseEnv()) return null

  return (
    <div className="rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 px-4 py-3 text-sm text-blue-100">
      <div className="flex items-center gap-2 font-medium">
        <ExternalLink className="size-4" />
        Supabase keys needed
      </div>
      <p className="mt-1 text-blue-100/75">
        Create new Supabase project, run <span className="font-mono">schema.sql</span>,
        then set <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
        <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
      </p>
    </div>
  )
}
