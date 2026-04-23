---
title: "mri_compute_volume_fractions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_volume_fractions/mri_compute_volume_fractions.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_layer_fractions]]"
  - "[[mri_compute_volume_intensities]]"
  - "[[mri_vol2surf]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Tissue type schema definition in TissueTypeSchema() not fully documented"
tags:
  - partial-volume
  - tissue-type
  - cortex
  - fmri
---

# mri_compute_volume_fractions

## Summary

`mri_compute_volume_fractions` estimates the partial volume fractions of cortical gray matter, subcortical gray matter, white matter, and CSF at every voxel in a target volume (e.g., an EPI image). It uses FreeSurfer's cortical surfaces (white and pial), the aseg segmentation, and a registration file to compute sub-voxel-accurate tissue fractions via internal upsampling.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_volume_fractions/mri_compute_volume_fractions.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Partial volume effects (PVE) are significant in functional MRI, particularly at the boundaries between gray matter, white matter, and CSF. This tool generates per-voxel tissue fraction maps that can be used to:
- Correct BOLD signal for partial volume contamination
- Generate gray-matter probability masks for fMRI analysis
- Weight statistical models by tissue content

It uses both the segmentation (for subcortical structures) and the cortical surfaces (for cortical gray matter), with internal upsampling to resolve sub-voxel boundaries. The core computation is `MRIpartialVolumeFractionAS()`.

## Inputs

- **Registration file** (`--reg`): LTA or legacy `.dat` file mapping the aseg/surface space to the target functional volume. If `.dat` format, a template volume must also be provided.
- **`--regheader subject tempvol`**: compute registration from headers rather than an explicit file.
- **Subject** (`$SUBJECTS_DIR/subject/`): contains `mri/aseg.mgz`, `surf/?h.white`, `surf/?h.pial`.
- **`SUBJECTS_DIR`** environment variable must be set.
- Optionally a custom segmentation via `--seg` and custom surface names via `--wsurf`, `--psurf`.

## Outputs

One of:
- `--o outstem`: separate files `outstem.{cortex,subcort_gm,wm,csf}.{fmt}` (one per tissue type)
- `--stack stackfile`: all tissue frames stacked into a single multi-frame volume
- `--gm gmfile`: sum of cortex + subcortical gray matter in one frame

Output format defaults to `.mgz` but can be changed with `--nii.gz`, `--nii`, `--mgh`.

Tissue types (frames in `--stack` output):
1. Cortical gray matter
2. Subcortical gray matter
3. White matter
4. CSF

Optionally: `--out-seg outseg` saves the modified aseg (after extracerebral CSF filling), `--ttseg ttseg` saves the tissue-type segmentation.

## Mathematical Foundations

The tool calls `MRIpartialVolumeFractionAS()`, which:
1. Upsamples the aseg to an internal resolution of `aseg->xsize / USF` mm (default USF=2, giving ~0.5 mm).
2. For cortical voxels, uses the white and pial surface pair to determine whether each high-resolution sub-voxel is inside the cortical ribbon.
3. Counts the fraction of sub-voxels per tissue type to fill each output voxel.

The upsampling factor `USF` controls the accuracy vs. compute time trade-off:
$$
\text{effective resolution} = \frac{\text{aseg voxel size}}{\text{USF}}
$$

> [!math] Partial volume fraction
> For a target voxel $V$, the cortical fraction is:
> $$
> f_\text{cortex}(V) = \frac{N_\text{cortex sub-voxels in } V}{N_\text{total sub-voxels in } V}
> $$
> where sub-voxels are at the internal resolution `resmm`.

CSF filling: By default, the aseg is dilated (`--ndil 3`) to add extracerebral CSF labels around the brain. This ensures that voxels outside the segmentation are not left as "unknown" in the fraction maps.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--o outstem`<br>`--pvf` | path stem | required | Output filename stem |
| `--stack stackfile` | file | none | Single multi-frame output |
| `--gm gmfile` | file | none | Combined GM (cortex + subcort) output |
| `--reg regfile` | LTA or .dat | required (or `--regheader`) | Registration to target space |
| `--regheader subject tempvol` | subject, vol | — | Compute registration from headers |
| `-s subject`<br>`--s` | name | from reg | Override subject name |
| `--seg segfile` | file | `aseg.mgz` | Custom segmentation (relative to subject mri/) |
| `--wsurf surf` | name | `white` | White surface name |
| `--psurf surf` | name | `pial` | Pial surface name |
| `--usf USF` | int | 2 | Anatomical upsampling factor |
| `-r res`<br>`--r` | float | — | Resolution in mm (sets USF = round(1/res)) |
| `--resmm resmm` | float | aseg.xsize/USF | Functional upsampling resolution |
| `--no-aseg` | — | off | Skip aseg loading |
| `--fill-csf` | — | on | Fill surrounding voxels with extracerebral CSF |
| `--no-fill-csf` | — | off | Disable CSF filling |
| `--ndil N` | int | 3 | Dilation steps for CSF filling |
| `--csf-mask maskfile` | file | none | Mask out non-CSF voxels (relative to subject mri/) |
| `--out-seg outseg` | file | none | Save modified aseg after CSF fill |
| `--ttseg ttseg` | file | none | Save tissue-type segmentation |
| `--ttseg-ctab ctabfile` | file | none | Save tissue-type color table |
| `--ttype+head` | — | off | Use `default-jan-2014+head` tissue type schema |
| `-mgz`<br>`-mgh`<br>`-nii`<br>`-nii.gz`<br>`--mgz`<br>`--mgh`<br>`--nii`<br>`--nii.gz` | — | mgz | Output format (single- and double-dash accepted) |
| `--sd path`<br>`-SDIR path` | path | $SUBJECTS_DIR | Override SUBJECTS_DIR (note: `-SDIR` is case-sensitive) |
| `--vg-thresh threshold` | float | 10e-4 | Threshold for LTA geometry mismatch warnings |
| `--debug` | — | off | Enable debug output |
| `--checkopts` | — | off | Check options and exit without processing |
| `--nocheckopts` | — | off | Do not exit after checking options |
| `--diag-no` | `<n>` | — | Set Gdiag_no for selective diagnostic output |

## Configuration Interactions

- `--reg` and `--regheader` are mutually exclusive.
- If `--reg` points to a `.dat` file (not LTA), a template volume must be supplied as a second argument to `--reg`.
- `--no-aseg` disables subcortical gray matter fractions; only surface-based cortical fractions will be meaningful.
- `--no-fill-csf` may cause voxels outside the segmented brain to receive zero fractions for all tissue types.
- `--usf` and `-r` both set the internal upsampling resolution; `-r` takes precedence by converting to USF.
- `--o` and `--stack` can be used simultaneously to get both separate files and the stacked volume.

## Typical Use Cases

Compute tissue fractions for an EPI volume registered with an LTA:
```bash
mri_compute_volume_fractions \
  --reg func2anat.lta \
  --o pvf_stem \
  --nii.gz
```
Produces: `pvf_stem.cortex.nii.gz`, `pvf_stem.subcort_gm.nii.gz`, `pvf_stem.wm.nii.gz`, `pvf_stem.csf.nii.gz`

Higher accuracy with USF=4:
```bash
mri_compute_volume_fractions \
  --reg func2anat.lta \
  --usf 4 \
  --stack pvf_all_frames.mgz
```

Combined gray matter mask:
```bash
mri_compute_volume_fractions \
  --reg func2anat.lta \
  --gm gm_fraction.mgz
```

## Pipeline Context

Not called by [[recon-all]]. Used downstream of the standard anatomical reconstruction in functional imaging analyses:

1. [[recon-all]] produces surfaces and `aseg.mgz`.
2. [[mri_coreg]] or [[mri_em_register]] produces registration file.
3. `mri_compute_volume_fractions` uses both.
4. Output feeds PVE correction tools or fMRI GLM weighting.

## Gotchas and Caveats

> [!gotcha] Requires SUBJECTS_DIR
> The program exits with a fatal error if `SUBJECTS_DIR` is not set in the environment.

> [!gotcha] Legacy `.dat` registration format needs template volume
> If `--reg` is given a `.dat` file (not an LTA), a second argument (the template/functional volume) must follow `--reg` directly. This differs from the LTA case where no template is needed.

> [!gotcha] Subject name from registration
> By default, the subject ID is read from the LTA or `.dat` file header. If the LTA was created without a subject name, the tool will fail to find the subject directory. Use `--s` to override.

> [!assumption] Input assumptions
> The aseg, surfaces, and functional volume are assumed to be in consistent coordinate spaces. The registration file must correctly map between the anatomical and functional spaces.

## Related Tools

- [[mri_compute_layer_fractions]] — finer laminar (6-layer) fractions within cortex
- [[mri_compute_volume_intensities]] — unpartial-volumed intensities using fraction maps
- [[mri_coreg]] — register functional to anatomical to produce the LTA

## Confidence and Gaps

Confidence is **high**. Source is well-documented with clear option parsing and help text.

> [!gap] Tissue type schema internals
> `TissueTypeSchema(NULL, "default-jan-2014")` and `"default-jan-2014+head"` are defined in `colortab.c`. The exact composition of each schema (which aseg labels map to which tissue type) is not inspected here.
