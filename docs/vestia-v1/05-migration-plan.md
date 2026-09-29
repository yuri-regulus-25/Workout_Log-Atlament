# Vestia v1 — Atlament Migration Plan

## 1. Inputs

Migration reads a frozen Atlament revision. The currently inspected Atlament shape includes:
- `data/workouts/**/*.json` and `*.jsonl`;
- `data/master/machines.json`;
- `data/master/gyms.json`;
- legacy session IDs such as date-based IDs;
- `status`, `schema_version`, explicit set numbers, note arrays;
- Machine/Gym `deleted`, Gym `main`, and other legacy-only fields.

The original Atlament repository/history remains available after cutover.

## 2. Deterministic mapping artifacts

Migration generates and persists a report containing at minimum:
- source revision SHA;
- source resource path and JSONL line when applicable;
- old session ID → new UUID v4;
- old machine ID → Vestia machine ID;
- old gym ID → Vestia gym ID;
- warnings/errors;
- source count / output count / rejected count.

Mapping is generated once and reused on reruns. A rerun must not assign fresh UUIDs to already-mapped source sessions.

## 3. Master ID normalization

Legacy IDs are converted to the Vestia convention, e.g.:
- `af-shioiri` → `af_Shioiri`
- `pectoral-fly` → `pectoral_Fly`
- `shoulder-press` → `shoulder_Press`

Conversion is performed on Master identities first, producing explicit maps. Workout references are rewritten only through those maps.

After conversion, duplicate target IDs are a migration **Error**. The tool must not invent a suffix or choose a winner.

Gym Master additionally receives the reserved:
```json
{"gym_id":"unknown_Gym","name":"Unknown Gym","active":true}
```

Legacy `main` is not migrated into Gym Master. If desired, the legacy main Gym can initialize the separate application default-Gym preference, but this is configuration migration, not Data repository content.

## 4. Workout transformation

For each legacy session:
- assign mapped UUID v4 `session_id`;
- retain date;
- map `gym_id`;
- `machines` → `machine_entries`;
- map each `machine_id`;
- remove explicit `set`; preserve array order;
- `note` → `set_note`;
- machine `notes[]` → `machine_note`;
- session `notes[]` → `session_note`;
- remove `schema_version`, `status`, `condition`, and other fields absent from v1.

When joining legacy note arrays, preserve source order and join entries with newline characters. Empty/whitespace-only resulting notes are omitted.

Legacy `rir:null` becomes omission. Other legacy nulls cannot be emitted into Vestia.

JSONL is split: each line/session becomes its own JSON file.

## 5. Master transformation

Machine:
- keep mapped ID, name, active;
- keep body_part when nonblank;
- drop aliases/source_ids/deleted/schema_version;
- legacy deleted records require reconciliation: if historically referenced, represent as `active:false`; if unreferenced they may be omitted only when the migration report records that decision.

Gym:
- keep mapped ID, name, optional short_name, active;
- drop source_ids/deleted/main/schema_version;
- historically referenced legacy deleted Gym follows the same inactive rule.

## 6. Output and validation

Write migration output to a temporary Vestia-Data working tree. Then run:
1. schema validation for every document;
2. manifest validation;
3. duplicate identity checks;
4. path/date/filename checks;
5. Master reference checks;
6. reserved Gym check;
7. source/output reconciliation.

**Cutover requires Error = 0.** Warnings may remain only when explicitly classified as non-data-loss informational warnings.

## 7. Cutover

1. Freeze chosen Atlament baseline and generate first migration.
2. Validate/reconcile.
3. Stop Atlament writes.
4. Import any final delta using the same mapping/report process.
5. Validate/reconcile again.
6. Establish Vestia-Data as SoT.
7. Freeze Atlament data writes.
8. No bidirectional synchronization.
