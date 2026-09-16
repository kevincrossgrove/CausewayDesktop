const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function adHocSignMac(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)

  try {
    execFileSync('codesign', ['--verify', appPath], { stdio: 'pipe' })
    return
  } catch {
    // Unsigned Apple Silicon builds show up as "damaged" until they have at least an ad-hoc signature.
  }

  execFileSync('codesign', ['--sign', '-', '--force', '--deep', appPath], { stdio: 'inherit' })
}
