# COMMON-02 Pagination件数ラベル統一

## 概要

Frontend全体でPaginationの件数選択ラベルを統一する。

057.mdで、Resource Management側の `Items per page:` とWorkout Domain側の `Show Items` が同じ概念に対して異なる表記になっていることが確認された。

## 確定要求

Frontendを横断確認し、次のような同義ラベルを `Show Items` へ統一する。

- `Items per page`
- `Items per page:`
- その他、同じ件数選択UIを別表記している箇所

対象をResource Managementだけに限定しない。

## 変更しないこと

この指摘はラベル統一だけを対象とする。

0件時にPagination自体を表示するかどうかは別論点であり、057.mdでは決定されていない。

したがって本件のついでに、0件時のPager表示条件等を勝手に変更しない。

## 受入条件

1. 同一の件数選択UIがFrontend内で `Show Items` に統一されている。
2. `Items per page` / `Items per page:` が同じ用途で残っていない。
3. 件数選択ロジックやPagination動作そのものは変更しない。
4. 0件時Pagerの表示要否を本件で勝手に決定しない。
