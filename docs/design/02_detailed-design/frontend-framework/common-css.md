# Frontend Common CSS 現行仕様

Common styling は以下に分かれる。

- `src/shared/design-tokens/`
- `src/shared/shared-styles/`
- app-specific CSS files
- error page CSS

## Design Tokens

`src/shared/design-tokens/src/tokens.css` は以下の CSS custom property を定義する。

- background and surface colors
- text colors
- borders
- primary, secondary, and brand colors
- input colors
- hover and focus ring colors
- shadows
- overlay color
- chart colors
- info/success/warning/error colors
- border radius

Theme と brand variant は `:root` 上の CSS selector で表現される。

- default light green
- `:root[data-brand="violet"]`
- `:root[data-theme="dark"]`
- `:root[data-theme="dark"][data-brand="violet"]`

## Shared Styles

`src/shared/shared-styles/src/index.css` は以下を import する。

- design tokens
- base styles
- layout styles
- component styles
- Material Design Icons font CSS

Shared style module は以下を定義する。

- global typography and box sizing
- `.app-shell`
- page hero spacing
- common grids
- metric cards
- panels
- panel headers
- action/link styles
- tables
- shared navigation drawer/header/drawer overlay
- responsive と container-query behavior

## Application CSS

各 frontend application は framework-specific および screen-specific CSS を所有する。Shared styles は framework component を定義せず、application-level CSS を置き換えない。

## Error Page CSS

Error page は分離された `src/frontend/errors/src/error.css` を使用する。これは design token を import し、shared navigation style を含まない簡易 layout を initialize する。

## Accessibility-Relevant Styling

現行 shared styles は common interactive element 向けに、`box-shadow: 0 0 0 3px var(--wl-focus-ring)` を使用した visible focus ring を含む。

Motion reduction は page transition CSS で扱われる。その他の application-specific animation は、存在する場合 application CSS が所有する。
