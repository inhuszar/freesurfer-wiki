---
title: "renormalize_subject_keep_editting"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/renormalize_subject_keep_editting"
families: []                     # renormalize_subject family
recon_all_stage: null
related:
  - "[[renormalize_subject]]"
  - "[[renormalize_T1_subject]]"
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[T1.mgz]]"
  - "[[brain.mgz]]"
  - "[[wm.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Uses legacy extensionless volume names (orig, T1, brain, wm) and control.dat under ../tmp/; interoperation with a modern recon-all .mgz subject tree is unverified."
  - "inflate_subject is invoked at the end but has no wiki page yet."
tags:
  - normalization
  - intensity
  - control-points
  - editing
  - legacy
---

# renormalize_subject_keep_editting

## Summary

`renormalize_subject_keep_editting` is the **edit-preserving** variant of
[[renormalize_subject]]. It re-runs intensity normalisation, skull-strip, WM
segmentation, and surface inflation, but differs in two ways: (1) the control-point
file is **optional** — if `tmp/control.dat` is missing it runs a plain
[[mri_normalize]] instead of failing — and (2) it passes `-keep` to
[[mri_segment]] so that **previous manual edits to the white-matter segmentation
are preserved** rather than overwritten. (Note the script name's "editting" is a
spelling kept from the source.)

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/renormalize_subject_keep_editting`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting)
- **Binary/script location:** `$FREESURFER_HOME/bin/renormalize_subject_keep_editting`
- **FreeSurfer tools invoked:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L23) (conditionally with/without `-f`), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L28), [`mri_segment -keep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L29), and [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L30).

## Purpose and Context

This is the variant to use when you have **hand-edited `mri/wm`** (added or
removed white-matter voxels) and want to re-run normalisation without losing those
edits. The `-keep` flag tells [[mri_segment]] to retain manual changes; the
control-point fallback makes the script safe to run whether or not control points
were placed. Functionally it is [[renormalize_subject]] plus edit preservation. It
is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`
  ([`scripts/renormalize_subject_keep_editting:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L21)).
- **`mri/orig`** — conformed input volume to renormalise.
- **`tmp/control.dat`** — manual control points, **optional** here.

### Input Assumptions

> [!assumption] A subject with edited wm, control points optional
> Assumes `mri/orig`, a `scripts/` directory (the script `pushd`es into it), and —
> for the edit-preservation to matter — an existing manually-edited `mri/wm`.
> Volumes use the legacy extensionless names.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/T1` | [[mri_normalize]] | Intensity-normalised volume (control-point-guided if `control.dat` present) ([[T1.mgz]]) |
| `mri/brain` | [[mri_watershed]] | Skull-stripped brain ([[brain.mgz]]) |
| `mri/wm` | [[mri_segment]] `-keep` | WM segmentation **with manual edits preserved** ([[wm.mgz]]) |
| `mri/filled`, surfaces | `inflate_subject` | Refilled WM and re-inflated surfaces |

### Output Specifications

Geometry/data types are set by the individual tools; no resampling is added.

## Mathematical Foundations

None in the script — see [[mri_normalize]] (control-point bias-field model) and
[[mri_segment]] (WM segmentation; `-keep` retains edited voxels).

> [!internal] See [[mri_normalize]] and [[mri_segment]].

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `$1` (subject) | positional | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$SUBJECTS_DIR` | env | *(required)* | Root of the subject tree. |

Exact commands run
([`scripts/renormalize_subject_keep_editting:21-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L21-L30)):

```tcsh
pushd $SUBJECTS_DIR/$1/scripts
if (-e ../tmp/control.dat == 0) then
        mri_normalize ../mri/orig ../mri/T1
else
        mri_normalize -f ../tmp/control.dat ../mri/orig ../mri/T1
endif
mri_watershed $SUBJECTS_DIR/$1/mri/T1 $SUBJECTS_DIR/$1/mri/brain
mri_segment -keep ../mri/brain ../mri/wm
inflate_subject $1
```

(A commented-out `mri_strip_skull $1 1` line sits before the watershed call, as in
[[renormalize_subject]].)

### Configuration Interactions

> [!gotcha] Two behavioural differences from `renormalize_subject`
> Compared with [[renormalize_subject]], this script (a) makes the control-point
> file **optional** via the `if (-e ../tmp/control.dat == 0)` test
> ([`:22-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L22-L26))
> — falling back to a plain `mri_normalize ../mri/orig ../mri/T1` when no file is
> present — and (b) adds `-keep` to [[mri_segment]]
> ([`:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L29))
> to preserve manual WM edits. Everything else is identical.

## Typical Use Cases

### Re-run after editing the wm segmentation (preserve edits)

```bash
setenv SUBJECTS_DIR /data/study
# (user has hand-edited mri/wm; control points optional)
renormalize_subject_keep_editting subj01
# → T1, brain, wm (edits kept), filled + inflated surfaces
```

## Pipeline Context

The edit-preserving analogue of the legacy control-point re-run cycle; modern
FreeSurfer expresses edit-preserving WM re-runs via
`recon-all -autorecon2-wm` (which keeps `wm.mgz` edits). Not called by recon-all
in v8.2.0.

**Predecessor:** early recon-all stages + manually-edited `mri/wm` (and optional
`tmp/control.dat`) → **`renormalize_subject_keep_editting`** → **Successor:** the
surface stream launched by `inflate_subject`.

## Gotchas and Caveats

> [!gotcha] Legacy extensionless filenames
> Reads/writes `orig`, `T1`, `brain`, `wm` without `.mgz`, like
> [[renormalize_subject]].

## Error Compensation and Guard Rails

- **Control-point fallback.** The `-e ../tmp/control.dat` test means a missing
  control-point file degrades gracefully to plain normalisation rather than
  failing ([`:22-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting#L22-L26)).
  This is the script's one piece of error compensation and the main reason to
  prefer it over [[renormalize_subject]].
- **Edit preservation.** `mri_segment -keep` protects manual WM edits.
- `#!/bin/tcsh -f` (no `-e`), so a failed step does not abort the rest.

## Related Tools

- [[renormalize_subject]] — the base variant: control-point file **mandatory**, no `-keep`.
- [[renormalize_T1_subject]] — variant that stops after normalisation.
- [[mri_normalize]] — intensity normalisation (control-point-guided when a file is present).
- [[mri_segment]] — WM segmentation; `-keep` preserves manual edits.
- [[mri_watershed]] — watershed skull-strip.
- `inflate_subject` *(no wiki page yet)* — refills WM and re-inflates surfaces.

## Confidence and Gaps

**High confidence:** the conditional control-point branch, the `mri_segment -keep`
flag, and the otherwise-identical command chain — read directly from
[`scripts/renormalize_subject_keep_editting`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting).

> [!gap] Interaction with a modern `.mgz` subject tree
> As with the rest of the family, the legacy extensionless paths were not tested
> against a v8.2.0 recon-all subject.

## References

- FreeSurfer source: [`scripts/renormalize_subject_keep_editting`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject_keep_editting) (v8.2.0).
