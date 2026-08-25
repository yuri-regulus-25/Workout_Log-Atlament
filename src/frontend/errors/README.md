# Error Pages

Error PageのSource Applicationです。

## 管理対象

```text
src/frontend/errors/
├─ common
├─ 404
├─ 500
└─ 503
```

物理ファイルとしては、Build後に以下を生成します。

```text
dist/
├─ common.html
├─ 404.html
├─ 500.html
├─ 503.html
└─ error.css
```

## Build

Repository直下で実行します。

```sh
npm run build
```

Error Page単体では以下を実行できます。

```sh
node src/frontend/errors/build.mjs
```

## 注意点

- Error PagesはFrontend Frameworkを使用しません。
- Error routeの意味やHTTP StatusはWindows AF / Preview側が管理します。
- 本SourceはError Pageの表示資材のみを管理します。
- Error Pageは任意の失敗URLで表示されるため、共有CSSはHosting Root基準の `/error.css` として参照します。
