import test from "node:test"
import assert from "node:assert/strict"

const envModule = await import("./env.ts")

test("parseHermesEnvFile reads quoted and unquoted values", () => {
  const parsed = envModule.parseHermesEnvFile(`
FOCUSOS_SUPABASE_URL="https://example.supabase.co"
FOCUSOS_SUPABASE_SERVICE_ROLE_KEY=service-key
FOCUSOS_USER_EMAIL="you@example.com"
FOCUSOS_AGENT_NAME=Hermes
FOCUSOS_DEFAULT_RUN_ID=run-1
FOCUSOS_OBSIDIAN_VAULT_PATH="/Users/matthew/Obsidian"
`)

  assert.equal(parsed.FOCUSOS_SUPABASE_URL, "https://example.supabase.co")
  assert.equal(parsed.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY, "service-key")
  assert.equal(parsed.FOCUSOS_USER_EMAIL, "you@example.com")
  assert.equal(parsed.FOCUSOS_AGENT_NAME, "Hermes")
  assert.equal(parsed.FOCUSOS_DEFAULT_RUN_ID, "run-1")
  assert.equal(parsed.FOCUSOS_OBSIDIAN_VAULT_PATH, "/Users/matthew/Obsidian")
})

test("validateHermesEnv rejects missing required values", () => {
  const result = envModule.validateHermesEnv({
    FOCUSOS_SUPABASE_URL: "https://example.supabase.co",
  })

  assert.deepEqual(result, {
    ok: false,
    error:
      "Missing Hermes env: FOCUSOS_SUPABASE_SERVICE_ROLE_KEY, FOCUSOS_USER_EMAIL, FOCUSOS_AGENT_NAME",
  })
})

test("validateHermesEnv accepts complete values", () => {
  const result = envModule.validateHermesEnv({
    FOCUSOS_SUPABASE_URL: "https://example.supabase.co",
    FOCUSOS_SUPABASE_SERVICE_ROLE_KEY: "service-key",
    FOCUSOS_USER_EMAIL: "You@Example.com",
    FOCUSOS_AGENT_NAME: "Hermes",
  })

  assert.equal(result.ok, true)
  assert.equal(result.env.FOCUSOS_AGENT_NAME, "Hermes")
  assert.equal(result.env.FOCUSOS_USER_EMAIL, "you@example.com")
})

test("validateHermesEnv rejects unknown agents", () => {
  const result = envModule.validateHermesEnv({
    FOCUSOS_SUPABASE_URL: "https://example.supabase.co",
    FOCUSOS_SUPABASE_SERVICE_ROLE_KEY: "service-key",
    FOCUSOS_USER_EMAIL: "you@example.com",
    FOCUSOS_AGENT_NAME: "Unknown",
  })

  assert.deepEqual(result, {
    ok: false,
    error: "FOCUSOS_AGENT_NAME must be one of Hermes, Nova, Atlas, Pulse, Dev.",
  })
})
