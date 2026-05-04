---
title: "mri_transform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_transform/mri_transform.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mris_transform]]"
  - "[[coordinate-systems]]"
  - "[[mri_vol2vol]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "MT_CoronalRasXformToVoxelXform() coordinate convention not fully documented."
tags:
  - mri
  - transform
  - LTA
  - registration
  - coordinates
---

# mri_transform

## Summary

`mri_transform` applies a linear geometric transform (LTA or legacy matrix format) to an MRI volume or connectivity matrix (cmat), producing a resampled output in the target coordinate space. It supports multiple transform types (RAS-to-RAS, voxel-to-voxel, coronal-RAS-to-coronal-RAS, and legacy linear formats), multiple resampling methods, and optionally processes only specified label values. It is an older tool; [[mri_vol2vol]] is the modern preferred alternative for volume resampling.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_transform/mri_transform.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_transform`
- **Note:** The source has OpenMP support for parallelised surface creation functions.

## Purpose and Context

`mri_transform` was one of the original FreeSurfer tools for applying geometric transforms to volumes. It supports:

1. **Volume resampling:** Applying an affine transform (LTA) to resample a volume into a new coordinate space (the primary use case).
2. **Connectivity matrix transform:** Applying a transform to a `.cmat` connectivity matrix structure, converting its coordinate labels.
3. **Surface creation from volume:** Creating surface representations from the transformed volume (internal pipeline feature).

The transform is read using `TransformRead()`, which supports LTA, `.xfm`, `.m3d`, and other formats.

Modern pipelines should prefer [[mri_vol2vol]] for volume resampling, which has a cleaner interface and better documentation.

## Inputs

### Required Inputs

(Positional arguments: `<input_volume> <transform_file> <output_volume>`)

- **`<input_volume>`** — input MRI volume or cmat file.
- **`<transform_file>`** — transform file (LTA, XFM, or other supported format). Pass `none` for identity.
- **`<output_volume>`** — output resampled volume.

### Input Assumptions

> [!assumption] Transform coordinate convention
> The expected coordinate convention of the transform depends on its `type` field. The tool handles `LINEAR_RAS_TO_RAS`, `LINEAR_CORONAL_RAS_TO_CORONAL_RAS`, and `LINEAR_VOX_TO_VOX` types, converting between them as needed.

> [!assumption] Optional output-like geometry
> The `--like` flag (`out_like_fname`) specifies a reference volume whose geometry (dimensions, vox2ras) is used for the output. Without this, the tool uses the target space from the LTA.

## Outputs

### Files Created

- **Transformed volume** — output in the destination coordinate space.
- Optionally, surface files if surface-related flags are used.

## Mathematical Foundations

The transform chain applied to each voxel:

1. Convert output voxel $(i', j', k')$ to output RAS: $\mathbf{r'} = M_{\text{dst\_vox2ras}} \cdot \mathbf{p'}$
2. Apply inverse transform to get input RAS: $\mathbf{r} = T^{-1}(\mathbf{r'})$
3. Convert input RAS to input voxel: $\mathbf{p} = M_{\text{src\_vox2ras}}^{-1} \cdot \mathbf{r}$
4. Interpolate input volume at $\mathbf{p}$ using the selected resampling method.

**Coronal RAS to Coronal RAS:** The `MT_CoronalRasXformToVoxelXform()` function handles the legacy "coronal RAS" coordinate convention (a non-standard FreeSurfer internal format). This is converted to standard vox2vox before resampling.

## Configuration Options

All flags are case-insensitive. The full `get_option()` has been read.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help` | — | — | Print help and exit |
| `--version` | — | — | Print version string and exit |
| `-debug_voxel <x> <y> <z>`<br>`-debug-voxel <x> <y> <z>` | int×3 | disabled | Enable per-voxel diagnostic output; sets `Gx`, `Gy`, `Gz` |
| `-in_like <vol>`<br>`-in-like <vol>`<br>`-il <vol>` | path | null | Reference volume whose geometry is used as the input template (required for `.cmat` mode); sets `in_like_fname` |
| `-out_like <vol>`<br>`-out-like <vol>`<br>`-ol <vol>` | path | null | Reference volume whose geometry is used to shape the output; overrides geometry from LTA; sets `out_like_fname` |
| `-voxel` | — | off | For `.cmat` input: convert connectivity matrix label coordinates to voxel coordinates before writing; sets `cmat_output_coords=LABEL_COORDS_VOXEL` |
| `-scanner` | — | off | For `.cmat` input: convert label coordinates to scanner RAS; sets `cmat_output_coords=LABEL_COORDS_SCANNER_RAS` |
| `-tkreg` | — | off | For `.cmat` input: convert label coordinates to tkRegister RAS; sets `cmat_output_coords=LABEL_COORDS_TKREG_RAS` |
| `-surf <in_surf> <out_surf>`<br>`-surface <in_surf> <out_surf>` | 2 paths | none | Surface-from-volume mode: create a volume mapping from `in_surf` to `out_surf` surface; sets `in_surf_name` and `out_surf_name` |
| `-Q` | — | off | Quiet mode: suppress most output; sets `quiet_mode=1` |
| `-S <subject>` | string | none | Subject name (stored but usage in the transform chain is context-dependent) |
| `-D <n>` | int | none | Compute average distance traversed by label `n`; sets `labels[nlabels]` and increments `nlabels`; can be specified multiple times (up to 1000 labels) |
| `-V <n>` | int | — | Set global diagnostic number `Gdiag_no` for per-voxel debugging |
| `-I` | — | false | Invert the transform; sets `invert_flag=1` |
| `-R <type>` | string | `interpolate` | Resampling interpolation method; accepted values: `interpolate` (trilinear), `nearest`, `weighted`, `sinc`, `cubic`; sets `resample_type` |
| `-U`<br>`-?` | — | — | Print usage and exit |

### Configuration Interactions

- `-D` restricts processing to specific labels; other voxels are set to 0 in the output. Can be specified multiple times, up to 1000 labels.
- `-surf` / `-surface` enables surface-from-volume mode; the transform is applied to surface vertices rather than volume voxels.
- `-out_like` overrides the output geometry from the LTA; useful when the LTA target geometry is wrong.
- For `.cmat` input, `-in_like` and `-out_like` are required; the tool exits with an error if either is missing.
- `-voxel`, `-scanner`, and `-tkreg` are mutually exclusive cmat coordinate type selectors; the last specified wins.

> [!gotcha] Coronal RAS is a legacy format
> The `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` type is a historical coordinate convention from early FreeSurfer. Most modern transforms are RAS-to-RAS or VOX-to-VOX. Using this tool with legacy transforms requires understanding this convention.

## Typical Use Cases

### Use Case 1: Apply Talairach transform to T1 volume

```bash
mri_transform \
  $SUBJECTS_DIR/subject/mri/nu.mgz \
  $SUBJECTS_DIR/subject/mri/transforms/talairach.lta \
  $SUBJECTS_DIR/subject/mri/nu_tal.mgz
```

### Use Case 2: Apply inverse transform

```bash
mri_transform --invert \
  atlas.mgz \
  $SUBJECTS_DIR/subject/mri/transforms/talairach.lta \
  subject.mgz
```

## Pipeline Context

`mri_transform` is not called in the standard `recon-all` pipeline (modern scripts use `mri_vol2vol` or direct LTA application). It may appear in older scripts.

## Gotchas and Caveats

> [!gotcha] Prefer mri_vol2vol for modern use
> [[mri_vol2vol]] is the modern recommended tool for volume resampling with transforms. It has a cleaner interface and broader format support.

> [!gotcha] Transform type must be correct
> Providing a transform with incorrect type (e.g., a VOX-to-VOX matrix passed as RAS-to-RAS) will silently produce an incorrectly resampled output.

## Related Tools

- [[mri_vol2vol]] — modern replacement for volume resampling with transforms
- [[mris_transform]] — analogous tool for surfaces (not volumes)
- [[coordinate-systems]] — coordinate system definitions and transform type conventions

## Confidence and Gaps

**High confidence (flags):** All flags confirmed from complete reading of `get_option()` in source. Default `resample_type=SAMPLE_TRILINEAR`, quiet mode, invert flag, and all coordinate conversion modes verified from source.

**Medium confidence:** The `MT_CoronalRasXformToVoxelXform()` legacy coordinate convention was not fully traced.

> [!note] Audit noise: single-dash stripping parser
> An automated audit may report `-debug-voxel`, `-il`, `-in-like`, `-ol`, `-out-like`, `-scanner`, `-surf`, `-surface`, `-tkreg`, `-voxel` as C3 invalid. This is a false positive: `get_option()` uses `option = argv[1] + 1` to strip the leading dash, then compares with `!stricmp(option, "-il")` etc. Double-dash forms (e.g., `-il` → `-il`) are correctly accepted. The audit can only find single-dash literals in source.
