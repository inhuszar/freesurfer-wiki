---
title: "mris_target_pos"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_target_pos.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "The relationship to mris_place_surface needs clarification."
  - "Located in mris_make_surfaces/, suggesting it is a surface placement development/diagnostic tool."
tags:
  - surface-placement
  - target
  - development
  - diagnostic
---

# mris_target_pos

## Summary

`mris_target_pos` computes the desired target location of a surface vertex (primarily for exploring and debugging target placement strategies used in `mris_place_surface`). It is a development and diagnostic tool for surface deformation algorithms, attributed to Douglas N. Greve.

## Source Information

- **Language:** C++
- **Source file:** `mris_make_surfaces/mris_target_pos.cpp`
- **Location note:** Located within the `mris_make_surfaces/` directory, suggesting it is a companion tool to the main surface placement pipeline.
- **Key libraries:** `mrisurf`, `mrisutils`, `mri`, `mri2`, `cmdargs`, `cma`, `dmatrix`

## Purpose and Context

During surface reconstruction in `recon-all`, the white and pial surfaces are placed by `mris_place_surface` (or earlier `mris_make_surfaces`), which moves each vertex to a target position determined by intensity gradients in the MRI volume. `mris_target_pos` is a diagnostic utility that computes and outputs these target positions for inspection, allowing developers and researchers to understand and debug the target placement logic without running the full surface deformation.

The source defines a `FloatInt` helper class for sorting floats with their indices, suggesting the tool performs some sort-and-rank operation on candidate target positions.

## Inputs

Required:
- **`--i insurfname`**: Input surface file (e.g., `lh.white`)
- **`--v involname`**: Input MRI intensity volume to place the surface on
- **`--o outsurfname`**: Output surface file with computed target positions
- **`--adgws adgwsfile`** or **`--thresh InwardThresh OutwardThresh`**: intensity thresholds — either an ADGWS file (auto-detected gray/white stats) or explicit inward/outward threshold values

Optional:
- `--l labelfile`: Label file; vertices not in the label are ripped (excluded from target computation)
- `--seg segvolume`: Segmentation volume used to prevent placement crossing hemispheres

## Outputs

- **`--o outsurfname`**: Output surface with `targx/targy/targz` vertex fields set to the computed target positions.
- **`--dump dumpdir`** (optional): If specified, writes a directory of diagnostic files including `marked.{fmt}`, `sigma.{fmt}`, `val.{fmt}`, `opt.dist.{fmt}`, `maxgrad.{fmt}`, `thresh.dat`, `proj.{fmt}`, `projsm.{fmt}`, `projsmgrad.{fmt}`, and per-sigma Gaussian kernel matrices. The output format is controlled by `--nii`, `--nii.gz`, `--mgh`, or `--mgz`.

## Mathematical Foundations

For each non-ripped vertex, the algorithm:
1. Projects the MRI intensity along the vertex normal over the range `[MinSampleDist, MaxSampleDist]` at `DeltaSampleDist` mm intervals (defaults: −4 to +6 mm, step 0.1 mm).
2. Smooths the projection with a Gaussian kernel of width `sigma` (default 0.2 mm). If no valid bracket is found at the initial sigma, it doubles sigma up to 4× (i.e., tries `sigma`, `2σ`, `4σ`, `8σ`).
3. Computes the gradient of the smoothed projection.
4. Finds bracket limits: scans outward until intensity crosses `OutwardThresh` (or gradient turns negative), and inward until intensity crosses `InwardThresh`.
5. Identifies the sample position with the maximum gradient within the bracket as the target.
6. The `Contrast` parameter (−1 for T1, +1 for T2) inverts the gradient direction.

The `FloatInt` helper class sorts floats while preserving their original indices, used in the `SavePointSet` diagnostic function.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | surface | required | Input surface file |
| `--v` | volume | required | Input MRI intensity volume |
| `--o` | surface | required | Output surface with target positions |
| `--adgws` | file | — | ADGWS (auto-detected gray/white stats) file; sets `border_hi` and `outside_low` from the surface type |
| `--thresh` | `InwardThresh OutwardThresh` | — | Explicit inward and outward intensity thresholds (replaces `--adgws`) |
| `--white` | — | on (default) | Use white-surface thresholds when reading ADGWS file |
| `--pial` | — | off | Use pial-surface thresholds when reading ADGWS file |
| `--l` | labelfile | — | Rip (exclude) vertices not in this label |
| `--sample-dist` | `min max delta` | `-4 6 0.1` | Normal projection sampling range (mm) and step size |
| `--search-dist` | `min max` | `-3.0 6.0` | Search range within the projection for bracket finding |
| `--sigma` | float | `0.2` | Initial Gaussian smoothing sigma (mm) along projection |
| `--interp` | method | `trilinear` | Interpolation method for volume sampling: `trilinear`, `nearest`, `cubic`, or `sinc [hw]` |
| `--trilin` | — | — | Shortcut for `--interp trilinear` |
| `--nearest` | — | — | Shortcut for `--interp nearest` |
| `--cubic` | — | — | Shortcut for `--interp cubic` |
| `--cbv` | — | off | Use `MRIScomputeBorderValues()` instead of the custom target-pos algorithm (requires `--adgws`) |
| `--no-cbv` | — | on (default) | Use the custom gradient-based target-pos algorithm |
| `--dump` | dir | — | Write diagnostic output files to this directory |
| `--npointset` | int | `50` | Number of extreme-displacement vertices to write to the `dist.ps` point-set file |
| `--nii` | — | — | Set dump output format to NIfTI (`.nii`) |
| `--nii.gz` | — | — | Set dump output format to gzipped NIfTI |
| `--mgh` | — | on (default) | Set dump output format to `.mgh` |
| `--mgz` | — | — | Set dump output format to `.mgz` |
| `--threads`<br>`--nthreads` | int | `1` | Number of OpenMP threads for vertex-loop parallelization |
| `--debug-vertex` | int | — | Print per-vertex diagnostic output for vertex number `vtxno` |
| `--debug` | — | off | Enable global debug output |
| `--checkopts` | — | off | Parse and validate options only; do not run |

## Configuration Interactions

- Either `--adgws` or `--thresh` must be provided; the tool exits with an error if neither is given.
- `--adgws` sets `border_hi` and `outside_low` from the ADGWS file; the values used depend on `--white` (default) vs. `--pial`.
- `--thresh` overrides any ADGWS-derived thresholds.
- `--cbv` requires `--adgws`; it bypasses the normal gradient search and delegates to `MRIScomputeBorderValues()`.
- `--sample-dist` affects both the sampling range and the number of Gaussian kernel elements; changing it also changes the effective smoothing by `--sigma`.
- The sigma doubles up to 4 levels if no valid bracket is found at the initial sigma. A larger `--sigma` or wider `--search-dist` can help in noisy data.

## Typical Use Cases

**Compute white-surface target positions using ADGWS thresholds:**
```bash
mris_target_pos \
  --i lh.white \
  --v brain.finalsurfs.mgz \
  --o lh.white.target \
  --adgws adgws.lh.dat \
  --white
```

**Use explicit intensity thresholds and write diagnostic dump:**
```bash
mris_target_pos \
  --i lh.white \
  --v brain.finalsurfs.mgz \
  --o lh.white.target \
  --thresh 110 45 \
  --dump /tmp/targetpos_debug/
```

**Multithreaded run with pial-surface thresholds:**
```bash
mris_target_pos \
  --i lh.pial \
  --v brain.finalsurfs.mgz \
  --o lh.pial.target \
  --adgws adgws.lh.dat \
  --pial \
  --nthreads 8
```

## Pipeline Context

`mris_target_pos` is not called directly by `recon-all`. It is a development tool for:
- Debugging the target placement logic in `mris_place_surface`.
- Exploring alternative target placement strategies.
- Visualizing where the surface placement algorithm "wants" to move vertices.

## Gotchas and Caveats

> [!gap] Development/diagnostic tool
> This tool is primarily intended for FreeSurfer developers. Its interface and behavior may change between versions without notice. It is not recommended for production neuroimaging workflows.

## Related Tools

- [[surface-format]] — surface format reference

## Confidence and Gaps

**Moderate-to-high confidence.** The full source including `parse_commandline()`, `main()`, and `GetVertexTarget()` has been read. CLI, algorithm, and outputs are documented.

> [!gap] Relationship to mris_place_surface unclear
> `mris_target_pos` appears to implement a subset of the target-finding logic in `mris_place_surface`. The exact relationship — whether it is a standalone diagnostic version, a prototype, or a utility called by the pipeline — has not been confirmed from source.
