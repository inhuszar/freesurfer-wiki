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
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "NMI cost function internals (NMICost) not fully characterized here"
  - "Powell optimizer parameter tuning documented only at defaults"
  - "optschema values 2-5 and their exact parameter mappings need deeper study"
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

The program also embeds several standalone utility subcommands (e.g., `--mat2par`, `--rms`, `--landmarks`) that operate on existing LTAs without running registration; see the **Utility Subcommands** section.

## Inputs

- **`--mov file`**: moving (source) volume to register
- **`--ref file`** (also `--targ`): reference (fixed) volume; defaults to `orig.mgz` from subject if `--s` is given
- **`--ref-mask file`**, **`--mov-mask file`** (optional): binary masks applied before optimization
- **`--init-reg file`**: initialize from an existing LTA instead of using --cras0

## Outputs

- **`--reg file`** (also `--lta`): output LTA registration file (required)
- **`--regdat file`**: also write in legacy `.dat` format
- **`--params file`**: write optimized parameter vector to file
- **`--final-cost file`**: write final cost function value to file
- **`--movout file`**: write the preprocessed moving volume to file

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

Options are grouped by function. All flags use `--` prefix and are case-insensitive.

### Required

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov` | file | — | Moving (source) volume |
| `--ref`<br>`--targ` | file | — | Reference (fixed) volume |
| `--reg`<br>`--lta` | file | — | Output LTA registration file |

### Subject / SUBJECTS_DIR

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s` | subject | — | Subject name; also automatically sets `--ref-mask aparc+aseg.mgz` |
| `--sd`<br>`-SDIR` | dir | `$SUBJECTS_DIR` | Override `$SUBJECTS_DIR` |

> [!gotcha] `--s` sets a reference mask automatically
> Passing --s subject implies `--ref-mask aparc+aseg.mgz`. To disable this masking while still specifying a subject (e.g., for cross-modality registration), add `--no-ref-mask` after `--s`.

### Degrees of Freedom

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--dof` | int | 6 | DOF for standard optimization schema (6, 9, or 12) |
| `--6` | — | — | Shortcut for `--dof 6` (rigid: 3 trans + 3 rot) |
| `--9` | — | — | Shortcut for `--dof 9` (rigid + isotropic scale) |
| `--12` | — | — | Shortcut for `--dof 12` (full affine) |
| `--zscale` | — | — | 7-DOF: xyz translation, xyz rotation, z-axis scale only |
| `--xztrans+yrot`<br>`--2dz` | — | — | 3-DOF schema for 2D images: shifts in x/z and rotation about y (no scale) |
| `--xytrans+zrot` | — | — | 3-DOF schema for 2D images: shifts in x/y and rotation about z (no scale) |
| `--xytrans+zrot+xyscale+xyshear` | — | — | 6-DOF schema for 2D images: x/y translation, z rotation, x/y scale, x/y shear |

### Output Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--regdat` | .dat path | none | Also write registration in legacy `.dat` format |
| `--params` | file | none | Write optimized parameter vector to file |
| `--final-cost` | file | none | Write final cost function value to file |
| `--log-cost` | file | none | Log cost function value at each Powell iteration |
| `--movout` | file | none | Write preprocessed moving volume to file (after rescaling and dithering) |
| `--init-reg-save` | file | none | Save initial (pre-optimization) registration to LTA file |
| `--init-reg-save-only` | file | none | Save initial registration and exit without optimizing |
| `--ras2ras` | — | off | Write output LTA as `LINEAR_RAS_TO_RAS` (default is `LINEAR_VOX_TO_VOX`) |

### Masking

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--ref-mask` | file | none (or `aparc+aseg.mgz` if `--s` given) | Binary mask applied to reference volume |
| `--no-ref-mask` | — | — | Clear reference mask (use after `--s` to undo automatic masking) |
| `--mov-mask` | file | none | Binary mask applied to moving volume |

### Initialization

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--cras0` | — | on | Initialize translation to align volume geometric centers (default) |
| `--no-cras0`<br>`--regheader` | — | off | Disable center alignment; start from identity translation |
| `--centroid` | — | off | Initialize by aligning intensity centroids (not geometric centers); disables `--cras0` |
| `--trans` | Tx Ty Tz | 0 0 0 | Explicit initial translation in mm (implies `--no-cras0`) |
| `--rot` | Rx Ry Rz | 0 0 0 | Explicit initial rotation in degrees |
| `--scale` | Sx Sy Sz | 1 1 1 | Explicit initial scale factors |
| `--shear` | Hxy Hxz Hyz | 0 0 0 | Explicit initial shear parameters |
| `--init-reg` | file | none | Initialize from existing LTA (implies `--no-cras0`) |

### Optimization

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sep` | N | auto | Voxel separation for one optimization scale; repeat flag for multi-scale (e.g., `--sep 4 --sep 2`) |
| `--bf` | — | on | Enable brute-force rotation search |
| `--no-bf` | — | — | Disable brute-force rotation search |
| `--bf-lim` | float | 30 | Brute-force search range in ±degrees; also enables `--bf` |
| `--bf-nsamp` | int | 30 | Number of angular samples in brute-force search; also enables `--bf` |
| `--nitersmax` | int | 4 | Maximum Powell outer iterations |
| `--ftol` | float | 1e-7 | Functional (cost) tolerance for Powell convergence |
| `--linmintol` | float | 0.001 | Line minimization tolerance for Powell |

### Preprocessing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sat` | float | 99.99 | Percentile for intensity saturation/rescaling to uchar |
| `--conf-ref` | — | off | Conform reference to 1mm isotropic without rescaling (intended for GCA use) |
| `--ref-fwhm` | float | none | Apply isotropic Gaussian smoothing to reference (FWHM in mm); disables adaptive smoothing |
| `--no-smooth` | — | off | Disable adaptive smoothing of both reference and moving volumes |
| `--no-coord-dither` | — | off | Disable coordinate dithering |
| `--no-intensity-dither` | — | off | Disable intensity dithering |
| `--no-dither` | — | off | Disable both coordinate and intensity dithering |
| `--mov-idither` | file | none | Use an external intensity dither volume for the moving image instead of computing one |
| `--mov-oob` | — | off | Count out-of-bounds moving voxels as 0 in cost computation |
| `--no-mov-oob` | — | on | Do not count out-of-bounds moving voxels (default) |
| `--seed` | int | 53 | Random seed for dithering (set explicitly for reproducibility) |

### Diagnostics / Debug

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--init-cost-only` | file | none | Compute initial cost only, write to file, and exit without optimizing |
| `--rusage` | file | none | Write resource usage (CPU/memory) to file |
| `--threads`<br>`--nthreads` | int | — | Number of OpenMP threads |
| `--debug` | — | off | Enable verbose debug output |
| `--checkopts` | — | off | Parse and validate options but do not run |
| `--diag` | int | — | Set global diagnostic level (`Gdiag_no`) |
| `--diag-show` | — | — | Set diagnostic show flag |
| `--diag-verbose` | — | — | Set diagnostic verbose flag |

## Utility Subcommands

These flags cause the program to perform a standalone operation and exit immediately, bypassing registration. They are useful LTA manipulation utilities embedded in the binary.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mat2par` | reg.lta | — | Extract 12 affine parameters from an LTA (converts to RAS-to-RAS first); prints to stdout |
| `--mat2par-vox` | reg.lta | — | Same as `--mat2par` but converts to VOX-to-VOX first |
| `--mat2rot` | src.lta dst.lta | — | Strip an LTA down to its rotation component; write to `dst.lta` |
| `--par2mat` | p1…p12 src targ out.lta | — | Convert 12 affine parameters + source/target volumes into an LTA |
| `--lrrev` | src.lta dst.lta | — | Approximate the registration you would get if the moving image pixels were left-right reversed |
| `--landmarks` | sxyz txyz coords mov targ outlta [xformedpts] | — | Compute registration from landmark correspondences; `coords` is `RAS`, `VOX`, or `TKR` |
| `--landmarks-2d` | same as `--landmarks` | — | Same, but extracts 2D (6-DOF) parameters into the 4×4 matrix |
| `--rms` | radius outfile reg1.lta reg2.lta | — | Compute RMS difference between two registrations using Jenkinson's method; `radius` ≈ 50 mm; write to `outfile` (or pass `nofile` to suppress file output) |

## Configuration Interactions

- `--cras0` (default) initializes translation parameters to align geometric centers. `--centroid` overrides it with intensity-centroid alignment. These are mutually exclusive. `--no-cras0` / `--regheader` disables both. `--trans`, `--init-reg`, and `--par2mat` all imply `--no-cras0`.
- `--s subject` silently sets `--ref-mask aparc+aseg.mgz`. Place `--no-ref-mask` after `--s` to undo this when cross-modal masking is undesirable.
- `--no-bf` skips the coarse rotation search; useful when a reasonable starting transform is already known (e.g., via `--init-reg`).
- `--dof 6` fixes scale and shear parameters; `--dof 9` allows isotropic scale; `--dof 12` allows full affine. The specialized schema flags (`--zscale`, `--xztrans+yrot`, etc.) set both `dof` and `optschema` together — do not combine them with `--dof`.
- `--ref-mask` and `--mov-mask` zero masked regions before building the joint histogram, effectively excluding those voxels from cost computation.
- `--ref-fwhm` applies smoothing and also sets `DoSmoothing=0` (disabling the adaptive resolution-based smoothing). It is independent from `--no-smooth`.
- `--conf-ref` conforms the reference without intensity rescaling. It can cause issues with non-T1 references.
- `--init-reg-save-only file` requires a filename argument; it saves the initial registration and exits before any optimization runs.
- `--bf-lim` and `--bf-nsamp` both implicitly enable `--bf`.
- `--sep` is repeatable; call it once per desired scale (e.g., `--sep 4 --sep 2` runs optimization first at 4-voxel then 2-voxel spacing). The brute-force search runs only at the coarsest scale (first `--sep` iteration).

## Typical Use Cases

Register EPI to T1 using subject context (applies aparc+aseg mask automatically):
```bash
mri_coreg \
  --s subject \
  --mov func.nii.gz \
  --reg func2anat.lta
```

Explicit reference, no masking, 6 DOF:
```bash
mri_coreg \
  --mov func.nii.gz \
  --ref $SUBJECTS_DIR/subject/mri/orig.mgz \
  --reg func2anat.lta
```

Cross-modal with brain mask (exclude skull from cost):
```bash
mri_coreg \
  --mov func.nii.gz \
  --ref $SUBJECTS_DIR/subject/mri/orig.mgz \
  --ref-mask $SUBJECTS_DIR/subject/mri/brainmask.mgz \
  --reg func2anat.lta
```

9-DOF affine registration, output in RAS-to-RAS format:
```bash
mri_coreg --mov mov.mgz --ref ref.mgz --dof 9 --ras2ras --reg out.lta
```

Initialize from a prior registration (skip cras0, skip brute-force):
```bash
mri_coreg \
  --mov func.nii.gz \
  --ref orig.mgz \
  --init-reg prior.lta \
  --no-bf \
  --reg refined.lta
```

Extract affine parameters from an existing LTA:
```bash
mri_coreg --mat2par func2anat.lta
```

Compute RMS difference between two registrations (radius ≈ 50 mm):
```bash
mri_coreg --rms 50 rms.txt reg1.lta reg2.lta
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]] for the standard structural pipeline. Used in:
- Functional MRI preprocessing: register EPI to T1
- Cross-modality registration (e.g., T2 or FLAIR to T1)
- Longitudinal registration before volumetric analysis

Downstream tools that use the output LTA:
- `mri_vol2surf` / [[mri_vol2surf]]: project functional data onto the surface
- [[mri_compute_volume_fractions]]: compute PV fractions in functional space

## Gotchas and Caveats

> [!gotcha] Not a BBR tool despite documentation suggestions
> Some FreeSurfer documentation refers to `mri_coreg` in the context of BBR (boundary-based registration). The source code uses NMI, not BBR cost. For BBR, use `bbregister` instead.

> [!gotcha] Default reference is `orig.mgz` only when `--s` is given
> If --ref is not specified and --s is not given, the tool will error. Always specify `--ref` or `--s` explicitly.

> [!gotcha] Output LTA type is `LINEAR_VOX_TO_VOX` by default
> The output LTA type is `LINEAR_VOX_TO_VOX`. Some downstream tools expect `LINEAR_RAS_TO_RAS`. Use `--ras2ras` to change, or convert afterwards with `lta_convert`.

> [!gotcha] Random seed affects results
> The brute-force search uses a random seed (default 53). Results are deterministic given the same seed, but changing `--seed` can produce different registrations. Use `--seed` explicitly for reproducible pipelines.

> [!gotcha] `--s` silently enables a reference mask
> See "Configuration Interactions" above. This is intentional but can cause unexpected failures for non-T1 references where `aparc+aseg.mgz` does not match the FOV.

> [!gotcha] `--sep` takes one value per invocation
> To run multi-scale optimization, repeat the flag: `--sep 4 --sep 2`. Passing a space-separated list in a single `--sep` call will fail.

> [!gotcha] `--init-reg-save-only` requires a filename argument
> Unlike boolean flags, `--init-reg-save-only` takes a filename (the path to write the LTA). It is not a standalone toggle.

## Related Tools

- [[mri_em_register]] — atlas-based registration using GCA
- `bbregister` — boundary-based registration (more accurate for EPI-to-T1)
- [[fsr-coreg]] — the FreeSurfer multimodal coregistration driver (samseg /
  longitudinal preprocessing), which calls `mri_coreg` to align each additional
  input mode to the reference before joint analysis.

## Confidence and Gaps

Confidence is **high**. Full `parse_commandline()` function read. Cost function internals partially inferred from variable names and the `NMICost()` function signature.

> [!gap] NMICost implementation
> The `NMICost()` function is declared but its definition was not read. The joint histogram smoothing parameters (`histfwhm = [7, 7]`) were observed in initialization but their effect on NMI computation is inferred.

> [!gap] optschema values 2–5
> The specialized DOF modes (`--zscale`, `--xztrans+yrot`, etc.) set `optschema` to values 2–5 and `dof` to specific counts, but the exact mapping from parameter indices to transform degrees of freedom for each schema was not traced in `COREGoptSchema2MatrixPar()`.
