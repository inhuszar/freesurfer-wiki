---
title: "mris_make_map_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_make_map_surfaces/mris_make_map_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Full flag list not available without running the tool or reading get_option() in full."
  - "Exact output surface names and format not confirmed."
  - "Tool is in the 'attic' directory; may be deprecated."
tags:
  - surface
  - deformation
  - atlas
  - legacy
---

# mris_make_map_surfaces

## Summary

`mris_make_map_surfaces` performs **surface deformation that maximises the likelihood of the underlying MRI data** for generating mapped (atlas-aligned) surfaces. It takes a brain volume and an output directory as primary arguments, with an optional segmentation volume. The tool is in the `attic/` directory of the FreeSurfer source, suggesting it may be deprecated or used only in specialised workflows.

## Source Information

- **Language:** C++
- **Primary source:** `attic/mris_make_map_surfaces/mris_make_map_surfaces.cpp`
- **Associated XML:** `attic/mris_make_map_surfaces/mris_make_map_surfaces.help.xml`

> [!gotcha] Tool is in the attic directory
> The source is in `attic/mris_make_map_surfaces/`, indicating this tool is legacy or deprecated. It may not be compiled or installed in current FreeSurfer distributions.

## Purpose and Context

The tool's description ("Surface deformation that maximises the likelihood of the underlying MRI data") suggests it is a variant of the `mris_make_surfaces` approach but with the output surfaces placed in an atlas-mapped coordinate frame. This is consistent with the tool's name — "map surfaces" could refer to surfaces that are deformed in a mapped (atlas) space rather than subject space.

A plausible use case is generating surfaces for a group average or template brain that faithfully represents the underlying MRI while being spatially aligned with an atlas. This would be useful for building atlas surface models.

## Inputs

| Argument | Description |
|----------|-------------|
| `<brain.mgz>` (positional 1) | Input brain volume. |
| `<output directory>` (positional 2) | Directory where output surfaces are written. |
| `-aseg <aseg.mgz>` | Optional subcortical segmentation volume. |

## Outputs

> [!gap] Output file names not documented
> The output surfaces written to the output directory are not documented in the help XML. A full source read is required to determine the output filenames and formats.

## Mathematical Foundations

Based on the description, the deformation likely uses an energy functional similar to `mris_make_surfaces`:

$$
E = E_{\text{MRI-likelihood}} + \lambda E_{\text{smooth}}
$$

where $E_{\text{MRI-likelihood}}$ is derived from the probability of the observed intensities given the expected WM/GM/CSF distributions at each vertex's position.

> [!gap] Exact energy functional
> The algorithm details require a full source read.

## Configuration Options

| Flag | Description |
|------|-------------|
| `-aseg <aseg.mgz>` | Optional subcortical segmentation volume. |

> [!gap] Additional flags not documented
> The help XML lists only `-aseg` as an optional flag. Additional flags require reading `get_option()`.

## Configuration Interactions

> [!gap] Unknown

## Typical Use Cases

```bash
# Approximate usage based on help XML
mris_make_map_surfaces brain.mgz output_dir/
mris_make_map_surfaces -aseg aseg.mgz brain.mgz output_dir/
```

## Pipeline Context

`mris_make_map_surfaces` is not part of the standard `recon-all` pipeline. Its location in the `attic/` directory suggests it may have been used in atlas construction workflows or template generation pipelines that are no longer current.

## Gotchas and Caveats

> [!gotcha] Legacy tool
> Located in `attic/`. Likely not compiled or installed in standard FreeSurfer distributions. Use `mris_make_surfaces` for standard cortical surface placement.

## Related Tools

- [[mris_make_surfaces]] — the current standard surface placement tool
- [[surface-format]] — FreeSurfer surface file format
- [[mgz]] — MGZ volume format

## Confidence and Gaps

Confidence is **low**. Only the help XML was read, which contains very limited documentation. A complete source review is required for adequate documentation.

> [!gap] Full source review needed
> Reading `attic/mris_make_map_surfaces/mris_make_map_surfaces.cpp` in full is required to document the algorithm, flag list, and output files.
