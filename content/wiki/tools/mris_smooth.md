---
title: "mris_smooth"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_smooth/mris_smooth.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_tessellate]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[freeview-surfaces]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "MRISaverageVertexPositions() kernel (equal-weight Laplacian vs. area-weighted) not confirmed from shared lib"
tags:
  - surface
  - smoothing
  - autorecon2
---

# mris_smooth

## Summary

`mris_smooth` applies iterative surface smoothing to a triangulated mesh by
averaging vertex positions with their neighbours (Laplacian smoothing).
In the standard recon-all flow it is called twice:

1. **Smooth1** (autorecon2): smooths `?h.orig.nofix` → `?h.smoothwm.nofix`
   without writing curvature or area files (`-nw` flag).
2. **Smooth2** (autorecon2, post-white surface): smooths `?h.white.preaparc`
   → `?h.smoothwm` and writes curvature (`?h.curv`) and area (`?h.area`) files.

The smoothed surface removes high-frequency noise introduced by the voxel-grid
step pattern of [[mri_tessellate]] while approximately preserving the mean
surface geometry.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_smooth/mris_smooth.cpp` (912 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_smooth`
- **Reference:** Fischl et al., NeuroImage, 1999

## Purpose and Context

The surface produced by [[mri_tessellate]] is a staircase-shaped voxel
boundary mesh. Iterative Laplacian smoothing (averaging) reduces the staircase
artefacts and produces a surface suitable for inflation and spherical mapping.
The number of iterations is tuned to provide enough smoothing without
introducing significant area distortion.

After Smooth2, `mris_smooth` also writes the **mean curvature** (`?h.curv`)
and **vertex area** (`?h.area`) files that are used by downstream tools
for parcellation and morphometric statistics.

## Inputs

### Required Inputs

| Argument | Description |
|----------|-------------|
| `insurf` | Input surface file (e.g., `surf/lh.orig.nofix`) |
| `outsurf` | Output surface file (e.g., `surf/lh.smoothwm.nofix`) |

### Input Assumptions

> [!assumption] Input must be a valid MRIS surface file
> The tool reads the surface with `MRISfastRead()`. It expects a standard
> FreeSurfer binary surface or GIFTI surface. The surface must have valid
> vertex and face lists.

## Outputs

### Files Created (default mode)

| File | Description |
|------|-------------|
| `outsurf` | Smoothed surface in same coordinates as input |
| `?h.curv` | Mean curvature at each vertex (written after averaging, unless `-nw`) |
| `?h.area` | Vertex area at each vertex (written after averaging, unless `-nw`) |

With `-nw` (no-write): only `outsurf` is written; `curv` and `area` are not.

### Curvature and area filenames

The filenames for curvature and area are derived from `outsurf` by extracting
the path and appending the configured names. Default filenames are `curv` and
`area` but can be changed with `-C` and `-B` flags.

## Mathematical Foundations

### Laplacian Smoothing

The default smoothing operation is iterative **mean-position averaging**.
For `niterations` (default 10) iterations, each vertex $v_i$ is updated to
the mean of its neighbourhood:

$$
v_i^{(t+1)} = \frac{1}{|\mathcal{N}(v_i)|} \sum_{j \in \mathcal{N}(v_i)} v_j^{(t)}
$$

where $\mathcal{N}(v_i)$ is the set of 1-ring neighbours at ring size `nbrs=2`.
The actual kernel (`NORM_MEAN` vs. area-weighted) is implemented in
`MRISaverageVertexPositions()` in the shared `mrisurf` library.

> [!gap] Averaging kernel details
> `MRISaverageVertexPositions()` is in the shared library. Whether it uses
> equal-weight (pure Laplacian) or area-weighted averaging was not confirmed
> from the source read in this session.

### Curvature averaging

After position smoothing, mean curvature is computed
(`MRIScomputeSecondFundamentalForm`) and then averaged across `navgs` (default
10) iterations by `MRISaverageCurvatures()`. This smoothed curvature is what
gets written to `?h.curv`.

### Gaussian curvature mode (`-gt`, `-G`)

When `-gt thresh` is specified, the tool applies **selective Gaussian curvature
smoothing** that only smooths vertices with high absolute Gaussian curvature
$|K|$ above a percentile threshold computed by `MRISfindCurvatureThreshold()`
from the empirical CDF of $|K|$ over all unripped vertices (with `|K|` clamped
to 100 and binned into 1000 histogram bins):

1. Compute $K$ (Gaussian curvature) for all vertices via
   `MRIScomputeSecondFundamentalForm()` + `MRISuseGaussianCurvature()`.
2. Find threshold $\kappa$ such that the fraction of vertices with $|K| \leq \kappa$
   equals `thresh` (i.e. the `thresh`-quantile of the $|K|$ CDF).
3. Mark all vertices with $|K| \geq \kappa$.
4. Dilate the marked set by `dilates` (default 5) iterations.
5. Invert marks and call `MRISsoapBubbleVertexPositions(mris, 1000)` to smooth
   the (now unmarked) vertices for up to 1000 sweeps.
6. Repeat steps 1–5 for `npasses` (default 1) outer passes, then write the
   surface and exit.

The `-G norm avgs` mode (used with the experimental hippocampal pipeline,
e.g. `-g 20 8`) instead drives an iterative spring-term optimization
(`MRISmarkedSpringTerm`, `MRISaverageGradients`, `MRISmomentumTimeStep`) on
vertices selected by `MRIShistoThresholdGaussianCurvatureToMarked()`, which
builds a 1000-bin histogram of $|K|$ over vertices whose mean neighbour
spacing is above 1% of the surface mean and marks all vertices in bins above
the requested CDF percentile. The loop halves `gaussian_avgs` between outer
passes until it reaches 2.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `insurf` | positional | — | Input surface filename (read with `MRISfastRead()`) |
| `outsurf` | positional | — | Output surface filename; the directory part of this path is also where `?h.curv` and `?h.area` are written |
| `-A <n>` | int | 10 | Sets `navgs` — number of post-smoothing iterations of `MRISaverageCurvatures()` applied to mean curvature before it is written to `?h.curv` |
| `-area` | flag | OFF | Sets internal `normalize_area` flag and prints "normalizing area after smoothing". In the 8.2.0 source `normalize_area` is never read after being set, so this flag is effectively a no-op (dead flag) |
| `-B <fname>` | string | `area` | Basename for the area output file; final filename becomes `?h.<fname>` written to `dirname(outsurf)` |
| `-C <fname>` | string | `curv` | Basename for the curvature output file; final filename becomes `?h.<fname>` written to `dirname(outsurf)` |
| `-D <n>` | int | 5 | `dilates`: number of `MRISdilateMarked()` iterations applied to the marked vertex set in the `-gt` Gaussian-curvature path |
| `-G <norm> <avgs>` | float, int | 0, 0 | Sets `gaussian_norm` (l_spring norm; called `norm` in the code) and `gaussian_avgs` (smoothing averages applied via `MRISsmoothSurfaceNormals()` / `MRISaverageGradients()`). Activates an experimental Gaussian curvature spring-term path that runs an iterative time-stepped optimization until `gaussian_avgs` decays to 2 |
| `-gt <thresh>` | float | 0 | Sets `gaussian_thresh` to a CDF percentile in [0,1]. Activates the percentile-based Gaussian curvature smoothing path: vertices with `|K|` above the `thresh`-percentile of the |K| histogram are marked, the marked set is dilated by `dilates`, marks are inverted, and `MRISsoapBubbleVertexPositions(mris, 1000)` is run for `npasses` passes. Tool exits immediately after `MRISwrite()`, skipping the standard Laplacian path and curvature/area output |
| `-M <momentum>` | float | 0.0 | Sets `momentum` used by `MRISmomentumTimeStep()` in the `-G` Gaussian curvature spring-term path. Has no effect outside that path |
| `-N <n>` | int | 10 | Sets `niterations` — the number of iterations passed to `MRISaverageVertexPositions(mris, niterations)` for the default Laplacian smoothing path. Also used as inner loop count in the `-G` path |
| `-nbrs <n>` | int | 2 | Neighbourhood ring size; passed to `MRISsetNeighborhoodSizeAndDist()` and used for all subsequent neighbour-based operations |
| `-normalize` | flag | OFF | Sets `normalize_flag = 1`. After position smoothing and curvature averaging, calls `MRISnormalizeCurvature(mris, NORM_MEAN)` to mean-normalize the curvature values prior to writing `?h.curv` |
| `-nw` | flag | OFF | "No write": sets `no_write = 1`. Curvature and area are still computed internally, but `MRISwriteCurvature()` and `MRISwriteArea()` are skipped. The output surface is still written |
| `-P <n>` | int | 1 | Sets `npasses` — number of outer passes of the marking/dilation/soap-bubble loop in the `-gt` path |
| `-R` | flag | OFF | Sets `rescale = 1`. After smoothing, calls `MRISscaleBrainArea()` to rescale the surface so that the total brain area matches the pre-smoothing value |
| `-seed <n>` | int | (system) | Calls `setRandomSeed(n)` to seed the global PRNG used by surface routines that draw random numbers |
| `-V <vno>` | int | -1 | Sets `Gdiag_no` to the given vertex number for verbose per-vertex debug output |
| `-W <n>` | int | 0 | Sets `write_iterations = n` and ORs `Gdiag |= DIAG_WRITE`. In the `-G` path, snapshots of the surface (and optionally curvature/marks) are written every `n` iterations as `<outsurf>NNNN`. Has no effect in the default Laplacian path |
| `--help`<br>`--usage`<br>`-?`<br>`-H`<br>`-U` | flag | — | Print help (XML-rendered usage) and exit |
| `--version` | flag | — | Print version string and exit |

### Configuration Interactions

> [!gotcha] `-nw` suppresses curv and area even though they are always computed
> The curvature and area are computed internally regardless of `-nw`. The flag
> only controls whether they are written to disk. This means `-nw` with Smooth1
> (on `orig.nofix`) still computes curvature/area internally — it just does not
> write them. Smooth2 (on `white.preaparc`) omits `-nw` and writes the files.

> [!gotcha] `-gt` and `-G` activate mutually incompatible code paths
> When `gaussian_thresh > 0` (set by `-gt`), the tool enters the percentile
> Gaussian curvature soap-bubble path and calls `exit(0)` immediately after
> `MRISwrite()`. This means `-gt` runs neither curvature averaging nor
> `?h.curv`/`?h.area` writing, regardless of `-nw`, `-A`, `-C`, `-B`, `-R`, or
> `-normalize`. When `-G norm avgs` is set (`gaussian_norm > 0`) without `-gt`,
> a different Gaussian curvature spring-term optimization is used; `-N`,
> `-M`, and `-W` then take effect inside that loop. The default Laplacian
> path runs only when neither `-gt` nor `-G` is supplied.

> [!gotcha] `-area` is a dead flag in 8.2.0
> The `-area` option sets an internal `normalize_area` variable but nothing in
> `mris_smooth.cpp` ever reads it. Use `-R` if you want to preserve total
> surface area after smoothing.

> [!gotcha] `-M`, `-W`, `-P`, `-D` only matter on Gaussian paths
> `-M` (momentum) and the `-W` snapshot writer are only consumed inside the
> `-G` path. `-P` (passes) and `-D` (dilation iterations) are only consumed
> inside the `-gt` path. They have no effect on the default recon-all
> Laplacian smoothing path.

> [!gotcha] `-A navgs` is curvature averaging, not position averaging
> `-A 10` sets `navgs = 10` for `MRISaverageCurvatures()`, the curvature
> post-smoothing step. It does NOT affect `niterations` (the vertex position
> smoothing count, set by `-N`).

## Typical Use Cases

### Use Case 1: recon-all Smooth1 (no curvature/area output)

```bash
mris_smooth -nw surf/lh.orig.nofix surf/lh.smoothwm.nofix
```

### Use Case 2: recon-all Smooth2 (with curvature and area output)

```bash
mris_smooth surf/lh.white.preaparc surf/lh.smoothwm
# Produces: smoothwm, lh.curv, lh.area
```

### Use Case 3: Increase smoothing iterations

```bash
mris_smooth -N 20 surf/lh.orig.nofix surf/lh.smoothwm.nofix
```

## Pipeline Context

**autorecon2 — two call sites:**

**Smooth1 call site** (recon-all lines 3614–3643):

```
mri_tessellate → lh.orig.nofix
                       ↓
      mris_smooth -nw lh.orig.nofix lh.smoothwm.nofix
                       ↓
              lh.smoothwm.nofix
                       ↓
            mris_inflate (Inflate1)
```

Exact recon-all command ([`scripts/recon-all:3624`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3624)):
```bash
mris_smooth -nw [$-seed $RngSeed] surf/lh.orig.nofix surf/lh.smoothwm.nofix
```

**Smooth2 call site** (autorecon2 post-white surface, recon-all ~line 3760):
```bash
mris_smooth surf/lh.white.preaparc surf/lh.smoothwm
# → lh.smoothwm, lh.curv, lh.area
```

## Gotchas and Caveats

> [!gotcha] Smooth1 runs on orig.nofix (may have topology errors)
> The first smooth pass operates on the topologically unfixed surface
> (`orig.nofix`). Topology errors (handles, holes) present here will persist
> through inflation and QSphere; they are only fixed by the topology-fixing
> stage of [[wiki/pipelines/recon-all|recon-all]]. mris_smooth does not attempt any topology correction.

> [!gotcha] Default iterations (10) produce only mild smoothing
> The default of 10 Laplacian iterations removes voxel-boundary staircase
> patterns but leaves medium-frequency folds intact. This is intentional —
> recon-all relies on preserving folds for inflation and spherical mapping.
> Do not increase iterations aggressively for whole-cortex smoothing.

> [!gotcha] curv and area filenames depend on outsurf path
> The curvature and area files are written relative to the **output** surface
> path, not the input. The stem is derived from `path(outsurf)`. If `outsurf`
> is in a different directory from `insurf`, curvature files land in the
> output directory.

## Related Tools

- [[mri_tessellate]] — produces `orig.nofix` (Smooth1 input)
- [[mris_inflate]] — inflates `smoothwm.nofix` (Smooth1 output)
- [[mris_sphere]] — spherical mapping (downstream)
- [[freeview-surfaces]] — GUI for displaying smoothed surfaces; curvature overlays computed here are shown via the Curvature section in the surface panel

## Confidence and Gaps

Confidence **high** for flags, algorithm overview, and recon-all call sites.

> [!gap] Exact averaging kernel in MRISaverageVertexPositions
> Whether the Laplacian uses equal weights or area-weighted averaging was not
> confirmed from the shared library source.

## References

- Fischl, B., Sereno, M.I., Dale, A.M. (1999). *Cortical Surface-Based
  Analysis II: Inflation, Flattening, and a Surface-Based Coordinate System.*
  NeuroImage, 9(2):195–207. [cited in source header]
