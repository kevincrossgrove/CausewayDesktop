import { useEffect, useState } from 'react'
import type { AppSnapshot, FolderConnectResult } from '@shared/types'
import { AppearancePicker, BrandMark, Button, Card, CardLabel } from '../ui'

type Props = {
  snapshot: AppSnapshot
  onConnected: (snapshot: AppSnapshot) => void
}

export default function SetupWizard({ snapshot, onConnected }: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FolderConnectResult | null>(null)

  const setupVideoId = snapshot.platform === 'win32' ? 'TT3-NVyHfoE' : 'xW9VghMCyWs'
  const setupVideoTitle =
    snapshot.platform === 'win32' ? 'Causeway CLI Windows Setup Guide' : 'Causeway CLI Mac Setup Guide'

  const steps =
    snapshot.platform === 'darwin'
      ? [
          <>
            Open the Causeway download page and get the <strong>{snapshot.downloadName}</strong> build
            for this {snapshot.platformLabel} computer.
          </>,
          <>
            Unzip the download. Keep {snapshot.binaryName} inside that folder.
          </>,
          <>
            In Terminal, run <code>chmod +x cwp2p</code> in that folder. If macOS blocks it, click Done,
            then System Settings → Privacy &amp; Security → Open Anyway.
          </>,
          <>Come back here and connect that unzipped folder. Do not select the .zip file.</>
        ]
      : [
          <>
            Open the Causeway download page and get the <strong>{snapshot.downloadName}</strong> build
            for this {snapshot.platformLabel} computer.
          </>,
          <>
            Unzip the download. Keep {snapshot.binaryName} inside that folder.
          </>,
          <>
            If Windows SmartScreen appears, choose Run anyway. For WireGuard mode, keep WinTUN next to{' '}
            {snapshot.binaryName} in the same folder.
          </>,
          <>Come back here and connect that unzipped folder. Do not select the .zip file.</>
        ]

  async function applyResult(next: FolderConnectResult): Promise<void> {
    setResult(next)
    if (!next.ok) {
      setError(next.error ?? 'Could not connect that folder.')
      return
    }
    setError(null)
    onConnected(await window.causeway.getSnapshot())
  }

  async function pickFolder(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await applyResult(await window.causeway.pickFolder())
    } finally {
      setBusy(false)
    }
  }

  async function connectKnown(folder: string): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await applyResult(await window.causeway.connectFolder(folder))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [snapshot.platform])

  return (
    <div className="grid min-h-full grid-cols-1 desk:grid-cols-[minmax(340px,40%)_minmax(0,1fr)]">
      <section className="flex flex-col gap-8 border-line bg-bg p-6 max-desk:border-b desk:border-r desk:p-10">
        <header className="flex items-start gap-3">
          <BrandMark className="mt-0.5 size-10 rounded-xl" />
          <div>
            <h1 className="m-0 text-[17px] font-bold tracking-tight">Causeway</h1>
            <p className="mt-1 text-sm leading-snug text-muted">
              A graphical wrapper around the official CLI
            </p>
          </div>
        </header>

        <div>
          <h2 className="m-0 text-[2.15rem] font-bold leading-[1.1] tracking-tight">
            Install Causeway, then connect the folder
          </h2>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted">
            This app does not include the Causeway binary. Download it from NetcoreNetwork, unzip it, and
            point this app at that folder. It will look for <code>{snapshot.binaryName}</code>.
          </p>
        </div>

        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-cream dark:bg-cream dark:text-[#12110f]">
                {index + 1}
              </span>
              <p className="m-0 text-[15px] leading-relaxed text-muted">{step}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full px-4 py-2.5 sm:w-auto"
            onClick={() => void window.causeway.openExternal(snapshot.downloadUrl)}
          >
            Download Causeway
          </Button>
          <Button
            className="w-full px-4 py-2.5 sm:w-auto"
            onClick={() => void window.causeway.openExternal(snapshot.learnUrl)}
          >
            Learn about NetcoreNetwork
          </Button>
        </div>

        <div className="mt-auto border-t border-line pt-6">
          <p className="mb-2 font-label text-xs font-bold uppercase tracking-[0.1em] text-ink">Appearance</p>
          <AppearancePicker
            value={snapshot.settings.appearance}
            onChange={(appearance) =>
              void window.causeway.setAppearance(appearance).then((next) => onConnected(next))
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-5 bg-raised p-6 desk:p-10">
        <div>
          <h2 className="m-0 text-[2.15rem] font-bold leading-[1.1] tracking-tight">
            Connect the unzipped folder
          </h2>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
            Choose the folder that contains {snapshot.binaryName}. This app remembers it and uses it to
            start Causeway and run commands.
          </p>
        </div>

        {snapshot.candidateFolders.length > 0 && (
          <Card className="flex flex-col gap-3">
            <CardLabel>Found on this computer</CardLabel>
            {snapshot.candidateFolders.map((folder) => (
              <div key={folder} className="flex flex-wrap items-center justify-between gap-2.5">
                <code className="break-all">{folder}</code>
                <Button variant="primary" disabled={busy} onClick={() => void connectKnown(folder)}>
                  Connect this folder
                </Button>
              </div>
            ))}
          </Card>
        )}

        <div>
          <Button variant="primary" className="px-4 py-2.5" disabled={busy} onClick={() => void pickFolder()}>
            {busy ? 'Connecting…' : snapshot.candidateFolders.length > 0 ? 'Connect a different folder' : 'Connect a folder…'}
          </Button>
        </div>
        {error && <p className="text-danger">{error}</p>}
        {result?.ok && (
          <p className="text-muted">
            Connected {result.folder}. Causeway {result.version}
          </p>
        )}

        <Card>
          <CardLabel>{setupVideoTitle}</CardLabel>
          <iframe
            className="mt-1 aspect-video w-full rounded-[10px] border-0 bg-[#12110f]"
            src={`https://www.youtube-nocookie.com/embed/${setupVideoId}`}
            title={setupVideoTitle}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Card>
      </section>
    </div>
  )
}
