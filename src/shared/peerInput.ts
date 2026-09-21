import type { PortMapping } from './types'

const PEER_NAME = /^[A-Za-z0-9._-]+$/
const PEER_ID = /^[0-9a-f]{64}$/i
const ONE_MAPPING = /^(\d{1,5})\s*(?:→|->|:)\s*(\d{1,5})$/
const MAPPING_IN_TEXT = /(\d{1,5})\s*(?:→|->|:)\s*(\d{1,5})/g

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

export function parseOneMapping(value: string): PortMapping | null {
  const match = value.trim().match(ONE_MAPPING)
  if (!match || !portInRange(match[1]) || !portInRange(match[2])) return null
  return { localPort: match[1], remotePort: match[2] }
}

export function formatMapping(mapping: PortMapping): string {
  return `${mapping.localPort}:${mapping.remotePort}`
}

export function displayMapping(mapping: PortMapping): string {
  return `${mapping.localPort} → ${mapping.remotePort}`
}

export function isValidMapping(value: string): boolean {
  return parseOneMapping(value) !== null
}

export function parsePortMappings(value: string | null | undefined): PortMapping[] {
  if (!value) return []
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none') return []

  const seen = new Set<string>()
  const mappings: PortMapping[] = []
  for (const match of trimmed.matchAll(MAPPING_IN_TEXT)) {
    if (!portInRange(match[1]) || !portInRange(match[2])) continue
    const mapping = { localPort: match[1], remotePort: match[2] }
    const key = formatMapping(mapping)
    if (seen.has(key)) continue
    seen.add(key)
    mappings.push(mapping)
  }
  return mappings
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

export function cliMappingArgs(value: string): string[] {
  return parseMappingList(value)
    .map((item) => parseOneMapping(item))
    .filter((item): item is PortMapping => item !== null)
    .map(formatMapping)
}

export function formatCliError(
  result: { error?: string; stderr?: string; stdout?: string },
  fallback: string
): string {
  const raw = result.error || result.stderr || result.stdout || ''
  const stripped = raw
    .replace(/^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?\s*/gm, '')
    .replace(/;?\s*usage:\s*cwp2p[^\n]*/gi, '')
    .trim()
    .replace(/[;:\s]+$/, '')
  const unique = [...new Set(stripped.split(/\n+/).map((line) => line.trim()).filter(Boolean))].join('\n')
  if (/peer port mapping is not configured/i.test(unique)) {
    return 'That mapping is not configured on this peer.'
  }
  if (/duplicate TCP mapping/i.test(unique)) {
    return 'That mapping is already open.'
  }
  const already = unique.match(/local port (\d+) is already configured for peer ([0-9a-f]+)/i)
  if (already) {
    return `Port ${already[1]} is already mapped for that peer, so Causeway will not bind it twice. If it is missing from the list, reload this page. To reach another port on them, use a free local port, like 3001:${already[1]}.`
  }
  return unique || fallback
}
