# Phase 8-E-D — Contract & Parity Tests

**Related Issue:** #67

## Objective
Master Reference Runtime Semantics をcontract/parity testで固定する。

## Test Scope
- resolved / missing / deleted
- Workoutおよびaggregate保持
- `?` + WARN + original ID + reason
- fallback/degraded非発火
- referenced Master logical delete
- Master修復後のre-resolve
- Windows / Android parity

Failure時は原因修正後に同一試験を再実施する。
