import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function CopyButton({
  value,
  label = 'Copy',
  disabled = false
}: {
  value: string
  label?: string
  disabled?: boolean
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Button type="button" variant="outline" onClick={() => void copy()} disabled={disabled || !value}>
      {copied ? 'Copied' : label}
    </Button>
  )
}
