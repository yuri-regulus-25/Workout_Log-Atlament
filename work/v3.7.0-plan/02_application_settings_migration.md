# About Application & Settings Ownership Migration

Related Issue: #152

- Astroによるstatic-first read-only Aboutを実装する。
- SettingsにあるVersion情報表示をAboutへ移動する。
- Settings/Aboutで同じVersion情報を重複所有しない。
- Windows / Androidで同じ情報内容を表示する。
- Navigation/hosting/build integrationを行い、既存Settings機能を壊さない。
