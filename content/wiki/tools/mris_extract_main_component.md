---
title: "mris_extract_main_component"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mc/mris_extract_main_component.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_tessellate]]"
  - "[[mris_euler_number]]"
  - "[[mris_fix_topology]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - topology
  - tessellation
  - connected-components
  - recon-all
---

# mris_extract_main_component

## Summary

`mris_extract_main_component` extracts the largest connected component from a FreeSurfer surface mesh, discarding all smaller disconnected components. It is called by `recon-all` in **autorecon2** immediately after `mri_tessellate` to remove the small surface fragments that are inevitably produced during marching-cubes tessellation of the white matter segmentation.

## Source Information

- **Language:** C++
- **Source file:** `mri_mc/mris_extract_main_component.cpp`
- **Author:** Florent Segonne
- **Key library call:** `MRISextractMainComponent()`

## Purpose and Context

When `mri_tessellate` (or its marching-cubes equivalent) generates a surface from a binary volume, small isolated pieces of mesh are often produced at the boundaries of the segmentation, particularly where small WM islands exist. These fragments would corrupt downstream topology analysis and correction. `mris_extract_main_component` retains only the largest connected mesh, which corresponds to the cortical hemisphere.

## Inputs

- **Input surface** (positional arg 1): A FreeSurfer surface file (e.g., `lh.orig.nofix` as initially tessellated).

## Outputs

- **Output surface** (positional arg 2): The cleaned surface with only the largest connected component retained.

## Mathematical Foundations

The algorithm performs a **connected-component analysis** on the mesh graph: two vertices are connected if they share an edge. The connected components are enumerated via flood-fill (BFS/DFS), and the component with the maximum vertex count is retained. All other vertices and their associated faces are removed.

Mathematically, let $G = (V, E)$ be the mesh graph. The output is the induced subgraph $G[V^*]$ where:

$$
V^* = \arg\max_{C \in \text{CC}(G)} |C|
$$

and $\text{CC}(G)$ is the set of connected components of $G$.

The function signature `MRISextractMainComponent(mris_in, 0, 1, 0)` uses internal flags for verbosity and writing diagnostics.

## Configuration Options

`mris_extract_main_component` takes only two positional arguments and has no configurable flags beyond the standard version/help options.

| Argument | Description |
|----------|-------------|
| `<input_surface>` | Input surface with possibly multiple components |
| `<output_surface>` | Output surface retaining only the largest component |

## Configuration Interactions

No user-configurable interactions. The tool is designed for single-purpose use.

## Typical Use Cases

```bash
# Remove small fragments after tessellation
mris_extract_main_component lh.orig.nofix lh.orig.nofix.clean

# As called by recon-all (approximate):
mris_extract_main_component lh.orig.nofix lh.orig.nofix
```

## Pipeline Context

**Called by `recon-all` in autorecon2**, in the following sequence:

1. `mri_pretess` — prepares the WM volume for tessellation
2. `mri_tessellate` — generates `?h.orig.nofix` (messy, with fragments)
3. **`mris_extract_main_component`** — retains only the main cortical surface
4. `mris_euler_number` — checks topology of the cleaned surface
5. `mris_fix_topology` — corrects topological defects

> [!gotcha] In-place overwrite
> `recon-all` typically calls this tool with the same filename for input and output, effectively overwriting the tessellation in place.

## Gotchas and Caveats

> [!gotcha] Silent about small components
> The tool does not report how many components were removed or their sizes. To inspect, use a topology tool or visualise the raw tessellation in `freeview` before this step.

> [!gotcha] Source location: mri_mc/
> This tool lives in `mri_mc/` (the marching-cubes directory), not in a dedicated `mris_extract_main_component/` directory. This reflects its tight coupling with the tessellation pipeline.

## Related Tools

- [[mri_tessellate]] — generates the initial surface (predecessor)
- [[mris_euler_number]] — checks topology after this tool
- [[mris_fix_topology]] — corrects remaining topological defects
- [[mri_pretess]] — prepares the segmentation for tessellation

## Confidence and Gaps

**Confident (from source):** Complete function — the source is only 70 lines. `MRISextractMainComponent()` call, input/output arguments, author (Florent Segonne), pipeline placement.

**Uncertain:** None — this is a simple, well-understood tool.
