import { existsSync } from 'fs'
import { chmod, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { binaryName } from './platform'

export async function resolveCausewayInstall(selectedPath: string): Promise<{
  folder: string
  binaryPath: string
}> {
  const looksLikeZip = selectedPath.toLowerCase().endsWith('.zip')
  if (looksLikeZip) {
    throw new Error('Connect the unzipped Causeway folder, not the .zip file.')
  }

  const info = await stat(selectedPath)
  const expected = binaryName()
  let folder = selectedPath
  let binaryPath = join(selectedPath, expected)

  if (info.isFile()) {
    const name = basename(selectedPath)
    if (name !== expected && name !== 'cwp2p' && name !== 'cwp2p.exe') {
      throw new Error(
        `Select the unzipped Causeway folder, or the ${expected} file inside it.`
      )
    }
    folder = dirname(selectedPath)
    binaryPath = selectedPath
  } else if (!existsSync(binaryPath)) {
    throw new Error(
      `No ${expected} found in that folder. Unzip the download from netcore.network/causeway and select that folder.`
    )
  }

  if (process.platform !== 'win32') {
    try {
      await chmod(binaryPath, 0o755)
    } catch {
      // Gatekeeper or permissions may still block execution; the version check reports that.
    }
  }

  return { folder, binaryPath }
}
