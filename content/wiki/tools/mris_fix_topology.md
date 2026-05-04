---
title: "mris_fix_topology"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_fix_topology/mris_fix_topology.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_sphere]]"
  - "[[mris_inflate]]"
  - "[[mris_defects_pointset]]"
  - "[[surface-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "The retessellation mode details (greedy vs. genetic search) need deeper documentation from the topology fixing library."
  - "The nVFMultiplier parameter (default 1.1) purpose for overallocating the surface vertex/face arrays needs confirmation."
tags:
  - surface
  - topology
  - autorecon2
  - critical
  - defect-repair
---

# mris_fix_topology

## Summary

`mris_fix_topology` is a critical `recon-all` AutoRecon2 tool that corrects [[topology-correction|topological defects]] (handles and holes) in the initial cortical surface tessellation. The cortex is topologically equivalent to a sphere (genus-0 surface, Euler number $\chi = 2$); any departure from this indicates a defect. The tool uses a **spherical parameterisation** (from `mris_sphere`) to identify the defects and then applies a **greedy search** (or optionally genetic algorithm) to find a topologically correct retessellation within each defect region.

## Source Information

- **Language:** C++
- **Primary source:** `mris_fix_topology/mris_fix_topology.cpp`
- **Original author:** Bruce Fischl; algorithm by Florent Segonne
- **Key references:**
  - Segonne, Grimson & Fischl, "Topology Correction of Subcortical Segmentation," MICCAI 2003.
  - Segonne, Grimson & Fischl, "Genetic Algorithm for the Topology Correction of Cortical Surfaces," IPMI 2005, pp. 393–405.

## Purpose and Context

After initial surface tessellation (`mri_tessellate` / `mri_pretess`), the raw surface (`orig.nofix`) frequently contains topological defects. These arise from imaging artefacts, thin cortical gyri that are partially volume-averaged, or MRI signal voids. Defects manifest as **handles** (extra topology connecting two separate sheet regions) or **holes** (gaps in an otherwise closed surface).

A topologically incorrect surface cannot be reliably inflated to a sphere (`mris_sphere` fails or produces degenerate results), and downstream parcellation is unreliable. `mris_fix_topology` repairs the surface before any other processing, ensuring all subsequent operations work on a genus-0 surface.

The process:
1. Reads the spherical parameterisation (`qsphere.nofix`) and the inflated surface (`inflated.nofix`).
2. Computes the Euler number $\chi$ of the input surface; any deviation from 2 indicates defects ($g = (2-\chi)/2$ handles).
3. For each topological defect, identifies a patch of the surface containing the defect.
4. Searches for a topologically correct replacement patch (retessellation) using greedy search or a genetic algorithm.
5. Outputs the corrected surface (`orig`), preserving vertex positions while correcting the connectivity.

## Inputs

The tool reads files from the standard FreeSurfer subject directory layout based on the `<subject name>` and `<hemisphere>` arguments:

| File | Path | Description |
|------|------|-------------|
| Spherical surface | `surf/<hemi>.qsphere.nofix` | Spherical parameterisation of the original surface. |
| Inflated surface | `surf/<hemi>.inflated.nofix` | Inflated version of the original surface. |
| Original surface | `surf/<hemi>.orig.nofix` | Raw tessellated surface to be corrected. |
| Brain volume | `mri/brain.mgz` | T1-weighted brain volume (used for intensity-guided retessellation). |
| WM volume | `mri/wm.mgz` | White matter mask volume. |
| Defect files | `surf/<hemi>.defect_*` | Defect label, convex hull, and border files (optional prefix via `-defect`). |

## Outputs

| File | Path | Description |
|------|------|-------------|
| Corrected surface | `surf/<hemi>.orig` (default) | Topologically correct surface. |
| Inflated fixed (optional) | `surf/<hemi>.inflated` | Fixed inflated surface (when `-wi` is used). |
| Defect labels | `surf/<hemi>.defect_labels` | Label file marking defect vertex memberships (written by `mris_sphere` prior). |

## Mathematical Foundations

### Euler Number and Topology

For a closed orientable surface, the Euler number is:

$$
\chi = V - E + F = 2 - 2g
$$

where $V$ = vertices, $E$ = edges, $F$ = faces, $g$ = genus (number of handles). A cortical hemisphere is topologically a sphere ($g = 0$, $\chi = 2$). Any defect increases the genus. The code prints:

```
before topology correction, eno=X (nv=N, nf=F, ne=E, g=G)
```

where $G = (2 - \chi)/2$ is the number of topological handles to remove.

### Defect Detection via Spherical Parameterisation

Using the spherical parameterisation $\phi: \mathcal{S} \to S^2$ (computed by `mri_sphere` / `mri_qsphere`), defects appear as regions where the mapping is **not injective** — multiple surface patches map to the same region on the sphere, or the mapping reversal indicates an inconsistent orientation. These overlapping regions are identified as topological defects.

### Retessellation Search

For each defect, the algorithm:
1. Identifies the defect patch (set of faces involved in the topological inconsistency).
2. Computes the **convex hull** of the defect boundary in the spherical parameterisation.
3. Searches for a topologically consistent retessellation of the defect patch that:
   - Maintains genus 0 locally.
   - Minimises a cost combining MRI intensity adherence (brain/wm volumes), curvature smoothness, and surface area.

The default search is **greedy** (`GREEDY_SEARCH`). The genetic algorithm (`-genetic` / `-ga`) explores a larger space of retessellations using evolutionary optimisation, at higher computational cost.

The cost functional used in the retessellation search includes terms:

$$
E = l_{\text{mri}} \cdot E_{\text{MRI}} + l_{\text{curv}} \cdot E_{\text{curv}} + l_{\text{qcurv}} \cdot E_{\text{Qcurv}} + l_{\text{unmri}} \cdot E_{\text{unmri}}
$$

Default weights: $l_{\text{mri}} = l_{\text{curv}} = l_{\text{qcurv}} = l_{\text{unmri}} = 1$.

## Configuration Options

### Positional Arguments

| Argument | Description |
|----------|-------------|
| `<subject name>` | FreeSurfer subject identifier. |
| `<hemisphere>` | `lh` or `rh`. |

### Optional Flags

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-orig <name>` | string | `orig.nofix` | Input surface name. |
| `-sphere <name>` | string | `qsphere.nofix` | Spherical surface name (alias: `-name`). |
| `-name <name>` | string | `qsphere.nofix` | Alias for `-sphere`. |
| `-inflated <name>` | string | `inflated.nofix` | Inflated surface name. |
| `-out <name>` | string | `orig` | Output surface name. |
| `-defect <basename>` | string | `defect` | Base name for defect files. |
| `-brain <name>` | string | `brain.mgz` | Brain volume name. |
| `-wm <name>` | string | `wm.mgz` | White matter segmentation volume name. |
| `-surf <dir>` | string | `surf/` | Surf subdirectory override. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `-suffix <sfx>` | string | — | Append suffix to output file names. |
| `-wi` | — | off | Also write a fixed inflated surface. |
| `-add` | — | off | Add vertices after retessellation. |
| `-noadd` | — | off | Do not add vertices after retessellation. |
| `-mgz` | — | on | Assume volumes are in MGZ format. |
| `-nomgz` | — | off | Disable MGZ volume format assumption. |
| `-verbose` | — | off | Enable verbose output (default mode). |
| `-verbose_low` | — | off | Low-verbosity output mode. |
| `-warnings` | — | off | Print warnings (medium verbose mode). |
| `-errors` | — | off | Exit when warnings appear (high verbose mode). |
| `-movie` | — | off | Save movie frames for debugging. |
| `-intersect <0/1>` | int | 0 | Check if final surface self-intersects. |
| `-mappings <0/1>` | int | 0 | Generate multiple topology-fix mappings. |
| `-correct_defect <N>` | int | — | Correct only defect number N; skip all others. |
| `-diag` | — | off | Enable diagnostic saves (`DIAG_SAVE_DIAGS`). |
| `-diagonly` | — | off | Save diagnostics and exit immediately. |
| `-niters <N>` | int | — | Stop genetic algorithm after N iterations. |
| `-genetic` | — | off | Use genetic algorithm for retessellation search. |
| `-ga` | — | off | Use genetic algorithm with optimised parameters. |
| `-optimize` | — | off | Use genetic algorithm with an alternate optimised parameter set. |
| `-random <N>` | int | — | Use random search with N iterations instead of greedy or genetic. |
| `-match <0/1>` | int | 1 | Match patch onto surface using local intensities. |
| `-smooth <mode>` | int | 2 | Smooth patch with specified mode (0 = off). |
| `-select <0/1>` | int | 1 | Use qsphere to infer initial solutions (0 = random). |
| `-save <dir> <N>` | string+int | — | Save retessellation results for defect N (or all if N<0). |
| `-eliminate <0/1>` | int | 1 | Eliminate less-used vertices during search. |
| `-keep <0/1>` | int | 0 | Keep every vertex in the defect before search. |
| `-variable <0/1>` | int | 0 | Use ordering-dependent final vertex count. |
| `-edge_table <0/1>` | int | 1 | Use precomputed edge table. |
| `-patches <N>` | int | — | Number of defect patches per generation (genetic search). |
| `-generations <N>` | int | — | Terminate genetic search after N generations without change. |
| `-mri <w>` | float | 1.0 | Weight for MRI intensity cost term ($l_{\text{mri}}$). |
| `-curv <w>` | float | 1.0 | Weight for curvature cost term ($l_{\text{curv}}$). |
| `-qcurv <w>` | float | 1.0 | Weight for quadratic curvature cost term ($l_{\text{qcurv}}$). |
| `-unmri <w>` | float | 1.0 | Weight for unmapped-MRI cost term ($l_{\text{unmri}}$). |
| `-vol <N>` | int | — | Volume resolution for MRI-guided retessellation. |
| `-int` | — | off | Enable intensity-guided retessellation (sets noint=0). |
| `-sphere_smooth <N>` | int | — | Smooth spherical representation for N iterations before processing. |
| `-seed <N>` | int | — | Set random number generator seed. |
| `-s <N>` | int | 5 | Smooth corrected surface for N iterations after correction. |
| `-openmp <N>` | int | — | Set number of OpenMP threads (alias: `-threads`). |
| `-threads <N>` | int | — | Set number of OpenMP threads (alias: `-openmp`). |
| `-v <D>` | int | — | Set diagnostic level to D (`Gdiag_no`). |
| `-rusage <file>` | string | — | Resource usage file (accepted and ignored). |

## Configuration Interactions

- `-genetic` / `-ga` / `-optimize` are variants of the evolutionary search. All three switch the search mode to `GENETIC_SEARCH`; `-ga` and `-optimize` additionally preset several parameters (smooth=2, match=1, volume_resolution=2, l_unmri=10.0). Only one should be used at a time.
- `-random N` is an alternative to both greedy and genetic search; it evaluates N random retessellations and picks the best.
- `-correct_defect N` is useful for debugging specific defects. If specified, only that defect is repaired.
- `-niters N` only applies to the genetic algorithm; it is ignored for greedy search.
- `-s N` applies post-correction smoothing, which can help if the corrected patch introduces sharp features. Default is `nsmooth = 5` iterations.
- OpenMP threading (`-threads N`) parallelises the defect correction across multiple defects when multiple defects are present.

> [!gotcha] Greedy vs. genetic
> The greedy search (default) is fast but may produce suboptimal topology corrections when defects are complex or large. The genetic algorithm produces better results for difficult cases but is substantially slower. `recon-all` uses the default greedy search.

## Typical Use Cases

### Standard usage (as called by recon-all)

```bash
mris_fix_topology -mgz -orig orig.nofix -sphere qsphere.nofix \
  subject01 lh
```

### Debug a single defect

```bash
mris_fix_topology -mgz -correct_defect 3 -verbose \
  subject01 lh
```

### Use genetic algorithm for difficult cases

```bash
mris_fix_topology -mgz -genetic -niters 100 \
  subject01 lh
```

### Check for self-intersections in output

```bash
mris_fix_topology -mgz -intersect subject01 lh
```

## Pipeline Context

`mris_fix_topology` is called in `recon-all` **AutoRecon2**, between spherical parameterisation and surface placement:

| Step | Tool | Output |
|------|------|--------|
| Tessellation | `mri_tessellate` | `lh.orig.nofix` |
| Smoothing | `mris_smooth` | `lh.smoothwm.nofix` |
| Inflation | `mris_inflate` | `lh.inflated.nofix` |
| Spherical mapping | `mri_qsphere` | `lh.qsphere.nofix` |
| **Topology fix** | **`mris_fix_topology`** | **`lh.orig`** |
| Surface placement | `mris_make_surfaces` | `lh.white`, `lh.pial` |

The corrected `lh.orig` is the starting point for all subsequent surface processing. The `.nofix` surfaces are kept as intermediate files for diagnostic purposes.

**Runs before:** [[mris_make_surfaces]], [[mris_smooth]] (second pass), [[mris_inflate]] (second pass)
**Runs after:** [[mris_inflate]] (first pass, nofix), [[mris_sphere]] (qsphere step)
**Related pipeline:** [[wiki/pipelines/recon-all|recon-all]]

## Gotchas and Caveats

> [!gotcha] Surface genus must be zero for downstream tools
> `mris_sphere` assumes the surface is genus-0. If `mris_fix_topology` fails to fully correct the topology, `mris_sphere` will produce a degenerate result and the entire pipeline will fail. Check the Euler number in the tool's output.

> [!gotcha] Large defect count indicates upstream problems
> If the tool reports many handles ($g > 10$), this almost certainly indicates a problem in the skull stripping or WM segmentation step, not a fixable surface issue. Inspect the `brain.mgz`, `wm.mgz`, and `filled.mgz` files.

> [!gotcha] nVFMultiplier overallocation
> The source reads the input surface with `MRISreadOverAlloc(fname, nVFMultiplier=1.1)`, allocating 10% extra space in vertex and face arrays to accommodate the retessellation without reallocation. This is an implementation detail but explains why the corrected surface may have a different vertex/face count than the input.

> [!gotcha] Output surface name
> The default output name is `orig` (not `orig.nofix`). The corrected surface overwrites the destination path. If you want to preserve the original nofix surface separately, ensure it is not in the same location as the output.

> [!gotcha] Intensity scaling
> If the brain volume has intensities > 255 (e.g., from some acquisition protocols), the tool automatically scales them down: `MRIscalarMul(mri, mri, 255/fmax)`. This scaling is applied to the local copy used by the algorithm and does not modify the volume on disk.

## Related Tools

- [[mris_sphere]] — produces the spherical parameterisation (`qsphere.nofix`) required as input
- [[mris_inflate]] — produces the inflated surface (`inflated.nofix`) required as input
- [[mris_make_surfaces]] — placed after topology correction; requires a genus-0 surface
- [[mris_defects_pointset]] — creates a pointset visualisation of defect locations
- [[surface-format]] — FreeSurfer surface file format
- [[wiki/pipelines/recon-all|recon-all]] — pipeline orchestrator

## Confidence and Gaps

Confidence is **high** for the overall algorithm, the flag list (from help XML and source code), and the pipeline context. Confidence is **medium** for the detailed energy functional weights and the exact retessellation algorithm implementation.

> [!gap] Retessellation algorithm details
> The topology fixing algorithm is largely implemented in the `mrisurf` topology library rather than in `mris_fix_topology.cpp` itself. The exact mechanism of the greedy retessellation search (candidate generation, acceptance criterion) requires reading the topology-fixing library code.

> [!gap] Genetic algorithm parameters
> The genetic algorithm parameters (`max_patches`, `max_unchanged`, `niters`) and their effect on correction quality vs. runtime have not been systematically documented. Empirical data from the FreeSurfer mailing list would be valuable here.
