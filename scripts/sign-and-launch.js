const { execSync, spawn } = require('child_process')
const path = require('path')

const appPath = path.join(__dirname, '../dist/mac-arm64/Telegram Hygiene.app')
const entitlements = path.join(__dirname, 'entitlements.plist')

try {
  console.log('→ Signing...')
  execSync(`codesign --force --deep --sign - --entitlements "${entitlements}" "${appPath}"`, { stdio: 'inherit' })
  console.log('→ Launching...')
  spawn('open', [appPath], { detached: true, stdio: 'ignore' }).unref()
  console.log('✓ App launched!')
} catch (e) {
  console.error('Failed:', e.message)
  process.exit(1)
}
