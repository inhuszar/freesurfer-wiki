---
title: "mri_stopmask"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mri_stopmask.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_make_surfaces]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "SCMstopMask struct definition and stop mask algorithm not read — how the stop mask is generated from each input component is not documented here."
tags:
  - surface
  - mask
  - surface-placement
  - autorecon2
---

# mri_stopmask

## Summary

`mri_stopmask` creates a "stop mask" volume used by `mris_place_surface` (the surface placement module of `mris_make_surfaces`) to prevent the pial or white surface from wandering into anatomically implausible regions. The stop mask marks voxels in dark regions such as lesions, perivascular spaces, ventricles, and similar structures where gradient-based surface snapping should be suppressed. It is a preparatory step for surface delineation in the presence of white matter hyperintensities or other signal dropouts.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_make_surfaces/mri_stopmask.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_stopmask`
- **Note:** The source file is located inside the `mris_make_surfaces/` directory and is compiled as a separate binary. The `Progname` in the binary is `mris_place_surfaces` (as found in the source header), but the binary name is `mri_stopmask`.
- **Original Author:** Douglas N Greve

## Purpose and Context

During pial surface placement, `mris_place_surface` searches outward from the white surface following the local intensity gradient. In regions with low signal (dark lesions, enlarged perivascular spaces, ventricles), this gradient can erroneously pull the surface inward or downward into non-cortical tissue. The stop mask prevents this by flagging such voxels so the surface expansion algorithm stops at or before them.

`mri_stopmask` uses the `SCMstopMask` class (Stop Cortex Mask) to generate the mask from the subject's anatomical context (segmentation, intensity).

## Inputs

### Required Inputs

Each input component is specified individually via flags. There is no automatic subject-directory loading; all volumes must be supplied explicitly.

- **`--aseg <fname>`** — FreeSurfer aseg segmentation volume. Required by `--lv` and `--wmsa`.
- **`--wm <fname>`** — White matter volume (used for WM-based stop regions; enables `DoWM255=1`).
- **`--bfs <fname>`** — Brain-filled surface volume (used for BFS-based stop regions; enables `DoBFS255=1`).
- **`--filled <filledauto> <filled>`** — Two filled volumes (auto and manual); enables `DoFilled=1`. Requires two arguments.

`SUBJECTS_DIR` can be set in environment or via `--sd`.

### Input Assumptions

> [!assumption] All inputs supplied explicitly
> Unlike most FreeSurfer tools, `mri_stopmask` does NOT read a subject directory automatically from `--s`. The `--s` flag only records the subject name; all volume inputs must be specified individually with their respective flags.

## Outputs

### Files Created

- **Stop mask volume** — written to a path specified by `--o` (or inferred from subject directory). The format is MGZ (see [[mgz]]). Voxels with nonzero values define the stop region.

### Output Specifications

The stop mask has the same geometry as the reference anatomy volume. Nonzero voxels indicate locations where surface expansion should halt.

## Mathematical Foundations

The stop mask generation is implemented in `SCMstopMask` class. The algorithm identifies voxels that are:

1. Within a certain distance of the ventricles or WM hypointensities.
2. Below an intensity threshold in the T1 volume.
3. Labelled as specific tissue types in the segmentation (e.g., ventricle labels).

The exact criterion is implemented as a combined threshold on distance transforms and intensity maps.

> [!gap] SCMstopMask algorithm
> The `SCMstopMask` class definition and `compute()` method were not read. The exact criteria for stop mask generation (intensity thresholds, morphological operations, distance criteria) need documentation.

## Configuration Options

### Complete Flag Reference

Flag list fully verified from `parse_commandline()` in source (`mris_make_surfaces/mri_stopmask.cpp`).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--o <file>` | path | required | Output stop mask volume path. |
| `--aseg <file>` | path | — | Input aseg segmentation volume. Required by `--lv` and `--wmsa`. |
| `--wm <file>` | path | — | White matter volume for WM-based stop regions. Enables `DoWM255=1`. |
| `--no-wm` | (none) | — | Disable WM-based stop region computation. |
| `--bfs <file>` | path | — | Brain-filled-surface volume for BFS-based stop regions. Enables `DoBFS255=1`. |
| `--no-bfs` | (none) | — | Disable BFS-based stop region computation. |
| `--filled <filledauto> <filled>` | path, path | — | Two filled volumes (auto and manual). Enables `DoFilled=1`. Requires two arguments. |
| `--no-filled` | (none) | — | Disable filled-volume-based stop region computation. |
| `--lv` | (none) | off | Enable lateral ventricle-based stop regions. Requires `--aseg`. |
| `--no-lv` | (none) | — | Disable lateral ventricle-based stop region computation. |
| `--wmsa <erode_mm>` | float | — | Enable WMSA-based stop regions with `erode_mm` mm of erosion applied to the WMSA mask. Requires `--aseg`. |
| `--no-wmsa` | (none) | — | Disable WMSA-based stop region computation. |
| `--s <subject>` | string | — | Subject name (informational only; does not trigger automatic data loading). |
| `--sd <dir>` | path | `$SUBJECTS_DIR` | Subjects directory; sets `SUBJECTS_DIR` environment variable. |
| `--debug` | (none) | off | Enable verbose diagnostic output. |
| `--checkopts` | (none) | off | Check options and exit without running. |
| `--nocheckopts` | (none) | — | Disable option checking (default). |
| `--version` | (none) | — | Print version string and exit. |
| `--help` | (none) | — | Print help text and exit. |

### Configuration Interactions

- At least one of `--wm`, `--bfs`, `--filled`, `--lv`, or `--wmsa` must be specified; the tool exits with an error if nothing is selected to compute.
- `--lv` and `--wmsa` both require `--aseg` to be specified; without it, the tool exits with an error.
- The `Do*` flags can be selectively disabled with their `--no-*` counterparts after the corresponding input flag has been set.
- The tool computes the stop mask by combining all requested components (OR logic across enabled components).

## Typical Use Cases

### Use Case 1: Generate stop mask for surface placement

```bash
mri_stopmask \
  --aseg $SUBJECTS_DIR/subject/mri/aseg.mgz \
  --wm $SUBJECTS_DIR/subject/mri/wm.mgz \
  --lv \
  --wmsa 1.0 \
  --o $SUBJECTS_DIR/subject/mri/stopmask.mgz
```

The generated mask is then passed to `mris_place_surface` via its `--stopmask` flag.

## Pipeline Context

`mri_stopmask` is called as part of the `autorecon2` stage when generating pial surfaces. It is invoked by [[mris_make_surfaces]]:

**Predecessor:** intensity normalization (autorecon2) → **This tool** → [[mris_make_surfaces]] (surface placement)

## Gotchas and Caveats

> [!gotcha] Binary name vs. Progname
> Despite being compiled as the binary `mri_stopmask`, the source sets `const char *Progname = "mris_place_surfaces"` as a static initializer, and `main()` overrides it with `Progname = argv[0]`. At runtime, `Progname` will be the actual binary name (i.e., `mri_stopmask`), so log output is correct. However, the `handleVersionOption` call uses the string `"mris_place_surface"` (without 's'), so version output may display that name.

> [!gotcha] No automatic subject-directory loading
> Despite accepting `--s <subject>`, the tool does NOT read volumes from the subjects directory automatically. Every input volume must be provided explicitly via its own flag (`--aseg`, `--wm`, `--bfs`, `--filled`). The `--s` flag is informational only.

> [!gotcha] Subject-level processing only
> This tool requires the full standard FreeSurfer subject directory layout. It cannot be used on arbitrary volumes without a subjects directory structure.

## Related Tools

- [[mris_make_surfaces]] — calls this tool internally; performs the actual surface placement using the stop mask
- [[mri_binarize]] — general-purpose volume thresholding and binarization
- [[mri_mask]] — applies a binary mask to a volume

## Confidence and Gaps

Confidence is **high** for the command-line interface (fully verified from `parse_commandline()`). The `SCMstopMask` class internals and exact mask generation criteria are **medium** confidence (class not read in detail).

> [!gap] SCMstopMask internals
> Read the `SCMstopMask` class (likely in `mris_make_surfaces/` source files) to document the exact stop mask generation criteria for each component (`DoWM255`, `DoBFS255`, `DoFilled`, `DoLV`, `DoWMSA`).
