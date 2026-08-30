# Phase 8-F-C — Readiness Credential & Fallback Parity

**Related Issue:** #70

## Objective
Windows / Android のReadiness、Credential、Fallback/LKG semanticsを統一する。

## Contract
- missing credential → unconfigured / Setup
- configured invalid/expired + LKG → degraded
- configured invalid/expired + no LKG → unavailable
- Main Gym未設定はSetup Failureではない。
- remote retrieval failure時、valid LKGがあれば既存Runtimeを継続する。
- fallbackActive等の状態factsはAFが決定する。
