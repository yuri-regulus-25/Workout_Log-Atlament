# v3.0.0 Implementation Log

## Deferred

- 2-target AF connection resolver: Windows and Android both bind `127.0.0.1:14108` and fall back to `127.0.0.1:45194`; development tooling uses independent fixed ports (`5173` gateway, `5180` Node development runtime, framework dev servers on `5174`-`5181`). Current AF status responses can identify an Atlament-compatible endpoint, but current tooling and runtime code do not expose a stable process identity that can safely distinguish an unknown process from Windows AF, Android AF, a stale instance, or another local service on the same port. Do not infer the owning process from port number alone. Implementation remains deferred until a stable identifier is available from the owning process or launch path.
