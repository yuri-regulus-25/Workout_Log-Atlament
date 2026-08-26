export declare const logoVariantStorageKey = 'atlament.system.branding.logoVariant'
export declare const logoVariants: { readonly primary: 'primary'; readonly secondary: 'secondary' }
export type LogoVariant = keyof typeof logoVariants
export declare const logoAssets: Record<LogoVariant, string>
export declare function normalizeLogoVariant(value: unknown): LogoVariant
export declare function readLogoVariant(storage?: Storage): LogoVariant
export declare function writeLogoVariant(variant: unknown, storage?: Storage): LogoVariant
export declare function toggleLogoVariant(currentVariant: unknown, storage?: Storage): LogoVariant
export declare function getLogoAssetPath(variant: unknown, basePath?: string): string
export declare function initializeBrandingLogo(options: { image: HTMLImageElement | null | undefined; trigger: EventTarget | null | undefined; basePath?: string }): { dispose(): void }
