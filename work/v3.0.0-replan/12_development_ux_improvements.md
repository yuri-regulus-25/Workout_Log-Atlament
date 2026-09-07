# 開発UX改善のv3.0.0統合

## 1. 目的

`work/ui-ux-review-through-v2.1.0/` のDX-01〜DX-04で記録された開発UX要求をv3.0.0へ統合する。

共通する目的は、Release / Debug、Windows / Android、接続先、設定、実機操作を人間の記憶と手作業だけで整合させる運用を減らし、現在の実行対象と操作対象を明示できる開発環境へ移行することである。

具体的なGradle構成、コマンド名、成果物配置、内部Version表現等は元資料で未確定のものがある。要求と実装候補を区別し、現行Repository調査後に方式を決定する。

## 2. Android通常版と開発版の共存

同一Android端末で、通常利用する安定版と開発・試験用アプリを共存可能にする。

受入要求:

- 開発版の導入・更新で通常版を置換・削除しない。
- 通常版を確認したいときに開発途中の状態を強制されない。
- どちらを起動しているか利用者が判別できる。

`applicationIdSuffix`、Build Variant、Flavor、アプリ名・Icon等は実装候補であり、この文書では固定しない。

## 3. Windows / Android AF接続先の自動解決

既存の1-port Auto Targetを維持しながら、Windows AFとAndroid AFを同時利用する開発・試験環境で2-targetを安全に解決できるようにする。

要求:

- Windows AF Processを識別する。
- 対象PIDが実際にListenしているAF候補Portを確認する。
- Windowsが利用していない候補PortをAndroid側へ割り当てる。
- 候補Portを不明Processが使用している場合は推測せず停止する。
- Port Forward設定、解除、設定投入で同じTarget解決規則を利用する。
- Windows用設定とAndroid用設定を独立して保持・投入できる。
- Windows / Androidで異なるGit branch設定を利用できる。
- 双方へ設定するためにPort Forwardを人間が手動で解除・再設定する運用を不要にする。

Secondary Port番号は現行Repositoryから取得し、過去会話を根拠に推測して固定しない。

Target Resolverの具体的なファイル構成・関数名・コマンド仕様は現行Tooling調査後に決定する。

## 4. AndroidアプリのCLI起動

Android App Processが停止した状態から、PC側のCommand Line経由で実機画面を操作せず起動できるようにする。

最低限の受入要求:

- ADB等、PCから利用可能な経路で起動できる。
- Process停止状態から実機操作なしで再起動できる。
- Android App本体へ不要な挙動変更を加えない。

Build、Install、Launch、Port Forward、Health確認を一括化する案や`atlament-dev`等の名称は元資料では確定していない。必要性と既存Toolingを調査して決定する。

## 5. Debug Build分離とBuild識別

Windows / Android双方でRelease用成果物と開発用成果物を明確に分離する。

確定要求:

- `npm run build:debug`を用意する。
- 1つのDebug Build CommandからWindows / Android双方の開発用成果物を生成できる。
- WindowsでRelease相当成果物を開発用として流用しなくてよい状態にする。
- Android Debug成果物は通常版との共存要件を満たす。
- Windows / Android双方で現在のBuild種別を識別できる。
- Settingsから開発用Buildであることを確認できる。
- Release BuildへDebug用Identityを混入させない。

`2.1.0-debug build`は表示例であり、v3.0.0の最終表示形式として固定しない。Product VersionとBuild Variantの内部表現、Commit SHA等の追加情報、成果物出力先は現行構造を調査して決定する。

## 6. 責務境界

開発UX改善をApplication Framework本体へ無秩序に混在させない。

- Build責務はBuild Toolingへ置く。
- AF Target解決は接続先解決の一つの責務としてまとめる。
- Port Forward、解除、設定投入が個別のTarget推測を持たないようにする。
- Android起動支援はアプリの業務機能として実装しない。
- Build Identityを表示するためにProduct Version自体を不自然に書き換えない。

## 7. 試験

少なくとも次を確認する。

- Android通常版と開発版の同時導入。
- 開発版更新後も通常版が残ること。
- Windows単独 / Android単独の既存1-target運用。
- Windows / Android同時稼働時の2-target解決。
- Windows AFがPrimary / Secondaryそれぞれを使用する場合。
- 不明Processが候補Portを占有した場合の安全停止。
- Windows / Androidへ異なる設定を正しい対象へ投入できること。
- Android Process停止後のCLI起動。
- Debug Build生成とBuild Identity表示。
- Release BuildへDebug Identityが混入しないこと。

## 8. 停止条件

以下は推測で確定せず人間判断へ上げる。

- Application ID、Build Variant、Flavor等の具体構成に複数の妥当案があり、既存配布方式へ影響する場合。
- AF候補PortやProcess識別方法が現行実装から一意に確認できない場合。
- `npm run build:debug`を成立させるためRelease Build契約の変更が必要になる場合。
- Build Identityの最終表示文言・内部Version表現を決める必要がある場合。
- 開発Tooling改善がRuntime/APIの公開契約変更を要求する場合。
