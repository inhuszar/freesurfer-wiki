---
title: "inflate_subject_new-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject_new-lh"
families: []                     # legacy *_subject surface helper variant
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[inflate_subject_new]]"
  - "[[inflate_subject_new-rh]]"
  - "[[inflate_subject-lh]]"
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - inflation
  - left-hemisphere
  - legacy
  - tcsh
  - variant
---

# inflate_subject_new-lh

## Summary

`inflate_subject_new-lh` is the **left-hemisphere worker** of the
[[inflate_subject_new]] variant. It mirrors [[inflate_subject-lh]] — tessellate
the LH label (`255`) of `mri/filled` with [[mri_tessellate]], smooth with
[[mris_smooth]], inflate with [[mris_inflate]] — but differs in two ways: every
output surface name is **suffixed** with the WM-volume basename passed as `$2`
(`lh.orig_$2`, `lh.smoothwm_$2`, `lh.inflated_$2`), and the inflation is run with
the **default** `-dist` (no `-dist 0`). It is normally invoked by
[[inflate_subject_new]] rather than directly. [[inflate_subject_new-rh]] is its
right-hemisphere mirror.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh`)
- **Source file:** [`scripts/inflate_subject_new-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject_new-lh`
- **Tools invoked:** [`mri_tessellate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L30), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L31), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L32).

## Purpose and Context

This worker exists so [[inflate_subject_new]] can build a left-hemisphere
inflation from an alternatively named WM volume without clobbering the standard
`lh.*` surfaces. It assumes `mri/filled` already exists (produced by [[mri_fill]]
on `mri/$2` in the parent driver). It is **not** a recon-all step; see
[[inflate_subject-lh]] for the modern recon-all equivalent (which is the same for
both hemispheres).

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **Suffix / WM basename** — positional argument `$2`; appended to every output
  surface name.
- **`$SUBJECTS_DIR/$1/mri/filled`** — hemisphere-labelled WM volume (LH label
  `255`); see [[filled.mgz]].

### Input Assumptions

> [!assumption] `mri/filled` exists; `$2` supplied
> The script tessellates label `255` of `../mri/filled` and forms output names
> from `$2` ([`scripts/inflate_subject_new-lh:30-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L30-L32)). It assumes the
> parent [[inflate_subject_new]] already produced `filled`; with no `$2` the
> outputs become `?h.orig_` etc. The shebang is plain `tcsh` (no `-ef`), so it
> does not fail-fast.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `lh.orig_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mri_tessellate]] | Tessellated LH boundary (label 255), suffixed |
| `lh.smoothwm_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mris_smooth]] | Smoothed LH surface, suffixed |
| `lh.inflated_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mris_inflate]] (default `-dist`) | Inflated LH surface, suffixed; an `lh.sulc` is also written by `mris_inflate` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the script itself | Appended provenance |

### Output Specifications

Identical to [[inflate_subject-lh]] except for the `_$2` filename suffix and the
inflation distance term. Geometry and format are set by [[mri_tessellate]],
[[mris_smooth]], and [[mris_inflate]].

## Mathematical Foundations

No math in the script. The key difference from [[inflate_subject-lh]] is that the
inflation keeps the **default** metric-distortion weight:

> [!math] Default `-dist` (no `-dist 0`)
> The inflation is `mris_inflate ../surf/lh.smoothwm_$2 ../surf/lh.inflated_$2`
> ([`scripts/inflate_subject_new-lh:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L32)) with no `-dist` flag, so
> the metric-preservation term in [[mris_inflate]]'s cost functional keeps its
> default weight (`0.1`). The canonical [[inflate_subject-lh]] forces `-dist 0`
> and so drops that term — the two produce different inflated geometry from the
> same smoothed surface.

## Configuration Options

### Complete Flag Reference

No option parser; two positional arguments.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |
| `$2` (suffix/WM basename) | string | *(required)* | Suffix appended to every output surface name (`lh.*_$2`). |

Tool flags are hard-coded: tessellation label `255`, default smoothing, default
inflation.

### Configuration Interactions

None. Fixed behaviour:

- `mri_tessellate ../mri/filled 255 ../surf/lh.orig_$2`
- `mris_smooth ../surf/lh.orig_$2 ../surf/lh.smoothwm_$2`
- `mris_inflate ../surf/lh.smoothwm_$2 ../surf/lh.inflated_$2`

## Typical Use Cases

### Inflate the LH from an alternative WM volume (suffixed)

```bash
setenv SUBJECTS_DIR /path/to/subjects
# Usually run by inflate_subject_new; here directly, assuming mri/filled is set:
inflate_subject_new-lh bert wm.alt   # -> surf/lh.{orig,smoothwm,inflated}_wm.alt
```

## Pipeline Context

The LH half of the `_new` variant; **not** a recon-all step.

**Predecessor:** [[mri_fill]] on `mri/$2` (run by [[inflate_subject_new]]) →
**inflate_subject_new-lh** → **Successor:** [[inflate_subject_new-rh]], then
comparison/QA. recon-all does **not** call it.

## Gotchas and Caveats

> [!gotcha] Default inflation, unlike `inflate_subject-lh`
> No `-dist 0` here means the default `-dist 0.1`, so `lh.inflated_$2` is not
> geometrically equivalent to the canonical worker's `lh.inflated`.

> [!gotcha] No fail-fast
> Plain `tcsh` (no `-e`): a failed tessellation does not abort the script.

## Error Compensation and Guard Rails

- **No fail-fast** (`tcsh`); errors do not abort.
- **Provenance logging** to `$SUBJECTS_DIR/$1/NOTES`
  ([`scripts/inflate_subject_new-lh:20-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh#L20-L27)).

## Related Tools

- [[inflate_subject_new]] — the parent driver.
- [[inflate_subject_new-rh]] — the right-hemisphere mirror (label 127).
- [[inflate_subject-lh]] — the canonical LH worker (standard names, `-dist 0`).
- [[mri_tessellate]], [[mris_smooth]], [[mris_inflate]] — the surface chain.

## Confidence and Gaps

**High confidence:** full 33-line script read; the label `255`, the `_$2`
suffixing, the absence of `-dist 0`, and the `NOTES` logging are explicit.

## References

- FreeSurfer source: [`scripts/inflate_subject_new-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-lh) (v8.2.0).
