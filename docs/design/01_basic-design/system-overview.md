# System Overview

Workout Log Atlament は、GitHub repository に保存された workout log を閲覧する local application system である。

Application は大きく 3 つの layer で構成される。

- GitHub SoT: raw Workout Log と Master Data の JSON file。
- Application Framework: GitHub data の同期、Runtime Data の normalize、frontend artifact hosting、localhost HTTP API 公開を行う Windows / Android runtime shell。
- Frontend MPA: 異なる Framework で構築された複数の frontend application。

現行 product は read/view/analyze application である。Workout Log editing UI は提供せず、Workout Log または Master Data を GitHub へ write しない。

## Source of Truth

GitHub data は Workout Data および Master Data の source of truth である。Repository の `data/` directory は、Test と Development Runtime で使用する現行 example/source data shape を含む。

Application Framework は GitHub data を読み取り、validate し、Master reference を resolve して、normalized Runtime Data を生成する。Frontend は AF-compatible HTTP API と shared client utility を通じて Runtime Data を consume する。

## Current Applications

現行 frontend surface は以下で構成される。

- Portal
- Dashboard
- Workout Domain
- Performance Detail
- Analytics
- Application Settings
- 404 / 500 / 503 Error Pages

v1.2.0 candidate application は、現行 As-Is 仕様には含まれない。

## Platform Targets

Native application layer の現行 target は以下である。

- Windows: WinForms shell, WebView2, Kestrel localhost server.
- Android: Kotlin Activity, WebView, in-app localhost server.

両 platform は同じ external API shape を公開し、同じ built frontend artifact layout を host する。

## Version Sources

`src/version.json` は cross-platform version value の primary source である。

現行 value:

```json
{
  "frontend": "1.1.1",
  "windows": "1.1.0",
  "android": {
    "versionName": "1.1.0",
    "versionCode": 3
  }
}
```

Windows project metadata と Android Gradle metadata は version CLI により同期される。
