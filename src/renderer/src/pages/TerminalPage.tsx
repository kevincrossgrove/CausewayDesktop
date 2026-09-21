import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { AppSnapshot } from '@shared/types'
import { cn, Notice, PageHeader } from '../ui'
import { Button } from '@/components/ui/button'

type HistoryEntry = {
  command: string
  output: string
  ok: boolean
}

function displayCommand(line: string): string {
  const trimmed = line.trim()
  if (/^(cwp2p\.exe|cwp2p)(\s|$)/i.test(trimmed)) return trimmed
  return `cwp2p ${trimmed}`
}

function outputFromResult(result: { ok: boolean; stdout: string; stderr: string; error?: string }): string {
  if (result.ok) return result.stdout || result.stderr
  return result.error || result.stderr || result.stdout || 'Command failed.'
}

export default function TerminalPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [typedCommands, setTypedCommands] = useState<string[]>([])
  const [recallIndex, setRecallIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const keepFocus = useRef(false)
  const running = snapshot.daemon.running

  function focusField(): void {
    field.current?.focus()
  }

  useEffect(() => {
    focusField()
  }, [])

  function scrollToBottom(): void {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }

  useLayoutEffect(() => {
    if (!keepFocus.current) return
    focusField()
    if (!busy) keepFocus.current = false
  }, [busy, history])

  useLayoutEffect(() => {
    scrollToBottom()
    const frame = window.requestAnimationFrame(scrollToBottom)
    return () => window.cancelAnimationFrame(frame)
  }, [history, busy])

  async function runLine(line: string): Promise<void> {
    const trimmed = line.trim()
    if (!trimmed || busy) return

    keepFocus.current = true
    setBusy(true)
    setInput('')
    setRecallIndex(null)
    setTypedCommands((previous) => [...previous, trimmed].slice(-100))

    try {
      if (typeof window.causeway.runCli !== 'function') {
        setHistory((previous) =>
          [
            ...previous,
            {
              command: displayCommand(trimmed),
              output: 'Restart the app to enable Terminal commands, then try again.',
              ok: false
            }
          ].slice(-200)
        )
        return
      }

      const result = await window.causeway.runCli(trimmed)
      setHistory((previous) =>
        [
          ...previous,
          {
            command: displayCommand(trimmed),
            output: outputFromResult(result),
            ok: result.ok
          }
        ].slice(-200)
      )
      onChange(await window.causeway.refresh())
    } catch (error) {
      setHistory((previous) =>
        [
          ...previous,
          {
            command: displayCommand(trimmed),
            output: error instanceof Error ? error.message : String(error),
            ok: false
          }
        ].slice(-200)
      )
    } finally {
      setBusy(false)
      focusField()
    }
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault()
    keepFocus.current = true
    void runLine(input)
    focusField()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowUp') {
      if (typedCommands.length === 0) return
      event.preventDefault()
      const next = recallIndex === null ? typedCommands.length - 1 : Math.max(0, recallIndex - 1)
      setRecallIndex(next)
      setInput(typedCommands[next] ?? '')
      return
    }
    if (event.key === 'ArrowDown') {
      if (recallIndex === null) return
      event.preventDefault()
      if (recallIndex >= typedCommands.length - 1) {
        setRecallIndex(null)
        setInput('')
        return
      }
      const next = recallIndex + 1
      setRecallIndex(next)
      setInput(typedCommands[next] ?? '')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden">
      <PageHeader
        title="Terminal"
        description="Same as a second Terminal in the Causeway folder: this app keeps cwp2p running, and you type commands against that process."
        actions={
          history.length > 0 ? (
            <Button variant="outline" disabled={busy} onClick={() => setHistory([])}>
              Clear
            </Button>
          ) : undefined
        }
      />

      {!running && (
        <Notice tone="warn">
          Causeway is stopped. version, help, and health-check still work. Other commands need it
          running.
        </Notice>
      )}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-code">
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-auto px-4 py-3.5 font-mono text-[11px] leading-relaxed"
          onClick={() => field.current?.focus()}
        >
          {history.length === 0 && !busy && (
            <p className="m-0 text-faint">
              Try <code className="text-ink">status</code>, <code className="text-ink">peer list</code>,
              or <code className="text-ink">version</code>.
            </p>
          )}
          <div className="flex flex-col gap-4">
            {history.map((entry, index) => (
              <article key={`${entry.command}-${index}`}>
                <p className="m-0">
                  <span className="text-faint">$ </span>
                  {entry.command}
                </p>
                {entry.output ? (
                  <pre
                    className={cn(
                      'mt-1 mb-0 whitespace-pre-wrap break-words',
                      entry.ok ? '' : 'text-danger'
                    )}
                  >
                    {entry.output}
                  </pre>
                ) : null}
              </article>
            ))}
            {busy && (
              <p className="m-0 text-faint">
                <span>$ </span>
                {displayCommand(typedCommands.at(-1) || input)}
              </p>
            )}
          </div>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-line bg-bg px-3 py-2.5"
        >
          <span className="shrink-0 font-mono text-[11px] text-faint">cwp2p</span>
          <input
            ref={field}
            className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink outline-none placeholder:text-faint"
            value={input}
            onChange={(event) => {
              setRecallIndex(null)
              setInput(event.target.value)
            }}
            onKeyDown={onKeyDown}
            placeholder="status"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            readOnly={busy}
            aria-label="cwp2p command"
          />
          <Button type="button" disabled={busy || !input.trim()} onClick={() => void runLine(input)}>
            Run
          </Button>
        </form>
      </section>
    </div>
  )
}
