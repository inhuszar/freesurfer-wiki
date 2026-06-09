---
title: "morph_only_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_only_subject"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_only_subject-lh]]"
  - "[[morph_only_subject-rh]]"
  - "[[morph_subject]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - registration
  - morphometry
  - spherical
  - legacy
  - wrapper
---

# morph_only_subject

## Summary

`morph_only_subject` is the **driver** for the legacy registration-only
morphometry pipeline. It simply runs the two hemisphere workers in turn —
[[morph_only_subject-lh]] then [[morph_only_subject-rh]] — each of which
(re)registers an **already-existing** spherical surface to the FreeSurfer atlas
**without** re-running `mris_sphere`. It is the lighter counterpart of
[[morph_subject]]: use it when the subject already has `?h.sphere` and you only
need to rebuild the spherical registration.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/morph_only_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_only_subject`
- **Scripts invoked:**
  [`morph_only_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject#L21)
  and
  [`morph_only_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject#L22).

## Purpose and Context

`morph_only_subject` is the user-facing entry point of the **registration-only**
branch of the legacy morphometry helper family. Where [[morph_subject]] rebuilds
the sphere *and* registers it, this driver dispatches to workers that skip the
sphere build and register an existing `?h.sphere` only. Its sole logic is the two
dispatch calls — there is **no argument or subject validation at all** in this
script. All real behaviour and documentation are in the worker pages
[[morph_only_subject-lh]] / [[morph_only_subject-rh]].

It is **not invoked by `recon-all`** (no reference in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)).

## Inputs

### Required Inputs

- **Subject ID** — the single positional argument (`$1`), passed unchanged to
  both workers. The script does **not** check the argument count or that the
  subject directory exists (it is only 22 lines and goes straight to the two
  calls).

### Input Assumptions

> [!assumption] Pre-built spheres required; nothing is validated here
> Both workers assume `?h.sphere` already exists (they skip `mris_sphere`). This
> driver re-checks nothing — not the argument, not the subject directory, not the
> input surfaces. A bad subject ID simply propagates into the workers.

## Outputs

### Files Created

None directly. The workers write into `$SUBJECTS_DIR/<subjid>/surf/`:
`lh.sphere.reg`, `lh.sphere.dist_new` (from [[morph_only_subject-lh]]) and
`rh.sphere.reg`, `rh.sphere.dist_new` (from [[morph_only_subject-rh]]), and each
worker appends a provenance block to `NOTES`. See [[morph_only_subject-lh]] for
specifications.

## Mathematical Foundations

None — pure dispatcher. All numerics are in [[mris_register]] (via the workers).

## Configuration Options

### Complete Flag Reference

`morph_only_subject` takes **no option flags** — only a single positional subject
ID.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`; passed to both workers. Not validated by this script. |

### Configuration Interactions

None — no flags. Dispatch order is left hemisphere then right
([`scripts/morph_only_subject:21-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject#L21-L22)).

> [!gotcha] `-f` shell + no validation → failures are not surfaced
> The shebang is `#!/bin/tcsh -f` (not `-ef`), so a failure in the left-hemisphere
> worker does **not** stop the right-hemisphere worker, and there is no exit-status
> handling. Inspect the outputs after running.

## Typical Use Cases

### Use Case 1: Re-register both hemispheres without rebuilding spheres

```bash
export SUBJECTS_DIR=/data/subjects
morph_only_subject bert     # runs morph_only_subject-lh, then -rh
```

### Use Case 2: When to prefer this over `morph_subject`

```bash
# The subject already has lh.sphere / rh.sphere (e.g. from recon-all);
# you only want fresh atlas registrations. Skip the costly mris_sphere:
morph_only_subject bert
```

## Pipeline Context

Entry point of the legacy `morph_only_subject` family; **not** part of the
`recon-all` stream.

**Predecessor:** existing `?h.sphere` surfaces (from [[mris_sphere]] /
[[morph_subject]] / `recon-all`) → **This tool** → **Successors:**
[[morph_only_subject-lh]] and [[morph_only_subject-rh]] (internally
[[mris_register]] ×2 each).

## Gotchas and Caveats

> [!gotcha] Thin, unvalidated wrapper
> This driver does no checking whatsoever — read [[morph_only_subject-lh]] for the
> actual processing, outputs, and the (lack of) error handling.

## Error Compensation and Guard Rails

None. No argument check, no subject-directory check, and the `-f` shell does not
abort on sub-tool failure.

## Related Tools

- [[morph_only_subject-lh]] — left-hemisphere worker (canonical documentation).
- [[morph_only_subject-rh]] — right-hemisphere worker.
- [[morph_subject]] — the heavier sibling driver that **also** rebuilds the sphere
  and maps the central sulcus.
- [[mris_register]] — performs the spherical atlas registrations.

## Confidence and Gaps

**High confidence.** The script is two dispatch lines plus the license header;
behaviour read directly from
[`scripts/morph_only_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject).

## References

- FreeSurfer source: [`scripts/morph_only_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject) (v8.2.0).
- Per-hemisphere behaviour and method references: [[morph_only_subject-lh]].
