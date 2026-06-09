---
title: "scgm-mask"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/scgm-mask"
families: []                     # standalone group-mask builder, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_concat]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_synthmorph]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Relies on the recon-all v8 synthmorph warp (warp.to.mni152.1.0mm.1.0mm.nii.gz) existing under each subject; how/when that warp is created is in recon-all, not this script."
  - "The downstream consumer vlrmerge-mni and the comparison mask synthseg.t1.subcortgm.mask.nii.gz are referenced but not documented here."
tags:
  - mask
  - subcortical
  - gray-matter
  - mni152
  - group
  - probability-map
---

# scgm-mask

## Summary

`scgm-mask` builds a **subcortical grey-matter (SCGM) probability map and mask in
MNI152 space** from a group of FreeSurfer subjects. For each subject it warps the
`aseg.mgz` segmentation into MNI152 1 mm space using the non-linear SynthMorph
warp that [[wiki/pipelines/recon-all|recon-all]] (v8) created, stacks all the
warped segmentations, binarizes the subcortical-GM structures, and averages the
binary maps to get, at every voxel, the **fraction of subjects** in which that
voxel is subcortical grey matter (`p.scgm.nii.gz`, values 0–1). From that
probability map it produces a ready-to-use binary mask thresholded at 50 % and
morphologically "closed" (dilate 1, erode 1), plus a table of voxel counts at a
range of thresholds to help the user pick their own. The result is a
group-specific SCGM mask suitable for restricting smoothing or analysis (e.g. in
`vlrmerge-mni`).

## Source Information

- **Language:** tcsh shell script (`#!/usr/bin/env tcsh`)
- **Source file:** [`scripts/scgm-mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask)
- **Binary/script location:** `$FREESURFER_HOME/bin/scgm-mask`
- **Tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L95) (apply the warp, nearest-neighbour), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L107) (build the stack and the mean), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L117) (label-set binarization, thresholding, morphology, counting), the helper `UpdateNeeded`, and (for the printed QC line) [`freeview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L175).

## Purpose and Context

Many group analyses in standard space need a mask of where subcortical grey
matter actually is, tailored to the cohort being studied rather than a generic
atlas. `scgm-mask` produces that by combining each subject's own segmentation
(rather than a single template segmentation) and measuring inter-subject
agreement.

The key enabling feature is the **per-subject non-linear warp to MNI152** that
FreeSurfer v8's [[wiki/pipelines/recon-all|recon-all]] computes with SynthMorph
(stored at `mri/transforms/synthmorph.1.0mm.1.0mm/warp.to.mni152.1.0mm.1.0mm.nii.gz`).
Applying that warp to each `aseg.mgz` brings every subject's labels into a common
1 mm MNI152 grid, after which the SCGM structures can be aggregated voxelwise.

A group-specific mask is "tighter" than one made from segmenting the MNI152
template alone; the help contrasts the result against
`$FREESURFER/average/mni_icbm152_nlin_asym_09c/synthseg.t1.subcortgm.mask.nii.gz`
and names `vlrmerge-mni` as a consumer ([`scripts/scgm-mask:353-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L353-L357)).

It is a stand-alone, multi-subject tool run by hand; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

| Input | Flag | Notes |
|-------|------|-------|
| Subject(s) | `--s <subj>` (repeatable) and/or `--f <listfile>` | one or more FreeSurfer subjects (the list file is one subject per line); at least one required ([`scripts/scgm-mask:300-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L300-L303)) |
| Output directory | `--o` | created (with `log/`, `subjects/`, `count/`) if absent ([`scripts/scgm-mask:50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L50)) |

Each subject must have, under `$SUBJECTS_DIR/<subj>/mri/`, both the segmentation
(`aseg.mgz` by default, hard-coded — there is **no** flag to change `segvol`) and
the SynthMorph MNI152 warp; the script verifies both exist for every subject
before starting ([`scripts/scgm-mask:304-312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L304-L312)).

### Input Assumptions

> [!assumption] FreeSurfer v8 subjects with the SynthMorph MNI152 warp
> Every subject must be a completed v8 [[wiki/pipelines/recon-all|recon-all]] run
> that produced `mri/transforms/synthmorph.1.0mm.1.0mm/warp.to.mni152.1.0mm.1.0mm.nii.gz`.
> The segmentation aggregated is `aseg.mgz` (fixed). The non-GM label set used to
> *exclude* tissue is hard-coded ([`scripts/scgm-mask:16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L16)); everything not in that
> exclusion set and present in the aseg colour table is treated as SCGM by the
> binarization (see Mathematical Foundations). If a subject lacks the warp, the
> run aborts.

## Outputs

### Files Created

Under the `--o` directory ([`scripts/scgm-mask:83-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L83-L171)):

| File | Contents |
|------|----------|
| `subjects/<subj>.seg.nii.gz` | each subject's `aseg.mgz` warped into MNI152 1 mm space (nearest-neighbour) |
| `all.seg.nii.gz` | the per-subject warped segmentations concatenated into one 4-D "stack" |
| `all.seg.bin.nii.gz` | the stack binarized to {0,1} = SCGM vs not (per the label set) |
| `p.scgm.nii.gz` | **the probability map**: voxelwise mean of the binary stack = fraction of subjects with SCGM there |
| `nvox.thresh.dat` | table of threshold (0.1–0.9) vs. number of voxels surviving, to aid threshold choice |
| `count/countNN.dat` | per-threshold voxel counts feeding `nvox.thresh.dat` |
| `scgm.mask.th50.close.nii.gz` | **the default mask**: `p.scgm` thresholded at 0.5 then closed (dilate 1, erode 1); binarized value 559, with colour table attached |
| `pscgm.mask.th50.close.count.dat` | voxel count of the default mask |
| `log/scgm-mask.Y…log` | timestamped log of the run |

### Output Specifications

`p.scgm.nii.gz` is a float MNI152 1 mm volume with values in [0,1]. The default
mask `scgm.mask.th50.close.nii.gz` is an integer mask whose in-mask voxels carry
value **559** (`mri_binarize --binval 559`), with `FreeSurferColorLUT.txt`
attached as a colour table ([`scripts/scgm-mask:166-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L166-L167)). All volumes live on
the `mni_icbm152_t1_tal_nlin_asym_09c` 1 mm grid.

## Mathematical Foundations

> [!math] SCGM probability as inter-subject agreement
> For $K$ subjects, let $b_k(\mathbf{x})\in\{0,1\}$ be 1 where subject $k$'s
> warped aseg is subcortical grey matter at MNI152 voxel $\mathbf{x}$. The
> probability map is the voxelwise mean
> $$ p_{\text{SCGM}}(\mathbf{x}) = \frac{1}{K}\sum_{k=1}^{K} b_k(\mathbf{x}) \in [0,1], $$
> computed as `mri_concat all.seg.bin.nii.gz --mean` ([`scripts/scgm-mask:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L128)).
> The default mask is $\{\mathbf{x} : p_{\text{SCGM}}(\mathbf{x}) \ge 0.5\}$
> followed by a morphological **closing** (dilate by 1 voxel, then erode by 1) to
> smooth jagged boundaries ([`scripts/scgm-mask:166-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L166-L167)). The help notes each
> 0.2 change in threshold moves the mask edge by roughly one voxel
> ([`scripts/scgm-mask:368-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L368-L370)).

> [!gotcha] The binarization is by *exclusion*, not inclusion
> `mri_binarize --match-ctab $asegctab $idx` is given the list of **non-GM**
> indices `idx = (0 2 3 4 5 14 15 24 31 41 42 43 44 63 72 77 78 79 251 252 253
> 254 255)` ([`scripts/scgm-mask:16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L16), [`scripts/scgm-mask:117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L117)) — background, cerebral
> WM, cortex, CSF/ventricles, vessel, brain-stem, WM-hypointensities and the
> corpus-callosum labels. With `--match-ctab` against `ASegStatsLUT.txt`, the
> structures **left in** after removing those constitute the subcortical-GM set
> (thalamus, caudate, putamen, pallidum, hippocampus, amygdala, accumbens,
> ventral DC, etc.). So "SCGM" here is operationally "aseg structures that are
> not in the excluded non-GM list".

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/scgm-mask:214-288`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L214-L288)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | path | *(required)* | Output directory (created with `log/`, `subjects/`, `count/`). |
| `--s` | string (repeatable) | *(≥1 subject required)* | Add a FreeSurfer subject to the group; may be given multiple times. |
| `--f` | path | — | Read a file of subject ids (one per line) and add them all to the group. |
| `--sd` | path | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` for this run. |
| `--force` | boolean | off | Force regeneration of every output even if up to date (sets `ForceUpdate=1`). |
| `--no-force` | boolean | on | Honour the `UpdateNeeded` timestamp checks (the default). |
| `--log` | path | `<outdir>/log/scgm-mask.Y…log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | boolean | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | path | auto | Temp directory; setting it disables cleanup. (Temp dir is largely unused — see gotcha.) |
| `--nocleanup` | boolean | cleanup on | Keep the temp directory. |
| `--cleanup` | boolean | on | Remove the temp directory (currently a no-op — cleanup is commented out). |
| `--debug` | boolean | off | `set echo`/`verbose` tracing. |
| `--help` | boolean | — | Print help and exit. |
| `--version` | boolean | — | Print version and exit. |

There is intentionally **no** flag for the segmentation name, the label set, the
threshold, or the mask value — all are hard-coded; the help instead shows how to
re-binarize `p.scgm.nii.gz` by hand for a different threshold/morphology
([`scripts/scgm-mask:377-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L377-L392)).

### Configuration Interactions

> [!gotcha] Subjects accumulate from both `--s` and `--f`
> `--s` appends one subject, `--f` appends every subject in the named file
> ([`scripts/scgm-mask:227-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L227-L237)). You can combine them, and repeated `--s`
> flags accumulate. The mask is only meaningful with a reasonable number of
> subjects (the probability map is the mean over the group).

> [!gotcha] `--force` overrides all the up-to-date checks
> Every stage is wrapped in `UpdateNeeded`, so re-running only redoes work whose
> inputs changed. `--force` bypasses that and recomputes everything
> ([`scripts/scgm-mask:92-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L92-L93) and throughout). Use it after changing the subject
> list if filenames did not change.

- `--sd` must point at a `SUBJECTS_DIR` where **every** listed subject has both
  `aseg.mgz` and the SynthMorph warp, or the parameter check aborts.

## Typical Use Cases

### 1. Build a group SCGM mask from a subject list

```bash
scgm-mask --f subjects.txt --o /data/group/scgm
# → /data/group/scgm/p.scgm.nii.gz and scgm.mask.th50.close.nii.gz
```

### 2. A handful of subjects given inline

```bash
scgm-mask --s sub01 --s sub02 --s sub03 --o /data/group/scgm
```

### 3. Make a tighter or looser mask from the probability map

```bash
# (from the help) re-threshold p.scgm yourself
mri_binarize --i /data/group/scgm/p.scgm.nii.gz --min 0.7 \
  --dilate 1 --erode 1 --o /data/group/scgm/scgm.mask.th70.close.nii.gz
```

## Pipeline Context

`scgm-mask` is a **group-level mask-building** utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]], but it depends on a recon-all v8 product
(the per-subject SynthMorph MNI152 warp).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] v8 for each subject
(produces `aseg.mgz` and the SynthMorph warp) → **scgm-mask** (warp, stack,
binarize, average, threshold/close) → **Successor:** `vlrmerge-mni` and other
MNI152-space group analyses that use the SCGM mask
([`scripts/scgm-mask:353-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L353-L357)). At the end the script prints a ready-made
`freeview` command to overlay `p.scgm` (heat) and the mask outline on the MNI152
T1 ([`scripts/scgm-mask:174-178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L174-L178)).

## Gotchas and Caveats

> [!gotcha] Segmentation and threshold are not configurable from the CLI
> The aggregated segmentation is fixed to `aseg.mgz`, the SCGM definition to the
> hard-coded exclusion list, and the default mask to threshold 0.5 + closing.
> To vary any of these you must re-run `mri_binarize` on `p.scgm.nii.gz`
> yourself, as the help demonstrates ([`scripts/scgm-mask:377-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L377-L392)).

> [!gotcha] Cleanup is disabled in the source
> Both `mkdir -p $tmpdir` and the final `rm -rf $tmpdir` are commented out
> ([`scripts/scgm-mask:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L59), [`scripts/scgm-mask:185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L185)), so `--cleanup`/`--nocleanup`
> currently have no practical effect; the script does its work directly in the
> output directory.

> [!gotcha] In-mask voxels are valued 559, not 1
> The default mask uses `--binval 559` ([`scripts/scgm-mask:166-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L166-L167)), so the
> mask is not a plain {0,1} volume. Account for that when using it as a binary
> mask downstream (or binarize it yourself).

## Error Compensation and Guard Rails

- **Pre-flight existence check.** For every subject, both `aseg.mgz` and the
  SynthMorph warp are required to exist before any processing
  ([`scripts/scgm-mask:304-312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L304-L312)).
- **Incremental recomputation.** `UpdateNeeded` skips any stage whose outputs are
  newer than their inputs, so re-runs are cheap; `--force` overrides.
- **Fail-fast.** Each command is followed by `if($status) goto error_exit`.
- **Threshold table.** `nvox.thresh.dat` is generated automatically so the user
  can see how mask size varies with threshold before committing
  ([`scripts/scgm-mask:134-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L134-L157)).

## Related Tools

- [[mri_binarize]] — does the label-set binarization, thresholding, morphological closing, and voxel counting that drive every stage.
- [[mri_concat]] — builds the 4-D stack of warped segmentations and computes the voxelwise mean probability map.
- [[wiki/tools/mri_convert|mri_convert]] — applies the SynthMorph warp (`-at`) to bring each `aseg.mgz` into MNI152 space (nearest-neighbour).
- [[mri_synthmorph]] — produces the per-subject non-linear MNI152 warp (during recon-all) that this tool consumes.
- [[wiki/tools/freeview|freeview]] — the QC viewer the script prints a ready-made command for.
- `vlrmerge-mni` *(no wiki page yet)* — a downstream consumer of the SCGM mask named in the help.

## Confidence and Gaps

**High confidence:** the full processing sequence, the exclusion-based SCGM
definition, the probability-map math, the default 50 %+closing mask with binval
559, the complete flag set, and the hard-coded (non-configurable) parameters —
all read directly from [`scripts/scgm-mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask).

> [!gap] Provenance of the SynthMorph warp
> The warp `warp.to.mni152.1.0mm.1.0mm.nii.gz` is assumed to exist per subject;
> exactly how recon-all v8 names and creates it (and whether older recon-all
> outputs are compatible) is governed by recon-all, not this script.

## References

- FreeSurfer source: [`scripts/scgm-mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask) (v8.2.0).
- Built-in help (`BEGINHELP`): [`scripts/scgm-mask:342-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/scgm-mask#L342-L392).
- MNI152 2009c asymmetric template (`mni_icbm152_t1_tal_nlin_asym_09c`), the target space.
