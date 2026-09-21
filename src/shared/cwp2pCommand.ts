export const CWP2P_CLI_COMMANDS = new Set([
  'status',
  'peer',
  'port',
  'charge',
  'health-check',
  'version',
  'help'
])

export type ParsedCwp2pLine =
  | { ok: true; args: string[] }
  | { ok: false; error: string }

function isCwp2pBinaryName(token: string): boolean {
  const base = token.trim().replace(/^["']|["']$/g, '').split(/[/\\]/).pop() ?? token
  return base.replace(/\.exe$/i, '').toLowerCase() === 'cwp2p'
}

function tokenizeCwp2pLine(line: string): ParsedCwp2pLine {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const character of line) {
    if (quote) {
      if (character === quote) {
        quote = null
        continue
      }
      current += character
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += character
  }

  if (quote) return { ok: false, error: 'That command has an unclosed quote.' }
  if (current) tokens.push(current)
  return { ok: true, args: tokens }
}

export function parseCwp2pLine(line: string): ParsedCwp2pLine {
  const trimmed = line.trim()
  if (!trimmed) {
    return { ok: false, error: 'Type a cwp2p command, such as status or peer list.' }
  }
  if (trimmed.length > 2000) {
    return { ok: false, error: 'That command is too long.' }
  }

  const tokens = tokenizeCwp2pLine(trimmed)
  if (!tokens.ok) return tokens
  if (tokens.args.length > 32) {
    return { ok: false, error: 'That command has too many parts.' }
  }

  let args = tokens.args
  if (args[0] && isCwp2pBinaryName(args[0])) {
    args = args.slice(1)
  }

  if (args.length === 0 || args.every((token) => token.startsWith('-'))) {
    if (args.some((token) => token === '--help' || token === '-h')) {
      return { ok: true, args: ['help'] }
    }
    return {
      ok: false,
      error:
        'That would start another Causeway process. Start or stop it from Status. Here, run commands such as status or peer list.'
    }
  }

  const command = args[0].toLowerCase()
  if (!CWP2P_CLI_COMMANDS.has(command)) {
    return {
      ok: false,
      error: `Unknown command "${args[0]}". Try status, peer, port, charge, health-check, version, or help.`
    }
  }

  return { ok: true, args: [command, ...args.slice(1)] }
}

export function cliTimeoutMs(args: string[]): number {
  if (args[0] === 'health-check') return 90_000
  if (args[0] === 'charge') return 60_000
  return 20_000
}
