import { readFileSync } from "node:fs"
import path from "node:path"

export type HermesAgentName = "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"

export type HermesEnv = {
  FOCUSOS_SUPABASE_URL: string
  FOCUSOS_SUPABASE_SERVICE_ROLE_KEY: string
  FOCUSOS_USER_EMAIL: string
  FOCUSOS_AGENT_NAME: HermesAgentName
  FOCUSOS_DEFAULT_RUN_ID?: string
  FOCUSOS_OBSIDIAN_VAULT_PATH?: string
}

type EnvResult =
  | { ok: true; env: HermesEnv }
  | { ok: false; error: string }

const requiredKeys = [
  "FOCUSOS_SUPABASE_URL",
  "FOCUSOS_SUPABASE_SERVICE_ROLE_KEY",
  "FOCUSOS_USER_EMAIL",
  "FOCUSOS_AGENT_NAME",
] as const

const allowedAgents = new Set(["Hermes", "Nova", "Atlas", "Pulse", "Dev"])

export function parseHermesEnvFile(contents: string) {
  const values: Record<string, string> = {}

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) continue

    const key = line.slice(0, equalsIndex).trim()
    const rawValue = line.slice(equalsIndex + 1).trim()
    values[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }

  return values
}

export function validateHermesEnv(
  values: Record<string, string | undefined>,
): EnvResult {
  const missing = requiredKeys.filter((key) => !values[key]?.trim())

  if (missing.length) {
    return {
      ok: false,
      error: `Missing Hermes env: ${missing.join(", ")}`,
    }
  }

  const agentName = values.FOCUSOS_AGENT_NAME!.trim()
  if (!allowedAgents.has(agentName)) {
    return {
      ok: false,
      error: "FOCUSOS_AGENT_NAME must be one of Hermes, Nova, Atlas, Pulse, Dev.",
    }
  }

  return {
    ok: true,
    env: {
      FOCUSOS_SUPABASE_URL: values.FOCUSOS_SUPABASE_URL!.trim(),
      FOCUSOS_SUPABASE_SERVICE_ROLE_KEY:
        values.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY!.trim(),
      FOCUSOS_USER_EMAIL: values.FOCUSOS_USER_EMAIL!.trim().toLowerCase(),
      FOCUSOS_AGENT_NAME: agentName as HermesAgentName,
      FOCUSOS_DEFAULT_RUN_ID: values.FOCUSOS_DEFAULT_RUN_ID?.trim() || undefined,
      FOCUSOS_OBSIDIAN_VAULT_PATH:
        values.FOCUSOS_OBSIDIAN_VAULT_PATH?.trim() || undefined,
    },
  }
}

export function loadHermesEnv(envPath = ".env.hermes.local") {
  const absolutePath = path.resolve(process.cwd(), envPath)
  const fileValues = parseHermesEnvFile(readFileSync(absolutePath, "utf8"))
  return validateHermesEnv({ ...process.env, ...fileValues })
}
