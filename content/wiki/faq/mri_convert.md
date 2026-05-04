---
title: "mri_convert — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 6
last_agent_update: 2026-04-27
tags:
  - faq
  - mri_convert
  - dcmunpack
  - conform
  - nifti
  - dicom
---

# mri_convert — Frequently Asked Questions

This FAQ collects recurring questions about [[wiki/tools/mri_convert|mri_convert]] (FreeSurfer's
general-purpose volume converter) and the related DICOM unpacker
`dcmunpack`. Together these tools handle format conversion (DICOM, NIfTI,
[[mgz]], MINC, ANALYZE), the [[wiki/pipelines/recon-all|recon-all]]-style "conform" preparation
(1 mm isotropic, 256³, uchar), per-axis voxel-size rescaling, copying
header geometry between volumes, and applying both linear and nonlinear
transforms — including the nonlinear morph stored in [[m3z-format]] that
maps native space to MNI305.

> For the full flag reference see [[wiki/tools/mri_convert|mri_convert]]. For voxel-grid
> resampling between two volumes see [[mri_vol2vol]]. For LTA / XFM /
> M3Z transform manipulation see [[lta_convert]] and [[mri_warp_convert]].

---

## Conforming and intensity rescaling (`-c`, `-nc`, `-uchar`)

### Why does `mri_convert -c` (or `--conform`) change my voxel intensities, even when the input is already 1 mm isotropic? And how do I keep the original data type?

**Short answer:** `-c` always casts the output to 8-bit `MRI_UCHAR` and
linearly rescales intensities into `[0, 255]` — this is independent of
voxel size. Pass `-nc` (`--nochange`) to preserve the original data type,
or use `--conform_size 1` to resample to 1 mm isotropic without the
uchar cast.

**Detail:** Two related questions on the mailing list have the same root
cause. Greve confirmed that `-c` performs three actions, all of which
fire even on an already-conformed input:

1. Resample to 1 mm isotropic on a 256³ grid.
2. Cast the output to `MRI_UCHAR` (unsigned 8-bit).
3. Linearly rescale intensities so that the dynamic range fits in
   `[0, 255]` — targeted such that white matter lands near intensity
   110, the FreeSurfer canonical WM value used downstream by
   [[mri_normalize]] and [[wiki/pipelines/recon-all|recon-all]].

The uchar cast is hard-coded in `MRIconformedTemplate()`
(`utils/mri_conform.cpp`), which always allocates the template as
`MRI_UCHAR` regardless of input type. Greve described the rationale on
the list: it is a long-standing decision to conserve disk and memory,
made when 8-bit was FreeSurfer's standard internal format. Because the
rescaling is linear, Greve also confirmed it does not significantly
affect the downstream non-uniformity bias correction.

To preserve the input data type while still conforming geometry:

```bash
# Conform geometry (1 mm iso, 256^3) but keep original data type.
mri_convert --conform -nc input.nii output.mgz

# Equivalent newer spelling.
mri_convert --conform --nochange input.nii output.mgz
```

To resample to 1 mm isotropic without the uchar cast at all:

```bash
mri_convert --conform_size 1 input.mgz output.mgz
```

> [!gotcha] `-c` is not a no-op on an already-conformed volume.
> Even when the input is already 1 mm isotropic at 256³, `-c` will
> still reallocate the buffer as `MRI_UCHAR` and rescale intensities
> into `[0, 255]`. If you only want to enforce geometry, use
> `--conform_size 1` or `-nc`.

> [!gotcha] `-c` is the right flag when preparing input for
> [[wiki/pipelines/recon-all|recon-all]]. The `recon-all -i` entry point applies conform
> internally, so you only need explicit `-c` in custom preprocessing
> pipelines that bypass `recon-all -i`.

**Provenance:** Mailing list, 2023-05-25 to 2023-06-20 (Huang, Greve)
and 2024-06-11 (Greve). See
`raw/mailing-list/2023-06-mri-convert-conform-uchar-why-nc-flag.md`
and
`raw/mailing-list/2024-06-mri-convert-conform-uchar-intensity-rescaling.md`.
Code-verified: `utils/mri_conform.cpp` (`MRIconformedTemplate` always
allocates `MRI_UCHAR`); `mri_make_uchar.cpp` comment confirms the
WM-near-110 target.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[wiki/pipelines/recon-all|recon-all]], [[mri_normalize]], [[mgz]]

---

## Voxel-size rescaling (`-iis` / `-ijs` / `-iks`)

### How do I change the voxel size of just one axis without resampling — for example to fix an animal scan whose slice spacing is wrong in the header?

**Short answer:** Use `-iis VAL`, `-ijs VAL`, or `-iks VAL` in
[[wiki/tools/mri_convert|mri_convert]] to overwrite the declared voxel size of the i, j, or k
axis respectively in the output header. The voxel data are unchanged;
only the spacing metadata in the vox2ras matrix is updated.

**Detail:** When a volume has been reconstructed with an incorrect voxel
spacing along one axis (a common pattern in high-resolution animal MRI
where slice thickness and in-plane resolution are mis-recorded), the
right fix is usually to correct the header rather than to resample.
Greve recommended the `-iis` / `-ijs` / `-iks` family for exactly this
case:

```bash
# Set the i (1st) axis voxel size to 1.0 mm.
mri_convert -iis 1.0 input.mgz output.mgz

# Set the j (2nd) axis voxel size to 0.5 mm.
mri_convert -ijs 0.5 input.mgz output.mgz

# Set the k (3rd) axis voxel size to 2.0 mm.
mri_convert -iks 2.0 input.mgz output.mgz
```

These flags rewrite the relevant column of the vox2ras matrix; the
voxel grid (number of voxels) and the voxel values themselves are not
touched. This is fundamentally different from a resample (which would
change the voxel count and interpolate values).

> [!gotcha] The mapping between i/j/k and physical L-R / A-P / I-S axes
> depends on the input volume's orientation. Greve explicitly noted you
> may need to experiment to identify which of `-iis` / `-ijs` / `-iks`
> corresponds to the physical axis you want to rescale. Inspect the
> input header with `mri_info` first, and verify the result with
> `mri_info` and a viewer like [[wiki/tools/freeview|freeview]] afterwards.

**Provenance:** Mailing list, 2023-11-02 (Greve). See
`raw/mailing-list/2023-11-mri-convert-rescale-voxel-size-iis-ijs-iks.md`.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[mri_vol2vol]], [[coordinate-systems]]

---

## Header / geometry copying (`--in_like`)

### How do I copy the FOV / header geometry from one volume to another while keeping the second volume's voxel data unchanged?

**Short answer:** When the two volumes share the same voxel grid, use
`mri_convert --in_like geometry.nii data.nii out.nii`; for a
same-grid pair you can equivalently use [[mri_vol2vol]] with
`--regheader --no-resample`; for mismatched grids you have to copy the
header programmatically (nibabel or FreeSurfer MATLAB).

**Detail:** Fischl and Greve answered this on the same day with three
distinct strategies, indexed by whether the voxel grids match.

**Same voxel grid — preferred (`--in_like`):**

```bash
mri_convert vol_data.nii.gz \
            --in_like vol_geometry.nii.gz \
            vol_data_with_geom.nii.gz
```

`--in_like` copies the vox2ras geometry from `vol_geometry.nii.gz` and
applies it to the voxel data of `vol_data.nii.gz`. The voxels are not
touched.

**Same voxel grid — alternative (`mri_vol2vol --regheader --no-resample`):**

```bash
mri_vol2vol \
  --mov  vol_data.nii.gz \
  --targ vol_geometry.nii.gz \
  --regheader --no-resample \
  --o    vol_data_with_geom.nii.gz
```

`--regheader` aligns by FOV centre without a registration file;
`--no-resample` preserves voxel values exactly when the grids match.

**Mismatched grids (programmatic copy):**

`--in_like` requires the data and geometry volumes to share the voxel
grid. If they do not, Fischl recommended copying the header directly in
MATLAB or Python — for example with nibabel:

```python
import nibabel as nib

src = nib.load('vol_geometry.nii.gz')   # has the desired geometry
dst = nib.load('vol_data.nii.gz')       # has the desired voxel data
nib.save(nib.Nifti1Image(dst.get_fdata(), src.affine, src.header),
         'vol_data_with_src_geom.nii.gz')
```

> [!gotcha] `mri_vol2vol --regheader --no-resample` is forgiving of
> tiny grid differences, but if the grids do not exactly align it can
> still introduce interpolation. When the grids really match, prefer
> `mri_convert --in_like`, which never resamples.

**Provenance:** Mailing list, 2023-10-10 (Fischl, Greve). See
`raw/mailing-list/2023-10-copy-fov-geometry-mri-convert-in-like-vol2vol.md`.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[mri_vol2vol]], [[coordinate-systems]]

---

## Applying transforms (linear and nonlinear to MNI305)

### How do I warp a volume from native subject space to MNI305 — affine only, and fully nonlinear?

**Short answer:** For an affine-only resample use [[mri_vol2vol]] with
`--xfm transforms/talairach.xfm`; for a fully nonlinear warp use
`mri_convert -at mri/transforms/talairach.m3z` (the `-at` flag applies
the recon-all-generated nonlinear morph in [[m3z-format]] and resamples
into MNI305).

**Detail:** [[wiki/pipelines/recon-all|recon-all]] produces two transforms from native subject
space to MNI305:

| File | Content | Type |
|------|---------|------|
| `transforms/talairach.xfm` | 12-DOF affine matrix | Linear |
| `transforms/talairach.lta` | Same affine in [[lta-format]] | Linear |
| `transforms/talairach.m3z` | Dense nonlinear warp field | Nonlinear |

**Affine (use `mri_vol2vol`):**

```bash
mri_vol2vol \
  --mov  $SUBJECTS_DIR/$s/mri/orig.mgz \
  --targ $FREESURFER_HOME/average/mni305.cor.mgz \
  --xfm  $SUBJECTS_DIR/$s/mri/transforms/talairach.xfm \
  --o    orig-in-mni305.mgz
```

For a segmentation volume add `--interp nearest` to preserve label
integers (Huang's note on the same thread):

```bash
mri_vol2vol \
  --mov  $SUBJECTS_DIR/$s/mri/aseg.mgz \
  --targ $FREESURFER_HOME/average/mni305.cor.mgz \
  --xfm  $SUBJECTS_DIR/$s/mri/transforms/talairach.xfm \
  --interp nearest \
  --o    aseg-in-mni305.mgz
```

**Nonlinear (use `mri_convert -at`):**

```bash
mri_convert orig.mgz \
            -at $SUBJECTS_DIR/$s/mri/transforms/talairach.m3z \
            orig-in-mni305.mgz
```

Greve confirmed on the list that `-at` applied to the recon-all
`talairach.m3z` produces a nonlinear resample into MNI305. This is
generally a more accurate spatial correspondence than the affine
transform alone — prefer it whenever the downstream tool tolerates
nonlinearly resampled data.

**Inverse (MNI305 -> native, affine):**

```bash
mri_vol2vol \
  --mov  $SUBJECTS_DIR/$s/mri/orig.mgz \
  --targ $FREESURFER_HOME/subjects/fsaverage/mri/aseg.mgz \
  --xfm  $SUBJECTS_DIR/$s/mri/transforms/talairach.xfm \
  --inv --interp nearest \
  --o    aseg-from-mni305.mgz
```

> [!gap] No mailing-list answer was found for the inverse direction of
> the *nonlinear* morph (MNI305 -> native via `talairach.m3z`).
> [[mri_warp_convert]] can invert an M3Z, but verify the resulting
> warp end-to-end before using it on real data.

**Provenance:** Mailing list, 2023-11-16 to 2023-11-22 (Huang, Greve).
See `raw/mailing-list/2023-11-mri-convert-nonlinear-transform-to-mni305.md`.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[mri_vol2vol]], [[lta_convert]],
[[mri_warp_convert]], [[lta-format]], [[m3z-format]],
[[registration-overview]], [[coordinate-systems]]

---

## Format support (NIfTI-1 vs NIfTI-2)

### Why does `mri_info` / `mri_convert` fail with `niiRead(): bad number of dimensions` on NIfTI files that AFNI reads fine?

**Short answer:** FreeSurfer only supports NIfTI-1. NIfTI-2 files are
not readable by any FreeSurfer tool — convert them back to NIfTI-1
first.

**Detail:** Huang stated definitively on the mailing list that
"FreeSurfer only handles nifti-1 now". The reason the error surfaces in
`niiRead()` rather than as a clean format-not-supported message is
that NIfTI-2 widens the dimension fields from 2 bytes to 8 bytes;
FreeSurfer's NIfTI-1 reader interprets those bytes as a 16-bit
dimension count and reports an absurd number such as
`niiRead(): bad number of dimensions (31488)`. The same failure
appears on every FreeSurfer entry point that uses the volume reader
([[mri_info]], [[wiki/tools/mri_convert|mri_convert]], [[wiki/pipelines/recon-all|recon-all]], etc.).

A common way to walk into this is to round-trip a NIfTI-1 file through
an AFNI pipeline: AFNI handles both NIfTI-1 and NIfTI-2 transparently
and may silently emit NIfTI-2 on output, breaking downstream FreeSurfer
compatibility.

**Workarounds — convert NIfTI-2 -> NIfTI-1 before FreeSurfer:**

```bash
# FSL
fslchfiletype NIFTI_GZ input_nifti2.nii.gz output_nifti1.nii.gz

# Python (nibabel) — explicitly write a NIfTI-1 image
python -c "
import nibabel as nib
img = nib.load('input_nifti2.nii.gz')
nib.save(nib.Nifti1Image(img.get_fdata(), img.affine, nib.Nifti1Header()),
         'output_nifti1.nii.gz')
"
```

> [!gotcha] AFNI may upgrade NIfTI-1 to NIfTI-2 silently. If a file
> that was previously readable by FreeSurfer suddenly errors on
> dimension parsing after passing through an AFNI step, suspect a
> silent NIfTI-2 upgrade and convert back to NIfTI-1.

**Provenance:** Mailing list, 2023-12-14 to 2023-12-15 (Pais Roldan,
Huang). See
`raw/mailing-list/2023-12-nifti2-not-supported-freesurfer-only-nifti1.md`.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[mri_info]]

---

## DICOM ingestion (`dcmunpack -auto-runseq`)

### My DICOM folder contains many series (T1, T2, DTI, fMRI). How do I convert all of them and figure out which one is the T1?

**Short answer:** Run
`dcmunpack -src <dicom_dir> -targ <out_dir> -auto-runseq mgz`. It
identifies every series in the directory, converts each to its own MGZ,
and names the outputs by sequence description so you can pick the T1
visually in [[wiki/tools/freeview|freeview]].

**Detail:** [[wiki/pipelines/recon-all|recon-all]] does not auto-detect which volume in a
multi-series DICOM directory is the T1 — `recon-all -i` only takes a
single, already-converted file. Greve's recommended workflow is to
hand off the DICOM-to-volume step to `dcmunpack` with `-auto-runseq`:

```bash
dcmunpack -src  /path/to/dicom_folder \
          -targ /path/to/output \
          -auto-runseq mgz
```

The output directory contains one `.mgz` per series, named after the
DICOM series description (e.g. `t1_mprage_sag_p2_iso.mgz`,
`t2_space_sag.mgz`). Inspect them in FreeView and pass the chosen T1
to `recon-all`:

```bash
freeview /path/to/output/*.mgz
recon-all -s SUBJECT -i /path/to/output/t1_mprage_sag_p2_iso.mgz -all
```

If you already know the run number of the T1, an explicit invocation
avoids converting everything:

```bash
dcmunpack -src  /path/to/dicom_folder \
          -targ /path/to/output \
          -run  <run_number> <sequence_name> mgz <output_name>
```

For a single DICOM series where you already know the file you want,
[[wiki/tools/mri_convert|mri_convert]] alone is sufficient — `dcmunpack` is the right tool
specifically when the directory holds many series and you need to
enumerate them.

**Provenance:** Mailing list, 2024-08-23 (Greve). See
`raw/mailing-list/2024-08-dcmunpack-auto-runseq-identify-convert-all-series.md`.

**Related:** [[wiki/tools/mri_convert|mri_convert]], [[wiki/pipelines/recon-all|recon-all]], [[wiki/tools/freeview|freeview]],
[[mri_probedicom]], [[mri_parse_sdcmdir]]
