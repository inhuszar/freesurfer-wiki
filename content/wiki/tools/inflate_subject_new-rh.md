---
title: "inflate_subject_new-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject_new-rh"
families: []                     # legacy *_subject surface helper variant
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[inflate_subject_new]]"
  - "[[inflate_subject_new-lh]]"
  - "[[inflate_subject-rh]]"
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
  - right-hemisphere
  - legacy
  - tcsh
  - variant
---

# inflate_subject_new-rh

## Summary

`inflate_subject_new-rh` is the **right-hemisphere worker** of the
[[inflate_subject_new]] variant — the exact mirror of
[[inflate_subject_new-lh]]. It tessellates the RH label (`127`) of `mri/filled`
with [[mri_tessellate]], smooths with [[mris_smooth]], and inflates with
[[mris_inflate]] (default `-dist`), writing **suffixed** outputs
`rh.orig_$2`, `rh.smoothwm_$2`, `rh.inflated_$2` where `$2` is the WM-volume
basename. The **only** differences from the LH `_new` worker are the tessellation
threshold (`127` instead of `255`) and the `rh.` prefix. It is normally invoked
by [[inflate_subject_new]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/inflate_subject_new-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject_new-rh`
- **Tools invoked:** [`mri_tessellate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh#L30), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh#L31), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh#L32).

## Purpose and Context

The right-hemisphere counterpart that [[inflate_subject_new]] calls after
[[inflate_subject_new-lh]], so the parent driver can build both suffixed inflated
surfaces from an alternatively named WM volume. It assumes `mri/filled` already
exists (produced by [[mri_fill]] on `mri/$2`). Like the rest of the family it is
**not** a recon-all step; see [[inflate_subject-rh]] / [[inflate_subject-lh]] for
the modern equivalent.

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **Suffix / WM basename** — positional argument `$2`.
- **`$SUBJECTS_DIR/$1/mri/filled`** — hemisphere-labelled WM volume (RH label
  `127`); see [[filled.mgz]].

### Input Assumptions

> [!assumption] `mri/filled` exists; `$2` supplied
> The script tessellates label `127` of `../mri/filled` and suffixes outputs with
> `$2` ([`scripts/inflate_subject_new-rh:30-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh#L30-L32)). It assumes the
> parent [[inflate_subject_new]] already produced `filled`. The shebang is
> `tcsh -f` (no `-e`); it does not fail-fast.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `rh.orig_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mri_tessellate]] | Tessellated RH boundary (label 127), suffixed |
| `rh.smoothwm_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mris_smooth]] | Smoothed RH surface, suffixed |
| `rh.inflated_$2` | `$SUBJECTS_DIR/$1/surf/` | [[mris_inflate]] (default `-dist`) | Inflated RH surface, suffixed; an `rh.sulc` is also written by `mris_inflate` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the script itself | Appended provenance |

### Output Specifications

Identical to [[inflate_subject_new-lh]] but for the right hemisphere. The
inflation keeps the default `-dist` (no `-dist 0`), unlike the canonical
[[inflate_subject-rh]].

## Mathematical Foundations

No math in the script. As with the LH `_new` worker, the inflation uses the
default metric-distortion weight (`mris_inflate` without `-dist 0`).

> [!internal] Inflation cost functional
> See [[mris_inflate]] for the functional and [[inflate_subject_new-lh]] for the
> effect of keeping the default `-dist`. Behaviour is identical for both
> hemispheres.

## Configuration Options

### Complete Flag Reference

No option parser; two positional arguments.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |
| `$2` (suffix/WM basename) | string | *(required)* | Suffix appended to every output surface name (`rh.*_$2`). |

Tool flags hard-coded: tessellation label `127`, default smoothing, default
inflation.

### Configuration Interactions

None. Fixed behaviour:

- `mri_tessellate ../mri/filled 127 ../surf/rh.orig_$2`
- `mris_smooth ../surf/rh.orig_$2 ../surf/rh.smoothwm_$2`
- `mris_inflate ../surf/rh.smoothwm_$2 ../surf/rh.inflated_$2`

## Typical Use Cases

### Inflate the RH from an alternative WM volume (suffixed)

```bash
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject_new-rh bert wm.alt   # -> surf/rh.{orig,smoothwm,inflated}_wm.alt
```

## Pipeline Context

The RH half of the `_new` variant; **not** a recon-all step.

**Predecessor:** [[mri_fill]] on `mri/$2` and [[inflate_subject_new-lh]] (run just
before, by the parent) → **inflate_subject_new-rh** → **Successor:**
comparison/QA. recon-all does **not** call it.

## Gotchas and Caveats

> [!gotcha] Default inflation, unlike `inflate_subject-rh`
> No `-dist 0` here means the default `-dist 0.1`, so `rh.inflated_$2` differs
> geometrically from the canonical worker's `rh.inflated`.

> [!gotcha] Tessellation threshold differs from the LH worker
> This worker tessellates label `127`; [[inflate_subject_new-lh]] tessellates
> `255`.

## Error Compensation and Guard Rails

- **No fail-fast** (`tcsh -f`, no `-e`); errors do not abort.
- **Provenance logging** to `$SUBJECTS_DIR/$1/NOTES`
  ([`scripts/inflate_subject_new-rh:20-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh#L20-L27)).

## Related Tools

- [[inflate_subject_new]] — the parent driver.
- [[inflate_subject_new-lh]] — the left-hemisphere mirror (label 255).
- [[inflate_subject-rh]] — the canonical RH worker (standard names, `-dist 0`).
- [[mri_tessellate]], [[mris_smooth]], [[mris_inflate]] — the surface chain.

## Confidence and Gaps

**High confidence:** full 33-line script read; the label `127`, the `_$2`
suffixing, the absence of `-dist 0`, and the `NOTES` logging are explicit.

## References

- FreeSurfer source: [`scripts/inflate_subject_new-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_new-rh) (v8.2.0).
