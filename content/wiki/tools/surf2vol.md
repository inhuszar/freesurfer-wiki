---
title: "surf2vol"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "fem_elastic/fsurf2vol.cpp"
  - "fem_elastic/surf_utils.cpp"
  - "fem_elastic/surf_powell.cpp"
  - "fem_elastic/surf_energy.cpp"
  - "fem_elastic/transformUtils.cpp"
  - "fem_elastic/solver.h"
  - "fem_elastic/fem_3d.cpp"
  - "fem_elastic/untangler.cpp"
  - "fem_elastic/pbCluster_mesh_crop.cpp"
  - "fem_elastic/morph.cpp"
families:
  - "fem_elastic"
recon_all_stage: null
related:
  - "[[mri_cvs_register]]"
  - "[[exportGcam]]"
  - "[[createMorph]]"
  - "[[applyMorph]]"
  - "[[mris_resample]]"
  - "[[mris_register]]"
  - "[[mri_surf2vol]]"
  - "[[coordinate-systems]]"
  - "[[surface-format]]"
  - "[[annotation-format]]"
  - "[[m3z-format]]"
  - "[[internal-gcamorph]]"
  - "[[internal-transform]]"
  - "[[registration-overview]]"
status: draft
confidence: medium
last_agent_update: 2026-10-19
gaps:
  - "Behaviour of the default PETSc KSP/PC (no -ksp_type/-pc_type): -pc_type ilu terminated with SIGSEGV in test runs; cause not determined"
  - "-fem_print aborts the run (SIGSEGV in MatView) in a test run; cause not determined"
  - "Whether the canonical -ksp_type preonly -pc_type jacobi (one Jacobi application per step, not a converged solve; switched from CG in 3916ce1fbc, 2011-10-20) is the intended numerical scheme is not stated in code or commit message (see [[00200]])"
  - "Source of the hard-coded constants (20-voxel low-side margin, 256 upper bound, tetgen quality 1.414, subsample radius 3.5, topology radius 3) is undocumented"
  - "In-tree help text (help_exit) does not match the options parse() reads; no help.xml exists"
tags:
  - cvs
  - fem
  - elastic
  - registration
  - surface
  - petsc
  - tetrahedral-mesh
  - nonlinear
---

# surf2vol

## Summary

`surf2vol` ("Diffuse surface deformation to volumes", the string in [`fem_elastic/fsurf2vol.cpp:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L51)) computes a dense 3D warp that carries a *moving* subject's volume onto a *fixed* (atlas) volume, driven only by surface correspondence. Its inputs are one or more pairs of surfaces with one-to-one vertex correspondence (fixed `lh.white`, `lh.pial`, ... paired with the moving subject's surfaces resampled onto the atlas vertices) plus the two MRI volumes. It first fits a 12-parameter affine transform between the moving and fixed surfaces with Powell's method, then treats the residual vertex displacements as point constraints on a linear-elastic tetrahedral finite-element mesh (solved with PETSc) and diffuses them into the whole volume over a number of incremental steps. The result is a chain of mesh transforms plus the inverse affine, saved as a `.tm3d` morph (`-out_mesh`), optionally as an `.m3z` (`-gcam`), and used to resample the moving volume into the fixed geometry (`-out`).

The binary is a stand-alone executable built from the `fem_elastic` directory. Its only in-tree caller is Step 2 ("elastic registration") of [[mri_cvs_register]].

## Source Information

- **Language:** C++ (links PETSc 2.3.3-p13 and the bundled TetGen)
- **Main source:** `fem_elastic/fsurf2vol.cpp` (executable is named `surf2vol`; see [`fem_elastic/CMakeLists.txt:48-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L48-L70))
- **Other sources linked into the binary:** `surf_utils.cpp`, `surf_powell.cpp`, `surf_energy.cpp`, `transformUtils.cpp`, `morph.cpp`, `fem_3d.cpp`, `untangler.cpp`, `pbCluster_mesh_crop.cpp`, `ZlibStringCompressor.cpp`, `small_matrix.cpp`, `misc_maths.cpp` (header-only solver in `solver.h`)
- **Binary location:** `$FREESURFER_HOME/bin/surf2vol`
- **Help:** no `surf2vol.help.xml` exists. `surf2vol -help` prints the PETSc option banner followed by the in-code usage text ([`fem_elastic/fsurf2vol.cpp:1500-1525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1500-L1525)) and exits with status 1 ([`fem_elastic/fsurf2vol.cpp:1524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1524)). Running with no arguments prints the missing-option errors instead ([`fem_elastic/fsurf2vol.cpp:1267-1351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1267-L1351)).
- **Only caller:** [`mri_cvs_register/mri_cvs_register:389-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L389-L436)

> [!internal] Options are PETSc options
> There is no `argv` parser. All options are read from the PETSc options database (`PetscOptionsGetString/Real/Int/HasName`) after `PetscInitialize` ([`fem_elastic/fsurf2vol.cpp:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L278), [`fem_elastic/fsurf2vol.cpp:1246-1496`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1246-L1496)). Option names are matched exactly (so `-out` and `-out_field` are distinct), every option takes its value as the next token, and **unknown options are silently ignored** (unless `-options_left` is added, a generic PETSc option).

## Purpose and Context

CVS (Combined Volumetric and Surface) registration needs a volumetric warp that makes the subject's cortical surfaces land on the atlas's cortical surfaces. `surf2vol` supplies the first volumetric stage: it takes the surface correspondence obtained from spherical registration ([[mris_register]] followed by [[mris_resample]], so that the moving white/pial surfaces have the atlas's vertex layout) and extends it into a smooth volumetric deformation by elastic diffusion, instead of using image intensities. [[mri_cvs_register]] then converts the saved `.tm3d` morph into an `.m3z` with [[exportGcam]] and refines it with intensity-based nonlinear alignment.

`surf2vol` shares its morph infrastructure (`gmp::VolumeMorph`, the `.tm3d` container) with the sibling tools [[createMorph]], [[applyMorph]] and [[exportGcam]], which can create, apply and convert `.tm3d` files outside of `surf2vol`.

The in-code header ([`fem_elastic/fsurf2vol.cpp:227-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L227-L261)) names the datasets ATLAS (fixed) and SRC (moving) and states that the deformation is computed as ATLAS to SRC, with the morphing done in ATLAS space, i.e. the output volume lives on the fixed grid and is filled by sampling the moving volume.

## Inputs

### Required Inputs

All of these are mandatory; a missing one is collected into an error message and the program exits with status 1 after printing them all ([`fem_elastic/fsurf2vol.cpp:290-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L290-L298)).

- **Fixed (atlas) volume**, `-fixed_mri` ([`fem_elastic/fsurf2vol.cpp:1263-1267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1263-L1267)). Any format `MRIread` accepts ([[mgz]], [[nifti]]). Defines the output grid and the voxel coordinate system of the fixed surfaces.
- **Moving volume**, `-moving_mri` ([`fem_elastic/fsurf2vol.cpp:1270-1274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1270-L1274)). The volume that is resampled; multi-frame volumes are supported ([`fem_elastic/morph.cpp:701-717`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L701-L717)).
- **Fixed surfaces**, `-fixed_surf`, `-fixed_surf_2`, `-fixed_surf_3`, ... ([`fem_elastic/fsurf2vol.cpp:1283-1304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1283-L1304)). Native FreeSurfer surface files ([[surface-format]]) in the fixed subject's surface RAS space.
- **Moving surfaces**, `-moving_surf`, `-moving_surf_2`, ... ([`fem_elastic/fsurf2vol.cpp:1334-1355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1334-L1355)). In CVS these are the `?h.resample.white` / `?h.resample.pial` files written by [[mris_resample]] (script lines [`mri_cvs_register/mri_cvs_register:296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L296), [`mri_cvs_register/mri_cvs_register:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L309)).

**Optional inputs**

- **Annotations for the fixed surfaces**, `-aparc`, `-aparc_2`, ... ([[annotation-format]]), one per fixed surface, or the literal word `none` to skip a surface ([`fem_elastic/fsurf2vol.cpp:1306-1332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1306-L1332), [`fem_elastic/fsurf2vol.cpp:1643-1675`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1643-L1675)).
- **Cached linear transform**, `-cache_transform <file>` (12 floats, see Configuration Interactions).
- **Fixed-volume aseg**, `-aseg <file>`: read from disk if given but never used afterwards (see the gotcha below).

### Input Assumptions

> [!assumption] Surface pairs with one-to-one vertex correspondence
> The N-th fixed surface and the N-th moving surface are paired by position on the command line and must have the same number of surfaces overall ([`fem_elastic/fsurf2vol.cpp:321-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L321-L325)) and the same number of vertices pair by pair ([`fem_elastic/fsurf2vol.cpp:326-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L326-L341)); a violation prints a message and exits with status 1. Vertex *i* of the fixed surface is assumed to correspond anatomically to vertex *i* of the moving surface. Nothing checks that this is true; that is what the spherical registration + `mris_resample` step guarantees in CVS.

- **Positional pairing:** `-aparc_N` is paired with `-fixed_surf_N` by index. If any `-aparc` is given, the count must equal the number of fixed surfaces (error "Size mismatch for APARC files (use none if you want to skip one)" otherwise, [`fem_elastic/fsurf2vol.cpp:1328-1332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1328-L1332)). The `-moving_surf_N` list has no separate count check apart from equality with the fixed list.
- **Consecutive numbering:** the `_N` families are read in a loop that stops at the first missing index ([`fem_elastic/fsurf2vol.cpp:1287-1304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1287-L1304), [`fem_elastic/fsurf2vol.cpp:1309-1325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1309-L1325), [`fem_elastic/fsurf2vol.cpp:1337-1355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1337-L1355)). If, e.g., `-fixed_surf_3` is given without `-fixed_surf_2`, the third surface is silently never read.
- **Volume size:** the mesh box is hard-wired to end at voxel 256 (see Mathematical Foundations), so the fixed volume is assumed to be a 256-voxel conformed volume.
- **Path length:** every string option is read into a 256-byte buffer ([`fem_elastic/fsurf2vol.cpp:1252-1253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1252-L1253)), so paths are limited to 255 characters.
- **Annotation colour table:** `-aparc` files are read with `MRISreadAnnotation`; the labels to exclude are then looked up by name (`unknown`, `corpuscallosum`) in the surface's colour table ([`fem_elastic/fsurf2vol.cpp:1575-1582`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1575-L1582)), so the annotation is expected to carry a standard FreeSurfer colour table.

## Outputs

### Files Created

| File | Written when | Content |
|------|--------------|---------|
| `-out <file>` (default `out.mgz` in CWD) | always, after the last FEM step ([`fem_elastic/fsurf2vol.cpp:653-656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L653-L656)) | The **moving volume resampled on the fixed grid** through the FEM chain followed by the inverse affine. Trilinear interpolation, same voxel type as `-moving_mri`, geometry of `-fixed_mri`; voxels that map outside the moving volume or outside the mesh are 0 ([`fem_elastic/morph.cpp:846-855`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L855)). |
| `<out_mesh>.tm3d` | `-out_mesh <root>` given ([`fem_elastic/fsurf2vol.cpp:670-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L670-L693)) | `gmp::VolumeMorph` with the fixed/moving volume geometries and the transform list (FEM transforms of every step, then the affine inverse). The suffix `.tm3d` is appended by the program. Consumed by [[exportGcam]], [[applyMorph]]. |
| `-out_affine <file>` | given ([`fem_elastic/fsurf2vol.cpp:728-749`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L728-L749)) | The moving volume resampled on the fixed grid with **only** the inverse affine (no FEM). |
| `-gcam <file>` | given ([`fem_elastic/fsurf2vol.cpp:659-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L659-L662)) | The morph exported as a `GCA_MORPH` ([[m3z-format]], [[internal-gcamorph]]) through `VolumeMorph::exportGcam(mri_moving, FALSE, 0)`. The resampling is run a second time to build the displacement cache ([`fem_elastic/morph.cpp:1500-1509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1500-L1509)). |
| `<dbg_output>_<step>.tm3d` | `-dbg_output <root>` given ([`fem_elastic/fsurf2vol.cpp:621-635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L621-L635)) | The morph so far, saved after every executed step (`_2`, `_1`, `_0`, ...). Same format as `-out_mesh`. |
| `<cache file>` | `-cache_transform <file>` given and the file could not be read ([`fem_elastic/fsurf2vol.cpp:362-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L362-L365)) | The 12 affine coefficients as text: `m00 m10 m20 m01 m11 m21 m02 m12 m22 t0 t1 t2` on one line ([`fem_elastic/transformUtils.cpp:35-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L35-L49)). |
| `lh.dbg_surf.white`, `lh.dbg_surf.pial`, `rh.dbg_surf.white`, ... | **always**, in the current working directory ([`fem_elastic/fsurf2vol.cpp:438-455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L438-L455)) | The moving surfaces after the linear transform, converted back to fixed-volume surface RAS ([`fem_elastic/fsurf2vol.cpp:443-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L443-L453)). One file per moving surface; see the naming gotcha below. |
| `stif.bin`-style files (name given to `-fem_print`) and `final_stif.bin` | `-fem_print <file>` given ([`fem_elastic/solver.h:314-337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L314-L337)) | PETSc binary dumps of the stiffness matrix; see the gotcha on its failure. |

Standard output is extremely verbose (mesh statistics, per-step errors, PETSc `KSP`/`PC` summaries, memory usage) and ends with `#VMPC# fsurf2vol VmPeak <kB>` ([`fem_elastic/fsurf2vol.cpp:768-770`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L768-L770)).

> [!gotcha] Options that are parsed but produce nothing
> `-out_field` (default `out_field.mgz`, [`fem_elastic/fsurf2vol.cpp:1366-1372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1366-L1372)), `-out_surf` ([`fem_elastic/fsurf2vol.cpp:1374-1378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1374-L1378)) and `-out_surf_affine` ([`fem_elastic/fsurf2vol.cpp:1386-1390`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1386-L1390)) are stored in `IoParams` but nothing in the program ever reads those members; no displacement-field volume or warped surfaces are written. Verified at run time: a run with all three produced none of the files. The startup message "will use default value out_field.mgz" is therefore misleading. Likewise `-aseg` is loaded into memory ([`fem_elastic/fsurf2vol.cpp:1613-1623`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1613-L1623)) but the volume is never used, and `-dirty` is read and printed ([`fem_elastic/fsurf2vol.cpp:954-958`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L954-L958)) but its value is not used afterwards.

> [!gotcha] Unconditional debug surfaces in the working directory
> `<hemi>.dbg_surf.<white|pial>` are written on every run, whether or not any debug option was given, into the **current working directory** (not next to `-out`), and overwrite existing files of the same name. The name is built as `(hemisphere ? "rh" : "lh")` plus `(type == white ? "white" : "pial")` ([`fem_elastic/fsurf2vol.cpp:446-449`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L446-L449)):
> - The hemisphere comes from the **first letter of the moving surface's basename** (`L`/`l` gives left, `R`/`r` gives right, `B`/`b` gives both and anything else gives "none") ([`utils/mrisurf_io.cpp:3657-3680`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L3657-L3680)); the code tests only whether the stored value is non-zero, and left is 0, so every basename that does not start with `L`/`l` (for instance `resampled_lh.white`) is written as `rh.dbg_surf.*` ([`include/mrisurf.h:1068-1071`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf.h#L1068-L1071)).
> - The surface type is guessed by **substring search over the whole path string**: if the path contains `white` it is "white", else if it contains `pial` it is "pial", else "other" ([`fem_elastic/surf_utils.cpp:6-17`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_utils.cpp#L6-L17)). A directory name such as `/data/white_subjects/lh.pial` is therefore classified as white. "Other" surfaces are written under the `pial` name.
> - Two moving surfaces that map to the same file name (same hemisphere and type) overwrite each other.
> In the CVS run these files are leftovers in whatever directory `mri_cvs_register` was launched from (5.0 MB each for the 139,336-vertex `cvs_avg35` left-hemisphere surfaces).

### Output Specifications

- **Coordinate frame of the morph:** voxel indices of the fixed volume (`-fixed_mri`); the morph stores both volume geometries (`set_volGeom_fixed/moving`, [`fem_elastic/fsurf2vol.cpp:647-649`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L647-L649)), so it can be applied later to any volume that is co-registered with the moving one. See [[coordinate-systems]].
- **Direction:** the morph is a *pull-back* map. For a voxel of the fixed grid it gives the position in the moving volume at which to sample (`image()` applies the transform list in order, [`fem_elastic/morph.cpp:1111-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1111-L1127)). Internally the order is: (1) the FEM transforms from the first step to the last, (2) the inverse of the Powell affine ([`fem_elastic/fsurf2vol.cpp:643-653`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L643-L653)).
- **Valid region:** only fixed voxels inside the FEM box (see below) receive data; outside it the output is 0 and the exported `.m3z` marks the nodes invalid ([`fem_elastic/morph.cpp:1581-1590`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1581-L1590)). In a test run on `cvs_avg35` (left hemisphere surfaces only, identity affine) 8,320,480 of the 16,777,216 voxels were valid and 8,456,736 invalid.

## Mathematical Foundations

**1. Coordinate conversion.** All surfaces are converted from surface RAS to **voxel index space of their own volume**: fixed surfaces with `-fixed_mri` and moving surfaces with `-moving_mri` (`MRIsurfaceRASToVoxel`, [`fem_elastic/surf_utils.cpp:20-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_utils.cpp#L20-L38); call sites [`fem_elastic/fsurf2vol.cpp:344-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L344-L345)). Everything below (affine, mesh, element volumes, bounding box) is therefore expressed in voxels, and the cached affine in particular is a **moving-voxel to fixed-voxel** map that is only meaningful for those exact two volumes' geometries.

**2. Linear alignment (Powell).** Let $x_i$ be the moving-surface vertices and $y_i$ the corresponding fixed-surface vertices (all surface pairs, every `-lin_res`-th vertex index, vertices with `ripflag` set on the moving surface skipped, [`fem_elastic/fsurf2vol.cpp:880-945`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L880-L945)). The 12-parameter affine $A\in\mathbb{R}^{3\times 4}$ (initialised to identity) minimises the **mean Euclidean distance** (not the sum of squares)

$$E(A)=\frac{1}{N}\sum_{i=1}^{N}\left\lVert A\begin{pmatrix}x_i\\1\end{pmatrix}-y_i\right\rVert$$

([`fem_elastic/surf_energy.cpp:32-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_energy.cpp#L32-L55)). The parameter vector is stored as `t[0..8]` (linear part, `t[j+3*i]` multiplies coordinate *i* of the input in output coordinate *j*) and `t[9..11]` (translation). Powell's method (`OpenPowell`, tolerance $10^{-4}$) is run once, then restarted in a `do ... while (fret < fstart && fret/255 > .10)` loop ([`fem_elastic/surf_powell.cpp:54-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_powell.cpp#L54-L74)): because the loop body runs at least once, Powell is always executed at least twice; it repeats further only while the cost is still decreasing **and** the mean error exceeds 25.5 voxels. The fitted transform $A$ is applied to the moving vertices ([`fem_elastic/fsurf2vol.cpp:377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L377), [`fem_elastic/surf_energy.cpp:59-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_energy.cpp#L59-L88)), and the inverse $A^{-1}$ (3x3 cofactor inverse; the program exits with status 1 if the determinant of the linear part is below $10^{-5}$, [`fem_elastic/transformUtils.cpp:53-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L53-L87)) is kept for the final morph.

> [!contradiction] "LS rigid registration" comment vs code
> The header comment says step 1 obtains "the LS rigid registration between the 2 surfaces" using Powell ([`fem_elastic/fsurf2vol.cpp:244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L244)). The code fits a general 12-DOF affine (rotation, scale, shear, translation) and minimises the mean *unsquared* Euclidean distance. Code is authoritative.

**3. FEM domain.** After the linear step the *fixed* surfaces' bounding box (all fixed surfaces, all vertices) is computed ([`fem_elastic/surf_utils.cpp:86-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_utils.cpp#L86-L135)). The meshed box is

$$c_{\min}=\max\bigl(b_{\min}-20,\;0\bigr),\qquad c_{\max}=(256,256,256)$$

per axis, in fixed-voxel units: 10 is subtracted twice ([`fem_elastic/fsurf2vol.cpp:393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L393), [`fem_elastic/fsurf2vol.cpp:396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L396)), clipped at 0, and the upper corner is hard-coded to 256 ([`fem_elastic/fsurf2vol.cpp:398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L398); the commented-out `+10` line is [`fem_elastic/fsurf2vol.cpp:397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L397)). The bounding box of the moving surfaces is computed and printed ("TMP") but not used ([`fem_elastic/fsurf2vol.cpp:386-413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L386-L413)).

**4. Mesh generation.** For each step a new tetrahedral mesh is generated with TetGen from the 8 corners of that box plus the "surface container" points, with the switches `pq1.414a<V>` ([`fem_elastic/fem_3d.cpp:773-858`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L773-L858), the switch string at [`fem_elastic/fem_3d.cpp:848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L848)): a piecewise-linear complex, radius-edge quality bound 1.414, and a **maximum tetrahedron volume $V$** (voxel$^3$, i.e. mm$^3$ for a 1 mm volume) equal to the step's element volume. The material constants $E$ (`-young`) and $\nu$ (`-poisson`) are attached to the mesh ([`fem_elastic/fem_3d.cpp:925`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L925)). Smaller $V$ gives a finer mesh; in a test run (one hemisphere, 256-voxel box) $V=10$ gave 236,735 nodes / 1,455,377 tetrahedra and $V=5$ gave 467,353 nodes / 2,906,378 tetrahedra (1,402,059 equations).

**5. Per-step element volume schedule.** With $N$ = `-fem_steps`, step index $s=N,N-1,\dots,\text{end}+1$ and $V_{\min},V_{\max}$ from `-elt_vol` / `-elt_vol_range`,

$$V(s)=\max\Bigl(V_{\min},\;V_{\max}-(V_{\max}-V_{\min})\,\frac{N-s}{N-1}\Bigr)$$

([`fem_elastic/fsurf2vol.cpp:483-488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L483-L488)). The first step uses the coarsest mesh ($V_{\max}$), $V$ decreases linearly to $V_{\min}$ at $s=1$, and the extra step $s=0$ stays at $V_{\min}$ because of the clamp. Example from the canonical call ($N=17$, range 5 to 10): $V(17)=10$, $V(9)=7.5$, $V(1)=V(0)=5$. Run-time check: with `-fem_steps 2 -elt_vol_range 5,10` the log shows `elt_vol= 10`, `5`, `5` for steps 2, 1, 0. For $N=1$ the division by $N-1=0$ is evaluated in floating point; the expression evaluates to NaN and the clamp returns $V_{\min}$ (confirmed on the installed binary: `-fem_steps 1 -elt_vol_range 1,2` logged `elt_vol= 1`).

**6. Linear-elastic system with point constraints.** The mesh is a linear-tetrahedron isotropic elasticity model with stiffness matrix $K(E,\nu)$ on the displacement vector $u$ (3 unknowns per node, [`fem_elastic/solver.h:651-684`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L651-L684)). Surface correspondences enter as **soft "mean-field" point constraints**: each constraint $(p_j,\delta_j)$ is located in a tetrahedron; all constraints falling in the same tetrahedron are grouped, and **only the one whose $\delta_j$ is closest to the group's mean displacement is activated** ([`fem_elastic/solver.h:547-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L547-L645)). The active constraints are added as a penalty with weight $w$ (`-penalty_weight`, default 1.0, [`fem_elastic/solver.h:230`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L230), [`fem_elastic/solver.h:295-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L295-L298)), where $N_e(p)$ is the matrix of the tetrahedron's barycentric shape functions evaluated at $p$ ([`fem_elastic/solver.h:749-820`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L749-L820), [`fem_elastic/solver.h:846-908`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L846-L908)):

$$\Bigl(K+w\sum_{j\in\text{active}}N_{e(j)}(p_j)^{\!\top}N_{e(j)}(p_j)\Bigr)\,u \;=\; w\sum_{j\in\text{active}}N_{e(j)}(p_j)^{\!\top}\delta_j .$$

This is the normal equation of minimising $\tfrac12 u^\top K u+\tfrac{w}{2}\sum_j\lVert N_{e(j)}u-\delta_j\rVert^2$. Only the ratio of $w$ to $E$ matters (the `mri_cvs_register` script comments say so, [`mri_cvs_register/mri_cvs_register:374-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L374-L379)). In addition, the eight box corners (moved 0.01 voxel inward) are pinned to zero displacement at their nearest mesh nodes to make the system positive definite ([`fem_elastic/fsurf2vol.cpp:805-817`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L805-L817), [`fem_elastic/solver.h:476-543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L476-L543)). These 8 pins are counted in the log line `Total BCs` (e.g. 278,680 = 2 x 139,336 surface vertices + 8).

**7. Incremental diffusion.** The boundary-condition list holds pairs (current position of a fixed vertex, target = moving vertex after $A$). At step $s$ the prescribed displacement is the remaining displacement divided by $\max(1,s)$ ([`fem_elastic/fsurf2vol.cpp:819-826`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L819-L826)):

$$\delta_j^{(s)}=\frac{t_j-p_j^{(s)}}{\max(1,s)} .$$

After each solve the "from" positions $p_j$ are advanced through the new step's piecewise-linear map ($p\mapsto p+u^{(s)}(p)$ inside each tetrahedron, [`fem_elastic/fem_3d.cpp:479-489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L479-L489), [`fem_elastic/fsurf2vol.cpp:1985-2004`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1985-L2004)), so step $s=1$ and step $s=0$ both apply the full remaining residual (divisor 1) and step 0 is the "extra step to finish converging" ([`fem_elastic/fsurf2vol.cpp:475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L475), [`fem_elastic/fsurf2vol.cpp:1240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1240)). The final transform is the composition $T=T_{0}\circ T_{1}\circ\dots\circ T_{N}$ (the earliest, coarsest step is applied first; steps are chained with `setInitial`, [`fem_elastic/fsurf2vol.cpp:600-619`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L600-L619)), and the overall map from a fixed-voxel location $q$ to a moving-voxel location is $A^{-1}\bigl(T(q)\bigr)$.

> [!math] What "preonly + jacobi" does in the canonical call
> The canonical call passes `-ksp_type preonly -pc_type jacobi`. In PETSc `preonly` applies the preconditioner exactly once and performs no Krylov iteration, so with Jacobi each step computes $u\approx D^{-1}b$ with $D=\operatorname{diag}(K+w\sum N^\top N)$, not a converged solution of the linear system (the program prints `Absolute-Norm of error`, the residual norm $\lVert Ku-b\rVert$, [`fem_elastic/solver.h:402-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L402-L417), but never tests it). This is consistent with the in-script remark that with few steps "the output is very fragmented; the diffusion process only begins" ([`mri_cvs_register/mri_cvs_register:381-382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L381-L382)) and with the 17 incremental steps; the resulting field behaves like repeated diffusion of the constraints rather than an exact elastic equilibrium. Whether this was the design intent is not documented (see Confidence and Gaps).

**8. Tangled-element repair.** After the solve, `Element3d::orientation_pb(both)` flags tetrahedra whose signed volume in the deformed configuration differs in sign from the reference ([`fem_elastic/fem_3d.cpp:516-556`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L516-L556)); these map to "invalid" under `dir_img` ([`fem_elastic/mesh.h:1241-1255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L1241-L1255)). If any exist, one of two topology solvers re-solves local sub-problems on cropped sub-meshes with the sub-mesh boundary nodes fixed at their current displacement, and writes the new node displacements back (see Configuration Interactions for the difference between the two).

> [!internal] Related morph machinery
> `VolumeMorph`, `FemTransform3d`, `DeltaTransform3d` and `AffineTransform3d` are implemented in `fem_elastic/morph.cpp` (see [[internal-transform]] and [[internal-gcamorph]] for the generic FreeSurfer transform and GCAM structures the `.m3z` export targets). The `.tm3d` container is a tag-structured file with the two volume geometries followed by one zlib-compressed block per transform ([`fem_elastic/morph.cpp:1201-1251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1201-L1251)); chained "initial" transforms are flattened into the list before saving ([`fem_elastic/morph.cpp:1660-1677`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1660-L1677)).

## Configuration Options

### Complete Flag Reference

All options are PETSc options and must be written with a single leading dash, value as the next token. Source line numbers refer to `fem_elastic/fsurf2vol.cpp`.

**Inputs**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-fixed_mri` | file | required | Fixed (atlas) volume; defines the output grid and fixed voxel space ([`fem_elastic/fsurf2vol.cpp:1263-1267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1263-L1267)). |
| `-moving_mri` | file | required | Moving (subject) volume that is resampled ([`fem_elastic/fsurf2vol.cpp:1270-1274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1270-L1274)). |
| `-fixed_surf`<br>`-fixed_surf_<N>` | file | `-fixed_surf` required | Fixed surfaces. The first has no number, the rest start at `_2` and must be consecutive ([`fem_elastic/fsurf2vol.cpp:1283-1304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1283-L1304)). |
| `-moving_surf`<br>`-moving_surf_<N>` | file | `-moving_surf` required | Moving surfaces, paired by index with the fixed ones ([`fem_elastic/fsurf2vol.cpp:1334-1355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1334-L1355)). |
| `-aparc`<br>`-aparc_<N>` | annotation file or `none` | not used | Annotation of fixed surface *N*. Vertices whose annotation colour-table entry is named `unknown` or `corpuscallosum` get `ripflag=1` and are excluded from the boundary-condition list and from the mesher point list ([`fem_elastic/fsurf2vol.cpp:1306-1332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1306-L1332), [`fem_elastic/fsurf2vol.cpp:1533-1583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1533-L1583), [`fem_elastic/fsurf2vol.cpp:1658-1671`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1658-L1671)). `none` leaves that surface untouched. The `bankssts` and `frontalpole` labels are deliberately *not* excluded ([`fem_elastic/fsurf2vol.cpp:1540-1547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1540-L1547)). |
| `-aseg` | file | none | Fixed-volume aseg; read but unused ([`fem_elastic/fsurf2vol.cpp:1277-1281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1277-L1281), [`fem_elastic/fsurf2vol.cpp:1613-1623`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1613-L1623)). |

**Outputs**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-out` | file | `out.mgz` | Moving volume warped onto the fixed grid ([`fem_elastic/fsurf2vol.cpp:1358-1364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1358-L1364), default at [`fem_elastic/fsurf2vol.cpp:1227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1227)). |
| `-out_mesh` | root | none | Writes `<root>.tm3d` ([`fem_elastic/fsurf2vol.cpp:1380-1384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1380-L1384), [`fem_elastic/fsurf2vol.cpp:670-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L670-L693)). |
| `-out_affine` | file | none | Moving volume resampled with the affine only ([`fem_elastic/fsurf2vol.cpp:1398-1402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1398-L1402)). |
| `-gcam` | file | none | Also export the morph as `.m3z` ([`fem_elastic/fsurf2vol.cpp:1392-1396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1392-L1396)). |
| `-dbg_output` | root | none | Save `<root>_<step>.tm3d` after every step ([`fem_elastic/fsurf2vol.cpp:1404-1409`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1404-L1409)). |
| `-out_field` | file | `out_field.mgz` | Parsed but never used; nothing is written ([`fem_elastic/fsurf2vol.cpp:1366-1372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1366-L1372)). |
| `-out_surf` | root | none | Parsed but never used ([`fem_elastic/fsurf2vol.cpp:1374-1378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1374-L1378)). |
| `-out_surf_affine` | root | none | Parsed but never used ([`fem_elastic/fsurf2vol.cpp:1386-1390`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1386-L1390)). |

**Deformation model**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-cache_transform` | file | none | Linear-transform cache: read if possible, otherwise Powell is run and the result written to this file ([`fem_elastic/fsurf2vol.cpp:1463-1470`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1463-L1470), [`fem_elastic/fsurf2vol.cpp:348-367`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L348-L367)). |
| `-lin_res` | int | 1 | Powell uses every *k*-th vertex index of each surface ([`fem_elastic/fsurf2vol.cpp:893-914`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L893-L914)). Read in `powell_lin`, not in `parse()`. Irrelevant when the transform comes from the cache. |
| `-fem_steps` | int N | 1 | Number of incremental FEM steps; the loop runs for $s=N,\dots,\text{end}+1$ ([`fem_elastic/fsurf2vol.cpp:1477-1479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1477-L1479), [`fem_elastic/fsurf2vol.cpp:474-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L474-L476)). Not mentioned in `-help`. |
| `-fem_end_step` | int | -1 | Last step index (exclusive): the loop stops once $s\le$ this value. Default -1 includes the extra step 0; `0` omits it; a value $\ge N$ skips all FEM work ([`fem_elastic/fsurf2vol.cpp:1480-1482`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1480-L1482)). Not in `-help`. |
| `-elt_vol` | double | min 2, max 21 | Sets $V_{\min}=V_{\max}$ = this value: constant maximum tetrahedron volume (voxel$^3$) for every step ([`fem_elastic/fsurf2vol.cpp:1413-1416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1413-L1416), defaults [`fem_elastic/fsurf2vol.cpp:1235-1236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1235-L1236)). Not in `-help`. |
| `-elt_vol_range` | `min,max` | (2, 21) | Comma-separated pair $V_{\min},V_{\max}$; overrides `-elt_vol` ([`fem_elastic/fsurf2vol.cpp:1418-1438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1418-L1438)). Not in `-help`. |
| `-poisson` | double | 0.3 | Poisson ratio $\nu$ ([`fem_elastic/fsurf2vol.cpp:1441-1447`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1441-L1447)). The help text says "must be <0.5", but this is not enforced. |
| `-young` | double | 10 | Young's modulus $E$ ([`fem_elastic/fsurf2vol.cpp:1450-1456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1450-L1456)). Not in `-help`. |
| `-penalty_weight` | double | 1.0 | Weight $w$ of the point-constraint penalty ([`fem_elastic/solver.h:295-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L295-L298)). Read inside the solver, once per step. |
| `-compress` | flag | off | After each step, replace the mesh transform by a dense displacement field sampled on a 256x256x256 grid ([`fem_elastic/fsurf2vol.cpp:1472-1475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1472-L1475), [`fem_elastic/fsurf2vol.cpp:568-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L568-L599), [`fem_elastic/morph.cpp:604-653`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L604-L653)). |
| `-topology_old` | flag | off | Use the older `solve_topology_problems` (untangler) instead of the default cluster-based `TopologySolver` ([`fem_elastic/fsurf2vol.cpp:1484-1487`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1484-L1487), [`fem_elastic/fsurf2vol.cpp:554-563`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L554-L563)). |
| `-use_pial_for_surf` | flag | off | Controls which surfaces contribute vertices to the **mesher point list** (see Configuration Interactions) ([`fem_elastic/fsurf2vol.cpp:1489-1492`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1489-L1492), [`fem_elastic/fsurf2vol.cpp:1008-1049`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1008-L1049)). |
| `-surf_subsample` | double | -1 (off) | If > 0, subsample the surface used for the mesher point list with `MRISsubsampleDist`. The numeric value is only tested for being positive; the spacing is hard-coded to 3.5 ([`fem_elastic/fsurf2vol.cpp:1458-1461`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1458-L1461), [`fem_elastic/fsurf2vol.cpp:1028-1033`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1028-L1033)). |
| `-dirty` | double | 1 | Read in `create_bc_container` and printed (`DIRTY value`); not used further ([`fem_elastic/fsurf2vol.cpp:954-958`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L954-L958)). Help says "between 0 and 1". |
| `-spacing_x`<br>`-spacing_y`<br>`-spacing_z` | scalar | n/a | Listed in `-help` ([`fem_elastic/fsurf2vol.cpp:1516-1518`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1516-L1518)) but **never read** by `parse()`; ignored. |

**Solver and PETSc options**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-ksp_type`<br>`-pc_type`<br>`-ksp_rtol`<br>`-ksp_atol`<br>`-ksp_max_it`<br>`-ksp_monitor`<br>`-ksp_view`<br>`-ksp_converged_reason`<br>other `-ksp_*` / `-pc_*` | PETSc | relative tolerance 1e-9, other PETSc 2.3.3 defaults | Applied to the main per-step solve through `KSPSetFromOptions` ([`fem_elastic/solver.h:363-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L363-L389)). The code sets `rtol=1e-9` first ([`fem_elastic/solver.h:371-374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L371-L374)) so `-ksp_rtol` overrides it. The solver always prints the KSP summary ([`fem_elastic/solver.h:392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L392)), so `-ksp_view` produces a second copy. |
| `-init_guess_nonzero` | flag | off | Start the Krylov iteration from the load vector instead of zero ([`fem_elastic/solver.h:350-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L350-L377)). |
| `-fem_print` | file | none | Dump the stiffness matrix (PETSc binary) to the given file and `final_stif.bin` in the CWD ([`fem_elastic/solver.h:311-337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L311-L337)). |
| `-direct_ksp_*`<br>`-direct_pc_*` | PETSc | CG + Jacobi | Solver used by *both* topology solvers on their cropped sub-problems (options prefix `direct_`, [`fem_elastic/solver.h:1261-1272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L1261-L1272)). The plain `-ksp_*`/`-pc_*` options do **not** reach these solves. |
| `-mat_*` | PETSc | | The stiffness matrix is created as `MatCreateSeqAIJ` followed by `MatSetFromOptions` ([`fem_elastic/solver.h:656-661`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L656-L661)). |
| `-help` | flag | | Handled by PETSc (banner) and by `parse()`, which calls `help_exit()` ([`fem_elastic/fsurf2vol.cpp:1255-1260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1255-L1260)). Exit status is 1. |
| `-options_left`, `-log_summary`, `-malloc_*`, `-on_error_*`, ... | PETSc | | Generic PETSc options (listed by `surf2vol -help`). |

### Help Text vs. Parsed Options

The usage text and the options actually read disagree ([`fem_elastic/fsurf2vol.cpp:1500-1525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1500-L1525) vs [`fem_elastic/fsurf2vol.cpp:1246-1496`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1246-L1496)).

> [!contradiction] `-spacing_x`, `-spacing_y`, `-spacing_z`
> Documented in `-help` but never parsed; they have no effect.

> [!contradiction] Options read by the code but absent from `-help`
> `-aseg`, `-gcam`, `-compress`, `-fem_steps`, `-fem_end_step`, `-elt_vol`, `-elt_vol_range`, `-young`, `-topology_old`, `-use_pial_for_surf`, `-surf_subsample`, `-penalty_weight`, `-lin_res`, `-init_guess_nonzero`, `-fem_print`, `-direct_ksp_*` are not mentioned in the usage text.

> [!contradiction] Documented options that do nothing
> `-out_field`, `-out_surf` ("will be appended _<surf index>.white"), `-out_surf_affine` and `-dirty` ("between 0 and 1") are described in `-help` but produce no output or have no effect (see Outputs). `-poisson <double> (must be <0.5)` is not validated. `-out_mesh <file name>` actually writes `<name>.tm3d` (suffix appended) and `-dbg_output` writes `<root>_<step>.tm3d`, not "a morph file" with the given name. The `-aparc` line is truncated in the source ("numbering starts at secon", [`fem_elastic/fsurf2vol.cpp:1505`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1505)). `-help` also exits with status 1.

> [!contradiction] "Least-squares rigid registration"
> See the callout in Mathematical Foundations: the code fits a 12-DOF affine by minimising mean unsquared distance.

### Configuration Interactions

**`-fem_steps` x `-fem_end_step` x `-elt_vol` / `-elt_vol_range` give the per-step schedule.**
The set of executed steps is $s=N,N-1,\dots,\text{end}+1$. With defaults (`end=-1`) that is $N+1$ solves, where the last two (steps 1 and 0) both use divisor 1 and the same element volume $V_{\min}$ (e.g. `-fem_steps 2` ran steps 2, 1, 0 in the test run). With `-fem_end_step 0` there are $N$ solves. With `-fem_end_step` $\ge$ `-fem_steps` there are none: the transform stays the identity (`gmp::IdentityTransform3d`, [`fem_elastic/fsurf2vol.cpp:472`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L472)) and `-out` equals the affine-only result (verified: `-out` and `-out_affine` were the same size and all 16,777,216 voxels valid). The element volume starts at $V_{\max}$ (coarse mesh) and decreases linearly to $V_{\min}$ (fine mesh) at step 1; see equation 5. Each step builds and solves a new mesh, so the work grows with $N$ and with $1/V_{\min}$: in a one-hemisphere test run at $V=5$ the mesh had 467,353 nodes (1.4 million equations), took about 10 s to tetrahedralise and about 3.3 GB resident memory.

> [!gotcha] `-elt_vol_range` silently beats `-elt_vol`, and a third value is "discarded" yet still half-used
> `-elt_vol` is parsed first and sets both bounds; `-elt_vol_range` is parsed afterwards and overwrites them regardless of the order on the command line ([`fem_elastic/fsurf2vol.cpp:1413-1438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1413-L1438)). The default range (2, 21) applies when neither is given. If three or more numbers are supplied the program prints "Element value range contains more than 2 elts - discarding..." but then still uses the first two values (verified: `-elt_vol 300 -elt_vol_range 1,2,3` produced a mesh with element volume 1, 14.5 million tetrahedra). A single number exits with status 1. A reversed range (min > max) is not rejected and degenerates to constant $V_{\min}$ because of the clamp in the schedule.

> [!gotcha] Single-step schedule
> With `-fem_steps 1` the schedule formula divides by zero (see equation 5); in floating point both executed steps (1 and 0) then use $V_{\min}$. Verified: `-fem_steps 1 -elt_vol_range 1,2` logged `elt_vol= 1`. With the defaults (2, 21) a single-step run therefore uses element volume 2, and the upper bound of `-elt_vol_range` is never used.

**`-cache_transform` reuse semantics.**
- File absent, unreadable, or with fewer than 12 numbers: `read_transform` returns NULL, a message "reading transform failed -> applying Powell" is printed, Powell runs, and the result is **written** to the file ([`fem_elastic/fsurf2vol.cpp:358-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L358-L366), [`fem_elastic/transformUtils.cpp:8-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L8-L33)). A malformed existing file is therefore overwritten.
- File present and parseable: Powell is **skipped entirely** (and `-lin_res` has no effect); the 12 numbers are used as-is. The message "done with Powell" is printed in both cases ([`fem_elastic/fsurf2vol.cpp:371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L371)).
- Without `-cache_transform` Powell always runs and nothing is written ([`fem_elastic/fsurf2vol.cpp:349-353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L349-L353)).

> [!gotcha] Stale cache
> The cache stores only the 12 numbers, in moving-voxel to fixed-voxel coordinates. Nothing records which surfaces or volumes produced it, so a file left from a different subject, template, volume geometry or surface pair is read and used without any warning. `mri_cvs_register` always passes `$outdir/transform.txt` ([`mri_cvs_register/mri_cvs_register:402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L402), [`mri_cvs_register/mri_cvs_register:429`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L429)) and the script contains no line that deletes it, not even for `--cleanelreg`; the file name does not contain the hemisphere, so two single-hemisphere runs that share an output directory share the cache. The file is written with the default stream precision (6 significant digits), so the run that creates it uses the full-precision float transform while later runs that read it use the rounded one.

**`-compress`.**
- Without it, every step keeps its tetrahedral mesh in the transform chain (`FemTransform3d`); the final resampling and the saved `.tm3d` evaluate/store all meshes, and evaluating a point costs one mesh lookup per step.
- With it, after each step the mesh transform is sampled at every integer voxel of a **hard-coded 256 x 256 x 256 grid** into a float 3-frame displacement field plus a validity mask ([`fem_elastic/morph.cpp:604-653`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L604-L653)); the mesh is then released and later evaluation is trilinear interpolation of the field ([`fem_elastic/morph.cpp:415-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L415-L442)). Each such field is about 201 MB uncompressed (256^3 x 3 x 4 bytes) plus a 16.8 MB mask, and one is kept per step in the chain, so peak memory scales with `-fem_steps` (arithmetic from the code, not measured). Points in tangled tetrahedra or outside the mesh become masked invalid voxels. In the saved `-out_mesh`/`-dbg_output` file the transforms are then dense fields rather than meshes.
- The grid is not related to the size of the fixed volume: a fixed volume that is not 256 voxels wide is still sampled over 0..255.

**Topology solvers: `-topology_old` selects between two implementations.**
Both are called only if some tetrahedron is flipped after the solve ([`fem_elastic/fsurf2vol.cpp:519-566`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L519-L566)) and both are invoked with neighbourhood radius 3.
- **Default (`TopologySolver`, `pbCluster_mesh_crop.cpp`)**: builds a breadth-first cluster of radius 3 around every flipped tetrahedron, merges clusters that intersect, crops one sub-mesh per cluster, fixes its boundary nodes at their current displacements and re-solves the local elasticity problem with the `TDirectSolver` (CG + Jacobi) ([`fem_elastic/pbCluster_mesh_crop.cpp:81-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.cpp#L81-L90), [`fem_elastic/pbCluster_mesh_crop.cpp:104-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.cpp#L104-L134), [`fem_elastic/pbCluster_mesh_crop.cpp:193-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.cpp#L193-L229), [`fem_elastic/pbCluster_mesh_crop.cpp:232-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.cpp#L232-L292)). It is called as `TopologySolver(*pmesh, 3)` and so uses the constructor's default material constants $E=1.0$, $\nu=0.3$ ([`fem_elastic/pbCluster_mesh_crop.h:22-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.h#L22-L23)), **not** the values of `-young`/`-poisson`.
- **`-topology_old` (`solve_topology_problems`, `untangler.cpp`)**: repeatedly crops the neighbourhood of the first remaining flipped tetrahedron, solves a local problem with the same `TDirectSolver`, removes the tetrahedra that are no longer flipped from the work list, and finally reports whether new flips appeared ([`fem_elastic/untangler.cpp:21-205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/untangler.cpp#L21-L205)). It reads $E,\nu$ from the mesh's material ([`fem_elastic/untangler.cpp:57-64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/untangler.cpp#L57-L64)), i.e. it **does** use `-young`/`-poisson`.
- `mri_cvs_register` passes `-topology_old`, and its comment states "newtopology option should not be used" ([`mri_cvs_register/mri_cvs_register:386`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L386)). Without the flag the new solver runs, so a hand-written command that omits `-topology_old` does not reproduce the CVS behaviour.
- Neither solver re-solves the global system; both only overwrite node displacements.

**Order of operations inside a step** ([`fem_elastic/fsurf2vol.cpp:507-637`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L507-L637)): solve; print boundary-condition error (before any repair); update the mesher point list through the new mesh; test for flipped tetrahedra and run the topology solver; compress (optional); advance the boundary-condition "from" positions through the step's final transform; save the debug morph (optional); print FEM error against the initial container.

**Aparc exclusion, `-aparc_N` and the surface lists.** Annotation exclusion only sets `ripflag` on the **fixed** surfaces ([`fem_elastic/fsurf2vol.cpp:1558-1567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1558-L1567)). Flagged fixed vertices are skipped when building the boundary-condition container ([`fem_elastic/fsurf2vol.cpp:983-987`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L983-L987)) and the mesher point list ([`fem_elastic/fsurf2vol.cpp:1039`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1039)). The linear Powell fit instead tests the flag on the moving-surface vertex ([`fem_elastic/fsurf2vol.cpp:916-917`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L916-L917)). The program logs `create BC container - ripCounter = <n>` per surface pair; in the `cvs_avg35` test runs this counter was 0 for both surfaces. The canonical call passes the white-surface annotation (`lh.aparc.annot`) for the pial surface as well (`-aparc_2`, `-aparc_3`, `-aparc_4`).

**`-use_pial_for_surf` and `-surf_subsample` control the mesher point list.** The "surface container" decides which vertices TetGen must respect in addition to the box corners. A surface contributes vertices only when it is **not** of type `pial` **and** `-use_pial_for_surf` was given ([`fem_elastic/fsurf2vol.cpp:1022`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1022)); the in-code comment above the function says "will only use the white surface, if available" ([`fem_elastic/fsurf2vol.cpp:179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L179)). Observed run-time effect (cvs_avg35, `lh.white` + `lh.pial`): without the flag the log reports `srcPoints size = 0` and TetGen meshes only the 8 box corners (`Input points: 8`) so mesh density is controlled purely by the element volume; with `-use_pial_for_surf` the log reports `srcPoints size = 139336` (all non-flagged `lh.white` vertices), and with `-surf_subsample 1` added `srcPoints size = 9101`. `-surf_subsample` has an effect only on a surface that passes the condition above; its numeric value is not used beyond `> 0`. The points are advanced through each new mesh after every step ([`fem_elastic/fsurf2vol.cpp:1070-1079`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1070-L1079)). The boundary-condition list always contains **all** non-flagged vertices of **all** surfaces ([`fem_elastic/fsurf2vol.cpp:947-1006`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L947-L1006)), independent of these two flags; its subsampling hook is disabled ("don't subsample the BC container", [`fem_elastic/fsurf2vol.cpp:988-991`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L988-L991)).

**`-penalty_weight`, `-young`, `-poisson`, `-ksp_*`, `-fem_steps`.** The elasticity stiffness scales with `-young` and the constraints with `-penalty_weight`; only their ratio and $\nu$ shape the field (script comment: ratio near 1 gives good alignment with some artefacts, a very small ratio leaves the volume almost purely affinely transformed). Because `-ksp_type preonly -pc_type jacobi` does not converge the linear system (equation 7 callout), the effective stiffness of the diffusion also depends on `-fem_steps`: the script notes that a single step gives a fragmented result and that values above about 75 fail ([`mri_cvs_register/mri_cvs_register:380-382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L380-L382); script author's remark, not verified here).

> [!gotcha] PETSc defaults are not safe in this build
> The program does not choose a solver itself. In test runs on this 8.2.0 installation (PETSc 2.3.3-p13) the **default** solver settings, and an explicit `-pc_type ilu`, terminated with `Caught signal number 11 SEGV` and exit status 59 right after the penalty load was assembled, even for a small mesh (48,765 tetrahedra); `-pc_type jacobi` (default GMRES), `-ksp_type cg -pc_type jacobi`, `-ksp_type gmres -pc_type none` and the canonical `-ksp_type preonly -pc_type jacobi` all ran to completion. Always pass an explicit `-pc_type`/`-ksp_type` as `mri_cvs_register` does.

> [!gotcha] `-fem_print` aborts the run
> In a test run with `-fem_print stif.bin` the first matrix dump (`stif.bin`, 14 MB) was written and the second one (`final_stif.bin`, 0 bytes) crashed in `MatView` with SIGSEGV (exit status 59). Do not use this option in a real run.

## Typical Use Cases

### Use Case 1: Canonical CVS call, single hemisphere (as issued by `mri_cvs_register`)

The `--hemi lh|rh` branch of Step 2 ([`mri_cvs_register/mri_cvs_register:417-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L417-L436)); `$tmri`, `$tsurf`, `$tlabel` are the template's `mri/`, `surf/`, `label/` directories, `$mmri` is the moving subject's `mri/`, `$outdir` the CVS output directory and `<tpl>` the template id:

```bash
# the option block is the script's $elasticoptions, expanded inline
surf2vol -fixed_mri $tmri/norm.mgz -moving_mri $mmri/norm.mgz \
  -fixed_surf   $tsurf/lh.white  -moving_surf   $outdir/lh.resample.white \
  -fixed_surf_2 $tsurf/lh.pial   -moving_surf_2 $outdir/lh.resample.pial \
  -aparc   $tlabel/lh.aparc.annot -aparc_2 $tlabel/lh.aparc.annot \
  -lin_res 20 -ksp_rtol 1.0e-9 -penalty_weight 1000 -fem_steps 17 \
  -elt_vol_range 5.0,10.0 -topology_old -compress \
  -pc_type jacobi -ksp_type preonly -ksp_view -ksp_converged_reason \
  -poisson .3 -young 1000 \
  -cache_transform $outdir/transform.txt \
  -out $outdir/el_reg_to<tpl>.mgz \
  -out_mesh $outdir/el_reg_to<tpl> \
  -out_affine $outdir/el_reg_to<tpl>.affine.mgz
```

Effect: Powell affine on every 20th vertex (cached in `transform.txt`), then 18 FEM solves ($s=17,\dots,0$) with element volume falling from 10 to 5, penalty weight 1000 with $E=1000$, $\nu=0.3$, compressed per-step fields, the old topology solver, writes `el_reg_to<tpl>.tm3d`, the warped and the affine-only volumes, plus `?h.dbg_surf.white/pial` in the CWD. The script then runs `exportGcam --fixed $tmri/norm.mgz --moving $regmoving --morph $outdir/el_reg_to<tpl>.tm3d --out_gcam $outdir/el_reg_to<tpl>.m3z` ([`mri_cvs_register/mri_cvs_register:438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L438)); `-gcam` is *not* used. `$regmoving` is `$mmri/norm.mgz` (shown above as `-moving_mri`) unless `--maskmovinghemi` is set, in which case it is a hemisphere-masked NIfTI ([`mri_cvs_register/mri_cvs_register:419-423`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L419-L423)).

### Use Case 2: Canonical CVS call, both hemispheres

Same options, but four surface pairs ([`mri_cvs_register/mri_cvs_register:393-403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L393-L403)):

```bash
surf2vol -fixed_mri $tmri/norm.mgz -moving_mri $mmri/norm.mgz \
  -fixed_surf   $tsurf/lh.white -moving_surf   $outdir/lh.resample.white \
  -fixed_surf_2 $tsurf/rh.white -moving_surf_2 $outdir/rh.resample.white \
  -fixed_surf_3 $tsurf/lh.pial  -moving_surf_3 $outdir/lh.resample.pial \
  -fixed_surf_4 $tsurf/rh.pial  -moving_surf_4 $outdir/rh.resample.pial \
  -aparc   $tlabel/lh.aparc.annot -aparc_2 $tlabel/rh.aparc.annot \
  -aparc_3 $tlabel/lh.aparc.annot -aparc_4 $tlabel/rh.aparc.annot \
  <elasticoptions as above> -cache_transform $outdir/transform.txt \
  -out $outdir/el_reg_to<tpl>.mgz -out_mesh $outdir/el_reg_to<tpl> \
  -out_affine $outdir/el_reg_to<tpl>.affine.mgz
```

Powell and the bounding box now use all four surfaces; the four `*.dbg_surf.*` files are written to the CWD.

### Use Case 3: Affine-only smoke test

```bash
# no FEM solves; 'out.mgz' == 'aff.mgz' (moving volume under the Powell/cached affine)
surf2vol -fixed_mri fixed/norm.mgz -moving_mri moving/norm.mgz \
  -fixed_surf fixed/lh.white -moving_surf moving/lh.resample.white \
  -cache_transform tf.txt -lin_res 100 -fem_steps 1 -fem_end_step 1 \
  -out out.mgz -out_affine aff.mgz
```

Run from a scratch directory (the debug surfaces are written to the CWD). Verified on `cvs_avg35` against itself: Powell energy 0 before and after, `tf.txt` contains `1 0 0 0 1 0 0 0 1 0 0 0`.

### Use Case 4: Reuse a transform and keep per-step morphs

```bash
surf2vol <inputs as in Use Case 1> -cache_transform tf.txt -dbg_output dbg \
  -fem_steps 4 -elt_vol 8 -pc_type jacobi -ksp_type preonly -penalty_weight 1000 -young 1000 \
  -out_mesh final
# writes dbg_4.tm3d ... dbg_0.tm3d and final.tm3d; delete tf.txt if the inputs change
```

## Pipeline Context

Step 2 of [[mri_cvs_register]] (not part of `recon-all`):

**Predecessor:** [[mris_register]] (spherical CVS registration, `?h.cvs.to<tpl>.sphere.reg`) and [[mris_resample]] (`?h.resample.white/pial`, [`mri_cvs_register/mri_cvs_register:295-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L295-L309)) → **`surf2vol`** → **Successor:** [[exportGcam]] (turns `el_reg_to<tpl>.tm3d` into `el_reg_to<tpl>.m3z`), after which Step 3 applies the `.m3z` with `mri_vol2vol` ([`mri_cvs_register/mri_cvs_register:482-484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L482-L484)), refines it with `mri_nl_align` and composes the results with [[mri_concatenate_gcam]]. The script skips Step 2 when `el_reg_to<tpl>.tm3d` exists unless `--cleanelreg` is given ([`mri_cvs_register/mri_cvs_register:388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L388)); the `surf2vol` volume outputs (`-out`, `-out_affine`) are not the inputs of Step 3 (it re-derives the volume from the `.m3z`, [`mri_cvs_register/mri_cvs_register:482-484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L482-L484)), though the script removes `el_reg_to<tpl>*.mgz` during cleanup ([`mri_cvs_register/mri_cvs_register:827`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L827)).

## Gotchas and Caveats

> [!gotcha] The output is zero outside a box that is anchored at voxel 256
> The FEM domain is $[\max(b_{\min}-20,0),\,256]$ per axis. Fixed-grid voxels outside it are not covered by any tetrahedron, so they are left at 0 in `-out` and are marked invalid in the exported `.m3z` (`-out_affine` is not affected, because it uses only the affine). The upper bound 256 is a constant, not derived from the fixed volume's size ([`fem_elastic/fsurf2vol.cpp:398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L398)); the lower side is derived from the fixed surfaces, so a single-hemisphere run covers only that hemisphere's side of the volume plus a 20-voxel margin on the low side. (With `-fem_end_step >= -fem_steps` there is no mesh and the whole grid is valid.)

> [!gotcha] Failures inside the main try-block still exit with status 0
> Exceptions thrown while building or applying the morph (`const char*` or `std::exception`) are caught, printed to stdout (` caught const char exception`, ` Master-net caught exception`), and the program then finalises PETSc and returns 0 ([`fem_elastic/fsurf2vol.cpp:752-772`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L752-L772)). The `if($status) exit 1` checks in `mri_cvs_register` therefore cannot catch them; check that `-out` and the `.tm3d` exist. Failures to write the `-out_mesh` or `-out_affine` file are likewise only reported on stderr ([`fem_elastic/fsurf2vol.cpp:688-692`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L688-L692), [`fem_elastic/fsurf2vol.cpp:744-748`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L744-L748)). Fatal PETSc errors (see the SIGSEGV cases above) do give a non-zero status.

> [!gotcha] The `-gcam` output recomputes the whole resampling
> `-gcam` runs `exportGcam(mri_moving, FALSE, 0)` after `-out` has been written ([`fem_elastic/fsurf2vol.cpp:658-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L658-L662)); because the first resampling does not cache the displacement field (`cacheField=false`, [`fem_elastic/morph.h:352-354`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L352-L354)) a second full pass over the 256^3 grid is made ("no mriCache - this will take some time", [`fem_elastic/morph.cpp:1500-1509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1500-L1509)). A disabled earlier copy of this code block (`if (0)`, [`fem_elastic/fsurf2vol.cpp:695-726`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L695-L726)) is annotated "there is a bug in this". The CVS pipeline avoids `-gcam` and runs [[exportGcam]] on the `.tm3d` instead.

> [!gotcha] Log lines that print uninitialised-looking numbers
> The lines `dcds mesh direct image`, `dir img for computed transform` and `dcds total image for source point` track a probe point taken as the **101st entry** of the initial mesher point list ([`fem_elastic/fsurf2vol.cpp:457-464`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L457-L464)). The loop that advances to that entry does not check the list length, so when the list is empty (the default, see above) these lines show denormal garbage such as `6.95307e-310`. They are diagnostics only and do not influence the result, but they should not be interpreted.

> [!gotcha] Surface defect check only prints
> After the linear step `check_surface_defects` recomputes face areas on every fixed/moving pair and prints `found defect for face <n>` when the two areas have opposite sign ([`fem_elastic/fsurf2vol.cpp:1912-1939`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1912-L1939)). It has no further effect.

> [!gotcha] Memory and run time
> In the one-hemisphere test run at $V=5$ the process reached about 3.3 GB resident memory (peak virtual size about 9 GB) and TetGen alone took about 10 s per step; matrix assembly and the solve come on top, and the canonical call repeats this for 18 steps (the existing [[mri_cvs_register]] page quotes 6 to 24 hours for the whole CVS pipeline). The `TSolver` uses PETSc `MatCreateSeqAIJ` with 100 preallocated entries per row ([`fem_elastic/solver.h:656-658`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L656-L658)) and a single MPI process.

## Error Compensation and Guard Rails

- **Missing/failed linear-transform cache:** a missing or truncated `-cache_transform` file silently falls back to Powell and is then (re)written ([`fem_elastic/fsurf2vol.cpp:358-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L358-L366)).
- **Degenerate affine:** a near-singular cached or fitted linear part ($|\det|<10^{-5}$) aborts with `inv_transform -> null det` ([`fem_elastic/transformUtils.cpp:62-66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L62-L66)).
- **Positive-definiteness:** the eight box-corner pins make the matrix invertible even if no constraint touches part of the mesh ([`fem_elastic/fsurf2vol.cpp:805-817`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L805-L817)).
- **Constraint thinning:** the mean-field selection keeps one constraint per tetrahedron ([`fem_elastic/solver.h:594-639`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/solver.h#L594-L639)); in the cvs_avg35 test run only 72,434 constraints were active at $V=10$ and 111,230 at $V=5$ (the log line `Active BCs`) out of 278,680 `Total BCs`, so a finer mesh uses more of the supplied correspondences.
- **Anatomically implausible vertices:** annotation `unknown` and `corpuscallosum` labels are excluded from the constraints because they are not trustworthy correspondences; `bankssts` and `frontalpole` are intentionally kept ([`fem_elastic/fsurf2vol.cpp:1540-1547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1540-L1547)).
- **Tangled elements:** flipped tetrahedra are detected after every step and locally smoothed (two alternative solvers, above); points that still fall into a flipped tetrahedron are marked invalid rather than mapped ([`fem_elastic/mesh.h:1249-1250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L1249-L1250)), and the exported `.m3z` records them as `GCAM_POSITION_INVALID`.
- **Moving-volume bounds:** output voxels whose sampling position falls outside the moving volume are left at 0 ([`fem_elastic/morph.cpp:846-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L848)).
- **Not compensated:** unequal numbers of surfaces or vertices are fatal; there is no check that the moving surface vertices actually correspond to the fixed ones, and no check that `-moving_mri` and the moving surfaces belong to the same subject.


## Known Bugs

Defects found in the 2026-10-19 source audit of `fem_elastic/` (v8.2.0), most severe first:

- [[00195]] — severity 4: surf2vol — -aparc medial-wall exclusion is a no-op: FS≥5 annotation-0 vertices match no colour-table index, ripCounter=0, ~33k medial-wall BCs drive every mri_cvs_register elastic stage
- [[00199]] — severity 4: surf2vol — FEM core Element3d caches node-displacement interpolation once and never invalidates it, so untangling edits are ignored for already-queried elements (CVS default path)
- [[00200]] — severity 4: mri_cvs_register/surf2vol — preonly+jacobi applies one diagonal scaling per step; deep WM moved 0.008 of 3 vox in test; CG until 2011-10 (3916ce1fbc); intent a [!gap]
- [[00197]] — severity 3: surf2vol — create_surf_container uses OR where AND is intended: srcPoints=0 on the CVS default path, -use_pial_for_surf never uses pial, -surf_subsample value ignored, UB debug iterator
- [[00198]] — severity 3: surf2vol — update_sources ignores std::remove_if result on a std::list; invalid points stay (duplicates/garbage into TetGen); only with -use_pial_for_surf
- [[00201]] — severity 3: surf2vol — -compress delta grid and FEM box hard-coded to 256³: fixed volumes >256 voxels get zeros/invalid GCAM beyond index 255 (default 256³ templates unaffected)
- [[00202]] — severity 3: surf2vol — -dbg_output: VolumeMorph::save() cuts the shared transform chain, so final -out/-out_mesh/-gcam hold only the last FEM step
- [[00203]] — severity 3: mri_cvs_register — affine cache transform.txt has no key and is never deleted; reruns, other hemisphere/template or --clean* silently reuse a stale affine
- [[00206]] — severity 3: applyMorph — CMesh3d copy ctor shallow-copies the Octree; FemTransform3d::invert double-frees the root on point_list/tract_point_list of a FEM-mesh morph (harness SIGSEGV); m_poctree left uninitialised
- [[00207]] — severity 3: surf2vol — Element3d stiffness omits the V_e factor (commented out since 2008): K ∝ 1/h² not h; developer intent unknown, CVS parameters were tuned empirically
- [[00213]] — severity 3: applyMorph/morph lib — DeltaTransform3d::invert negates only frame 0 (x); point lists through `field` (surf2vol -compress) morphs get inverted x, forward y,z
- [[00222]] — severity 3: surf2vol — new topology solver (no -topology_old): MergeIntersectingClusters accumulates from an empty vector, dropping *it ({1..5}+{5..9} gives {5..9}); folds left silently
- [[00223]] — severity 3: surf2vol/mri_cvs_register — old untangler crop 'bfs' is a DFS with global visited flags; radius-3 patches keep 782–884 of 1007 elements (harness), radius 4 loses 34–44%; CVS default path
- [[00196]] — severity 2: surf2vol — powell_lin tests ripflag on the moving surface (never annotated) instead of the fixed one; latent behind 00195, medial wall would still enter the affine fit
- [[00204]] — severity 2: surf2vol/createMorph — read_transform accepts an 11-number (or non-numeric 12th token) affine file; z translation silently 0
- [[00205]] — severity 2: surf2vol — failed writes, caught exceptions and PETSc option-parse errors all exit 0 (mri_cvs_register cannot detect them); parse() result ignored, compress uninitialised
- [[00208]] — severity 2: surf2vol — new[]/delete mismatch in SmallMatrix::inplace_transpose (per active MFC per FEM step) and ZlibStringCompressor::setBufferSize; UB, benign on glibc, Valgrind-confirmed; dangling m_buffer
- [[00209]] — severity 2: surf2vol / exportGcam / createMorph — leaks: comm_solution overwrites its new[] with VecGetArray, setup_load_sym frees nothing, ZlibStringCompressor has no destructor (peak-memory inflation)
- [[00217]] — severity 2: surf2vol/exportGcam/applyMorph — DeltaTransform3d samples validity mask trilinearly (comment says nearest); 1-voxel boundary rim accepted with damped displacement
- [[00224]] — severity 2: surf2vol — TMesh::dir_img never reads signalTopology; inverted elements always invalidate points (mask 0 in convert_to_delta), contradicting the header contract; intent open
- [[00210]] — severity 1: surf2vol — Material3d::get_matrix omits m(2,1)=dnu (D asymmetric: D(1,2)=576.9, D(2,1)=0); dead code, Element3d::get_matrix computes terms inline
- [[00225]] — severity 1: surf2vol — TMeshCrop::PopulateNodes/Crop create one node per element incidence (~20x orphans) in the new topology solver; memory/time only, not on the CVS path

## Related Tools

- [[mri_cvs_register]] — the only caller; supplies the surfaces and the canonical option set (Step 2 of CVS).
- [[exportGcam]] — converts the `.tm3d` written by `-out_mesh` to `.m3z`.
- [[createMorph]], [[applyMorph]] — sibling `fem_elastic` tools that create and apply `.tm3d` morphs.
- [[mris_register]], [[mris_resample]] — produce the one-to-one vertex correspondence that `surf2vol` needs.
- [[mri_concatenate_gcam]] — composes the elastic `.m3z` with the intensity-based morph in Step 3.
- [[mri_surf2vol]] — unrelated despite the similar name (paints surface data into a volume); not the same executable.

## Confidence and Gaps

Confidence is **medium**: the control flow, the file outputs and the option semantics were established from the source and confirmed by test runs of the installed 8.2.0 binary on `cvs_avg35` (fixed = moving, identity affine, left hemisphere only), but several numerical behaviours were not exercised on a real inter-subject pair.

> [!gap] Numerical scheme of the canonical solve
> The canonical `-ksp_type preonly -pc_type jacobi` applies Jacobi once per step instead of solving the system. Neither the code nor the script comments say whether this is intended as a diffusion scheme or a workaround; the effect of `-fem_steps` on the result therefore cannot be derived from the elasticity equations alone. Tested with non-zero displacements on 2026-10-19 (lh.white rigidly shifted 3 mm, one step): under `preonly`/`jacobi` white matter ≥10 voxels from the surface moved 0.008 voxels on average, against 3.000 with `-ksp_type cg`. The option string was switched from (effectively) CG + Jacobi to `preonly` in commit `3916ce1fbc` (2011-10-20) together with the `-young`/`-poisson` values, with no recorded reason. See [[00200]].

> [!gap] Default PETSc solver crashes
> With the default KSP/PC (and with `-pc_type ilu`) the installed binary died with SIGSEGV in all attempts. It is not known whether this depends on the build, the matrix pre-allocation (100 entries per row) or the zero-displacement test data.

> [!gap] `-fem_print` crash
> The second `MatView` call (`final_stif.bin`) aborted in the test; cause not investigated.

> [!gap] Hard-coded constants
> The origin of the 20-voxel low-side margin, the upper bound 256, the TetGen quality factor 1.414, the 3.5 subsampling distance, the topology radius 3 and the Powell restart threshold of 25.5 voxels is not documented in code or comments.

> [!gap] Direction conventions of `.tm3d` outside this program
> The pull-back direction was derived from `VolumeMorph::apply_transforms` and `image()`; the handling of the same file by [[applyMorph]] and [[exportGcam]] should be cross-checked on those pages.

> [!gap] No upstream documentation
> There is no `help.xml` or FreeSurfer wiki page for `surf2vol`; the methodology is not published under this name (see References).

## References

- Source (v8.2.0): `fem_elastic/fsurf2vol.cpp` and the files listed in the frontmatter, <https://github.com/freesurfer/freesurfer/tree/v8.2.0/fem_elastic>
- Caller: `mri_cvs_register/mri_cvs_register` ([`mri_cvs_register/mri_cvs_register:389-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L389-L436))
- Method context (CVS registration): Postelnicu G, Zollei L, Fischl B. Combined volumetric and surface registration. IEEE Trans Med Imaging 2009;28(4):508-522 (citation given from the agent's memory, not from a file in the source tree; verify before citing). The author header of the cluster-based topology solver names Gheorghe Postelnicu, 2007 ([`fem_elastic/pbCluster_mesh_crop.cpp:1-5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/pbCluster_mesh_crop.cpp#L1-L5)).
- Run-time evidence (this agent, FreeSurfer 8.2.0 installed binary, PETSc 2.3.3-p13, 2026-10-19): runs on `$FREESURFER_HOME/subjects/cvs_avg35` with fixed = moving, `lh.white` + `lh.pial`, identity cache transform.
