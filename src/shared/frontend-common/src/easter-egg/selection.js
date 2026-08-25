import { easterEggAssets, rareTypeWeights } from './assets.js'
import { getVoicesForCategories } from './voices.js'

export function selectEasterEgg(random = Math.random) {
  const asset = selectAsset(random)
  const voice = selectVoice(asset, random)
  return { asset, voice }
}

export function selectAsset(random = Math.random) {
  const roll = random() * 100
  if (roll < 95) {
    return pick(easterEggAssets.filter((asset) => asset.rarity === 'common'), random)
  }

  const rareType = selectRareType(random)
  return pick(easterEggAssets.filter((asset) => asset.rarity === 'rare' && asset.rareType === rareType), random)
}

export function selectRareType(random = Math.random) {
  const roll = random() * 100
  let cursor = 0
  for (const item of rareTypeWeights) {
    cursor += item.weight
    if (roll < cursor) return item.type
  }
  return rareTypeWeights.at(-1).type
}

export function selectVoice(asset, random = Math.random) {
  const candidates = getVoicesForCategories(asset.voiceCategories)
  if (candidates.length === 0) {
    throw new Error(`No Easter Egg voice candidates for asset: ${asset.id}`)
  }
  return pick(candidates, random)
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)] ?? items[0]
}
