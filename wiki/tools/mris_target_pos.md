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
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Full purpose, inputs, outputs, and CLI not captured."
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

> [!gap] Inputs not fully captured
> The full input specification is in `parse_commandline()`, which was not read in full. Based on the included headers and context, inputs likely include a surface file and an MRI volume.

## Outputs

> [!gap] Outputs not captured
> Output files are not documented in the first 80 lines of source.

## Mathematical Foundations

> [!gap] Mathematical details not captured
> The target position algorithm is implemented in the body of `main()`, not captured in the first 80 lines read.

Based on the `FloatInt` class and the typical `mris_place_surface` approach, the algorithm likely:
1. Samples the MRI volume along the surface normal at each vertex.
2. Ranks candidate positions by gradient magnitude.
3. Returns the position corresponding to the maximum intensity gradient as the target.

## Configuration Options

> [!gap] Options not captured
> Options are defined in `parse_commandline()`. The tool uses standard FreeSurfer cmdargs.

## Configuration Interactions

N/A — options not captured.

## Typical Use Cases

**Diagnose surface target positions:**
```bash
mris_target_pos [options] <surface> <volume> <output>
```

> [!gap] Actual usage syntax unknown
> The positional argument structure is not documented.

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

**Low confidence.** Only the first 80 lines of source were read. The full purpose, CLI, inputs, outputs, and algorithm require deeper reading.

> [!gap] Comprehensive documentation missing
> `parse_commandline()` and the main processing loop must be read to document this tool fully.
