---
title: "xcerebralseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/xcerebralseg"
families: []                     # standalone whole-head segmentation utility
recon_all_stage: null
related:
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_ca_label]]"
  - "[[mri_seghead]]"
  - "[[mri_binarize]]"
  - "[[mergeseg]]"
  - "[[mri_mask]]"
  - "[[mri_segstats]]"
  - "[[segpons]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The full crosswalk between the samseg label numbers and the GCA/aseg label numbers is only partially documented by the --replaceonly list in the script; a handful of samseg ids (e.g. 907/909/911/930 → 258) are remapped but the complete samseg label dictionary was not enumerated from the samseg atlas."
tags:
  - segmentation
  - extracerebral
  - head
  - skull
  - pet
  - samseg
  - gca
---

# xcerebralseg

## Summary

`xcerebralseg` builds a **whole-head segmentation** by labelling the
**extra-cerebral** structures — sulcal/extra-cerebral CSF, skull/bone,
head soft tissue (scalp), and intracranial air (e.g. sinuses) — and merging them
with the subject's brain segmentation (`aparc+aseg.mgz`). The extra-cerebral
labels come from one of two engines: by **default**, [[wiki/tools/samseg|samseg]] (whose richer
label set is then crosswalked to the standard aseg/GCA numbering); or, with
`--nosamseg`, the classic GCA classifier [[mri_ca_label]] driven by a head atlas
trained on the IXI database. It also inserts a **pons** (174) and **vermis** (172)
label, fills any unlabelled in-head voxels with a generic head class, and masks
everything to a head mask from [[mri_seghead]]. The default output is
`apas+head.mgz`, intended primarily as a source of **nuisance regions for fMRI
and PET** (notably PET partial-volume correction via `gtmseg`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/xcerebralseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/xcerebralseg`
- **Head atlas (GCA, non-samseg path):** `$FREESURFER_HOME/average/aseg+spmhead+vermis+pons.ixi.gca` (default; overridable with `--atlas`) — a GCA built from 79 IXI-database subjects segmented with SPM "New Segment"
- **FreeSurfer tools invoked:** [`samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L109) (default extra-cerebral labeller) **or** [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L98) (`--nosamseg`); [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L119) (label remapping / mask building, used several times); [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L158) (merge brain seg, pons, vermis); [`mri_seghead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L197) (binary head mask); [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L211) (mask to head); and [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L222) (optional stats). Uses `fs_temp_dir`, `fs_time`, `fname2stem`, and `UpdateNeeded`.

## Purpose and Context

A standard FreeSurfer reconstruction labels brain tissue but discards everything
outside the brain. Several analyses need those **extra-cerebral** compartments:
PET and fMRI modelling benefit from explicit skull, scalp, CSF, and air regions as
nuisance variables or for partial-volume correction; attenuation/forward modelling
needs bone vs. soft tissue vs. air. `xcerebralseg` produces a single labelled
volume covering the whole head by:

1. **Labelling the head.** Either [[wiki/tools/samseg|samseg]] (default) segments the head from
   `orig.mgz`, or [[mri_ca_label]] applies the IXI head GCA to `nu.mgz`. The samseg
   output uses samseg's own label numbers, so the script **crosswalks** them to the
   standard aseg/GCA scheme with a long list of [[mri_binarize]] `--replaceonly`
   substitutions ([`scripts/xcerebralseg:119-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L119-L137)).
2. **Replacing brain tissue with CSF.** All cortical GM and cerebral WM in the
   head seg are set to extra-cerebral CSF (257), because those voxels will be
   overwritten by the real brain seg in the merge anyway
   ([`scripts/xcerebralseg:145-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L145-L154)).
3. **Merging the brain seg.** The FreeSurfer `aparc+aseg.mgz` is merged on top with
   [[mergeseg]], so brain regions keep their proper labels and only the extra-
   cerebral shell comes from the head seg ([`scripts/xcerebralseg:157-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L157-L161)).
4. **Adding pons and vermis.** Optional masks for pons (174) and vermis (172) are
   extracted from the head seg and merged in
   ([`scripts/xcerebralseg:163-193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L163-L193)).
5. **Filling and masking to the head.** A binary head mask from [[mri_seghead]]
   defines the head extent; unlabelled (0) voxels inside it become generic head
   tissue (258), and everything outside the head is masked out
   ([`scripts/xcerebralseg:195-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L195-L214)).

It is **not** part of [[wiki/pipelines/recon-all|recon-all]], but it **is** called
by `gtmseg` (the geometric-transfer-matrix segmentation used in PET partial-volume
correction) to create the head segmentation it needs — see
[Pipeline Context](#pipeline-context).

> [!gotcha] Approximate, and "Skull" means any bone
> The help cautions the segmentation is *"far from perfect, so one should still
> treat them as approximate"* and that the result is *"primarily intended to be
> used to create nuisance variables for fMRI and PET"*; it also notes the **Skull**
> label *"includes any kind of bone"* ([`scripts/xcerebralseg:476-490`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L476-L490)). Do not
> treat it as a precise bone/skull model.

## Inputs

### Required Inputs

- **Subject ID** (`--s`) — a reconstructed `$SUBJECTS_DIR/<subj>` directory.
- **Source intensity volume** (`--srcvol`, default `nu.mgz`; the `--samseg` flag
  switches this to `orig.mgz` because "nu can have holes in it",
  [`scripts/xcerebralseg:333-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L333-L335)). Existence checked
  ([`scripts/xcerebralseg:425-429`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L425-L429)).
- **Brain segmentation to merge** (`--m`, default `aparc+aseg.mgz`) — must exist
  ([`scripts/xcerebralseg:431-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L431-L435)).
- **Engine-specific input:**
  - GCA path (`--nosamseg`): the nonlinear Talairach transform
    `mri/transforms/talairach.m3z` (`--xform`), checked only on this path
    ([`scripts/xcerebralseg:416-423`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L416-L423)); and the head GCA atlas
    (`$FREESURFER_HOME/average/aseg+spmhead+vermis+pons.ixi.gca`).
  - samseg path (default): no Talairach transform needed (samseg does its own
    registration) — which is why the error message for a missing transform suggests
    "Try using the --samseg flag" ([`scripts/xcerebralseg:420-421`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L420-L421)).

### Input Assumptions

> [!assumption] A recon-all subject with brainmask and aparc+aseg
> `xcerebralseg` assumes a standard reconstruction: an intensity volume
> (`nu.mgz`/`orig.mgz`), the brain segmentation `aparc+aseg.mgz`, and (for stats /
> seghead) `brainmask.mgz`. The GCA path additionally needs `talairach.m3z`; the
> samseg path does not. The head atlas was trained on adult IXI subjects (mean age
> ~58), so accuracy on very different populations (paediatric, heavily abnormal
> anatomy) is unknown.

- `OMP_NUM_THREADS` is set from `$FS_OMP_NUM_THREADS` (default 1) and passed to
  samseg as `--threads` ([`scripts/xcerebralseg:26-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L26-L30), [`scripts/xcerebralseg:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L109)).
- The `--seg1` escape hatch lets you supply a pre-computed full-head seg and skip
  the labelling step entirely ([`scripts/xcerebralseg:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L93), [`scripts/xcerebralseg:408-414`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L408-L414)).

## Outputs

### Files Created

| File | Where | When | Contents |
|------|-------|------|----------|
| `apas+head.mgz` | `$SUBJECTS_DIR/<subj>/mri/` | default | whole-head segmentation: brain (`aparc+aseg`) + extra-cerebral shell + pons/vermis, masked to head. Name overridable with `--o`. |
| `xcerebral.samseg/` | `.../mri/` | default (samseg) | the full samseg output directory (`seg.mgz` etc.); reused across runs ([`scripts/xcerebralseg:105-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L105-L114)) |
| `<segbase>.stats` | `.../stats/` | `--stats` | [[mri_segstats]] table over the head seg ([`scripts/xcerebralseg:220-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L220-L226)) |
| `xcerebralseg.log` | `.../scripts/` | always | command log |

Intermediate volumes (`seg1`–`seg4`, `pons`, `vermis`, `seghead`) live in the temp
directory and are removed on cleanup unless `--nocleanup`/`--tmpdir` is given.

### Output Specifications

- The output is an integer-labelled volume on the **source** geometry (conformed
  256³ 1 mm; see [[mgz]]). It interleaves standard aseg/aparc brain labels with the
  extra-cerebral labels:

  | Label | Name (FreeSurferColorLUT) | Provenance in this script |
  |-------|---------------------------|---------------------------|
  | 130 | AirCavity | sinus/air (samseg 262 → 130, [`scripts/xcerebralseg:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L125)) |
  | 165 | Skull (any bone) | bone (samseg 915/916 → 165) |
  | 172 | Vermis | merged from `--match 172 183 184` ([`scripts/xcerebralseg:182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L182)) |
  | 174 | Pons | merged from `--match 174 267` ([`scripts/xcerebralseg:166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L166)) |
  | 257 | CSF-ExtraCerebral | brain GM/WM replaced with CSF before merge ([`scripts/xcerebralseg:149-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L149-L151)) |
  | 258 | Head-ExtraCerebral | generic head/soft-tissue; fills unlabelled in-head voxels ([`scripts/xcerebralseg:205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L205)) |

  plus all the usual brain labels carried through from `aparc+aseg.mgz`.
- Voxels outside the [[mri_seghead]] head mask are 0 (masked out).

## Mathematical Foundations

`xcerebralseg` performs **no numerical modelling itself** — the segmentation
likelihoods are computed by the labelling engine, and the rest is integer label
algebra (remapping, masking, merging).

> [!math] Label algebra, not arithmetic
> The script's "math" is set operations on label volumes: relabel
> $\{3,42,2,41,36,66,11300,12300\}\to 257$ (brain→CSF,
> [`scripts/xcerebralseg:149-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L149-L151)); build masks $\mathbb{1}[L\in\{174,267\}]\to174$
> (pons) and $\mathbb{1}[L\in\{172,183,184\}]\to172$ (vermis); fill
> $\mathbb{1}[L=0 \wedge \text{head}]\to258$; and mask $L\cdot\mathbb{1}[\text{head}]$.
> All are [[mri_binarize]] `--replaceonly`/`--match`/`--mask`, [[mergeseg]], and
> [[mri_mask]] operations.

> [!internal] The actual tissue classification is in samseg or the GCA library
> When using the default engine, head tissue probabilities come from [[wiki/tools/samseg|samseg]]'s
> Bayesian atlas. With `--nosamseg`, they come from [[mri_ca_label]] applied to the
> IXI head GCA (built by segmenting 79 IXI subjects with SPM "New Segment" and
> training a GCA on the result, [`scripts/xcerebralseg:481-490`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L481-L490)). See those pages.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/xcerebralseg:263-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L263-L391)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--o` | string | `apas+head.mgz` | Output volume name, relative to `<subj>/mri/`. |
| `--samseg` | bool | **on** | Use [[wiki/tools/samseg|samseg]] to produce the extra-cerebral seg, and switch `--srcvol` to `orig.mgz` ([`scripts/xcerebralseg:333-336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L333-L336)). This is the default. |
| `--nosamseg`<br>`--no-samseg` | bool | off | Use [[mri_ca_label]] with the head GCA instead of samseg. **Note:** this does **not** undo a prior `--samseg`'s change of `srcvol` ([`scripts/xcerebralseg:337-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L337-L341)). |
| `--samseg-revert` | bool | off | Also remap samseg's Artery (902→258) and Vein (914→257) so the samseg label set matches the GCA label set exactly ([`scripts/xcerebralseg:131-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L131-L137), [`scripts/xcerebralseg:343-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L343-L345)). |
| `--atlas` | string | `aseg+spmhead+vermis+pons.ixi.gca` | Head GCA for the `--nosamseg` path; existence checked when set ([`scripts/xcerebralseg:307-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L307-L314)). |
| `--m` | string | `aparc+aseg.mgz` | Brain segmentation merged on top of the extra-cerebral shell. |
| `--srcvol` | string | `nu.mgz` (or `orig.mgz` with `--samseg`) | Source intensity volume for labelling and head detection. |
| `--seg1` | string | — | Use a pre-computed full-head seg (in `mri/`) as the labelling result, skipping samseg/`mri_ca_label`; also forces `--no-stats` ([`scripts/xcerebralseg:286-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L286-L290)). |
| `--thresh` | int | `35` | Intensity threshold passed to [[mri_seghead]] (`--thresh1`/`--thresh2`) for the head mask ([`scripts/xcerebralseg:56-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L56-L57), [`scripts/xcerebralseg:197-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L197-L198)). |
| `--no-pons`<br>`--nopons` | bool | pons on | Do not add a pons (174) label (both spellings set `DoPons=0`) ([`scripts/xcerebralseg:323-326`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L323-L326)). |
| `--no-vermis`<br>`--novermis` | bool | vermis on | Do not add a vermis (172) label (both spellings set `DoVermis=0`) ([`scripts/xcerebralseg:328-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L328-L331)). |
| `--stats` | bool | off | Run [[mri_segstats]] on the result for the extra-cerebral structures ([`scripts/xcerebralseg:316-317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L316-L317), [`scripts/xcerebralseg:219-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L219-L232)). |
| `--no-stats` | bool | on | Do not run stats (default). |
| `--threads`<br>`--nthreads` | int | `$FS_OMP_NUM_THREADS` or 1 | Set `OMP_NUM_THREADS` (forwarded to samseg). |
| `--force` | bool | off | Force re-running and overwriting even when intermediate outputs are up to date (`UpdateNeeded` overridden; samseg gets `--force`) ([`scripts/xcerebralseg:347-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L347-L349)). |
| `--no-force` | bool | on | Do not force (default). |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use a specific temp directory; also disables cleanup. |
| `--nocleanup` | bool | cleanup on | Keep the temp directory. |
| `--cleanup` | bool | on | Remove the temp directory at the end (default). |
| `--log` | string | `<scripts>/xcerebralseg.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--nosamseg` after `--samseg` leaves the source volume on `orig.mgz`
> `--samseg` sets `srcvol = orig.mgz`, and the `--nosamseg` handler **explicitly
> does not undo that** ("Note that if --samseg was used, this will not undo
> srcvol", [`scripts/xcerebralseg:337-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L337-L341)). So `--samseg --nosamseg` runs the GCA
> engine on `orig.mgz` instead of the GCA path's intended `nu.mgz`. If you want the
> GCA path, pass `--nosamseg` **without** `--samseg` (and optionally `--srcvol
> nu.mgz` after it). The default engine is already samseg, so `--samseg` is rarely
> needed explicitly.

> [!gotcha] GCA path requires `talairach.m3z`; samseg path does not
> With `--nosamseg` (and no `--seg1`), a missing `transforms/talairach.m3z` is a
> fatal error whose message suggests switching to `--samseg`
> ([`scripts/xcerebralseg:416-423`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L416-L423)). The default samseg path needs no Talairach
> transform.

> [!gotcha] `--seg1` disables stats and bypasses the labeller
> Supplying `--seg1` both skips samseg/`mri_ca_label` entirely (your seg is used
> as `seg1`) and silently sets `DoStats = 0` ([`scripts/xcerebralseg:286-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L286-L290)).
> The `--atlas`/`--srcvol`-for-labelling settings then have no effect on the
> labelling (though `--srcvol` is still used for the head mask).

> [!gotcha] `--samseg-revert` changes which labels survive
> Without it, samseg's Artery (902) and Vein (914) are **kept** as distinct labels
> (mapped only where other replacements apply); with it, they are collapsed to Head
> (258) and CSF (257) respectively so the label set matches the GCA output
> ([`scripts/xcerebralseg:131-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L131-L137)). Choose based on whether you want vessel
> labels.

- **Pons/vermis are derived from the head seg, before the brain merge** — they are
  extracted from `seg1` (which includes the IXI/samseg pons 174/267 and vermis
  172/183/184) and merged after the brain seg
  ([`scripts/xcerebralseg:163-193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L163-L193)). `--no-pons`/`--no-vermis` simply omit those
  merges.
- **`--threads` forwards only to samseg**; the GCA `mri_ca_label` call does not
  take a thread count here.

## Typical Use Cases

### 1. Default whole-head segmentation (samseg engine)

```bash
# Produces mri/apas+head.mgz using samseg + aparc+aseg merge
xcerebralseg --s subj01 --threads 4
```

### 2. Classic GCA (IXI head atlas) instead of samseg

```bash
# Uses nu.mgz + talairach.m3z + the IXI head GCA
xcerebralseg --s subj01 --nosamseg
```

### 3. As gtmseg runs it (PET partial-volume correction)

```bash
# The invocation gtmseg uses internally:
xcerebralseg --s subj01 --threads 4 --o apas+head.mgz
```

### 4. With stats, no vessel labels

```bash
xcerebralseg --s subj01 --samseg-revert --stats
```

### 5. Custom output and head threshold

```bash
xcerebralseg --s subj01 --o myhead.mgz --thresh 30 --no-vermis
```

## Pipeline Context

`xcerebralseg` is a stand-alone, post-reconstruction add-on; it is **not** in
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Its principal caller is
**`gtmseg`** (geometric transfer matrix segmentation for PET partial-volume
correction), which uses `apas+head.mgz` as its head segmentation and runs
([`scripts/gtmseg:108-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L108-L109)):

```tcsh
set cmd = (xcerebralseg --s $subject --threads $threads --o $headseg)
```

The `gtmseg` help also documents `--xcerseg` (run `xcerebralseg` to create the
head seg) and how to insert custom subcortical structures into `apas+head.mgz`
([`scripts/gtmseg:543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L543), [`scripts/gtmseg:613-667`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L613-L667)).

**Predecessor:** a complete [[wiki/pipelines/recon-all|recon-all]] run (providing
`nu.mgz`/`orig.mgz`, `aparc+aseg.mgz`, `brainmask.mgz`, and — for the GCA path —
`talairach.m3z`) → **xcerebralseg** → **Successor:** `gtmseg` / PET PVC, or any
analysis needing extra-cerebral nuisance regions. A related but lighter pons-only
tool is [[segpons]].

## Gotchas and Caveats

> [!gotcha] Brain tissue in the head seg is intentionally overwritten
> Step 2 deliberately replaces all brain GM/WM in the head seg with CSF (257)
> "because that will get replaced in the merge anyway"
> ([`scripts/xcerebralseg:145-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L145-L154)). The final brain labels always come from the
> merged `aparc+aseg.mgz`, never from the head-seg engine — so the head seg's
> intra-cranial accuracy does not matter, only its extra-cerebral shell.

> [!gotcha] samseg labels must be crosswalked
> The samseg engine emits its own label numbers; the script remaps ~20 of them to
> aseg/GCA equivalents (e.g. 184/183→172 vermis, 262→130 air, 915/916→165 skull,
> several 9xx→258 head, 267 PonsBelly→174 pons, CC 192→left-WM 2)
> ([`scripts/xcerebralseg:119-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L119-L137)). The comment notes this is needed because
> "the samseg seg will have a bunch of segments that are not in the ca_label
> output". This crosswalk is the main difference between the two engines' outputs.

> [!gotcha] `--samseg` overrides `--srcvol`
> Because `--samseg` forces `srcvol = orig.mgz`, an earlier `--srcvol nu.mgz` is
> ignored if `--samseg` comes after it. With the default (samseg) engine, the
> source is `orig.mgz` unless you pass `--srcvol` **after** any `--samseg`.

## Error Compensation and Guard Rails

- **Engine fallback hint.** A missing `talairach.m3z` on the GCA path produces an
  error that explicitly suggests `--samseg` ([`scripts/xcerebralseg:418-422`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L418-L422)).
- **`nu` → `orig` switch.** Selecting samseg automatically moves the source to
  `orig.mgz` because "nu can have holes in it" ([`scripts/xcerebralseg:334-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L334-L335))
  — a deliberate guard against nu artefacts.
- **Skip-if-up-to-date.** `UpdateNeeded` checks gate the (expensive) samseg /
  `mri_ca_label` and remap steps; `--force` overrides them
  ([`scripts/xcerebralseg:96-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L96-L116)). The samseg output directory is reused across
  runs.
- **In-head fill.** Unlabelled voxels within the head mask are set to Head (258)
  so the head is gap-free ([`scripts/xcerebralseg:203-205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L203-L205)).
- **Existence checks** for subject, `--seg1`, source vol, merge vol, atlas, and
  (GCA path) Talairach transform before processing
  ([`scripts/xcerebralseg:399-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L399-L435)).
- **Fail-fast** on every called tool's non-zero exit (jumps to `error_exit`).

## Related Tools

- [[wiki/tools/samseg|samseg]] — the default extra-cerebral labelling engine (whole-head Bayesian segmentation).
- [[mri_ca_label]] — the alternative GCA labeller (`--nosamseg`) using the IXI head atlas.
- [[mri_seghead]] — builds the binary head mask that bounds and fills the segmentation.
- [[mri_binarize]] — does all the label remapping, mask extraction, and in-head fill.
- [[mergeseg]] — merges the brain seg, pons, and vermis into the extra-cerebral shell.
- [[mri_mask]] — masks the final seg to the head extent.
- [[mri_segstats]] — optional extra-cerebral statistics (`--stats`).
- [[segpons]] — a lighter, MNI152-atlas route to just a pons (174) label.
- `gtmseg` *(no wiki page yet)* — the main caller (PET partial-volume correction); uses `apas+head.mgz`.

## Confidence and Gaps

**High confidence:** complete flag set, the two engines and how to select them, the
`--samseg`-overrides-`--srcvol` interaction, the brain→CSF replacement, the merge
order, the pons/vermis derivation, the head-mask fill/mask, the principal
extra-cerebral label numbers, and the exact `gtmseg` invocation — all read directly
from [`scripts/xcerebralseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg)
and [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L108-L109).

> [!gap] Complete samseg→aseg label crosswalk
> The script remaps a specific set of samseg ids
> ([`scripts/xcerebralseg:119-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L119-L137)), but the full samseg label dictionary (and
> hence which samseg labels are *not* remapped and survive as-is) was not
> enumerated from the samseg atlas. The mapping above lists only those the script
> touches.

> [!gap] IXI atlas applicability
> The head GCA was trained on 79 adult IXI subjects (mean age ~58,
> [`scripts/xcerebralseg:492-512`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L492-L512)); performance on populations far from that
> distribution is not characterized in the source.

## References

- FreeSurfer source: [`scripts/xcerebralseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg) (v8.2.0).
- Built-in help: `xcerebralseg --help` (the `BEGINHELP` block, [`scripts/xcerebralseg:476-513`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcerebralseg#L476-L513)), including the IXI demographic breakdown.
- Head atlas: `$FREESURFER_HOME/average/aseg+spmhead+vermis+pons.ixi.gca` (IXI database, www.brain-development.org; SPM "New Segment" + FreeSurfer GCA training).
- Caller: [`scripts/gtmseg:108-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L108-L109) (PET partial-volume correction).
