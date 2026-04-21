---
title: "mris_annot_to_segmentation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_annot_to_segmentation/mris_annot_to_segmentation.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_aparc2aseg]]"
  - "[[mris_ca_label]]"
  - "[[mri_label2vol]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Coordinate system branch (useRealRAS vs. surfaceRAS) behaviour needs verification for non-standard subjects."
tags:
  - annotation
  - segmentation
  - surface-to-volume
---

# mris_annot_to_segmentation

## Summary

`mris_annot_to_segmentation` converts a cortical surface annotation (`.annot` parcellation) into a volumetric segmentation by filling the voxels that lie between the white-matter and pial surfaces with the integer label assigned to each surface vertex. The output is a volume in the same voxel space as the subject's T1 image.

## Source Information

- **Language:** C++
- **Source file:** `mris_annot_to_segmentation/mris_annot_to_segmentation.cpp`

## Purpose and Context

Surface-based parcellations assign anatomical labels to cortical vertices. Many downstream analyses require volumetric segmentations. This tool bridges that gap by marching along the surface-normal direction from the white surface to the pial surface (in steps of 0.1 mm) and writing the vertex's label index into the corresponding voxels of an output volume. The result is a cortical ribbon segmentation labelled by parcellation region.

It is a lower-level alternative to [[mri_aparc2aseg]], which does the same job but also fills subcortical structures and handles the full aparc label set.

## Inputs

| Input | Description |
|-------|-------------|
| `<subject name>` | FreeSurfer subject name (positional) |
| `<hemi>` | Hemisphere: `lh` or `rh` (positional) |
| `<surface>` | Surface file name, e.g., `white` (positional) |
| `<annot_file>` | Annotation file path (positional) |
| `<color_file>` | ASCII colour lookup table (FreeSurfer format) (positional) |
| `<output_file>` | Output volume path (positional) |

- Requires `SUBJECTS_DIR` environment variable.
- Automatically reads `$SUBJECTS_DIR/<subject>/mri/T1` as the template volume for geometry.
- Automatically loads `$SUBJECTS_DIR/<subject>/surf/<hemi>.pial` as the outer boundary.

## Outputs

| Output | Description |
|--------|-------------|
| `<output_file>` | Volumetric segmentation (same voxel grid as T1); integer voxel values = parcellation structure index |

## Mathematical Foundations

For each annotated vertex $v$, the tool finds the direction vector from the current (white) surface position $(x_w, y_w, z_w)$ to the pial position $(x_p, y_p, z_p)$:

$$\mathbf{d} = \frac{(x_p - x_w, \; y_p - y_w, \; z_p - z_w)}{\|(x_p - x_w, y_p - y_w, z_p - z_w)\|}$$

It then steps along this direction from $d=0$ to $d=\|\mathbf{pial} - \mathbf{white}\|$ in increments of 0.1:

$$(x, y, z)_d = (x_w, y_w, z_w) + d \cdot \mathbf{d}$$

Each 3D point is converted to voxel indices via `MRIsurfaceRASToVoxel` (or `MRIworldToVoxel` if `useRealRAS` is set) and the voxel is assigned the structure index.

## Configuration Options

No command-line flags beyond the six positional arguments. The tool calls `print_usage()` and exits if fewer than 7 arguments are provided.

| Positional | Description |
|-----------|-------------|
| 1. subject name | FreeSurfer subject identifier |
| 2. hemi | `lh` or `rh` |
| 3. surface | Name of the current-position surface (e.g., `white`) |
| 4. annot file | Full path to `.annot` file |
| 5. color file | ASCII colour table file |
| 6. output file | Output volume path |

## Configuration Interactions

- The tool always loads the `pial` surface as the outer boundary regardless of what surface name is supplied for the white boundary. The `<surface>` argument only controls the inner surface.
- If the annotation has an embedded colour table (`mris->ct`), it is used instead of the external `<color_file>`. The external colour file is a fallback.

> [!gotcha] Coordinate system branch
> The code branches on `mris->useRealRAS`: if set, scanner RAS (`MRIworldToVoxel`) is used; otherwise surface RAS (`MRIsurfaceRASToVoxel`) is used. For standard FreeSurfer subjects this will be surface RAS. Mixing surfaces from different tools that set this flag differently could produce incorrect segmentations.

## Typical Use Cases

```bash
# Convert left hemisphere aparc annotation to a segmentation volume
mris_annot_to_segmentation bert lh white \
    $SUBJECTS_DIR/bert/label/lh.aparc.annot \
    $FREESURFER_HOME/FreeSurferColorLUT.txt \
    $SUBJECTS_DIR/bert/mri/lh.aparc.seg.mgz
```

## Pipeline Context

Not called by `recon-all` directly; [[mri_aparc2aseg]] is the standard pipeline tool for this purpose. `mris_annot_to_segmentation` may be useful when:
- Working with non-standard annotations.
- Wanting only the cortical ribbon without subcortical labels.
- Debugging or validating custom parcellations.

## Gotchas and Caveats

> [!gotcha] Step size fixed at 0.1 mm
> The interior-filling step size is hard-coded at 0.1 mm. For very thin cortex or very high-resolution volumes, this may miss voxels or double-fill. No option exists to change this.

> [!gotcha] T1 must exist
> The tool reads `$SUBJECTS_DIR/<subject>/mri/T1` as the volume geometry template. If this file is absent (e.g., in non-standard subject directories), the tool will fail with a "could not read T1" error.

> [!gotcha] Unnannotated vertices ignored
> Vertices with `annotation == 0` (unknown) are skipped; those voxels remain 0 in the output.

## Related Tools

- [[mri_aparc2aseg]] — full-featured version that also fills subcortical structures
- [[mri_label2vol]] — converts surface labels to volumes
- [[mris_ca_label]] — produces the annotation files that feed into this tool

## Confidence and Gaps

**Confident:** Core algorithm, I/O structure, coordinate system handling, and all positional arguments are confirmed from the complete source file.

> [!gap] Non-standard surface names
> The tool always loads `pial` as the outer surface. If the user supplies a non-standard inner surface name, the pial-to-inner distance may not correspond to the actual cortical ribbon, producing incorrect output. This behaviour is fixed in the source.
