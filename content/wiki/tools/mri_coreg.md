---
title: "mri_coreg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_coreg/mri_coreg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_em_register]]"
  - "[[mri_compute_volume_fractions]]"
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "NMI cost function internals (NMICost) not fully characterized here"
  - "Powell optimizer parameter tuning documented only at defaults"
tags:
  - registration
  - coreg
  - bbr
  - rigid
  - fmri
---

# mri_coreg

## Summary

`mri_coreg` computes a rigid-body (6 DOF) or affine (up to 12 DOF) registration between two MRI volumes using Normalized Mutual Information (NMI) as the cost function. It is the newer, recommended replacement for `tkregister2 --regheader` within FreeSurfer, designed for within-modality and cross-modality registration (e.g., EPI to T1). The output is an [[lta-format]] registration file.

## Source Information

- **Language:** C++
- **Source file:** `mri_coreg/mri_coreg.cpp`
- **Original author:** Douglas N. Greve
- **Version string in source:** `$Id: mri_coreg.c,v 1.27 2016/04/30`

## Purpose and Context

Within the FreeSurfer functional analysis pipeline, EPI or other functional volumes must be registered to the anatomical T1 for surface projection and parcellation-based analysis. `mri_coreg` performs this registration by optimizing NMI over the rigid/affine parameter space. Its key features are:
- Intensity dithering to break histogram artifacts
- Multi-scale optimization (brute-force coarse search followed by Powell fine search)
- Registration by alignment of volume centers as initialization (`--cras0`)
- Output as LTA (not legacy `.dat`)

## Inputs

- **`--mov movvol`**: moving (source) volume to register
- **`--ref refvol`** (or default anatomical `orig.mgz`): reference (fixed) volume
- **Registration masks**: `--refmask`, `--movmask` (optional binary masks applied before optimization)

## Outputs

- **`--outreg outreg.lta`**: output LTA registration file (required)
- **`--regdat regdat.dat`**: also write in legacy `.dat` format (optional)
- **`--outparamfile`**: write parameter vector (tx, ty, tz, rx, ry, rz, ...) to file
- **`--outcostfile`**: write cost function value to file
- **`--movout outfile`**: write the transformed moving volume to file

## Mathematical Foundations

**Cost function:** Normalized Mutual Information (NMI)

$$
\text{NMI}(f, g) = \frac{H(f) + H(g)}{H(f, g)}
$$

where $H$ is Shannon entropy. The joint histogram is smoothed with a Gaussian (`histfwhm = 7` bins by default).

**Optimization:** Powell's conjugate-direction method with:
- Brute-force coarse search over ±`BFLim` degrees (default ±30°) for rotations
- Multi-scale approach: optimization at multiple resolutions (`sep` voxel spacings)
- Default DOF: 6 (3 translations, 3 rotations)
- Translation initialized by aligning centers of mass (`--cras0`, enabled by default)

**Intensity preprocessing:**
- Volumes are rescaled to unsigned char (0–255) using a saturation percentile (`SatPct` = 99.99%)
- Coordinate dithering (`DoCoordDither = 1`) and intensity dithering (`DoIntensityDither = 1`) are applied to reduce histogram discretization artifacts

**Transform representation:**
$$
T = \text{TranformAffineParams2Matrix}(\mathbf{p})
$$
where $\mathbf{p}$ is the 12-element parameter vector (tx, ty, tz, rx, ry, rz, sx, sy, sz, shxy, shxz, shyz) with scale parameters initialized to 1.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov file` | file | required | Moving volume |
| `--ref file` | file | `orig.mgz` from subject | Reference volume |
| `--refmask file` | file | none | Binary mask for reference volume |
| `--movmask file` | file | none | Binary mask for moving volume |
| `--outreg file` | LTA path | required | Output LTA registration file |
| `--regdat file` | .dat path | none | Also write output in legacy .dat format |
| `--subject name` | string | none | Subject name for LTA header |
| `--dof N` | int | 6 | Degrees of freedom (6=rigid, 9=rigid+scale, 12=full affine) |
| `--sep N [N ...]` | int list | auto | Voxel separation(s) for multi-scale optimization |
| `--cras0` | — | on | Initialize translation to align volume centers |
| `--no-cras0` | — | off | Disable center alignment initialization |
| `--align-centroids` | — | off | Initialize using intensity centroids (not geometric centers) |
| `--bf` | — | on | Brute-force initial search over rotations |
| `--no-bf` | — | off | Disable brute-force search |
| `--bflim deg` | float | 30 | Brute-force rotation limit (±degrees) |
| `--bfnsamp N` | int | 30 | Number of samples for brute-force search |
| `--nitersmax N` | int | 4 | Max Powell optimization iterations |
| `--ftol tol` | float | 1e-7 | Functional tolerance for Powell |
| `--linmintol tol` | float | 0.001 | Line minimization tolerance |
| `--sat pct` | float | 99.99 | Saturation percentile for intensity rescaling |
| `--no-dither-coord` | — | off | Disable coordinate dithering |
| `--no-dither-intensity` | — | off | Disable intensity dithering |
| `--smooth-ref fwhm` | float | 0 | Smooth reference before registration |
| `--fwhmc/r/s fwhm` | float | — | Per-axis smoothing FWHMs |
| `--refconf` | — | off | Conform reference before registration |
| `--mov-oob flag` | int | 0 | Out-of-bounds handling for moving volume |
| `--optschema N` | int | 1 | Optimization parameter schema |
| `--seed N` | int | 53 | Random number seed |
| `--movout file` | file | none | Write transformed moving volume |
| `--init-reg-save file` | file | none | Save initial registration |
| `--init-reg-save-only` | — | off | Save initial reg and exit |
| `--log-cost file` | file | none | Log cost function per iteration |
| `--outparam file` | file | none | Write parameter vector |
| `--outcost file` | file | none | Write final cost |

## Configuration Interactions

- `--cras0` (default) initializes the translation parameters; `--align-centroids` overrides it with intensity-centroid alignment. These are mutually exclusive.
- `--no-bf` skips the coarse rotation search; useful when a reasonable starting transform is already known.
- `--dof 6` fixes scale parameters to 1.0; `--dof 9` allows isotropic scale; `--dof 12` allows full affine.
- `--refmask` and `--movmask` zero out masked regions of the respective volumes before computing the joint histogram.
- `--smooth-ref` applies smoothing before building the histogram; this can help when the reference has very sharp edges.
- `--refconf` conforms the reference to 1mm isotropic without rescaling; note this may fail or produce artifacts for non-T1 references.
- `--init-reg-save-only` exits after computing and saving the initial (pre-optimization) registration, useful for inspecting initialization quality.

## Typical Use Cases

Register EPI to T1 with default settings (6 DOF):
```bash
mri_coreg \
  --mov func.nii.gz \
  --ref $SUBJECTS_DIR/subject/mri/orig.mgz \
  --outreg func2anat.lta \
  --subject subject
```

Register with a brain mask to exclude skull:
```bash
mri_coreg \
  --mov func.nii.gz \
  --ref $SUBJECTS_DIR/subject/mri/orig.mgz \
  --refmask $SUBJECTS_DIR/subject/mri/brainmask.mgz \
  --outreg func2anat.lta
```

9-DOF affine registration:
```bash
mri_coreg --mov mov.mgz --ref ref.mgz --dof 9 --outreg out.lta
```

## Pipeline Context

Not called by [[recon-all]] for the standard structural pipeline. Used in:
- Functional MRI preprocessing: register EPI to T1
- Cross-modality registration (e.g., T2 or FLAIR to T1)
- Longitudinal registration before volumetric analysis

Downstream tools that use the output LTA:
- `mri_vol2surf` / [[mri_vol2surf]]: project functional data onto the surface
- [[mri_compute_volume_fractions]]: compute PV fractions in functional space

## Gotchas and Caveats

> [!gotcha] Not a BBR tool despite documentation suggestions
> Some FreeSurfer documentation refers to `mri_coreg` in the context of BBR (boundary-based registration). The source code uses NMI, not BBR cost. For BBR, use `bbregister` instead.

> [!gotcha] Default reference is `orig.mgz`
> If `--ref` is not specified and `$SUBJECTS_DIR/subject/mri/orig.mgz` cannot be found, the tool will fail. Always specify `--ref` explicitly unless running in a subject context.

> [!gotcha] Output LTA type is vox-to-vox by default
> The output LTA type is `LINEAR_VOX_TO_VOX` by default. Some downstream tools expect `LINEAR_RAS_TO_RAS`. Convert with `lta_convert` if needed.

> [!gotcha] Random seed affects results
> The brute-force search uses a random seed (default 53). Results are deterministic given the same seed, but changing `--seed` can produce different registrations. Use `--seed` explicitly for reproducible pipelines.

## Related Tools

- [[mri_em_register]] — atlas-based registration using GCA
- `bbregister` — boundary-based registration (more accurate for EPI-to-T1)

## Confidence and Gaps

Confidence is **high**. Source thoroughly read. Cost function internals partially inferred from variable names and the `NMICost()` function signature.

> [!gap] NMICost implementation
> The `NMICost()` function is declared but its definition was not read. The joint histogram smoothing parameters (`histfwhm = [7, 7]`) were observed in initialization but their effect on NMI computation is inferred.
