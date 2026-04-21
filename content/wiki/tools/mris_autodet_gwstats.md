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
last_agent_update: 2026-04-15
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
| `--lh` / `--rh` | Hemisphere to process |
| `--o <outfile>` | Output statistics file |

Optional (override default paths):

| Flag | Description | Default |
|------|-------------|---------|
| `--invol <path>` | Input intensity volume | `brain.finalsurfs.mgz` |
| `--wm <path>` | White matter mask volume | `wm.mgz` |
| `--surf <name>` | Surface name | `orig` |
| `--lhsurf <path>` | Explicit LH surface path | — |
| `--rhsurf <path>` | Explicit RH surface path | — |
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

| Flag | Description | Default |
|------|-------------|---------|
| `--s <subject>` | Subject name | required |
| `--lh` | Process left hemisphere | — |
| `--rh` | Process right hemisphere | — |
| `--o <outfile>` | Output stats file path | required |
| `--invol <vol>` | Input intensity volume path | `brain.finalsurfs.mgz` |
| `--wm <vol>` | WM mask volume path | `wm.mgz` |
| `--surf <name>` | Surface name to use | `orig` |
| `--lhsurf <path>` | Explicit LH surface path | — |
| `--rhsurf <path>` | Explicit RH surface path | — |
| `--sd <dir>` | SUBJECTS_DIR override | env var |
| `--threads <n>` | Thread count | 1 |
| `--debug` | Enable debug output | off |

## Configuration Interactions

- `--s` with `--lh`/`--rh` constructs default file paths automatically; individual path overrides (`--invol`, `--wm`, `--surf`) only need to be supplied when the default directory structure does not apply.
- `--lhsurf` / `--rhsurf` bypass the `SUBJECTS_DIR/<subject>/surf/` path construction when explicit surface paths are needed.

## Typical Use Cases

```bash
# Standard usage within recon-all for left hemisphere
mris_autodet_gwstats \
    --s bert --lh \
    --o $SUBJECTS_DIR/bert/surf/lh.autodet_gwstats.dat

# With custom volumes
mris_autodet_gwstats \
    --s bert --lh \
    --invol $SUBJECTS_DIR/bert/mri/brain.mgz \
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

> [!gotcha] Hemisphere specification required
> The tool requires exactly one of `--lh` or `--rh`. Specifying neither or both will produce an error.

## Related Tools

- [[mris_smooth]] — downstream surface processing
- [[mris_inflate]] — downstream surface processing
- [[mri_normalize]] — provides the normalised intensity volume consumed here

## Confidence and Gaps

**Confident:** Purpose, I/O structure, and pipeline role confirmed from source code comments and the `AutoDetGWStats` class interface.

> [!gap] Output file format
> The exact format of the output statistics file (text/binary, field names) was not verified from source. Check `AutoDetGWStats::write()` in `surfgrad.cpp`.
