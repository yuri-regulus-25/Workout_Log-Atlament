export declare const logoVariantStorageKey = 'atlament.system.branding.logoVariant'
export declare const logoVariants: { readonly primary: 'primary'; readonly secondary: 'secondary' }
export declare const brandVariants: { readonly green: 'green'; readonly violet: 'violet' }
export type LogoVariant = keyof typeof logoVariants
export type BrandVariant = keyof typeof brandVariants
export declare const logoAssets: Record<LogoVariant, string>
export declare function normalizeLogoVariant(value: unknown): LogoVariant
export declare function normalizeBrandVariant(value: unknown): BrandVariant
export declare function getBrandVariantForLogoVariant(variant: unknown): BrandVariant
export declare function getLogoVariantForBrandVariant(variant: unknown): LogoVariant
export declare function readLogoVariant(storage?: Storage): LogoVariant
export declare function readStoredBrandVariant(storage?: Storage): BrandVariant
export declare function applyBrandVariant(variant: unknown, root?: Element): BrandVariant
export declare function writeLogoVariant(variant: unknown, storage?: Storage): LogoVariant
export declare function toggleLogoVariant(currentVariant: unknown, storage?: Storage): LogoVariant
export declare function getLogoAssetPath(variant: unknown, basePath?: string): string
export declare function initializeBrandingLogo(options: { image: HTMLImageElement | null | undefined; trigger: EventTarget | null | undefined; basePath?: string }): { dispose(): void }
export declare function initializeStoredBrandVariant(options?: {
  root?: Element
  storage?: Storage
}): { dispose(): void }
