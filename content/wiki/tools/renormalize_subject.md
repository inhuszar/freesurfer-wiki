---
title: "renormalize_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/renormalize_subject"
families: []                     # renormalize_subject family
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[renormalize_subject_keep_editting]]"
  - "[[renormalize_T1_subject]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[T1.mgz]]"
  - "[[brain.mgz]]"
  - "[[wm.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Uses legacy extensionless volume names (orig, T1, brain, wm) and control.dat under scripts/../tmp/, predating recon-all's .mgz convention; how it interoperates with a modern recon-all subject is unverified."
  - "inflate_subject is invoked at the end but has no wiki page yet."
tags:
  - normalization
  - intensity
  - control-points
  - editing
  - legacy
---

# renormalize_subject

## Summary

`renormalize_subject` is a legacy tcsh driver that **re-runs intensity
normalisation** for a subject after the user has added manual control points, then
regenerates the downstream skull-strip, white-matter segmentation, and inflated
surfaces. It applies the control-point file (`tmp/control.dat`) with
[[mri_normalize]] to rebuild `mri/T1`, re-skull-strips with [[mri_watershed]] to
rebuild `mri/brain`, re-segments white matter with [[mri_segment]] to rebuild
`mri/wm`, and finally calls `inflate_subject` to refill and re-inflate the
surfaces. It is the canonical member of a small family of re-normalisation
wrappers ([[renormalize_subject_keep_editting]], [[renormalize_T1_subject]]).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/renormalize_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/renormalize_subject`
- **FreeSurfer tools invoked:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L20), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L22), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L23), and the wrapper script [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L24).

## Purpose and Context

In the classic FreeSurfer workflow, when the automatic intensity normalisation
left white matter too dark or too bright in places, the user added manual
**control points** (saved as `tmp/control.dat`) and then re-ran normalisation so
that the bias-field correction honoured those points. `renormalize_subject`
packages that re-run plus everything downstream that depends on the normalised
volume: skull-strip, WM segmentation, and surface inflation. It corresponds to the
"re-run after editing control points" step in the historical manual-edit cycle,
which modern [[wiki/pipelines/recon-all|recon-all]] now expresses as
`recon-all -autorecon2-cp` (control-point re-run) followed by the later autorecon
stages.

It is **not** invoked by `recon-all` or `trac-all` in v8.2.0.

> [!gotcha] Always applies a control-point file
> `renormalize_subject` runs `mri_normalize -f ../tmp/control.dat …`
> unconditionally ([`scripts/renormalize_subject:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L20)).
> If `tmp/control.dat` does not exist, [[mri_normalize]] cannot read the control
> file and the run fails. Use [[renormalize_subject_keep_editting]] if you want the
> script to fall back to a control-point-free normalisation when no file is
> present.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`, resolved under `$SUBJECTS_DIR`
  ([`scripts/renormalize_subject:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L19)).
- **`mri/orig`** — the conformed input volume that is renormalised
  ([[T1.mgz]] precursor).
- **`tmp/control.dat`** — manually-placed control points, required by the
  `mri_normalize -f` call.

### Input Assumptions

> [!assumption] A subject already taken through early recon-all, plus control points
> The script assumes a subject directory containing `mri/orig`, a `tmp/`
> subdirectory holding `control.dat`, and a `scripts/` subdirectory (it `pushd`es
> into `$SUBJECTS_DIR/<subj>/scripts` and uses paths relative to it). Volumes use
> the **legacy extensionless** names (`orig`, `T1`, `brain`, `wm`); the conformed
> 1 mm isotropic geometry produced by the earlier stages is assumed.

## Outputs

### Files Created

All paths are under `$SUBJECTS_DIR/<subj>/mri/` (the script works from
`scripts/` and refers to them as `../mri/…`).

| File | Created by | Contents |
|------|-----------|----------|
| `mri/T1` | [[mri_normalize]] | Control-point-guided intensity-normalised volume ([[T1.mgz]]) |
| `mri/brain` | [[mri_watershed]] | Skull-stripped brain ([[brain.mgz]]) |
| `mri/wm` | [[mri_segment]] | White-matter segmentation ([[wm.mgz]]) |
| `mri/filled`, surfaces | `inflate_subject` (→ `mri_fill`, `inflate_subject-lh/rh`) | Refilled WM and re-inflated surfaces |

### Output Specifications

Geometry and data types are set by the individual tools; the script adds no
resampling. Volumes are written under their legacy extensionless names.

## Mathematical Foundations

None in the script. The relevant algorithms are the control-point-anchored
bias-field fit in [[mri_normalize]], the watershed skull-strip in
[[mri_watershed]], and the WM intensity/geometry segmentation in [[mri_segment]].

> [!internal] See [[mri_normalize]] for the control-point normalisation model and
> [[mri_segment]] for the white-matter segmentation rules.

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID. The script `pushd`es into the
subject's `scripts/` directory and runs a fixed command sequence.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `$1` (subject) | positional | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$SUBJECTS_DIR` | env | *(required)* | Root of the subject tree. |

Exact commands run
([`scripts/renormalize_subject:19-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L19-L24)):

```tcsh
pushd $SUBJECTS_DIR/$1/scripts
mri_normalize -f ../tmp/control.dat ../mri/orig ../mri/T1
mri_watershed $SUBJECTS_DIR/$1/mri/T1 $SUBJECTS_DIR/$1/mri/brain
mri_segment ../mri/brain ../mri/wm
inflate_subject $1
```

A `mri_strip_skull $1 1` call sits in the script but is **commented out**
([`scripts/renormalize_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L21));
[[mri_watershed]] is used for skull-stripping instead.

### Configuration Interactions

The four steps form a strict dependency chain — each consumes the previous step's
output:

`mri_normalize` (`orig`→`T1`) → `mri_watershed` (`T1`→`brain`) → `mri_segment`
(`brain`→`wm`) → `inflate_subject` (`wm`→`filled`/surfaces). There are no flags to
combine; the only variation across the family is whether the control-point file is
mandatory ([[renormalize_subject]]), optional
([[renormalize_subject_keep_editting]]), or the chain stops after normalisation
([[renormalize_T1_subject]]).

## Typical Use Cases

### Re-run after editing control points

```bash
setenv SUBJECTS_DIR /data/study
# (user has placed control points → mri/tmp/control.dat)
renormalize_subject subj01
# → regenerates mri/T1, mri/brain, mri/wm, filled + inflated surfaces
```

## Pipeline Context

`renormalize_subject` reimplements the legacy "re-normalise after control-point
editing, then rebuild downstream volumes/surfaces" cycle. In modern FreeSurfer
this is `recon-all -autorecon2-cp` (and subsequent stages). It is **not** called
by recon-all in v8.2.0.

**Predecessor:** early recon-all stages producing `mri/orig` + manual
`tmp/control.dat` → **`renormalize_subject`** → **Successor:** the surface stream
launched by `inflate_subject` (`mri_fill`, surface inflation), and ultimately
downstream surface processing.

## Gotchas and Caveats

> [!gotcha] Legacy extensionless filenames
> The script reads/writes `orig`, `T1`, `brain`, `wm` without the `.mgz`
> extension and expects `tmp/control.dat` under the subject directory. This
> predates recon-all's `.mgz` naming; on a modern subject tree the bare names map
> to the auto-detected on-disk volumes, but verify the files exist before running.

> [!gotcha] `mri_strip_skull` line is disabled
> The commented-out `mri_strip_skull $1 1`
> ([`scripts/renormalize_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L21))
> indicates skull-stripping moved to [[mri_watershed]]; `mri_strip_skull` is not
> shipped in v8.2.0.

## Error Compensation and Guard Rails

- **None of note.** Unlike [[renormalize_subject_keep_editting]], this script does
  not check for the control-point file before using it. There is no option parsing
  or input validation; a missing `control.dat`, `orig`, or `scripts/` directory
  surfaces as an error from the corresponding command (the `#!/bin/tcsh -f`
  shebang does **not** set `-e`, so the script continues past a failed step rather
  than aborting).

## Related Tools

- [[mri_normalize]] — control-point-guided intensity normalisation (`orig`→`T1`).
- [[mri_watershed]] — watershed skull-strip (`T1`→`brain`).
- [[mri_segment]] — white-matter segmentation (`brain`→`wm`).
- [[renormalize_subject_keep_editting]] — variant that makes `control.dat` optional and preserves edits in `mri_segment` (`-keep`).
- [[renormalize_T1_subject]] — variant that stops after normalisation (`mri_normalize` only).
- `inflate_subject` *(no wiki page yet)* — refills WM (`mri_fill`) and re-inflates the surfaces.
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline (`-autorecon2-cp`) that subsumes this cycle.

## Confidence and Gaps

**High confidence:** the four-step command sequence, the mandatory control-point
file, the disabled `mri_strip_skull` line, and the legacy filename convention —
read directly from
[`scripts/renormalize_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject).

> [!gap] Interaction with a modern `.mgz` subject tree
> The script's legacy extensionless paths and `tmp/control.dat` location predate
> recon-all's current layout; whether it composes cleanly with a v8.2.0
> recon-all-produced subject was not tested.

## References

- FreeSurfer source: [`scripts/renormalize_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject) (v8.2.0).
