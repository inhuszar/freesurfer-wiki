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
last_agent_update: 2026-04-21
gaps:
  - "The icosahedron order used internally (ReadIcoByOrder 7) may not match real subject surfaces"
  - "The --fwhm-to-niters direction is not implemented; this tool only converts niters → FWHM"
tags:
  - surface
  - smoothing
  - FWHM
  - utility
---

# mris_niters2fwhm

## Summary

`mris_niters2fwhm` converts the number of surface smoothing iterations (as used by [[mris_smooth]]) to an equivalent Gaussian full-width at half maximum (FWHM) in millimetres. This is a utility for smoothing parameter planning: given an iteration count, it estimates the resulting FWHM. The inverse direction (FWHM to iterations) is not implemented in this tool.

## Source Information

- **Language:** C++
- **Source file:** `mris_niters2fwhm/mris_niters2fwhm.cpp`
- **Key implementation note:** Uses a fixed icosahedron of order 7 as the reference surface (not the subject's actual surface), which is a deliberate approximation for efficiency.

## Purpose and Context

FreeSurfer surface smoothing tools (e.g., [[mris_smooth]], `mri_surf2surf`) accept a number of averaging iterations rather than a FWHM. The relationship between iterations and FWHM depends on the local surface geometry (inter-vertex distances). `mris_niters2fwhm` estimates this relationship by simulating a delta-function smoothed across a standard icosahedron, then measuring the resulting spatial extent.

The tool is used in smoothing parameter planning:
- Group analyses typically specify smoothing by FWHM (e.g., 10 mm, 15 mm, 20 mm)
- Subject-specific processing uses iterations
- This tool converts from iterations to the equivalent FWHM

> [!gotcha] Niters-to-FWHM only
> This tool converts iteration counts to FWHM values. It does not implement the inverse (FWHM → iterations). There is no `--fwhm` flag in the source.

## Inputs

- `--s subject` — subject name (surface path is constructed but a standard icosahedron is loaded instead; see gotcha below)
- `--h hemi` — hemisphere (`lh` or `rh`)
- `--surf surfname` — surface name (default: `white`)
- `--niters N` — number of smoothing iterations to convert to FWHM

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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s` | `subject` | — | Subject name (used to build surface path, but a standard icosahedron is used internally) |
| `--h` | `hemi` | — | Hemisphere (`lh` or `rh`) |
| `--surf` | `surfname` | `white` | Surface name |
| `--niters` | `N` | 100 | Number of smoothing iterations to simulate (sets `nitersmax`) |
| `--dof` | `N` | 100 | Degrees of freedom for simulation |
| `--debug` | — | off | Enable debug output |

## Configuration Interactions

- `--niters` sets the number of iterations to simulate; FWHM is printed to stdout.
- The tool uses a fixed `ReadIcoByOrder(7, 50)` icosahedron internally regardless of the `--s` and `--h` specification. This means the FWHM estimate is based on icosahedron geometry, not the actual subject surface.

> [!gotcha] Icosahedron approximation
> The code contains the line `surf = ReadIcoByOrder(7,50)` and ignores the subject surface path despite constructing it. The FWHM estimate is therefore based on the standard icosahedral mesh, which has different inter-vertex distances from individual subject surfaces. For most purposes this is adequate, but for high-resolution or low-resolution surfaces the mapping may be inaccurate.

## Typical Use Cases

```bash
# Convert 10 iterations to FWHM
mris_niters2fwhm --s bert --h lh --niters 10
```

## Pipeline Context

Not part of `recon-all`. Used as a helper in group analysis scripts where smoothing must be specified consistently between tools. Commonly called before `mri_surf2surf` or [[mris_smooth]] when planning analysis parameters. Provides only the niters-to-FWHM direction; to find the iteration count for a target FWHM, iterate manually or use a wrapper script.

## Gotchas and Caveats

> [!gotcha] Does not use subject surface
> Despite accepting `--s` and `--h`, the tool constructs the subject surface path but then loads a standard icosahedron. The actual surface geometry is not used in the FWHM computation.

> [!gotcha] Maximum iteration cap
> The `--niters` flag sets the simulation maximum. If the requested iteration count is high, increase it accordingly. The default simulation runs up to 100 iterations (the value of `nitersmax`).

## Related Tools

- [[mris_smooth]] — the surface smoothing tool whose iteration count this tool converts
- `mri_surf2surf` — uses FWHM specification which must be converted to iterations

## Confidence and Gaps

**Confident (from code):** Uses fixed ico-7 regardless of subject argument; simulates delta-function smoothing; `MRISmeanInterVertexDist` and `MRISgaussianSmooth2` used; default `nitersmax=100` (set by `--niters`), `dof=100`. Full flag set confirmed from `parse_commandline()`.

**Note:** The flags --fwhm, --hemi, and --nitersmax do not exist in the source. The correct flags are --h (hemisphere), --niters (iteration count / max), and there is no fwhm-to-niters conversion.

> [!gap] Output format
> The exact format of the stdout output (FWHM values at each iteration count) is not documented here.
