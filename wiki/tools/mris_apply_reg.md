---
title: "mris_apply_reg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_apply_reg/mris_apply_reg.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mri_vol2surf]]"
  - "[[mris_convert]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Reverse-map interpolation method (nearest-neighbour vs. barycentric) needs confirmation from MRISapplyReg internals."
tags:
  - registration
  - surface
  - resampling
  - overlay
---

# mris_apply_reg

## Summary

`mris_apply_reg` applies one or more surface registrations to resample scalar overlays, labels, annotations, or surface coordinates from a source surface space to a target surface space. It is the surface-domain analogue of volume resampling after a spatial transform, enabling cross-subject data transfer using registered sphere surfaces.

## Source Information

- **Language:** C++ (original author: Douglas N. Greve)
- **Source file:** `mris_apply_reg/mris_apply_reg.cpp`

## Purpose and Context

After spherical registration (via [[mris_register]]), each subject's `sphere.reg` is aligned to a common atlas. `mris_apply_reg` uses this registration — specified as one or more `--streg src tgt` pairs — to resample data from one surface space into another. This enables:

- Transferring subject-specific overlays (e.g., thickness, fMRI activation maps) to fsaverage or other atlas spaces.
- Propagating atlas labels (e.g., parcellations) back to individual subjects.
- Resampling annotation files across subjects.
- Transferring label files.

The core resampling is performed by `MRISapplyReg()` in `mrisutils.cpp`.

## Inputs

| Input | Description |
|-------|-------------|
| `--src / --sval / --i <file>` | Source scalar overlay (MRI/MGZ format, reshaped to 1D) |
| `--sval-annot / --src-annot <file>` | Source annotation file (`.annot`) |
| `--src-xyz <file>` | Source surface whose XYZ coordinates will be transferred |
| `--sval-label / --src-label <file>` | Source label file (can be repeated for multiple labels) |
| `--streg <src-reg> <tgt-reg>` | Pair of registered sphere surfaces (can be chained) |
| `--trg / --tval / --o <file>` | Output file (can be repeated for multiple labels) |
| `--patch <src-patch> <tgt-patch>` | Apply registration within a surface patch |
| `--lta <surface> <LTA> <tgt-surf>` | Apply an LTA transform |

## Outputs

| Output | Description |
|--------|-------------|
| `--trg / --o <file>` | Resampled overlay, annotation, label, or surface file |

Output format matches the input modality: annotation in → annotation out; scalar in → MGZ out; label in → label out.

## Mathematical Foundations

Given source registration sphere $S_{\text{src}}$ and target registration sphere $S_{\text{tgt}}$, for each vertex $v_t$ on the target:

1. Find the nearest source vertex $v_s = \arg\min_v \|S_{\text{tgt}}(v_t) - S_{\text{src}}(v)\|$ (when `--norev` / forward map).
2. Interpolate the scalar value at $v_s$ and assign to $v_t$.

The default reverse-map (`--nnfr`) starts from the source vertices and finds target interpolation positions, which is generally more accurate for non-bijective mappings.

The Jacobian correction (`--jac`) weights values by the ratio of source-to-target surface areas to conserve integrated quantities (useful for areal measurements).

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `--src / --sval / --i <file>` | Source scalar data file | required (one of src types) |
| `--sval-annot / --src-annot <file>` | Source annotation | — |
| `--src-xyz <file>` | Source surface XYZ | — |
| `--sval-label / --src-label <file>` | Source label file (repeatable) | — |
| `--trg / --tval / --o <file>` | Output file (repeatable) | required |
| `--streg <src> <tgt>` | Registration sphere pair (repeatable) | required |
| `--patch <src-p> <tgt-p>` | Patch files (repeatable) | — |
| `--norev / --no-rev / --nnf` | Forward map (source→target nearest-neighbour) | reverse map |
| `--rev / --nnfr` | Reverse map (default) | on |
| `--jac` | Apply Jacobian area correction | off |
| `--no-jac` | Disable Jacobian correction | off |
| `--curv` | Write output as `.curv` format overlay | off |
| `--center` | Center the output surface | off |
| `--no-hash` | Disable hash table for vertex lookup | off (hash on) |
| `--src-reg-scale <scale>` | Scale source sphere radius | 0 (disabled) |
| `--trg-reg-scale <scale>` | Scale target sphere radius | 0 (disabled) |
| `--no-label-keep-stat` | Don't preserve label statistics | preserve |
| `--reg-scanner-ras` | Treat registration sphere in scanner RAS | off |
| `--xyz-scanner-ras` | Treat source XYZ in scanner RAS | off |
| `--scanner-ras` | Sets both `--reg-scanner-ras` and `--xyz-scanner-ras` | off |
| `--stvpair <file>` | Write source-target vertex pair text file | off |
| `--lta <surf> <LTA> <tgt>` | Apply LTA transform | — |
| `--randn` | Fill source with random noise (testing) | off |
| `--ones` | Fill source with ones (testing) | off |
| `--debug` | Enable debug output | off |

## Configuration Interactions

- `--sval-annot` implicitly disables Jacobian correction (`DoJac=0`) and sets forward map (`ReverseMapFlag=0`). These are forced to ensure annotation integrity.
- `--sval-label` disables Jacobian correction but (as of recent code) keeps reverse map enabled by default.
- `--src-xyz` and `--xyz-scanner-ras` can be combined to handle surfaces in scanner RAS space.
- `--src-reg-scale` and `--trg-reg-scale` are provided to handle CAT12-format registration spheres (radius 1) vs. FreeSurfer (radius 100).
- Multiple `--streg` pairs chain the registration: data is transferred through each intermediate surface in sequence.

> [!gotcha] Annotation mode forces forward map
> When using `--sval-annot`, the Jacobian and reverse-map flags are forced off regardless of what the user specifies on the command line, because nearest-neighbour assignment is the only sensible interpolation for discrete labels.

## Typical Use Cases

```bash
# Transfer subject thickness to fsaverage space
mris_apply_reg \
  --src $SUBJECTS_DIR/bert/surf/lh.thickness \
  --streg $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
            $SUBJECTS_DIR/fsaverage/surf/lh.sphere \
  --trg $SUBJECTS_DIR/bert/surf/lh.thickness.fsaverage.mgz

# Transfer fsaverage parcellation annotation to a subject
mris_apply_reg \
  --sval-annot $SUBJECTS_DIR/fsaverage/label/lh.aparc.annot \
  --streg $SUBJECTS_DIR/fsaverage/surf/lh.sphere \
            $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  --trg $SUBJECTS_DIR/bert/label/lh.aparc.annot

# Transfer a label file
mris_apply_reg \
  --src-label $SUBJECTS_DIR/fsaverage/label/lh.V1.label \
  --streg $SUBJECTS_DIR/fsaverage/surf/lh.sphere \
            $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  --trg $SUBJECTS_DIR/bert/label/lh.V1.label
```

## Pipeline Context

Not a standard `recon-all` stage, but widely used in group analysis workflows:
- After `recon-all`, subject data is transferred to fsaverage for group analysis.
- When creating custom parcellations on fsaverage and projecting back to individuals.
- In multi-modal studies where functional data from one space must be projected to another.

Related pipeline steps:
- [[mris_register]] — produces the `sphere.reg` used as the `--streg` source
- [[mris_sphere]] — produces the `sphere` used as the `--streg` target

## Gotchas and Caveats

> [!gotcha] ico7 special case
> If the source surface has basename `ic7`, the tool reads it as an icosahedron order-7 surface with radius rescaled to 100. This is a hard-coded special case for internal processing.

> [!gotcha] Scalar data must be 1D
> The source scalar file is reshaped to 1D (`MRIreshape1d`) before resampling. Multi-frame volumes should have frames equal to the number of vertices; unexpected shapes will cause an error.

> [!gotcha] Float conversion
> If the source data is not `MRI_FLOAT` type, it is automatically converted before resampling. This is transparent but means integer label files used as scalar overlays will be quietly converted to float.

## Related Tools

- [[mris_register]] — produces the registration sphere
- [[mris_sphere]] — produces the canonical sphere
- [[mri_vol2surf]] — projects volumetric data to a surface
- [[mris_convert]] — format conversion without resampling

## Confidence and Gaps

**Confident:** Flag parsing, I/O logic, and mode-specific behaviour (annotation, label, scalar, XYZ) are confirmed from the full source code.

> [!gap] MRISapplyReg internals
> The actual interpolation algorithm in `MRISapplyReg()` (which lives in `mrisutils.cpp`) is not fully detailed here. The exact interpolation method (nearest-neighbour vs. barycentric) for scalar data in reverse-map mode needs verification.
