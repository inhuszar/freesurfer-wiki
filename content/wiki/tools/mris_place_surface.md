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
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Whether mris_place_surface is the default in FS 8.2.0 recon-all (replacing mris_make_surfaces) needs verification"
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
- Supports multimodal refinement via `--mm-refine` and standalone utility modes (`--thickness`, `--curv-map`, `--area-map`)

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

$$
p(t) = v + t \cdot \hat{n}
$$

where $v$ is the current vertex position, $\hat{n}$ is the outward unit normal, and $t \in [-d_{max}, d_{max}]$. The target position is where the gradient magnitude is maximised.

The deformation integrates a spring force term, a gradient-following term, and an optional repulsion force (from `--repulse-surf`):

$$
E_{total} = E_{intensity} + \lambda_{spring} E_{spring} + \lambda_{repulse} E_{repulse}
$$

For T2/FLAIR pial placement, the `MRIS_MultimodalRefinement` engine is used when `--mm-refine` is specified.

## Configuration Options

### Required

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--o` | `output` | — | Output surface file |
| `--i` | `input` | — | Input surface file (sets `tspring=nspring=0.3`) |
| `--adgws-in` | `file.dat` | — | AutoDetectGrayWhiteStats file (alias: `--adgws`) |
| `--invol` | `invol.mgz` | — | T1-weighted intensity volume |
| `--white` or `--pial` | _(none)_ | — | Surface type to place |
| `--lh` or `--rh` | _(none)_ | — | Hemisphere |

### Optional — Inputs

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--wm` | `wm.mgz` | — | White matter segmentation (enables intensity preprocessing) |
| `--seg` | `seg.mgz` | — | Whole-brain segmentation |
| `--no-seg` | _(none)_ | off | Unset a previously specified `--seg` |
| `--aparc` | `parcellation` | — | Cortical annotation for ripping (also sets `UseAParc=1`) |
| `--mmvol` | `vol.mgz Type` | — | T2 or FLAIR volume for pial placement (`Type` = `T2` or `FLAIR`); forces `--pial` |
| `--repulse-surf` | `surface` | — | Surface to repel from (usually white for pial) |
| `--white-surf` | `surface` | — | Sets white{xyz} coordinates used for T2/FLAIR and `--pin-medial-wall` |
| `--blend-surf` | `weight surface` | — | Blend input with this surface: `new = (1-w)*input + w*blend` |
| `--cover-seg`<br>`--cover_seg` | `SegVol` | — | Force surface to cover a segmentation volume |
| `--rip-label` | `label` | — | Do not move vertices outside this label; also sets `RipMidline=0` |
| `--rip-overlay` | `file` | — | Rip vertices where overlay value > 0.5 |
| `--rip-surf` | `surface` | — | Reference surface for midline/BG/WMSA ripping (default: use input surface) |
| `--stopmask` | `mask.mgz` | — | Stop deformation where mask is non-zero |

### Optional — Ripping Control

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--rip-midline`<br>`--no-rip-midline` | _(none)_ | on | Freeze midline vertices |
| `--rip-bg`<br>`--no-rip-bg` | _(none)_ | off | Freeze basal ganglia vertices |
| `--rip-bg-lof`<br>`--no-rip-bg-lof` | _(none)_ | off | Freeze BG vertices in lateral orbital frontal cortex |
| `--rip-bg-no-annot` | _(none)_ | off | Do not require annotation when ripping BG (sets `RipBGRequireAnnot=0`) |
| `--rip-wmsa`<br>`--no-rip-wmsa` | _(none)_ | off | Freeze WMSA vertices (seg labels 77–79) |
| `--rip-lesion`<br>`--no-rip-lesion` | _(none)_ | off | Freeze lesion vertices (seg labels 25, 57) |
| `--rip-freeze`<br>`--no-rip-freeze` | _(none)_ | on | Freeze 247-labelled voxels |
| `--no-rip` | _(none)_ | off | Disable all ripping (sets WMSA, freeze, lesion, BG, midline all to 0) |
| `--rip-projection` | `dmin dmax dstep` | `-2.0 +2.0 0.5` | Set projection range and step for rip detection (mm) |

### Optional — Processing

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--nsmooth` | `N` | `0` | Smooth input surface by N iterations before placement |
| `--smooth-after-rip` | _(none)_ | off | Smooth after ripping instead of before (requires `--nsmooth`) |
| `--max-cbv-dist` | `dist` | `5.0` | Limit CBV search distance (mm) from input surface along normal |
| `--use-aparc` | _(none)_ | off | Use parcellation when placing (enables aparc-aware ripping) |
| `--no-intensity-proc` | _(none)_ | off | Skip input volume intensity preprocessing |
| `--mm-refine` | `N vol1type vol1path ...` | — | Use `MRIS_MultimodalRefinement` for pial; takes N image pairs |
| `--mm-min-p-grey` | `val` | `20` | Minimum P(grey) for `--mm-refine` (default: 20) |
| `--mm-weights` | _(none)_ | off | Enable MM refinement weights |
| `--pin-medial-wall` | `label` | — | Pin medial wall vertices to white{xyz} after placement (requires `--white-surf`) |
| `--no-pin-medial-wall` | _(none)_ | off | Unset a previously set `--pin-medial-wall` |
| `--restore-255` | _(none)_ | off | Restore 255-voxels to 110 after preprocessing (white surface only) |
| `--cbv-zero`<br>`--no-cbv-zero` | _(none)_ | off | Force CBV target value to 0 (disables intensity preprocessing) |
| `--first-peak-d1`<br>`--no-first-peak-d1` | _(none)_ | off | Use first-peak D1 mode in CBV |
| `--first-peak-d2`<br>`--no-first-peak-d2` | _(none)_ | off | Use first-peak D2 mode in CBV |
| `--neg-sign` | _(none)_ | off | Negate the sample volume derivative sign in CBV |
| `--fill-lat-vents` | `mm topo nnbrs` | — | Fill lateral ventricles in invol; dilates by `mm`, topology `topo`, nnbrs `nnbrs` |
| `--alt-border-low` | `labelfile factor` | — | Use alternate border-low threshold for high-myelin label regions |
| `--location-mov-len` | `val` | — | Override the `LOCATION_MOVE_LEN` constant used in target-location term |
| `--shrink` | `thresh` | — | Shrink large triangles on the second iteration |
| `--subiters` | `N` | `1` | Number of sub-iterations per smoothing level |

### Optional — Multimodal Intensity Limits

These flags override the T2/FLAIR intensity limits set automatically by `--mmvol`. Must be specified after `--mmvol`.

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--mm_min_inside` | `val` | T2: `110` / FLAIR: `50` | Minimum intensity inside pial (between white and pial) |
| `--mm_max_inside` | `val` | T2: `300` / FLAIR: `200` | Maximum intensity inside pial |
| `--mm_min_outside` | `val` | T2: `130` / FLAIR: `10` | Minimum intensity outside pial |
| `--mm_max_outside` | `val` | T2: `300` / FLAIR: `50` | Maximum intensity outside pial |

### Optional — Cost Function Weights

These flags override the default energy term weights used during surface deformation.

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--intensity` | `weight` | `0.2` | Weight for intensity gradient term (`l_intensity`) |
| `--location` | `weight` | `0.0` | Weight for surface location term (`l_location`) |
| `--repulse` | `weight` | `0.0` | Weight for surface repulsion term (`l_repulse`); white sets this to 5.0 post-parse |
| `--spring` | `weight` | `0.0` | Weight for isotropic spring term (`l_spring`) |
| `--tspring` | `weight` | `1.0` | Weight for tangential spring term (`l_tspring`) |
| `--nspring` | `weight` | `0.5` | Weight for normal spring term (`l_nspring`) |
| `--curv` | `weight` | `1.0` | Weight for curvature smoothing term (`l_curv`) |
| `--hinge` | `weight` | `0.0` | Weight for hinge energy term (`l_hinge`) |
| `--surf-repulse` | `weight` | `0.0` | Weight for surface-surface repulsion (`l_surf_repulse`); pial sets this to 5.0 |
| `--spring_nzr` | `weight` | `0.0` | Weight for non-zero-rest-length spring term (`l_spring_nzr`) |

### Optional — Intensity Thresholds

These flags override thresholds read from `--adgws-in`. Must be specified after `--adgws-in`.

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--white_border_hi` | `val` | from adgws | White surface border high threshold |
| `--white_border_low` | `val` | from adgws | White surface border low threshold |
| `--white_border_low_factor` | `val` | from adgws | Factor for computing white border low from gray/white means |
| `--white_outside_low` | `val` | from adgws | White surface outside low threshold |
| `--white_inside_hi` | `val` | from adgws | White surface inside high threshold |
| `--white_outside_hi` | `val` | from adgws | White surface outside high threshold |
| `--pial_border_hi` | `val` | from adgws | Pial surface border high threshold |
| `--pial_border_low` | `val` | from adgws | Pial surface border low threshold |
| `--pial_outside_low` | `val` | from adgws | Pial surface outside low threshold |
| `--pial_inside_hi` | `val` | from adgws | Pial surface inside high threshold |
| `--pial_outside_hi` | `val` | from adgws | Pial surface outside high threshold |

### Optional — Volume Names / Environment

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--sd` | `subjects_dir` | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` environment variable |
| `--involname` | `name` | `brain.finalsurfs.mgz` | Override default input volume name (used with `--s`) |
| `--segvolname` | `name` | `aseg.presurf.mgz` | Override default segmentation volume name (used with `--s`) |
| `--n_averages` | `N` | `0` (auto) | Starting number of smoothing averages (0 = use surface-type default) |
| `--max-threads` | _(none)_ | off | Use all available OpenMP threads |
| `--max-threads-1`<br>`--max-threads-minus-1` | _(none)_ | off | Use all available OpenMP threads minus one |
| `--threads` | `N` | `1` | Set number of OpenMP threads explicitly (alias: `--nthreads`) |

### Optional — Output/Debug

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--outvol` | `file.mgz` | — | Save preprocessed intensity volume |
| `--outvol-only` | `file.mgz` | — | Save preprocessed volume then exit without placing surface |
| `--ripflag-out` | `file` | — | Save ripflag as overlay |
| `--local-max` | `file` | — | Save LocalMaxFoundFlag overlay |
| `--target` | `surface` | — | Save CBV target surface |
| `--debug-vertex` | `N` | — | Enable per-vertex debug output for vertex N |
| `--s` | `subject hemi insurf outsurf` | — | Populate input/output paths from subjects directory |
| `--adgws-out` | `file.dat` | — | Write auto-detected gray/white stats to file |
| `--adgws` | `file.dat` | — | Alias for `--adgws-in` |

### Standalone Utility Modes

These flags cause `mris_place_surface` to perform a standalone computation and exit immediately, without performing surface placement.

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--thickness` | `white pial nbhd_size maxthickness out` | — | Compute and write cortical thickness overlay |
| `--curv-map` | `surf nbrs curvature_avgs out` | — | Compute and write mean curvature map |
| `--area-map` | `surf out` | — | Compute and write vertex area map |
| `--fit` | `inputsurf mri targsurf loc hin nzr rep iters outsurf` | — | Fit a surface to a target using specified cost weights |
| `--tps` | `weight pointset nhops fill01 angleprune01 AngleDegThresh distprune01 DistMmThresh` | — | Target-point-set placement: add a cost term attracting surface vertices toward a JSON pointset (8 args required) |
| `--tps-debug` | _(none)_ | off | Enable debug output for target-point-set placement |
| `--tps-targetpointset` | `<file>` | — | Save the target pointset to file (JSON format) |
| `--tps-vertexpointset` | `<file>` | — | Save the vertex pointset to file |
| `--tps-mask` | `<file>` | — | Mask file restricting target-point-set attraction |
| `--tps-vector` | `<file>` | — | Vector file for target-point-set placement |
| `--tps-patch` | `<file>` | — | Patch file for target-point-set placement |

## Configuration Interactions

- `--white` and `--pial` are mutually exclusive; one must be specified.
- `--lh` and `--rh` are mutually exclusive; one must be specified.
- When using --pial, `--repulse-surf` should be set to the white surface to prevent pial from passing through white.
- `--mmvol` requires `--pial`; multimodal volumes are only used for pial placement.
- `--mm-refine` and `--mmvol` can both be specified but use different implementations; `--mm-refine` uses `MRIS_MultimodalRefinement` while `--mmvol` uses the CBV-based multimodal approach.
- `--nsmooth` without `--smooth-after-rip` smooths the surface before ripping; `--smooth-after-rip` changes this order.
- `--no-rip` disables all ripping regardless of other `--rip-*` flags.
- When `--pin-medial-wall` is specified, `--white-surf` should also be provided to define the target coordinates for medial wall vertices.
- `--cbv-zero` disables intensity preprocessing (`DoIntensityProc=0`) in addition to forcing the CBV target to 0.
- `--rip-label` implicitly sets `RipMidline=0`; if you want rip-label and rip-midline, ripping midline must be re-enabled explicitly with `--rip-midline`.

## Typical Use Cases

```bash
# Cross-sectional: place white.preaparc
mris_place_surface --s subject lh orig place.white.preaparc --white

# Cross-sectional: refine white surface
mris_place_surface --s subject lh white.preaparc place.white --white

# Cross-sectional: place pial
mris_place_surface --s subject lh white place.pial --pial

# With T2 volume for improved pial
mris_place_surface \
  --adgws-in autodetstats.lh.dat \
  --seg ../mri/aseg.presurf.mgz \
  --wm ../mri/wm.mgz \
  --invol ../mri/brain.finalsurfs.mgz \
  --lh --i lh.woT2.pial \
  --o lh.T2.pial --pial \
  --nsmooth 0 \
  --rip-label ../label/lh.cortex.label \
  --aparc ../label/lh.aparc.annot \
  --repulse-surf lh.white \
  --mmvol ../mri/T2.mgz T2 \
  --white-surf lh.white

# Standalone: compute thickness
mris_place_surface --thickness lh.white lh.pial 20 5 lh.thickness
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

> [!gotcha] --i sets spring constants
> Specifying `--i` (the input surface path) sets `parms.l_tspring=0.3` and `parms.l_nspring=0.3` immediately in `parse_commandline`. These values can be overridden afterwards with explicit `--tspring` or `--nspring` flags.

> [!gotcha] ripping and 247-label voxels
> "Freeze" voxels are encoded as label 247 in the segmentation. By default, vertices near these are frozen. If processing data with unusual segmentation labels (e.g., after lesion masking), this can unexpectedly freeze large surface regions.

## Related Tools

- [[mris_make_surfaces]] — the older tool this replaces
- [[mris_refine_surfaces]] — refines surfaces in a labelled region using high-resolution data
- [[mris_multimodal]] — research multimodal refinement
- `mris_autodet_gwstats` — generates the required `adgws.dat` file
- [[wiki/pipelines/recon-all|recon-all]] — calls this tool in autorecon2

## Confidence and Gaps

**Confident (from source):** Complete flag set verified from `parse_commandline` in `mris_make_surfaces/mris_place_surface.cpp`; --white/--pial requirement; ripping mechanism (--rip-surf, --rip-projection, --rip-freeze and all variants); adgws-in requirement (--adgws is an alias); T2/FLAIR support via --mmvol; --i sets tspring=nspring=0.3 immediately on parse; --pin-medial-wall (requires --white-surf); all cost function weight flags; complete threshold override flags; multimodal intensity limits (--mm_min/max_inside/outside); standalone utility modes (--thickness, --curv-map, --area-map, --fit); environment flags; rip projection defaults (dmin=-2, dmax=+2, dstep=0.5).

**Confirmed absent from source:** `--long`, `--max-thickness`, `--init` — these appear only in example command-line comments in the source file, not in `parse_commandline`. They are NOT valid flags.

**Uncertain:** Whether this tool is the default in FS 8.2.0 recon-all or whether mris_make_surfaces is still used; whether `--s subject` form (rather than explicit `--i`/`--invol`) is fully supported in current code.
