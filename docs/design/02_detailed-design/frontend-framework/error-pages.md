# Error Pages 現行仕様

## Responsibility

Error Pages は common HTTP/application failure 向けの static frontend page である。

## Source

```text
src/frontend/errors/
├─ src/common.html
├─ src/404.html
├─ src/500.html
├─ src/503.html
├─ src/error.css
└─ build.mjs
```

## Pages

Current dedicated page:

- `404.html`: Page not found
- `500.html`: Internal server error
- `503.html`: Service unavailable

`common.html` は error page source とともに build されるが、current route validation は dedicated 404/500/503 page を中心に扱う。

## Behavior

各 dedicated error page:

- static HTML を使用する
- `error.css` を import する
- stored brand variant を initialize する
- stored theme を initialize する
- Atlament eyebrow、error heading、`Oops!`、explanatory text、Back to Portal link を表示する

Error Pages は以下を使用しない。

- shared application navigation
- Character Easter Egg
- frontend framework runtime

## Build

`src/frontend/errors/build.mjs` は error source file を `src/frontend/errors/dist` へ copy し、design token を copy し、page に必要な frontend-common branding/theme assets を copy する。
