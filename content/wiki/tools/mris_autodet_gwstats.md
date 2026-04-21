---
title: "mris_autodet_gwstats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_autodet_gwstats.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mri_normalize]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Output file format (.dat/.json?) and exact field names need confirmation."
  - "Interaction with mris_make_surfaces when stats file is absent needs verification."
tags:
  - surface
  - intensity
  - grey-white
  - autorecon2
  - surface-placement
---

# mris_autodet_gwstats

## Summary

`mris_autodet_gwstats` automatically detects the grey matter and white matter intensity statistics — specifically the mean intensities and standard deviations — needed to accurately place the grey-white boundary surface. It is a helper tool called during `autorecon2` to replace the previously hard-coded or user-supplied intensity values, making the surface placement adaptive to each individual subject's image properties.

## Source Information

- **Language:** C++ (author: Douglas N. Greve, rewrite of `mris_make_surfaces` logic by Bruce Fischl)
- **Source file:** `mris_make_surfaces/mris_autodet_gwstats.cpp`
- Uses the `AutoDetGWStats` class (`surfgrad.h`).

## Purpose and Context

Surface placement in FreeSurfer (via `mris_make_surfaces`) uses intensity thresholds and statistics to locate the grey-white boundary. Historically these were estimated from the entire brain or from predefined WM/GM regions. `mris_autodet_gwstats` refines this by analysing the intensity distribution near the initial surface estimate and along surface normals, producing subject-specific statistics stored in an output file. These statistics are then consumed by `mris_make_surfaces`.

This separation allows the statistics computation to run once and be reused, and also enables easier debugging and quality assessment of the boundary placement parameters.

## Inputs

| Input | Description |
|-------|-------------|
| `--s <subject>` | FreeSurfer subject name |
| `--surf <path>` / `--lh-surf <path>` / `--rh-surf <path>` | Surface to process (hemisphere determined from `lh`/`rh` filename prefix or explicit flag) |
| `--o <outfile>` | Output statistics file |

Optional (override default paths):

| Flag | Description | Default |
|------|-------------|---------|
| `--i <path>` | Input intensity volume | `brain.finalsurfs.mgz` |
| `--wm <path>` | White matter mask volume | `wm.mgz` |
| `--surf <path>` | Explicit surface path (hemisphere inferred from filename prefix `lh`/`rh`) | — |
| `--surfs <lhpath> <rhpath>` | Explicit LH and RH surface paths (both hemispheres at once) | — |
| `--lh-surf <path>` | Explicit LH surface path | — |
| `--rh-surf <path>` | Explicit RH surface path | — |
| `--threads <n>` | Number of OpenMP threads | 1 |

## Outputs

| Output | Description |
|--------|-------------|
| `<outfile>` | File containing grey/white intensity statistics (mean WM intensity, mean GM intensity, standard deviations) used by `mris_make_surfaces` |

## Mathematical Foundations

The `AutoDetGWStats` class samples intensity values from the MRI volume near the white surface along surface-normal profiles. It estimates:

- White matter mean $\mu_{\text{WM}}$ and standard deviation $\sigma_{\text{WM}}$
- Grey matter mean $\mu_{\text{GM}}$ and standard deviation $\sigma_{\text{GM}}$

These are used in `MRIScomputeBorderValues()` to define the target intensity for each surface vertex during deformation. The boundary placement target for each vertex is approximately:

$$
t(v) = \mu_{\text{WM}} - k \cdot (\mu_{\text{WM}} - \mu_{\text{GM}})
$$

where $k$ is a fractional offset controlling where along the WM-GM gradient the surface is placed.

## Configuration Options

| Flag | Arguments | Description | Default |
|------|-----------|-------------|---------|
| `--s <subject>` | string | Subject name | required |
| `--o <outfile>` | path | Output stats file path | required |
| `--i <vol>` | path | Input intensity volume path | `brain.finalsurfs.mgz` |
| `--wm <vol>` | path | WM mask volume path | `wm.mgz` |
| `--surf <path>` | path | Explicit surface path (hemisphere inferred from `lh`/`rh` prefix) | — |
| `--surfs <lhpath> <rhpath>` | path path | Explicit LH and RH surface paths (sets both hemispheres) | — |
| `--lh-surf <path>` | path | Explicit LH surface path | — |
| `--rh-surf <path>` | path | Explicit RH surface path | — |
| `--sd <dir>` | path | SUBJECTS_DIR override | env var |
| `--threads <n>` / `--nthreads <n>` | integer | OpenMP thread count | 1 |
| `--min_border_white <val>` / `-wlo` | float | Override minimum border white intensity threshold | auto-detected |
| `--max_border_white <val>` | float | Override maximum border white intensity threshold | auto-detected |
| `--min_gray_at_white_border <val>` | float | Override minimum grey intensity at white border | auto-detected |
| `--max_gray <val>` / `-ghi` | float | Override maximum grey intensity threshold | auto-detected |
| `--max_gray_at_csf_border <val>` | float | Override maximum grey intensity at CSF border | auto-detected |
| `--min_gray_at_csf_border <val>` | float | Override minimum grey intensity at CSF border | auto-detected |
| `--max_csf <val>` | float | Override maximum CSF intensity | auto-detected |
| `--debug` | — | Enable debug output | off |

> [!gap] LH/RH hemisphere flags
> No `--lh` or `--rh` boolean flags exist in the source. Hemisphere selection is handled by providing a surface path via `--surf`, `--surfs`, `--lh-surf`, or `--rh-surf`, with hemisphere inferred from the `lh`/`rh` filename prefix.

## Configuration Interactions

- `--s` with `--lh-surf` or `--rh-surf` (or `--surf`) constructs default file paths automatically; individual path overrides only need to be supplied when the default directory structure does not apply.
- `--lh-surf` and `--rh-surf` bypass the `SUBJECTS_DIR/<subject>/surf/` path construction when explicit surface paths are needed.
- `--surfs` provides both LH and RH paths in one flag, equivalent to specifying both `--lh-surf` and `--rh-surf`.
- The intensity threshold overrides (`--min_border_white`, `--max_gray`, etc.) bypass auto-detection and force specific values into the `AutoDetGWStats` struct. These are useful when auto-detection fails on unusual datasets.

## Typical Use Cases

```bash
# Standard usage within recon-all for left hemisphere
mris_autodet_gwstats \
    --s bert \
    --lh-surf $SUBJECTS_DIR/bert/surf/lh.orig \
    --o $SUBJECTS_DIR/bert/surf/lh.autodet_gwstats.dat

# With custom volumes
mris_autodet_gwstats \
    --s bert \
    --lh-surf $SUBJECTS_DIR/bert/surf/lh.orig \
    --i $SUBJECTS_DIR/bert/mri/brain.mgz \
    --wm $SUBJECTS_DIR/bert/mri/wm.mgz \
    --o $SUBJECTS_DIR/bert/surf/lh.autodet_gwstats.dat
```

## Pipeline Context

Called during `autorecon2` before `mris_make_surfaces` places the grey-white boundary surface. The output file is consumed by `mris_make_surfaces` to configure its boundary placement statistics.

Stage order in `recon-all`:
1. `mri_normalize` — intensity normalisation
2. `mri_segment` — initial WM segmentation
3. **`mris_autodet_gwstats`** — auto-detect intensity statistics
4. `mris_make_surfaces` — surface placement using these statistics

## Gotchas and Caveats

> [!gotcha] Source lives in mris_make_surfaces directory
> The source file `mris_autodet_gwstats.cpp` is located within the `mris_make_surfaces/` directory, not in a dedicated `mris_autodet_gwstats/` directory. This reflects its close coupling with `mris_make_surfaces`.

> [!gotcha] Hemisphere determined from surface filename, not a flag
> There are no `--lh` or `--rh` boolean flags. The hemisphere is determined from the `lh`/`rh` prefix of the surface filename supplied via `--surf`, `--lh-surf`, `--rh-surf`, or `--surfs`. Providing a surface whose filename does not begin with `lh` or `rh` will result in `hemicode = -1` and likely an error.

## Related Tools

- [[mris_smooth]] — downstream surface processing
- [[mris_inflate]] — downstream surface processing
- [[mri_normalize]] — provides the normalised intensity volume consumed here

## Confidence and Gaps

**Confident:** Purpose, I/O structure, and pipeline role confirmed from source code comments and the `AutoDetGWStats` class interface.

> [!gap] Output file format
> The exact format of the output statistics file (text/binary, field names) was not verified from source. Check `AutoDetGWStats::write()` in `surfgrad.cpp`.
