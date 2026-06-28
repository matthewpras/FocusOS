import test from 'node:test'
import assert from 'node:assert/strict'

const realtimeModule = await import('./realtime-channel.ts')

test('getRealtimeChannelName keeps topic readable and unique per call', () => {
  const first = realtimeModule.getRealtimeChannelName('captures', 'user-123')
  const second = realtimeModule.getRealtimeChannelName('captures', 'user-123')

  assert.match(first, /^captures-user-123-/)
  assert.match(second, /^captures-user-123-/)
  assert.notEqual(first, second)
})
