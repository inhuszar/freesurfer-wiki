---
title: "Registration Overview"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mri_em_register]]"
  - "[[talairach_avi]]"
  - "[[mris_register]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mri_label2vol]]"
  - "[[mris_preproc]]"
related_concepts:
  - "[[coordinate-systems]]"
  - "[[surface-representations]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "mris_make_surfaces surface deformation (intensity-guided white and pial placement) not documented"
  - "rca-surfreg wrapper (called in place of mris_register in FS 8.x) not traced"
  - "Non-linear registration (mri_nl_align, mri_robust_register) not ingested"
tags:
  - registration
  - transform
  - alignment
  - concept
---

# Registration Overview

## Overview

"Registration" in FreeSurfer refers to the spatial alignment of two coordinate
spaces — either a subject volume to a standard atlas (volumetric registration)
or a subject's cortical surface to a group-average surface atlas (surface
registration). FreeSurfer uses several distinct registration types at different
pipeline stages, each with different purposes, algorithms, and output formats.

This page gives a structured overview. The coordinate-system formalism
(transform matrices, [[lta-format|LTA files]], register.dat format) is covered in depth in
[[coordinate-systems]]. The surfaces produced after registration are described
in [[surface-representations]].

## Types of Registration in FreeSurfer

| Registration Type | Tools | Output | Purpose |
|------------------|-------|--------|---------|
| Volume → MNI305 (Talairach) | [[talairach_avi]], [[mri_em_register]] | `.xfm`, `.lta` | Initialise atlas-based segmentation |
| Volume → GCA atlas | [[mri_em_register]] | `.lta` (LINEAR_VOX_TO_VOX) | Sub-cortical segmentation |
| Surface → atlas sphere | [[mris_register]] | `sphere.reg` | Cross-subject surface correspondence |
| Subject → functional volume | `register.dat` (created by bbregister / tkregister2) | `register.dat` (REGISTER_DAT) | Project fMRI/PET onto surface |
| Non-linear volume warp | `mri_nl_align`, `mri_robust_register` | `.m3z`, `.lta` | Deformable atlas registration |

## Stage 1: Talairach Registration (autorecon1)

**Purpose:** Compute a 12-DOF affine transform from subject T1 space to MNI305
space. This is called "Talairach" registration in FreeSurfer, but the target
space is MNI305, not true Talairach. See [[coordinate-systems]] for the
distinction.

**Tools:**
- [[talairach_avi]]: intensity-based affine registration via `mpr2mni305` /
  `imgreg_4dfp`. Input: `orig.mgz`. Output: `transforms/talairach.xfm` (MNI
  transform) and `transforms/talairach.xfm.lta` (LTA version).
- [[mri_em_register]] (skull-aware): used with `-skull` flag immediately before
  [[mri_watershed]] to help locate the skull surface for stripping.

**Algorithm:** [[talairach_avi]] calls `mpr2mni305` which runs a 6-pass affine
registration using 4dfp format volumes. Each pass refines translation, then
rotation, then full 12-DOF affine. See [[talairach_avi]] for full algorithm
details.

**Output format:** `.xfm` (MNI TRANSFORM FILE format):
```
MNI Transform File
Transform_Type = Linear;
Linear_Transform =
  a11 a12 a13 t1
  a21 a22 a23 t2
  a31 a32 a33 t3;
```
Encodes the 4×4 affine in RAS coordinates (moving source → target).

## Stage 2: Atlas-Based Subcortical Registration (autorecon2)

**Purpose:** Linear registration of the subject T1 to the Gaussian Classifier
Atlas ([[gca-format|GCA]], `RB_all_2020-01-02.gca`) for initialising subcortical segmentation.

**Tool:** [[mri_em_register]] (without `-skull`). Input: `nu.mgz` (bias-corrected).
Output: `transforms/talairach.lta` (LINEAR_VOX_TO_VOX type).

**Algorithm:** A hierarchical multi-scale search that maximises the
log-likelihood of the atlas given the image intensities. See [[mri_em_register]]
for full details including the scale-space outer loop and the two-stage coarse +
refinement search.

**Output format:** `.lta` (Linear Transform Array). See [[coordinate-systems]]
for LTA type codes and the matrix format. The type code for this output is
`LINEAR_VOX_TO_VOX = 0`.

## Stage 3: Surface Registration to Atlas (autorecon3)

**Purpose:** Align the subject's spherical surface (`sphere`) to a
group-average atlas sphere (`average.curvature.filled.buckner40.tif`) so that
cross-subject comparisons are possible at the vertex level.

**Tool:** In FreeSurfer ≤ 7.x: [[mris_register]] directly. In FreeSurfer 8.x:
[[rca-surfreg]] (a wrapper script that calls `mris_register` with additional
configuration).

> [!gotcha] FS 8.x uses `rca-surfreg`, not `mris_register` directly
> In FreeSurfer 8.2.0, `recon-all` calls `rca-surfreg` for the surfreg stage,
> not `mris_register` directly. This wrapper may configure [[mris_register]] or
> use an alternative registration algorithm (e.g., surface-to-surface). The
> internals of `rca-surfreg` have not been documented.

**Algorithm:** Optimises a joint energy functional over the sphere:
$$
E = l_\text{corr} \cdot (1 - \text{correlation}(\mathbf{f}_\text{subj}, \mathbf{f}_\text{atlas}))
    + l_\text{dist} \cdot E_\text{distortion}
    + l_\text{area} \cdot E_\text{area}
$$
where the feature vector $\mathbf{f}$ combines `?h.sulc` (sulcal depth) and
`?h.curv` (mean curvature). Parameters: $l_\text{corr}=1$, $l_\text{dist}=5$,
$l_\text{area}=0.1$.

**Output:** `?h.sphere.reg` — the sphere after atlas registration. Used by
`mri_surf2surf` and [[mris_preproc]] for cross-subject resampling.

## Stage 4: Subject-to-Functional Registration

**Purpose:** Align the subject's anatomical space (`orig.mgz`) to a
functional volume (fMRI, PET, DTI) so that overlay data can be projected onto
the surface via [[mri_vol2surf]].

**Tool:** `bbregister` (not yet documented) or `tkregister2` — both produce a
`register.dat` file.

**Format:** `register.dat` — a 7-line ASCII format:
```
subjectname
in-plane resolution (mm)
slice thickness (mm)
intensity scaling
M11 M12 M13 M14
M21 M22 M23 M24
M31 M32 M33 M34
0   0   0   1
round
```
The 4×4 matrix maps from the functional volume's tkregister-RAS to the
anatomy's tkregister-RAS. The last field (`round` or `floor`) specifies the
float-to-integer rounding mode used by `mri_vol2surf`.

See [[coordinate-systems]] for the LTA type code `REGISTER_DAT = 14`.

## Transform File Formats Summary

| Format | Extension | LTA Type | Coordinate type | Contents |
|--------|-----------|----------|-----------------|----------|
| MNI Transform | `.xfm` | n/a | Scanner RAS → Scanner RAS | 12-DOF affine matrix, MNI format |
| Linear Transform Array | `.lta` | 0 = `LINEAR_VOX_TO_VOX` | Vox → Vox | 4×4 matrix + src/dst vol geom |
| Linear Transform Array | `.lta` | 1 = `LINEAR_RAS_TO_RAS` | Scanner RAS → Scanner RAS | 4×4 matrix |
| Register DAT | `.dat` | 14 = `REGISTER_DAT` | tkRAS → tkRAS | 4×4 + patient name + resolution |
| FSL FLIRT | `.mat` | 15 = `FSLREG_TYPE` | FSL vox → FSL vox | FSL-convention 4×4 matrix |

See [[coordinate-systems]] for the full derivation of each transform and the
conversion identities between them.

## Cross-Subject Surface Resampling

Once all subjects have `sphere.reg`, surface data can be resampled to a common
space using `mri_surf2surf`. This is the basis for [[mris_preproc]] group analysis.

The resampling uses nearest-neighbour mapping on the unit sphere:

1. Find the atlas vertex $a^*$ nearest to the subject's vertex $v$ on the
   target sphere: $a^* = \arg\min_{a} \|\mathbf{x}_v^\text{src.reg} - \mathbf{x}_a^\text{trg.reg}\|$
2. Map overlay value from source vertex $v$ to target vertex $a^*$

The **Jacobian correction** accounts for areal distortion during registration:
when the spherical registration stretches a patch of cortex, the area measure
at the corresponding target vertex must be scaled inversely. This is
automatically applied by [[mris_preproc]] for area and volume measures.

## LTA File Structure

The `.lta` format encodes a Linear Transform Array — a chain of one or more
transforms with embedded volume geometry. The text format is:

```
type = 0  # 0=VOX2VOX, 1=RAS2RAS
nxforms = 1
mean = 0.0 0.0 0.0
sigma = 1.0
1 4 4
r11 r12 r13 t1
r21 r22 r23 t2
r31 r32 r33 t3
0   0   0   1
src volume info
valid = 1 # 1 = valid
filename = orig.mgz
volume = 256 256 256
voxelsize = 1.000000 1.000000 1.000000
xras = -1 0 0
yras = 0 0 -1
zras = 0 1 0
cras = 0 0 0
dst volume info
...
```

The src/dst volume geometry is critical for type conversion: to convert a
`LINEAR_VOX_TO_VOX` LTA to `LINEAR_RAS_TO_RAS`, the code uses:
$$
\mathbf{M}_\text{RAS} = \mathbf{V}_\text{dst} \cdot \mathbf{M}_\text{vox} \cdot \mathbf{V}_\text{src}^{-1}
$$
where $\mathbf{V}$ is the vox2ras matrix of the respective volume. Both
geometries must be valid for this conversion.

## Common Registration Gotchas

> [!gotcha] "Talairach" in FreeSurfer means MNI305, not true Talairach
> FreeSurfer's `talairach.xfm` maps to MNI305 space using the Brett piecewise
> affine transform, not to the original Talairach coordinate system (which
> requires manual identification of AC/PC landmarks). The two coordinate systems
> differ by up to ~10 mm in posterior regions. See [[coordinate-systems]] for
> details.

> [!gotcha] LTA type conversion requires valid src/dst geometries
> Converting between `LINEAR_VOX_TO_VOX` and `LINEAR_RAS_TO_RAS` requires the
> volume geometry fields (`src volume info`, `dst volume info`) to be valid.
> LTA files written without geometries (e.g., from some third-party tools) will
> fail `LTAchangeType()`.

> [!gotcha] register.dat direction convention
> The `register.dat` matrix maps FROM functional/source volume TO anatomy
> (tkRAS → tkRAS). When [[mri_vol2surf]] reads it, the matrix is applied as
> $\mathbf{x}_\text{surf} = \mathbf{R}^{-1} \mathbf{x}_\text{vol}$ (effectively:
> anatomy → source vol direction). Keep track of which direction your registration
> file encodes.

> [!gotcha] Surface registration in FS 8.x uses `rca-surfreg`
> The surfreg stage in `recon-all` (FS 8.2.0) calls `rca-surfreg`, not
> [[mris_register]] directly. The output is still `sphere.reg` but the calling
> conventions and configuration may differ from the direct `mris_register` call.

## How to Convert Between Transform Types

Using `lta_convert` (not yet documented):

```bash
# VOX2VOX → RAS2RAS
lta_convert --inlta in.lta --outlta out.lta --outreg

# MNI xfm → LTA
lta_convert --inmni talairach.xfm --outlta talairach.lta \
            --src orig.mgz --dst $FREESURFER_HOME/average/mni305.cor.mgz

# register.dat → LTA
lta_convert --inreg register.dat --outlta register.lta \
            --src func.mgz --dst orig.mgz
```

See [[coordinate-systems]] for the mathematical identities behind these
conversions.

## See also

Additional registration drivers and helpers:

- [[mkxsubjreg]] — builds a cross-subject `register.dat` that maps one subject's functional volume into another subject's anatomical space, routing through both Talairach transforms.
- [[xsanatreg]] — cross-session anatomical-to-anatomical registration via the MNI `minctracc` program.
- [[register.csh]] — legacy COR-to-COR rigid registration driven by the AFNI toolkit (`3dvolreg`/`3drotate`).
- [[reg2subject]] — utility that prints the subject name embedded in a `.lta` or `register.dat` file.

## Confidence and Gaps

High confidence on volumetric registration (Talairach, GCA), register.dat
format, and LTA format — derived from [[talairach_avi]], [[mri_em_register]],
[[mri_vol2surf]], [[mri_label2vol]], and [[coordinate-systems]] source analysis.

> [!gap] `rca-surfreg` wrapper
> The FreeSurfer 8.x `rca-surfreg` wrapper that replaces the direct
> `mris_register` call in `recon-all` has not been read. Its configuration,
> any alternative registration algorithms it may invoke, and its output
> conventions relative to plain `mris_register` are unknown.

> [!gap] `bbregister` boundary-based registration
> The tool used to compute subject-to-functional registration files has not
> been ingested. The algorithm (minimising cost function over the white/grey
> boundary) and its integration with [[mri_vol2surf]] are not documented here.

> [!gap] Non-linear registration
> `mri_nl_align`, `mri_robust_register`, and GCA morph (`.m3z`) non-linear
> registration are not yet documented.

## References

- Collins DL, Neelin P, Peters TM, Evans AC (1994). Automatic 3D intersubject
  registration of MR volumetric data in standardized Talairach space. *J Comput
  Assist Tomogr* 18(2):192–205.
- Brett M, Johnsrude IS, Owen AM (2002). The problem of functional localization
  in the human brain. *Nat Rev Neurosci* 3(3):243–249. (MNI→Talairach transform)
- Fischl B, Sereno MI, Tootell RBH, Dale AM (1999). High-resolution intersubject
  averaging and a coordinate system for the cortical surface. *Hum Brain Mapp*
  8(4):272–284.
- Greve DN, Fischl B (2009). Accurate and robust brain image alignment using
  boundary-based registration. *NeuroImage* 48(1):63–72. (bbregister)
