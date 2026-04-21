---
title: "mris_place_surface"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_place_surface.cpp"
  - "mris_make_surfaces/mris_place_surface.help.xml"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_refine_surfaces]]"
  - "[[mris_multimodal]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact role of --i (input) vs --init (init) surface is described as needing clarification in the code itself"
  - "Whether mris_place_surface is called by default in FS 8.2.0 recon-all (replacing mris_make_surfaces) needs verification"
tags:
  - surface
  - placement
  - white-surface
  - pial-surface
  - autorecon2
  - T2
  - FLAIR
---

# mris_place_surface

## Summary

`mris_place_surface` positions the triangular mesh representing a cortical surface — either the white matter / gray matter boundary ("white surface") or the gray matter / CSF boundary ("pial surface") — based on intensity gradients in MRI volumes. It is a rewrite of [[mris_make_surfaces]] designed to be more maintainable and extensible, and is the preferred surface placement tool in FreeSurfer 7+. It supports T2/FLAIR-assisted pial placement, flexible vertex ripping, and multiple surface types in a single binary.

## Source Information

- **Language:** C++
- **Source file:** `mris_make_surfaces/mris_place_surface.cpp`
- **Help XML:** `mris_make_surfaces/mris_place_surface.help.xml`
- **Original authors:** Douglas N Greve (rewrite), Bruce Fischl (original mris_make_surfaces)
- **Key includes:** `mris_multimodal_refinement.h`, `mrisurf_compute_dxyz.h`, `surfgrad.h`, `json.h`

## Purpose and Context

Cortical surface reconstruction requires finding the precise voxel-level boundary between tissue types. `mris_place_surface` deforms an input surface mesh by moving each vertex along its outward normal to find the local intensity gradient maximum that corresponds to the white/gray or gray/CSF transition. The tool:

- Replaces [[mris_make_surfaces]] for both white and pial surfaces
- Produces output identical to `mris_make_surfaces` for standard T1w input
- Adds support for T2/FLAIR-assisted pial placement (`--mmvol`)
- Uses a JSON-based auto-detection statistics file (`--adgws-in`) to set intensity thresholds
- Supports longitudinal processing with `--long`

From the source code comment:
> "This version of mris_place_surface yields identical output as mris_make_surfaces under these command-line conditions for simple T1w input for both cross and long."

## Inputs

- `--i input_surface` — input surface to deform
- `--invol brain.mgz` — T1-weighted intensity volume (usually `brain.finalsurfs.mgz`)
- `--adgws-in autodetstats.dat` — auto-detected gray/white statistics file (from `mris_autodet_gwstats`)
- `--white` or `--pial` — surface type to place (required)
- `--lh` or `--rh` — hemisphere (required)
- `--o output_surface` — output surface

Optional:
- `--wm wm.mgz` — white matter segmentation
- `--seg aseg.presurf.mgz` — whole-brain segmentation for ripping
- `--aparc ?.aparc.annot` — cortical parcellation for ripping
- `--rip-label cortex.label` — do not move vertices outside this label
- `--mmvol vol.mgz Type` — T2 or FLAIR volume for pial placement
- `--init init_surface` — initialisation surface (for pial)
- `--repulse-surf white_surface` — surface to repel from (used for pial)
- `--white-surf white_surface` — sets white{xyz} coordinates

## Outputs

- `--o output_surface` — placed surface in FreeSurfer binary format
- `--outvol outvol.mgz` — preprocessed input volume (optional)
- `--ripflag-out ripfile` — rip flag overlay (optional)
- `--local-max LocalMaxFlagFile` — local maximum found flag overlay (optional)
- `--target TargetSurf` — CBV target surface (optional)

## Mathematical Foundations

Surface placement is based on finding the maximum of the intensity gradient along the surface normal. The `MRIScomputeBorderValues()` function (CBV) evaluates the intensity profile at each vertex by sampling the input volume at positions:

$$p(t) = v + t \cdot \hat{n}$$

where $v$ is the current vertex position, $\hat{n}$ is the outward unit normal, and $t \in [-d_{max}, d_{max}]$. The target position is where the gradient magnitude is maximised.

The deformation integrates a spring force term, a gradient-following term, and an optional repulsion force (from `--repulse-surf`):

$$E_{total} = E_{intensity} + \lambda_{spring} E_{spring} + \lambda_{repulse} E_{repulse}$$

For T2/FLAIR pial placement, the `MRIS_MultimodalRefinement` engine is used when `--mm-refine` is specified.

## Configuration Options

### Required

| Flag | Description |
|---|---|
| `--o output` | Output surface file |
| `--i input` | Input surface file |
| `--adgws-in file.dat` | AutoDetectGrayWhiteStats file |
| `--invol invol.mgz` | T1-weighted intensity volume |
| `--white` or `--pial` | Surface type to place |
| `--lh` or `--rh` | Hemisphere |

### Optional — Inputs

| Flag | Description |
|---|---|
| `--wm wm.mgz` | White matter segmentation |
| `--seg seg.mgz` | Whole-brain segmentation |
| `--aparc parcellation` | Cortical annotation for ripping |
| `--mmvol vol.mgz Type` | T2 or FLAIR volume (`Type` = `T2` or `FLAIR`) |
| `--repulse-surf surface` | Surface to repel from (usually white for pial) |
| `--white-surf surface` | Sets white{xyz} coordinates |
| `--blend-surf weight surface` | Blend with this surface: `new = (1-w)*input + w*blend` |
| `--init init_surface` | Initialise pial from this surface |
| `--cover-seg SegVol` | Force surface to cover a segmentation |
| `--rip-label label` | Do not move vertices outside this label |
| `--rip-overlay file` | Rip vertices where overlay > 0.5 |
| `--ripsurface surface` | Reference surface for ripping midline/BG/WMSA |

### Optional — Ripping Control

| Flag | Description |
|---|---|
| `--rip-midline` / `--no-rip-midline` | Freeze midline vertices (default: on) |
| `--rip-bg` / `--no-rip-bg` | Freeze basal ganglia vertices (default: on) |
| `--rip-wmsa` / `--no-rip-wmsa` | Freeze WMSA vertices (seg labels 77–79) |
| `--rip-lesion` / `--no-rip-lesion` | Freeze lesion vertices (seg labels 25, 57) |
| `--no-rip-freeze` | Do not freeze 247-labelled voxels |
| `--no-rip` | Disable all ripping |
| `--rip-bg-lof` | Freeze BG vertices in lateral orbital frontal |
| `--rip-bg-no-annot` | Do not require annotation when ripping BG |

### Optional — Processing

| Flag | Description |
|---|---|
| `--nsmooth N` | Smooth input surface by N iterations before placement |
| `--smooth-after-rip` | Smooth after ripping when `--nsmooth` is used |
| `--max-cbv-dist dist` | Limit CBV search distance from input surface |
| `--long` | Longitudinal mode with constrained deformation |
| `--max-thickness T` | Maximum allowed cortical thickness (longitudinal) |
| `--use-aparc` | Use parcellation when placing (enables aparc-aware ripping) |
| `--no-intensity-proc` | Skip input volume intensity preprocessing |
| `--mm-refine` | Use MRIS_MultimodalRefinement for pial; sets `tspring=nspring=0.3` |
| `--pin-medial-wall label` | Pin medial wall vertices to white{xyz} after placement |
| `--restore-255` | Set 255-voxels to 110 after preprocessing (white only) |

### Optional — Output/Debug

| Flag | Description |
|---|---|
| `--outvol file.mgz` | Save preprocessed volume |
| `--outvol-only file.mgz` | Save volume then exit |
| `--ripflag-out file` | Save ripflag as overlay |
| `--local-max file` | Save LocalMaxFoundFlag overlay |
| `--target surface` | Save CBV target surface |
| `--debug-vertex N` | Debug vertex N |
| `--s subject` | Subject (alternative input specification) |
| `--adgw-in` | Alias for `--adgws-in` |

## Configuration Interactions

- `--white` and `--pial` are mutually exclusive; one must be specified.
- `--lh` and `--rh` are mutually exclusive; one must be specified.
- When using `--pial`, `--repulse-surf` should be set to the white surface to prevent pial from passing through white.
- `--mmvol` requires `--pial`; multimodal volumes are only used for pial placement.
- `--mm-refine` and `--mmvol` can both be specified but use different implementations; `--mm-refine` uses `MRIS_MultimodalRefinement` while `--mmvol` uses the CBV-based multimodal approach.
- `--nsmooth` without `--smooth-after-rip` smooths the surface before ripping; `--smooth-after-rip` changes this order.
- `--no-rip` disables all ripping regardless of other `--rip-*` flags.
- `--long` enables longitudinal mode which should be combined with `--max-thickness`.
- When `--pin-medial-wall` is specified, `--white-surf` should also be provided to define the target coordinates for medial wall vertices.

> [!gotcha] --i vs --init distinction
> The source code comments note: "The role of the input (--i) vs init (--init) surface needs to be clarified." In general, `--i` is the surface to deform, and `--init` is used to set the initial position for the pial before deformation begins (e.g., from `lh.white.preaparc` for the pial).

## Typical Use Cases

```bash
# Cross-sectional: place white.preaparc
mris_place_surface --s subject lh orig place.white.preaparc --white

# Cross-sectional: refine white surface
mris_place_surface --s subject lh white.preaparc place.white --white

# Cross-sectional: place pial
mris_place_surface --s subject lh white place.pial --pial --init lh.white.preaparc

# With T2 volume for improved pial
mris_place_surface \
  --adgws-in autodetstats.lh.dat \
  --seg ../mri/aseg.presurf.mgz \
  --wm ../mri/wm.mgz \
  --invol ../mri/brain.finalsurfs.mgz \
  --lh --i lh.woT2.pial --init lh.woT2.pial \
  --o lh.T2.pial --pial \
  --nsmooth 0 \
  --rip-label ../label/lh.cortex.label \
  --aparc ../label/lh.aparc.annot \
  --repulse-surf lh.white \
  --mmvol ../mri/T2.mgz T2 \
  --white-surf lh.white

# Longitudinal
mris_place_surface --s subject lh orig_white white.preaparc.mps --white --long --max-thickness 3.5
```

## Pipeline Context

`mris_place_surface` is the replacement for [[mris_make_surfaces]] in `recon-all` autorecon2. The surface placement sequence is:

1. `mris_autodet_gwstats` — computes statistics for gray/white boundary detection → `autodetstats.dat`
2. `mris_place_surface --white` × 2 — places `white.preaparc` then `white`
3. `mris_place_surface --pial` — places `pial`

In the standard `recon-all` pipeline, these calls happen in the `-make_surfaces` stage.

## Gotchas and Caveats

> [!gotcha] Not a drop-in replacement for mris_make_surfaces arguments
> While the output is designed to match [[mris_make_surfaces]], the command-line interface is completely different. Scripts that call `mris_make_surfaces` cannot be changed to `mris_place_surface` by simply renaming the binary.

> [!gotcha] adgws-in is required
> The auto-detection statistics file (`--adgws-in`) is required. This file is generated by `mris_autodet_gwstats` and must be run first. Missing this file will cause an error.

> [!gotcha] Pial --repulse-surf
> For pial surface placement, `--repulse-surf` should always be set to the white surface. Without it, the pial can deform inward past the white/gray boundary, producing impossible cortical thickness values (negative thickness).

> [!gotcha] mm-refine sets spring constants
> When `--mm-refine` is specified, the tool sets `tspring=nspring=0.3` internally, overriding default spring constants. This affects the smoothness of the deformation and is not separately controllable.

> [!gotcha] ripping and 247-label voxels
> "Freeze" voxels are encoded as label 247 in the segmentation. By default, vertices near these are frozen. If processing data with unusual segmentation labels (e.g., after lesion masking), this can unexpectedly freeze large surface regions.

## Related Tools

- [[mris_make_surfaces]] — the older tool this replaces
- [[mris_refine_surfaces]] — refines surfaces in a labelled region using high-resolution data
- [[mris_multimodal]] — research multimodal refinement
- `mris_autodet_gwstats` — generates the required `adgws.dat` file
- [[recon-all]] — calls this tool in autorecon2

## Confidence and Gaps

**Confident (from code and help XML):** Full flag set from help XML; --white/--pial requirement; ripping mechanism; adgws-in requirement; T2/FLAIR support via --mmvol; --mm-refine sets tspring=nspring=0.3; --long for longitudinal; --pin-medial-wall; spring/repulsion energy model.

**Uncertain:** Whether this tool is the default in FS 8.2.0 recon-all or whether mris_make_surfaces is still used; whether `--s subject` form (rather than explicit `--i`/`--invol`) is fully supported.

> [!gap] The distinction between `--i` and `--init` for pial placement is acknowledged as unclear in the source code comments. The developer wrote: "The role of the input (--i) vs init (--init) surface needs to be clarified."
