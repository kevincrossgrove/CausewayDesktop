import { useState } from 'react'
import type { AppSnapshot, LogLevel } from '@shared/types'
import { AppearancePicker, Button, controlClass, Field, PageHeader } from '../ui'

const levels: LogLevel[] = ['fatal', 'error', 'warning', 'info', 'debug', 'verbose']

export default function SettingsPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [bindAddress, setBindAddress] = useState(snapshot.settings.bindAddress)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Settings"
        description="Appearance, bind address, and log level for this app and the Causeway daemon."
      />

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
      </section>
    </div>
  )
}
