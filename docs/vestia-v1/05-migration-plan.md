# Vestia v1 — Atlament Cutover Note

Status: **outside Vestia v1 manufacturing scope**

Atlament → Vestia is a one-time cutover activity performed before Vestia-Data becomes the runtime Source of Truth. It is **not** a Vestia runtime feature, Application Framework feature, reusable migration framework, or v1 manufacturing deliverable.

The Vestia v1 runtime assumes that its Data repository already conforms to the canonical v1 schemas and repository-integrity rules. The normal runtime does not read Atlament JSON/JSONL or legacy schema shapes.

For the one-time cutover, the operator may use disposable/ad-hoc tooling as appropriate. The cutover must preserve the frozen Atlament source revision, produce v1-conformant output, validate the complete candidate repository, and reach Error = 0 before Vestia-Data is established as SoT. Any uncertain legacy value is resolved during that separate cutover activity rather than by adding compatibility behavior to Vestia v1.

Future Vestia data-contract changes (for example v1 → v2) are separate future design work and do not justify a generic migration subsystem in v1.
