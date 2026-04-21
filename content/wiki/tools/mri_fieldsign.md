---
title: "mri_fieldsign"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fieldsign/mri_fieldsign.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_fdr]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - retinotopy
  - visual-cortex
  - field-sign
  - fmri
---

# mri_fieldsign

## Summary

`mri_fieldsign` computes visual field sign maps from retinotopic phase data on a cortical surface. Given eccentricity and polar angle maps (from fMRI retinotopic mapping), it computes the 2D Jacobian of the cortical-to-visual-field mapping to determine the sign of the visual field representation at each surface vertex. Field sign distinguishes mirror-image representations (negative sign) from non-mirror-image representations (positive sign), enabling visual area parcellation. Author: Douglas Greve.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fieldsign/mri_fieldsign.cpp`
- **Key dependencies:** `mrisurf.h`, `retinotopy.h`, `fsglm.h`, `surfcluster.h`

## Purpose and Context

Visual cortex is organized in a series of visual areas, each containing a representation of the visual field. Adjacent areas share a border along an iso-eccentricity contour, and the sign of the cortical magnification reverses at each area boundary. Computing field sign from retinotopic phase maps allows researchers to identify these area boundaries. `mri_fieldsign` automates this computation for FreeSurfer surfaces.

## Inputs

The tool requires:
- `--s <subject>`: Subject name (in SUBJECTS_DIR)
- `--hemi <lh|rh>`: Hemisphere
- Retinotopic data in one of two modes:
  - **SFA directory mode** (`--sfa <dir>`): Reads `<dir>/eccen/h.nii` and `<dir>/polar/h.nii` automatically.
  - **SFA file mode** (`--eccen-sfa <file>` and `--polar-sfa <file>`): Explicit paths to individual SFA output files.
  - **Complex (real/imaginary) mode** (`--eccen <real> <imag>` and `--polar <real> <imag>`): Real and imaginary component files for eccentricity and polar angle.
- Either `--patch <file>` or `--sphere` must be specified.

`SUBJECTS_DIR` must be set.

## Outputs

- `--fs <file>`: Field sign map (primary output, required)
- `--cmf <file>`: Cortical magnification factor map (1000 × |det(J)|)
- `--nnbr <file>`: Size of local neighbourhood used at each vertex (number of vertices within `dthresh=1.5mm`)
- `--rvar <file>`: Residual variance of the local GLM fit at each vertex

Optional processed phase maps:
- `--eccen-out <file>`: Write the processed eccentricity angle map after rotation
- `--polar-out <file>`: Write the processed polar angle map after rotation

## Mathematical Foundations

The field sign $\text{FS}(v)$ at surface vertex $v$ is the sign of the cross-product of the 2D gradients of eccentricity $E$ and polar angle $P$ on the cortical surface:

$$\text{FS}(v) = \text{sign}\left( \nabla_s E(v) \times \nabla_s P(v) \right)$$

where $\nabla_s$ denotes the surface gradient. This is the 2D Jacobian determinant of the mapping from cortical surface coordinates to visual field coordinates. A positive sign indicates that the cortical and visual field coordinate systems have the same handedness (non-mirror representation); negative sign indicates mirror representation.

> [!math] Field sign from polar and eccentricity
> Let $\mathbf{u} = \nabla_s E$ and $\mathbf{v} = \nabla_s P$ be surface gradient vectors. Then:
> $$\text{FS} = \text{sign}(u_x v_y - u_y v_x)$$
> where subscripts denote components in a local surface coordinate frame.

The function `RETcompute_fieldsign2()` implements this computation using surface vertex neighbours and the spherical coordinate representation.

Optional smoothing of eccentricity/polar maps before field sign computation is controlled by `--fwhm` or `--nsmooth`.

## Configuration Options

All flags use double dashes. Parsing is case-insensitive.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--s <subject>` | string | required | Subject name (must be in `$SUBJECTS_DIR`). |
| `--hemi <h>` | `lh` or `rh` | required | Hemisphere. |
| `--fs <file>` | path | required | Output field sign map file. |
| `--patch <file>` | filename | — | Load a surface patch file from `<SUBJECTS_DIR>/<subject>/surf/<hemi>.<file>`; the patch defines the surface region over which field sign is computed. Either `--patch` or `--sphere` is required. |
| `--occip` | — | — | Shorthand for `--patch occip.patch.flat`; loads the occipital flat-map patch. |
| `--sphere` | — | false | Use spherical coordinates from `<hemi>.sphere` surface instead of a flat patch. Either `--patch` or `--sphere` is required. |
| `--sfa <dir>` | path | — | SFA directory mode: reads `<dir>/eccen/h.nii` and `<dir>/polar/h.nii` as the eccentricity and polar SFA outputs. Sets SFA mode. |
| `--eccen-sfa <file>` | path | — | Explicit eccentricity SFA output file (alternative to `--sfa`). Sets SFA mode. |
| `--polar-sfa <file>` | path | — | Explicit polar angle SFA output file. Sets SFA mode. |
| `--sfa-true` | — | false | In SFA mode, use the raw real/imaginary components (frames 8–9) instead of the significance-weighted components (frames 3–2). Only affects behaviour when smoothing is applied. |
| `--eccen <real> <imag>` | 2 × path | — | Complex mode: real and imaginary component files for eccentricity (two separate arguments). Sets complex mode, clears SFA mode. |
| `--polar <real> <imag>` | 2 × path | — | Complex mode: real and imaginary component files for polar angle (two separate arguments). Sets complex mode, clears SFA mode. |
| `--eccen-out <file>` | path | — | Write the processed (angle-rotated) eccentricity map to this file after rotation. |
| `--polar-out <file>` | path | — | Write the processed (angle-rotated) polar angle map to this file after rotation. |
| `--eccen-rot <angle>` | float (degrees) | 0 | Rotate the eccentricity phase map by `<angle>` degrees before computing field sign; converted internally to radians. |
| `--polar-rot <angle>` | float (degrees) | 0 | Rotate the polar angle phase map by `<angle>` degrees before computing field sign. |
| `--fwhm <mm>` | float | — (no smoothing) | Smooth eccentricity and polar angle maps with a surface Gaussian kernel of `<fwhm>` mm FWHM (converted to smoothing iterations via `MRISfwhm2nitersSubj`). Mutually exclusive with `--nsmooth`. |
| `--nsmooth <n>` | int | — (no smoothing) | Smooth by exactly `<n>` iterations of nearest-neighbour surface smoothing. Mutually exclusive with `--fwhm`. |
| `--cmf <file>` | path | — | Write the cortical magnification factor map (`1000 × |det(J)|`) to this file. |
| `--nnbr <file>` | path | — | Write the neighbourhood size map (number of vertices within 1.5 mm of each vertex) to this file. |
| `--rvar <file>` | path | — | Write the residual variance of the local GLM fit to this file. |
| `--rev` | — | false | Reverse the sign of the field sign map after computation (multiply all values by −1). |
| `--old` | — | false | Use the old field sign estimation code (`RETcompute_fieldsign()`). |
| `--new` | — | true | Use the new field sign estimation code (`RETcompute_fieldsign2()`) — default. |
| `--sd <dir>` | path | `$SUBJECTS_DIR` | Override the `SUBJECTS_DIR` environment variable. |
| `--debug` | — | false | Enable verbose diagnostic output. |
| `--checkopts` | — | false | Validate options and exit without running. |
| `--version` | — | — | Print version and exit. |
| `--help` | — | — | Print usage and exit. |

## Configuration Interactions

- `--sfa`/`--eccen-sfa`/`--polar-sfa` and `--eccen`/`--polar` (complex mode) are mutually exclusive: specifying `--eccen real imag` sets complex mode and clears SFA mode.
- `--patch` and `--sphere` are mutually exclusive; exactly one must be specified (tool exits with an error if neither is given).
- `--occip` is syntactic sugar for `--patch occip.patch.flat` and cannot be combined with `--patch`.
- `--fwhm` and `--nsmooth` are mutually exclusive; the tool exits with an error if both are given.
- `--rev` is applied after field sign computation and does not affect intermediate outputs (`--cmf`, `--nnbr`, `--rvar`).
- `--old` and `--new` are mutually exclusive; the last specified wins; `--new` is the default (`usenew = 1`).
- `--sfa-true` only has an effect in SFA mode when smoothing is also applied; it selects which SFA output frames are used as inputs to the smoothing step.

## Typical Use Cases

```bash
# Compute field sign from SFA directory
mri_fieldsign --s sub01 --hemi lh \
  --sfa /path/to/sfadir \
  --occip \
  --fs lh.fieldsign.mgz

# Compute from explicit SFA files with smoothing
mri_fieldsign --s sub01 --hemi lh \
  --eccen-sfa lh.eccen.sfa --polar-sfa lh.polar.sfa \
  --sphere --fwhm 5 --fs lh.fieldsign.mgz

# Compute from complex (real/imag) components
mri_fieldsign --s sub01 --hemi lh \
  --eccen eccen_real.mgz eccen_imag.mgz \
  --polar polar_real.mgz polar_imag.mgz \
  --sphere --fs lh.fieldsign.mgz

# Also output CMF and residual variance
mri_fieldsign --s sub01 --hemi lh \
  --eccen-sfa lh.eccen.sfa --polar-sfa lh.polar.sfa \
  --sphere --fs lh.fieldsign.mgz \
  --cmf lh.cmf.mgz --rvar lh.rvar.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Used in retinotopic mapping experiments after volume-to-surface projection of phase maps (e.g., using `[[mri_vol2surf]]`).

## Gotchas and Caveats

> [!gotcha] Requires sphere surface
> The tool reads `<hemi>.sphere` from the subject's `surf/` directory. This requires a complete surface reconstruction.

> [!assumption] Phase conventions must be consistent
> The sign of the field sign depends on the convention used for eccentricity and polar angle encoding. The `--rev` flag and rotation angles allow adjusting for different conventions.

## Related Tools

- `[[mri_vol2surf]]` — maps fMRI activation volumes to surface for input to this tool
- `[[mri_fdr]]` — statistical thresholding of field sign maps

## Confidence and Gaps

**High confidence (from source):** All flags confirmed from complete `parse_commandline()` read. SFA vs. complex input modes, all output options, smoothing, rotation, `--occip` shortcut, `--old`/`--new` estimation code selection, `--sfa-true` frame selection logic.
