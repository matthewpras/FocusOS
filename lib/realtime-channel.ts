let realtimeChannelSequence = 0

export function getRealtimeChannelName(base: string, userId: string) {
  realtimeChannelSequence += 1
  return `${base}-${userId}-${Date.now()}-${realtimeChannelSequence}`
}
