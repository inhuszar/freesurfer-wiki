---
title: "inflate_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject-rh"
families: []                     # legacy *_subject surface helper (no mri_*/mris_* family)
recon_all_stage: null            # NOT called by recon-all; standalone legacy worker
related:
  - "[[inflate_subject]]"
  - "[[inflate_subject-lh]]"
  - "[[inflate_subject_new-rh]]"
  - "[[reinflate_subject]]"
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mri_fill]]"
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
---

# inflate_subject-rh

## Summary

`inflate_subject-rh` is the **right-hemisphere worker** of the legacy
[[inflate_subject]] family — the exact mirror of [[inflate_subject-lh]]. Given a
subject whose `mri/filled` volume already exists, it tessellates the
right-hemisphere label (value `127`) with [[mri_tessellate]], smooths it with
[[mris_smooth]], and inflates it with [[mris_inflate]] using `-dist 0`, while
appending a provenance entry to the subject's `NOTES` file. The **only**
differences from the LH worker are the tessellation threshold (`127` instead of
`255`) and the `rh.` output prefix. It is normally invoked by
[[inflate_subject]] (or [[reinflate_subject]]) rather than directly.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject-rh`
- **Tools invoked:** [`mri_tessellate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh#L31), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh#L32), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh#L33).

## Purpose and Context

This is the right-hemisphere counterpart that [[inflate_subject]] calls
immediately after [[inflate_subject-lh]], so the parent driver can build both
inflated surfaces. It assumes the hemisphere-labelled `mri/filled` already exists
(produced by [[mri_fill]]) and converts the right-hemisphere label into an
inflated surface. Like the rest of the family it predates and is **not** used by
[[wiki/pipelines/recon-all|recon-all]]; see [[inflate_subject-lh]] for the full
discussion of the modern equivalent, which is identical for both hemispheres.

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **`$SUBJECTS_DIR/$1/mri/filled`** — the hemisphere-labelled WM volume (see
  [[filled.mgz]]); the right hemisphere must carry label value `127`. Normally
  created by [[mri_fill]] in the calling [[inflate_subject]] driver.

### Input Assumptions

> [!assumption] `mri/filled` exists and labels RH as 127
> The script reads `../mri/filled` and tessellates label `127`
> ([`scripts/inflate_subject-rh:30-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh#L30-L31)), assuming the standard
> left = 255 / right = 127 convention written by [[mri_fill]]. No existence check
> is performed; the `-ef` shebang aborts on any failure.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `rh.orig` | `$SUBJECTS_DIR/$1/surf/` | [[mri_tessellate]] | Tessellated boundary surface of the RH (label 127) of `filled` |
| `rh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | [[mris_smooth]] | Smoothed version of `rh.orig` |
| `rh.inflated` | `$SUBJECTS_DIR/$1/surf/` | [[mris_inflate]] | Inflated RH surface (see [[hemi.inflated]]); an `rh.sulc` curvature file is also written by `mris_inflate` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the script itself | Appended provenance: command line, `whoami`, `date`, `hostname` |

### Output Specifications

Identical to [[inflate_subject-lh]] but for the right hemisphere; geometry and
format are set by [[mri_tessellate]], [[mris_smooth]], and [[mris_inflate]]. The
inflation is run with `-dist 0` (no metric-distortion penalty — see the LH page's
[Mathematical Foundations](inflate_subject-lh#mathematical-foundations)).

## Mathematical Foundations

No math in the script itself. As with the LH worker, the one consequential choice
is `mris_inflate -dist 0`, which removes the metric-preservation term from the
inflation cost functional (default `0.1`).

> [!internal] Inflation cost functional
> See [[mris_inflate]] for the smoothing-vs-metric-distortion functional and
> [[inflate_subject-lh]] for the effect of `-dist 0`. The behaviour is identical
> for both hemispheres.

## Configuration Options

### Complete Flag Reference

`inflate_subject-rh` has **no option parser**. One positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |

All tool flags are hard-coded: tessellation label `127`, default smoothing,
inflation with `-dist 0`.

### Configuration Interactions

None. Fixed behaviour:

- `mri_tessellate ../mri/filled 127 ../surf/rh.orig`
- `mris_smooth ../surf/rh.orig ../surf/rh.smoothwm`
- `mris_inflate -dist 0 ../surf/rh.smoothwm ../surf/rh.inflated`

## Typical Use Cases

### Re-inflate only the right hemisphere

```bash
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject-rh bert
```

Produces `surf/rh.orig`, `surf/rh.smoothwm`, and `surf/rh.inflated`.

## Pipeline Context

The RH half of a legacy standalone workflow; **not** a recon-all step.

**Predecessor:** [[mri_fill]] (run by [[inflate_subject]]) and
[[inflate_subject-lh]] (run just before, by the parent driver) →
**inflate_subject-rh** → **Successor:** surface QA.

- **recon-all does NOT call it;** the equivalent is `mris_inflate ... rh.smoothwm
  rh.inflated` in `autorecon2` (default `-dist`).
- **It IS called by** [[inflate_subject]], [[inflate_subject3]],
  [[inflate_subject_sc]], and [[reinflate_subject]].

## Gotchas and Caveats

> [!gotcha] Inflation uses `-dist 0`, unlike recon-all
> As with the LH worker, the forced `-dist 0` makes this a pure-smoothing
> inflation, geometrically different from a recon-all `rh.inflated`. The
> companion [[inflate_subject_new-rh]] omits `-dist 0`.

> [!gotcha] Tessellation threshold differs from the LH worker
> This worker tessellates label `127`; the LH worker tessellates `255`. The two
> constants encode the [[mri_fill]] hemisphere convention.

## Error Compensation and Guard Rails

- **Fail-fast** (`-ef`): a missing `mri/filled` or any tool error aborts.
- **Provenance logging:** appends command, user, date, and host to
  `$SUBJECTS_DIR/$1/NOTES` ([`scripts/inflate_subject-rh:20-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh#L20-L28)).

## Related Tools

- [[inflate_subject]] — the parent driver.
- [[inflate_subject-lh]] — the left-hemisphere mirror (tessellates label 255).
- [[inflate_subject_new-rh]] — the `_new` RH worker; writes suffixed surfaces and omits `-dist 0`.
- [[reinflate_subject]] — re-runs this worker (and `-lh`) without re-filling.
- [[mri_tessellate]], [[mris_smooth]], [[mris_inflate]] — the surface chain.

## Confidence and Gaps

**High confidence:** the full 33-line script was read; the three hard-coded
commands, the label value `127`, the `-dist 0` flag, and the `NOTES` logging are
explicit.

## References

- FreeSurfer source: [`scripts/inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh) (v8.2.0).
