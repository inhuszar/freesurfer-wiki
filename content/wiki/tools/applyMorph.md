---
title: "applyMorph"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "fem_elastic/fapplyMorph.cpp"
  - "fem_elastic/applyMorph.help.xml"
  - "fem_elastic/morph.cpp"
  - "fem_elastic/morph.h"
  - "fem_elastic/morph_utils.cpp"
  - "fem_elastic/surf_utils.cpp"
  - "fem_elastic/ZlibStringCompressor.cpp"
families:
  - "fem_elastic"
recon_all_stage: null
related:
  - "[[createMorph]]"
  - "[[exportGcam]]"
  - "[[surf2vol]]"
  - "[[mri_cvs_register]]"
  - "[[mri_vol2vol]]"
  - "[[m3z-format]]"
  - "[[internal-gcamorph]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-10-19
gaps:
  - "Intended direction convention of the surf item (the inversion call is commented out in the source)"
  - "FEM-mesh (fem) and displacement-field (field) transforms were read from code only; the experiments used affine morphs"
  - "Legacy .nm3d format and morphs without stored volume geometry were not exercised with real-world files"
  - "Third operand of point_list / tract_point_list is parsed but never used"
tags:
  - transforms
  - morph
  - tm3d
  - fem
  - resampling
  - cvs
---

# applyMorph

## Summary

`applyMorph` applies a `.tm3d` volumetric morph (the transform container written by [[createMorph]] and [[surf2vol]]) to one or more data items in a single run. An item is a volume (resampled onto the grid of a template volume), a surface (vertices moved through the morph), a surface-to-surface displacement probe (a per-vertex curvature-format file holding a distance), or a point list (a text file of coordinates). A morph is a chain of affine, identity, displacement-field and finite-element-mesh transforms stored together with the geometries of the fixed (template) and moving (subject) volumes. The tool entered the source tree in 2008 (commit `4b881dc775`, "source for createMorph and applyMorph"), was used by the CVS pipeline ([[mri_cvs_register]]) and has since been replaced there by [[mri_vol2vol]] applied to an `.m3z` produced by [[exportGcam]].

## Source Information

- **Language:** C++
- **Source file(s):** `fem_elastic/fapplyMorph.cpp` (driver and filters), `fem_elastic/applyMorph.help.xml` (help text), `fem_elastic/morph.cpp` / `fem_elastic/morph.h` (`gmp::VolumeMorph`, transform classes, `.tm3d` loader), `fem_elastic/morph_utils.cpp` (`initOctree`), `fem_elastic/surf_utils.cpp` (surface RAS <-> voxel conversion), `fem_elastic/ZlibStringCompressor.cpp` (inflates the transform records)
- **Binary/script location:** `$FREESURFER_HOME/bin/applyMorph`
- **Build condition:** the executable is only built when PETSc is found ([`fem_elastic/CMakeLists.txt:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L3), target at [`fem_elastic/CMakeLists.txt:30-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L30-L34)).
- **Help:** `applyMorph --help` (and running it with no arguments) prints the text of `applyMorph.help.xml`; the installed 8.2.0 output was compared with the XML and is identical.

## Purpose and Context

The FEM-based elastic registration in `fem_elastic` ([[surf2vol]]) solves for a deformation of a tetrahedral mesh that aligns a subject's cortical surfaces (and their volumetric surroundings) with a template. The result is stored as a `.tm3d` file. `applyMorph` is the original consumer of that file: it resamples subject volumes into template space and can move surfaces and point sets through the same morph. Its siblings are [[createMorph]] (assembles a `.tm3d` from affine/field/mesh/GCAM components) and [[exportGcam]] (converts a `.tm3d` into an FreeSurfer `.m3z` GCAM so that standard tools such as [[mri_vol2vol]] can use it).

Historical relationship with [[mri_cvs_register]] (git history of the 8.2.0 source tree):

- Until 2024-03-15 (commit `23917e48df`, "replaced tm3d usage in cvs_register with m3z") `mri_cvs_register` step 3 applied the elastic morph to the aseg with `applyMorph --template <tmpl>/aseg.mgz --transform el_reg_to<template>.tm3d vol <moving aseg> <out> nearest`.
- The script header carries the line "Edited : 03-17-2011: replaces applyMorph with mri_vol2vol" ([`mri_cvs_register/mri_cvs_register:12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L12)). The 2011 commit (`67f303f52e`) replaced `applyMorph` only for the application of the *combined* elastic-plus-volumetric morph (already an `.m3z`); the first application, of the raw `.tm3d`, kept using `applyMorph` until 2024.
- In the 8.2.0 script the `applyMorph` call survives only as commented-out lines ([`mri_cvs_register/mri_cvs_register:472-475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L472-L475), annotated "0313/2024: changing to use m3z all the way through"); the active replacement is `mri_vol2vol --targ ... --m3z el_reg_to<template>.m3z --noDefM3zPath --mov ... --interp nearest --no-save-reg` ([`mri_cvs_register/mri_cvs_register:482-484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L482-L484)), with the `.m3z` produced by `exportGcam` ([`mri_cvs_register/mri_cvs_register:411`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L411)). `applyMorph` is still listed in the `see-also` of the script's help ([`mri_cvs_register/mri_cvs_register.help.xml:221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register.help.xml#L221)).

Outside `mri_cvs_register`, no other script in the 8.2.0 source tree invokes `applyMorph`.

## Inputs

### Required Inputs

| Input | Meaning | Format |
|-------|---------|--------|
| `--template FILE` | Template (fixed-space) volume. Read with `MRIread`, so any volume format FreeSurfer reads works ([[mgz]], [[nifti]]). Only its geometry is used (output grid for volumes, output frame for surfaces). | volume |
| `--transform FILE` | The morph. Must have a file extension. `.nm3d` selects the legacy loader; any other extension is read as the tagged format (normally `.tm3d`). | `.tm3d` / `.nm3d` |
| `inputs ...` | One or more *data items*, each introduced by a keyword (`vol`, `surf`, `sprobe`, `snormals`, `point_list`, `tract_point_list`). See [Data-item grammar](#data-item-grammar). | see below |

`--template` is mandatory even when only surface or point-list items are given, because it is read unconditionally at start-up ([`fem_elastic/fapplyMorph.cpp:161-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L161-L171)).

### Input Assumptions

> [!assumption] The `.tm3d` carries its own geometries
> A `.tm3d` stores the volume geometry of the fixed and moving volumes (tags `tagVgFixed`, `tagVgMoving`, [`fem_elastic/morph.cpp:1385-1400`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1385-L1400)). `createMorph` fills them only when given `--template` / `--subject`; `surf2vol` fills them from its fixed/moving volumes. Transform coordinates are **voxel indices** of those two grids, not RAS ([`fem_elastic/morph.h:323-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L323-L327): "Applies the transforms in the INDEX space").

- **Volumes (`vol`)** may be any format `MRIread` handles, with any number of frames; geometry mismatches between the input and the moving volume of the morph are corrected through the RAS matrices ([`fem_elastic/morph.cpp:744-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L744-L758)).
- **Surfaces (`surf`)** are converted to voxel space with the *attached volume* operand (tkregister RAS), so the attached volume must have the geometry the surface was generated in, and that geometry is also assumed to equal the fixed-space geometry of the morph (no check is made, see [Configuration Interactions](#configuration-interactions)).
- **Probe items** require the template and subject surface to have the same number of vertices with index-for-index correspondence ([`fem_elastic/fapplyMorph.cpp:593-594`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L593-L594)).
- **Point lists** are plain text, three whitespace-separated numbers per line, interpreted directly as voxel indices (no RAS conversion), see the comment at [`fem_elastic/fapplyMorph.cpp:391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L391).

## Outputs

### Files Created

| Item | File written | Notes |
|------|--------------|-------|
| `vol` | the `<out>` operand, written by `MRIwrite` ([`fem_elastic/fapplyMorph.cpp:463-465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L463-L465)); format chosen from the extension | Same voxel data type and frame count as the input; grid = template grid |
| `surf` | the `<out>` operand, written by `MRISwrite` ([`fem_elastic/fapplyMorph.cpp:504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L504)) | See [[surface-format]]; volume geometry fields are copied from the template ([`fem_elastic/fapplyMorph.cpp:500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L500)) |
| `sprobe`, `snormals` | per-vertex scalar file, written by `MRISwriteCurvature` ([`fem_elastic/fapplyMorph.cpp:562-564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L562-L564), [`fem_elastic/fapplyMorph.cpp:662-664`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L662-L664)) | See [[curv-format]] and the file-naming gotcha below |
| `point_list`, `tract_point_list` | text file, one `x y z` line per input line ([`fem_elastic/fapplyMorph.cpp:719-734`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L719-L734)) | Points whose image is not valid are written as `10000 10000 10000` |

No other file is written (no log, no registration file, no cached displacement field: `apply_transforms` is called with `cacheField=false`, [`fem_elastic/fapplyMorph.cpp:458-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L458-L460)).

> [!gotcha] Probe output files get a hemisphere prefix and may land beside the input surface
> The scalar files of `sprobe`/`snormals` are written with `MRISwriteCurvature`, which inserts the hemisphere (`lh.`, `rh.`, `both.` or `unknown.`, taken from the *template* surface) in front of the file name unless the name already begins with `lh.` or `rh.` ([`utils/mrisurf_io.cpp:6690-6760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L6690-L6760)). If the `<out>` operand has no `/`, the file goes into the **directory of the input surface** rather than the current directory (unless `FS_POSIX` is set). Observed with the installed binary: `<out> = sprobe.curv` with `lh.white` from a subject's `surf/` directory wrote `surf/lh.sprobe.curv` next to `lh.white`; `<out> = /abs/dir/abs.curv` wrote `/abs/dir/lh.abs.curv`. Use an absolute output path with a name that already starts with `lh.`/`rh.` to control the location.

### Output Specifications

- **Volume:** dimensions, voxel size, direction cosines and `c_ras` come from the template ([`fem_elastic/fapplyMorph.cpp:454-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L454-L460), copy at [`utils/vol_geom.cpp:171-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/vol_geom.cpp#L171-L198)); the data type and number of frames are those of the *input* volume ([`fem_elastic/morph.cpp:699-717`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L699-L717)). The output is pre-filled with 0 ([`fem_elastic/morph.cpp:723`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L723)). Other header fields of the input (TR, TE, flip angle, ...) are not transferred by code.
- **Surface:** same vertex/face topology as the input; vertex coordinates replaced by the morphed positions (in surface RAS of the template geometry). Vertices whose image is invalid keep their original voxel position before the final re-conversion ([`fem_elastic/morph.cpp:1101-1104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1101-L1104)).
- **Probe files:** one float per vertex of the template surface (the `curv` field); value `-0.1` marks a vertex with no valid image ([`fem_elastic/fapplyMorph.cpp:549-550`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L549-L550)).
- **Point list:** same number of lines as the input file counted by newline ([`fem_elastic/fapplyMorph.cpp:685-691`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L685-L691)).

## Mathematical Foundations

Notation: $F$ and $M$ are the fixed and moving volume geometries stored in the `.tm3d`; $I2R_G$ / $R2I_G$ are the voxel-to-RAS and RAS-to-voxel matrices of geometry $G$; $T = T_n \circ \dots \circ T_1$ is the chain of transforms in file order (each transform first applies its own optional "initial" transform, [`fem_elastic/morph.h:84-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L84-L90); the surface path flattens these with `serialize()`, [`fem_elastic/morph.cpp:1659-1677`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1659-L1677)). `VolumeMorph::image` evaluates the chain left to right and stops at the first invalid result ([`fem_elastic/morph.cpp:1110-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1110-L1127)).

### Volume resampling (backward mapping)

For every voxel $\mathbf v=(i,j,k,1)^T$ of the output grid $G_{out}$ (the template geometry):

$$\mathbf p_F = R2I_F \, I2R_{out}\,\mathbf v,\qquad \mathbf p_M = T(\mathbf p_F),\qquad \mathbf u = R2I_{in}\, I2R_M\,\mathbf p_M$$

$$\text{out}(\mathbf v)=\begin{cases} S\big(\text{in},\mathbf u\big) & 0\le u_c\le N_c-1\ \ (c=x,y,z)\ \wedge\ \mathbf p_M\text{ valid}\\ 0 & \text{otherwise}\end{cases}$$

where $S$ is nearest-neighbour or trilinear sampling and $R2I_{in}$ is the scanner-RAS-to-voxel matrix of the input volume ([`fem_elastic/morph.cpp:728-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L728-L758), loop at [`fem_elastic/morph.cpp:795-872`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L795-L872)). Consequently the morph file must map **template (fixed) voxel index to subject (moving) voxel index**: a volume is "pulled back" with the direct transform. The bound test uses the closed interval $[0, N-1]$ per axis ([`fem_elastic/morph.cpp:846-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L848)), so the outer half voxel of the input is treated as outside.

### Surface morphing (forward mapping of vertices)

With $A$ the attached volume and $C$ the template: $\mathbf q = \text{MRIsurfaceRASToVoxel}(A,\mathbf x)$, $\mathbf q' = T(\mathbf q)$ (vertex left unchanged when $\mathbf q'$ is invalid), $\mathbf x' = \text{MRIvoxelToSurfaceRAS}(C,\mathbf q')$ ([`fem_elastic/fapplyMorph.cpp:477-501`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L477-L501), [`fem_elastic/surf_utils.cpp:19-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/surf_utils.cpp#L19-L73)). The **direct** transform $T$ is applied to the points, i.e. the same function that is used as the sampling map for volumes. A volume feature at moving index $\mathbf p_M$ appears at fixed index $\mathbf p_F=T^{-1}(\mathbf p_M)$ in the resampled output, whereas a surface vertex at index $\mathbf q$ is sent to $T(\mathbf q)$. The two directions are therefore opposite (verified with a pure translation: a volume shifted by `+3` voxels along x moves content by `-3` voxels, a surface passed through the same morph moves by `+3` voxels). The call `pmorph->invert()` is commented out in the surface filter ([`fem_elastic/fapplyMorph.cpp:479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L479)).

### Probe items

For vertex $i$ of the template surface (voxel space of $F$) and subject surface (voxel space of $M$): `sprobe` is written as $\lVert T(\mathbf t_i)-\mathbf s_i\rVert$ ([`fem_elastic/fapplyMorph.cpp:553-557`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L553-L557)); `snormals` is $\lvert \mathbf n_i\cdot(T(\mathbf t_i)-\mathbf s_i)\rvert$ with $\mathbf n_i$ the unit normal of the *subject* surface, computed by `MRIScomputeNormals` on the voxel-space coordinates ([`fem_elastic/fapplyMorph.cpp:625`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L625), [`fem_elastic/fapplyMorph.cpp:654-658`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L654-L658)). The template surface is converted with the fixed geometry stored in the morph and the subject surface with the moving geometry ([`fem_elastic/fapplyMorph.cpp:596-600`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L596-L600)). Because $T$ is the direct fixed-to-moving map, a perfect registration gives a value of 0 at every vertex (verified: template `lh.white` against a copy shifted by exactly the morph's translation gave all zeros).

### Point lists (inverse mapping)

The point-list filter first calls `pmorph->invert()` ([`fem_elastic/fapplyMorph.cpp:682`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L682)): every transform in the chain is inverted and the chain order is reversed ([`fem_elastic/morph.cpp:1634-1657`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1634-L1657)), then each point is mapped, $\mathbf x' = T^{-1}(\mathbf x)$, with no geometry conversion. Points are therefore taken from moving-space index coordinates to fixed-space index coordinates (verified: a `+3` x-translation morph maps `10 20 30` to `7 20 30`).

### Transform types

Each transform record in the file starts with a type string ([`fem_elastic/morph.cpp:1703-1712`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1703-L1712)):

| Type string | Class | Image of a point $\mathbf p$ | Inversion |
|-------------|-------|------------------------------|-----------|
| `affine` | `AffineTransform3d` | $A\mathbf p+\mathbf t$ with the 12 stored floats as columns of $A$ followed by $\mathbf t$: $p'_j=m_j p_x+m_{j+3}p_y+m_{j+6}p_z+m_{j+9}$ ([`fem_elastic/morph.cpp:38-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L38-L50)) | analytic 3x3 inverse; aborts the process (`exit(1)`) if $\lvert\det\rvert<10^{-5}$ ([`fem_elastic/morph.cpp:73-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L73-L114)) |
| `id` | `IdentityTransform3d` | $\mathbf p$ | none needed |
| `field` | `DeltaTransform3d` | $\mathbf p + \mathbf u(\mathbf p)$, $\mathbf u$ a 3-frame float volume sampled in the index space of its own grid with `m_interpolation` (trilinear by default); an optional mask volume makes the image invalid where it samples as 0 ([`fem_elastic/morph.cpp:414-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L414-L442)) | the implementation negates frame 0 of the field only ([`fem_elastic/morph.cpp:527-540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L527-L540)) |
| `fem` | `FemTransform3d` | tetrahedral mesh, piecewise-affine: find the tetrahedron containing $\mathbf p$ (closest node, then the elements incident to it, [`fem_elastic/mesh.h:868-901`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L868-L901)), then $\mathbf p + \mathbf a + p_x\mathbf b+p_y\mathbf c+p_z\mathbf d$ with element coefficients $\mathbf a,\mathbf b,\mathbf c,\mathbf d$ ([`fem_elastic/fem_3d.cpp:479-489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L479-L489)); outside the mesh the status is `cOutOfBounds`, and elements with an orientation problem give an invalid result ([`fem_elastic/mesh.h:1239-1255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L1239-L1255)) | mesh copied and node roles swapped (`CMesh3d::invert`), then the spatial index rebuilt ([`fem_elastic/morph.cpp:585-601`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L585-L601)); refuses (throws) if the transform has an initial transform |

> [!internal] See [[internal-gcamorph]] for the FreeSurfer GCAM/`.m3z` machinery
> `.tm3d` is a different container from `.m3z` ([[m3z-format]]). `exportGcam` ([[exportGcam]]) is the bridge that evaluates the morph on a voxel grid and writes a GCAM.

### Interpolation primitives

`apply_transforms` calls `MRIsampleVolumeType` for single-frame input and `MRIsampleSeqVolumeType` for multi-frame input ([`fem_elastic/morph.cpp:851-861`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L851-L861)). With nearest sampling the coordinate is rounded with `nint` and clamped to the volume ([`utils/mri.cpp:9395-9404`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L9395-L9404)); trilinear sampling is `MRIsampleVolume` / `MRIsampleSeqVolume` ([`utils/mri.cpp:9380-9381`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L9380-L9381), [`utils/mri.cpp:9988-9989`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L9988-L9989)). The result is stored with `MRIsetVoxVal` into a volume of the input's data type ([`fem_elastic/morph.cpp:854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L854)); `MRIsetVoxVal` clips the value to the range of the integer type and rounds it with `nint` ([`utils/mri.cpp:1752-1790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1752-L1790)), so trilinear results are clipped and rounded for integer-typed inputs.

## Configuration Options

### Complete Flag Reference

Arguments are declared in [`fem_elastic/fapplyMorph.cpp:300-310`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L300-L310).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--template` | file (required) | none | Template volume. Supplies the output grid for `vol` items and the output coordinate frame for `surf` items; also required (and read) for runs with only probe or point-list items ([`fem_elastic/fapplyMorph.cpp:303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L303)). Example: `--template $SUBJECTS_DIR/cvs_avg35/mri/aseg.mgz` |
| `--transform` | file (required) | none | Morph file (`.tm3d`; `.nm3d` selects the legacy reader). The extension is mandatory ([`fem_elastic/morph.cpp:1255-1276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1255-L1276)). Example: `--transform el_reg_to_cvs_avg35.tm3d` |
| `--zlib_buffer` | int | 5 ([`fem_elastic/fapplyMorph.cpp:315-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L315-L318)) | Initial size multiplier of the zlib inflate buffer: the buffer is allocated as (compressed record size) x (this value) and is doubled automatically on `Z_BUF_ERROR` ([`fem_elastic/ZlibStringCompressor.cpp:107-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L107-L134)). Only a memory/speed knob for very large meshes; `0` fails with a zlib data error (observed). Example: `--zlib_buffer 20` |
| `--dbg_coords` | 3 ints (`X Y Z`) | off | After all items have run, prints the image of the voxel coordinate `(X,Y,Z)` under the (possibly inverted, see below) morph and whether it is valid ([`fem_elastic/fapplyMorph.cpp:280-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L280-L290)). Example: `--dbg_coords 128 128 128` |
| `inputs` (positional, one or more, required) | strings | none | Data items; see grammar below ([`fem_elastic/fapplyMorph.cpp:302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L302), parser at [`fem_elastic/fapplyMorph.cpp:324-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L324-L435)). Flags may be placed before or after the items (verified). |

### Data-item grammar

The positional list is consumed left to right; each keyword takes a fixed number of operands, and a missing operand aborts with `Incomplete data item` (exit status 1). An unknown keyword aborts with `Unrecognized data item type` ([`fem_elastic/fapplyMorph.cpp:431-432`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L431-L432)).

| Keyword | Operands (in order) | Filter | Code |
|---------|---------------------|--------|------|
| `vol` | `<input volume> <output volume> <interp>` | `VolumeFilter` | [`fem_elastic/fapplyMorph.cpp:372-390`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L372-L390), [`fem_elastic/fapplyMorph.cpp:441-471`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L441-L471) |
| `surf` | `<input surface> <output surface> <attached volume>` | `SurfaceFilter` | [`fem_elastic/fapplyMorph.cpp:332-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L332-L350), [`fem_elastic/fapplyMorph.cpp:473-511`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L473-L511) |
| `sprobe` | `<template surface> <subject surface> <output scalar file>` | see gotcha: runs `SurfaceNormalsProbeFilter` | [`fem_elastic/fapplyMorph.cpp:351-371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L351-L371), [`fem_elastic/fapplyMorph.cpp:513-567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L513-L567) |
| `snormals` | `<template surface> <subject surface> <output scalar file>` | `SurfaceNormalsProbeFilter` | [`fem_elastic/fapplyMorph.cpp:351-371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L351-L371), [`fem_elastic/fapplyMorph.cpp:619-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L619-L668) |
| `point_list`<br>`tract_point_list` | `<input text file> <output text file> <mode>` (the third operand is stored but never read) | `PointListProbeFilter` | [`fem_elastic/fapplyMorph.cpp:391-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L391-L430), [`fem_elastic/fapplyMorph.cpp:670-736`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L670-L736) |

> [!contradiction] help.xml vs. code: no item grammar, and `surf` takes three operands
> `applyMorph.help.xml` documents the positional argument only as "`inputs`: Inputs." ([`fem_elastic/applyMorph.help.xml:7-9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/applyMorph.help.xml#L7-L9)); none of the keywords, their operand counts or the interpolation keywords are described. A commonly assumed form `surf <in> <out>` is incomplete: the parser requires a third operand, the attached volume ([`fem_elastic/fapplyMorph.cpp:345-347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L345-L347)); with only two operands the run stops with `Incomplete data item` (verified). The remaining help entries (`--template`, `--transform`, `--zlib_buffer INT`, `--dbg_coords X Y Z`) agree with the parser; the help does not state the `--zlib_buffer` default of 5.

> [!contradiction] Stale comment: "why does not it read nii volumes"
> The comment at [`fem_elastic/fapplyMorph.cpp:162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L162) suggests NIfTI templates fail to load. With the 8.2.0 binary a `.nii.gz` template was read and used without error (the reader is the general `MRIread`).

### Interpolation keywords

The third operand of `vol` is compared with exactly two strings ([`fem_elastic/fapplyMorph.cpp:249-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L249-L252)):

| Keyword | Sampler | Effect on data types |
|---------|---------|----------------------|
| `linear` | trilinear (`SAMPLE_TRILINEAR`) | Blends the 8 neighbours. Result is quantised to the input's type: for integer-typed inputs it is clipped to the type range and rounded (`nint`), and for label volumes it **creates new label values** (observed: a 38-label aseg resampled by a half-voxel shift with `linear` produced 68 distinct values). |
| `nearest` | nearest neighbour (`SAMPLE_NEAREST`) | Copies an existing voxel value; preserves labels and integer data. A coordinate exactly halfway between voxels rounds up (observed: shift of 0.5 voxel gave `in[x+1]`). |
| anything else (`cubic`, `sinc`, `bogus`, ...) | not recognised | Silently ignored; the sampler stays at its default, trilinear ([`fem_elastic/morph.cpp:664`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L664)), or at whatever an earlier/later item set (see below). Observed: `bogus` gave output identical to `linear`. |

`VolumeMorph` documents `SAMPLE_CUBIC` as a valid `m_interpolationType` ([`fem_elastic/morph.h:342-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L342-L344)), but no command-line keyword selects it.

### Configuration Interactions

**1. The interpolation setting is global, and the last item wins.** The interpolation of each item is written into the single shared `VolumeMorph` while the item list is being built ([`fem_elastic/fapplyMorph.cpp:249-254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L249-L254)); the filters only run afterwards ([`fem_elastic/fapplyMorph.cpp:262-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L262-L278)). The value in force during execution is therefore the one of the last `vol` item (with a recognised keyword), for every volume item.

> [!gotcha] `vol A a.mgz nearest vol B b.mgz linear` resamples A with trilinear interpolation
> Observed with the 8.2.0 binary: the first volume (requested `nearest`) was identical to a trilinear-only run. To resample a label volume with `nearest` and an intensity volume with `linear`, run `applyMorph` twice.

**2. Interpolation keyword by data type.** Use `nearest` for segmentations, label maps, masks and any other categorical or integer volume; use `linear` for continuous intensity data stored as float. `linear` on integer-typed intensity data rounds the interpolated value back to integers (information is lost for integer volumes with a small value range).

**3. Direction conventions differ between item types.** The same morph file is used in three different ways:

| Item | Map applied | What it means |
|------|-------------|---------------|
| `vol` | $T$ evaluated on each *template* voxel to find the *input* voxel to sample (backward mapping) | content of the subject (moving) volume is carried into template (fixed) space |
| `surf`, `sprobe`, `snormals` | $T$ applied to *vertex coordinates* (forward) | points are carried from fixed-space index to moving-space index; comparing with the volume case this is the opposite direction |
| `point_list`, `tract_point_list` | $T^{-1}$ (the morph is inverted first) | points are carried from moving-space index to fixed-space index, i.e. the same direction as the volume content |

Consequently, to carry a subject-space surface into template space, the `surf` filter would need a morph whose direction has been reversed, and `applyMorph` has no `--invert` option; point lists are the only item type that is inverted automatically.

> [!gap] Intended use of `surf`
> The inversion call is commented out in `SurfaceFilter::Execute` ([`fem_elastic/fapplyMorph.cpp:477-479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L477-L479)), and the output is converted back to RAS with the template geometry (not the moving geometry) ([`fem_elastic/fapplyMorph.cpp:500-501`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L500-L501)). The code does not settle whether the intended workflow is (a) a template-space surface carried into subject space, (b) a subject-space surface with a morph built in the reverse direction, or (c) a setting where fixed and moving geometries coincide (the CVS use case, both conformed 256^3 1 mm). No caller in the source tree uses `surf`.

**4. Inversion by `point_list` is persistent.** `pmorph->invert()` modifies the shared morph in place ([`fem_elastic/fapplyMorph.cpp:682`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L682)), so every item executed after a point-list item (in command-line order) sees the inverted morph.

> [!gotcha] Item order matters when point lists are mixed with other items
> Observed with a `+3` x-translation morph: `vol in out nearest point_list p.txt q.txt x` gave `out[x]=in[x+3]`, whereas `point_list p.txt q.txt x vol in out nearest` gave `out[x]=in[x-3]` (inverse morph). `--dbg_coords` is evaluated at the very end and therefore also sees the inverted morph when a point-list item was present. Run point lists in a separate invocation, or place them last.

**5. Template geometry has two distinct roles.** (a) The output grid of every `vol` item is the template's geometry ([`fem_elastic/fapplyMorph.cpp:454-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L454-L460)); it does **not** need to match the fixed geometry stored in the morph, because template voxels are mapped to fixed-index space through RAS ([`fem_elastic/morph.cpp:728-742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L728-L742)). Observed: a morph built on a 64^3 4 mm grid applied with a 256^3 1 mm template wrote a 256^3 1 mm output. (b) For `surf` items the template is the frame in which the output vertices are expressed; the morph's own geometries are not consulted, so the attached volume (input frame) and template (output frame) must be consistent with the morph's fixed/moving geometries by construction of the user.

> [!gotcha] Morphs without stored geometry silently fall back to a default 256^3 1 mm LIA grid centred at RAS (0,0,0)
> `VolumeMorph` initialises both stored geometries to the library default (conformed LIA, `c_ras = 0`, flagged `valid = 0`) ([`utils/transform.cpp:305-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L305-L327), constructor at [`fem_elastic/morph.cpp:666-667`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L666-L667)) and `apply_transforms` uses them without checking `valid`. A morph made by `createMorph` without `--template`/`--subject` (or a legacy `.nm3d`, which has no geometry tags) is therefore applied as if its index space were that default grid. Observed: the same 3-voxel translation applied through such a file shifted a 4 mm volume by 1 voxel instead of 3, with no warning. Only the probe items check the validity flag ([`fem_elastic/fapplyMorph.cpp:573-578`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L573-L578)): they print `Morph doesn't have valid geometries` and return from the loader, but `Execute` then continues with no surfaces loaded; observed with `snormals` and such a morph: segmentation fault (exit status 139).

**6. Zero-padding and out-of-mesh voxels.** A template voxel contributes 0 to the output (the pre-filled value) when any of these holds ([`fem_elastic/morph.cpp:820-825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L820-L825), [`fem_elastic/morph.cpp:846-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L848)): (i) the chain returns an invalid point (FEM mesh does not contain the point, bad-orientation tetrahedron, or a displacement-field mask of 0); (ii) the mapped input index lies outside $[0,N-1]$ in any axis. No distinction is made in the output between "outside the mesh", "outside the input" and a genuine zero; a 0 in a label volume therefore coincides with the label "unknown". The console reports `Invalid voxels = ...` / `Valid = ...` ([`fem_elastic/morph.cpp:873-874`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L873-L874)), but "Invalid" only counts voxels with status `cInvalid`; out-of-mesh voxels (status `cOutOfBounds`) are counted in neither number ([`fem_elastic/morph.cpp:820-825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L820-L825)). Observed with a 3-voxel shift: `Valid = 249856 = 61 x 64 x 64`, the last 3 columns remaining 0.

**7. `--dbg_coords` and `--zlib_buffer`** are independent of the items; they never change the written files.

## Typical Use Cases

### Use Case 1: Resample a segmentation into template space (the historical CVS call)

```bash
applyMorph --template $SUBJECTS_DIR/cvs_avg35/mri/aseg.mgz \
           --transform $outdir/el_reg_to_cvs_avg35.tm3d \
           vol $SUBJECTS_DIR/$subj/mri/aseg.mgz \
               $outdir/el_reg_to_cvs_avg35_aseg.mgz nearest
```

This is the command `mri_cvs_register` ran in step 3 until March 2024 (reconstructed from [`mri_cvs_register/mri_cvs_register:472-475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L472-L475)). `nearest` keeps label values intact.

### Use Case 2: Several volumes of the same type in one run

```bash
applyMorph --template tmpl_norm.mgz --transform subj_to_tmpl.tm3d \
           vol subj_aseg.mgz  out_aseg.mgz  nearest \
           vol subj_aparc+aseg.mgz out_aparc+aseg.mgz nearest
```

Items run in order and share one loaded morph. Keep the interpolation keyword the same for all items in a call (see Configuration Interactions, item 1).

### Use Case 3: Move a surface and express it in the template frame

```bash
applyMorph --template tmpl_norm.mgz --transform tmpl_to_subj.tm3d \
           surf $SUBJECTS_DIR/tmpl/surf/lh.white  lh.white.morphed \
                $SUBJECTS_DIR/tmpl/mri/norm.mgz
```

The three operands after `surf` are the input surface, output surface and the volume the input surface is registered to. The direct morph is applied to the vertices (see the direction table); no calling script in the 8.2.0 tree uses this item type.

### Use Case 4: Per-vertex agreement between a morphed template surface and the subject surface

```bash
applyMorph --template tmpl_norm.mgz --transform tmpl_to_subj.tm3d \
           snormals $SUBJECTS_DIR/tmpl/surf/lh.white \
                    $SUBJECTS_DIR/subj/surf/lh.white \
                    /abs/path/lh.snormals.curv
```

Writes `|normal . displacement residual|` per vertex (see gotcha: `sprobe` is not a distance). The two surfaces must have the same number of vertices.

### Use Case 5: Map coordinates

```bash
applyMorph --template tmpl_norm.mgz --transform subj_to_tmpl.tm3d \
           point_list pts_subj_vox.txt pts_tmpl_vox.txt unused
```

Each input line holds exactly three numbers (voxel indices of the moving grid); each output line is the inverse-morph image. Invalid points are written as `10000 10000 10000`.

## Pipeline Context

`applyMorph` is not called by `recon-all`. In the CVS pipeline ([[mri_cvs_register]]):

**Predecessor:** [[surf2vol]] (`-out_mesh` writes `<root>.tm3d`, [`fem_elastic/fsurf2vol.cpp:673`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L673); `mri_cvs_register` names it `el_reg_to<templateid>.tm3d`, [`mri_cvs_register/mri_cvs_register:343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L343)) -> **This tool** (historical, until 2024-03-15) -> **Successor:** [[mri_nl_align]] on the resampled volume, then [[mri_concatenate_gcam]] to combine the elastic `.m3z` with the `mri_nl_align` result ([`mri_cvs_register/mri_cvs_register:603`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L603), [`mri_cvs_register/mri_cvs_register:621`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L621)).

Current practice replaces the `applyMorph` step by `exportGcam` ([[exportGcam]]) followed by `mri_vol2vol --m3z` ([[mri_vol2vol]]); `mri_vol2vol` takes `.m3z`/LTA transforms, not `.tm3d`; see [[mri_vol2vol]] for its interpolation options.

## Gotchas and Caveats

> [!gotcha] `sprobe` does not compute a distance: both keywords run the normals filter
> After consuming the keyword, the parser tests `*cit == "sprobe"` on the *next* token, i.e. the template-surface file name, not the keyword ([`fem_elastic/fapplyMorph.cpp:354-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L354-L362)). Unless the surface file is literally called `sprobe`, the item type becomes `snormals`. Observed: with a template surface and an unshifted subject surface under a 3-voxel translation, `sprobe` and `snormals` produced identical per-vertex files (range 0 to 3, mean 1.62), whereas a distance would be 3 everywhere. The `SurfaceProbeFilter::Execute` distance code ([`fem_elastic/fapplyMorph.cpp:513-567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L513-L567)) is therefore not reached from the command line in 8.2.0.

> [!gotcha] Operand order differs between item types
> `surf` is `<in> <out> <attached>`; `sprobe`/`snormals` are `<template surf> <subject surf> <out>`; `vol` and the point-list items are `<in> <out> <third>`. Confusing the orders can overwrite an input file with output (for example `surf A B C` writes to `B`).

> [!gotcha] A non-morph file passed to `--transform` aborts the program
> The tagged reader trusts the first tag length. Passing, for example, an `.mgz` volume as `--transform` ended with `std::bad_alloc` and a core dump (exit status 134, observed). A missing file or a file without an extension is reported cleanly (`failed to open input stream` / `Couldn't find extension in filename.`, exit status 1). A GCAM (`.m3z`) is not a valid `--transform` for this tool; use [[mri_vol2vol]] for those.

> [!gotcha] Point-list parsing is purely token-based
> The reader counts the lines of the file, then reads that many triples of numbers with `>>` ([`fem_elastic/fapplyMorph.cpp:685-714`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L685-L714)). A file with extra columns (for example a label per point) or with trailing blank lines does not fail; the extra tokens are consumed as coordinates of the next point (observed: lines `10 20 30 7` / `1 2 3 7` produced outputs `7 20 30` and `4 1 2`). Provide exactly three numbers per line and no blank lines.

> [!gotcha] `tract_point_list` is identical to `point_list`
> It only sets a global flag ([`fem_elastic/fapplyMorph.cpp:413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L413)) that is read solely in a commented-out condition ([`fem_elastic/fapplyMorph.cpp:681`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L681)); the inversion is applied unconditionally. Output of the two keywords was identical in the experiment.

> [!gotcha] Surface output frame is the template frame
> After morphing, `surf` re-expresses the vertices with the template geometry and copies the template's volume geometry into the output surface ([`fem_elastic/fapplyMorph.cpp:500-501`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L500-L501)). The attached volume's geometry is used only for the input conversion. Vertices whose image is invalid are not left at their original RAS; they keep their input voxel position, which is then re-interpreted in the template frame.

> [!gotcha] Console output is very verbose
> Every 10th slice, every transform record header and (for FEM meshes) each point not covered by an element print lines to stdout ([`fem_elastic/morph.cpp:797`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L797), [`fem_elastic/mesh.h:898`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L898)); point-list runs print one block per point. The template volume is also read twice, with the banner `Template name:` printed twice, because the loading block is duplicated ([`fem_elastic/fapplyMorph.cpp:161-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L161-L183)).

> [!gotcha] Exit status of a partially failed volume run
> Exceptions of type `const char*` (read/load failures, null matrices) end with exit status 1 ([`fem_elastic/fapplyMorph.cpp:273-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L273-L278)), but a `gmpErr` raised inside the voxel loop is caught inside `apply_transforms`, which prints `Exception caught` and returns the partially filled volume ([`fem_elastic/morph.cpp:876-879`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L876-L879)); the tool then writes it and exits with status 0.

## Error Compensation and Guard Rails

- **Format auto-detection by extension:** `.nm3d` is read with the legacy per-record loader ([`fem_elastic/morph.cpp:1330-1365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1330-L1365)); everything else with the tagged loader ([`fem_elastic/morph.cpp:1368-1418`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1368-L1418)).
- **Geometry reconciliation (volumes):** input volume, morph fixed/moving geometries and template geometry are all reconciled through RAS matrices, so volumes in any orientation or resolution can be resampled ([`fem_elastic/morph.cpp:728-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L728-L758)).
- **Invalid vertices are left in place** ([`fem_elastic/morph.cpp:1102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1102): "better leave it as it was if it's not working").
- **Invalid probe vertices** receive the sentinel `-0.1`; **invalid points** receive `10000 10000 10000`, "not to lose order" ([`fem_elastic/fapplyMorph.cpp:731`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L731)). Downstream code must test for these sentinels.
- **Multi-frame inputs** are handled frame by frame (`MRIsampleSeqVolumeType`); a message is printed when a multi-frame volume is read ([`fem_elastic/morph.cpp:701-711`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L701-L711)).
- **Octree/spatial index** for FEM transforms is built before any item runs by `initOctree` ([`fem_elastic/morph_utils.cpp:14-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph_utils.cpp#L14-L22), call at [`fem_elastic/fapplyMorph.cpp:201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L201)).
- **zlib buffer growth:** the inflate buffer is doubled until the record fits ([`fem_elastic/ZlibStringCompressor.cpp:120-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L120-L126)), so `--zlib_buffer` rarely needs to be changed.


## Known Bugs

Defects found in the 2026-10-19 source audit of `fem_elastic/` (v8.2.0), most severe first:

- [[00206]] — severity 3: applyMorph — CMesh3d copy ctor shallow-copies the Octree; FemTransform3d::invert double-frees the root on point_list/tract_point_list of a FEM-mesh morph (harness SIGSEGV); m_poctree left uninitialised
- [[00211]] — severity 3: applyMorph — `sprobe` item always runs as `snormals` (parser tests the filename, not the keyword); distance filter unreachable; byte-identical outputs
- [[00213]] — severity 3: applyMorph/morph lib — DeltaTransform3d::invert negates only frame 0 (x); point lists through `field` (surf2vol -compress) morphs get inverted x, forward y,z
- [[00214]] — severity 3: applyMorph — `point_list` inverts the shared morph in place and never restores it; item-order-dependent results for later point lists, vol/surf items and --dbg_coords
- [[00215]] — severity 3: createMorph — gcam input: GCAMrasToVox() applied to voxel-type GCAMs since 2023 (0a3a8c2d16) gives garbage delta field; hits trac-preproc legacy CVS branch
- [[00219]] — severity 3: applyMorph — per-item `vol` interpolation is applied globally at setup (last item wins; `VolumeFilter::m_interpolationType` unused); unknown keywords silently ignored
- [[00208]] — severity 2: surf2vol — new[]/delete mismatch in SmallMatrix::inplace_transpose (per active MFC per FEM step) and ZlibStringCompressor::setBufferSize; UB, benign on glibc, Valgrind-confirmed; dangling m_buffer
- [[00209]] — severity 2: surf2vol / exportGcam / createMorph — leaks: comm_solution overwrites its new[] with VecGetArray, setup_load_sym frees nothing, ZlibStringCompressor has no destructor (peak-memory inflation)
- [[00216]] — severity 2: createMorph — poor input validation: gcam without --template segfaults, unknown keywords/unreadable template skipped with exit 0, nested morph drops geometry, missing mesh aborts
- [[00217]] — severity 2: surf2vol/exportGcam/applyMorph — DeltaTransform3d samples validity mask trilinearly (comment says nearest); 1-voxel boundary rim accepted with damped displacement
- [[00218]] — severity 2: createMorph — volume input with nframes != 3 writes a .tm3d field record the 3-frame reader cannot parse (read past end / dropped frames); no frame check
- [[00220]] — severity 2: applyMorph — sprobe/snormals segfault (exit 139) on morphs without valid geometry (e.g. createMorph without --template/--subject): LoadInputData returns instead of throwing

## Related Tools

- [[createMorph]] - builds the `.tm3d` that `applyMorph` consumes (affine, displacement field, mesh or GCAM components).
- [[surf2vol]] - FEM elastic registration; its `-out_mesh` option writes the `.tm3d`.
- [[exportGcam]] - converts a `.tm3d` to a `.m3z` GCAM for use with standard FreeSurfer tools.
- [[mri_cvs_register]] - the pipeline that used `applyMorph` until 2024; see Purpose and Context.
- [[mri_vol2vol]] - the replacement for resampling volumes through an `.m3z`.
- [[mri_concatenate_gcam]] - composes `.m3z` morphs.
- [[mri_nl_align]] - the volumetric non-linear refinement that follows the elastic step in CVS.
- [[mris_resample]], [[mri_surf2surf]] - other ways to carry surfaces and surface data between spaces.

## Confidence and Gaps

Confidence is **medium**. The command-line grammar, filter logic, volume resampling math, affine transforms, output files and the interactions described above were read from source **and** reproduced with the installed 8.2.0 binary on synthetic affine morphs (created with `createMorph` on small volumes derived from the `bert` subject; outputs compared voxel by voxel). The FEM-mesh and displacement-field transform classes, the legacy `.nm3d` loader and the out-of-mesh behaviour of real `.tm3d` files from `surf2vol` were read from code only.

> [!gap] Direction of the `surf` item
> See Configuration Interactions, item 3. The source does not state whether surfaces are meant to be passed through the direct or the inverse morph.

> [!gap] Unused third operand of `point_list`
> The mode string is stored in `PointListProbeFilter::strMode` ([`fem_elastic/fapplyMorph.cpp:242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L242), declaration at [`fem_elastic/fapplyMorph.cpp:124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L124)) but never read. The code does not reveal what values were intended.

> [!gap] Displacement-field masks and out-of-field behaviour
> The mask of a `field` transform is sampled with the transform's `m_interpolation` (trilinear by default), although the adjacent comment says nearest neighbour ([`fem_elastic/morph.cpp:421-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L421-L430)); behaviour at field borders (zero displacement outside the field, by `MRIsampleVolumeFrame` convention) was not tested.

> [!gap] FEM lookup coverage
> The containing tetrahedron is searched only among the elements incident to the node closest to the query point ([`fem_elastic/mesh.h:868-901`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L868-L901)); whether a point inside the mesh can be reported as outside by this strategy was not investigated.

> [!gap] Equivalence of the `.tm3d` and `.m3z` routes
> `exportGcam` builds its GCAM from the displacement field cached by this same `apply_transforms` machinery (`apply_transforms(moving, true, ...)`, [`fem_elastic/morph.cpp:1500-1509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1500-L1509)), and the 2024-03-15 commit message records that `mri_vol2vol`'s application of `.m3z` coordinates was fixed at the same time as `applyMorph` was dropped from `mri_cvs_register`. Whether `applyMorph` and `exportGcam` + `mri_vol2vol` give voxel-identical resampling was not compared experimentally.

> [!gap] Versions of the 2011 and 2024 replacement
> The `mri_cvs_register` header attributes the replacement to 2011; the git history shows that only the combined-morph application was replaced then and that the `.tm3d` application was replaced in 2024. Whether the 2011 header line was meant to cover both is not recorded.

## References

- FreeSurfer source, `fem_elastic/` (this page, v8.2.0); `mri_cvs_register/mri_cvs_register` and its `.help.xml`.
- Git history of the source tree: commits `4b881dc775` (2008-03-14, "source for createMorph and applyMorph"), `67f303f52e` (2011-03-17), `23917e48df` (2024-03-15).
- CVS registration: Postelnicu G, Zollei L, Fischl B. "Combined volumetric and surface registration." IEEE Trans Med Imaging 2009;28(4):508-522.
