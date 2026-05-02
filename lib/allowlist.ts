export function getAllowedEmails() {
  return (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email?: string | null) {
  const allowed = getAllowedEmails()
  if (!allowed.length) return true
  return Boolean(email && allowed.includes(email.toLowerCase()))
}
