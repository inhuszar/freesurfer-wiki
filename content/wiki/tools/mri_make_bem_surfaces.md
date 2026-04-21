---
title: "mri_make_bem_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_make_bem_surfaces/mri_make_bem_surfaces.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_tessellate]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not extracted"
  - "Exact number and naming of output surfaces not confirmed"
tags:
  - bem
  - meg
  - eeg
  - surface
---

# mri_make_bem_surfaces

## Summary

`mri_make_bem_surfaces` creates Boundary Element Method (BEM) surfaces for use with MEG/EEG forward modelling tools (e.g., MNE-C, MNE-Python). It generates three nested surfaces representing the inner skull, outer skull, and outer skin boundaries from FreeSurfer's brain and skull segmentation. Original authors: Anders Dale and Martin Sereno.

## Source Information

- **Language:** C++
- **Source file:** `mri_make_bem_surfaces/mri_make_bem_surfaces.cpp`
- **Original authors:** Anders Dale, Martin Sereno

## Purpose and Context

MEG/EEG source localisation requires a forward model of how neural currents produce measured fields. The BEM approach models the head as a set of nested conducting shells. `mri_make_bem_surfaces` extracts these shells (inner skull, outer skull, outer skin) from FreeSurfer anatomical data, producing surfaces compatible with MNE's BEM pipeline.

The tool reads COR format (legacy slice-based) images and produces surface files in a format readable by FreeSurfer's surface tools and MNE tools.

## Inputs

The tool operates within a FreeSurfer subject directory. It reads:
- Brain images (from the `mri/` directory)
- Skull images (derived from the watershed or segmentation)
- Subject directory structure

## Outputs

Three BEM surface files (names subject to confirmation):
- `inner_skull.surf` — surface at the brain/CSF-to-skull boundary
- `outer_skull.surf` — surface at the skull outer boundary
- `outer_skin.surf` (or `head.surf`) — surface at the skin boundary

Surfaces are in FreeSurfer surface format.

## Mathematical Foundations

The BEM surface generation uses a shrink-wrap / deformable surface approach (similar to the old `mri_watershed` surface extraction):

1. Start with an icosahedral template surface.
2. `shrink()` function iteratively deforms the surface inward toward the relevant boundary.
3. `compute_normals()` updates vertex normals after each deformation step.
4. Smoothing steps (`nsmoothsteps`) are interleaved with shrinking.
5. The `estimate_thickness()` function estimates local skull thickness.

The attraction/repulsion force used in the `shrink()` function is based on `rtanh(x)`, a regularised tanh function.

> [!gap] Shrink algorithm details
> The exact energy functional for `shrink()` was not read from the source. The interplay between the icosahedral template and the image-based forces needs verification.

## Configuration Options

> [!gap] Command-line interface not extracted
> The `main()` and option parsing code was not read in detail. The tool likely takes the subject directory and/or subjects directory as arguments, similar to other FreeSurfer tools.

Based on the source structure:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (likely) subject dir | path | required | FreeSurfer subject directory |
| `-sd <dir>` | string | $SUBJECTS_DIR | Subjects directory |

## Typical Use Cases

```bash
# Generate BEM surfaces for a subject
mri_make_bem_surfaces /data/subjects/my_subject

# Or (if it uses SUBJECTS_DIR convention)
export SUBJECTS_DIR=/data/subjects
mri_make_bem_surfaces my_subject
```

## Pipeline Context

Not part of standard `recon-all`. Typically run after `recon-all` completes to prepare a subject for MEG/EEG source localisation with MNE tools. Part of the `mne_setup_source_space` / `mne_setup_forward_model` workflow.

## Gotchas and Caveats

- The tool was originally designed for the COR (slice-based) format. Behaviour with MGZ volumes is not confirmed from the source header.
- BEM surfaces require closed, non-self-intersecting meshes — the output quality depends on the quality of the underlying skull segmentation.
- The MAXVERTICES (10000) and MAXFACES (10000) limits in the source suggest the output surfaces are relatively coarse icosahedral tessellations.

## Related Tools

- [[mri_watershed]] — skull stripping and skull surface extraction
- [[mri_tessellate]] — surface tessellation from volumetric segmentation

## Confidence and Gaps

**Medium confidence:** purpose and surface generation approach confirmed from source header and function names.

> [!gap] Full command-line interface
> The `main()` function and argument parsing were not read. The exact flags and positional arguments are unknown.
