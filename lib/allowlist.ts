type AllowlistSource = "client" | "server"

export function getAllowedEmails(source: AllowlistSource = "server") {
  const raw =
    source === "server"
      ? process.env.ALLOWED_EMAILS ?? process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? ""
      : process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? ""

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(
  email?: string | null,
  source: AllowlistSource = "server",
) {
  const allowed = getAllowedEmails(source)
  if (!allowed.length) return true
  return Boolean(email && allowed.includes(email.toLowerCase()))
}
