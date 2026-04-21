---
title: "mris_parcellate_connectivity"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_parcellate_connectivity/mris_parcellate_connectivity.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_register]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "The main processing loop after ICPread exits immediately — the tool may be incomplete or under development"
  - "Full command-line interface not confirmed"
  - "What constitutes a valid connectivity matrix format is not documented"
tags:
  - surface
  - parcellation
  - connectivity
  - icosahedron
---

# mris_parcellate_connectivity

## Summary

`mris_parcellate_connectivity` is intended to parcellate a cortical surface into regions based on a connectivity matrix. Given a surface, a connectivity matrix volume (where each voxel encodes the connectivity between vertices), and an icosahedron, it maps the connectivity structure onto the icosahedral tessellation and partitions the surface into functionally homogeneous zones.

## Source Information

- **Language:** C++
- **Source file:** `mris_parcellate_connectivity/mris_parcellate_connectivity.cpp`
- **Note:** The source code calls `ICPread(ico_no, 6)` and then immediately calls `exit(0)` — the main processing code appears to be either commented out or under development.

## Purpose and Context

Connectivity-based parcellation partitions the cortex into regions such that vertices with similar whole-brain functional or structural connectivity profiles are grouped together. The tool takes a precomputed vertex-by-vertex connectivity matrix and projects it onto an icosahedral grid for subsequent clustering.

> [!gap] Implementation status unclear
> The `main()` function reads the ICO mesh then immediately exits. The surface reading and connectivity matrix code that follows is unreachable. This suggests the tool is either a stub, has a build-time conditional, or is intended to be called in a debugging mode.

## Inputs

- Positional arg 1: surface file path
- Positional arg 2: connectivity matrix volume (must be `nvertices × 1 × 1 × nvertices`)
- Positional arg 3: output parcellation filename
- `-ico N` — icosahedron order (default 2)

## Outputs

- A parcellation annotation file (format not confirmed)

## Mathematical Foundations

The tool uses an icosahedral tessellation as a low-dimensional basis for connectivity. For icosahedron order $N$, there are approximately $10 \cdot 4^N + 2$ vertices. The connectivity matrix $C_{ij}$ (where $i, j$ are surface vertices) is projected onto the icosahedron.

> [!gap] The actual parcellation algorithm (clustering method) is unknown because the main processing logic is unreachable in the source.

## Configuration Options

| Flag | Description |
|---|---|
| (arg 1) | Surface file |
| (arg 2) | Connectivity matrix volume |
| (arg 3) | Output parcellation file |
| `-ico N` | Icosahedron order for mapping (default 2) |
| `-nbrs N` | Neighbourhood size (default 1) |
| `-navgs N` | Number of averages (default 0) |
| `-nsub N` | Number of subdivisions (default 2) |

## Configuration Interactions

- The connectivity matrix must be exactly `nvertices × 1 × 1 × nvertices`; the code checks this and exits with an error if not satisfied.
- `-ico` determines the resolution of the mapping; lower values = fewer regions.

## Typical Use Cases

```bash
# Parcellate left hemisphere based on connectivity (speculative)
mris_parcellate_connectivity lh.white lh.corrmat.mgz lh.conn_parc.annot
```

## Pipeline Context

Not part of standard `recon-all`. Intended for connectivity-based parcellation workflows using resting-state fMRI or diffusion MRI connectivity matrices projected to the surface.

## Gotchas and Caveats

> [!gotcha] Tool may be non-functional
> The `main()` function calls `ICPread(ico_no, 6); exit(0);` before reading surface or connectivity matrix. This makes the tool non-functional as distributed. Confirm by running with `--help` or checking FreeSurfer build logs.

> [!gotcha] ICO overallocation comment
> The code contains: "This is overallocating by 100x — The parameter used to be called pct_ but was multiplied by without dividing by 100 so I don't know if the 100 is deliberate or not. Left unchanged to not change the behaviour." This is a known quirk in `ICOreadOverAlloc`.

## Related Tools

- [[mris_register]] — spherical registration that produces the common coordinate system required for inter-subject connectivity analysis
- [[surface-format]] — FreeSurfer surface annotation format

## Confidence and Gaps

**Confident (from code):** Input argument structure (3 positional args); connectivity matrix dimension check; `-ico` default 2; ICO overallocation issue.

**Low confidence:** Whether the tool is actually functional; what the output parcellation format is.

> [!gap] The source code's `main()` function exits after `ICPread`. The remainder of the code (surface reading, matrix handling, parcellation) is dead code or under development. This tool should be tested empirically before use.
