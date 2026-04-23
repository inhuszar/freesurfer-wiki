---
title: "mri_3d_photo_recon"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "mri_3d_photo_recon/mri_3d_photo_recon"
  - "mri_3d_photo_recon/photo_reconstruction/utils.py"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Underlying Python implementation not inspected (recon_case.py)"
  - "SynthSeg and SynthSR integration details not verified"
tags:
  - photo-reconstruction
  - deep-learning
  - ex-vivo
---

# mri_3d_photo_recon

## Summary

`mri_3d_photo_recon` reconstructs a 3D volume from a stack of 2D photographs of brain slabs. It is designed for ex-vivo or post-mortem tissue where conventional MRI scanning is impossible or impractical. The tool combines deformable registration of individual slab photos, optional MRI-guided alignment, and deep-learning-based photo imputation and super-resolution to produce a coherent 3D reconstruction.

## Source Information

- **Language:** bash (wrapper script invoking a Python backend)
- **Source file:** `mri_3d_photo_recon/mri_3d_photo_recon`
- **Python backend:** `$FREESURFER_HOME_FSPYTHON/python/packages/3d_photo_recon/scripts/recon_case.py`
- **Deep learning model:** `$FREESURFER_HOME/models/photo_imputation_unet.pth`
- **Original author:** Juan Eugenio Iglesias (March 2025)

## Purpose and Context

Standard FreeSurfer workflows require in-vivo MRI scans. For cases where only post-mortem tissue photographs are available (e.g., histopathology studies, brain bank specimens), `mri_3d_photo_recon` provides a pathway to generate a 3D volumetric reconstruction that can be registered to standard atlases. The tool is particularly relevant for studies combining ex-vivo histology with in-vivo imaging.

The reconstruction proceeds in 2D–3D alignment stages, jointly optimising slab-to-slab continuity and, when a reference MRI is provided, agreement with the reference anatomy.

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Photo directory | `--input_photo_dir` | Directory of 2D slab photographs (required) |
| Segmentation directory | `--input_segmentation_dir` | Directory of slab masks / segmentations (required) |
| Hemisphere | `--hemisphere` | `left`, `right`, or `both` (required) |
| Slice thickness | `--slice_thickness` | Slab thickness in mm (required) |
| Photo resolution | `--photo_resolution` | In-plane photo resolution in mm (required) |
| Output directory | `--output_directory` | Output path (required) |
| Reference MRI | `--ref_mri` | Optional reference T1 MRI scan |

## Outputs

Written to `--output_directory`:

| File | Description |
|------|-------------|
| Reconstructed photo volume | 3D volume assembled from photos |
| Reference volume | Registration reference |
| Deformed surfaces (optional) | If `--deform_recon_dir` is provided |
| Deformed ROI masks (optional) | If `--input_roi_dir` is provided |

## Mathematical Foundations

The reconstruction optimises a joint objective combining:

1. **2D nonlinear deformation** of each photograph to align with adjacent slabs (regularised by `--k_regularizer_nonlin`).
2. **3D nonlinear deformation** of the reference MRI to match the photo volume (regularised by `--k_regularizer_nonlin3d`).
3. **LNCC (local normalised cross-correlation)** between reference MRI and reconstruction (weighted by `--k_lncc_mri`).
4. **Dice loss** between reference and reconstruction masks (weighted by `--k_dice_mri`).
5. **Slice-to-slice SSD** for regularising AP consistency (weighted by `--k_dif_slice_loss`).
6. **Mesh-based loss** penalising distance from slab boundary to mesh vertices (weighted by `--k_mesh_loss`).

Optimisation uses Adam followed by optional BFGS fine-tuning.

> [!gap] Deep learning architecture
> The exact U-Net architecture for photo imputation (`photo_imputation_unet.pth`) is not documented in the shell wrapper. Consult the Python backend `recon_case.py` for details.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--input_photo_dir` | path | required | Directory of input slab photos |
| `--input_segmentation_dir` | path | required | Directory of slab masks/segmentations |
| `--hemisphere` | string | required | `left`, `right`, or `both` |
| `--slice_thickness` | float | required | Slab thickness in mm |
| `--photo_resolution` | float | required | Photo resolution in mm/pixel |
| `--output_directory` | path | required | Output directory |
| `--ref_mri` | path | — | Reference MRI scan |
| `--ref_mri_synthseg` | path | — | Pre-computed SynthSeg of reference MRI |
| `--ref_mri_synthsr` | path | — | Pre-computed SynthSR of reference MRI |
| `--low_field_synthsr` | flag | off | Use low-field SynthSR model |
| `--input_roi_dir` | path | — | Directory of ROI masks to deform |
| `--ref_mesh` | path | — | Reference surface mesh |
| `--mesh_reorient_with_indices` | string | — | Indices to reorient mesh |
| `--fresh_tissue` | flag | off | Relaxed regularisers for fresh tissue |
| `--photos_of_posterior_side` | flag | off | Photos taken from posterior side of slabs |
| `--order_posterior_to_anterior` | flag | off | Photos ordered posterior-to-anterior |
| `--initial_stretch_factor_lr_photos` | float | — | Initialise LR stretch of photos |
| `--no_z_stretch` | flag | off | Fix slab thickness at `--slice_thickness` |
| `--stretch_factor_lr_mesh` | float | — | Stretch mesh LR by factor |
| `--weights` | CSV file | — | Per-slab weights (comma-separated) |
| `--thickness_cap` | float | — | Maximum estimated slab thickness (mm) |
| `--equalize_images` | flag | off | Equalise image contrast |
| `--skip_bfgs` | flag | off | Skip BFGS fine-tuning (Adam only) |
| `--threads` | int | 1 | CPU threads (-1 = all available) |
| `--gpu` | int | None | GPU index (None = CPU mode) |
| `--deform_recon_dir` | path | — | FreeSurfer subject dir for surface deformation |
| `--cp_spacing_2d` | float | — | 2D control point spacing (advanced) |
| `--cp_spacing_3d` | float | — | 3D control point spacing (advanced) |
| `--k_lncc_mri` | float | — | LNCC loss weight |
| `--k_dice_mri` | float | — | Dice loss weight |
| `--k_dif_slice_loss` | float | — | Slice SSD weight |
| `--k_mesh_loss` | float | — | Mesh boundary loss weight |
| `--k_regularizer` | float | — | Log-det(affine) regulariser weight |
| `--k_regularizer_nonlin` | float | — | 2D nonlinear regulariser weight |
| `--k_regularizer_nonlin3d` | float | — | 3D nonlinear regulariser weight |
| `--k_regularizer_sz` | float | — | AP stretch regulariser weight |
| `--use_svf_for_photos` | flag | off | Use a diffeomorphic SVF deformation model for photo-to-volume alignment instead of the default affine model |

## Configuration Interactions

- `--ref_mri` is optional but strongly recommended; without it, the reconstruction relies solely on inter-slab consistency and the slab masks.
- `--ref_mri_synthseg` and `--ref_mri_synthsr` are computed automatically if not provided (requires network access to model files).
- `--low_field_synthsr` is only relevant when `--ref_mri_synthsr` is in use and the scan is from a low-field scanner.
- `--fresh_tissue` relaxes regularisers and is intended for tissue that has not been fixed/sectioned in standard conditions.
- `--skip_bfgs` reduces runtime at the cost of reconstruction quality.

## Typical Use Cases

```bash
# Minimal reconstruction without reference MRI
mri_3d_photo_recon \
  --input_photo_dir /data/photos \
  --input_segmentation_dir /data/masks \
  --hemisphere left \
  --slice_thickness 3.0 \
  --photo_resolution 0.1 \
  --output_directory /data/recon_output

# With reference MRI for guided reconstruction
mri_3d_photo_recon \
  --input_photo_dir /data/photos \
  --input_segmentation_dir /data/masks \
  --hemisphere both \
  --slice_thickness 4.0 \
  --photo_resolution 0.05 \
  --output_directory /data/recon_output \
  --ref_mri /data/t1.nii.gz \
  --threads 8 \
  --gpu 0

# With surface deformation output
mri_3d_photo_recon \
  --input_photo_dir /data/photos \
  --input_segmentation_dir /data/masks \
  --hemisphere left \
  --slice_thickness 3.0 \
  --photo_resolution 0.1 \
  --output_directory /data/recon_output \
  --ref_mri /data/t1.nii.gz \
  --deform_recon_dir /data/subjects/mysub
```

## Pipeline Context

`mri_3d_photo_recon` is a standalone ex-vivo reconstruction tool with no role in the standard `recon-all` in-vivo pipeline. It may feed outputs into standard FreeSurfer downstream tools if the reconstructed volume is of sufficient quality for segmentation.

## Gotchas and Caveats

- Requires `FREESURFER_HOME_FSPYTHON` environment variable to be set (different from `FREESURFER_HOME`); the Python environment must include the `3d_photo_recon` package.
- The model file `photo_imputation_unet.pth` must be present in `$FREESURFER_HOME/models/`.
- Photos must be in a consistent ordering (anterior-to-posterior by default). Incorrect ordering will produce reversed reconstructions.
- `--thickness_cap` is only needed when the automatic thickness estimation fails; the tool prints a warning if this is the case.

## Related Tools

- [[mri_convert]] — format conversion for reference MRI inputs

## Confidence and Gaps

**Medium confidence:** all flags documented from the help text in the shell wrapper. Internal optimisation details require reading `recon_case.py`.

> [!gap] Python backend details
> The Python script `recon_case.py` was not read during this documentation pass. Loss function implementation, network architecture, and exact optimisation schedule need verification from that source.
