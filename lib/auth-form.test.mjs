import test from 'node:test'
import assert from 'node:assert/strict'

const authFormModule = await import('./auth-form.ts')

test('validatePasswordAuthInput trims email and accepts allowed credentials', () => {
  const result = authFormModule.validatePasswordAuthInput({
    email: '  you@example.com  ',
    password: 'long-enough-password',
    allowlist: ['you@example.com'],
  })

  assert.deepEqual(result, {
    ok: true,
    email: 'you@example.com',
    password: 'long-enough-password',
  })
})

test('validatePasswordAuthInput rejects disallowed email', () => {
  const result = authFormModule.validatePasswordAuthInput({
    email: 'other@example.com',
    password: 'long-enough-password',
    allowlist: ['you@example.com'],
  })

  assert.deepEqual(result, {
    ok: false,
    error: 'Email not allowed for this workspace.',
  })
})

test('validatePasswordAuthInput rejects short password', () => {
  const result = authFormModule.validatePasswordAuthInput({
    email: 'you@example.com',
    password: 'short',
    allowlist: ['you@example.com'],
  })

  assert.deepEqual(result, {
    ok: false,
    error: 'Password must be at least 8 characters.',
  })
})

test('getPasswordAuthSuccessMessage matches auth action', () => {
  assert.equal(
    authFormModule.getPasswordAuthSuccessMessage('sign-in'),
    'Signed in. Redirecting…',
  )

  assert.equal(
    authFormModule.getPasswordAuthSuccessMessage('sign-up'),
    'Account created. You can sign in now.',
  )
})
