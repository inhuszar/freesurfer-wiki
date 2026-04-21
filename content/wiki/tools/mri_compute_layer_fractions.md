---
title: "mri_compute_layer_fractions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_volume_fractions/mri_compute_layer_fractions.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_volume_fractions]]"
  - "[[mri_vol2surf]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact definition of laminar boundaries used for the 6-layer model not fully documented in source"
  - "Relationship to Brodmann-layer histology vs. MRI-derived depth fractions unclear"
tags:
  - laminar
  - cortex
  - partial-volume
---

# mri_compute_layer_fractions

## Summary

`mri_compute_layer_fractions` computes the fractional contributions of six cortical laminar compartments (layers 1–6), white matter, subcortical gray matter, CSF, and ventricles to each voxel in a target functional volume. It uses a registration file to map between the functional space and the FreeSurfer anatomical space, then builds a high-resolution laminar label volume from cortical surfaces and assigns fractions to the target grid.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_volume_fractions/mri_compute_layer_fractions.cpp`
- **Original author:** Bruce Fischl
- **Build location:** same CMakeLists.txt as `mri_compute_volume_fractions`

## Purpose and Context

This tool extends [[mri_compute_volume_fractions]] by further subdividing the cortical gray-matter fraction into six depth-based laminar bands. The laminar depth is typically derived from a "gwdist" (gray–white distance) overlay. The six layers are defined as equal fractions of the cortical depth between the white matter surface and the pial surface, providing a fine-grained partial-volume model suitable for laminar fMRI or layer-resolved analyses.

The tool is oriented toward high-resolution functional imaging (e.g., 7T laminar fMRI) where the voxel size approaches the thickness of individual cortical layers.

## Inputs

- **Registration file** (`reg_fname`): a `.dat`-format register file mapping the functional volume to the FreeSurfer anatomical space. Pass `identity.nofile` to skip registration.
- **Input functional volume** (`in_fname`): the target volume for which fractions are computed.
- **Output volume** (`out_fname`): path for the output multi-frame fraction map.
- **`SUBJECTS_DIR`** environment variable must be set.
- Cortical surfaces (`?h.white`, `?h.pial`) and the `gwdist` overlay for the specified hemisphere.
- `aseg.mgz` from the subject's FreeSurfer reconstruction (unless `--noaseg` is specified).

## Outputs

A multi-frame [[mgz]] volume where each frame encodes the fraction of one tissue compartment:
- Frames 1–6: cortical layers 1–6 (from white matter toward pial surface)
- Frame 7 (WM_VAL=1): white matter fraction
- Frame 8 (CSF_VAL): CSF fraction
- Frame 9 (SUBCORT_GM_VAL): subcortical gray matter fraction
- Frame 10 (VENTRICLE_VAL): ventricle fraction

The number of frames is `nlayers + 4` where `nlayers` defaults to 6.

## Mathematical Foundations

Laminar fractions are computed via a high-resolution internal label volume built at the specified `resolution` (default 0.5 mm). Each voxel in the internal volume is assigned a laminar label based on its fractional depth $d$ between the white surface ($d=0$) and the pial surface ($d=1$):

$$
\text{layer} = \left\lfloor d \cdot N_\text{layers} \right\rfloor + 1
$$

where $N_\text{layers} = 6$ by default.

The fractional contributions to the lower-resolution target volume are then computed via `MRIcomputePartialVolumeFractions()`, which maps the internal label volume to the target grid using the vox-to-vox transformation matrix $M$ derived from the registration file.

> [!math] Vox-to-vox transform
> The registration `.dat` file encodes a tkRAS-to-tkRAS matrix. The vox-to-vox transform used internally is:
> $$
> M_\text{vox2vox} = V_\text{dst}^{-1} \cdot R \cdot V_\text{src}
> $$
> where $V$ are the vox-to-ras matrices and $R$ is the RAS-to-RAS registration matrix from the `.dat` file.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-hemi` | `lh` or `rh` | `lh` | Hemisphere to process |
| `-sdir` | path | `$SUBJECTS_DIR` | Subjects directory |
| `-resolution` | float | `0.5` | Internal upsampling resolution in mm |
| `-nlayers` | int | `6` | Number of cortical layers |
| `-noaseg` | — | off | Skip aseg loading (for testing) |
| `-cortex_only` | — | on | Restrict to cortex ribbon only |
| `-FS_names` | — | off | Use FreeSurfer standard naming for output frames |
| `-subject` | name | from reg file | Override subject name |
| `-synth` | fname | — | Create synthetic test volume instead |

> [!gap] Option `-laminar_name`
> The source defines `LAMINAR_NAME = "gwdist"` but does not expose this as a user flag. The laminar depth surface overlay is always read from `?h.gwdist`. Whether users can substitute a custom depth map is unclear.

## Configuration Interactions

- `-noaseg` disables loading of `aseg.mgz`; non-cortical structures will not be correctly labeled in the output.
- `-cortex_only` (default on) restricts fractional computation to the cortical ribbon; background voxels receive zero in all cortical frames.
- `-nlayers` changes the number of output frames; downstream scripts expecting 6 cortical layers will break if this is changed.
- `-hemi` processes only one hemisphere at a time; both hemispheres can be combined by running the tool twice and summing.

## Typical Use Cases

Compute 6-layer cortical fractions for a 7T EPI volume:
```bash
mri_compute_layer_fractions \
  register.dat \
  func.nii.gz \
  layer_fracs.mgz
```

Use right hemisphere:
```bash
mri_compute_layer_fractions \
  -hemi rh \
  register.dat \
  func.nii.gz \
  rh_layer_fracs.mgz
```

## Pipeline Context

This tool is not called by [[recon-all]]. It is a post-processing utility used in laminar fMRI workflows:

1. Run `recon-all` to produce surfaces and `aseg.mgz`.
2. Register functional data to the anatomical space (e.g., using [[mri_coreg]]).
3. Run `mri_compute_layer_fractions` with the resulting `.dat` registration file.
4. Use output fraction maps for partial-volume-corrected layer-resolved analyses.

## Gotchas and Caveats

> [!gotcha] Only one hemisphere at a time
> Unlike [[mri_compute_volume_fractions]], this tool processes one hemisphere per run. To obtain whole-brain laminar fractions, you must run for both `lh` and `rh` and combine the results.

> [!gotcha] Requires gwdist overlay
> The tool reads `?h.gwdist` from the subject's `surf/` directory. This file is not created by standard `recon-all` and must be generated separately (e.g., via `mris_thickness` or laminar depth utilities).

> [!gotcha] Registration format
> Only the legacy `.dat` register file format is accepted (not LTA). Use `lta_convert` to convert LTA files if needed.

> [!assumption] Input data assumption
> The functional volume is expected to be in a lower-resolution functional space (e.g., 1–2 mm EPI). The tool computes internal representations at `resolution` mm (default 0.5 mm) to resolve sub-voxel laminar boundaries.

## Related Tools

- [[mri_compute_volume_fractions]] — coarser tissue-type fractions (cortex, WM, subcortical GM, CSF)
- [[mri_vol2surf]] — project volume data onto the cortical surface
- [[mri_coreg]] — register functional to anatomical

## Confidence and Gaps

Confidence in tool behavior is **medium**. Core logic is clear from source code. Gaps:

> [!gap] gwdist file dependency
> The `gwdist` surface overlay is required but its creation pipeline is not documented. The tool will fail silently or crash if `?h.gwdist` is absent.

> [!gap] Layer definition relative to histology
> The 6 equal-depth divisions are a geometric approximation. Their correspondence to cytoarchitectonic layers (I–VI) depends on cortical thickness and varies across regions.
