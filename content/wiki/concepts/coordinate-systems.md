---
title: "Coordinate Systems"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mri_info]]"
  - "[[mri_convert]]"
  - "[[mri_vol2vol]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[tkregister2]]"
  - "[[freeview]]"
  - "[[mri_em_register]]"
  - "[[talairach_avi]]"
  - "[[mris_convert]]"
related_concepts: []
related_formats:
  - "[[mgz]]"
  - "[[lta-format]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "FS 8.2.0 uses `MRIxfmCRS2XYZPrecision` for the Vox2RAS build; precision flag effects not audited"
  - "How oblique (non-coronal) conformed volumes interact with the tkreg LIA convention not fully verified end-to-end"
tags:
  - coordinates
  - transforms
  - mni305
  - talairach
  - tkregister
  - surface-ras
  - scanner-ras
---

# Coordinate Systems in FreeSurfer

> [!info] How to read this page
> This page is a deep reference, not a tutorial. It assumes a scientifically
> trained reader (linear algebra, 4×4 homogeneous transforms, the idea of a
> voxel grid) but *no* prior FreeSurfer experience. Read sections 1–4 for the
> formal framework and the five coordinate systems; sections 5–7 for the
> transform files, the surface-vertex convention, and the canonical
> cross-space formulas; section 8 for gotchas.

## 1. Overview

A FreeSurfer subject carries data in at least **five distinct spatial
coordinate systems**, and any cross-package workflow (FSL, SPM, AFNI, MNE,
nibabel, FieldTrip) crosses *at least* two more. Each system has its own
origin, axis convention, units, and file-format encoding. Most FreeSurfer
confusion ultimately reduces to one of:

1. Applying a transform computed in one system to a point expressed in
   another (forgetting the *devolution* step).
2. Treating the tkregister/"surface" RAS as if it were the scanner RAS (or
   vice versa) — they agree only when the volume header satisfies
   `c_ras = 0`, which is very rarely true for real data.
3. Reading "Talairach" in a FreeSurfer output and assuming true Talairach-88
   coordinates — they are not.
4. Swapping a `vox2vox` for a `ras2ras` transform when writing an [[lta-format]] file.

The purpose of this page is to define each system formally, give the exact
numerical transforms between them, and document where in the source each
transform is computed.

## 2. The Vox2RAS Abstraction

All of FreeSurfer's volume-space bookkeeping reduces to a single 4×4 affine
matrix, the **Vox2RAS** (also called Vox2XYZ), that maps a discrete voxel
index $(C, R, S)$ to a continuous real-world position $(X, Y, Z)$:

$$
\begin{bmatrix} X \\ Y \\ Z \\ 1 \end{bmatrix}
=
\underbrace{\begin{bmatrix} M_{dc} \cdot D & P_0 \\ 0\;\;0\;\;0 & 1 \end{bmatrix}}_{V \;=\; \mathrm{Vox2RAS}}
\begin{bmatrix} C \\ R \\ S \\ 1 \end{bmatrix}
$$

where

- $M_{dc} = [\,C_{dc}\;\;R_{dc}\;\;S_{dc}\,]$ is the $3{\times}3$ matrix of
  **direction cosines**: the unit vectors pointing along the column, row, and
  slice axes of the voxel grid, expressed in the target RAS frame.
- $D = \mathrm{diag}(d_C,\, d_R,\, d_S)$ holds the **voxel sizes** (mm)
  along column, row, and slice.
- $P_0 = (X_0,\, Y_0,\, Z_0)^\top$ is the RAS position of the voxel at
  $(C,R,S)=(0,0,0)$.

Equivalently $V = T(P_0) \cdot M_{dc} \cdot D$, where $T(\cdot)$ is a pure
translation. The first three columns of $V$ are the direction cosines scaled
by voxel size; the fourth column is $P_0$.

> [!math] Reference implementation
> The full build lives in [[`utils/mri.cpp:589`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L589)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L589) (`MRIxfmCRS2XYZ()`). It
> constructs $M_{dc} \cdot D$ column-by-column from the `VOL_GEOM` fields
> `x_r, x_a, x_s` (column DC), `y_r, y_a, y_s` (row DC), `z_r, z_a, z_s`
> (slice DC), then patches $P_0$ so that
> $V \cdot [N_c/2,\,N_r/2,\,N_s/2,\,1]^\top = (c_r, c_a, c_s, 1)^\top$.
> That is, FreeSurfer stores the RAS of the **centre voxel** as
> $(c_r,\,c_a,\,c_s)$, not the corner $P_0$.

The **voxel indexing is zero-based by default**: the voxel at
$(0,0,0)$ is the one physically closest to $P_0$. SPM matrices are 1-based,
so `MRIxfmCRS2XYZ()` accepts a `base` argument that adds 1 to the centre
offset for compatibility.

> [!gotcha] Tower of Babel
> The fscoordinates PDF warns that a given physical geometry admits many
> valid $(M_{dc}, D, P_0)$ triples. E.g. swapping two column-labelled axes
> and permuting the direction cosines yields a numerically different Vox2RAS
> with identical physical meaning. Any Vox2Vox or RAS-to-RAS transform is
> invariant under such relabellings, but the matrices themselves are not.
> Always compute transforms from the geometry of the volumes involved, never
> hand-copy matrices across subjects or sessions.

## 3. The Five Coordinate Systems

FreeSurfer works with five spatial coordinate systems:

| # | Name | Units | Origin | Axes (RAS?) | Produced by |
|---|------|-------|--------|-------------|-------------|
| 3.1 | Voxel (CRS) | voxels, integer | first voxel | column / row / slice | volume headers |
| 3.2 | Scanner RAS | mm | scanner isocentre (inherited from DICOM) | R / A / S | DICOM import |
| 3.3 | Surface RAS (tkregister RAS) | mm | volume centre | R / A / S, but LIA-swept | [[mri_tessellate]], all surfaces |
| 3.4 | "FreeSurfer Talairach" = MNI305 RAS | mm | MNI305 AC | R / A / S | [[talairach_avi]] + Norig devolved |
| 3.5 | True Talairach (Brett-corrected MNI305) | mm | Talairach AC | R / A / S | `FixMNITal()` post-hoc |

The MNI152 space (used by FSL/SPM/Colin27 templates) is not native to
FreeSurfer but is reachable through a hard-coded affine (§7.6).

### 3.1 Voxel (Column-Row-Slice)

**Definition.** The integer index $(C, R, S)$ of a voxel within the volume
array. For a volume of size $(N_c, N_r, N_s)$:

- $C \in \{0, 1, \ldots, N_c{-}1\}$ runs along the fastest-varying axis
  of the on-disk buffer (the "columns").
- $R \in \{0, 1, \ldots, N_r{-}1\}$ is the next axis ("rows").
- $S \in \{0, 1, \ldots, N_s{-}1\}$ is the slowest ("slices").

**Identity, not geometry.** CRS is a *labelling* of voxels. It carries no
anatomical meaning on its own; only a `Vox2RAS` matrix can give it one.

**Where FreeSurfer uses it.** Every on-disk volume format ([[mgz]], .mgh,
.nii, NIFTI, .img, .bhdr, DICOM) stores voxel arrays in some CRS ordering.
Intensity sampling, nearest-neighbour interpolation, segmentation labels, and
the inner loops of every volumetric tool all work in CRS.

**Fractional CRS.** After a Vox2Vox transform or a RAS→CRS lookup, you can
end up with fractional $(C, R, S)$; FreeSurfer's resampling routines
(`MRIvol2vol`, `MRIvol2Surf`) interpolate to produce continuous values.

### 3.2 Scanner RAS (native RAS, "real" RAS)

**Definition.** The Right-Anterior-Superior coordinate system whose
construction parameters are inherited from the MRI scanner (via DICOM
qform/sform):

- Origin: the scanner's magnet isocentre.
- $+X$ points to the subject's Right (patient-right).
- $+Y$ points to the subject's Anterior.
- $+Z$ points to the subject's Superior.

**Not LPS.** DICOM on disk stores *LPS* (Left-Posterior-Superior): the first
two axes are flipped relative to RAS. When FreeSurfer reads a DICOM file it
flips the $X$ and $Y$ signs of `c_ras` and of the direction cosines so that
the in-memory representation is RAS throughout. Anything read as `mri_info
--vox2ras` is RAS, *not* the LPS that comes out of the DICOM header.

**Where it lives.** The Scanner Vox2RAS for a volume is what
`mri_info --vox2ras vol.mgz` prints. In the source it is built by
`MRIxfmCRS2XYZ(mri, 0)` using the volume's stored direction cosines, voxel
sizes, and `c_ras`. Call this matrix **$N$**; for the canonical subject
volume `mri/orig.mgz` it is called **$N_\text{orig}$** throughout this page
(following the fscoordinates PDF).

**Why `c_ras` is nonzero.** For a scan acquired with the subject's brain
roughly at isocentre, $c_\text{ras}$ is small (a few millimetres) but almost
never exactly zero. For a scan deliberately offset it can be hundreds of
millimetres. The non-zero value is what distinguishes Scanner RAS from
Surface RAS — see §3.3.

**Which FreeSurfer files use Scanner RAS.**

- Every volume (`rawavg.mgz`, `orig.mgz`, `T1.mgz`, `aseg.mgz`, ...) stores
  Scanner-RAS direction cosines and `c_ras` in its header.
- `.xfm` files in `mri/transforms/` (specifically `talairach.xfm`) are
  Scanner-RAS → Scanner-RAS matrices: they map a scanner-RAS point in the
  subject's `orig.mgz` space to a scanner-RAS point in MNI305 space.
- Scanner RAS is what `tkmedit` / [[freeview]] displays in the "RAS:" field
  when you enable "Show scanner coordinates".

### 3.3 Surface RAS (tkregister RAS)

**Definition.** A Right-Anterior-Superior coordinate system whose Vox2RAS
has *hard-coded* direction cosines (LIA: Left–Inferior–Anterior column, row,
slice axes) and whose origin sits at the centre of the volume's field of
view. The tkregister Vox2RAS for a volume of size $(N_c, N_r, N_s)$ and
voxel sizes $(d_C, d_R, d_S)$ is:

$$
T \;=\; \mathrm{Vox2TkRAS} \;=\;
\begin{bmatrix}
-d_C & 0   &  0   & +\tfrac{N_c}{2}\, d_C \\
 0   & 0   & +d_S & -\tfrac{N_s}{2}\, d_S \\
 0   & -d_R & 0   & +\tfrac{N_r}{2}\, d_R \\
 0   & 0   &  0   & 1
\end{bmatrix}
$$

Equivalent direction cosines:
$C_{dc} = (-1, 0, 0)^\top,\; R_{dc} = (0, 0, -1)^\top,\; S_{dc} = (0, 1, 0)^\top$.
The centre-voxel RAS is hard-coded to $(0, 0, 0)$; the corner voxel $(0,0,0)$
lands at $P_0 = (+N_c d_C / 2,\, -N_s d_S / 2,\, +N_r d_R / 2)^\top$.

**Reference implementation.** [[`utils/mri.cpp:835`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L835)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L835)
(`MRIxfmCRS2XYZtkreg()`), which allocates a throw-away `VOL_GEOM`,
overwrites its direction cosines with the LIA triad above and its
`c_r/c_a/c_s` with zeros, and then calls the generic `MRIxfmCRS2XYZ()`.

**Key property: Surface RAS is *not* a real anatomical frame.** It depends
only on the voxel grid dimensions and sizes. Any two volumes of the same
size have the *same* Surface-RAS Vox2RAS even if they were collected on
different scanners with different orientations, and any rotation or
translation of the subject's head relative to the scanner is ignored. This
is intentional: it makes the Surface-RAS frame a shared "conformed" space
within which surfaces, volumes, and transforms can talk to each other
without dragging scanner metadata around.

**Surface RAS ≠ Scanner RAS.** The two agree *only if* the volume satisfies
both (a) `c_ras = 0` (centre of field of view is at scanner isocentre) and
(b) the direction cosines are exactly LIA (the "coronally conformed"
orientation — column runs Right-to-Left, row runs Superior-to-Inferior,
slice runs Posterior-to-Anterior). In real subject data (b) is satisfied
by `orig.mgz` after conformation, but (a) almost never is: `orig.mgz`
inherits its `c_ras` from `rawavg.mgz`, which in turn inherits from the
DICOM. The gap between Surface RAS and Scanner RAS on a conformed volume is
therefore a pure translation by `(c_r, c_a, c_s)`. See §5 (Mfix) and §8.1.

**Why "tkregister".** Historically the tkregister GUI read/wrote its
registration matrices in this space; the alias "Surface RAS" was coined later
when Tosa's surface code hardened the convention. The source alternates
between `surfaceRAS`, `TkRegRAS`, and `tkrRAS`; they are the same thing.
`utils/mri.cpp` actually contains a deprecated Tosa implementation
(`surfaceRASFromVoxel_`) that only worked on coronally conformed volumes;
the live implementation now delegates to `MRIxfmCRS2XYZtkreg()` (comment at
[[`utils/mri.cpp:3509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3509)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3509): "What he calls 'surface' RAS is really supposed to be
'tkregister' RAS").

**Which FreeSurfer files use Surface RAS.**

- All surface files (`lh.white`, `rh.pial`, `lh.inflated`, ..., any vertex
  in `$SUBJECTS_DIR/<subj>/surf/`) store vertex xyz in Surface RAS by
  default. See §6 for the `useRealRAS` flag.
- `register.dat` / `register.lta` matrices are Surface-RAS → Surface-RAS
  mappings between volumes (anat → mov), *not* Scanner-RAS.
- [[label-format|Label files]] (`.label`) store vertex indices for surfaces, so they inherit
  Surface RAS via the surface they index into.
- tkregister-format registration files in general (`boundary.dat`, the
  output of `bbregister`, ...).

### 3.4 "Talairach" in FreeSurfer = MNI305 RAS

**Definition.** MNI305 is a stereotaxic template space defined by the
average of 305 T1-weighted MRI volumes (Evans et al. 1992), computed at the
Montreal Neurological Institute. Its native frame is RAS with origin near
the anterior commissure. FreeSurfer's atlas resampling, cross-subject
averaging ([[fsaverage]]), and `mri_ca_label` priors all live in MNI305.

**Where it comes from in a FreeSurfer subject.** The `autorecon1` stage
runs [[talairach_avi]] to compute an affine from `orig.mgz` (in Scanner RAS)
to the MNI305 atlas. The result is stored as
`mri/transforms/talairach.xfm`, an MNI-format `.xfm` file of type
`LINEAR_RAS_TO_RAS`. Call its 4×4 matrix **$X_\text{tal}$** (the "TalXFM" in
the fscoordinates PDF and in most FreeSurfer documentation).

By convention throughout this page:

- $N_\text{orig}$ = `mri_info --vox2ras orig.mgz` = orig.mgz Scanner Vox2RAS.
- $T_\text{orig}$ = `mri_info --vox2ras-tkr orig.mgz` = orig.mgz Surface (tkreg) Vox2RAS.
- $X_\text{tal}$ = `talairach.xfm` = Scanner-RAS(orig) → MNI305-RAS.

**Going from a subject's CRS to MNI305 RAS** therefore requires
$X_\text{tal} \cdot N_\text{orig}$ (both orig-space scanner matrices applied
in order). The source function that does this directly from a CRS is
`TransformCRS2MNI305()` at [[`utils/transform.cpp:5190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L5190)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L5190).

**The "Talairach" confusion.** Every FreeSurfer output labelled
*Talairach* — in `tkmedit`, in [[freeview]], in `mri_info --mni`, in the
`aseg.stats` Talairach columns — is actually reporting a point in MNI305.
The spaces are related but not identical: MNI305 is defined by a
population-average MRI atlas, whereas Talairach-88 is defined by slice-level
manual landmarks on a single post-mortem brain. Displacements of 5–10 mm
between "same" landmarks in the two atlases are routine. See §8.3.

**Brett's non-linear correction.** If you really want Talairach-style
coordinates from a FreeSurfer MNI305 point, FreeSurfer provides
`FixMNITal()` at [[`utils/transform.cpp:1983`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1983)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1983), which applies Matthew Brett's
8/10/98 piecewise-linear "mni2tal" transform:

$$
\text{For } z_\text{mni} \geq 0:\quad
T_+ =
\begin{bmatrix}
0.9900 & 0      & 0      & 0 \\
0      & 0.9688 & 0.0460 & 0 \\
0      & -0.0485 & 0.9189 & 0 \\
0      & 0      & 0      & 1
\end{bmatrix}
$$
$$
\text{For } z_\text{mni} < 0:\quad
T_- =
\begin{bmatrix}
0.9900 & 0      & 0      & 0 \\
0      & 0.9688 & 0.0420 & 0 \\
0      & -0.0485 & 0.8390 & 0 \\
0      & 0      & 0      & 1
\end{bmatrix}
$$

$\text{tal} = T_\pm \cdot \text{mni305}$ gives a coordinate that approximates
Talairach-88. This is the *only* place in the FreeSurfer codebase that
actually emits true Talairach coordinates, and it must be called explicitly;
no stage of `recon-all` uses it.

### 3.5 MNI152

**Definition.** MNI152 is the 152-subject revision of MNI305 (Mazziotta et
al. 2001). It uses higher-resolution template images and is the space most
often called *MNI space* by FSL, SPM, and the nibabel/nilearn community.
MNI152 is not native to FreeSurfer, but is reachable through a hard-coded
affine stored as `$FREESURFER_HOME/average/mni152.register.dat`.

The numeric matrix (RAS-to-RAS) is (from the FreeSurfer wiki and the
`mni152.register.dat` shipped with the distribution):

$$
M_{305 \to 152} =
\begin{bmatrix}
 0.9975 & -0.0073 &  0.0176 & -0.0429 \\
 0.0146 &  1.0009 & -0.0024 &  1.5496 \\
-0.0130 & -0.0093 &  0.9971 &  1.1840 \\
 0      &  0      &  0      &  1
\end{bmatrix}
$$
$$
M_{152 \to 305} = M_{305 \to 152}^{-1} =
\begin{bmatrix}
 1.0022 &  0.0071 & -0.0177 &  0.0528 \\
-0.0146 &  0.9990 &  0.0027 & -1.5519 \\
 0.0129 &  0.0094 &  1.0027 & -1.2012 \\
 0      &  0      &  0      &  1
\end{bmatrix}
$$

**Construction.** The matrix is
$M_{305 \to 152} = V_{152} \cdot T_{152}^{-1} \cdot R_{152} \cdot T_{305} \cdot V_{305}^{-1}$
where $V$ is Scanner Vox2RAS, $T$ is tkreg Vox2RAS, and $R_{152}$ is the
single affine in `mni152.register.dat`. The tkreg detour is because
`register.dat` files are defined in Surface-RAS space, not Scanner-RAS.

> [!assumption] The MNI305 → MNI152 affine is approximate
> This is a single global affine between two population-average templates,
> not a diffeomorphic registration. For voxel-level accuracy you should
> instead register each subject directly to MNI152 (e.g. FSL FLIRT/FNIRT),
> not re-use the FreeSurfer MNI305 registration and apply this affine. The
> matrix is accurate to roughly 1–3 mm for cortical landmarks and
> considerably worse near the edges of the brain. See Wu et al. 2018
> ("Accurate nonlinear mapping between MNI volumetric and FreeSurfer
> surface coordinate systems") for quantitative errors.

## 4. The Five Spaces and Their Vox2RAS Matrices at a Glance

| Space | Matrix name (this page) | How to get it | Origin | Axes | Depends on |
|-------|-------------------------|---------------|--------|------|------------|
| CRS | – | volume itself | first voxel | column/row/slice | – |
| Scanner RAS | $N = N_\text{orig}$ | `mri_info --vox2ras vol.mgz` | scanner isocentre | R/A/S | volume header |
| Surface RAS | $T = T_\text{orig}$ | `mri_info --vox2ras-tkr vol.mgz` | volume centre | R/A/S (LIA hardcoded) | volume size only |
| MNI305 RAS | — | `talairach.xfm` applied to Scanner RAS | MNI305 AC | R/A/S | talairach_avi |
| MNI152 RAS | — | $M_{305 \to 152}$ from §3.5 | MNI152 AC | R/A/S | constant matrix |

$N$ and $T$ are **volume-level** matrices: every volume has its own. The
talairach.xfm and the MNI305 → MNI152 matrices are **subject-level** and
**constant**, respectively.

## 5. The Scanner ↔ Surface RAS Relationship (`Mfix`)

Because Surface-RAS collapses the centre of every FoV to the origin, the
relationship between Scanner RAS and Surface RAS for any given volume is a
**pure translation** by the Scanner-RAS value of the centre voxel:

$$
\text{ScannerRAS} \;=\; T(c_r, c_a, c_s) \cdot \text{SurfaceRAS}
\qquad
\text{SurfaceRAS} \;=\; T(-c_r, -c_a, -c_s) \cdot \text{ScannerRAS}
$$

This is because the tkreg Vox2RAS is built with $c_r=c_a=c_s=0$
([[`utils/mri.cpp:847-855`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L847-L855)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L847-L855)), while the scanner Vox2RAS uses the volume's
stored `c_ras`. Both matrices share the same $M_{dc} \cdot D$ factor *for
conformed volumes* (LIA direction cosines, 1 mm voxels), so they differ only
in the translation column.

In the fscoordinates PDF this translation is called **`Mfix`**:

$$
\mathrm{Mfix} \;=\; N_\text{orig} \cdot T_\text{orig}^{-1}
\;=\; \begin{bmatrix} 1 & 0 & 0 & c_r \\ 0 & 1 & 0 & c_a \\ 0 & 0 & 1 & c_s \\ 0 & 0 & 0 & 1 \end{bmatrix}
$$

`Mfix` is the thing you forgot to apply when your surface landed off the
anatomy in some other package. FreeSurfer applies it implicitly inside
`DevolveXFM()` at [[`utils/transform.cpp:2027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027):

```cpp
Torig_tkreg  = MRIxfmCRS2XYZtkreg(mriorig);  // T_orig
Torig_native = MRIxfmCRS2XYZ(mriorig, 0);    // N_orig
Mfix = Torig_native * inv(Torig_tkreg);
XFM  = XFM * Mfix;   // XFM is now a Surface-RAS -> target matrix
```

> [!gotcha] Non-coronal obliquity makes Mfix more than a translation
> If the volume is *not* coronally conformed (e.g. an oblique acquisition
> that has not gone through `mri_convert --conform`), `T_orig` and
> $N_\text{orig}$ also differ by a rotation, and `Mfix` is no longer a pure
> translation. The formula `Mfix = Norig * inv(Torig)` still works
> because of the definition; do not try to shortcut it by "just adding c_ras".

## 6. Surface Vertex Coordinates

### 6.1 What's stored on disk

A FreeSurfer binary surface file (`lh.white`, `rh.pial`, `lh.sphere`, ...)
stores, per vertex, three `float` coordinates. By convention these are in
**Surface RAS** of the volume the surface was tessellated from
([[`utils/mrisurf_io.cpp:4024`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4024)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4024) sets `mris->useRealRAS = 0` on every freshly
read surface). This is the native space in which [[mri_tessellate]],
[[mris_smooth]], [[mris_inflate]], [[mris_sphere]], and all surface-metric
code operate.

**You cannot plot a FreeSurfer surface on top of a volume using the
volume's scanner RAS and expect them to line up.** The vertices are
translated by $-(c_r, c_a, c_s)$ relative to the volume.

### 6.2 The `useRealRAS` flag

A surface file carries an optional integer tag, `TAG_USEREALRAS` /
`TAG_OLD_USEREALRAS`, that says whether the stored vertices are in Scanner
RAS (`useRealRAS = 1`) or Surface RAS (`useRealRAS = 0`).
[[`mrisurf_io.cpp:4041-4047`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4041-L4047)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4041-L4047) reads this tag on every load; if present and set
to 1, `MRISread()` subsequently calls `MRISscanner2Tkr()` at
[[`mrisutils.cpp:2400`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2400)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2400) to *convert* the vertices into Surface RAS:

$$
\text{vertex}_\text{tkr}
\;=\; T \cdot N^{-1} \cdot \text{vertex}_\text{scanner}
$$

This is done so that the in-memory representation used by every tool is
always Surface RAS regardless of what the file stored. The reverse,
`MRIStkr2Scanner()` at [[`mrisutils.cpp:2375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2375)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2375), is what `mris_convert
--to-scanner` calls to write a surface with `useRealRAS = 1`, typically for
inter-package interchange (e.g. HCP, MNE, nibabel expect Scanner RAS).

> [!gotcha] `useRealRAS` is a file-format tag, not a computation
> `MRISscanner2Tkr()` is called only if the flag is set at load. A binary
> surface file produced by an external tool that *happens* to store
> Scanner RAS vertices but omits the tag will be loaded as Surface RAS,
> which means FreeSurfer will silently treat the vertices as already
> tkreg-referenced and put them in the wrong place. The symptom is a
> surface offset by `(c_r, c_a, c_s)` — typically a few mm to a few cm.

### 6.3 What `freeview` / `tkmedit` show

`freeview`'s coordinate readout defaults to **Surface RAS** ("RAS:" field)
when overlaying a surface on a volume, because that is the space the
surface is in. Checking the "Scanner" or "Talairach" boxes in the
coordinate panel adds additional readouts computed via
`Mfix`-then-$X_\text{tal}$ respectively. The same point in the volume
therefore has three simultaneously-displayed RAS values (tkr, scanner,
"Talairach"=MNI305); they are *always* different if `c_ras ≠ 0`.

## 7. Canonical Cross-Space Formulas

This section enumerates the nine use cases listed on the FreeSurfer wiki and
in the fscoordinates PDF, with exact matrix formulas in the notation
introduced above. All subjects are assumed to have
`SUBJECTS_DIR/<subj>/mri/{orig.mgz, transforms/talairach.xfm}` present.

Abbreviations for this section:
- $T = T_\text{orig}$ = orig.mgz Surface (tkreg) Vox2RAS, from
  `mri_info --vox2ras-tkr orig.mgz`.
- $N = N_\text{orig}$ = orig.mgz Scanner Vox2RAS, from
  `mri_info --vox2ras orig.mgz`.
- $X = X_\text{tal}$ = `talairach.xfm` matrix (Scanner RAS → MNI305 RAS).
- $T_\text{mov}$, $N_\text{mov}$ = corresponding matrices for a second
  ("moveable") volume (e.g. functional or diffusion).
- $R$ = `register.dat` / `register.lta` matrix, Surface-RAS(anat) →
  Surface-RAS(mov).
- $M_{305 \to 152}$ = the constant MNI305 → MNI152 affine from §3.5.

### 7.1 Surface RAS → Voxel CRS (within-subject anat)

$$
\begin{bmatrix} C \\ R \\ S \\ 1 \end{bmatrix}
\;=\;
T^{-1}
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
$$

Used by: [[mri_vol2surf]], [[mri_surf2vol]], any surface overlay on the
`orig.mgz` grid, [[mris_anatomical_stats]] gray-volume computation.

### 7.2 Surface RAS → MNI305 RAS

$$
\begin{bmatrix} x_\text{mni305} \\ y_\text{mni305} \\ z_\text{mni305} \\ 1 \end{bmatrix}
\;=\;
X \cdot N \cdot T^{-1}
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
$$

The $N \cdot T^{-1}$ prefix is exactly `Mfix` from §5 — the "devolve" step
that takes a Surface-RAS point to Scanner-RAS before applying the
`talairach.xfm`, which was computed in Scanner-RAS. This is
`DevolveXFM(subjid, X, "talairach.xfm")` at [[`utils/transform.cpp:2027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027).

Used by: `mri_info --ras ...`, `tksurfer`'s "MNI Talairach" readout
(which then relabels the output "Talairach" — see §8.3), surface-based
group analyses that lookup atlas labels, any `tkmedit`/`freeview` panel
showing the "Talairach" field.

### 7.3 Surface RAS → Scanner RAS

$$
\begin{bmatrix} x_\text{scanner} \\ y_\text{scanner} \\ z_\text{scanner} \\ 1 \end{bmatrix}
\;=\;
N \cdot T^{-1}
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
\;=\;
\mathrm{Mfix} \cdot
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
$$

Used by: `mris_convert --to-scanner`, exports to HCP / nibabel / MNE.

### 7.4 Voxel CRS → Surface RAS (within-subject anat)

$$
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
\;=\;
T
\begin{bmatrix} C \\ R \\ S \\ 1 \end{bmatrix}
$$

Used by: every place FreeSurfer needs to know "where does this voxel of
`orig.mgz` sit in surface space?" — [[mri_aparc2aseg]]'s nearest-vertex
search, control-point editing, manual label drawing in `tkmedit`.

### 7.5 Surface RAS → Mov CRS (e.g. surface point on a functional volume)

$$
\begin{bmatrix} C_\text{mov} \\ R_\text{mov} \\ S_\text{mov} \\ 1 \end{bmatrix}
\;=\;
T_\text{mov}^{-1} \cdot R
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
$$

The `R` matrix lives in Surface-RAS space on *both* sides: it is
anat-Surface-RAS → mov-Surface-RAS. `T_mov` then takes mov-Surface-RAS to
mov CRS. Used by [[mri_vol2surf]] for functional overlays.

### 7.6 Mov CRS → Anat CRS (e.g. functional-to-anatomical warp)

$$
\begin{bmatrix} C_\text{anat} \\ R_\text{anat} \\ S_\text{anat} \\ 1 \end{bmatrix}
\;=\;
T^{-1} \cdot R \cdot T_\text{mov}
\begin{bmatrix} C_\text{mov} \\ R_\text{mov} \\ S_\text{mov} \\ 1 \end{bmatrix}
$$

This is $Q^{-1}$, the inverse of the fscoordinates Vox2Vox
$Q = T_\text{mov}^{-1} R T$. Used by `mri_vol2vol --reg register.dat ...`
and every time `bbregister` reports "correct" numbers.

### 7.7 Mov CRS → Surface RAS

$$
\begin{bmatrix} x_\text{tkr} \\ y_\text{tkr} \\ z_\text{tkr} \\ 1 \end{bmatrix}
\;=\;
R^{-1} \cdot T_\text{mov}
\begin{bmatrix} C_\text{mov} \\ R_\text{mov} \\ S_\text{mov} \\ 1 \end{bmatrix}
$$

Used when projecting a functional ROI centre back to anatomical surface
vertices.

### 7.8 MNI305 RAS ↔ MNI152 RAS

$$
\mathbf{r}_\text{152} = M_{305 \to 152} \, \mathbf{r}_\text{305}, \qquad
\mathbf{r}_\text{305} = M_{305 \to 152}^{-1}\, \mathbf{r}_\text{152}
$$

With the numeric matrices from §3.5. This is a *constant* affine; no
subject-specific data is required.

### 7.9 Volume conversion via `mri_vol2vol`

When you just want a whole volume moved between anatomical and template
spaces, rather than moving individual coordinates, the one-liner is:

```bash
mri_vol2vol \
  --mov   MNI152.nii.gz \
  --targ  $SUBJECTS_DIR/<subj>/mri/orig.mgz \
  --reg   $FREESURFER_HOME/average/mni152.register.dat \
  --inv \
  --o     orig.in-mni152.mgz
```

The `register.dat` here is a fixed, FreeSurfer-supplied file that
implements the Surface-RAS-to-Surface-RAS side of $M_{305 \to 152}$.

## 8. Common Misunderstandings and Gotchas

### 8.1 "Scanner RAS and Surface RAS are the same"

They differ by `(c_r, c_a, c_s)` on every real subject volume. They agree
exactly only when `c_ras = 0` *and* the volume is conformed (LIA 1 mm).
Symptoms of confusing them: a surface that looks right in `freeview`
but sits off the anatomy in FSL, SPM, nibabel; a control point that
clicks correctly in `tkmedit` but ends up in the wrong voxel when read by
a Python script using `nibabel`. The fix is always
`Mfix = N_orig * inv(T_orig)`.

> [!gotcha] Quick self-test
> `mri_info --vox2ras orig.mgz` and `mri_info --vox2ras-tkr orig.mgz` agree
> iff they agree. If they print different 4×4 matrices, you have a
> non-trivial `Mfix`.

### 8.2 "I can apply `talairach.xfm` to a surface vertex directly"

No. `talairach.xfm` is a Scanner-RAS → MNI305 matrix. Surface vertices are
in Surface RAS. You must apply `Mfix` first (equivalently: use
`DevolveXFM`). Shortcut for the lazy: instead of multiplying
`X * N * inv(T) * v`, load `talairach.xfm` with `LTAreadEx()` and use
`TransformCRS2MNI305()` ([[`utils/transform.cpp:5190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L5190)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L5190)) which takes a CRS and
does the whole chain for you.

### 8.3 "'Talairach' in a FreeSurfer output means Talairach-88"

No. Every FreeSurfer output string that says "Talairach" means **MNI305**.
This applies to:

- `tkmedit` / `tksurfer` / `freeview` coordinate readouts.
- `aseg.stats`'s Talairach columns.
- The output of `mri_info --mni305ras` (newer) and `mri_info --tal` (older).
- Any `mri/transforms/talairach.xfm` file.

If you want *actual* Talairach-88 coordinates, call `FixMNITal()` to apply
Matthew Brett's piecewise affine (§3.4). No stage of `recon-all` does this
for you.

### 8.4 `register.dat` is Surface-RAS, `talairach.xfm` is Scanner-RAS, `.lta` is either

- `register.dat` format (tkregister): Surface-RAS → Surface-RAS. File
  parsed at [[`utils/registerio.cpp:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L43)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L43); the matrix `R` in the file is the
  same $R$ used in §7.5-§7.7. Written in ASCII; not self-describing
  beyond subject name and voxel sizes (both obsolete fields).
- `.xfm` (MNI transform format): Scanner-RAS → Scanner-RAS. Parsed by
  `LTAreadEx()` with type `MNI_TRANSFORM_TYPE` ([[`transform.h:143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L143)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L143)).
  `talairach.xfm` is of this type.
- `.lta` (linear transform array): a self-describing wrapper that carries
  the source and destination `VOL_GEOM` structs and one of five type
  codes ([[`transform.h:137-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L137-L148)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L137-L148)):
  - `LINEAR_VOX_TO_VOX = 0`: voxel-to-voxel, i.e. the $Q$ from §7.6.
  - `LINEAR_RAS_TO_RAS = 1`: Scanner-RAS → Scanner-RAS (like `.xfm`).
  - `LINEAR_CORONAL_RAS_TO_CORONAL_RAS = 21`: Surface-RAS → Surface-RAS
    (same frame as `register.dat`).
  - `REGISTER_DAT = 14`: semantically a register.dat loaded into an LTA.
  - `FSLREG_TYPE = 15`: FSL FLIRT .mat, which is yet another FoV-based
    RAS ("FSL RAS" with origin at the corner of the FoV; see
    `MRIxfmCRS2XYZfsl()` at [[`utils/mri.cpp:873`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L873)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L873)).
- FSL `.mat`: FSL-RAS → FSL-RAS; FreeSurfer converts via `lta_convert`.

> [!gotcha] Type conversion is a computation, not a relabeling
> `LTAchangeType()` (`transform.cpp`) requires *both* a source and a
> destination `VOL_GEOM`, because converting
> `LINEAR_RAS_TO_RAS → LINEAR_VOX_TO_VOX` needs the Vox2RAS matrices of
> both endpoints to re-express the transform. If either volume header
> has the wrong `c_ras` or direction cosines, the converted matrix will
> silently be wrong. Always double-check that the `src`/`dst` fields in
> the LTA refer to real files on disk before changing the type.

### 8.5 Surface exported to nibabel is offset

`nibabel.freesurfer.io.read_geometry()` reads raw vertex coordinates
without applying `useRealRAS`, which means you get Surface RAS by default
and must add `(c_r, c_a, c_s)` yourself to plot on top of the volume's
affine (which is Scanner RAS via `nibabel.MGHImage.affine`). See
[[`utils/mrisurf_io.cpp:4024`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4024)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4024) for where FreeSurfer itself decides the
vertex-coordinate frame.

### 8.6 The Vox2RAS of `rawavg.mgz` differs from `orig.mgz`

`rawavg.mgz` is the native-resolution motion-corrected average; `orig.mgz`
is the conformed (256³, 1 mm, LIA) version. Their Scanner-RAS direction
cosines will usually differ (rawavg is whatever the scanner produced,
orig is LIA), and their Vox2Vox is the conform transform computed by
[[mri_convert]]. Surfaces are always tessellated from `orig.mgz`, so all
FreeSurfer surface spaces are relative to the *conformed* orig grid, not
the raw acquisition. To move surfaces back to `rawavg.mgz` space,
use the registration `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm`'s
conformed-side geometry with [[mri_vol2vol]] `--regheader`, or build the
LTA by hand.

### 8.7 `fsaverage` is MNI305, not MNI152

Group analysis on `fsaverage` lives in MNI305 by definition. Any
overlay file produced on `fsaverage` is interpretable as MNI305 volume
coordinates only after using the Vox2RAS of the `fsaverage` `orig.mgz`,
which `recon-all` builds as a special case where the MNI305 registration
is the identity.

## 9. Tools That Use These Concepts

| Tool | Relationship |
|------|--------------|
| [[mri_info]] | `--vox2ras`, `--vox2ras-tkr`, `--ras2vox`, `--cras`, `--tkr2scanner`, `--mni` — all introspect the matrices described here |
| [[mri_convert]] | `--conform`, `--apply_transform`, `--upsample` all touch Vox2RAS; conform sets the LIA direction cosines that make Surface and Scanner RAS differ only by `c_ras` |
| [[mri_vol2vol]] | `--reg` consumes a register.dat/LTA; `--regheader` re-uses the Vox2RAS pair directly for "same-physical-space" resampling |
| [[mri_vol2surf]] | Uses §7.5 (plus `--reg` for cross-modality) to sample volumetric data at surface vertices |
| [[mri_surf2vol]] | Inverse: writes a volume where each voxel picks up the surface value from the nearest vertex in Surface RAS |
| [[talairach_avi]] | Produces `talairach.xfm` (Scanner-RAS → MNI305) and its companion `.xfm.lta` |
| [[mri_em_register]] | Estimates an LTA between a volume and a GCA atlas in Scanner-RAS space, used to refine `talairach.xfm` in `autorecon1` |
| [[tkregister2]] | Hand-editing of a `register.dat` in Surface-RAS space; the historical reason the tkregister convention exists |
| [[freeview]] | Displays Surface, Scanner, and "Talairach" RAS in parallel; `Mfix` and `talairach.xfm` applied on the fly |
| [[mri_aparc2aseg]] | Uses §7.4 to find the Surface RAS of each aseg voxel |
| [[mris_convert]] | `--to-scanner` / `--to-tkr` writes surfaces with `useRealRAS=1` / `useRealRAS=0` respectively |
| [[lta_convert]] | Converts between `.lta`, `.xfm`, `.mat`, `.dat`, `.txt` — i.e. between the transform types in §8.4 |

## 10. Worked Example

Take a fictional subject `bert` whose `mri/orig.mgz` has the typical
conformed geometry: 256³ voxels, 1 mm isotropic, LIA direction cosines,
and a centre offset of $(c_r, c_a, c_s) = (-1.79,\, 14.59,\, 8.03)$ mm
(drawn from the real `bert` demo subject).

Then:

$$
T_\text{orig} =
\begin{bmatrix}
-1 & 0 & 0 & 128 \\
 0 & 0 & 1 & -128 \\
 0 & -1 & 0 & 128 \\
 0 & 0 & 0 & 1
\end{bmatrix},
\quad
N_\text{orig} =
\begin{bmatrix}
-1 & 0 & 0 & 128 - 1.79 \\
 0 & 0 & 1 & -128 + 14.59 \\
 0 & -1 & 0 & 128 + 8.03 \\
 0 & 0 & 0 & 1
\end{bmatrix}
$$

(Note the extra `-1` factor on the column DC; both matrices use LIA, so
they agree on the 3×3 block and differ only in the translation column.)

So:

$$
\mathrm{Mfix} = N_\text{orig} \cdot T_\text{orig}^{-1} =
\begin{bmatrix}
1 & 0 & 0 & -1.79 \\
0 & 1 & 0 & 14.59 \\
0 & 0 & 1 & 8.03 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

i.e. a pure translation by `c_ras`. A surface vertex at Surface RAS
$(20, -10, 30)$ lands at Scanner RAS
$(20 - 1.79,\, -10 + 14.59,\, 30 + 8.03) = (18.21, 4.59, 38.03)$.

Now suppose `talairach.xfm` maps scanner-RAS to MNI305-RAS via some
affine $X$. If `X * (18.21, 4.59, 38.03, 1)' = (20, 5, 40, 1)'`, then the
same vertex lives at **MNI305** (20, 5, 40). Relabelling that as
"Talairach" is a FreeSurfer convention; the actual Talairach-88 coordinate
(via `FixMNITal`, with $z \geq 0$):

$$
(x_\text{tal}, y_\text{tal}, z_\text{tal}) =
(0.9900 \cdot 20,\;
0.9688 \cdot 5 + 0.0460 \cdot 40,\;
-0.0485 \cdot 5 + 0.9189 \cdot 40)
= (19.80,\; 6.68,\; 36.51)
$$

— a ~4 mm shift in $y$ and $z$, despite FreeSurfer reporting
"Talairach (20, 5, 40)" for the same vertex.

## 11. Confidence and Gaps

- The core matrix definitions (§2-§4) are taken directly from
  `utils/mri.cpp` (`MRIxfmCRS2XYZ`, `MRIxfmCRS2XYZtkreg`) and the
  fscoordinates PDF, cross-checked against `include/mri.h`'s `VOL_GEOM`
  definition. **High confidence.**
- The `Mfix` devolve logic (§5) is taken directly from
  [[`utils/transform.cpp:2027-2123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027-L2123)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027-L2123) (`DevolveXFM`). **High confidence.**
- The MNI305 ↔ MNI152 matrix (§3.5) is listed on the FreeSurfer wiki and
  matches `$FREESURFER_HOME/average/mni152.register.dat` semantically, but
  has not been numerically recomputed from that file. **Medium
  confidence.** Not critical: this is a constant affine.
- The register.dat convention direction (`R` maps anat → mov) follows
  both the fscoordinates PDF *and* the source comment in
  [[`utils/mri.cpp:888`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L888)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L888) ("the tkreg R maps from Ref RAS to the Mov RAS").
  **High confidence.**
- The Brett piecewise affine coefficients (§3.4) are copied verbatim from
  [[`utils/transform.cpp:1983-2014`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1983-L2014)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1983-L2014). **High confidence.**

> [!gap] LTA type-21 in practice
> `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` is defined but rarely seen in the
> wild. I have not audited the code paths that actually use it end-to-end;
> most tools seem to convert it to `LINEAR_VOX_TO_VOX` immediately via
> `LTAvoxelTransformToCoronalRasTransform()` at
> `utils/transform.cpp`.

> [!gap] Oblique non-conformed volumes
> The formulas in §5 and §7 are stated for LIA-conformed volumes (which
> is what `orig.mgz` always is after `autorecon1` stage 1). For genuinely
> oblique input data that has been used *without* `mri_convert --conform`,
> `Mfix` is no longer a pure translation and I have not traced the
> surface-tessellation code's behaviour. In practice you should never see
> this: every surface in the canonical `recon-all` pipeline is
> tessellated from `orig.mgz`, which is conformed by construction.

## 12. References

### Primary sources (FreeSurfer)

- `utils/mri.cpp` — `MRIxfmCRS2XYZ()` ([line 589](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L589)), `MRIxfmCRS2XYZtkreg()`
  ([line 835](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L835)), `surfaceRASFromVoxel_()` ([line 3515](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3515)),
  `voxelFromSurfaceRAS_()` ([line 3562](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3562)),
  `RASFromSurfaceRAS_()` / `surfaceRASFromRAS_()` (lines 3603, 3634).
- `utils/transform.cpp` — `FixMNITal()` ([line 1983](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1983)),
  `DevolveXFM()` / `DevolveXFMWithSubjectsDir()` ([line 2027](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2027)),
  `TransformCRS2MNI305()` ([line 5190](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L5190)).
- `utils/mrisutils.cpp` — `MRIStkr2Scanner()` ([line 2375](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2375)),
  `MRISscanner2Tkr()` ([line 2400](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L2400)).
- `utils/registerio.cpp` — `regio_read_register()` ([line 43](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/registerio.cpp#L43)).
- `utils/mrisurf_io.cpp` — surface-file read path, `useRealRAS` tag
  handling ([lines 4024-4272](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4024-L4272)).
- `include/transform.h` — LTA type codes ([lines 137-148](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L137-L148)), `DevolveXFM`
  signature.
- `include/mri.h` — `VOL_GEOM` struct ([lines 185-220](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185-L220)), `get_Vox2RAS`,
  `get_Vox2TkregRAS`, `get_RAS2TkregRAS`.

### FreeSurfer wiki and documentation

- [CoordinateSystems wiki page](https://surfer.nmr.mgh.harvard.edu/fswiki/CoordinateSystems),
  accessed 2026-04-14. Cached snapshot at
  `raw/wiki-snapshots/CoordinateSystems.md`.
- `fscoordinates.pdf`, linked from the above wiki page:
  [direct URL](https://surfer.nmr.mgh.harvard.edu/fswiki/CoordinateSystems?action=AttachFile&do=get&target=fscoordinates.pdf).
  The 9-page "Theory of Affine Spatial Transforms" deck by D. Greve.
  This is the authoritative source for the tkreg matrix definition, the
  Tower-of-Babel warning, and the Case 1–9 cross-package formulas.
- [mri_info wiki page](https://surfer.nmr.mgh.harvard.edu/fswiki/mri_info),
  for the meaning of `--vox2ras`, `--vox2ras-tkr`, `--cras`, and
  `--tkr2scanner`.

### Academic references

- Evans, A.C., et al. (1992). "Anatomical mapping of functional
  activation in stereotactic coordinate space." *NeuroImage* 1(1): 43-53.
  — MNI305 template.
- Mazziotta, J., et al. (2001). "A four-dimensional probabilistic atlas
  of the human brain." *J. Am. Med. Inform. Assoc.* 8(5): 401-430. —
  MNI152 template.
- Brett, M. (1999). "The MNI brain and the Talairach atlas."
  http://imaging.mrc-cbu.cam.ac.uk/imaging/MniTalairach — the piecewise
  affine correction used by `FixMNITal()`. The 1998 version of the
  transform is what is encoded in FreeSurfer.
- Wu, J., et al. (2018). "Accurate nonlinear mapping between MNI
  volumetric and FreeSurfer surface coordinate systems." *Human Brain
  Mapping* 39(9): 3793-3808. — quantitative errors of the MNI305↔MNI152
  global affine relative to diffeomorphic registration.
- Talairach, J. and Tournoux, P. (1988). *Co-planar stereotaxic atlas of
  the human brain*. Thieme. — the original Talairach-88 atlas that
  FreeSurfer's "Talairach" output is *not*.

### Mailing-list threads (cached issues cited in the text)

- "vox2ras and vox2ras-tkr" —
  https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msg27399.html
- "MNI to RAS surface coordinates" —
  https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msg23344.html
- "Difference between vox2ras and vox2ras-tkr for subject-specific T1w" —
  https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msg69541.html
- "fsaverage and mni305" —
  https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msg04800.html
- "Converting MNI152 coordinates to fsaverage space" —
  https://www.mail-archive.com/freesurfer@nmr.mgh.harvard.edu/msg61231.html
