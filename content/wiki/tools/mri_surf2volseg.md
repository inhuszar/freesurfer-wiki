---
title: "mri_surf2volseg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_aparc2aseg/mri_surf2volseg.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mri_aparc2aseg]]"
  - "[[mri_surf2vol]]"
  - "[[mris_volmask]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The full Surf2VolSeg class method implementation (especially RibbonToSeg and related methods) was not read in detail."
tags:
  - mri
  - surface
  - segmentation
  - aparc+aseg
  - autorecon3
---

# mri_surf2volseg

## Summary

`mri_surf2volseg` back-projects cortical surface parcellation annotations onto a volumetric segmentation, producing the `aparc+aseg.mgz` and `wmparc.mgz` outputs (among others). It supersedes `mri_aparc2aseg` as a more accurate and efficient implementation. The tool uses the white and pial surface geometry to define the cortical ribbon, then assigns each voxel within the ribbon the label of the nearest surface vertex based on its annotation. It also handles white matter parcellation (wmparc) and cortex label fixing.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_aparc2aseg/mri_surf2volseg.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_surf2volseg`
- **Original Author:** Douglas N. Greve
- **Note:** Source file lives in the `mri_aparc2aseg/` directory.

## Purpose and Context

After cortical parcellation on the surface (via [[mris_ca_label]]), these labels must be mapped back to volume space to create the combined segmentation+parcellation volumes used for downstream analysis. `mri_surf2volseg`:

1. Loads the white and pial surfaces for both hemispheres along with their annotation files.
2. Uses a hash table for fast nearest-vertex lookups.
3. For each voxel within the cortical ribbon (between white and pial surfaces), assigns the annotation label of the nearest white surface vertex.
4. Assigns white matter voxels to the nearest white surface annotation (wmparc).
5. Preserves subcortical segmentation labels from the input `aseg.mgz`.

This is the modern replacement for `mri_aparc2aseg` and is called directly in `recon-all`.

## Inputs

### Required Inputs

The tool operates on the standard FreeSurfer subject directory layout. Key inputs:

- **`--sd <dir>`** — subjects directory (default: `$SUBJECTS_DIR`). There is no --s subject flag; subject paths are set by providing explicit surface/annotation paths or by constructing paths via `SetSubjectPaths()` in calling scripts.
- **`--lh-annot <annot> <offset>`** — left hemisphere annotation path and base label offset (default: `lh.aparc.annot`, `1000`).
- **`--rh-annot <annot> <offset>`** — right hemisphere annotation path and base label offset (default: `rh.aparc.annot`, `2000`).
- **`--lh-white <surf>`** — LH white surface path.
- **`--rh-white <surf>`** — RH white surface path.
- **`--lh-pial <surf>`** — LH pial surface path.
- **`--rh-pial <surf>`** — RH pial surface path.
- **`--fix-presurf-with-ribbon <file>`** — ribbon volume path; enables `FixPresurf` mode (defines cortex voxels).
- **`--i <seg>`** — input segmentation volume (e.g., `aseg.presurf.mgz`).

### Input Assumptions

> [!assumption] Standard subject directory layout
> The tool is designed to operate on standard FreeSurfer subject directory structures and reads most paths automatically from `SetSubjectPaths()`.

> [!assumption] Annotation contains hemisphere offset
> LH annotations are expected to use base offset 1000 (cortex label = 1000 + atlas index), RH use 2000 by default.

## Outputs

### Files Created

- **`mri/aparc+aseg.mgz`** — combined cortical parcellation and subcortical segmentation volume.
- **`mri/wmparc.mgz`** — white matter parcellation volume (voxels in WM assigned to nearest cortical annotation).
- Other related outputs depending on flags.

### Output Specifications

Output is in FreeSurfer MGZ format with the same geometry as the input segmentation volume. Label values follow FreeSurfer's parcellation conventions (1000-series for LH cortex, 2000-series for RH cortex, standard subcortical labels for deep structures).

## Mathematical Foundations

**Ribbon-based assignment:** For each voxel in the cortical ribbon, the nearest white surface vertex is found via a hash table (`MHT`). The annotation label of that vertex is assigned to the voxel.

The hash table uses the surface vertex coordinates (in surface RAS) to enable $O(1)$ approximate nearest-vertex queries in a fixed spatial resolution grid (`hashres = 16` mm by default).

**Label offset convention:**
$$
\text{label}_{\text{vol}} = \text{annotation\_index} + \text{hemisphere\_offset}
$$
where `lhbaseoffset = 1000` and `rhbaseoffset = 2000`.

**WM parcellation:** For voxels in white matter (within `wmparc_dist_thresh = 5.0` mm of the white surface), the nearest white surface vertex annotation is similarly assigned with a WM-specific offset.

## Configuration Options

### Complete Flag Reference

Flag list fully verified from `parse_commandline()` in source (`mri_aparc2aseg/mri_surf2volseg.cpp`).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i <seg>` | path | required | Input segmentation volume path (e.g., `aseg.presurf.mgz`). |
| `--o <file>` | path | required | Output segmentation volume path. |
| `--sd <dir>` | path | `$SUBJECTS_DIR` | Subjects directory; sets `SUBJECTS_DIR` environment variable. |
| `--lh` | (none) | (both) | Process left hemisphere only; sets `DoLH=1, DoRH=0`. |
| `--rh` | (none) | (both) | Process right hemisphere only; sets `DoLH=0, DoRH=1`. |
| `--lh-annot <path> <offset>` | path, int | `lh.aparc.annot`, `1000` | LH annotation file path and integer base label offset. Requires two arguments. |
| `--rh-annot <path> <offset>` | path, int | `rh.aparc.annot`, `2000` | RH annotation file path and integer base label offset. Requires two arguments. |
| `--lh-white <path>` | path | — | LH white surface file path. |
| `--lh-pial <path>` | path | — | LH pial surface file path. |
| `--rh-white <path>` | path | — | RH white surface file path. |
| `--rh-pial <path>` | path | — | RH pial surface file path. |
| `--lh-cortex-mask <path>` | path | — | LH cortex label file path (`lh.cortex.label`). |
| `--rh-cortex-mask <path>` | path | — | RH cortex label file path (`rh.cortex.label`). |
| `--fix-presurf-with-ribbon <ribbon>` | path | — | Path to ribbon volume; enables `FixPresurf` mode. Mutually exclusive with `--label-cortex` and `--label-wm`. |
| `--label-cortex` | (none) | off | Label cortex voxels within the ribbon using the nearest white surface annotation. Enables `RipUnknown`. |
| `--label-wm` | (none) | off | Label white matter voxels within `wmparc-dmax` of the white surface. Enables `RipUnknown` and `LabelHypoAsWM`. |
| `--label-wm-unknown <lh_label> <rh_label>` | int, int | `5001`, `5002` | Label values for LH and RH WM voxels that could not be assigned an annotation. |
| `--hypo-as-wm` | (none) | off | Treat hypointensity voxels as white matter during WM labeling. |
| `--no-hypo-as-wm` | (none) | — | Do not treat hypointensity voxels as white matter (default). |
| `--rip-unknown` | (none) | off | Rip (exclude) vertices with unknown annotation from nearest-vertex search. |
| `--wmparc-dmax <mm>` | float | `5.0` | Maximum distance (mm) from the white surface for WM parcellation assignment. |
| `--hashres <f>` | float | `16.0` | Hash table spatial resolution (mm) for fast nearest-vertex lookup. |
| `--nhops <n>` | int | `5` | Maximum hops when searching for a labeled vertex from an unlabeled one. |
| `--src <file>` | path | — | Pre-allocate output volume from this file (initializes the output segmentation geometry from an existing volume). |
| `--ctab <file>` | path | — | ASCII color table to embed in output volume. |
| `--threads <n>`<br>`--nthreads <n>` | int | 1 | Number of OpenMP threads. |
| `--crs-test <c> <r> <s>` | int, int, int | — | Debug mode: print verbose information for voxel at column `c`, row `r`, slice `s`. Enables `debug`. |
| `--debug` | (none) | off | Enable verbose diagnostic output. |
| `--version` | (none) | — | Print version string and exit. |
| `--help`<br>`-h`<br>`--usage`<br>`-u` | (none) | — | Print help and exit. |

### Configuration Interactions

- Exactly one of `--fix-presurf-with-ribbon`, `--label-cortex`, or `--label-wm` must be specified; they are mutually exclusive operating modes.
- `--fix-presurf-with-ribbon` requires a ribbon volume path argument and automatically disables `RipUnknown`.
- `--label-cortex` and `--label-wm` both enable `RipUnknown`; `--label-wm` additionally enables `LabelHypoAsWM`.
- `--lh-annot` and `--rh-annot` each require two arguments: the annotation file path and the integer base offset. Passing only one argument will cause a parsing error.
- To restrict processing to one hemisphere, use `--lh` (sets `DoLH=1, DoRH=0`) or `--rh` (sets `DoLH=0, DoRH=1`). There are no --no-lh / --no-rh flags.
- `--wmparc-dmax` affects the extent of WM parcellation; larger values assign more white matter voxels to the nearest cortical annotation.
- `--rip-unknown` excludes vertices annotated as "unknown" from nearest-vertex search; this prevents those vertices from being assigned to brain voxels.

## Typical Use Cases

### Use Case 1: Generate aparc+aseg (called by recon-all)

```bash
mri_surf2volseg --sd $SUBJECTS_DIR \
  --lh-annot $SUBJECTS_DIR/subject/label/lh.aparc.annot 1000 \
  --rh-annot $SUBJECTS_DIR/subject/label/rh.aparc.annot 2000 \
  --label-cortex --label-wm \
  --i $SUBJECTS_DIR/subject/mri/aseg.mgz \
  --o $SUBJECTS_DIR/subject/mri/aparc+aseg.mgz
```

## Pipeline Context

`mri_surf2volseg` is called in `autorecon3` to produce the parcellation+segmentation volumes:

**Predecessor:** [[mris_ca_label]] (cortical parcellation) → **This tool** → [[mris_anatomical_stats]] and downstream analysis

## Gotchas and Caveats

> [!gotcha] Supersedes mri_aparc2aseg
> `mri_surf2volseg` is the modern replacement for `mri_aparc2aseg`. The latter is retained for backward compatibility but the former is called by `recon-all` from FreeSurfer 7.x onwards.

> [!gotcha] Hash table resolution affects accuracy
> The default `hashres = 16` mm means the nearest-vertex lookup has ~16 mm spatial resolution for hash bucket assignment. For very thin or convoluted cortex, this may occasionally assign incorrect vertices. Reducing hashres improves accuracy at the cost of memory.

## Related Tools

- [[mri_aparc2aseg]] — older version of this tool (superseded)
- [[mri_surf2vol]] — general surface-to-volume projection
- [[mris_volmask]] — creates cortical ribbon mask

## Confidence and Gaps

Confidence is **high** for the command-line interface (fully verified from `parse_commandline()`). The core algorithm (ribbon assignment, hash table lookup, WM parcellation) is **medium** confidence from class definition and key method signatures.
