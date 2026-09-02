# FX-14 / FX-15 Loading Overlayの視認性と背面操作抑止

## 概要

Loading Overlayについて、Dark ModeでLoaderが背景へ溶ける視認性問題と、Overlay表示中でも背面スクロールできるInteraction問題を分離して整理する。

---

# FX-14 Dark ModeでLoaderを明確に見せる

## 確認した現象

確認画像: `Codex 画像 2026年9月2日 01_10_59.png`

Loading Overlay表示中、画面全体は暗くなるが、円形Loaderのコントラストが低く、処理中であることを一目で把握しにくい。

## 要求

- Dark ModeでもLoaderが明確に視認できること。
- Overlay背景とLoaderのactive部分が十分に区別できること。
- Light / Dark双方で視認性を確認すること。
- Loaderの表示目的は「現在処理中である」ことを明確に伝えること。

## 会話中の改善候補

- active部分へAccent Color等を使用する。
- Overlayとのcontrastを確保する。

色の最終指定は037.mdでは確定していないため、固定値を勝手に指定しない。

## 対象外

- Loader方式そのものの変更。
- Loaderサイズ・位置の全面再設計。

---

# FX-15 Overlay表示中の背面Interactionを抑止する

## 確認した現象

ユーザーから明示された確認済み事実:

> Overlay表示中でも背面をスクロールできる。

Button / Link等まで操作可能かは未確認。

したがって「背面Buttonも押せる」とは断定しない。

## 要求

Loading Overlayが画面操作をBlockingする用途で表示されている間、背面を操作対象にしない。

最低限、確認済み問題である背面Scrollを抑止する。

さらに実装・UTでは次のInteractionが背面へ抜けないか確認する。

- Pointer / Tap
- Button / Link activation
- Focus移動
- Keyboard操作

Overlay解除後は通常操作へ戻ること。

## 受入条件

1. Overlay表示中に背面Pageをscrollできない。
2. Overlay表示中に背面の操作可能要素へPointer / Tapが到達しないことをUTで確認する。
3. Keyboard / Focus操作も背面へ抜けないことを確認する。
4. Overlay解除後、通常操作へ復帰する。
5. FX-14のLoaderが視認可能で、単に画面が暗転しただけの状態にならない。

## 注意

FX-14は「処理中であることを見せる」問題、FX-15は「処理中に背面操作を許さない」問題であり、別の責務として検証する。
