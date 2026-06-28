import test from "node:test"
import assert from "node:assert/strict"

const clientModule = await import("./client.ts")

test("resolveUserIdByEmail returns matching user id case-insensitively", async () => {
  const supabase = {
    auth: {
      admin: {
        async listUsers() {
          return {
            data: {
              users: [
                { id: "user-1", email: "first@example.com" },
                { id: "user-2", email: "Matthew@Example.com" },
              ],
            },
            error: null,
          }
        },
      },
    },
  }

  const userId = await clientModule.resolveUserIdByEmail(
    supabase,
    "matthew@example.com",
  )

  assert.equal(userId, "user-2")
})

test("resolveUserIdByEmail throws when Supabase returns an error", async () => {
  const supabase = {
    auth: {
      admin: {
        async listUsers() {
          return {
            data: { users: [] },
            error: new Error("network failed"),
          }
        },
      },
    },
  }

  await assert.rejects(
    () => clientModule.resolveUserIdByEmail(supabase, "you@example.com"),
    /network failed/,
  )
})

test("resolveUserIdByEmail throws when no user matches", async () => {
  const supabase = {
    auth: {
      admin: {
        async listUsers() {
          return {
            data: { users: [{ id: "user-1", email: "other@example.com" }] },
            error: null,
          }
        },
      },
    },
  }

  await assert.rejects(
    () => clientModule.resolveUserIdByEmail(supabase, "you@example.com"),
    /No FocusOS user found for you@example.com./,
  )
})
