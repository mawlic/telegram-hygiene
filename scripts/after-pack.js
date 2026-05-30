const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')
const path = require('path')

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context
  const appName = packager.appInfo.productFilename
  const electronBinaryPath = path.join(appOutDir, `${appName}.app`, 'Contents', 'MacOS', appName)

  await flipFuses(path.join(appOutDir, `${appName}.app`), {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: false,
  })
}
