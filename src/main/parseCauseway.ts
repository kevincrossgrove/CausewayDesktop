import type { ParsedPeer, ParsedStatus, PortMapping } from '@shared/types'

function labeledFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(\S[\w ./+()-]{1,}?)\s{2,}(\S.*)$/)
    if (match) {
      fields[normalizeKey(match[1])] = match[2].trim()
    }
  }
  return fields
}

function normalizeKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findField(fields: Record<string, string>, ...names: string[]): string | null {
  for (const name of names) {
    const value = fields[normalizeKey(name)]
    if (value) return value
  }
  return null
}

export function parseStatus(text: string): ParsedStatus {
  const fields = labeledFields(text)
  const peersLine = findField(fields, 'Peers')
  let connectedPeers: string | null = null
  let totalPeers: string | null = null
  if (peersLine) {
    const match = peersLine.match(/(\d+)\s+of\s+(\d+)/i)
    if (match) {
      connectedPeers = match[1]
      totalPeers = match[2]
    }
  }

  const warningLine =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /warning|insufficient|utxo|recovery/i.test(line) && !/^peers\b/i.test(line)) ??
    null

  return {
    running: /causeway is running|^ready$/im.test(text),
    nodeCount: findField(fields, 'Active NetcoreNetwork nodes', 'NetcoreNetwork nodes'),
    mode: findField(fields, 'Mode'),
    localId: findField(fields, 'NetcoreNetwork ID', 'ID') ?? parseIdFromLogs(text),
    publicEndpoint: findField(fields, 'Public Endpoint'),
    nat: findField(fields, 'NAT'),
    connectedPeers,
    totalPeers,
    recoveryWarning: warningLine && !/causeway is running/i.test(warningLine) ? warningLine : null
  }
}

export function parseIdFromLogs(text: string): string | null {
  const match = text.match(/(?:^|\n)\s*ID:\s*([0-9a-f]{64})\s*(?:\n|$)/i)
  if (match) return match[1].toLowerCase()
  const labeled = text.match(/NetcoreNetwork ID\s+([0-9a-f]{64})/i)
  return labeled ? labeled[1].toLowerCase() : null
}

function parseMappingList(value: string | null): PortMapping[] {
  if (!value || value === '-' || value.toLowerCase() === 'none') return []
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [localPort, remotePort] = item.split(':')
      return { localPort: localPort ?? item, remotePort: remotePort ?? localPort ?? item }
    })
}

function parsePeerBlock(block: string): ParsedPeer | null {
  const trimmed = block.trim()
  if (!trimmed) return null
  const fields = labeledFields(trimmed)
  const name =
    findField(fields, 'Name', 'Peer') ??
    trimmed.split(/\r?\n/)[0]?.replace(/^peer\s+/i, '').trim() ??
    ''
  const id = findField(fields, 'ID', 'Peer ID', 'NetcoreNetwork ID') ?? ''
  if (!name && !id) return null

  return {
    name: name || id.slice(0, 8),
    id,
    status: findField(fields, 'Status'),
    connectionType: findField(fields, 'Connection type', 'Type', 'Connection'),
    rtt: findField(fields, 'RTT', 'Selected-pair RTT', 'Selected pair RTT'),
    selectedEndpoint: findField(fields, 'Selected endpoint', 'Selected'),
    publishedEndpoint: findField(fields, 'Published endpoint', 'Published'),
    mappings: parseMappingList(findField(fields, 'Mappings', 'Ports', 'Port mappings')),
    needsReAdd: /re-add|migrated/i.test(trimmed),
    raw: trimmed
  }
}

export function parsePeerList(text: string): ParsedPeer[] {
  const body = text.trim()
  if (!body) return []

  const blocks = body.split(/\r?\n\s*\r?\n/).map((block) => block.trim()).filter(Boolean)
  const fromBlocks = blocks.map(parsePeerBlock).filter((peer): peer is ParsedPeer => peer !== null)
  if (fromBlocks.length > 0) return fromBlocks

  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const header = lines[0]?.toLowerCase() ?? ''
  if (header.includes('name') && header.includes('id')) {
    return lines.slice(1).map((line) => {
      const parts = line.split(/\s{2,}/)
      return {
        name: parts[0] ?? line,
        id: parts[1] ?? '',
        status: parts[2] ?? null,
        connectionType: parts[3] ?? null,
        rtt: parts[4] ?? null,
        selectedEndpoint: null,
        publishedEndpoint: null,
        mappings: parseMappingList(parts[5] ?? null),
        needsReAdd: /re-add|migrated/i.test(line),
        raw: line
      }
    })
  }

  return []
}
