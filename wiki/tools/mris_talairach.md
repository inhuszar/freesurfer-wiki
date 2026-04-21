---
title: "mris_talairach"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_talairach/mris_talairach.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_transform]]"
  - "[[mris_register]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact transform stored in the mris header and used by MRIStalairachTransform() needs more investigation."
tags:
  - Talairach
  - transform
  - surface
  - coordinate-systems
---

# mris_talairach

## Summary

`mris_talairach` applies the Talairach transform stored in a surface file's header to all vertex coordinates of that surface, producing a new surface file in Talairach (MNI305-approximate) space. It is a surface-space coordinate transformation utility.

## Source Information

- **Language:** C++
- **Source file:** `mris_talairach/mris_talairach.cpp`
- **Key function:** `MRIStalairachTransform(mris, mris)` — applies the Talairach transform to surface vertices in-place

## Purpose and Context

FreeSurfer surfaces are natively in surface RAS (tkRAS) space, which is subject-specific. For inter-subject comparison without spherical registration, or for reporting vertex coordinates in a standard space, vertices can be transformed to Talairach/MNI305 space. The Talairach transform is stored in the surface file's header (or derived from the `talairach.xfm` file).

`mris_talairach` applies this transform using the internal `MRIStalairachTransform()` function, which reads the transform from the surface's header metadata.

> [!gotcha] FreeSurfer "Talairach" is actually MNI305
> Despite the name, FreeSurfer's Talairach transform maps to MNI305 space (the Montreal Neurological Institute 305-subject average), not the original Talairach 1988 space. This is a common source of confusion. See [[coordinate-systems]] for details.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Input surface (positional arg 1) | Surface with embedded Talairach transform in header. | FreeSurfer binary surface |
| Output surface (positional arg 2) | Path for the transformed output surface. | FreeSurfer binary surface |

**Usage:** `mris_talairach <input_surface> <output_surface>`

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Transformed surface | Surface with vertex coordinates in Talairach (MNI305) space. | FreeSurfer binary surface |

## Mathematical Foundations

The Talairach transform is a 4×4 affine matrix $T$ applied to each vertex:

$$\begin{pmatrix} x_T \\ y_T \\ z_T \\ 1 \end{pmatrix} = T \begin{pmatrix} x_{\text{surf}} \\ y_{\text{surf}} \\ z_{\text{surf}} \\ 1 \end{pmatrix}$$

where $(x_{\text{surf}}, y_{\text{surf}}, z_{\text{surf}})$ are the surface RAS vertex coordinates and $(x_T, y_T, z_T)$ are the resulting MNI305 coordinates.

The matrix $T$ is computed during `recon-all` by registering the subject's T1 to the MNI305 atlas (`mni305.cor.mgz`) and is stored in `<subject>/mri/transforms/talairach.xfm`. `MRIStalairachTransform()` reads this transform from the surface's associated header.

## Configuration Options

No configuration options. The tool takes exactly two positional arguments.

## Configuration Interactions

N/A — the tool is non-configurable beyond the input/output filenames.

## Typical Use Cases

**Apply Talairach transform to white surface:**
```bash
mris_talairach \
  $SUBJECTS_DIR/sub01/surf/lh.white \
  $SUBJECTS_DIR/sub01/surf/lh.white.tal
```

## Pipeline Context

`mris_talairach` is not called by the standard `recon-all`. It is used in workflows requiring surface coordinates in a standard space for cross-subject comparisons or atlas-space reporting. The more flexible [[mris_transform]] tool can accomplish the same using explicit transform files.

## Gotchas and Caveats

> [!gotcha] Transform must be in surface header
> The transform is read from the surface file's header (`MRIStalairachTransform` expects it there). If the surface was created without this header (e.g., custom or edited surfaces), the function may fail or apply the identity.

> [!gotcha] MNI305, not Talairach 1988
> Despite the tool name, the output is in MNI305 space, not the original Tal (1988) Talairach space based on a single post-mortem brain. The terms are used interchangeably in FreeSurfer documentation but they refer to different spaces.

> [!gotcha] Commented-out centering
> The source contains `/* MRIScenter(mris, mris) ; */` — a commented-out call to center the surface. This means the output may be offset from the volume origin. This is likely intentional but should be noted when comparing with MNI152-registered surfaces from other software.

## Related Tools

- [[mris_transform]] — applies arbitrary transforms (LTA, morph3D) to surfaces
- [[mris_register]] — spherical registration (preferred for cross-subject analysis)
- [[coordinate-systems]] — detailed explanation of FreeSurfer coordinate spaces
- [[surface-format]] — surface format reference

## Confidence and Gaps

**High confidence.** The source is very short (83 lines) and the complete logic is visible: read surface → call `MRIStalairachTransform()` → write surface. The specific details of `MRIStalairachTransform()` are in the library code.
