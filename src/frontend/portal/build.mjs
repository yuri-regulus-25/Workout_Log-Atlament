import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const sourceRoot = join(root, 'src')
const distRoot = join(root, 'dist')
const sharedFrontendCommonRoot = join(root, '../../shared/frontend-common/src')
const sharedDesignTokensRoot = join(root, '../../shared/design-tokens/src')
const mdiFontRoot = join(root, '../../../node_modules/@mdi/font')

await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })
await cp(sourceRoot, distRoot, { recursive: true })
await mkdir(join(distRoot, 'design-tokens'), { recursive: true })
await cp(join(sharedDesignTokensRoot, 'tokens.css'), join(distRoot, 'design-tokens/tokens.css'))
await mkdir(join(distRoot, 'frontend-common'), { recursive: true })
await cp(join(sharedFrontendCommonRoot, 'af-client.js'), join(distRoot, 'frontend-common/af-client.js'))
await cp(join(sharedFrontendCommonRoot, 'branding'), join(distRoot, 'frontend-common/branding'), { recursive: true })
await cp(join(sharedFrontendCommonRoot, 'easter-egg'), join(distRoot, 'frontend-common/easter-egg'), { recursive: true })
await cp(join(sharedFrontendCommonRoot, 'theme'), join(distRoot, 'frontend-common/theme'), { recursive: true })
await mkdir(join(distRoot, 'mdi'), { recursive: true })
await cp(join(mdiFontRoot, 'css'), join(distRoot, 'mdi/css'), { recursive: true })
await cp(join(mdiFontRoot, 'fonts'), join(distRoot, 'mdi/fonts'), { recursive: true })
