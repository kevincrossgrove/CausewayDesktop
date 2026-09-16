const PEER_NAME = /^[A-Za-z0-9._-]+$/
const PEER_ID = /^[0-9a-f]{64}$/i
const MAPPING = /^(\d{1,5}):(\d{1,5})$/

export function sanitizePeerName(value: string): string {
  return value.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '')
}

export function isValidPeerName(value: string): boolean {
  return PEER_NAME.test(value)
}

export function peerNameError(value: string): string | null {
  if (!value) return 'Enter a name with no spaces.'
  if (/\s/.test(value)) return 'Names cannot contain spaces.'
  if (!isValidPeerName(value)) return 'Use letters, numbers, periods, hyphens, and underscores only.'
  return null
}

export function isValidPeerId(value: string): boolean {
  return PEER_ID.test(value.trim())
}

export function peerIdError(value: string): string | null {
  const id = value.trim().toLowerCase()
  if (!id) return 'Enter the 64-character peer ID.'
  if (!isValidPeerId(id)) return 'Peer ID must be 64 lowercase hex characters.'
  return null
}

function portInRange(value: string): boolean {
  const port = Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function isValidMapping(value: string): boolean {
  const match = value.trim().match(MAPPING)
  return Boolean(match && portInRange(match[1]) && portInRange(match[2]))
}

export function parseMappingList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function mappingsError(value: string): string | null {
  const items = parseMappingList(value)
  if (items.length === 0) return null
  const bad = items.find((item) => !isValidMapping(item))
  if (bad) return `Each mapping must look like 8080:80. “${bad}” is not valid.`
  return null
}
