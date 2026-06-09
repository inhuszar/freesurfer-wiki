---
title: "show_tal"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/show_tal"
families: []                     # standalone Talairach QA wrapper
recon_all_stage: null
related:
  - "[[tal_compare]]"
  - "[[talairach]]"
  - "[[remove_talairach]]"
  - "[[coordinate-systems]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Calls the legacy display binary mri_show, which has no source in the v8.2.0 tree and is not installed in $FREESURFER_HOME/bin; running it errors with 'mri_show: Command not found'. Behaviour is described from the one-line invocation only."
tags:
  - talairach
  - qa
  - visualization
  - legacy
---

# show_tal

## Summary

`show_tal` is a one-line tcsh wrapper that displays a subject's **Talairach
registration** for visual quality control. It invokes the legacy `mri_show`
viewer, overlaying the subject's `orig` volume — transformed by its
`talairach.xfm` — on the shared Talairach reference volume, so you can eyeball
how well the subject aligns to Talairach space. It takes a single argument: the
subject name.

## Source Information

- **Language:** tcsh shell script (a single command line)
- **Source file:** [`scripts/show_tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal)
- **Binary/script location:** `$FREESURFER_HOME/bin/show_tal`
- **External tool invoked:** [`mri_show`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21) — a **legacy** FreeSurfer display program.

> [!gotcha] `mri_show` is not present in v8.2.0
> `mri_show` has **no source** in the v8.2.0 tree and is **not installed** under
> `$FREESURFER_HOME/bin`; running `show_tal` on this install fails with
> `mri_show: Command not found`. The script is retained for historical reasons.
> For equivalent QA on a modern install, load the subject's `orig`/`norm` and the
> Talairach transform in [[wiki/tools/freeview|freeview]] instead.

## Purpose and Context

After Talairach registration ([[talairach]]), you want to confirm the subject was
correctly aligned to the standard Talairach atlas before trusting any downstream
step that depends on it. `show_tal` is the minimal helper for that check: it
opens `mri_show` with the subject's `orig` volume, applies the subject's
`talairach.xfm`, and shows it together with the canonical Talairach `orig` volume
(`$SUBJECTS_DIR/talairach/mri/orig`) so the two can be compared by eye.

It is a **legacy QA convenience**, not a pipeline stage. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] (no caller exists in the script tree); the
modern recon-all QA path uses Talairach-failure detection
([[talairach_afd]]) and [[wiki/tools/freeview|freeview]] snapshots.

## Inputs

### Required Inputs

- **Subject name** — the single positional argument `$1`. The script reads
  `$SUBJECTS_DIR/$1/mri/transforms/talairach.xfm` and
  `$SUBJECTS_DIR/$1/mri/orig` ([`scripts/show_tal:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21)).

### Input Assumptions

> [!assumption] A processed subject plus a Talairach reference subject
> The script assumes the named subject has both an `orig` volume and a computed
> `mri/transforms/talairach.xfm`, **and** that a reference subject named
> `talairach` exists at `$SUBJECTS_DIR/talairach/mri/orig`
> ([`scripts/show_tal:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21)). There is no argument checking; missing
> files surface as `mri_show` errors. `$SUBJECTS_DIR` must be set.

## Outputs

### Files Created

None. `show_tal` only opens an interactive `mri_show` display window; it writes
nothing to disk.

### Output Specifications

The "output" is an on-screen overlay of the subject (under `talairach.xfm`) on the
Talairach reference, in Talairach space. See [[coordinate-systems]] for what
Talairach space means and how the `.xfm` maps native voxels into it.

## Mathematical Foundations

None in this script. The only transform involved is the precomputed
`talairach.xfm`, which `mri_show` applies via its `-T` option
([`scripts/show_tal:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21)); the registration itself is computed upstream by
[[talairach]].

## Configuration Options

### Complete Flag Reference

`show_tal` exposes **no flags of its own**. The entire `mri_show` command line is
hard-coded; only the subject name varies.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject name. Selects the `orig` volume and `talairach.xfm` to display. |

Fixed `mri_show` options baked into the call
([`scripts/show_tal:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21)):

| Hard-coded option | Meaning |
|-------------------|---------|
| `-m 1.5` | `mri_show` display scaling/brightness factor (legacy viewer option). |
| `-T <talairach.xfm> <orig>` | Apply the named transform to the following volume — here the subject's `talairach.xfm` to the subject's `orig`. |
| trailing `$SUBJECTS_DIR/talairach/mri/orig` | The reference Talairach volume shown alongside. |

### Configuration Interactions

None — there are no options to combine. The implicit requirements are that
`$SUBJECTS_DIR` is set, the subject has an `orig` and a `talairach.xfm`, and a
`talairach` reference subject exists.

## Typical Use Cases

### 1. Eyeball a subject's Talairach alignment (legacy)

```bash
setenv SUBJECTS_DIR /path/to/subjects
show_tal bert
# opens mri_show overlaying bert's orig (under talairach.xfm)
# on the shared Talairach reference volume
```

> [!gotcha] Modern equivalent
> Because `mri_show` is absent in v8.2.0, do this QA in
> [[wiki/tools/freeview|freeview]] instead: load
> `$SUBJECTS_DIR/bert/mri/orig.mgz` with its `talairach.xfm`, plus a Talairach/MNI
> template, and compare.

## Pipeline Context

`show_tal` is a **standalone, legacy QA** wrapper; it is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or any current pipeline.

**Predecessor:** [[talairach]] (produces `talairach.xfm`) → **show_tal** →
**Successor:** a human judgement on registration quality (no file output). The
two-transform variant of the same check is [[tal_compare]].

## Gotchas and Caveats

> [!gotcha] Depends on a `talairach` reference subject
> The trailing argument is `$SUBJECTS_DIR/talairach/mri/orig`
> ([`scripts/show_tal:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal#L21)) — a subject literally named `talairach` that
> must exist in your `$SUBJECTS_DIR`. If it is absent, the display has no
> reference to compare against.

> [!gotcha] No argument validation
> Passing no subject, or a non-existent one, is not caught by the script; the
> error comes from `mri_show` (or, on this install, from `mri_show` not existing).

## Error Compensation and Guard Rails

None. `show_tal` performs no checks of its own — it forwards a fixed command line
to `mri_show` and inherits whatever that program does (including failing if the
files or the binary are missing).

## Related Tools

- [[tal_compare]] — the sibling wrapper that displays **two** Talairach transforms (`talairach.xfm` and `talairach_new.xfm`) for side-by-side comparison.
- [[talairach]] — computes the `talairach.xfm` this tool visualises.
- [[remove_talairach]] — removes a Talairach link (the inverse maintenance action).
- [[wiki/tools/freeview|freeview]] — the modern viewer that replaces `mri_show` for this kind of QA.
- [[coordinate-systems]] — what Talairach space is and how the transform maps into it.

## Confidence and Gaps

**Medium confidence.** The script is a single, fully-read command line; the
subject argument and the hard-coded `mri_show -m 1.5 -T …` invocation are certain
from [`scripts/show_tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal). Confidence is capped because the
viewer it drives is legacy and unavailable here.

> [!gap] `mri_show` behaviour and availability
> `mri_show` has no source in the v8.2.0 tree and is not installed; its exact
> rendering, the precise meaning of `-m 1.5`, and the on-screen layout were not
> observed. The description of the display reflects the command-line intent, not a
> verified run.

## References

- FreeSurfer source: [`scripts/show_tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/show_tal) (v8.2.0).
