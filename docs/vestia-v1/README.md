# Vestia v1 — Manufacturing Blueprint

Status: **Design baseline / implementation-ready draft**

This directory defines the v1 line for Vestia. It is intentionally placed on a work branch of Atlament so that the existing implementation, data, and design documents can be inspected side-by-side. Vestia itself is a new product/repository line; this directory is not a proposal to rename Atlament in place.

## Product line

Vestia is a personal Workout Log application. GitHub remains the external Source of Truth for Workout Data and Master Data. Vestia keeps the useful Atlament architecture boundary — native Application Framework + localhost API + frontend applications — while replacing the data contract and write model.

The v1 implementation shall be driven by these documents:

1. [01-product-and-architecture.md](./01-product-and-architecture.md)
2. [02-data-contract.md](./02-data-contract.md)
3. [03-repository-git-contract.md](./03-repository-git-contract.md)
4. [04-application-contract.md](./04-application-contract.md)
5. [05-migration-plan.md](./05-migration-plan.md)
6. [06-manufacturing-plan.md](./06-manufacturing-plan.md)
7. [07-llm-review-brief.md](./07-llm-review-brief.md)
8. [schemas/](./schemas/)

## Frozen v1 principles

- Vestia Source and Vestia Data are separate repositories.
- Vestia Data is the sole runtime SoT after cutover.
- One WorkoutSession = one JSON file. JSONL is not used.
- No `null`. Optional means omitted, not false.
- Unknown JSON properties are rejected.
- No per-record schema version. Repository contract is identified by `manifest.json`.
- No speculative extension bucket.
- Master references use `gym_id` / `machine_id`.
- Master IDs are not schema-pattern-restricted. UI convention is first token lowercase, subsequent tokens joined by `_` and starting uppercase, e.g. `unknown_Gym`, `pectoral_Fly`.
- `unknown_Gym` / `Unknown Gym` is a system-reserved Gym and is hidden from ordinary maintenance/select UI.
- New Workout writes require active Master references. Historical references remain readable when a Master becomes inactive.
- Git writes use optimistic concurrency. No force push, blind retry, automatic merge, or last-write-wins.
- Broken individual Workout resources are quarantined explicitly; valid resources remain usable.
- Windows, Android, development runtime, and ChatGPT tooling obey the same domain contract.

## Relationship to Atlament

Atlament master was inspected as the migration source. Its current repository contains JSON/JSONL workout resources, Machine/Gym Master files, Windows/Android Application Framework contracts, recovery behavior, and a multi-framework frontend. Vestia does not blindly copy those contracts. The migration plan explicitly maps old concepts to the v1 contract.

Human design decisions are considered closed unless an implementation discovery contradicts a frozen principle or changes product semantics.
