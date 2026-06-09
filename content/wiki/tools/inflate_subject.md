---
title: "inflate_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject"
families: []                     # legacy *_subject surface helper (no mri_*/mris_* family)
recon_all_stage: null            # NOT called by recon-all; standalone legacy helper
related:
  - "[[inflate_subject-lh]]"
  - "[[inflate_subject-rh]]"
  - "[[inflate_subject_new]]"
  - "[[inflate_subject_sc]]"
  - "[[inflate_subject3]]"
  - "[[reinflate_subject]]"
  - "[[mri_fill]]"
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "These scripts predate recon-all and are not part of any current pipeline; whether they are still used by anyone outside the legacy segment_subject/renormalize_subject family is unverified."
tags:
  - surface
  - inflation
  - legacy
  - tcsh
  - recon-all-internal
---

# inflate_subject

## Summary

`inflate_subject` is a small legacy tcsh driver that regenerates both cortical
surface inflations for one subject after the white-matter (WM) volume has been
hand-edited. It runs [[mri_fill]] to split the edited `wm` volume into a
hemisphere-labelled `filled` volume, then calls the two hemisphere workers
[[inflate_subject-lh]] and [[inflate_subject-rh]], each of which tessellates,
smooths, and inflates one hemisphere. It is the **canonical** member of the
`inflate_subject*` family; the `-lh`/`-rh`, `_new`, `_sc`, and `3` files are
hemisphere workers or variants of this driver. It predates and is **not** used
by [[wiki/pipelines/recon-all|recon-all]], which performs the same steps with
finer-grained control as part of its `autorecon2` stream.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject`
- **Tools invoked:** [`mri_fill`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L29), then [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L30) and [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L31) (which in turn call [[mri_tessellate]], [[mris_smooth]], [[mris_inflate]]).

## Purpose and Context

In the era before [[wiki/pipelines/recon-all|recon-all]], surface
reconstruction was driven by a collection of per-subject helper scripts
(`segment_subject`, `renormalize_subject`, `inflate_subject`, …). `inflate_subject`
covers the part of that workflow that turns an (often manually corrected) WM
segmentation into smoothed, inflated cortical surfaces. The header comment states
its intent directly: *"this script needs to be rerun each time the wm volume is
edited"* ([`scripts/inflate_subject:6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L6)).

The script is still bundled in v8.2.0 and is invoked by the equally legacy
drivers `segment_subject`, `renormalize_subject`, and `segment_subject_talmgh`
(each calls `inflate_subject $1`). It is not part of the modern pipeline: today
the equivalent work is done inside [[wiki/pipelines/recon-all|recon-all]] by
[[mri_fill]], [[mri_tessellate]], [[mris_smooth]], and [[mris_inflate]] with
versioned, parallel, per-hemisphere control.

> [!gotcha] Sets `DIAG 0x04040` for all children
> The script exports `setenv DIAG 0x04040`
> ([`scripts/inflate_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L21)), a FreeSurfer diagnostic
> bit-mask that every child binary inherits. It enables extra diagnostic output
> in the C tools but does not change the produced surfaces.

## Inputs

### Required Inputs

- **Subject ID** — the only positional argument (`$1`). The subject must already
  exist under `$SUBJECTS_DIR` with the standard `mri/` and `surf/` subdirectories.
- **`$SUBJECTS_DIR/$1/mri/wm`** — the (typically hand-edited) white-matter
  segmentation volume that [[mri_fill]] reads. See [[wm.mgz]].

### Input Assumptions

> [!assumption] A FreeSurfer subject tree with an existing, edited `mri/wm`
> The script `cd`s straight into `$SUBJECTS_DIR/$1/scripts`
> ([`scripts/inflate_subject:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L28)) and reads `../mri/wm`. It
> assumes (a) `$SUBJECTS_DIR` is set, (b) the subject directory and its
> `scripts/`, `mri/`, and `surf/` subfolders exist, and (c) `mri/wm` is present.
> Because the shebang is `tcsh -ef`, any failure (missing directory, `mri_fill`
> error) aborts the whole run immediately. The `wm` volume must already be a
> valid binary/soft WM segmentation; the script does no checking.

## Outputs

### Files Created

| File | Where | Created by | Contents |
|------|-------|-----------|----------|
| `filled` (a.k.a. [[filled.mgz]]) | `$SUBJECTS_DIR/$1/mri/` | [[mri_fill]] | Hemisphere-labelled WM volume (left = 255, right = 127) |
| `lh.orig`, `rh.orig` | `$SUBJECTS_DIR/$1/surf/` | [[inflate_subject-lh]]/`-rh` via [[mri_tessellate]] | Tessellated WM boundary surfaces |
| `lh.smoothwm`, `rh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | via [[mris_smooth]] | Smoothed WM surfaces |
| `lh.inflated`, `rh.inflated` | `$SUBJECTS_DIR/$1/surf/` | via [[mris_inflate]] | Inflated surfaces (see [[hemi.inflated]]) |
| `NOTES` | `$SUBJECTS_DIR/$1/` | the `-lh`/`-rh` workers | Appended provenance log (command, user, date, host) |

### Output Specifications

The geometry and on-disk layout of every output are fixed by the called tools,
not by this script. See [[mri_fill]] (volume), [[mri_tessellate]],
[[mris_smooth]], and [[mris_inflate]] (surfaces) for the exact specifications.
The hemisphere split of `filled` (left = 255, right = 127) is what lets the two
workers extract each hemisphere with the label thresholds `255` (LH) and `127`
(RH).

## Mathematical Foundations

None in this script — it is a pure orchestration wrapper. All numerical work
(flood-fill hemisphere labelling, marching-cubes-style tessellation, surface
smoothing, and the inflation energy minimisation) lives in the called C tools.

> [!internal] The inflation math lives in [[mris_inflate]]
> The surface-inflation cost functional (a metric-distortion term balanced
> against a smoothing term) is implemented in `mris_inflate`. Note that the
> hemisphere workers this driver calls force `mris_inflate -dist 0`, i.e. they
> drop the metric-preservation term entirely — see [[inflate_subject-lh]].

## Configuration Options

### Complete Flag Reference

`inflate_subject` has **no option parser**. It takes exactly one positional
argument and hard-codes everything else.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`; passed verbatim to the `-lh`/`-rh` workers. |

A bare run with no argument, or with `--help`, fails: there is no help system, so
`--help` is treated as a subject name and the script aborts trying to `cd` into
`$SUBJECTS_DIR/--help/scripts`.

### Configuration Interactions

None — there are no flags to interact. The only meaningful "configuration" is the
choice of family member:

- Use `inflate_subject` for the standard, edited-`wm` workflow.
- Use [[inflate_subject_sc]] when the fill should be guided by an `aseg`
  segmentation (`mri_fill -segmentation`).
- Use [[inflate_subject_new]] to operate on an alternatively named WM volume and
  produce suffixed output surfaces.
- Use [[inflate_subject3]] to run the two hemispheres in parallel.

## Typical Use Cases

### Re-inflate after editing the WM volume

```bash
# After hand-correcting $SUBJECTS_DIR/bert/mri/wm in freeview:
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject bert
```

This re-fills `mri/filled` from the edited `mri/wm` and regenerates
`surf/{lh,rh}.{orig,smoothwm,inflated}`.

## Pipeline Context

`inflate_subject` is a **legacy standalone helper**, not a recon-all step.

**Predecessor:** manual editing of `mri/wm` (after an earlier segmentation step)
→ **inflate_subject** → **Successor:** further legacy surface steps, or visual
QA of the inflated surfaces.

- **recon-all does NOT call it.** [[wiki/pipelines/recon-all|recon-all]] performs
  the analogous inflation by invoking [[mris_inflate]] directly in its `autorecon2`
  surface stream (`mris_inflate ... ?h.smoothwm ?h.inflated`), with `-dist` left
  at its default and per-hemisphere `.cmd` files.
- **It IS called by** the legacy drivers `segment_subject`,
  `renormalize_subject`, and `segment_subject_talmgh` (each as `inflate_subject $1`),
  and is closely related to [[reinflate_subject]], which skips the `mri_fill` step
  and only re-runs the two hemisphere workers.

## Gotchas and Caveats

> [!gotcha] Not equivalent to a recon-all inflation
> Because the hemisphere workers force `mris_inflate -dist 0`, the inflated
> surfaces this driver produces are smoothed without the metric-distortion
> penalty that recon-all keeps (default `-dist 0.1`). Do not mix surfaces from
> this script with recon-all outputs and expect identical geometry.

> [!gotcha] `mri_fill` is run without an explicit seed point
> The active command line is the plain `mri_fill ../mri/wm ../mri/filled`
> ([`scripts/inflate_subject:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject#L29)); the `-P` brainstem-cut option shown
> in the header comment is commented out. `mri_fill` therefore relies on its
> automatic Talairach-based seeding, which assumes a usable talairach transform
> exists for the subject.

## Error Compensation and Guard Rails

- **Fail-fast.** The `-ef` shebang makes the script stop at the first error
  (e.g. missing subject directory or a failed `mri_fill`); it does not try to
  recover or continue to the second hemisphere.
- No input validation, logging, or output checking is done by this driver
  itself; provenance is appended to the subject-level `NOTES` file only by the
  `-lh`/`-rh` workers it calls.

## Related Tools

- [[inflate_subject-lh]] / [[inflate_subject-rh]] — the per-hemisphere workers this driver calls; they do the actual tessellate → smooth → inflate chain.
- [[inflate_subject_new]] — variant that takes a WM-volume name and writes suffixed surfaces.
- [[inflate_subject_sc]] — variant that fills with an `aseg` segmentation (`mri_fill -segmentation`).
- [[inflate_subject3]] — parallel variant (both hemispheres at once).
- [[reinflate_subject]] — re-runs only the hemisphere workers (no `mri_fill`).
- [[mri_fill]] — splits the WM volume into the hemisphere-labelled `filled` volume.
- [[mri_tessellate]], [[mris_smooth]], [[mris_inflate]] — the surface tools invoked by the workers.
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline that supersedes this whole family.

## Confidence and Gaps

**High confidence:** the entire control flow, the single positional argument, the
`mri_fill → -lh → -rh` sequence, the `DIAG` export, and the absence of any option
parser are read directly from the 33-line source.

> [!gap] Real-world usage today
> The script is bundled and still referenced by other legacy `*_subject`
> drivers, but whether it is run by anyone in current practice (vs. fully
> replaced by recon-all) is not determinable from the code.

## References

- FreeSurfer source: [`scripts/inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject) (v8.2.0).
- Callers: [`scripts/segment_subject:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L48), [`scripts/renormalize_subject:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/renormalize_subject#L24), [`scripts/segment_subject_talmgh:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L60).
