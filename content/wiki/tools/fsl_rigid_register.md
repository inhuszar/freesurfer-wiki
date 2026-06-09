---
title: "fsl_rigid_register"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsl_rigid_register"
families: []                     # FSL-bridge wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[fslregister]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
  - "[[tkregister2]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Behaviour of the FLIRT 5.4.2b schedule-file workaround on modern FSL builds (FLIRT >= 6) is not exercised; the version-string match almost never fires today."
tags:
  - registration
  - fsl
  - flirt
  - rigid
---

# fsl_rigid_register

## Summary

`fsl_rigid_register` is a tcsh front-end that drives FSL's **FLIRT** linear
registration program to align one volume (the *input/moveable* volume) to a
reference/target volume, resample the input into the reference space, and
optionally export the resulting transform in FreeSurfer's native registration
formats. By default it computes a **rigid** (6 degree-of-freedom) registration,
initialised from the header geometry, and writes the FLIRT/FSL matrix next to
the output volume. It transparently converts the input, reference, and output
between FreeSurfer formats (e.g. `mgz`) and the NIfTI/Analyze that FLIRT
consumes, and can additionally emit the transform as a FreeSurfer
[register.dat](#outputs), an MNI `.xfm`, or an MGH [[lta-format|`.lta`]] file.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsl_rigid_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/fsl_rigid_register`
- **External dependency:** **FSL** — calls `flirt.fsl` (the FreeSurfer-bundled FLIRT wrapper). FSL/FLIRT must be installed and on `PATH`.
- **Key FreeSurfer helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L104) (format conversion), [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L134) (geometry-based initial matrix and FLIRT↔tkreg matrix conversion), [`mri_copy_params`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L219) (copy pulse-sequence parameters to the output), and the shell utilities `isnifti` and `fs_temp_file`.

## Purpose and Context

FreeSurfer and FSL describe inter-volume registration with **different matrix
conventions**. FLIRT works in FSL's "FLIRT space" (derived from the voxel grids
and a left-handed convention tied to the Analyze/NIfTI sform), whereas
FreeSurfer's tools consume a **tkregister (tkreg) `register.dat`** matrix that
maps the reference's tkreg-RAS to the moveable's tkreg-RAS. `fsl_rigid_register`
exists to bridge those two worlds: it lets a user run FLIRT but obtain a result
usable everywhere in the FreeSurfer stream, and it hides the file-format and
matrix-convention conversions behind a single command line. See
[[coordinate-systems]] for the underlying RAS/tkreg/scanner distinctions and
[[registration-overview]] for how the FreeSurfer registration ecosystem fits
together.

It is normally run **by hand** or **by other FreeSurfer scripts**, not by
[[wiki/pipelines/recon-all|recon-all]]. Several higher-level registration
wrappers call it internally — notably [[mri_motion_correct.fsl]] (motion
correction of multi-acquisition data), `spmregister` (as an FSL fallback when
SPM is unavailable), and `lpcregister`. Its sibling [[fslregister]] is a
more specialised variant aimed at registering a functional/other volume to a
subject's FreeSurfer anatomical inside `$SUBJECTS_DIR`.

## Inputs

### Required Inputs

- **Reference / target volume** (`-r`) — the fixed volume the input is aligned
  *to*. Any format [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L104) can read (`mgz`, `nii`, `nii.gz`, Analyze, COR, …). Required even
  with `-applyxfm`, because its geometry defines the output grid
  ([`scripts/fsl_rigid_register:458-462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L458-L462)).
- **Input / moveable volume** (`-i`) — the volume that is registered and
  resampled. Same format freedom as the reference.
- **Output volume** (`-o`) — the path where the input, resampled into the
  reference space, is written. The extension selects the output format
  (conversion is automatic).

### Input Assumptions

> [!assumption] Header geometry must be correct
> By default (`-initgeom`, on) the initial FLIRT matrix is derived from the
> direction-cosine/geometry information in the reference and input **headers**
> via [`tkregister2_cmdl --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L132-L143). If the geometry in either header is
> wrong (e.g. a mislabelled orientation, or an Analyze file that lost its
> direction cosines), the initialisation — and therefore the registration — can
> be badly off. The script's own help notes that Analyze does not retain
> direction-cosine information, which is precisely why the geometry-based init
> exists.

- The input and reference are converted to **NIfTI/Analyze** before FLIRT is
  run; FLIRT itself is invoked on `.hdr` (Analyze) basenames
  ([`scripts/fsl_rigid_register:170-177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L170-L177)).
- The default cost (`corratio`) assumes the two volumes have a usable mutual
  intensity relationship; for same-contrast same-subject data this is a sound
  default.

## Outputs

### Files Created

| File / pattern | When | Contents |
|----------------|------|----------|
| **output volume** (`-o`) | always | the input resampled into the reference space, in the format implied by the `-o` extension |
| `<outvol>.fslmat` | when **not** `-applyxfm` | the FLIRT/FSL registration matrix (FSL convention). Path overridable with `-fslmat` ([`scripts/fsl_rigid_register:489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L489), [`227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L227)) |
| register.dat (`-regmat`) | with `-regmat` | the transform as a FreeSurfer tkreg `register.dat` (subject name set only if `-subject` given) |
| `.xfm` (`-xfmmat`) | with `-xfmmat` | the transform as an MNI/Talairach-style `.xfm` |
| [[lta-format\|`.lta`]] (`-ltamat`) | with `-ltamat` | the transform as an MGH Linear Transform Array |

> [!gotcha] The `.fslmat` / register.dat / `.xfm` / `.lta` exports are skipped under `-applyxfm`
> All of the matrix-export logic (and the `<outvol>.fslmat` copy) lives inside an
> `if($#applyxfm == 0)` block ([`scripts/fsl_rigid_register:225-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L225-L258)). When you
> run in apply mode you are *using* an existing matrix, so no new matrix is
> produced or converted.

### Output Specifications

The output volume inherits the **reference's geometry** (grid, resolution,
orientation). After the FSL→FreeSurfer conversion of the resampled volume,
[`mri_copy_params --pulse`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L219) copies the **pulse-sequence parameters**
(TR/TE/TI/flip etc.) from the original input onto the output, so the output
keeps the moveable volume's acquisition metadata even though it sits on the
reference grid. The exported matrices encode a **reference→moveable** mapping in
their respective conventions; see [[coordinate-systems]] for the FLIRT vs.
tkreg distinction.

## Mathematical Foundations

The numerical work — multi-resolution optimisation of the chosen cost function
over a 6-DOF (or `-dof`) affine — is performed entirely by **FSL FLIRT**, not by
this script. `fsl_rigid_register` contributes two pieces of FreeSurfer-side
linear algebra, both delegated to [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L134):

> [!math] Geometry-based initial matrix
> The starting FLIRT matrix is the header-geometry registration
> ($\texttt{--regheader}$): the rigid transform implied purely by the two
> volumes' vox→RAS (scanner) matrices, exported to FSL convention with
> `--fslregout` ([`scripts/fsl_rigid_register:132-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L132-L143)). This places the
> volumes in approximately the correct relative pose so FLIRT only has to refine.

> [!internal] FLIRT ↔ tkreg matrix conversion
> The conversions between the FSL/FLIRT matrix and FreeSurfer's tkreg
> `register.dat` / `.xfm` / `.lta` are done by `tkregister2_cmdl`
> (`--fslreg`/`--fslregout`, `--xfmout`, `--ltaout`). The actual conversion math
> (which folds in the voxel sizes and the left-/right-handedness of the FSL
> convention) lives in that tool and the shared registration library, not here.
> See [[tkregister2]] and [[lta_convert]].

The search ranges passed to FLIRT are symmetric about the initial pose:
$\pm\,\texttt{maxangle}$ degrees on each of `searchrx`/`searchry`/`searchrz`
([`scripts/fsl_rigid_register:173-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L173-L175)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/fsl_rigid_register:290-450`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L290-L450)). Note these are **single-dash** flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-r` | string | *(required)* | Reference/target volume (any `mri_convert`-readable format). Required even with `-applyxfm`. |
| `-i` | string | *(required)* | Input/moveable volume to register and resample. |
| `-o` | string | *(required)* | Output volume: the input resampled into the reference space; extension picks the format. |
| `-fslmat` | string | `<outvol>.fslmat` | Write the FLIRT/FSL matrix to this path instead of the default beside the output. |
| `-regmat` | string | — | Also convert the transform to a FreeSurfer tkreg `register.dat` and write it here. |
| `-xfmmat` | string | — | Also convert the transform to an MNI/Talairach `.xfm` file. |
| `-ltamat` | string | — | Also convert the transform to an MGH [[lta-format\|`.lta`]] file. |
| `-subject` | string | `doesnotmatter` (init only) | Subject name written *into* the `register.dat` only; does not affect the registration. |
| `-interp` | string | `trilinear` | FLIRT resampling interpolation: `trilinear`, `nearestneighbour`, or `sinc`. |
| `-dof` | int | `6` | Degrees of freedom for FLIRT. 6 = rigid; raise (e.g. 12) for affine. |
| `-bins` | int | `256` | Number of histogram bins for the FLIRT cost function. |
| `-cost` | string | `corratio` | FLIRT cost function. Validated against `mutualinfo corratio normcorr normmi leastsq`; an unrecognised value is a hard error ([`scripts/fsl_rigid_register:354-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L354-L366)). |
| `-maxangle` | float (deg) | `90` | Constrain the FLIRT search to ±`maxangle` degrees about the initial pose on each rotation axis. |
| `-initgeom` | bool | **on** | Compute the initial matrix from header geometry (default). |
| `-noinitgeom` | bool | — | Do **not** initialise from geometry; FLIRT starts from identity (or `-initxfm`). |
| `-initxfm` | string (FSL mat) | — | Use this FSL matrix as the FLIRT starting point. File must exist; forces `-noinitgeom`. |
| `-applyinitxfm` | bool | off | Do not register — just apply the geometry-derived initial matrix to resample the input. Requires `-initgeom`. |
| `-applyxfm` | string (FSL mat) | — | Do not register — apply the supplied FSL matrix (FLIRT `-applyxfm`) to resample the input. File must exist; forces `-noinitgeom`. |
| `-left-right-reverse` | bool | off | Left–right reverse the input before registration **and switch to 12 DOF**. Prints a loud warning. Use only deliberately. |
| `-tmp`<br>`-tmpdir` | string | `<outdir>/fsl_rigid_register.$$` | Temporary working directory; setting it implies `-nocleanup`. |
| `-nocleanup` | bool | off | Keep the temporary directory and intermediate files. |
| `-cleanup` | bool | **on** | Delete temporaries at the end (default). |
| `-verbose` | bool | off | Set tcsh `verbose`. |
| `-echo` | bool | off | Set tcsh `echo` (command tracing). |
| `-debug` | bool | off | Both `verbose` and `echo`. |
| `-umask` | string | — | Apply this `umask` for created files. |
| `-version` | bool | — | Print version and exit. |
| `-help` | bool | — | Print full help (the `BEGINHELP` block) and exit. |

> [!gotcha] `-nocleanup` / `-cleanup` set the wrong variable
> The `-nocleanup` and `-cleanup` cases set a variable named `nocleanup`
> ([`scripts/fsl_rigid_register:421-427`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L421-L427)), but the actual cleanup decision at
> the end of the script tests `$cleanup` ([`scripts/fsl_rigid_register:261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L261)).
> Consequently `-nocleanup` does **not** keep the temporary directory; only
> supplying an explicit `-tmp`/`-tmpdir` (which sets `cleanup = 0`) reliably
> preserves the intermediates. Treat `-nocleanup` as non-functional here.

### Configuration Interactions

The three initialisation/apply modes are mutually constrained, and `check_params`
enforces the conflicts ([`scripts/fsl_rigid_register:474-487`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L474-L487)):

> [!gotcha] `-initxfm`, `-initgeom`, and `-applyxfm` are mutually exclusive
> The script errors on any of these combinations:
> `-initxfm` + `-applyxfm`; `-initgeom` (the default!) + `-applyxfm`;
> `-initxfm` + `-initgeom`. Because `-initgeom` is **on by default**, supplying
> `-applyxfm` or `-initxfm` *requires* that you have not re-enabled `-initgeom`
> — both `-applyxfm` and `-initxfm` set `initgeom = 0` themselves, so passing
> them alone is fine, but explicitly adding `-initgeom` will trip the error.

- **`-applyxfm` vs `-applyinitxfm`.** `-applyinitxfm` keeps the geometry init on,
  computes the geometry matrix, then *applies* it (no optimisation):
  internally it copies the init matrix into `applyxfm`
  ([`scripts/fsl_rigid_register:147-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L147-L150)). `-applyxfm <file>` instead applies an
  externally supplied FSL matrix. The two answer different "resample-only"
  needs.
- **`-left-right-reverse` overrides `-dof`.** It unconditionally sets `dof = 12`
  ([`scripts/fsl_rigid_register:412-415`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L412-L415)); a `-dof 6` given alongside it is
  effectively ignored for the reversal case.
- **Matrix exports require registration.** `-regmat`, `-xfmmat`, and `-ltamat`
  are honoured only when *not* in apply mode (see the output gotcha above).
- **`-fslmat` default depends on `-o`.** If `-fslmat` is omitted it defaults to
  `<outvol>.fslmat` ([`scripts/fsl_rigid_register:489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L489)).

## Typical Use Cases

### Use Case 1: Rigidly register two same-subject volumes and get an LTA

```bash
# Align a second acquisition (mov) to a reference, resample, and export an .lta
fsl_rigid_register -r ref.mgz -i mov.mgz -o mov_in_ref.mgz \
  -ltamat mov_to_ref.lta
```

Computes a 6-DOF FLIRT registration (geometry-initialised), writes the resampled
volume and `mov_in_ref.mgz.fslmat`, and converts the transform to an MGH
[[lta-format|`.lta`]] usable by downstream FreeSurfer tools.

### Use Case 2: Reuse an existing FSL matrix to resample only

```bash
# No registration: just apply a known FLIRT matrix to resample the input
fsl_rigid_register -r ref.mgz -i mov.mgz -o mov_resampled.mgz \
  -applyxfm mov_to_ref.fslmat -interp nearestneighbour
```

Useful for applying a previously computed transform to a label/segmentation
volume with nearest-neighbour interpolation.

### Use Case 3: Affine (12-DOF) registration with mutual information

```bash
fsl_rigid_register -r t1.mgz -i t2.mgz -o t2_in_t1.mgz \
  -dof 12 -cost mutualinfo -regmat t2_to_t1.dat -subject bert
```

A cross-contrast affine registration, exporting a FreeSurfer `register.dat`
stamped with the subject name `bert`.

## Pipeline Context

`fsl_rigid_register` is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. It is a general-purpose FSL-bridge
utility that sits *inside* other registration wrappers:

**Predecessors (callers):** [[mri_motion_correct.fsl]], `spmregister`
(FSL fallback path), `lpcregister`, `thickdiffmap` →
**This tool** → it calls `flirt.fsl` (FSL) and `tkregister2_cmdl`, producing a
transform consumed by **successors** such as [[wiki/tools/mri_convert|mri_convert]]/`mri_vol2vol`
resampling, [[bbregister]] (which may use an `fsl`-derived init), or any tool
that reads a `register.dat`/[[lta-format|`.lta`]].

Within FreeSurfer it is the lower-level, `$SUBJECTS_DIR`-agnostic cousin of
[[fslregister]]: `fsl_rigid_register` registers an arbitrary input to an
arbitrary reference, whereas [[fslregister]] registers a moveable volume to a
named subject's anatomical.

## Gotchas and Caveats

> [!gotcha] FLIRT operates on Analyze `.hdr`, which loses direction cosines
> FLIRT is invoked on Analyze `.hdr` basenames ([`scripts/fsl_rigid_register:170-177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L170-L177)).
> Analyze cannot store direction cosines, which is exactly why the geometry-based
> initial matrix (`-initgeom`, default on) is important — it carries the
> orientation information FLIRT would otherwise lack. Disabling it
> (`-noinitgeom`) on poorly-oriented data invites large misregistrations.

> [!gotcha] FLIRT 5.4.2b schedule-file workaround
> If `flirt.fsl -version` reports exactly `FLIRT version 5.4.2b`, the script
> injects `-schedule $FREESURFER_HOME/bin/flirt.newdefault.20080811.sch`
> ([`scripts/fsl_rigid_register:185-194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L185-L194)) to force an identity starting matrix at
> both the 4 mm and 1 mm phases — a fix for a known bug in that specific FLIRT
> release. On any other FLIRT version this branch is skipped.

> [!gotcha] COR output directory must pre-exist
> The script's own BUGS note: if you write to a `COR` volume, the `COR`
> directory must already exist before running ([`scripts/fsl_rigid_register:605-609`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L605-L609)).

> [!gotcha] `-left-right-reverse` silently changes DOF and flips your data
> It both mirrors the input volume and forces 12 DOF. This is occasionally
> needed to recover from a left–right labelling problem, but it permanently
> reverses the moveable data going into the registration — use only when you
> are certain that is what you want.

## Error Compensation and Guard Rails

- **Automatic format conversion.** Inputs/reference/output are converted between
  FreeSurfer formats and NIfTI/Analyze as needed via
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L104); a volume already in NIfTI is left as-is
  ([`scripts/fsl_rigid_register:93-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L93-L110), [`113-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L113-L129)).
- **Geometry-based initialisation** compensates for Analyze's lack of direction
  cosines (default on).
- **Cost-function validation.** An unrecognised `-cost` aborts with the list of
  valid choices rather than silently passing junk to FLIRT.
- **Pulse-parameter preservation.** [`mri_copy_params --pulse`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L219) restores the
  input's acquisition metadata onto the resampled output.
- **FLIRT version workaround** (5.4.2b schedule file) auto-applies when needed.

## Known Bugs

- [[00164]] — `-nocleanup`/`-cleanup` set an unread variable `nocleanup`, but cleanup tests `$cleanup`, so `-nocleanup` is a no-op and temp files are always deleted.

## Related Tools

- [[fslregister]] — sibling FSL/FLIRT wrapper that registers a moveable volume to a **named subject's** FreeSurfer anatomical and writes a `register.dat`.
- [[bbregister]] — boundary-based registration; the preferred modern within-subject functional/anatomical registration, often initialised from an FSL/FLIRT result.
- [[tkregister2]] — provides the FLIRT↔tkreg matrix conversion (`tkregister2_cmdl`) used here for init and export.
- [[lta_convert]] — converts among `.lta`, `register.dat`, FSL, and other transform formats; the modern standalone alternative to the in-script conversions.
- [[wiki/tools/mri_convert|mri_convert]] — performs the FreeSurfer↔NIfTI/Analyze conversions wrapping FLIRT.
- [[mri_motion_correct.fsl]] — a caller: per-frame motion correction that uses `fsl_rigid_register` for each alignment.
- [[coordinate-systems]] — background on the FLIRT vs. tkreg vs. scanner-RAS conventions this tool bridges.

## Confidence and Gaps

**High confidence:** complete flag set (single-dash), the three init/apply
modes and their mutual-exclusion rules, default cost/bins/dof/maxangle, the
matrix-export paths (`.fslmat`/register.dat/`.xfm`/`.lta`) and that they are
skipped under `-applyxfm`, the `mri_copy_params` step, and the format
auto-conversion — all read directly from
[`scripts/fsl_rigid_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register).

> [!gap] FLIRT 5.4.2b workaround on modern builds
> The schedule-file injection is keyed to the exact version string
> `FLIRT version 5.4.2b`. On current FSL releases (FLIRT ≥ 6) this branch never
> fires; whether the equivalent identity-init behaviour is needed there was not
> tested.

## References

- FreeSurfer source: [`scripts/fsl_rigid_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register) (v8.2.0).
- Built-in help: `fsl_rigid_register -help` (the `BEGINHELP` block, [`scripts/fsl_rigid_register:547-609`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L547-L609)).
- FSL FLIRT: Jenkinson M, Smith SM. *A global optimisation method for robust affine registration of brain images.* Medical Image Analysis 5(2):143–156, 2001. https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLIRT
