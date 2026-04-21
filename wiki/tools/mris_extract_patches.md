---
title: "mris_extract_patches"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_extract_patches/mris_extract_patches.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_expand]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The output patch format and size details are not fully documented."
  - "The bilateral hemi feature (sphere.d1.left_right) is specific to a research surface and may not be available in all subjects."
tags:
  - surface
  - patch
  - deep-learning
  - FCD
  - training-data
---

# mris_extract_patches

## Summary

`mris_extract_patches` extracts volumetric cubic patches from around labelled surface vertices, plus their corresponding locations on the opposite hemisphere, for use as training data in deep-learning models. It was developed specifically for focal cortical dysplasia (FCD) detection, extracting matched patches from both hemispheres at each labelled vertex to provide bilateral input features.

## Source Information

- **Language:** C++
- **Source file:** `mris_extract_patches/mris_extract_patches.cpp`
- **Author:** Bruce Fischl
- **Key function:** `MRISextractVolumeWindow()` (defined locally)

## Purpose and Context

FCD (focal cortical dysplasia) detection algorithms benefit from bilateral symmetry as a feature: FCD typically breaks the bilateral symmetry that normal cortex exhibits. This tool extracts cubic intensity patches from both hemispheres at each label vertex location, enabling CNNs to learn asymmetry features. The tool also supports random patch augmentation for class balancing.

## Inputs

- **Subject** (positional arg 1): Subject name in `$SUBJECTS_DIR`.
- **Output directory** (positional arg 2): Directory to write patches.

**Optional inputs via flags:**
- `--surf`: Surface name (default: `white`)
- `--sphere`: Sphere name for bilateral mapping (default: `sphere.d1.left_right`)
- `--hemi`: Hemisphere (default: `lh`)
- `--ohemi`: Opposite hemisphere (default: `rh`)
- `--vol`: Volume to sample patches from (default: `norm.mgz`)
- `--ovol`: Opposite hemisphere volume (default: `norm.mgz`)
- `--label`: Label name defining patch centres (default: `FCD`)

## Outputs

- **Patch volumes**: One MRI volume per labelled vertex, containing a cubic intensity patch of size `wsize × wsize × wsize` centred on the vertex (and its bilateral correspondent).
- **Label volumes**: Corresponding label patches.

## Mathematical Foundations

For each labelled vertex $v_i$ on the source hemisphere, the bilateral correspondent $v_i'$ on the opposite hemisphere is found via the registered sphere (`sphere.d1.left_right`).

A cubic volume patch of side $w$ voxels is extracted from the normalised T1 volume (`norm.mgz`) centred at the vertex position, optionally rotated by angle $\theta$ for data augmentation. The patch extraction function `MRISextractVolumeWindow()` samples from the MRI volume using surface coordinates.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--surf` | `<name>` | `white` | Surface name |
| `--sphere` | `<name>` | `sphere.d1.left_right` | Sphere for bilateral mapping |
| `--hemi` | `lh\|rh` | `lh` | Source hemisphere |
| `--ohemi` | `lh\|rh` | `rh` | Opposite hemisphere |
| `--wsize` | `<int>` | 32 | Patch window size (voxels) |
| `--nbrs` | `<int>` | 3 | Number of neighbours for averaging |
| `--label` | `<name>` | `FCD` | Label name (file: `<hemi>.<name>.label`) |
| `--vol` | `<name>` | `norm.mgz` | Volume for patch sampling |
| `--ovol` | `<name>` | `norm.mgz` | Opposite hemisphere volume |
| `--sdir` | `<dir>` | `$SUBJECTS_DIR` | Subjects directory |
| `--rand` | `<pct>` | 0.0 | Fraction of random (non-FCD) patches to add |
| `--augment` | — | off | Enable patch augmentation (rotations) |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `--rand` adds random non-FCD patches in proportion `pct` of the total label patches, for class balancing in training.
- `--augment` enables rotational augmentation of the extracted patches.
- `--sphere` must name a bilateral sphere that maps the source hemisphere to the opposite hemisphere. The default `sphere.d1.left_right` is a research-specific registered sphere not present in all subjects.
- `--vol` and `--ovol` can differ if the hemispheres use different input volumes.

## Typical Use Cases

```bash
# Extract FCD training patches for subject
mris_extract_patches subj001 /tmp/patches/subj001

# With random non-FCD patches for class balance
mris_extract_patches --rand 0.5 subj001 /tmp/patches/subj001

# Custom label and window size
mris_extract_patches --label MyLabel --wsize 64 subj001 /tmp/patches/subj001
```

## Pipeline Context

Not called by `recon-all`. Used in research for building training datasets for FCD detection CNNs. The `sphere.d1.left_right` sphere is produced by a bilateral surface registration pipeline.

## Gotchas and Caveats

> [!gotcha] sphere.d1.left_right is research-specific
> The default `sphere.d1.left_right` sphere is not produced by standard `recon-all`. It requires a bilateral spherical registration step. Most subjects will not have this file unless specifically generated.

> [!gotcha] Label path convention
> The label file is expected at `$SUBJECTS_DIR/<subj>/label/<hemi>.<label>.label`. The `--label` argument provides only the name without the path or extension.

## Related Tools

- [[mris_expand]] — surface expansion
- [[surface-format]] — surface and label file formats

## Confidence and Gaps

**Confident (from source):** All flags, FCD/bilateral design, bilateral sphere dependency, output patch structure, random augmentation options.

**Uncertain:** Exact output file naming convention; patch rotation angles for augmentation.
