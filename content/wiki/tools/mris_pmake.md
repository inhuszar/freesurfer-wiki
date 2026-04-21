---
title: "mris_pmake"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_pmake/mris_pmake.cpp"
  - "mris_pmake/dijkstra.cpp"
  - "mris_pmake/dijkstra.h"
  - "mris_pmake/C_mpmProg.cpp"
  - "mris_pmake/c_surface.cpp"
  - "mris_pmake/env.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_smooth]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "OpenCL GPU implementation (dijkstra.cl) not characterised"
  - "Full mpmProg list not determined"
tags:
  - surface
  - geodesic
  - shortest-path
  - Dijkstra
  - sulcal-tracing
---

# mris_pmake

## Summary

`mris_pmake` computes shortest paths and related cost maps on FreeSurfer brain surfaces using Dijkstra's algorithm. Given start and end vertex indices on a surface, it finds the geodesic path of minimum cost according to a configurable multi-dimensional cost function that combines curvature, sulcal height, and Euclidean distance. The tool is designed to trace sulcal fundi between user-specified endpoints and supports interactive mode via UDP socket communication and an `autodijk` mode for computing path costs to all vertices from a reference point.

## Source Information

- **Language:** C++
- **Source files:** `mris_pmake/mris_pmake.cpp`, `dijkstra.cpp`, `dijkstra.h`, `C_mpmProg.cpp`, `c_surface.cpp`, `env.cpp`
- **OpenCL:** `dijkstra.cl` — GPU-accelerated Dijkstra implementation (optional)
- **Original authors:** Rudolph Pienaar, Christian Haselgrove
- **Configuration:** Options file (`options.txt`) plus command-line flags

## Purpose and Context

Sulcal tracing — finding the path of maximum curvature along a sulcal fundus — is useful for:
- Defining sulcal landmarks for manual or semi-automatic parcellation
- Measuring sulcal length
- Quantifying inter-subject sulcal variability

`mris_pmake` implements this by encoding the geodesic problem as a weighted graph and applying Dijkstra's algorithm. The "distance" in this graph is defined by the cost function (see below), not pure Euclidean distance, allowing the path to prefer high-curvature or low-sulcal-height trajectories.

The tool can operate in batch mode (given start/end vertices) or interactive mode (via the companion `dsh` shell script that communicates via UDP).

## Inputs

Primary input is via an options file (`options.txt` by default):
- `surfaceFile` — the main FreeSurfer surface (e.g., `inflated`)
- `surface1File` — auxiliary surface (e.g., `smoothwm`)
- `curvatureFile` — main curvature overlay (used as `c` in cost function)
- `sulcalHeightFile` — sulcal height overlay (used as `h` in cost function)
- `startVertex`, `endVertex` — vertex indices for path endpoints

Command-line may also specify:
- `--subject subj` — subject name
- `--hemi hemi` — hemisphere
- `--surface0 name` — main surface name (default: `inflated`)
- `--surface1 name` — aux surface name (default: `smoothwm`)
- `--curv0 name` — main curvature file (default: `smoothwm.H.crv`)
- `--curv1 name` — sulcal height file (default: `sulc`)
- `--mpmProg name` — embedded program to run (e.g., `autodijk`)

## Outputs

Outputs are directed to channels specified in the options file:
- `userMessages` — operational data (path vertices, costs)
- `sysMessages` — system messages
- `resultMessages` — path results

Output files include:
- Path label files
- Cost overlay files (for `autodijk`)

## Mathematical Foundations

The edge cost between adjacent vertices $i$ and $j$ is:

$$p_{ij} = w_d \cdot d_{ij} + w_c \cdot c_i + w_h \cdot h_i + w_{dc} \cdot d_{ij} c_i + w_{dh} \cdot d_{ij} h_i + w_{ch} \cdot c_i h_i + w_{dch} \cdot d_{ij} c_i h_i + w_{dir} \cdot \text{dir}_{ij}$$

where:
- $d_{ij}$ — Euclidean distance between vertices $i$ and $j$
- $c_i$ — curvature at vertex $i$ (from `curvatureFile`)
- $h_i$ — sulcal height at vertex $i$ (from `sulcalHeightFile`)
- $w_*$ — configurable weight factors (set in options file)
- $\text{dir}$ — directional penalty (for trajectory smoothness)

An optional non-linear transition penalty can be applied when the curvature sign changes along the path (zero-crossing of $c$).

Dijkstra's algorithm then finds:

$$\text{path}^* = \arg\min_{\text{path}} \sum_{(i,j) \in \text{path}} p_{ij}$$

## Configuration Options

### Command-line Flags

| Flag | Description |
|---|---|
| `--optionsFile=file` | Options file path (default: `options.txt`) |
| `--dir=workingDir` | Working directory |
| `--subject subj` | Subject name |
| `--hemi hemi` | Hemisphere |
| `--surface0 name` | Main surface name |
| `--surface1 name` | Aux surface name |
| `--curv0 name` | Main curvature file |
| `--curv1 name` | Aux curvature (sulcal height) file |
| `--useAbsCurvs` | Use `fabs()` on curvature maps |
| `--mpmProg name` | Embedded program: `autodijk`, `patchMake`, etc. |
| `--mpmArgs args` | Semicolon-delimited args for mpmProg |
| `--listen` | Wait for UDP `RUN` command (interactive mode) |
| `--listenOnPort port` | Create server on `port` and wait for instructions |

### Options File Parameters (selected)

| Parameter | Description |
|---|---|
| `curvatureFile` | Main curvature overlay filename |
| `sulcalHeightFile` | Sulcal height overlay filename |
| `startVertex` | Start vertex index |
| `endVertex` | End vertex index |
| `w_d`, `w_c`, `w_h` | Weight factors for distance, curvature, height |
| `w_dc`, `w_dh`, `w_ch`, `w_dch` | Cross-term weights |
| `w_dir` | Direction weight |
| `b_transitionPenalties` | Enable zero-crossing penalty |
| `userMessages` | Output channel (file or `localhost:port`) |

## Configuration Interactions

- When `--optionsFile` is specified, most command-line flags override the corresponding options file settings.
- `--listen` initialises the program and waits; a `RUN` UDP packet triggers path computation. `--listenOnPort` is more minimal — only creates the socket.
- `--mpmProg autodijk` changes the operation from single start/end path to computing path costs from one vertex to all others.
- `--useAbsCurvs` applies `fabs()` to the curvature map, making the cost function respond to curvature magnitude rather than sign.

## Typical Use Cases

```bash
# Run with existing options.txt (most common usage)
mris_pmake

# Specify subject and hemisphere without options file
mris_pmake --subject bert --hemi lh --surface0 inflated --mpmProg autodijk

# Interactive mode via dsh script (recommended for interactive use)
dsh  # then type: RUN, wait for results, then: quit
```

**Autodijk example:**
```bash
# Compute path cost from vertex 100 to all vertices, store as overlay
mris_pmake --subject bert --hemi rh \
  --curv0 smoothwm.K1.crv \
  --mpmProg autodijk \
  --mpmArgs "polarVertex=100"
```

## Pipeline Context

Not part of `recon-all`. Used in research workflows for:
- Sulcal tracing and labelling
- Cortical landmark definition
- Sulcal geometry analysis

## Gotchas and Caveats

> [!gotcha] Options file dependency
> The primary configuration mechanism is the options file, not command-line flags. Running without an options file and without sufficient command-line arguments will produce an error. Use the `dsh` companion script for interactive use.

> [!gotcha] UDP communication
> The tool uses UDP sockets for inter-process communication (both input commands and output results). On systems with strict firewall rules, UDP packets may be blocked.

> [!gotcha] `b_surfacesKeepInSync`
> The environment is initialised with `b_surfacesKeepInSync = true`, meaning changes to the working surface propagate to the auxiliary surface. Disabling this (in the options file) may produce inconsistent state.

> [!gotcha] Cost function interpretation
> "Shortest path" is relative to the cost function. A path that looks geometrically short may have high cost if it crosses high-curvature (convex) regions. The sulcal tracing application requires tuning weights to prefer paths along sulcal fundi.

> [!gotcha] OpenCL GPU support
> An OpenCL GPU-accelerated Dijkstra kernel (`dijkstra.cl`) exists in the source. Its availability depends on the build configuration.

## Related Tools

- [[mris_smooth]] — used to precompute the smoothed surfaces used as input

## Confidence and Gaps

**Confident (from code and help XML):** Dijkstra basis; multi-dimensional cost function formula; options file mechanism; UDP socket communication; autodijk and patchMake mpmProgs; `--useAbsCurvs`; `b_surfacesKeepInSync`.

**Uncertain:** Full list of available mpmProgs; exact semantics of `mpmArgs` for each prog; GPU kernel usage.

> [!gap] The full list of embedded mpmProgs (beyond `autodijk` and `patchMake`) is not documented in the help XML. Reading `C_mpmProg.cpp` would clarify this.
