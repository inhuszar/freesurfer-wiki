---
title: "mri_gradunwarp"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_gradunwarp/mri_gradunwarp.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Siemens gradient coefficient file format details"
  - "m3z output format compatibility with mri_morph tools"
  - "sinchw variable is referenced internally but --sinchw flag is commented out"
tags:
  - gradient-unwarping
  - distortion-correction
  - scanner
  - preprocessing
---

# mri_gradunwarp

## Summary

`mri_gradunwarp` corrects gradient non-linearity distortions in MRI volumes and surfaces. It reads a Siemens gradient coefficient file describing the spherical harmonic expansion of the gradient field non-linearities, computes a displacement field (stored as an m3z/GCAM transform), and applies it to the input volume or surface to produce a corrected (unwarped) output. The correction can be applied on-the-fly or saved as a reusable transform table.

## Source Information

- **Source language:** C++
- **Source file:** `mri_gradunwarp/mri_gradunwarp.cpp`
- **Dependencies:** `GradUnwarp.h` (gradient unwarping library), `mriBSpline.h`

## Purpose and Context

MRI scanners with imperfect gradient coils produce spatially distorted images because the actual gradient fields deviate from the ideal linear ramp. For neuroimaging, uncorrected gradient non-linearity distortion causes:
- Geometric inaccuracies in morphometric measurements (cortical thickness, volume)
- Registration errors when combining data from different scanners or field strengths
- Bias in longitudinal studies if subjects are scanned on different scanners

`mri_gradunwarp` corrects this by:
1. Reading scanner-specific gradient coil coefficients (provided by the scanner manufacturer as a `.grad` or `.coef` file)
2. Computing per-voxel 3D displacement vectors using a spherical harmonic expansion
3. Interpolating the input image at the displaced positions to produce the corrected output

The tool can also save the displacement field as an m3z (GCAM) transform for later reuse with other tools.

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Gradient coefficient file | `--gradcoeff` | Siemens spherical harmonic gradient coefficient file |
| Input volume or surface | `--i` | Volume (MGH/NII) or FreeSurfer surface to unwarp |
| Precomputed transform table | `--load_transtbl` | Load pre-saved displacement field (alternative to `--gradcoeff`) |

## Outputs

| Output | Flag | Description |
|--------|------|-------------|
| Unwarped volume or surface | `--o` | Corrected output file (same format as input) |
| Transform table | `--out_transtbl` / `--gcam` | Displacement field as m3z/GCAM file for reuse |

## Mathematical Foundations

The gradient field non-linearity is modeled as a spherical harmonic expansion. The ideal gradient $G_\text{ideal}(x,y,z)$ differs from the actual gradient $G_\text{actual}(x,y,z)$ by a displacement $\Delta(x,y,z)$:

$$
\mathbf{r}_\text{unwarped} = \mathbf{r}_\text{warped} + \boldsymbol{\Delta}(\mathbf{r}_\text{warped})
$$

where $\boldsymbol{\Delta}$ is computed from the Siemens Legendre normalization factors applied to the spherical harmonic coefficients:

$$
\Delta_x = \sum_{n,m} a_{nm} \cdot L_{nm}(\mathbf{r}) \cdot \cos(m\phi) \cdot P_n^m(\cos\theta)
$$

and similarly for $\Delta_y$, $\Delta_z$. Here $L_{nm}$ are the Legendre normalization factors, $P_n^m$ are associated Legendre polynomials, and $(r, \theta, \phi)$ are spherical coordinates.

After computing the displacement field, the corrected image is obtained by trilinear (or sinc) interpolation of the input at the unwarped positions.

## Configuration Options

Flag list verified against `mri_gradunwarp/mri_gradunwarp.cpp`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--gradcoeff` | `<file>` | — | Siemens gradient coefficient file |
| `--i` | `<file>` | — | Input volume or surface to unwarp |
| `--o` | `<file>` | — | Output corrected volume or surface |
| `--load_transtbl` | `<file>` | — | Load precomputed transform table (instead of `--gradcoeff`) |
| `--out_transtbl`<br>`--gcam` | `<file>` | — | Save displacement field as m3z/GCAM |
| `--inv-gcam` | `<file>` | — | Load an inverse GCAM transform |
| `--save_transtbl_only`<br>`--gcam-only` | — | off | Create the m3z transform only; do not apply to input volume; replaces incorrect --m3zonly |
| `--interp` | `<method>` | `trilinear` | Interpolation method: `trilinear` or `sinc` |
| `--threads`<br>`--nthreads` | `<N>` | 1 | Number of OpenMP threads |
| `--ras` | `<x> <y> <z>` | — | (Debug) Evaluate displacement at given RAS coordinate |
| `--crs` | `<c> <r> <s>` | — | (Debug) Evaluate displacement at given voxel CRS index |
| `--checkopts` | — | off | Check options and exit |
| `--nocheckopts` | — | off | Do not exit after checking options |
| `--help` | — | off | Print help |
| `--version` | — | off | Print version |

> [!gap] `--sinchw` is commented out
> The `sinchw` variable exists in the source and is referenced in the sinc interpolation calls, but the command-line parsing block for `--sinchw` is commented out in the source (`/* ... */`). Sinc half-width cannot be set from the command line; it defaults to 0. Do not document `--sinchw` as a usable flag.

> [!gap] `--gradfile` not a real flag
> The internal variable is named `gradfile` in the source, but the command-line flag is --gradcoeff. There is no --gradfile option.

## Configuration Interactions

- `--gradcoeff` and `--load_transtbl` are mutually exclusive; one must be specified.
- `--save_transtbl_only` (alias `--gcam-only`) can be combined with `--gradcoeff` to create a reusable displacement field without applying it to any input volume. The old flag name `--m3zonly` does **not** exist in the source.
- `--out_transtbl` / `--gcam` saves the displacement table regardless of whether a volume was unwarped; useful for generating the transform once and reusing it on multiple volumes.
- If `GRADUNWARP_USE_GRADFILE` environment variable is set, the tool evaluates displacements directly from the gradient file at each voxel rather than using the precomputed table (slower but useful for debugging).
- `--nthreads` enables OpenMP parallelism for the displacement field computation.

## Typical Use Cases

**Unwarp a volume using scanner gradient coefficients:**
```bash
mri_gradunwarp \
  --gradcoeff coeff_AC84.grad \
  --i orig.mgz \
  --o orig_unwarped.mgz
```

**Save displacement field and unwarp in one step:**
```bash
mri_gradunwarp \
  --gradcoeff coeff_AC84.grad \
  --i orig.mgz \
  --o orig_unwarped.mgz \
  --out_transtbl unwarping.m3z
```

**Apply precomputed transform to multiple volumes:**
```bash
# First, create the transform (--save_transtbl_only replaces the old --m3zonly):
mri_gradunwarp --gradcoeff coeff.grad --i orig.mgz --save_transtbl_only \
  --out_transtbl unwarping.m3z

# Then apply to each volume:
mri_gradunwarp --load_transtbl unwarping.m3z --i T2.mgz --o T2_unwarped.mgz
mri_gradunwarp --load_transtbl unwarping.m3z --i FLAIR.mgz --o FLAIR_unwarped.mgz
```

**Unwarp a FreeSurfer surface:**
```bash
mri_gradunwarp \
  --gradcoeff coeff.grad \
  --i lh.white \
  --o lh.white.unwarped
```

## Pipeline Context

`mri_gradunwarp` is not part of standard `recon-all`. It should be applied before `recon-all` begins, or as a preprocessing step when gradient non-linearity correction is needed:

- **Upstream:** Raw scanner output (DICOM → NIfTI/MGZ via [[wiki/tools/mri_convert|mri_convert]])
- **Downstream:** `recon-all`, registration tools, morphometric analysis

When applied before `recon-all`, the unwarped volume should be used as the input to `recon-all -i`.

## Gotchas and Caveats

> [!gotcha] Scanner-specific coefficient files required
> The gradient coefficient file is scanner-specific and must be obtained from the scanner manufacturer or MRI physicist. It is not distributed with FreeSurfer. Applying the wrong coefficient file to an image will produce incorrect results.

> [!gotcha] Surface unwarping modifies vertex coordinates
> When the input is a FreeSurfer surface, the tool modifies the vertex RAS coordinates directly. The modified surface is written to the output file. This changes the [[coordinate-systems]] of the surface.

> [!gotcha] m3z and GCAM formats
> The `--out_transtbl` / `--gcam` output is an m3z file (a GCAM morph field). This can be loaded by `mri_vol2vol` and other tools that accept morphological transforms, but the format requires careful handling.

> [!gap] Siemens coefficient file format
> The exact format of the Siemens gradient coefficient file is not documented in the source. It appears to be a Siemens-proprietary text format parsed by `GradUnwarp::read_siemens_coeff()`.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — initial format conversion from DICOM
- [[coordinate-systems]] — coordinate system implications of unwarping

## Confidence and Gaps

**Confident (from source):** Full flag list verified from source. Correct flag names `--save_transtbl_only` / `--gcam-only` (not --m3zonly), `--inv-gcam` existence, `--sinchw` commented out (not usable), spherical harmonic model, Legendre normalization, trilinear/sinc interpolation, m3z output, volume and surface support, OpenMP threading.

**Uncertain:** Exact gradient coefficient file format; numerical accuracy of the spherical harmonic expansion for high-order coefficients; behavior when `GRADUNWARP_USE_GRADFILE` env var is set.
