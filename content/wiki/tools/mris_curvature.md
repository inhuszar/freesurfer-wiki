---
title: "mris_curvature"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_curvature/mris_curvature.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_curvature_stats]]"
  - "[[mris_make_surfaces]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact numerical method for computing the second fundamental form (e.g., cubic vs. quadratic fitting) needs confirmation from mrisurf internals."
tags:
  - surface
  - curvature
  - geometry
  - autorecon2
---

# mris_curvature

## Summary

`mris_curvature` computes the second fundamental form of a cortical surface mesh, producing per-vertex estimates of mean curvature ($H$), Gaussian curvature ($K$), and optionally the principal curvatures ($k_1$, $k_2$). Results are saved as FreeSurfer curvature overlay files. The tool is used in `recon-all` to compute the mean curvature of the `white` and `inflated` surfaces, which are used for cortical parcellation and visualisation.

## Source Information

- **Language:** C++
- **Primary source:** `mris_curvature/mris_curvature.cpp`
- **Original author:** Bruce Fischl
- **Associated XML:** `mris_curvature/mris_curvature.help.xml`

## Purpose and Context

Surface curvature is a fundamental descriptor of cortical geometry. Mean curvature ($H$) characterises local surface bending; positive values indicate convex (gyral) regions and negative values indicate concave (sulcal) regions. Gaussian curvature ($K$) reflects the intrinsic geometry; elliptic ($K > 0$), parabolic ($K = 0$), and hyperbolic ($K < 0$) regions correspond to different morphological features.

In `recon-all`, `mris_curvature` is called after surface inflation to produce `?h.inflated.H` and `?h.white.H` files used by `mris_register` and by various analysis tools. The curvature files are also used by `mris_anatomical_stats` for cortical shape analysis.

## Inputs

| Input | Description |
|-------|-------------|
| `<insurf>` (positional) | Input FreeSurfer binary surface file (e.g., `lh.white`, `lh.pial`, `lh.inflated`). |

## Outputs

| Output | Description |
|--------|-------------|
| `<insurf>.H` | Per-vertex mean curvature (FreeSurfer `.curv` format unless `-mgh` is used). Written only when `-w` is specified or a standalone mode is used. |
| `<insurf>.K` | Per-vertex Gaussian curvature. |
| `<insurf>.max` | Per-vertex maximum (first) principal curvature $k_1$ (when `-max` is used). |
| `<insurf>.min` | Per-vertex minimum (second) principal curvature $k_2$ (when `-min` is used). |
| `<stem>.{H,K,k1,k2}.mgz` | MGZ format outputs when standalone `-curvs`, `-H`, `-K`, `-k1`, `-k2`, or `-k1k2` modes are used. |

## Mathematical Foundations

The curvature is computed from the **second fundamental form** of the surface. For a smooth embedded surface $\mathcal{S}$, let $\mathbf{n}$ be the unit outward normal at a point $p$. The shape operator $S$ maps tangent vectors to tangent vectors via $S = -d\mathbf{n}$. Its eigenvalues are the principal curvatures $k_1 \geq k_2$.

$$
H = \frac{k_1 + k_2}{2} \quad \text{(mean curvature)}
$$
$$
K = k_1 \cdot k_2 \quad \text{(Gaussian curvature)}
$$

On a triangulated mesh, these are estimated by fitting a local quadratic or polynomial model in the neighbourhood of each vertex (neighbourhood size controlled by `--nbrs`, default 2). Iterative averaging (`-a <avgs>`) smooths the curvature estimate by replacing each vertex value with the mean of its neighbours `<avgs>` times.

> [!math] Euler characteristic relation
> For a closed surface, the Gauss-Bonnet theorem gives:
> $$
> \int_\mathcal{S} K \, dA = 2\pi \chi(\mathcal{S})
> $$
> where $\chi$ is the Euler characteristic (2 for a sphere, 0 for a torus). This is used to verify topological correctness of the surface (a cortical hemisphere after topology fixing should have $\chi = 2$).

## Configuration Options

### Standard mode (with positional input surface)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-w` | flag | off | Save curvature files to disk. Without this flag, results are printed to stdout only. |
| `-max` | flag | off | Save maximum principal curvature $k_1$ to `<insurf>.max`. |
| `-min` | flag | off | Save minimum principal curvature $k_2$ to `<insurf>.min`. |
| `-mgh`<br>`--mgh` | flag | off | Save outputs in `.mgz` format instead of FreeSurfer `.curv` format. Aliases `--mgz` / `-mgz`. |
| `-mgz`<br>`--mgz` | flag | off | Alias for `-mgh`; sets output format to `.mgz`. |
| `-a <avgs>` | int | 0 | Perform `<avgs>` iterations of neighbourhood averaging before saving. |
| `-nbrs <nbrs>` | int | 2 | Set neighbourhood size for curvature computation. |
| `-seed <N>` | int | — | Set random number generator seed to `N`. |
| `-n` | flag | off | Normalise curvature values after computation. |
| `-p` | flag | off | Enable patch mode: read `lh.orig` first, then apply the patch file as the positional input. |
| `-thresh <t>` | float | -1 (off) | Threshold curvature histogram at percentile `t` (passed to `MRIShistoThresholdCurvature`). Requires `-w`. |
| `-diff` | flag | off | Compute and save curvature difference ($k_1 - k_2$) to `<insurf><suffix>.diff`. |
| `-ratio`<br>`-defect` | flag | off | Compute and save curvature ratio ($k_1 / k_2$) to `<insurf><suffix>.ratio`. |
| `-contrast` | flag | off | Compute and save curvature contrast to `<insurf><suffix>.contrast`. |
| `-neg` | flag | off | Mark vertices with negative-area triangles and save to `<insurf><suffix>.neg`. |
| `-stretch` | flag | off | Compute and save curvature stretch (ratio of original to inflated areas) to `<insurf><suffix>.stretch`. |
| `-median` | flag | off | Use median normalization instead of mean when `-n` is combined with ratio/contrast/stretch modes. |
| `-suffix <s>` | string | `""` | Append `<s>` to all output filenames before the extension. |
| `-distance <mm>` | float | 0 | Sample neighbours up to `<mm>` mm geodesic distance (sets `max_mm`). |
| `-distances <nbhd> <nbrs_per>` | ints | — | Sample `<nbrs_per>` neighbours at each distance step up to `<nbhd>` mm. Alias: `-vnum`. |
| `-vnum <nbhd> <nbrs_per>` | ints | — | Alias for `-distances`. |
| `-nparam <file[#n]>` | string | — | Normalise a parameterization file and write the result to `<stem>.param`. Optionally specify parameter index with `#n`. |
| `-param <file>` | path | — | Read a spherical parameterization file and map it to the surface using `MRISfromParameterization`. |

### Standalone modes (self-contained: specify surface + neighbourhood + output stem)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-curvs <surf> <nbrhdsize> <stem>` | mixed | — | Compute and save H, K, k1, k2 to `stem.{H,K,k1,k2}.mgz`. |
| `-H <surf> <nbrhdsize> <stem>` | mixed | — | Save mean curvature H to `stem.H.mgz`. |
| `-K <surf> <nbrhdsize> <stem>` | mixed | — | Save Gaussian curvature K to `stem.K.mgz`. |
| `-k1 <surf> <nbrhdsize> <stem>` | mixed | — | Save primary principal curvature k1 to `stem.k1.mgz`. |
| `-k2 <surf> <nbrhdsize> <stem>` | mixed | — | Save secondary principal curvature k2 to `stem.k2.mgz`. |
| `-k1k2 <surf> <nbrhdsize> <stem>` | mixed | — | Save both k1 and k2 to `stem.{k1,k2}.mgz`. |

## Configuration Interactions

- Without `-w`, the tool computes curvature and prints summary statistics but does **not** write any files. This is useful for diagnostic checking.
- `-mgh` / `--mgh` and `-mgz` / `--mgz` are aliases; any of them sets the output file type to `.mgz`. Only applies to standard (non-standalone) mode.
- `-a` smoothing is applied after computation. Smoothing reduces noise in the curvature estimate but also blurs fine-scale cortical geometry. The `recon-all` default uses `-a 10` for the inflated surface curvature.
- `-ratio` and `-defect` are aliases that both set `ratio_flag`; they produce the same output.
- `-distances` and `-vnum` are aliases; both set `nbhd_size` and `nbrs_per_distance`.
- `-param` and `-nparam` are alternative parameterization modes; `-nparam` normalises the result with `MRISnormalizeFromParameterization` before writing. Both write to `<stem>.param` and exit.
- Standalone modes (`-H`, `-K`, etc.) take the surface as the first argument to the flag, not as a positional argument. These modes exit after processing and do not use any other flags set before them.

> [!gotcha] No output without `-w` in standard mode
> A common mistake is running `mris_curvature lh.white` expecting output files. Without `-w`, no files are written.

## Typical Use Cases

### Standard: compute mean and Gaussian curvature of the white surface

```bash
mris_curvature -w lh.white
# Produces lh.white.H and lh.white.K
```

### Smoothed curvature for registration

```bash
mris_curvature -w -a 10 lh.inflated
# As used in recon-all for inflated.H
```

### Save all principal curvature components to MGZ

```bash
mris_curvature -curvs lh.pial 2 lh.pial_curv
# Produces lh.pial_curv.H.mgz, lh.pial_curv.K.mgz, lh.pial_curv.k1.mgz, lh.pial_curv.k2.mgz
```

### Inspect curvature without writing files

```bash
mris_curvature lh.pial
# Prints mean curvature statistics to stdout; no files written
```

## Pipeline Context

`mris_curvature` is called in `recon-all` **AutoRecon2** after surface inflation:

1. `mris_inflate` produces `lh.inflated`
2. `mris_curvature -w -a 10 lh.inflated` → `lh.inflated.H`
3. `mris_curvature -w lh.white` → `lh.white.H`, `lh.white.K`
4. These curvature files are used by `mris_sphere` and `mris_register` for spherical registration

**Runs before:** [[mris_sphere]], [[mris_register]]
**Runs after:** [[mris_inflate]], [[mris_make_surfaces]]
**Related pipeline:** [[wiki/pipelines/recon-all|recon-all]]

## Gotchas and Caveats

> [!gotcha] Neighbourhood size affects spatial scale
> A neighbourhood size of 2 (`-nbrs 2`) is the recommended default. Larger values provide smoother estimates but reduce sensitivity to fine-scale curvature features. Very small neighbourhoods (size 1) can produce noisy estimates on irregular meshes.

> [!gotcha] Output file naming in standard mode
> The output files are named by appending `.H` and `.K` to the input surface filename. If the input is specified as a full path (e.g., `/path/to/lh.white`), the output files are created in the same directory. There is no option to redirect output files to a different directory in standard mode; use the standalone modes for explicit output paths.

> [!gotcha] `.H` suffix versus `.curv` format
> The output `.H` file is in FreeSurfer curvature overlay format (not MGZ), despite having a `.H` suffix. It can be loaded by `freeview` as a curvature overlay on the corresponding surface.

## Related Tools

- [[mris_curvature_stats]] — computes statistics over the curvature distribution per parcel
- [[mris_make_surfaces]] — produces the white and pial surfaces on which curvature is computed
- [[mris_smooth]] — smooths the white surface before curvature computation
- [[mris_inflate]] — inflates the surface; curvature is computed on the inflated surface
- [[surface-format]] — FreeSurfer surface and curvature file formats

## Confidence and Gaps

Confidence is **high** for flag semantics (from XML help), surface context (from recon-all pipeline knowledge), and the mathematical description (standard differential geometry). Confidence is **medium** for the exact numerical implementation of the second fundamental form estimation on the mesh.

> [!gap] Mesh curvature estimation method
> The internal `MRIScomputeSecondFundamentalForm()` or equivalent function in `mrisurf` computes the per-vertex curvature. The exact discrete estimator used (e.g., Meyer-Desbrun cotangent Laplacian, cubic polynomial fitting, or another scheme) has not been verified from the `mrisurf.cpp` source.
