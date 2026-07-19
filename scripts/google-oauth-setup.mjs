// One-time local helper: mints a Google OAuth refresh token covering Calendar,
// Gmail, and Drive scopes for the assistant's server-side googleapis client.
//
// Usage:
//   1. In Google Cloud Console, add http://localhost:8090/oauth2callback to
//      the OAuth client's "Authorized redirect URIs" (if not already there).
//   2. GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-oauth-setup.mjs
//      (or set them in .env.local — this script loads it automatically)
//   3. Open the printed URL, sign in, approve. The script prints the new
//      refresh token — put it in .env.local and Vercel Production as
//      GOOGLE_REFRESH_TOKEN.
import { readFileSync, existsSync } from "node:fs"
import { createServer } from "node:http"
import { google } from "googleapis"

const PORT = 8090
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
]

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url)
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue
    const idx = line.indexOf("=")
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Set them in .env.local or the environment.")
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
})

console.log("Open this URL, sign in, and approve access:\n")
console.log(authUrl)
console.log(`\nWaiting for redirect on ${REDIRECT_URI} ...`)

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI)
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404)
    res.end()
    return
  }

  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain" })
    res.end(`OAuth error: ${error ?? "no code returned"}`)
    console.error("OAuth error:", error ?? "no code returned")
    server.close()
    process.exit(1)
  }

  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Done — you can close this tab.")

  try {
    const { tokens } = await oauth2Client.getToken(code)
    console.log("\nRefresh token (put this in .env.local and Vercel Production as GOOGLE_REFRESH_TOKEN):\n")
    console.log(tokens.refresh_token ?? "(none returned — token may already exist for this client/account; revoke prior access at https://myaccount.google.com/permissions and retry)")
  } catch (tokenError) {
    console.error("Token exchange failed:", tokenError instanceof Error ? tokenError.message : tokenError)
  } finally {
    server.close()
    process.exit(0)
  }
})

server.listen(PORT)
