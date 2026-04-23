---
type: dialogue-archive
unix_timestamp: 1776814221
username: "ih967"
date_utc: "2026-04-21T00:00:00Z"
question_slug: "nifti-rgb24-freeview-unsupported"
question_summary: "Why does FreeView fail to load a dti_fa_color.nii with 'unsupported datatype 128 (with scl_slope = 0)', and how can it be fixed?"
answer_sources:
  - wiki: "[[mgz]]"
  - wiki: "[[freeview-volumes]]"
  - wiki: "[[mri_convert]]"
  - wiki: "[[freeview-dti]]"
  - context: "Developer statement from Yujing Huang confirming MRI_RGB is unsupported in MRIread/MRIwrite"
answer_status: final
update_count: 0
tags:
  - freeview
  - nifti
  - dti
  - rgb
  - datatype
  - gotcha
---

## Question

Loading a DTI fractional-anisotropy colour map (`dti_fa_color.nii`) into FreeView fails with:

```
error: niiRead(): unsupported datatype 128 (with scl_slope = 0) in ...dti_fa_color.nii
MRIread failed: Unable to read from ...dti_fa_color.nii
```

Why does this happen, and is there a workaround?

Developer context (Yujing Huang): "Internally, I think freeview relies on
datatype MRI_RGB to display the color. We can display tiff and jpeg in color.
But MRI_RGB is not supported by our MRI read/write routines. [...] As of now,
I don't think we support nifti datatype 128 or MRI_RGB on mriread and mriwrite.
Not sure how it was done in the past."

## Answer

### What is NIfTI datatype 128?

NIfTI datatype **128 = `DT_RGB24`** — a three-channel per-voxel format where
each voxel is stored as three consecutive `uint8` bytes (R, G, B). This is a
valid NIfTI-1 defined datatype, often produced by DTI post-processing tools that
compute direction-encoded colour FA maps and write them as true RGB volumes.

The `scl_slope = 0` note in the error is not itself the cause; `scl_slope = 0`
is expected and correct for RGB data (intensity scaling is inapplicable to RGB
triplets). It appears in the error message because FreeSurfer's `niiRead()`
includes it in its datatype-dispatch logic.

### Why FreeSurfer fails

FreeSurfer's NIfTI reader (`niiRead()` in `utils/mriio.cpp`) has no handler
for datatype 128. The internal type it would map to — `MRI_RGB` — exists in
the codebase (e.g., `mri_convert --out_data_type rgb` can write it; see
[[mri_convert]]) but is **not wired into the standard `MRIread`/`MRIwrite`
pipeline**. The [[mgz]] format itself has no corresponding voxel type code for
RGB (the documented types are `MRI_UCHAR`, `MRI_INT`, `MRI_LONG`, `MRI_FLOAT`,
`MRI_SHORT`, `MRI_TENSOR`, `MRI_FLOAT_COMPLEX`, `MRI_USHRT`).

Yujing Huang confirmed this is a known limitation: NIfTI DT_RGB24 is simply
unsupported in `mriread`/`mriwrite`.

### How FreeView actually handles colour volumes

[[freeview-volumes]] documents two mechanisms for colour display that *do* work:

1. **3-frame scalar volume** — a standard volume with 3 frames (one per R, G, B
   channel). In FreeView, enable **Display as RGB Map** in the Vector/Tensor
   Display panel section, or use the `rgb=1` inline property on the command line.

2. **TIFF/JPEG** — FreeView can display these natively in colour, as Yujing
   notes. This is a separate code path.

Neither path reads a native NIfTI DT_RGB24 file.

### Workaround: convert to a 3-frame volume using nibabel

Since FreeSurfer cannot read the file, convert it with Python/nibabel, which
handles NIfTI DT_RGB24 as a structured array:

```python
import nibabel as nib
import numpy as np

img = nib.load("dti_fa_color.nii")
# nibabel reads DT_RGB24 as a structured array with fields 'R', 'G', 'B'
raw = np.array(img.dataobj)
r = raw['R'].astype(np.float32)
g = raw['G'].astype(np.float32)
b = raw['B'].astype(np.float32)
# Stack to shape (X, Y, Z, 3)
rgb_4d = np.stack([r, g, b], axis=-1)
new_img = nib.Nifti1Image(rgb_4d, img.affine)
new_img.set_data_dtype(np.float32)
nib.save(new_img, "dti_fa_color_3frame.nii")
```

Then load in FreeView:

```bash
freeview -v dti_fa_color_3frame.nii:rgb=1
```

Or via the GUI: load the 3-frame volume, then check **Display as RGB Map** in
the Vector/Tensor Display panel section (appears for 3-frame volumes).

### Status

As of FreeSurfer 8.2.0, reading NIfTI DT_RGB24 is not implemented. Yujing
Huang indicated the issue would be raised with Doug (presumably Doug Greve) for
a future fix.

## Sources Consulted

- [[mgz]] — voxel type table confirming MRI_RGB is absent from the MGH format
- [[freeview-volumes]] — `rgb=1` inline property and "Display as RGB Map" checkbox
  are the supported paths for colour display of 3-frame volumes
- [[mri_convert]] — confirms `--out_data_type rgb` → `MRI_RGB` exists as an
  output type (write-only), but reading is not supported
- [[freeview-dti]] — context on how FreeView handles DTI colour internally
  (direction-coded map, not native RGB24)
- Developer statement from Yujing Huang (provided in conversation context)

## Revision History

### Initial answer (1776814221)

Synthesised from wiki pages + Yujing Huang's developer statement. Confirmed
MRI_RGB is absent from MGZ type table ([[mgz]]), that FreeView's colour path
uses 3-frame volumes ([[freeview-volumes]]), and that `mri_convert` has MRI_RGB
as write-only output ([[mri_convert]]). Workaround via nibabel provided.
