---
title: "hiam_make_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "hiam_make_surfaces/hiam_make_surfaces.cpp"
families:
  - "hiam_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[hiam_make_template]]"
  - "[[hiam_register]]"
  - "[[color-lut]]"
  - "[[surface-representations]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The initial tessellation (<struct>.hippocampus.orig) is read but not produced by this tool or any script in the tree; its provenance is undocumented here."
  - "Hard-coded absolute output path and a hard-coded subject in the source make the as-shipped binary effectively a research artefact; whether a maintained build patches these is unknown."
tags:
  - surface
  - hippocampus
  - amygdala
  - segmentation
  - surface-deformation
  - aseg
---

# hiam_make_surfaces

## Summary

`hiam_make_surfaces` deforms an initial triangulated surface so that it tightly bounds a **hippocampus or amygdala label** in an [[color-lut|aseg]]-style segmentation volume. Starting from a precomputed tessellation of the structure, it iteratively moves each vertex under a weighted combination of forces: a **label term** that pushes the surface toward the boundary between the target label and its surround, a **quadratic-curvature** smoothing term, **normal** and **tangential spring** terms, a **self-repulsion** term (to avoid self-intersection), and an optional **Gaussian-curvature spring**. The deformation is run over a sequence of decreasing label-volume smoothings, followed by a spike-removal and a final Gaussian-smoothing pass, then the refined surface and its curvature are written into the subject's `surf/` directory. It is the hippocampus-and-amygdala ("hiam") sibling of [[mris_make_surfaces]].

## Source Information

- **Language:** C++
- **Source file:** [`hiam_make_surfaces/hiam_make_surfaces.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp)
- **Original author:** Peng Yu (header: "written by Peng Yu, date: 01/27/04").
- **Binary/script location:** `$FREESURFER_HOME/bin/hiam_make_surfaces`
- **Key library routines:** [`MRIread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L159) / [`MRISread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L180), [`MRIconvolveGaussian`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L230), [`MHTcreateVertexTable_Resolution`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L204) (spatial hash for repulsion), [`MRISwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L407)/[`MRISwriteCurvature`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L413). The energy-term gradients are implemented **in this file** (a self-contained copy of the `mris_make_surfaces`-style optimiser).

## Purpose and Context

The cortical [[mris_make_surfaces]] deforms a white-matter tessellation to the gray/white and pial boundaries using image intensity. `hiam_make_surfaces` adapts that idea to **subcortical structures defined by a label** rather than by intensity: it fits a surface to the hippocampus or amygdala as delineated in the `aseg` segmentation. The motivating use is shape analysis of these structures — producing a smooth, topologically clean surface model of a hippocampus/amygdala from its voxel segmentation, which can then be spherized, averaged into a template ([[hiam_make_template]]), and registered across subjects ([[hiam_register]]).

The four target labels are the standard FreeSurfer subcortical codes ([`extractlabelvolume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L440-L463), see [[color-lut]]):

| Label value | Structure | `mri_label[]` channel |
|-------------|-----------|------------------------|
| 17 | Left-Hippocampus | 0 |
| 53 | Right-Hippocampus | 1 |
| 18 | Left-Amygdala | 2 |
| 54 | Right-Amygdala | 3 |
| (other) | background / surround | 4 |

This is a stand-alone research command; it is **not** called by [[wiki/pipelines/recon-all|recon-all]] or by any shell script in the source tree, and it carries several hard-coded paths (see [Gotchas](#gotchas-and-caveats)) that mark it as an internal/experimental tool rather than a polished utility.

## Inputs

### Required Inputs

Two positional arguments ([`hiam_make_surfaces.cpp:141-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L141-L151)):

```
hiam_make_surfaces [options] <subject name> <structure: RA LA RH LH>
```

1. **`<subject name>`** — a subject under `$SUBJECTS_DIR`. The tool reads `$SUBJECTS_DIR/<subject>/mri/aseg` (the label volume, configurable with `-l`) and `$SUBJECTS_DIR/<subject>/surf/<structure>.hippocampus.orig` (the initial tessellation, configurable with `-o`).
2. **`<structure>`** — the structure/hemisphere tag, one of `RA`, `LA`, `RH`, `LH` (right/left amygdala, right/left hippocampus). This becomes the surface-file prefix and selects which label the vertices expect on their "home" side ([`mrisFindneighborlabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L477-L530)).

`$SUBJECTS_DIR` must be set or the program exits ([`:144-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L144-L148)).

### Input Assumptions

> [!assumption] A conformed 256³ aseg and a precomputed initial surface
> The label volume is treated as a 256×256×256 volume: the per-label channel volumes are allocated at `MRIalloc(256,256,256,…)` ([`:431-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L431-L435)) and the smoothing buffers likewise ([`:218-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L218-L222)). The aseg must be the standard conformed FreeSurfer segmentation containing labels 17/18/53/54. An **initial tessellation** `surf/<structure>.hippocampus.orig` must already exist; this tool deforms it but does not create it.

> [!assumption] Surface vertices start near their label boundary
> The label term assumes each vertex sits at (or just inside) the boundary of its structure: it looks a short distance along the outward normal to identify the "outside" label and a short distance inward for the "inside" label ([`mrisFindneighborlabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L488-L527)). A wildly wrong initial surface will not be rescued.

## Outputs

### Files Created

All paths are under `$SUBJECTS_DIR/<subject>/surf/` ([`:401-413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L401-L413)):

| File | Contents |
|------|----------|
| `<structure>.hippocampus` | the refined surface (default suffix `hippocampus`, changeable with `-s`) |
| `<structure>.hippocampus.curv` | mean curvature of the refined surface |
| `surf/movie/<structure>.firstrefined<NNN>` | per-iteration snapshots of the deformation phase, **only when `-w N` is set** ([`:306-316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L306-L316)) |
| `surf/movie/<structure>.refined<NNN>` | per-iteration snapshots of the spike-removal / smoothing phases, **only when `-w N` is set** ([`:342-398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L342-L398)) |

> [!gotcha] A debug ellipsoid is written to a hard-coded absolute path
> Independent of the user's data, the program builds an "ellipsoid" volume and writes it to a **hard-coded absolute path on the original developer's filesystem** (`/autofs/space/dijon_004/ksong/.../001009_vc5398/surf/ellipsoid.mgh`) inside an "added temporarily" block ([`:161-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L161-L172)). On any other machine this write will fail (and may abort the run) because the directory does not exist. This is leftover debug code, not intended behaviour.

### Output Specifications

The output surface has the same connectivity as the input `.orig` tessellation; only vertex positions and the derived curvature change. The `surf/movie/` directory must exist for snapshot writing to succeed.

## Mathematical Foundations

Each iteration computes a gradient (the sum of several force terms) at every vertex, caps the step length, takes a momentum step, and re-evaluates a scalar energy; iteration stops when the relative energy change falls below a threshold or a step cap is reached.

> [!math] Total deformation energy
> The surface minimises a weighted sum of six terms ([`:247-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L247-L249), [`:299-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L299-L301)):
> $$ E = w_\text{label}E_\text{label} + w_\text{quadcur}E_\text{quadcur} + w_\text{repulse}E_\text{repulse} + w_\text{Nspring}E_\text{N} + w_\text{Tspring}E_\text{T} + w_\text{Gspring}E_\text{G}. $$
> Default weights are `w_quadcur = 1.2, w_label = 1.2, w_repulse = 3.0, w_Nspring = 0.5, w_Tspring = 0.5` ([`:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L102)) and `w_Gspring = 0` ([`:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L95)). The repulsion weight is forced to 0 on the first (coarsest) smoothing pass ([`:216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L216)).

> [!math] Label term
> For each vertex the surround ("outside") and interior ("inside") label channels are sampled half a voxel along $\pm\hat n$, and a directional derivative of the smoothed label field along the normal is taken ([`mrisComputeLabelTerm1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L588-L617)). The force drives the vertex so both samples approach the in-structure value 1:
> $$ \mathbf{f}_\text{label} = w_\text{label}\,\big[(1-\ell_\text{out})\,\partial_n s_\text{out} + (1-\ell_\text{in})\,\partial_n s_\text{in}\big]\,\hat n, $$
> and the corresponding energy ([`mrisComputeLabelEnergy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L836-L858)) is
> $$ E_\text{label} = \sum_v (1-\ell_\text{out})^2 + (1-\ell_\text{in})^2, $$
> where $\ell_\text{out}/\ell_\text{in}$ are the nearest-neighbour label samples just outside/inside the surface and $s$ the Gaussian-smoothed label channel.

> [!math] Quadratic-curvature term
> A local 1D quadratic $z = a\,r^2 + b$ is least-squares-fit (via [`MatrixPseudoInverse`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1064)) to neighbour heights above the tangent plane, and the vertex is moved along the normal by $b$ ([`mrisComputeQuadraticCurvatureTerm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1027-L1093)); the energy is $\sum_v b^2$. This smooths the surface toward local flatness while respecting its tangent frame ([`my_mrisComputeTangentPlanes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1729-L1780)).

> [!math] Spring terms
> The **normal spring** moves a vertex along $\hat n$ by the normal component of the mean neighbour offset ([`mrisComputeNormalSpringTerm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L627-L679)); the **tangential spring** removes the normal component and moves in-plane ([`mrisComputeTangentialSpringTerm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L722-L778)). Writing $\mathbf{s}=\frac1n\sum_{j\in N(i)}(\mathbf{x}_j-\mathbf{x}_i)$ and $n_c=\mathbf{s}\cdot\hat n$, the forces are $w\,n_c\hat n$ (normal) and $w(\mathbf{s}-n_c\hat n)$ (tangential). The **Gaussian-curvature spring** scales the spring by $\min(K^{\,\gamma},1)$ so smoothing is stronger where Gaussian curvature $K$ is large ([`mriSspringTermWithGaussianCurvature`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1385-L1438), exponent `gaussian_norm`, default 2.0).

> [!math] Self-repulsion ($r^{-7}$ force)
> Using a spatial hash table of vertices, non-neighbour vertices within a bucket repel each other with an inverse-7th-power force ([`mrisComputeRepulsiveTerm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1244-L1322)):
> $$ \mathbf{f}_\text{rep} \propto -\frac{4K_r}{(d+\varepsilon)^7}\,\hat d, \qquad E_\text{rep}=\sum \frac{K_r}{(d+\varepsilon)^6}, $$
> with $K_r=1$, $\varepsilon=0.5$ ([`:52-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L52-L55)). This prevents the deforming sheet from passing through itself.

> [!math] Step control and momentum
> Each step length is capped (`threshold/step_size`, with `step_size` ramped from 0.1 up to 1 over the first ~1000 iterations) and combined with momentum 0.2 and a hard 1 mm momentum cap ([`mrisExaminemovelength`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1166-L1241), [`:262-265`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L262-L265)). The deformation loop converges when the relative energy change $\le 10^{-4}$ or after 5000 iterations ([`:252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L252)).

> [!internal] Curvature, hashing, and matrix math are library code
> [`MRIScomputeSecondFundamentalForm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L370), [`MHTcreateVertexTable_Resolution`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L204), [`MatrixPseudoInverse`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1064), and the Gaussian convolution come from the surface/matrix libraries; the force/energy terms themselves are local to this file. See [[surface-representations]].

## Configuration Options

### Complete Flag Reference

Parsed in [`get_option()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1522-L1595). All flags are single-letter (case-insensitive); each consumes its trailing argument(s) as listed. Note that `--help`/`--version` are **not** recognised (they are reported as unknown options).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-a` | flag | off | "All" mode: tessellate/operate on the surface of all voxels with differing labels (sets `all_flag`) ([`:1530-1533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1530-L1533)). |
| `-g` | float | `2.0` | Exponent `gaussian_norm` of the Gaussian-curvature spring (controls how strongly high-curvature regions are smoothed) ([`:1534-1538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1534-L1538)). |
| `-w` | int | `0` (off) | Write a surface snapshot to `surf/movie/` every N iterations (`write_iterations`) ([`:1539-1543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1539-L1543)). |
| `-n` | int | `0` | Number of final Gaussian-curvature smoothing iterations after spike removal (`niteration`) ([`:1544-1548`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1544-L1548)). |
| `-c` | float | `0.0` | Weight `weight_Gspring` of the Gaussian-curvature spring term in the main energy ([`:1549-1553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1549-L1553)). |
| `-s` | string | `hippocampus` | Suffix/basename of the output surface and curvature files ([`:1554-1558`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1554-L1558)). |
| `-l` | string | `mri/aseg` | Path (relative to the subject dir) of the input segmentation volume ([`:1559-1563`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1559-L1563)). |
| `-o` | string | `hippocampus.orig` | Basename of the initial input tessellation, read as `surf/<structure>.<orig_name>` ([`:1564-1568`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1564-L1568)). |
| `-p` | float×5 | `1.2 1.2 3.0 0.5 0.5` | Override the five main term weights in order: `quadcur label repulse Nspring Tspring` ([`:1569-1577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1569-L1577)). |
| `-m` | int | `500` | Number of spike-smoothing iterations (`smooth_spikes`) ([`:1578-1582`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1578-L1582)). |
| `-u`<br>`-?` | flag | — | Print a one-line usage and exit ([`:1583-1587`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1583-L1587)). |

### Configuration Interactions

> [!gotcha] `-p` sets only five of the six weights; `-c` sets the sixth
> `-p` overrides `quadcur/label/repulse/Nspring/Tspring` ([`:1569-1577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1569-L1577)) but **not** the Gaussian-curvature-spring weight, which is controlled separately by `-c` ([`:1549-1553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1549-L1553)). To change all six energy weights you must use both flags. The order of the five `-p` values is fixed and unlabelled — get it wrong and the deformation misbehaves silently.

> [!gotcha] Repulsion is disabled on the first smoothing pass regardless of `-p`
> Whatever `weight_repulse` you set, it is forced to 0 during the coarsest (first of four) smoothing passes ([`:216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L216)) and only takes effect from the second pass onward.

> [!gotcha] `-w 0` (the default) means no snapshots at all
> Snapshot writing is gated on `write_iterations > 0` ([`:306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L306), [`:342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L342), [`:374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L374)); with the default `-w 0`, `surf/movie/` is never written. When you do enable it, create `surf/movie/` first.

- `-g` (the exponent) and `-c` (the weight) both govern the Gaussian-curvature spring and are independent: `-c 0` (default) disables the term entirely in the **main** loop irrespective of `-g`, but the **final** smoothing pass (`-n`) always uses the Gaussian-curvature spring with weight 1 ([`:371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L371)).
- `-m 0` skips the spike-removal phase; `-n 0` skips the final Gaussian-smoothing phase. Both default to running (500 and 0 respectively — note `-n` defaults to 0, i.e. the final-smoothing phase is **off** by default).
- `-l` and `-o` redirect the two inputs; the structure tag still prefixes the surface filename, so `-o foo` reads `surf/<structure>.foo`.

## Typical Use Cases

### Use Case 1: Fit a surface to the left hippocampus

```bash
export SUBJECTS_DIR=/data/hippo_study
# requires surf/LH.hippocampus.orig and mri/aseg to already exist
hiam_make_surfaces subj01 LH
# -> surf/LH.hippocampus and surf/LH.hippocampus.curv
```

### Use Case 2: Right amygdala with custom term weights and a movie

```bash
mkdir -p $SUBJECTS_DIR/subj01/surf/movie
hiam_make_surfaces -p 1.0 1.5 2.0 0.4 0.4 -w 50 subj01 RA
# snapshots every 50 iterations in surf/movie/
```

### Use Case 3: Heavier final smoothing, fewer spike iterations

```bash
hiam_make_surfaces -m 200 -n 50 -c 0.3 subj01 LH
# 200 spike-removal iters, then 50 Gaussian-curvature smoothing iters
```

## Pipeline Context

**Predecessor:** the FreeSurfer segmentation that produces `mri/aseg` (containing labels 17/18/53/54) plus an upstream step that creates the initial `surf/<structure>.hippocampus.orig` tessellation → **hiam_make_surfaces** (refined `surf/<structure>.hippocampus`) → **Successors:** spherical mapping of that surface, then [[hiam_make_template]] (cohort template) and [[hiam_register]] (cross-subject registration).

It is not part of [[wiki/pipelines/recon-all|recon-all]]. It is the label-driven, subcortical analogue of the intensity-driven cortical [[mris_make_surfaces]].

## Gotchas and Caveats

> [!gotcha] Hard-coded developer paths in the as-shipped source
> Besides the [debug ellipsoid write](#files-created) to an absolute path ([`:161-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L161-L172)), the program is clearly a research artefact: it will attempt that write on every run. On a machine where `/autofs/space/dijon_004/...` is absent, the [`MRIwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L171) is expected to fail. Treat this tool as experimental and verify it on your data before relying on it.

> [!gotcha] `--help` / `--version` are not handled
> Unlike most FreeSurfer tools, `get_option` here has no `--help`/`--version` cases, so `hiam_make_surfaces --help` prints `unknown option --help` ([`:1588-1591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1588-L1591)). Use `-u` for the one-line usage. The usage strings themselves disagree slightly (one says `<structure: RA LA RH LH>`, another `<input Subject> <label>`).

> [!gotcha] The `<structure>` tag must be exactly RA/LA/RH/LH
> The structure-to-label mapping matches the tag against the fixed table `{"lh","rh","LA","RA","OTHER"}` ([`:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L106), used in [`mrisFindneighborlabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L484-L486)); the surface filename uses the tag verbatim. A mismatched or lowercase tag will read/write the wrong filenames and misassign the "home" label.

> [!gotcha] Four hard-wired smoothing passes at sigma 2.0 → 0.5
> The main deformation always runs exactly four passes with the label volume blurred at `sigma = 2.0, 1.5, 1.0, 0.5` ([`:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L108), [`:212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L212), [`:332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L332)); there is no flag to change the count or the schedule.

## Error Compensation and Guard Rails

- **Missing `$SUBJECTS_DIR` aborts** with a message ([`:144-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L144-L148)); an unreadable initial surface aborts via `ErrorExit` ([`:182-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L182-L184)).
- **Per-step length capping** keeps any single vertex move bounded (`threshold/step_size`) and the momentum step capped at 1 mm ([`mrisExaminemovelength`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1176-L1234)), preventing the surface from exploding when a force is locally large.
- **Self-repulsion** actively prevents self-intersection of the deforming sheet ([`mrisComputeRepulsiveTerm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1244-L1322)).
- **Spike detection and smoothing** (the `-m` phase) explicitly hunts vertices with extreme curvature ($|\text{curv}|\ge3$, $K^2\ge4$, etc.), snapping the worst ones back toward their original position on the first iteration and locally averaging them thereafter ([`FindSpikes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1783-L1835) / [`SmoothSpikes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L1837-L1944)).
- **Convergence cap** of 5000 iterations per pass and a relative-energy threshold of $10^{-4}$ stop runaway loops ([`:252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L252)).

## Related Tools

- [[mris_make_surfaces]] — the cortical original: deforms a white-matter surface to image boundaries using intensity rather than labels. The closest reference for the optimisation framework reused here.
- [[hiam_make_template]] — builds a cohort template from the surfaces this tool produces (after spherical mapping).
- [[hiam_register]] — registers an individual hippocampal surface to that template.
- [[color-lut]] — defines the aseg label values (17/18/53/54) this tool keys on.

## Confidence and Gaps

**High confidence:** the two positional arguments and the RA/LA/RH/LH tag, the label-to-channel mapping (17/53/18/54 → 0/1/2/3), the six energy terms and their default weights, the four hard-wired smoothing passes, the full flag set with defaults, the spike-removal and final-smoothing phases, and the hard-coded debug write — all read directly from [`hiam_make_surfaces.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp).

> [!gap] Provenance of the initial `.orig` tessellation
> This tool deforms `surf/<structure>.hippocampus.orig` but does not create it, and no script in the v8.2.0 tree builds it. The upstream step that produces the initial hippocampal/amygdala tessellation (e.g. marching-cubes on the label) is unresolved from the source available here.

> [!gap] Whether maintained builds patch the hard-coded paths
> The absolute output path and embedded subject id ([`:161-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp#L161-L172)) are present in the v8.2.0 source. Whether a given installed binary still executes that write (or was patched) was not verified at runtime here.

## References

- FreeSurfer source: [`hiam_make_surfaces/hiam_make_surfaces.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_surfaces/hiam_make_surfaces.cpp) (v8.2.0).
- Cortical original: [`mris_make_surfaces/mris_make_surfaces.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_make_surfaces.cpp).
- A. M. Dale, B. Fischl, M. I. Sereno, "Cortical surface-based analysis I: Segmentation and surface reconstruction," *NeuroImage* 9:179–194, 1999 — the deformable-surface framework adapted here.
