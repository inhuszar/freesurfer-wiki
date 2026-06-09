---
title: "renormalize_T1_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/renormalize_T1_subject"
families: []                     # renormalize_subject family
recon_all_stage: null
related:
  - "[[renormalize_subject]]"
  - "[[renormalize_subject_keep_editting]]"
  - "[[mri_normalize]]"
  - "[[T1.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Uses legacy extensionless volume names (orig, T1) and control.dat under ../tmp/; interoperation with a modern recon-all .mgz subject tree is unverified."
tags:
  - normalization
  - intensity
  - control-points
  - legacy
---

# renormalize_T1_subject

## Summary

`renormalize_T1_subject` is the minimal variant of [[renormalize_subject]]: it
re-runs **only** the control-point-guided intensity normalisation step
([[mri_normalize]]) to rebuild `mri/T1` from `mri/orig`, and then stops. Unlike
[[renormalize_subject]] / [[renormalize_subject_keep_editting]], it does **not**
re-run skull-strip, white-matter segmentation, or surface inflation. Use it when
you only need to refresh `T1` after editing control points and will rebuild the
downstream volumes yourself.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/renormalize_T1_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/renormalize_T1_subject`
- **FreeSurfer tool invoked:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject#L23) (single call).

## Purpose and Context

This script isolates the normalisation step of the legacy control-point-editing
cycle. After placing control points (`tmp/control.dat`), running it regenerates
`mri/T1` only — convenient when the rest of the stream (skull-strip, WM
segmentation, surfaces) will be re-run by other means. It is the
normalisation-only member of the `renormalize_subject` family. It is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`
  ([`scripts/renormalize_T1_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject#L21)).
- **`mri/orig`** — conformed input volume to renormalise.
- **`tmp/control.dat`** — manual control points, required by `mri_normalize -f`.

### Input Assumptions

> [!assumption] A subject with control points placed
> Assumes `mri/orig`, a `scripts/` directory (the script `pushd`es into it then
> `popd`s), and `tmp/control.dat`. Legacy extensionless volume names are used.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/T1` | [[mri_normalize]] | Control-point-guided intensity-normalised volume ([[T1.mgz]]) |

### Output Specifications

Geometry/data type are set by [[mri_normalize]]; no resampling is added.

## Mathematical Foundations

None in the script — see [[mri_normalize]] for the control-point-anchored
bias-field normalisation model.

> [!internal] See [[mri_normalize]].

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `$1` (subject) | positional | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$SUBJECTS_DIR` | env | *(required)* | Root of the subject tree. |

Exact commands run
([`scripts/renormalize_T1_subject:21-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject#L21-L25)):

```tcsh
pushd $SUBJECTS_DIR/$1/scripts
mri_normalize -f ../tmp/control.dat ../mri/orig ../mri/T1
popd
```

### Configuration Interactions

The single difference from [[renormalize_subject]] is that the command chain stops
after [[mri_normalize]] — no [[mri_watershed]], [[mri_segment]], or
`inflate_subject`. Like [[renormalize_subject]] (and unlike
[[renormalize_subject_keep_editting]]) the control-point file is **mandatory**:
there is no fallback if `tmp/control.dat` is absent.

## Typical Use Cases

### Refresh only the normalised T1 after editing control points

```bash
setenv SUBJECTS_DIR /data/study
# (user has placed control points → mri/tmp/control.dat)
renormalize_T1_subject subj01
# → regenerates mri/T1 only
```

## Pipeline Context

The normalisation-only slice of the legacy control-point re-run cycle (the rest of
which is the surface stream rebuilt by `inflate_subject` in the fuller variants).
Not called by recon-all in v8.2.0.

**Predecessor:** early recon-all stages producing `mri/orig` + manual
`tmp/control.dat` → **`renormalize_T1_subject`** → **Successor:** whatever rebuilds
`brain`/`wm`/surfaces (e.g. [[renormalize_subject]] or recon-all stages).

## Gotchas and Caveats

> [!gotcha] Stops after normalisation
> Only `mri/T1` is regenerated; downstream volumes (`brain`, `wm`) and surfaces are
> **not** updated, so they may become inconsistent with the new `T1` until rebuilt
> separately.

> [!gotcha] Legacy extensionless filenames
> Reads/writes `orig`, `T1` without `.mgz`, like the rest of the family.

## Error Compensation and Guard Rails

- **None.** The control-point file is used unconditionally; a missing
  `control.dat` or `orig` surfaces as an [[mri_normalize]] error. `#!/bin/tcsh -f`
  (no `-e`), so a failed command does not abort the (very short) script.

## Related Tools

- [[renormalize_subject]] — full variant (normalise → skull-strip → segment → inflate); control-point file mandatory.
- [[renormalize_subject_keep_editting]] — full variant with optional control points and edit-preserving WM segmentation.
- [[mri_normalize]] — the normalisation binary this wraps.

## Confidence and Gaps

**High confidence:** the single `mri_normalize -f` command and the absence of any
downstream steps — read directly from
[`scripts/renormalize_T1_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject).

> [!gap] Interaction with a modern `.mgz` subject tree
> The legacy extensionless paths and `tmp/control.dat` location were not tested
> against a v8.2.0 recon-all subject.

## References

- FreeSurfer source: [`scripts/renormalize_T1_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_T1_subject) (v8.2.0).
