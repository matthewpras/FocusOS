export type PasswordAuthAction = "sign-in" | "sign-up"

type ValidatePasswordAuthInputArgs = {
  email: string
  password: string
  allowlist?: string[]
}

type ValidPasswordAuthInput = {
  ok: true
  email: string
  password: string
}

type InvalidPasswordAuthInput = {
  ok: false
  error: string
}

export function validatePasswordAuthInput({
  email,
  password,
  allowlist = [],
}: ValidatePasswordAuthInputArgs):
  | ValidPasswordAuthInput
  | InvalidPasswordAuthInput {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return { ok: false, error: "Enter your email." }
  }

  if (allowlist.length > 0 && !allowlist.includes(normalizedEmail)) {
    return { ok: false, error: "Email not allowed for this workspace." }
  }

  if (!password) {
    return { ok: false, error: "Enter your password." }
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }

  return {
    ok: true,
    email: normalizedEmail,
    password,
  }
}

export function getPasswordAuthSuccessMessage(action: PasswordAuthAction) {
  return action === "sign-up"
    ? "Account created. You can sign in now."
    : "Signed in. Redirecting…"
}
