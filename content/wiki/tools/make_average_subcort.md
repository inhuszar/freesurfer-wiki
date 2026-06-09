---
title: "make_average_subcort"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_average_subcort"
families: []
recon_all_stage: null
related:
  - "[[make_average_subject]]"
  - "[[mri_binarize]]"
  - "[[mri_concat]]"
  - "[[mri_volcluster]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The fixed aseg exclusion list at lines 95-103 is transcribed from the code but not individually cross-checked against the FreeSurferColorLUT label names; a couple of borderline labels (e.g. choroid plexus 31/63, VentralDC 28/60) may merit review for specific cohorts."
tags:
  - average-subject
  - subcortical
  - mask
  - fsfast
  - segmentation
---

# make_average_subcort

## Summary

`make_average_subcort` creates a single binary **subcortical grey-matter mask**
in fsaverage/MNI305 space from a set of reconstructed subjects. It is purpose-built
for FSFAST: when running a subcortical functional analysis you need a mask that
contains subcortical GM but firmly **excludes** cortex and cerebellum. The script
maps each subject's `aseg` into Talairach space, builds per-voxel probability maps
of cortex, subcortex, and cerebellum, then applies a sequence of probability
thresholds, a connected-components size filter, and morphological closing to
produce a clean mask (`outvol`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_average_subcort`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_average_subcort`
- **Tools invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L81), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L86), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L135), [`mri_volcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L202), and the helpers `fs_temp_dir`, `fname2stem`.

## Purpose and Context

FSFAST subcortical analysis resamples functional data into MNI305 and analyses
voxels inside a subcortical mask. Because partial-volume and registration error
let cortical and cerebellar signal bleed into neighbouring voxels, the mask must
be conservative at the cortex/subcortex and cerebellum/subcortex boundaries.
`make_average_subcort` produces exactly that conservative mask by combining many
subjects' segmentations probabilistically. It is a stand-alone utility — not part
of [[wiki/pipelines/recon-all|recon-all]] — typically run once to build a study or
FSFAST group mask.

## Inputs

### Required Inputs

- **A subject list** — `--subjects s1 s2 …` or `--fsgd file.fsgd`
  ([`scripts/make_average_subcort:246-262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L246-L262)).
  Each named subject must exist under `SUBJECTS_DIR` and contain
  `mri/aseg.mgz` and `mri/transforms/talairach.xfm`.
- **Output volume** — `--o outvol` (any [[wiki/tools/mri_convert|mri_convert]]-writable
  format).

### Input Assumptions

> [!assumption] Standard recon-all aseg in each subject
> The mask is defined entirely by `aseg` label numbers, so each subject must have
> a standard FreeSurfer `aseg.mgz`. The Talairach transform (default
> `talairach.xfm`, overridable with `--xform`) must be accurate, since all masks
> are combined in MNI305 space (`c_ras = 0`).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `outvol` (e.g. `subcort.mgz`) | path given to `--o` | final binary subcortical GM mask in MNI305/fsaverage space |
| `<outstem>.log` | beside `outvol` (unless `--log /dev/null`) | command log |

All intermediate probability maps and masks are written to a scratch temp
directory and removed unless `--tmpdir`/`--nocleanup` is set.

### Output Specifications

The output is a binary (0/1, or 255 after the final binarize) mask in MNI305
space, 1 mm isotropic, `c_ras = 0`. See [[coordinate-systems]] and [[fsaverage]].

## Mathematical Foundations

The mask is built from three voxelwise tissue **probabilities** —
$p_\text{ctx}$, $p_\text{subctx}$, $p_\text{cblum}$ — each the mean across
subjects of the corresponding binary `aseg` mask transformed to MNI305:
$$p_t(x) = \frac{1}{N}\sum_{i=1}^{N} \mathbb{1}\!\left[\text{label}_i(T_i x)\in t\right].$$

The final mask is the result of this thresholding cascade
([`scripts/make_average_subcort:152-213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L152-L213)):

1. **Drop high-cortex voxels.** Keep subcortex voxels where $p_\text{ctx} < 0.8$
   (i.e. exclude any voxel that is cortex in ≥ 80 % of subjects) and
   $p_\text{subctx} > 0$.
2. **Drop cortex-near-cerebellum.** Form a cerebellum mask excluding voxels with
   $p_\text{ctx} \ge 0.2$, invert it, and use it to remove cortex voxels adjacent
   to cerebellum from the subcortex mask.
3. **Size filter.** [[mri_volcluster]] removes connected components smaller than
   1000 voxels (`--minsizevox 1000`).
4. **Morphological closing.** A final [[mri_binarize]] dilates by 4 and erodes by
   4 to fill holes (the comment notes 4 was chosen empirically to eliminate
   holes).

> [!internal] All voxelwise operations live in the binaries
> Thresholding, masking, dilation/erosion ([[mri_binarize]]); probability
> averaging ([[mri_concat]] `--mean`); connected components ([[mri_volcluster]]);
> and the Talairach resampling ([[wiki/tools/mri_convert|mri_convert]]
> `--apply_transform`, nearest-neighbour) are implemented in those tools.

## Configuration Options

### Complete Flag Reference

Enumerated from the parser
([`scripts/make_average_subcort:235-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L235-L321)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subjects` | string list | *(one of these required)* | Input subjects (variable-length list). |
| `--fsgd` | file | — | Take the subject list from an FSGD file. |
| `--o` | string | *(required)* | Output mask volume. |
| `--xform` | string | `talairach.xfm` | Per-subject transform under `mri/transforms/` used to map each `aseg` into the common space. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir --scratch`) | Use this temp directory (also implies `--nocleanup`). |
| `--nocleanup` | bool | cleanup on | Keep the temporary intermediates. |
| `--debug`<br>`--echo` | bool | off | Trace execution (`set echo`). |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

The flag surface is small and the options are essentially independent. The one
coupling worth noting:

> [!gotcha] `--tmpdir` turns off cleanup
> Supplying `--tmp`/`--tmpdir` also sets `cleanup = 0`
> ([`scripts/make_average_subcort:274-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L274-L279)),
> so the (sizeable) per-subject probability maps are left on disk for inspection.

> [!gotcha] The probability thresholds are hard-coded
> The 0.8 / 0.2 cortex thresholds, the 1000-voxel cluster size, and the dilate/erode
> radius of 4 are constants in the script, not flags
> ([`scripts/make_average_subcort:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L154),
> [`:170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L170),
> [`:202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L202),
> [`:210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L210)).
> Changing them requires editing the script.

## Typical Use Cases

### 1. Build an FSFAST subcortical mask (from the built-in help)

```bash
make_average_subcort --o subcort.mgz \
  --subjects 004 008 017 021 032 039 040 045 049 067 073 074 \
   080 084 091 092 093 095 097 099 102 103 106 108 111 114 123 \
   124 128 129 130 131 133 136 138 140 141 144 145 149
```

### 2. Use a subject list from an FSGD and keep the intermediates

```bash
make_average_subcort --o subcort.mgz --fsgd study.fsgd \
  --tmpdir /scratch/subcort.work
```

## Pipeline Context

`make_average_subcort` is a stand-alone FSFAST support tool. It is **not** called
by [[wiki/pipelines/recon-all|recon-all]] or by [[make_average_subject]] (despite
the shared `make_average_*` name, it is independent and produces a mask, not a
subject directory).

**Predecessor:** N× [[wiki/pipelines/recon-all|recon-all]] (each providing an
`aseg`) → **make_average_subcort** → **Successor:** FSFAST subcortical
group analysis (the mask restricts which MNI305 voxels are analysed).

## Gotchas and Caveats

> [!gotcha] Output space is always fsaverage/MNI305
> Every `aseg` is transformed to MNI305 with `c_ras = 0` before combining, so the
> mask is only meaningful in that space — it is not a per-subject mask
> ([`scripts/make_average_subcort:86-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L86-L90)).

> [!gotcha] The "thalseg" comment is vestigial
> The first non-shebang line is the comment `# thalseg`
> ([`scripts/make_average_subcort:2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L2));
> it is a left-over and does not reflect the script's current subcortical-mask
> purpose.

> [!gotcha] Subcortex is defined by *exclusion*, not inclusion
> Rather than listing subcortical labels, the script binarizes the *inverse* of a
> long list of non-subcortical labels (background, cortex, white matter,
> ventricles, CSF, cerebellum, brainstem, CC, etc.)
> ([`scripts/make_average_subcort:95-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L95-L103)).
> Any label *not* on that exclusion list is treated as subcortical GM, so unusual
> labels in your aseg (e.g. lesion or extra-segmentation labels) would be included.

## Error Compensation and Guard Rails

- Each subject's existence and the presence of its `talairach.xfm` are checked
  before use ([`scripts/make_average_subcort:71-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L71-L75),
  [`:339-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L339-L344)).
- The connected-components size filter (1000 voxels) and the dilate/erode closing
  are themselves guard rails against speckle and holes in the probabilistic mask.
- Temporary files are removed on success unless `--tmpdir`/`--nocleanup` is set.

## Related Tools

- [[mri_binarize]] — does all the thresholding, masking, and morphological closing.
- [[mri_concat]] — averages the per-subject binary masks into probability maps.
- [[mri_volcluster]] — connected-component size filtering.
- [[wiki/tools/mri_convert|mri_convert]] — resamples each aseg into MNI305 (nearest-neighbour, `c_ras = 0`).
- [[make_average_subject]] — sibling `make_average_*` tool (builds a whole average subject, not a mask).
- [[fsaverage]] — defines the MNI305 target space.

## Confidence and Gaps

**High confidence:** the full flag set, the probability-thresholding cascade, the
fixed constants, and the exclusion-based subcortex definition — all read directly
from
[`scripts/make_average_subcort`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort).

> [!gap] Exact exclusion-label semantics
> The non-subcortical exclusion list ([`scripts/make_average_subcort:95-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort#L95-L103)) is transcribed from the code
> but not individually validated against the color LUT for every label; borderline
> labels (choroid plexus, VentralDC, etc.) may warrant review for specific cohorts.

## References

- FreeSurfer source: [`scripts/make_average_subcort`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subcort) (v8.2.0).
- Built-in help: `make_average_subcort --help`.
- Related concept: [[fsaverage]]; [[color-lut]] for aseg label numbers.
