---
title: "tkregister registration matrix (register.dat)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".dat"
  - ".reg"
produced_by:
  - "[[bbregister]]"
  - "[[tkregister2]]"
  - "[[mri_coreg]]"
  - "[[lta_convert]]"
consumed_by:
  - "[[mri_vol2vol]]"
  - "[[mri_vol2surf]]"
  - "[[mri_label2vol]]"
  - "[[lta_convert]]"
  - "[[wiki/tools/freeview|freeview]]"
related:
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
  - "[[bbregister]]"
status: review
confidence: high
last_agent_update: 2026-06-11
gaps: []
tags:
  - format
  - transform
  - registration
  - tkreg
---

# tkregister registration matrix (`register.dat`)

## Overview

`register.dat` is FreeSurfer's legacy plain-text format for a single 4×4
linear registration between two volumes — classically the registration of a
functional, PET, or other moveable volume to a subject's anatomical
reconstruction. It predates the [[lta-format|`.lta`]] format and carries less
geometry metadata, but it is still written by [[bbregister]] (with `--reg`)
and [[tkregister2]], and read by the surface/volume sampling tools
([[mri_vol2vol]], [[mri_vol2surf]], [[mri_label2vol]]) via the `--reg` flag.
A `register.dat` can be losslessly upgraded to `.lta` with
[[lta_convert]] `--inreg`.

The conventional filename is `register.dat`; the same format is also seen as
`register.lta`'s `REGISTER_DAT`-typed sibling and under `*.reg`.

## File layout

The format is line-oriented ASCII. The reader is
[`utils/registerio.cpp:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L43)
(`regio_read_register`) and the writer is
[`utils/registerio.cpp:162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L162)
(`regio_print_register`). The exact field order:

| Line(s) | Field | Type | Meaning |
|---------|-------|------|---------|
| 1 | `subject` | string | Name of the anatomical subject in `$SUBJECTS_DIR` the moveable volume was registered to. Written as `subject-unknown` when absent. |
| 2 | `inplaneres` | float | In-plane pixel size (mm) of the moveable volume. |
| 3 | `betplaneres` | float | Between-plane (slice) size (mm) of the moveable volume. |
| 4 | `intensity` | float | Display/brightness scale used by the `tkregister` program (`fscale`). Not part of the geometric transform. |
| 5–7 | `R` rows 1–3 | 3 × 4 floats | First three rows of the 4×4 registration matrix, written `%18.15e`. |
| 8 | `R` row 4 | `0 0 0 1` | Homogeneous bottom row, written literally. |
| 9 *(optional)* | `float2int` | string | Float-to-int rounding method: `round` (default), `tkregister`, or `floor`. If the line is absent the reader assumes `tkregister` ([`registerio.cpp:140-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L140-L147)). |

> [!gotcha] The matrix operates in tkreg (surface) RAS, not scanner RAS
> `R` maps **tkreg RAS** coordinates (a.k.a. surface RAS, the centred frame
> returned by `MRIxfmCRS2XYZtkreg`), not scanner/world RAS. tkreg RAS places
> the origin at the volume centre. Applying `R` in scanner-RAS space yields a
> wrong registration. See [[coordinate-systems]] for the tkreg-RAS definition.

## Matrix direction (read carefully)

The mathematical direction of `R` and the labels FreeSurfer's LTA layer
attaches to it disagree, by an old and deliberately-preserved convention.

> [!gotcha] The register.dat matrix goes from **ref (anatomical) → mov (moveable)**
> The matrix `R` maps a point in the **reference (anatomical/target)** tkreg
> RAS to the corresponding point in the **moveable (functional/source)**
> tkreg RAS:
> $$\begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}_{\text{mov}} = R \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}_{\text{ref}}$$
> This is stated explicitly in the source. When `ltaReadRegisterDat` wraps the
> matrix in an `LTA`, it labels `src = mov` and `dst = ref` — the *opposite*
> of the matrix direction — and the comment notes this was "an error
> introduced a long time ago and the rest of the code base has built up around
> it" ([`utils/transform.cpp:2756-2759`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2756-L2759)).
> Practically: to resample moveable voxels into reference space you use `R`
> as-is (it pulls reference coordinates into the moveable frame for sampling);
> to map a moveable point into the reference you invert it.

Because of this, a `REGISTER_DAT`-typed `.lta` is not interchangeable with a
plain `LINEAR_RAS_TO_RAS` `.lta` by relabelling alone — `LTAchangeType` must
re-express the matrix. See [[lta-format]] § conversion for the full table.

## Producing and consuming

```bash
# Boundary-based registration of a functional to an anatomical subject
bbregister --s subjID --mov func.nii.gz --reg register.dat --bold

# Sample the anatomical aseg into the functional grid using the .dat
mri_label2vol --seg $SUBJECTS_DIR/subjID/mri/aseg.mgz \
  --temp func.nii.gz --reg register.dat --o aseg.func.mgz

# Upgrade to a modern .lta (attaches full src/dst geometry)
lta_convert --inreg register.dat --mov func.nii.gz \
  --targ $SUBJECTS_DIR/subjID/mri/orig.mgz --outlta register.lta
```

> [!gotcha] `register.dat` carries no full volume geometry
> Unlike `.lta`, the `.dat` only records the moveable volume's voxel sizes
> (lines 2–3), not its dimensions, direction cosines, or the reference
> geometry. Tools therefore require the moveable (`--mov`) and often the
> target volumes on the command line to reconstruct the full transform.
> This is the main reason `.lta` superseded it.

## Related

- [[lta-format]] — the modern replacement; stores `REGISTER_DAT` as one of its
  type codes and carries full source/destination geometry.
- [[coordinate-systems]] — tkreg RAS vs. scanner RAS.
- [[registration-overview]] — where functional-to-anatomical registration sits
  in the FreeSurfer registration landscape.
- [[bbregister]], [[tkregister2]], [[mri_coreg]] — producers.
- [[mri_vol2vol]], [[mri_vol2surf]], [[mri_label2vol]] — consumers (`--reg`).
