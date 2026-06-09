---
title: "make_exvivo_filled"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_exvivo_filled"
families: []
recon_all_stage: null
related:
  - "[[recon-all-exvivo]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_mask]]"
  - "[[mri_extract_largest_CC]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_pretess]]"
  - "[[mri_fill]]"
  - "[[mksubjdirs]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - exvivo
  - white-matter
  - filled
  - samseg
  - segmentation
---

# make_exvivo_filled

## Summary

`make_exvivo_filled` prepares the white-matter and `filled` volumes needed to grow
surfaces from an **ex vivo** scan that has been segmented by [[wiki/tools/samseg|samseg]].
Given a subject, a SAMSEG segmentation, and an intensity volume, it builds a
FreeSurfer-style `mri/` directory: it derives `aseg.mgz` and `norm.mgz` by masking
the SAMSEG/intensity volumes (optionally to one hemisphere), extracts and cleans
the white-matter segmentation, edits it with the aseg, runs [[mri_pretess]] to make
it topologically suitable, and finally calls [[mri_fill]] to produce
`filled.mgz` — the hemisphere-labelled white-matter volume from which white
surfaces are tessellated.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/make_exvivo_filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_exvivo_filled`
- **Tools invoked:** [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L42), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L43), [`mri_extract_largest_CC`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L52), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L55), [`mri_edit_wm_with_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L63), [`mri_pretess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L65), [`mri_fill`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L66), [`mksubjdirs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L37).

## Purpose and Context

Ex vivo (post-mortem) tissue is often a single excised hemisphere or block, lacks
the cerebellum, and has very different contrast from in vivo T1. The standard
recon-all white-matter pipeline assumes whole-brain in vivo data, so ex vivo
processing uses [[wiki/tools/samseg|samseg]] to segment the tissue and then needs a
bespoke step to turn that segmentation into the `wm.mgz`/`filled.mgz` that
surface placement expects. `make_exvivo_filled` is that step. It is called by
[[recon-all-exvivo]] ([`scripts/recon-all-exvivo:207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L207))
once per requested hemisphere; it can also be run by hand.

## Inputs

### Required Inputs

Four positional arguments, in order
([`scripts/make_exvivo_filled:5-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L5-L29)):

1. **`<subject name>`** — subject under `SUBJECTS_DIR` (its directory tree is
   created with [[mksubjdirs]] if absent).
2. **`<input samseg>`** — a [[wiki/tools/samseg|samseg]] segmentation volume.
3. **`<input intensity vol>`** — the intensity volume to become `norm.mgz`.
4. **`<hemi/both>`** — `lh`, `rh`, or anything else (treated as **both**).

### Input Assumptions

> [!assumption] SAMSEG-segmented ex vivo input, standard WM labels
> The segmentation must use standard FreeSurfer label numbers — left WM = 2, right
> WM = 41 ([`scripts/make_exvivo_filled:15-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L15-L16)).
> Cerebellum is removed (`mri_mask -no_cerebellum`), consistent with ex vivo data.
> The script runs under `tcsh -ef`, so **any** failing command aborts the whole
> run immediately (see Error Compensation).

## Outputs

### Files Created

Written under `SUBJECTS_DIR/<subject>/mri/`:

| File | Produced by | Contents |
|------|-------------|----------|
| `aseg.mgz`, `aseg.auto.mgz`, `aseg.presurf.mgz` | [[mri_mask]] + [[wiki/tools/mri_convert\|mri_convert]] + copies | masked, conformed segmentation (and its standard aliases) |
| `norm.mgz` | [[mri_mask]] + [[wiki/tools/mri_convert\|mri_convert]] | masked, conformed intensity volume |
| `brain.mgz`, `brainmask.mgz`, `orig.mgz`, `rawavg.mgz` | symlinks → `norm.mgz` | conventional intensity aliases |
| `wm.seg.mgz` | [[mri_extract_largest_CC]] (+ [[mri_binarize]] relabel) | largest white-matter connected component(s) |
| `wm.seg.bin.mgz` | [[mri_binarize]] (`--binval 255`) | binarised WM seg, `uchar` |
| `wm.asegedit.mgz` | [[mri_edit_wm_with_aseg]] | WM seg edited with the aseg (`-keep-in`) |
| `wm.asegedit.cc.mgz` | [[mri_extract_largest_CC]] | largest CC of the edited WM |
| `wm.mgz` | [[mri_pretess]] | topologically clean white-matter volume |
| `filled.mgz` | [[mri_fill]] | hemisphere-labelled filled white matter (the surface seed) |

### Output Specifications

Volumes are conformed (`--conform_min`, nearest-neighbour for label data) MGZ. The
`filled.mgz` carries the standard fill values (left/right hemisphere) used by
downstream white-surface tessellation. See [[mgz]] and the
[[filled.mgz]] glossary page.

## Mathematical Foundations

None of its own — `make_exvivo_filled` is morphological/segmentation bookkeeping.
The substantive operations are: connected-component extraction
([[mri_extract_largest_CC]]), aseg-guided WM editing ([[mri_edit_wm_with_aseg]]),
the pretess topology fix ([[mri_pretess]]), and the seed-fill that separates and
labels the hemispheres ([[mri_fill]]). The relevant algorithms live in those tools.

> [!internal] Fill / pretess algorithms
> The hemisphere separation and cutting-plane logic is in [[mri_fill]]; the
> voxel-connectivity correction is in [[mri_pretess]].

## Configuration Options

### Complete Argument Reference

`make_exvivo_filled` takes **positional arguments only** — there is no flag parser.
The fourth argument selects the hemisphere and, internally, drives the option flags
passed to the child tools
([`scripts/make_exvivo_filled:17-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L17-L29)):

| Position | Value | Effect |
|----------|-------|--------|
| 1 | `<subject>` | subject directory under `SUBJECTS_DIR` (created if missing). |
| 2 | `<samseg>` | SAMSEG segmentation volume. |
| 3 | `<intensity>` | becomes `norm.mgz`. |
| 4 | `lh` | left only: `-lh`/`-lhonly` to the child tools; WM label 2; extract CC of label 2. |
| 4 | `rh` | right only: `-rh`/`-rhonly`; WM label 41; extract CC of 41 then relabel 41→2. |
| 4 | *anything else* | **both** hemispheres: relabel 41→2, extract the largest CC; no `-lh/-rh` restriction. |

> [!gotcha] The hemisphere argument is mandatory and positional
> All four arguments are required; fewer prints the usage line and exits
> ([`scripts/make_exvivo_filled:5-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L5-L8)).
> There are no `--` flags. A 4th argument that is not `lh`/`rh` silently means
> "both" — there is no validation of the string.

### Configuration Interactions

> [!gotcha] Right-hemisphere WM is relabelled to the left value
> For `rh`, after extracting the largest CC of label 41 the script relabels
> 41 → 2 ([`scripts/make_exvivo_filled:53-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L53-L55)),
> and for "both" it relabels 41 → 2 before extracting a single CC
> ([`scripts/make_exvivo_filled:56-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L56-L58)).
> So the binarised WM is unified under one value before pretess/fill, and
> `mri_fill -<hemi>only` reintroduces the hemisphere labelling in `filled.mgz`.

- The `-lhonly`/`-rhonly` option to [[mri_fill]] (set only for `lh`/`rh`, empty for
  both) is what makes the fill produce a single-hemisphere `filled.mgz` vs. a
  two-hemisphere one.

## Typical Use Cases

### 1. Build the filled volume for a single ex vivo hemisphere

```bash
setenv SUBJECTS_DIR /path/to/exvivo
make_exvivo_filled exvivo_case01 samseg.mgz nu.mgz lh
# → $SUBJECTS_DIR/exvivo_case01/mri/{wm.mgz,filled.mgz,aseg.mgz,norm.mgz,...}
```

### 2. As invoked inside recon-all-exvivo

```bash
# recon-all-exvivo:207 effectively runs:
make_exvivo_filled $s $samseg_fname $vol_fname $hemi
```

## Pipeline Context

`make_exvivo_filled` is an internal step of the **ex vivo** reconstruction
pipeline, not of the standard [[wiki/pipelines/recon-all|recon-all]]. It is invoked
by [[recon-all-exvivo]] after [[wiki/tools/samseg|samseg]] has segmented the tissue,
and its `wm.mgz`/`filled.mgz` outputs feed the white-surface tessellation that
follows.

**Predecessor:** [[wiki/tools/samseg|samseg]] (ex vivo segmentation) →
**make_exvivo_filled** → **Successor:** white-surface placement
(`mri_tessellate` / `recon-all -tessellate`) in [[recon-all-exvivo]].

## Gotchas and Caveats

> [!gotcha] `set echo=1` is always on
> The script forces command echoing
> ([`scripts/make_exvivo_filled:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L4)),
> so every command is printed regardless of any debug flag — useful for tracing
> but verbose.

> [!gotcha] It overwrites the subject's core volumes
> The script writes `aseg.mgz`, `aseg.auto.mgz`, `aseg.presurf.mgz`, `norm.mgz`,
> `wm.mgz`, `filled.mgz`, etc. directly into `mri/`, replacing any existing ones.
> Run it on a dedicated ex vivo subject directory.

> [!gotcha] Cerebellum is removed unconditionally
> `mri_mask -no_cerebellum` is applied to both the aseg and the intensity volume
> ([`scripts/make_exvivo_filled:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L42),
> [`:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L46)),
> matching the ex vivo assumption that there is no usable cerebellum.

## Error Compensation and Guard Rails

- The subject directory tree is auto-created with [[mksubjdirs]] if it does not
  exist ([`scripts/make_exvivo_filled:35-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled#L35-L38)).
- Running under `tcsh -ef` means the **first** failing command aborts the script
  (there are no per-command `if($status)` checks), so a failure leaves a partially
  built `mri/` — re-run after fixing the input.
- White matter is repeatedly reduced to its largest connected component
  ([[mri_extract_largest_CC]]) to remove disconnected speckle before topology
  correction and fill.

## Related Tools

- [[recon-all-exvivo]] — the ex vivo pipeline that calls this script.
- [[wiki/tools/samseg|samseg]] — produces the segmentation input.
- [[mri_mask]] — masks aseg/intensity and removes cerebellum.
- [[mri_extract_largest_CC]] — keeps the largest WM component.
- [[mri_edit_wm_with_aseg]] — edits the WM seg using the aseg.
- [[mri_pretess]] — makes the WM volume topologically suitable.
- [[mri_fill]] — produces the hemisphere-labelled `filled.mgz`.
- [[mksubjdirs]] — creates the subject directory tree.

## Confidence and Gaps

**High confidence:** the positional-argument interface, the per-hemisphere WM
label handling and relabelling, the full child-command sequence, and the
`tcsh -ef` fail-fast behaviour — all read directly from
[`scripts/make_exvivo_filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled).

## References

- FreeSurfer source: [`scripts/make_exvivo_filled`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_exvivo_filled) (v8.2.0).
- Caller: [`scripts/recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L207).
- Output file glossary: [[filled.mgz]].
