---
title: "morph_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_subject"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_subject-lh]]"
  - "[[morph_subject-rh]]"
  - "[[morph_only_subject]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
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

# morph_subject

## Summary

`morph_subject` is the **canonical driver** for the legacy per-hemisphere
surface-morphometry pipeline. It validates a subject and then runs both
hemisphere workers in turn — [[morph_subject-lh]] followed by
[[morph_subject-rh]] — each of which inflates the cortical surface to a sphere,
registers it to the FreeSurfer spherical atlas, and maps the central-sulcus
label. `morph_subject` itself does no image processing: it is a thin orchestrator
over the two hemisphere scripts.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/morph_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_subject`
- **Scripts invoked:**
  [`morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L35)
  and
  [`morph_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L36).

## Purpose and Context

`morph_subject` is the user-facing entry point of a **legacy morphometry helper
family**. Where the per-hemisphere registration is today performed inside
[[wiki/pipelines/recon-all|recon-all]]'s surface stages, this script provides a
stand-alone, both-hemispheres path to (re)build the spherical registration for a
subject. Its only logic is argument/subject validation and dispatch to the two
hemisphere workers; all of the real work (and the detailed documentation) lives
in [[morph_subject-lh]] / [[morph_subject-rh]].

It is **not invoked by `recon-all`** — there is no reference to it in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).
The cluster-submission wrapper `morph_subject_on_seychelles` bypasses this driver
and `pbsubmit`s the two hemisphere scripts directly. The
`make_average_subject` / `make_average_surface` / `make_average_volume` scripts
mention `morph_subject` only in their "SEE ALSO" help text; they do not call it.

## Inputs

### Required Inputs

- **Subject ID** — the single positional argument (`$1`). Exactly one argument is
  required; otherwise the script prints usage and exits 1
  ([`scripts/morph_subject:23-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L23-L27)).
- **An existing subject directory** `$SUBJECTS_DIR/<subjid>`, checked for
  existence before dispatch
  ([`scripts/morph_subject:29-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L29-L33)).

### Input Assumptions

> [!assumption] Inherits all input requirements from the hemisphere workers
> `morph_subject` checks only that the subject directory exists. The real input
> requirements — an inflated surface (`?h.inflated`), curvature/sulc maps, and
> the `$FREESURFER_HOME/average/*.average.tif` atlas templates — are imposed by
> [[morph_subject-lh]] / [[morph_subject-rh]] and are **not** re-checked here.

## Outputs

### Files Created

`morph_subject` writes no files of its own. The outputs are produced by the
hemisphere workers in `$SUBJECTS_DIR/<subjid>/surf/`:

- `lh.sphere`, `lh.sphere.reg`, `lh.rh.sphere.reg` and central-sulcus labels
  (from [[morph_subject-lh]]);
- `rh.sphere`, `rh.sphere.reg`, `rh.rh.sphere.reg` and central-sulcus labels
  (from [[morph_subject-rh]]);
- provenance appended to `$SUBJECTS_DIR/<subjid>/NOTES` (each worker appends its
  own block).

See [[morph_subject-lh]] § *Outputs* for full specifications.

## Mathematical Foundations

None — `morph_subject` is a pure dispatcher. All numerics are in the sub-tools
[[mris_sphere]] and [[mris_register]] (reached via the hemisphere workers).

## Configuration Options

### Complete Flag Reference

`morph_subject` takes **no option flags** — only a single positional subject ID.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`; passed unchanged to both hemisphere workers. Exactly one argument is required ([`scripts/morph_subject:23-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L23-L27)). |

### Configuration Interactions

None — there are no flags. The only behavioural note is dispatch order:
left hemisphere first, then right
([`scripts/morph_subject:35-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L35-L36)).

> [!gotcha] No `-status` check between hemispheres under `-ef`
> The driver calls the two workers back-to-back. Because of the `-ef` shebang, if
> `morph_subject-lh` exits non-zero the script aborts and `morph_subject-rh`
> never runs — so a left-hemisphere failure silently leaves the right hemisphere
> unprocessed.

## Typical Use Cases

### Use Case 1: Morph both hemispheres of a subject

```bash
export SUBJECTS_DIR=/data/subjects
morph_subject bert
# → runs morph_subject-lh bert, then morph_subject-rh bert
```

### Use Case 2: Single hemisphere (bypass the driver)

```bash
# To process just one side, call the worker directly:
morph_subject-lh bert
```

## Pipeline Context

`morph_subject` is the entry point of the legacy `morph_subject` family and is
**not** part of the `recon-all` stream.

**Predecessor:** a completed surface reconstruction (inflated stage) →
**This tool** → **Successors:** [[morph_subject-lh]] and [[morph_subject-rh]]
(which internally run [[mris_sphere]] → [[mris_register]] →
[[map_central_sulcus]]).

## Gotchas and Caveats

> [!gotcha] Thin wrapper — read the worker pages for real behaviour
> All processing, file outputs, and the non-obvious "reverse" registration
> behaviour are in [[morph_subject-lh]] / [[morph_subject-rh]]. `morph_subject`
> only validates and dispatches.

## Error Compensation and Guard Rails

- **Argument-count check** (exactly one) and **subject-directory existence
  check** before dispatch
  ([`scripts/morph_subject:23-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject#L23-L33)).
- Beyond that, error handling is whatever the hemisphere workers and the `-ef`
  shell provide.

## Related Tools

- [[morph_subject-lh]] — left-hemisphere worker (canonical documentation).
- [[morph_subject-rh]] — right-hemisphere worker.
- [[morph_only_subject]] — sibling driver that **skips** `mris_sphere` and only
  re-registers existing spheres.
- [[mris_sphere]], [[mris_register]] — the underlying surface tools.
- `morph_subject_on_seychelles` *(no wiki page)* — cluster wrapper that submits
  the two hemisphere workers via `pbsubmit`.

## Confidence and Gaps

**High confidence.** The entire script is 38 lines of validation and two calls;
behaviour read directly from
[`scripts/morph_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject).

## References

- FreeSurfer source: [`scripts/morph_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject) (v8.2.0).
- Per-hemisphere behaviour and method references: [[morph_subject-lh]].
