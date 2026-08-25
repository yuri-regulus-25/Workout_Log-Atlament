export type EasterEggAsset = {
  id: string
  filename: string
  rarity: 'common' | 'rare'
  rareType: string | null
  voiceCategories: string[]
}

export type EasterEggVoice = {
  id: string
  category: string
  text: string
}

export type EasterEggSelection = {
  asset: EasterEggAsset
  voice: EasterEggVoice
}

export declare const easterEggAssets: EasterEggAsset[]
export declare function selectEasterEgg(random?: () => number): EasterEggSelection
export declare function createTriggerController(options: { threshold?: number; onTrigger?: () => void }): { click(): number; reset(): void; getCount(): number }
export declare function createEasterEggDisplayController(options: { host: HTMLElement | null | undefined; assetBasePath?: string; displayMs?: number; animationMs?: number }): { enqueue(renderItem: () => EasterEggSelection): Promise<void>; dispose(): void; getQueueSize(): number; isRunning(): boolean }
export declare function initializeCharacterEasterEgg(options?: { trigger?: EventTarget | null | undefined; host?: HTMLElement | null | undefined; assetBasePath?: string }): { dispose(): void }
