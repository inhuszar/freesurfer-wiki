---
title: "mris_niters2fwhm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_niters2fwhm/mris_niters2fwhm.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The icosahedron order used internally (ReadIcoByOrder 7) may not match real subject surfaces"
tags:
  - surface
  - smoothing
  - FWHM
  - utility
---

# mris_niters2fwhm

## Summary

`mris_niters2fwhm` converts the number of surface smoothing iterations (as used by [[mris_smooth]]) to an equivalent Gaussian full-width at half maximum (FWHM) in millimetres. This is a utility tool for smoothing parameter specification: when a FreeSurfer analysis specifies smoothing by FWHM, this tool determines the corresponding iteration count, or vice versa.

## Source Information

- **Language:** C++
- **Source file:** `mris_niters2fwhm/mris_niters2fwhm.cpp`
- **Key implementation note:** Uses a fixed icosahedron of order 7 as the reference surface (not the subject's actual surface), which is a deliberate approximation for efficiency.

## Purpose and Context

FreeSurfer surface smoothing tools (e.g., [[mris_smooth]], `mri_surf2surf`) accept a number of averaging iterations rather than a FWHM. The relationship between iterations and FWHM depends on the local surface geometry (inter-vertex distances). `mris_niters2fwhm` estimates this relationship by simulating a delta-function smoothed across a standard icosahedron, then measuring the resulting spatial extent.

The tool is used in smoothing parameter planning:
- Group analyses typically specify smoothing by FWHM (e.g., 10 mm, 15 mm, 20 mm)
- Subject-specific processing uses iterations
- This tool bridges the two representations

## Inputs

- `--s subject` — subject name (reads surface from `SUBJECTS_DIR/$subject/surf/$hemi.$surfname`)
- `--hemi hemi` — hemisphere (`lh` or `rh`)
- `--surf surfname` — surface name (default: `white`)
- `--niters N` or `--fwhm F` — either iterations or FWHM to convert

## Outputs

- Printed to stdout: the converted FWHM (if given niters) or the converted niters (if given fwhm)

## Mathematical Foundations

Surface smoothing by nearest-neighbour averaging is equivalent to discrete convolution with a kernel that approaches a Gaussian as the number of iterations grows. For $k$ iterations on a surface with mean inter-vertex distance $\bar{d}$:

$$
\text{FWHM} \approx 2\sqrt{2\ln 2} \cdot \sigma
$$

where $\sigma$ is estimated from the variance of the smoothed delta function:

$$
\sigma^2 \approx k \cdot \bar{d}^2 / 4
$$

The code implements this empirically rather than analytically. It places a delta function at the centre of the icosahedron, smooths it for `nitersmax` iterations (default 100), and at each step computes the actual spatial FWHM by measuring the VRF (variance reduction factor) of the smoothed field.

The key function `MRISmeanInterVertexDist` computes the average inter-vertex spacing, and `MRISgaussianSmooth2` performs the Gaussian smoothing used to estimate the relationship.

## Configuration Options

| Flag | Description |
|---|---|
| `--s subject` | Subject name |
| `--hemi hemi` | Hemisphere (`lh` or `rh`) |
| `--surf surfname` | Surface name (default `white`) |
| `--niters N` | Convert N iterations to FWHM |
| `--fwhm F` | Convert F mm FWHM to iterations |
| `--nitersmax N` | Maximum iterations to test (default 100) |
| `--dof N` | Degrees of freedom for simulation (default 100) |
| `--debug` | Enable debug output |

## Configuration Interactions

- `--niters` and `--fwhm` are mutually exclusive (provide one, get the other).
- The tool uses a fixed `ReadIcoByOrder(7, 50)` icosahedron internally regardless of the `--s` and `--hemi` specification. This means the FWHM estimate is based on icosahedron geometry, not the actual subject surface.

> [!gotcha] Icosahedron approximation
> The code contains the line `surf = ReadIcoByOrder(7,50)` and ignores the subject surface path despite constructing it. The FWHM estimate is therefore based on the standard icosahedral mesh, which has different inter-vertex distances from individual subject surfaces. For most purposes this is adequate, but for high-resolution or low-resolution surfaces the mapping may be inaccurate.

## Typical Use Cases

```bash
# Convert 10 iterations to FWHM
mris_niters2fwhm --s bert --hemi lh --niters 10

# Convert 10 mm FWHM to iterations
mris_niters2fwhm --s bert --hemi lh --fwhm 10
```

## Pipeline Context

Not part of `recon-all`. Used as a helper in group analysis scripts where smoothing must be specified consistently between tools. Commonly called before `mri_surf2surf` or [[mris_smooth]] when planning analysis parameters.

## Gotchas and Caveats

> [!gotcha] Does not use subject surface
> Despite accepting `--s` and `--hemi`, the tool constructs the subject surface path but then loads a standard icosahedron. The actual surface geometry is not used in the FWHM computation.

> [!gotcha] nitersmax cap
> The default maximum of 100 iterations may not cover large FWHM values on coarse surfaces. Increase `--nitersmax` when working with surfaces that have sparse vertex density.

## Related Tools

- [[mris_smooth]] — the surface smoothing tool whose iteration count this tool converts
- `mri_surf2surf` — uses FWHM specification which must be converted to iterations

## Confidence and Gaps

**Confident (from code):** Uses fixed ico-7 regardless of subject argument; simulates delta-function smoothing; `MRISmeanInterVertexDist` and `MRISgaussianSmooth2` used; default `nitersmax=100`, `dof=100`.

**Uncertain:** Whether the `--fwhm → niters` direction is implemented (inversion of the simulation), or just the `niters → fwhm` direction.

> [!gap] The inverse direction (fwhm → niters) implementation was not confirmed from source inspection.
