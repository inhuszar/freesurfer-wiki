---
title: "mri_brain_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_watershed/brain_volume/mri_brain_volume.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_brainvol_stats]]"
  - "[[mri_segstats]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact algorithm for brain volume estimation not fully read from source"
  - "Relationship to mri_watershed watershed algorithm unclear"
tags:
  - brain-volume
  - skull-stripping
  - morphometry
---

# mri_brain_volume

## Summary

`mri_brain_volume` is a brain volume estimation tool located in the `mri_watershed/brain_volume/` subdirectory. It was originally derived from the watershed skull-stripping code (`mri_watershed`) and computes an estimate of the total brain volume from a skull-stripped or pre-processed MRI volume. It differs from [[mri_brainvol_stats]] in that it estimates volume geometrically rather than from an atlas transform.

## Source Information

- **Language:** C++
- **Source file:** `mri_watershed/brain_volume/mri_brain_volume.cpp`
- **Original authors:** Florent Segonne and Bruce Fischl

The source shares code and data structures with [[mri_watershed]], including the `MRI_variables` struct and watershed-based surface fitting machinery.

## Purpose and Context

This tool provides an alternative brain volume estimate based on the watershed/geometric skull-stripping approach, rather than the atlas-determinant method used in [[mri_brainvol_stats]]. It may be used in skull-stripping validation workflows or as a standalone brain volume reporter.

> [!gap] Relationship to pipeline
> Whether `mri_brain_volume` is called in any standard [[recon-all]] stage is not confirmed from the source or documentation available here.

## Inputs

> [!gap] Input specification
> The exact command-line interface must be read from the source's `get_option()` function. The code inherits the `STRIP_PARMS` structure from the watershed skull-stripping framework, suggesting it accepts similar flags.

## Outputs

> [!gap] Output specification
> The output format (volume estimate printed to stdout, written to file, etc.) requires verification.

## Mathematical Foundations

The watershed approach fits a deformable spherical surface to the brain boundary, initialized by a coarse estimate of the brain center and radius from the intensity histogram. The volume is computed from the enclosed surface or from the voxel count within the estimated brain mask.

The coarse brain center $(x_{\text{COG}}, y_{\text{COG}}, z_{\text{COG}})$ and radius $R_{\text{brain}}$ are estimated from the image intensity profile. The surface is deformed to minimize energy terms balancing surface tension and image-gradient attraction.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-forceParam <val>` | float | 1.0 | Override the pushout force parameter used during template deformation surface fitting |
| `-surf_debug` | — | off | Write intermediate deformable surfaces into the output volume for debugging; equivalent to setting the `DEBUG_BRAIN` environment variable |

## Pipeline Context

> [!gap] Pipeline usage unclear
> This tool's role in the [[recon-all]] pipeline is unclear. Brain volume reporting in standard FreeSurfer pipelines is handled by [[mri_brainvol_stats]].

## Related Tools

- [[mri_watershed]] — the skull-stripping tool from which this is derived
- [[mri_brainvol_stats]] — the standard brain volume statistics tool
- [[mri_segstats]] — computes region volumes from segmentation

## Confidence and Gaps

Source has complex inherited data structures from watershed code. Confidence is low without detailed source reading.

> [!gap] Full source analysis needed
> The `mri_brain_volume.cpp` file is long (inheriting watershed machinery). A complete page requires reading the full argument parser and main loop.
