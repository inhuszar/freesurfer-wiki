---
title: "mris_remesh"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_remesh/mris_remesh.cpp"
  - "mris_remesh/remesher.cpp"
  - "mris_remesh/remesher.h"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_remove_intersection]]"
  - "[[mris_resample]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The specific remeshing algorithm (BK = Botsch-Kobbelt?) used in Remesher class not confirmed"
tags:
  - surface
  - remeshing
  - mesh-quality
  - decimation
---

# mris_remesh

## Summary

`mris_remesh` changes the vertex density and mesh quality of a cortical surface without altering its overall shape. Given a target criterion (number of vertices, edge length, or face area), it resamples the input surface to produce a new mesh satisfying that criterion. After remeshing, self-intersections are automatically removed using `MRISremoveIntersections`. Mesh quality statistics are printed to stdout.

## Source Information

- **Language:** C++
- **Source files:** `mris_remesh/mris_remesh.cpp`, `mris_remesh/remesher.cpp`, `mris_remesh/remesher.h`
- **Key class:** `Remesher` — encapsulates BK (Botsch-Kobbelt or similar) remeshing algorithm
- **Methods:** `remeshBKV(iters, nverts)`, `remeshBK(iters)`, `remeshBK(iters, edgelength)`

## Purpose and Context

FreeSurfer cortical surfaces are typically produced with a fixed vertex density tied to the input MRI resolution (~120,000–165,000 vertices per hemisphere for standard 1 mm data). For some applications:
- A coarser surface is needed (e.g., for atlas templates, computational efficiency)
- A finer surface is needed (e.g., for sub-mm MRI data)
- The existing mesh has poor quality (elongated triangles, high aspect ratio faces) that should be improved

`mris_remesh` addresses all three by applying an iterative remeshing algorithm that redistributes vertices while preserving surface shape.

## Inputs

- `--input` (`-i`) — input surface file (FreeSurfer binary format)

Exactly one of the following target specifications:
- `--nvert N` — target number of vertices
- `--edge-len L` — target average edge length (mm)
- `--desired-face-area A` — target average face area (mm²)
- `--remesh` — improve quality without significantly changing vertex count

## Outputs

- `--output` (`-o`) — output remeshed surface (FreeSurfer binary format)
- Mesh quality statistics printed to stdout: vertex counts, edge metrics, face metrics, corner metrics

## Mathematical Foundations

The `Remesher` class implements iterative remeshing. For the vertex-count target (`remeshBKV`):

1. The target edge length is estimated from the desired number of vertices:
$$
   \ell_{target} = \sqrt{\frac{A_{total}}{(3/4) \cdot N_{target}}}
$$
   (from the relationship between equilateral triangle area and edge length)

2. For the face area target (`--desired-face-area`), the decimation level is:
$$
   \text{decimation} = \frac{\bar{A}_{face,input}}{A_{desired}}
$$
$$
   N_{target} = \text{round}(N_{input} \cdot \text{decimation})
$$

3. After remeshing, `MRISremoveIntersections(remeshed, 0)` is called to fix any self-intersections introduced by the remeshing.

Quality metrics computed by `MRISfaceMetric`, `MRISedgeMetric`, `MRIScornerMetric`, `MRISprettyPrintSurfQualityStats`.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i` / `--input` | surface file | — | Input surface file (required) |
| `-o` / `--output` | surface file | — | Output remeshed surface file (required) |
| `--nvert` | integer | — | Target number of vertices |
| `--edge-len` | float (mm) | — | Target average edge length (mm) |
| `--desired-face-area` | float (mm²) | — | Target average face area (mm²) |
| `--remesh` | — | `off` | Quality improvement without significantly changing vertex count |
| `--iters` | integer | `5` | Number of remeshing iterations |

The four target options (`--nvert`, `--edge-len`, `--desired-face-area`, `--remesh`) are mutually exclusive; exactly one must be specified.

> [!note] Complete flag list
> The source code (`mris_remesh.cpp`) registers exactly these seven flags via `parser.addArgument()`. There is no `--x` flag or any other undocumented option in this tool.

## Configuration Interactions

- `--iters` applies to all remeshing modes; more iterations give better quality but take longer.
- After remeshing, intersections are always removed regardless of the target specification.
- `MRISremoveIntersections` is called with argument 0 (no fill-holes mode).

> [!gotcha] Mutually exclusive targets
> Specifying more than one of `--nvert`, `--edge-len`, `--desired-face-area`, `--remesh` causes the tool to exit with: "must only specify one remeshing target".

## Typical Use Cases

```bash
# Remesh to 40,000 vertices
mris_remesh -i lh.white -o lh.white.40k --nvert 40000

# Remesh to uniform 2mm edge length
mris_remesh -i lh.white -o lh.white.2mm --edge-len 2.0

# Improve mesh quality without changing vertex count (10 iterations)
mris_remesh -i lh.white -o lh.white.quality --remesh --iters 10

# Remesh to target face area of 4 mm²
mris_remesh -i lh.white -o lh.white.coarse --desired-face-area 4.0
```

## Pipeline Context

Not part of `recon-all`. Used in research workflows when:
- Creating atlas surfaces with non-standard resolution
- Preparing surfaces for numerical simulation (FEM meshes)
- Reducing computational cost of downstream surface analysis
- Improving mesh quality before registration

## Gotchas and Caveats

> [!gotcha] Volume geometry is preserved via MRIScopymeta
> After remeshing, `MRIScopymeta(surf, remeshed)` copies metadata from the original surface to the remeshed surface, preserving volume geometry information (vox2ras, etc.).

> [!gotcha] Intersection removal may fail
> Self-intersections introduced by remeshing are removed with `MRISremoveIntersections`, but in extreme cases this may not fully eliminate all intersections. The final output should be verified.

> [!gotcha] Face area target uses approximation
> The `--desired-face-area` mode computes a target vertex count from the average face area of the input surface. If the input surface has highly non-uniform face sizes, this estimate will be inaccurate.

## Related Tools

- [[mris_remove_intersection]] — standalone tool for removing self-intersections (also called internally)
- [[mris_resample]] — resamples surface to a different icosahedral tessellation (changes topology, not just density)
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**Confident (from code):** All flags confirmed from `argparse` calls in source; `Remesher` class methods `remeshBKV`, `remeshBK`; `MRISremoveIntersections` called after remeshing; `MRIScopymeta` for metadata; quality stats printed; default `iters=5`.

**Uncertain:** The specific algorithm inside `Remesher` (whether "BK" refers to Botsch-Kobbelt 2004 or another method).

> [!gap] The remeshing algorithm implementation in `remesher.cpp` was not read. The specific algorithm (BK may refer to Botsch-Kobbelt 2004 "A Remeshing Approach to Multiresolution Modeling") should be confirmed.
