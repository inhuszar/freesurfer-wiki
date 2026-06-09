---
title: "inflate_subject_new"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject_new"
families: []                     # legacy *_subject surface helper variant
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[inflate_subject]]"
  - "[[inflate_subject_new-lh]]"
  - "[[inflate_subject_new-rh]]"
  - "[[mri_fill]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The `_new` family writes suffixed surfaces (e.g. lh.inflated_<wm>) and uses the default mris_inflate -dist; its intended experimental purpose (comparing alternative WM segmentations) is inferred from the code, not documented in the source."
tags:
  - surface
  - inflation
  - legacy
  - tcsh
  - variant
---

# inflate_subject_new

## Summary

`inflate_subject_new` is a variant of [[inflate_subject]] that lets you point the
fill step at an **alternatively named WM volume** and writes **suffixed** output
surfaces so they do not overwrite the standard ones. It takes two positional
arguments — the subject ID (`$1`) and a WM-volume basename (`$2`) — runs
`mri_fill ../mri/$2 ../mri/filled`, then calls the suffix-aware workers
[[inflate_subject_new-lh]] and [[inflate_subject_new-rh]] with both arguments.
Those workers produce `?h.orig_$2`, `?h.smoothwm_$2`, and `?h.inflated_$2`,
making the script suitable for comparing inflations from different WM
segmentations side by side. Unlike the canonical workers, the `_new` workers run
[[mris_inflate]] **without** `-dist 0` (i.e. at the default `-dist 0.1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh`)
- **Source file:** [`scripts/inflate_subject_new`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject_new`
- **Tools invoked:** [`mri_fill`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new#L29), then [`inflate_subject_new-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new#L30) and [`inflate_subject_new-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new#L31).

## Purpose and Context

The `_new` family appears to be an experimental fork of [[inflate_subject]] used
to inflate from a non-standard WM volume while keeping the standard outputs
intact. By taking the WM basename as `$2` and suffixing every surface with `_$2`,
it allows several candidate segmentations to be inflated and compared without
collision. It is **not** part of [[wiki/pipelines/recon-all|recon-all]] and is not
called by any other bundled script (only the family's own `_new-lh`/`_new-rh`
workers reference it).

> [!gotcha] Sets `DIAG 0x04040`
> Exports `DIAG 0x04040` like the rest of the family
> ([`scripts/inflate_subject_new:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new#L21)).

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **WM-volume basename** — positional argument `$2`. The fill reads
  `$SUBJECTS_DIR/$1/mri/$2` (e.g. `wm`, `wm.edited`, a custom segmentation).
- **`$SUBJECTS_DIR/$1/mri/$2`** — the named WM volume that [[mri_fill]] reads.

### Input Assumptions

> [!assumption] Two arguments; the named WM volume must exist
> Both `$1` and `$2` are required: the fill command is
> `mri_fill ../mri/$2 ../mri/filled`
> ([`scripts/inflate_subject_new:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new#L29)), and `$2` is also passed to the
> workers to form the output suffix. With no `$2` the path collapses to
> `../mri/` and the fill fails. The shebang is plain `tcsh` (no `-ef`), so it does
> not fail-fast.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `filled` | `$SUBJECTS_DIR/$1/mri/` | [[mri_fill]] | Hemisphere-labelled fill of `mri/$2` (left = 255, right = 127) |
| `lh.orig_$2`, `rh.orig_$2` | `$SUBJECTS_DIR/$1/surf/` | the `_new-lh`/`-rh` workers via [[mri_tessellate]] | Tessellated surfaces, suffixed with the WM name |
| `lh.smoothwm_$2`, `rh.smoothwm_$2` | `$SUBJECTS_DIR/$1/surf/` | via [[mris_smooth]] | Smoothed surfaces (suffixed) |
| `lh.inflated_$2`, `rh.inflated_$2` | `$SUBJECTS_DIR/$1/surf/` | via [[mris_inflate]] (default `-dist`) | Inflated surfaces (suffixed) |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the workers | Appended provenance |

Note that `mri/filled` itself is **not** suffixed — repeated runs with different
`$2` values overwrite the same `filled` volume; only the `surf/` outputs are
distinguished by suffix.

### Output Specifications

Surface specifications are set by the called tools. The distinguishing feature is
the `_$2` filename suffix on every surface output and the use of the default
`mris_inflate` distance term (no `-dist 0`).

## Mathematical Foundations

None in the script. The inflation math lives in [[mris_inflate]]; unlike the
canonical [[inflate_subject-lh]]/`-rh` workers, the `_new` workers do **not**
pass `-dist 0`, so the metric-preservation term keeps its default weight (`0.1`).

## Configuration Options

### Complete Flag Reference

No option parser; two positional arguments.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |
| `$2` (WM basename) | string | *(required)* | Basename of the WM volume under `mri/` to fill and inflate; also used as the surface filename suffix. |

### Configuration Interactions

None (no flags). The two arguments are coupled: `$2` selects both the input WM
volume and the output suffix, so they always match. Use this variant when you
need to inflate a non-default WM volume; use [[inflate_subject]] for the standard
`mri/wm` with standard output names.

## Typical Use Cases

### Inflate from an alternative WM segmentation

```bash
setenv SUBJECTS_DIR /path/to/subjects
# Inflate from mri/wm.alt, writing surf/?h.{orig,smoothwm,inflated}_wm.alt
inflate_subject_new bert wm.alt
```

Lets you keep the standard `?h.inflated` while producing a parallel
`?h.inflated_wm.alt` for comparison.

## Pipeline Context

A legacy/experimental standalone variant; **not** a recon-all step.

**Predecessor:** an alternative WM volume `mri/$2` → **inflate_subject_new** →
**Successor:** comparison/QA of the suffixed inflated surfaces. recon-all does
**not** call it and is not referenced by any other bundled script.

## Gotchas and Caveats

> [!gotcha] Default inflation distance (no `-dist 0`)
> The `_new` workers run `mris_inflate ../surf/?h.smoothwm_$2 ../surf/?h.inflated_$2`
> with no `-dist` flag, so they use the default `-dist 0.1` — **different** from
> the canonical [[inflate_subject-lh]]/`-rh` workers, which force `-dist 0`. The
> two families therefore produce geometrically different inflations from the same
> input.

> [!gotcha] `filled` is overwritten, surfaces are suffixed
> Only the `surf/` outputs carry the `_$2` suffix; `mri/filled` is reused. Running
> the script twice with different `$2` overwrites `filled` each time but keeps
> distinct surface sets.

> [!gotcha] No fail-fast
> The shebang is plain `tcsh`, so a failed fill does not stop the script from
> calling the workers.

## Error Compensation and Guard Rails

- **No fail-fast** (`tcsh`, not `tcsh -ef`); errors do not abort.
- No input validation; provenance is logged to `NOTES` by the workers.

## Related Tools

- [[inflate_subject]] — the canonical driver (single arg, standard output names, `-dist 0`).
- [[inflate_subject_new-lh]] / [[inflate_subject_new-rh]] — the suffix-aware workers this driver calls.
- [[mri_fill]] — fills the named WM volume.
- [[mris_inflate]] — inflates (here at default `-dist`).
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline.

## Confidence and Gaps

**High confidence** on the control flow, the two-argument interface, and the
suffixing behaviour (read from the full 33-line script).

> [!gap] Intended use of the `_new` family
> The script carries no comment explaining why it exists; the
> "alternative WM volume, compare suffixed inflations" purpose is inferred from
> the code (the `$2` WM basename + suffix and the dropped `-dist 0`).

## References

- FreeSurfer source: [`scripts/inflate_subject_new`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new) (v8.2.0).
