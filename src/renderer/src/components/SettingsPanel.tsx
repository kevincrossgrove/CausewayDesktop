import { useState } from 'react'
import type { AppSnapshot, LogLevel } from '@shared/types'
import { AppearancePicker, Button, controlClass, Field } from '../ui'

const levels: LogLevel[] = ['fatal', 'error', 'warning', 'info', 'debug', 'verbose']

export default function SettingsPanel({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [bindAddress, setBindAddress] = useState(snapshot.settings.bindAddress)

  return (
    <section className="mb-8 rounded-2xl border border-line bg-raised/70 p-5">
      <h2 className="m-0 text-[1.35rem] font-bold tracking-tight">Settings</h2>
      <p className="mt-2 mb-5 max-w-[52ch] text-sm leading-relaxed text-muted">
        Appearance defaults to Light. Bind address and log level match{' '}
        <code>--bind-address</code> and <code>--log-level</code>. Restart Causeway after changing those.
      </p>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-[13px] text-muted">Appearance</p>
          <AppearancePicker
            value={snapshot.settings.appearance}
            onChange={(appearance) => void window.causeway.setAppearance(appearance).then(onChange)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Bind address">
            <input
              className={controlClass}
              value={bindAddress}
              onChange={(event) => setBindAddress(event.target.value)}
            />
          </Field>
          <Button onClick={() => void window.causeway.setBindAddress(bindAddress).then(onChange)}>
            Save address
          </Button>
          <Field label="Log level">
            <select
              className={controlClass}
              value={snapshot.settings.logLevel}
              onChange={(event) => void window.causeway.setLogLevel(event.target.value as LogLevel).then(onChange)}
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </section>
  )
}
