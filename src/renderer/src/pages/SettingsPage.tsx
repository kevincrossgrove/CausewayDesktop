import { useState } from 'react'
import type { AppSnapshot, LogLevel } from '@shared/types'
import { AppearancePicker, Notice, PageHeader } from '../ui'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const levels: LogLevel[] = ['fatal', 'error', 'warning', 'info', 'debug', 'verbose']

export default function SettingsPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [bindAddress, setBindAddress] = useState(snapshot.settings.bindAddress)
  const [folderBusy, setFolderBusy] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)
  const folder = snapshot.settings.causewayFolder
  const running = snapshot.daemon.running || snapshot.daemon.starting

  async function changeFolder(): Promise<void> {
    setFolderBusy(true)
    setFolderError(null)
    try {
      const result = await window.causeway.pickFolder()
      if (!result.ok) {
        if (result.error !== 'No folder selected.') {
          setFolderError(result.error ?? 'Could not connect that folder.')
        }
        return
      }
      onChange(await window.causeway.getSnapshot())
    } finally {
      setFolderBusy(false)
    }
  }

  async function unlinkFolder(): Promise<void> {
    setFolderBusy(true)
    setFolderError(null)
    try {
      onChange(await window.causeway.unlinkFolder())
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : String(error))
    } finally {
      setFolderBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Settings"
        description="Causeway folder, appearance, bind address, and log level for this app and the daemon."
      />

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Causeway folder</h3>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed">
          This app uses the unzipped folder that contains <code>{snapshot.binaryName}</code>. Changing
          it is the same as the folder chip in the sidebar. Unlink to disconnect this app from that
          folder. Files on disk stay put.
          {running ? ' Unlinking also stops Causeway.' : ''}
        </p>
        {folder ? (
          <p className="mb-4 break-all font-mono text-[13px] leading-snug">{folder}</p>
        ) : (
          <p className="mb-4 text-sm">No folder connected.</p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button disabled={folderBusy} onClick={() => void changeFolder()}>
            {folderBusy ? 'Working…' : 'Change folder…'}
          </Button>
          <Button
            variant="outline"
            disabled={folderBusy || !folder}
            onClick={() => void unlinkFolder()}
          >
            Unlink folder
          </Button>
        </div>
        {folderError ? (
          <div className="mt-4">
            <Notice>{folderError}</Notice>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Appearance</h3>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed">
          Choose light, dark, or follow the system.
        </p>
        <AppearancePicker
          value={snapshot.settings.appearance}
          onChange={(appearance) => void window.causeway.setAppearance(appearance).then(onChange)}
        />
      </section>

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Daemon</h3>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed">
          Bind address and log level match <code>--bind-address</code> and <code>--log-level</code>.
          Restart Causeway after changing those.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="max-w-56">
            <FieldLabel htmlFor="bind-address">Bind address</FieldLabel>
            <Input
              id="bind-address"
              value={bindAddress}
              onChange={(event) => setBindAddress(event.target.value)}
            />
          </Field>
          <Button onClick={() => void window.causeway.setBindAddress(bindAddress).then(onChange)}>
            Save address
          </Button>
          <Field className="max-w-44">
            <FieldLabel>Log level</FieldLabel>
            <Select
              value={snapshot.settings.logLevel}
              onValueChange={(value) => {
                if (value) void window.causeway.setLogLevel(value as LogLevel).then(onChange)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>
    </div>
  )
}
