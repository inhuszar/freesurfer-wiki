---
title: "tkregister2"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "tkregister2/tkregister2.cpp"
  - "tktools/scripts/tkregister2.tcl"
families:
  - "tk*"
recon_all_stage: null
related:
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
  - "[[freeview]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
  - "[[mri_coreg]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact matrix convention for register.dat (tkRAS direction, float2int method) needs a dedicated reference"
  - "GUI keyboard shortcuts and interactive editing workflow are documented in Tcl/Tk script only; not captured here"
  - "Interaction between --fstal and --no-zero-cras ZeroCRAS correction is complex; needs verification"
  - "Whether tkregister2 is called by recon-all (e.g., for checking Talairach registration) needs verification"
tags:
  - registration
  - gui
  - transforms
  - talairach
  - visualization
---

# tkregister2

## Summary

`tkregister2` is a Tcl/Tk-based GUI tool for visualizing, manually editing, and converting linear registration matrices between two MRI volumes. It displays a coronal (or sagittal/axial) view of a target and movable volume simultaneously, allowing the user to toggle between them to assess and correct alignment. Registration can be initialized from a file, from volume headers, from an FSL matrix, or from an LTA; outputs can be written as FreeSurfer `register.dat`, FSL `.mat`, MNI `.xfm`, or FreeSurfer LTA files. Running with `--noedit` bypasses the GUI entirely, making the tool useful for batch format conversions. The original authors are Martin Sereno, Anders Dale (1996), and Doug Greve (2002).

> [!gotcha] Consider using `tkregisterfv` instead
> The `--help` output explicitly recommends `tkregisterfv`, a wrapper around [[freeview]], for interactive registration tasks. `tkregister2` is a legacy tool retained for compatibility with existing workflows that produce or consume `register.dat` files.

## Source Information

- **Language:** C++ (backend logic) / Tcl/Tk (GUI frontend)
- **Source files:**
  - `tkregister2/tkregister2.cpp` (original authors: Martin Sereno, Anders Dale, Doug Greve; last CVS update: 2016-08-02, v1.132.2.1)
  - `tktools/scripts/tkregister2.tcl` (GUI frontend)
- **Binary/script location:** `$FREESURFER_HOME/bin/tkregister2` (shell wrapper invoking Tcl/Tk)

## Purpose and Context

`tkregister2` serves two distinct roles:

1. **Interactive alignment:** Display two volumes side by side and manually correct a registration matrix using translation, rotation, and scaling. The corrected registration is saved as a `register.dat` file (or other formats).
2. **Batch conversion / checking:** Without a GUI (via `--noedit`), convert between registration file formats, apply transformations, or verify alignment.

The tool is closely tied to the FreeSurfer coordinate conventions documented in [[coordinate-systems]]: the internal registration matrix maps from target tkRAS (Surface RAS) to movable tkRAS. This is the opposite of the intuitive direction (movable → target) and a common source of confusion.

Primary use cases:
- Checking the Talairach registration produced by `recon-all` (via `--fstal`).
- Registering a functional volume (e.g., EPI) to the subject's structural T1 volume.
- Converting between registration file formats (e.g., FSL to FreeSurfer, or `register.dat` to LTA).
- Verifying that a `register.dat` from `bbregister` or another tool aligns correctly.

## Inputs

### Required Inputs

At minimum, `--targ` and `--mov` volumes must be specified, along with a registration file path via `--reg` (even if the initial registration is computed from headers with `--regheader`).

| Argument | Type | Description |
|----------|------|-------------|
| `--targ <vol>` | volume path | Target volume (the reference space; typically the T1 anatomical) |
| `--mov <vol>` | volume path | Movable volume (the volume to align; e.g., the functional EPI) |
| `--reg <file>` | file path | Input/output FreeSurfer `register.dat` file |

### Input Assumptions

> [!assumption] Target is internally conformed to COR format
> If the target volume is not 256³ at 1 mm isotropic in standard RAS orientation, `tkregister2` silently reslices it to COR format for display purposes. The `Mtc` correction matrix absorbs this reslice so that the displayed and saved registrations are consistent. The original target header is retained in `targ_vol0` for FSL-to-tkReg conversion.

> [!assumption] `register.dat` uses tkRAS convention
> The FreeSurfer registration file format stores a matrix that maps from **target tkRAS** to **movable tkRAS** (i.e., the inverse of what most tools expect). See [[coordinate-systems]] for the tkRAS definition and [[lta-format]] for how LTA encodes the same transform differently.

> [!assumption] `SUBJECTS_DIR` and `FREESURFER_HOME` must be set
> The main entry point (`Register()`) checks for `SUBJECTS_DIR` and `FREESURFER_HOME` environment variables and exits with an error if either is missing. For batch/no-GUI use, these must be set even if `--fstarg` is not used.

> [!assumption] Old-style tkregister matrices have a float2int bug
> Registration files created by the original `tkregister` (not `tkregister2`) used a truncation-based voxel-to-integer conversion (`FLT2INT_TKREG`). `tkregister2` detects this and applies `MRIfixTkReg()` to correct the shift by default. Use `--nofix` to disable the correction and reproduce the old (buggy) behaviour.

## Outputs

### Files Created

Depending on the output flags specified:

| Output | Format | Notes |
|--------|--------|-------|
| `--reg <file>` | FreeSurfer `register.dat` | Primary output; always written if GUI edits are made |
| `--fslregout <file>` | FSL/FLIRT `.mat` | 4×4 ASCII FSL registration matrix |
| `--xfmout <file>` | MNI `.xfm` | MNI-style registration output |
| `--ltaout <file>` | FreeSurfer LTA | RAS-to-RAS linear transform array |
| `--freeview <file>` | FreeView registration | FreeView-compatible registration matrix |
| `--det <file>` | ASCII float | Determinant of the registration matrix, written to a text file |

When `--fstal` is used, edits are saved back to `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`.

### Output Specifications

The `register.dat` format stores:
1. Subject name (first line)
2. Movable voxel size (`ipr`, in-plane resolution, mm)
3. Movable slice thickness (`bpr`, between-plane resolution, mm)
4. Intensity scale factor (`fscale`)
5. A 4×4 matrix mapping target tkRAS to movable tkRAS
6. Terminator: `round` (newer) or `tkregister` (legacy float2int convention)

See [[lta-format]] for the related LTA encoding.

## Mathematical Foundations

The register.dat convention maps target tkRAS coordinates to movable tkRAS coordinates:

$$\mathbf{x}_{\text{mov,tk}} = \mathbf{R} \cdot \mathbf{x}_{\text{targ,tk}}$$

where $\mathbf{R}$ is the 4×4 registration matrix stored in the file. This is the direction needed for **resampling**: to find where a target voxel maps in the movable space.

The conversion from FSL format to this convention is:

$$\mathbf{R} = \mathbf{T}_{\text{mov}}^{-1} \cdot \mathbf{D}_{\text{mov}}^{-1} \cdot \mathbf{M}_{\text{FSL}} \cdot \mathbf{D}_{\text{targ}}$$

where:
- $\mathbf{T}_{\text{mov}}$ is the movable vox2ras-tkr matrix (`MRIxfmCRS2XYZtkreg`)
- $\mathbf{D}_{\text{mov}}$ is the movable scanner vox2ras matrix
- $\mathbf{M}_{\text{FSL}}$ is the FSL matrix (maps movable voxels to target voxels, scaled by voxel sizes)
- $\mathbf{D}_{\text{targ}}$ is the target scanner vox2ras matrix

This is implemented by `MRIfsl2TkReg(targ_vol0, mov_vol, FSLRegMat)`.

When the target is not COR-conformant, an additional correction matrix $\mathbf{M}_{\text{tc}}$ is applied:

$$\mathbf{R}_{\text{final}} = \mathbf{R} \cdot \mathbf{M}_{\text{tc}}^{-1}$$

This accounts for the implicit reslice of the target to COR format.

For `--fstal`, the Talairach XFM is a RAS-to-RAS (scanner space) matrix. By default (`ZeroCRAS = 1` unless `--no-zero-cras` is specified), the target c_ras is zeroed before constructing the tkReg matrix, and a correction `Mcras0` is incorporated:

$$\mathbf{R}_{\text{tal}} = \mathbf{M}_{\text{xfm}} \cdot \mathbf{M}_{\text{cras0}}$$

> [!internal] The `MRItkRegMtx()`, `MRIfsl2TkReg()`, and `MRIfixTkReg()` functions are defined in `utils/registerio.cpp` / `utils/mri.cpp`. See [[coordinate-systems]] for a full derivation of the tkRAS offset.

## Configuration Options

### Complete Flag Reference

#### Volume and Registration Input

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--targ <vol>` | path | — | Target volume (any format readable by `mri_convert`) |
| `--fstarg` | none | off | Target is `$SUBJECTS_DIR/<subjectid>/mri/T1.mgz` (or COR format); subject taken from `--reg` or `--s` |
| `--mov <vol>` | path | — | Movable volume |
| `--reg <file>` | path | — | Input/output `register.dat` file |
| `--regheader` | none | off | Compute initial registration from volume headers (ignores existing `--reg` file if present) |
| `--regheader-center` | none | off | Same as `--regheader` but zeroes the translation (aligns volume centres) |
| `--check-reg` | none | off | Check registration only; `--reg` is not required |
| `--identity` | none | off | Use identity matrix as the initial registration |
| `--fsl <file>` | path | — | Read FSL/FLIRT matrix as initial registration |
| `--xfm <file>` | path | — | Read MNI-style matrix as initial registration |
| `--lta <file>` | path | — | Read RAS-to-RAS LTA as initial registration |
| `--lta-inv <file>` | path | — | Read LTA and invert |
| `--vox2vox <file>` | path | — | Read vox2vox matrix (ASCII 4×4; target indices to movable indices) |
| `--ixfm <file>` | path | — | Read MNI-style inverse registration matrix |
| `--int <vol> <reg>` | path, path | off | Use registration from an intermediate volume to handle partial-FOV movable volumes |
| `--fstal` | none | off | Set movable to `$FREESURFER_HOME/average/mni305.cor.mgz`; set registration to `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm` |
| `--talxfmname <name>` | string | `talairach.xfm` | Override talairach XFM filename (with `--fstal`) |

#### Registration Output

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--fslregout <file>` | path | — | Write FSL-format output matrix |
| `--xfmout <file>` | path | — | Write MNI-style output matrix |
| `--ltaout <file>` | path | — | Write LTA output |
| `--ltaout-inv` | none | off | Invert the transform in `--ltaout` |
| `--freeview <file>` | path | — | Write FreeView registration matrix |
| `--det <file>` | path | — | Write determinant of reg matrix to text file |

#### Subject and Directory

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--s <subjectid>` | string | (from reg file) | Set subject identifier |
| `--sd <dir>` | path | `$SUBJECTS_DIR` | Set SUBJECTS_DIR |

#### Display and GUI Options

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--plane <orient>` | `cor`/`sag`/`ax` | `cor` | Initial display plane |
| `--slice <n>` | int | auto | Initial slice number |
| `--fov <FOV>` | float | 256 | Viewport field-of-view in mm |
| `--volview <id>` | `targ`/`mov` | `mov` | Initial volume shown |
| `--movbright <f>` | float | auto | Brightness scale for movable volume |
| `--fmov <f>` | float | auto | Set movable brightness factor |
| `--fmov-targ` | none | off | Apply `--fmov` brightness to target also |
| `--no-inorm` | none | off | Disable intensity normalization |
| `--surf <name>` | string | — | Load surface overlay (both hemispheres) for display |
| `--surf-rgb R G B` | 3 ints | `0 255 0` | Set surface colour (0–255) |
| `--lh-only` | none | off | Load/display left hemisphere surface only |
| `--rh-only` | none | off | Load/display right hemisphere surface only |
| `--aseg` | none | off | Load `aseg.mgz` as segmentation overlay (toggle with 'd') |
| `--aparc+aseg` | none | off | Load `aparc+aseg.mgz` as overlay (toggle with 'c') |
| `--wmparc` | none | off | Load `wmparc.mgz` as overlay (toggle with 'c') |
| `--movscale <s>` | float | 1 | Scale size of movable volume by s in the registration |
| `--size <s>` | float | 1 | Scale window by s (e.g., 0.5 or 1.5) |
| `--2` | none | off | Double window size |
| `--title <str>` | string | subjectid | Set window title |
| `--tag` | none | off | Tag movable volume with hatched pattern near origin (helps detect L/R reversal) |

#### Orientation Override

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--mov-orientation <str>` | 3-char string | (from header) | Supply orientation string for movable volume (e.g., `RAS`, `LPI`); requires `--regheader` to take effect |
| `--targ-orientation <str>` | 3-char string | (from header) | Supply orientation string for target volume |

#### Matrix Application

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--trans Tx Ty Tz` | 3 floats | — | Apply translation (mm) to registration matrix before display |
| `--rot Ax Ay Az` | 3 floats (deg) | — | Apply rotation (degrees) to registration matrix before display |

#### Registration Behaviour Flags

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--noedit` | none | off (if GUI) | Do not open GUI; exit immediately after processing. Useful for format conversion. Default is `true` when built without GUI support |
| `--nofix` | none | off | Do not apply `MRIfixTkReg()` correction for old tkregister float2int matrices |
| `--float2int <code>` | int | auto | Override float2int method for debugging |
| `--no-zero-cras` | none | off | Do not zero target c_ras when using `--fstal` |
| `--conf-targ` | none | off | Conform target volume (assumes registration was computed to a conformed target, e.g., via GCA) |
| `--fsl-targ` | none | off | Use `$FSLDIR/data/standard/avg152T1.nii.gz` as target |
| `--fsl-targ-lr` | none | off | Use `$FSLDIR/data/standard/avg152T1_LR-marked.nii.gz` as target |
| `--gca <subj>` | string | — | Check linear GCA registration for subject |
| `--gca-skull <subj>` | string | — | Check linear 'with skull' GCA registration for subject |
| `--feat <featdir>` | path | — | View/modify FSL FEAT `example_func2standard.mat` registration |
| `--fsfeat <featdir>` | path | — | Check `reg/freesurfer/register.dat` from an FSL FEAT directory |
| `--gdiagno <n>` | int | 0 | Set debug/diagnostic level |

### Configuration Interactions

> [!gotcha] `--reg` is required even for format-only conversion with `--noedit`
> Even when using `--noedit` purely to convert an FSL or LTA registration to a `register.dat`, `--reg` must be specified (it specifies the output file). Not providing `--reg` (and not using `--fstal` or `--check-reg`) will cause the tool to fail when it tries to write the output.

> [!gotcha] `--regheader` ignores the contents of `--reg`
> When `--regheader` is specified, the initial registration is computed from the volume headers via `MRItkRegMtx()`. Any existing `--reg` file is not read for the initial matrix. However, the path is still used as the output file when the registration is saved.

> [!gotcha] `--fstal` overrides `--mov` and `--reg`
> When `--fstal` is set, the movable volume is hard-coded to `$FREESURFER_HOME/average/mni305.cor.mgz` regardless of `--mov`. The registration file is set to `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm`. Specifying `--reg` with `--fstal` has no effect.

> [!gotcha] Non-conformant targets are silently resliced internally
> If the target is not 256³ at 1 mm isotropic, `tkregister2` creates an internal COR-conformant copy and reslices the target voxel data to it. The original header is retained for FSL-matrix conversion purposes (`targ_vol0`). This reslice is not saved to disk; the saved registration always refers to the original target.

> [!gotcha] `--mov-orientation` only takes effect with `--regheader`
> The orientation string supplied by `--mov-orientation` is applied via `MRIorientationStringToDircos()` to set the movable volume's direction cosines. However, if `--regheader` is not also specified, the header-computed registration is not used, and the orientation override has no practical effect on the initial registration matrix.

> [!gotcha] `--no-zero-cras` changes talairach convention
> By default (`ZeroCRAS = 1`), `--fstal` zeros the target c_ras before matrix construction to centre the target properly. This is correct for most subjects. If the target was acquired with a non-standard c_ras encoding, `--no-zero-cras` may be needed. The correction is absorbed into `RegMat = xfm * Mcras0` and will affect the saved `.xfm` file.

> [!gotcha] Old `tkregister` matrices are automatically corrected
> Matrices saved by the legacy `tkregister` tool used a truncation float2int method (`FLT2INT_TKREG`). `tkregister2` detects these (by the `tkregister` token in the file) and applies `MRIfixTkReg()` to shift the matrix by half a voxel in the appropriate direction. Use `--nofix` to suppress this.

## Typical Use Cases

### Check Talairach registration interactively

```bash
tkregister2 --s bert --fstal
```

Opens the GUI showing the T1 and the MNI305 atlas. Edits are saved back to `talairach.xfm`.

### Check bbregister output without GUI

```bash
tkregister2 --mov func.mgz \
            --targ $SUBJECTS_DIR/bert/mri/T1.mgz \
            --reg register.dat \
            --check-reg \
            --noedit
```

Prints the registration matrix and exits without opening a GUI.

### Convert FSL to register.dat

```bash
tkregister2 --mov func.nii.gz \
            --targ $SUBJECTS_DIR/bert/mri/T1.mgz \
            --fsl func_to_T1.mat \
            --reg func_to_T1.dat \
            --noedit
```

Converts an FSL/FLIRT matrix to FreeSurfer `register.dat` format.

### Convert register.dat to LTA

```bash
tkregister2 --mov func.nii.gz \
            --targ $SUBJECTS_DIR/bert/mri/T1.mgz \
            --reg register.dat \
            --ltaout func_to_T1.lta \
            --noedit
```

### Interactively register a functional to structural

```bash
tkregister2 --mov func.mgz \
            --targ $SUBJECTS_DIR/bert/mri/T1.mgz \
            --reg register.dat \
            --surf white
```

Opens GUI with the white surface overlay. User toggles between volumes ('t' / 'm' keys) and adjusts registration with arrow keys and rotation controls.

### Register with header information as starting point

```bash
tkregister2 --mov epi.nii.gz \
            --fstarg \
            --s bert \
            --regheader \
            --reg register.dat
```

Initializes from header geometry; target is `bert/mri/T1.mgz`.

## Pipeline Context

`tkregister2` is not called directly by `recon-all` in the main reconstruction pipeline (the Talairach step uses `mri_em_register`). However, it is used as a checking and manual correction tool for the Talairach registration:

```bash
recon-all -s bert -talairach-only  # creates talairach.xfm
tkregister2 --s bert --fstal        # check and optionally correct it
```

> [!gap] Whether `recon-all` calls `tkregister2` internally
> Older versions of `recon-all` called `tkregister2 --noedit` to convert registration formats during the pipeline. Whether the current (v8.2.0) `recon-all` still does this is not confirmed from reading the C++ source alone; the `recon-all` shell script would need to be checked.

## Gotchas and Caveats

> [!gotcha] register.dat convention is target→movable (reversed)
> The matrix in `register.dat` maps from **target tkRAS** to **movable tkRAS**, which is the reverse of what you might expect. This means that to resample the movable volume into target space, you need the inverse of the stored matrix. This convention is a historical artefact from the original `tkregister` design. The FreeSurfer utilities (`mri_vol2surf`, `mri_binarize` etc.) that consume `register.dat` handle this correctly.

> [!gotcha] `tkregister2` requires a display
> The GUI mode requires a connected X11 display (and OpenGL support). On headless servers, use `--noedit` for all operations. If the `NO_GUI` flag was set at compile time, the binary always behaves as if `--noedit` is specified.

> [!gotcha] The FSL output type depends on environment
> The `--fslregout` output sign convention depends on `FSLOUTPUTTYPE`. If this variable is not set, the output may be incorrect for use with FSL tools.

> [!gotcha] `--surf` requires a valid subject directory
> The surface overlay (`--surf`) is loaded from `$SUBJECTS_DIR/<subjectid>/surf/`. The `subjectid` is taken from `--reg` file (first line) or from `--s`. If either is missing or the surface files do not exist, `tkregister2` will exit with an error.

## Related Tools

- [[coordinate-systems]] — full explanation of tkRAS, scanner RAS, and the register.dat matrix convention
- [[lta-format]] — the LTA format for the same transforms; `lta_convert` can interconvert with `register.dat`
- [[lta_convert]] — preferred tool for batch format conversions among LTA, FSL, MNI, and register.dat
- [[freeview]] — modern GUI replacement for interactive registration visualization; `tkregisterfv` is a wrapper that calls freeview
- [[bbregister]] — boundary-based registration tool that produces `register.dat` output; results can be checked with `tkregister2`
- [[mri_coreg]] — another registration tool that can output LTA; can be converted to `register.dat` via `lta_convert`

## Confidence and Gaps

Medium confidence. The command-line parsing, matrix construction logic, and coordinate-system conventions are derived directly from `tkregister2.cpp`. The GUI interaction logic is in the Tcl script and not fully covered here.

> [!gap] GUI keyboard shortcuts
> The interactive editing commands (arrow keys, rotation, scaling, etc.) are implemented in `tkregister2.tcl` and are not documented here. Users needing interactive editing details should consult the FreeSurfer wiki at https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/Talairach or the `--help` output.

> [!gap] float2int methods
> The `float2int` code stores legacy constants (`FLT2INT_ROUND`, `FLT2INT_TKREG`). The exact numerical shift applied by `MRIfixTkReg()` and the conditions under which it is required need confirmation against the `registerio.cpp` source.

> [!gap] `--fstal` ZeroCRAS interaction
> The default `ZeroCRAS = 1` behaviour zeroes the target c_ras and applies a correction matrix. The conditions under which `--no-zero-cras` is necessary (i.e., what subject/acquisition configurations break the default) are not fully documented.
