---
title: "mris_nudge"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_deform/mris_nudge.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_place_surface]]"
  - "[[mris_reposition_surface]]"
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The sigma and nsize interaction with MRISrepositionSurface is not fully documented"
tags:
  - surface
  - editing
  - manual-correction
  - repositioning
---

# mris_nudge

## Summary

`mris_nudge` manually nudges a region of surface vertices toward a target intensity value. Given a surface, a volume, a seed vertex, a target intensity value, and a neighbourhood size, it deforms a local patch of the surface to match the target using `MRISrepositionSurface`. This is a manual surface correction tool intended for cases where automated placement has failed in a localised region.

## Source Information

- **Language:** C++ (with C origins)
- **Source file:** `mris_deform/mris_nudge.cpp`
- **Original author:** Bruce Fischl
- **Key functions:** `MRISrepositionSurface`, `MRISerodeRipped`, `MRISunrip`

## Purpose and Context

Automated surface placement algorithms occasionally fail at specific cortical locations — near large sulci, focal lesions, or near the boundaries of skull-stripped regions. `mris_nudge` provides a minimal command-line interface to manually guide surface vertex positions in such cases. Rather than editing the surface vertex by vertex (as in a GUI tool), the user specifies a seed vertex, a target intensity (typically the expected WM or GM intensity value), and a radius, and the tool deforms the surrounding patch to match.

This is the command-line counterpart to the manual surface editing features in `freeview`.

## Inputs

- `argv[1]` — input surface file (FreeSurfer binary format)
- `argv[2]` — input volume file (MGZ or other FS-readable format)
- `argv[3]` — target vertex number (integer)
- `argv[4]` — target intensity value (float)
- `argv[5]` — neighbourhood size (integer, radius in vertices)
- `argv[6]` — output surface file

## Outputs

- Output surface file with the nudged vertex positions (FreeSurfer binary format)

## Mathematical Foundations

The tool calls `MRISrepositionSurface` with a cost function that drives the surface vertices toward a target intensity value. Vertices outside the neighbourhood radius are "ripped" (frozen) using `MRISerodeRipped`:

```c
MRISerodeRipped(mris, nsize);
MRISrepositionSurface(mris, mri, target_vnos, target_vals, nvertices, nsize, sigma, 0);
MRISunrip(mris);
```

The sigma parameter (default 2.0 mm) controls the spatial scale of the gradient smoothing applied during repositioning. The deformation is driven by an intensity gradient that points toward the target value.

## Configuration Options

| Flag / Position | Argument | Default | Description |
|---|---|---|---|
| arg 1 | path | required | Input surface file path |
| arg 2 | path | required | Input volume file path |
| arg 3 | int | required | Seed vertex number |
| arg 4 | float | required | Target intensity value |
| arg 5 | int | required | Neighbourhood size (vertex radius) |
| arg 6 | path | required | Output surface file path |
| `-s <S>` | float | `2.0` | Gaussian smoothing sigma for gradient; accepted as any flag starting with `-s` (e.g., `-sigma`) via `case 'S':` |
| `-vavgs` | — | — | No-op stub; empty handler body (`!stricmp(option, "vavgs")`). |

The tool requires exactly 7 positional arguments (6 + the program name); calling with fewer exits with the usage message.

## Configuration Interactions

- The neighbourhood size determines how many vertices are unfrozen (unfrozen region = seed vertex ± nsize hops).
- Increasing `-s` (sigma) reduces noise sensitivity but blurs the gradient signal.

## Typical Use Cases

```bash
# Nudge vertices around vertex 12345 toward intensity 110.0 with radius 5
mris_nudge lh.white brain.mgz 12345 110.0 5 lh.white.nudged

# Use larger sigma for noisy data
mris_nudge -s 3.0 lh.white brain.mgz 12345 110.0 10 lh.white.nudged
```

## Pipeline Context

Not part of `recon-all`. Used for manual surface correction after automated processing. Typical workflow:

1. Run `recon-all` to completion
2. Inspect surfaces in `freeview`
3. Identify vertex number of problem area using `freeview`
4. Run `mris_nudge` with appropriate target value
5. Re-inspect

## Gotchas and Caveats

> [!gotcha] Vertex number required
> The user must specify a target vertex number, not a RAS coordinate. The vertex number must be obtained from `freeview` or another inspection tool.

> [!gotcha] Erode/unrip approach
> The tool first erodes the rip flag (`MRISerodeRipped`) — this means it erodes the FROZEN region, effectively enlarging the movable patch. After repositioning, it unrips all vertices. This means that any previously ripped vertices (from recon-all's midline ripping, for example) will be permanently unripped in the output.

> [!gotcha] Single seed vertex
> Only one seed vertex is supported per invocation (`MAX_VERTICES 10000` is defined but `nvertices` is always 1 after the single positional argument is read). Multiple regions require multiple invocations.

> [!gotcha] No iteration control
> The number of deformation iterations is controlled entirely by `MRISrepositionSurface` defaults. There is no command-line flag to limit iterations.

## Related Tools

- [[mris_reposition_surface]] — a more modern repositioning tool that uses control points in JSON format
- [[mris_place_surface]] — automated surface placement
- `freeview` — GUI-based surface editing

## Confidence and Gaps

**Confident (from code):** Positional argument structure (6 required); sigma default 2.0; `MRISerodeRipped` / `MRISrepositionSurface` / `MRISunrip` call sequence; single seed vertex per run.

**Uncertain:** Whether `MAX_VERTICES` can be exploited to process multiple vertices in one run (code structure suggests not — only `argv[3]` and `argv[4]` are read for vertex/value).
