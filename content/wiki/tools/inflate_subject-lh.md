---
title: "inflate_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject-lh"
families: []                     # legacy *_subject surface helper (no mri_*/mris_* family)
recon_all_stage: null            # NOT called by recon-all; standalone legacy worker
related:
  - "[[inflate_subject]]"
  - "[[inflate_subject-rh]]"
  - "[[inflate_subject_new-lh]]"
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
  - left-hemisphere
  - legacy
  - tcsh
---

# inflate_subject-lh

## Summary

`inflate_subject-lh` is the **left-hemisphere worker** of the legacy
[[inflate_subject]] family. Given a subject whose `mri/filled` volume already
exists, it extracts the left-hemisphere WM surface from the `filled` volume and
takes it through the classic three-step surface chain: tessellate the boundary
of the left-hemisphere label (value `255`) with [[mri_tessellate]], smooth it
with [[mris_smooth]], and inflate it with [[mris_inflate]] using `-dist 0`. It
also appends a provenance entry to the subject's `NOTES` file. It is not a
trivial flag-setter — it runs three real surface tools — but it is normally
invoked by [[inflate_subject]] (or [[reinflate_subject]]) rather than directly.
[[inflate_subject-rh]] is its right-hemisphere mirror.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject-lh`
- **Tools invoked:** [`mri_tessellate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L32), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L33), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L34).

## Purpose and Context

This script encapsulates the per-hemisphere half of the legacy inflation
workflow so that [[inflate_subject]] can fan out to both hemispheres with one
line each. It assumes the hemisphere-labelled `mri/filled` volume already exists
(produced by [[mri_fill]] in the parent driver) and turns the left-hemisphere
label into an inflated surface ready for visual inspection.

It sits one layer below [[inflate_subject]] in the same pre-recon-all family. The
modern pipeline does the same three operations inside
[[wiki/pipelines/recon-all|recon-all]]'s `autorecon2` surface stream, per
hemisphere, but with versioned `.cmd` files and the inflation distance term left
at its default.

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`. The subject must exist under
  `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/$1/mri/filled`** — the hemisphere-labelled WM volume (see
  [[filled.mgz]]); the left hemisphere must carry label value `255`. This file is
  normally created by [[mri_fill]] in the calling [[inflate_subject]] driver.

### Input Assumptions

> [!assumption] `mri/filled` exists and labels LH as 255
> The script reads `../mri/filled` from `$SUBJECTS_DIR/$1/scripts`
> ([`scripts/inflate_subject-lh:31-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L31-L32)) and tessellates the
> single label value `255`. It therefore assumes the parent driver (or a prior
> [[mri_fill]] run) has already produced `filled` with the standard
> left = 255 / right = 127 convention. There is no check that `filled` exists; the
> `-ef` shebang aborts the run if [[mri_tessellate]] cannot read it.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `lh.orig` | `$SUBJECTS_DIR/$1/surf/` | [[mri_tessellate]] | Tessellated boundary surface of the LH (label 255) of `filled` |
| `lh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | [[mris_smooth]] | Smoothed version of `lh.orig` |
| `lh.inflated` | `$SUBJECTS_DIR/$1/surf/` | [[mris_inflate]] | Inflated LH surface (see [[hemi.inflated]]); a `lh.sulc` curvature file is also written by `mris_inflate` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the script itself | Appended provenance: command line, `whoami`, `date`, `hostname` |

### Output Specifications

Surface geometry, vertex ordering, and file format are determined by the called
tools; see [[mri_tessellate]], [[mris_smooth]], and [[mris_inflate]]. The
inflation is run with `-dist 0`, which yields a more uniformly smoothed (and more
metrically distorted) surface than the `mris_inflate` default — see
[Mathematical Foundations](#mathematical-foundations).

## Mathematical Foundations

The script contributes no math of its own, but it makes one consequential
numerical choice: it calls `mris_inflate` with `-dist 0`.

> [!math] `-dist 0` drops the metric-preservation term
> [[mris_inflate]] minimises a cost functional that balances a **smoothing**
> term against a **metric-distortion** (distance-preservation) term; the
> `-dist` coefficient sets the relative weight of the latter (default `0.1`).
> Passing `-dist 0` ([`scripts/inflate_subject-lh:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L34))
> removes the metric-preservation term entirely, so the surface is inflated by
> pure smoothing toward a sphere-like shape with no penalty on local
> area/distance distortion. This is the historical behaviour; recon-all keeps the
> default non-zero `-dist`, so the resulting `?h.sulc` and inflated geometry are
> not identical to a recon-all run.

## Configuration Options

### Complete Flag Reference

`inflate_subject-lh` has **no option parser**. It takes one positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. Used for both the `surf/`/`mri/` paths and the `NOTES` log line. |

All tool flags are hard-coded: the tessellation label is `255`, the smoothing is
run with no extra options, and the inflation is run with `-dist 0`.

### Configuration Interactions

None — there are no user-settable flags. The fixed behaviour is:

- `mri_tessellate ../mri/filled 255 ../surf/lh.orig`
- `mris_smooth ../surf/lh.orig ../surf/lh.smoothwm`
- `mris_inflate -dist 0 ../surf/lh.smoothwm ../surf/lh.inflated`

## Typical Use Cases

### Re-inflate only the left hemisphere

```bash
# Usually invoked by inflate_subject, but can be run directly when only the
# LH needs redoing after an edit, provided mri/filled is already current:
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject-lh bert
```

Produces `surf/lh.orig`, `surf/lh.smoothwm`, and `surf/lh.inflated`.

## Pipeline Context

`inflate_subject-lh` is the LH half of a legacy standalone workflow; it is **not**
a recon-all step.

**Predecessor:** [[mri_fill]] (run by [[inflate_subject]], producing `mri/filled`)
→ **inflate_subject-lh** → **Successor:** [[inflate_subject-rh]] (run next by the
parent driver), then surface QA.

- **recon-all does NOT call it.** The analogous left-hemisphere inflation in
  [[wiki/pipelines/recon-all|recon-all]] is `mris_inflate ... lh.smoothwm
  lh.inflated` in the `autorecon2` stream (default `-dist`).
- **It IS called by** [[inflate_subject]], [[inflate_subject3]],
  [[inflate_subject_sc]] (all as `inflate_subject-lh $1`) and by
  [[reinflate_subject]].

## Gotchas and Caveats

> [!gotcha] Inflation uses `-dist 0`, unlike recon-all
> The forced `-dist 0` makes this surface a pure-smoothing inflation with no
> metric-distortion penalty — geometrically different from a recon-all
> `lh.inflated`. The companion [[inflate_subject_new-lh]] omits `-dist 0` and so
> uses the default `-dist 0.1`.

> [!gotcha] Tessellation threshold is hemisphere-specific
> The LH worker tessellates label `255` and the RH worker
> ([[inflate_subject-rh]]) tessellates `127`. These constants must match the
> hemisphere convention written by [[mri_fill]] (left = 255, right = 127); a
> non-standard `filled` would extract the wrong hemisphere.

## Error Compensation and Guard Rails

- **Fail-fast** (`-ef`): a missing `mri/filled` or any tool error aborts
  immediately.
- **Provenance logging:** every invocation appends the command line, user, date,
  and host to `$SUBJECTS_DIR/$1/NOTES`
  ([`scripts/inflate_subject-lh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh#L21-L28)) — useful for tracking
  manual re-runs after edits.

## Related Tools

- [[inflate_subject]] — the parent driver that runs [[mri_fill]] and then this worker.
- [[inflate_subject-rh]] — the right-hemisphere mirror (tessellates label 127).
- [[inflate_subject_new-lh]] — the `_new` LH worker; writes suffixed surfaces and omits `-dist 0`.
- [[reinflate_subject]] — re-runs this worker (and `-rh`) without re-filling.
- [[mri_tessellate]] — extracts the LH boundary surface from `filled`.
- [[mris_smooth]] — smooths the tessellated surface.
- [[mris_inflate]] — inflates the smoothed surface (here with `-dist 0`).

## Confidence and Gaps

**High confidence:** the full 34-line script was read; the three hard-coded tool
commands, the label value `255`, the `-dist 0` flag, and the `NOTES` logging are
all explicit.

## References

- FreeSurfer source: [`scripts/inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh) (v8.2.0).
