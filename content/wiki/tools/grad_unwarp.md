---
title: "grad_unwarp"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh wrapper around MATLAB
source_files:
  - "scripts/grad_unwarp"
families: []                     # legacy gradient-unwarp wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_gradunwarp]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Behaviour is determined by the MATLAB backend convert_unwarp_resample.m, which was read at its header/argument level only — the offset-table interpolation math lives there and in unwarp_resample.m."
  - "The four gradient-coil offset tables (BRM/CRM/Sonata/Allegra) are large external data files located via getenv('DEV'); their on-disk availability in a v8.2.0 install is not verified."
tags:
  - distortion-correction
  - gradient-nonlinearity
  - gradient-unwarping
  - matlab
  - dicom
  - legacy
---

# grad_unwarp

## Summary

`grad_unwarp` corrects **gradient-coil non-linearity** distortion: the geometric warping that arises because an MRI scanner's gradient fields are not perfectly linear away from isocentre. It is a tcsh wrapper that drives a MATLAB engine (`convert_unwarp_resample.m`): it reads a DICOM file/directory or an MGH volume, looks up a per-scanner **displacement offset table**, resamples the volume to remove the distortion (with optional Jacobian intensity correction), and writes an MGH (or COR) output. It can also act as a plain DICOM→MGH converter, though [[wiki/tools/mri_convert|mri_convert]] is faster and preferred for that.

> [!contradiction] Legacy MATLAB tool vs. modern C++ `mri_gradunwarp`
> `grad_unwarp` (this page) is the **legacy** gradient-unwarping path: a tcsh
> script that requires MATLAB plus the Image Processing Toolbox and uses
> precomputed offset tables for a handful of named coils. FreeSurfer 8 also ships
> [[mri_gradunwarp]], a self-contained **C++** tool that reads a Siemens
> spherical-harmonic gradient-coefficient file and computes the displacement
> field directly (no MATLAB, no offset tables). For new work prefer
> [[mri_gradunwarp]]; `grad_unwarp` is documented here for completeness and for
> the specific coils whose tables it carries.

## Source Information

- **Language:** tcsh shell script wrapping MATLAB
- **Source file:** [`scripts/grad_unwarp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp)
- **Binary/script location:** `$FREESURFER_HOME/bin/grad_unwarp`
- **Original author:** Silvester Czanner (MATLAB backend by Elizabeth Haley)
- **MATLAB backend:** [`matlab/convert_unwarp_resample.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/convert_unwarp_resample.m), reached via `addpath $DEV/matlab` where `$DEV` defaults to `$FREESURFER_HOME` ([`scripts/grad_unwarp:107-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L107-L114)). That function in turn uses `unwarp_init_globals.m`, `unwarp_resample.m`, the offset `table.mat`, and the FreeSurfer MGH/DICOM MATLAB I/O.
- **External dependencies:** **MATLAB** (≥ 6.5 per the help) **with the Image Processing Toolbox**; for `-cor` output it also calls [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L147). Does **not** require FSL.

## Purpose and Context

Gradient non-linearity bends straight anatomy into curves, with the effect growing toward the edges of the field of view. Because the warp is a fixed property of the gradient coil, it can be corrected from a precomputed **offset table** that says, for each output voxel, where to sample in the input volume. `grad_unwarp` performs that table-driven resampling. Historically it predates [[wiki/tools/mri_convert|mri_convert]]'s and [[mri_gradunwarp]]'s capabilities and was the FreeSurfer route for dewarping data from specific 1.5 T GE and Siemens systems.

It is a stand-alone utility — **not** part of [[wiki/pipelines/recon-all|recon-all]] — typically run once on an anatomical/functional volume before further processing. As a converter it offers two niche advantages over older `mri_convert` (per the help): it forces the GE Z-offset correction, and it is "probably correct," though it differs from `mri_convert` by half a voxel in the `c_ras`/vox2ras it computes (see gotcha).

## Inputs

### Required Inputs

- **`-i infile`** — a DICOM **file**, a DICOM **directory**, or an **MGH** volume. (For a DICOM directory, also give `-s seriesno`.)
- **`-o outfile`** — output path; MGH by default, or a COR directory if `-cor` is set.

### Input Assumptions

> [!assumption] Coil identity must be known; MGH input requires an explicit type
> When the input is DICOM from a recognised scanner, the gradient-coil type is
> inferred from the headers (Siemens `ManufacturersModelName`; GE via
> `ScannerSerialNumber`, falling back to `(InstitutionName, StationName)`). When
> the input is an **MGH** volume the headers are gone, so the user **must** name
> the coil with `-unwarp <type>` (help, [`scripts/grad_unwarp:340-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L340-L345)).
> Supported names: `sonata`, `trio`, `allegra` (Siemens), `brm`, `crm` (GE),
> case-insensitive; or a full path to an offset file.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `outfile` (`-o`) | MGH (default) | the unwarped (and/or converted) volume |
| `outfile/` (with `-cor`) | COR directory | unwarped volume rewritten to COR by a final `mri_convert` |
| `grad_unwarp.log` | text | run log in the output directory (`grad_unwarp.log.old` on re-run) |
| `grad_unwarp_<pid>.mgh` | MGH (temp) | intermediate MGH written by MATLAB when `-cor` is requested, then converted and removed |

### Output Specifications

By default the output is an MGH volume on the input grid with the gradient distortion removed. With `-corfov` the volume is resampled to the COR field of view (256³, 1 mm³); the older recentring-on-isocentre bug noted in the source is fixed as of `convert_unwarp_resample.m` v1.6, so the output now keeps the input `c_ras` ([`scripts/grad_unwarp:518-526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L518-L526)). With `-cor` the final volume is COR-format uchar (0–255) produced by [[wiki/tools/mri_convert|mri_convert]].

## Mathematical Foundations

The correction is a **table-driven resampling**. For each output voxel, the per-coil offset table gives a (generally non-integer) location in the input volume; the value there is obtained by interpolation. Two interpolations are involved:

- **In the offset table:** trilinear (fixed) — to evaluate the displacement at an arbitrary output voxel.
- **In the input volume:** user-selectable via `-interp` (`cubic` default, or `linear`/`nearest`/`spline`; MATLAB `interp3` names).

An optional **Jacobian intensity correction** (`-jac`, on by default) rescales intensities so that regions stretched by the unwarp (which gain area/volume) are dimmed and compressed regions brightened, preserving total signal:

$$ I_{\text{corr}}(x) = I_{\text{warp}}(x)\,\bigl|\det J(x)\bigr|, $$

where $J$ is the Jacobian of the displacement field. `-nojac` skips this step.

> [!internal] The offset-table lookup and resampling live in MATLAB
> The actual displacement evaluation, Jacobian, and `interp3` resampling are in
> [`matlab/convert_unwarp_resample.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/convert_unwarp_resample.m) and its helpers
> (`unwarp_resample.m`, `unwarp_init_globals.m`, and the per-coil `table.mat`
> located via `getenv('DEV')`). The tcsh script only marshals arguments and emits
> the MATLAB driver. The deep numerics were not independently re-derived here.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/grad_unwarp:170-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L170-L284)). Boolean flags take no argument. Note: flags use a **single** leading dash.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` | string | *(required)* | Input: DICOM file, DICOM directory, or MGH volume. |
| `-o` | string | *(required)* | Output volume (MGH) or COR directory (with `-cor`). |
| `-s` | int | `0` | DICOM series number — needed only when `-i` is a DICOM **directory**. |
| `-unwarp` `[type]` | string (opt.) | off | Enable gradient unwarping. Optional `type` selects the coil offset table (`sonata`/`trio`/`allegra`/`brm`/`crm`, or a file path). For MGH input the type is mandatory; for recognised DICOM it can be omitted. |
| `-jac` | bool | **on** | Apply Jacobian intensity correction (the default). |
| `-nojac` | bool | — | Skip Jacobian intensity correction. |
| `-corfov` | bool | off | Resample to the COR field of view (256³, 1 mm³). Recommended whenever combining `-unwarp` with `-cor` to avoid two interpolation stages. |
| `-cor` | bool | off | Write COR format instead of MGH (final step via `mri_convert`). Use with `-corfov`. |
| `-noscale` | bool | off | When converting to COR, pass `mri_convert --no_scale 1 --no_conform` so the data type is preserved rather than rescaled to uchar. (Help text disabled; "probably doesn't work" — see gotcha.) |
| `-interp` | string | `cubic` | Input-volume interpolation: `cubic`, `linear`, `nearest`, or `spline` (MATLAB `interp3`). The script's validity check is commented out, so other strings are passed through unchecked. |
| `-matlab` | string | `matlab` | MATLAB binary to invoke. |
| `-monly` | string | off | "MATLAB only": write the generated `.m` driver to this file and **do not run** MATLAB (for debugging). |
| `-mydev` | bool | off | Developer: use the pre-existing `$DEV` instead of pointing it at `$FREESURFER_HOME`. |
| `-ebethdev` | bool | off | Developer: set `$DEV` to a hard-coded `/space/lyon/...` path. |
| `-umask` | string | — | Apply this `umask` before writing outputs. |
| `-verbose` | bool | off | Verbose. |
| `-echo` | bool | off | `set echo`. |
| `-debug` | bool | off | `set echo` + verbose. |
| `-version` | bool | — | Print version and exit. |
| `-help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `-cor` without `-corfov` causes two interpolations
> If you unwarp **and** request COR output, the MATLAB stage resamples once and
> then `mri_convert` resamples again to COR. Adding `-corfov` makes the MATLAB
> stage resample directly to the COR FOV, so only one interpolation occurs
> (help, [`scripts/grad_unwarp:426-428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L426-L428), [`scripts/grad_unwarp:481-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L481-L486)).

> [!gotcha] MGH input requires `-unwarp <type>`
> The tcsh `check_params` does **not** enforce this — it is enforced by the
> MATLAB backend ([`scripts/grad_unwarp:319-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L319-L323) explicitly notes the script
> does not check). Omitting the type on an MGH input fails inside MATLAB, not at
> argument parsing.

> [!gotcha] `-s` is meaningful only for DICOM directories
> When `-i` is a single DICOM file or an MGH volume, `-s` is ignored. It selects
> the series only when scanning a directory.

Other interactions:

- `-noscale` only takes effect when `-cor` is also given (it modifies the final `mri_convert` to COR). Its help line is commented out because it "probably doesn't work" ([`scripts/grad_unwarp:349-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L349-L350)).
- `-monly` short-circuits execution entirely: the MATLAB file is written but nothing runs, so no output volume is produced.
- `-mydev`/`-ebethdev` only change where the MATLAB code and offset tables are loaded from; ordinary users should use neither (the default `$DEV = $FREESURFER_HOME`).

## Typical Use Cases

### 1. Dewarp a DICOM acquisition to MGH (coil auto-detected)

```bash
# Single DICOM file, recognised scanner — type inferred from headers
grad_unwarp -i dicomfile -unwarp -o out.mgh
```

### 2. Dewarp from a DICOM directory, selecting a series

```bash
grad_unwarp -i dicomdir -s 5 -unwarp -o out.mgh
```

### 3. Dewarp an MGH volume (type required)

```bash
# Headers are gone, so name the coil explicitly
grad_unwarp -i invol.mgh -unwarp sonata -o out.mgh
```

### 4. Dewarp and write COR cleanly (single interpolation)

```bash
grad_unwarp -i dicomdir -s 5 -unwarp crm -corfov -cor -o cordir
```

## Pipeline Context

`grad_unwarp` is a stand-alone preprocessing/conversion utility. It is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** raw DICOM (or an MGH already converted by [[wiki/tools/mri_convert|mri_convert]] `-zgez` for GE) → **grad_unwarp** → **Successor:** [[wiki/pipelines/recon-all|recon-all]] or any downstream FreeSurfer analysis on the dewarped volume. For modern gradient unwarping the recommended replacement is [[mri_gradunwarp]].

> [!gotcha] For GE volumes, force the Z-offset correction before/around dewarping
> GE scanners move the table to centre the FOV in Z, but the DICOM `c_s` should
> be 0. `grad_unwarp` applies this internally for DICOM input; if you convert with
> `mri_convert` first, you must use `-zgez`/`--zero_ge_z_offset`, or any dewarp on
> that MGH will be wrong (help, [`scripts/grad_unwarp:405-411`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L405-L411)).

## Gotchas and Caveats

> [!gotcha] Half-voxel disagreement with mri_convert
> When loading DICOM, `grad_unwarp` and [[wiki/tools/mri_convert|mri_convert]]
> compute `c_ras` (and the vox2ras matrix) that differ by **half a voxel**; the
> help states it has not been determined which is correct
> ([`scripts/grad_unwarp:413-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L413-L419)). If you must match `mri_convert`'s
> geometry, convert with `mri_convert` first and dewarp the MGH.

> [!gotcha] Slow and license-hungry as a converter
> The engine is MATLAB and needs an Image Processing Toolbox license; it is much
> slower than `mri_convert --in_type dicom --out_type mgh`. Use `grad_unwarp`
> only when you actually need the gradient dewarping (help,
> [`scripts/grad_unwarp:396-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L396-L419)).

> [!gotcha] GE has no coil tag in DICOM
> Unlike Siemens, GE DICOM headers carry no gradient-system field, so the coil is
> guessed from `ScannerSerialNumber` or `(InstitutionName, StationName)` — both
> often unset. If detection fails, name the coil explicitly (`brm`/`crm`).

## Error Compensation and Guard Rails

- **Existence / required-arg checks.** `-i` must exist and `-o` must be given, else `check_params` errors ([`scripts/grad_unwarp:290-305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L290-L305)).
- **Output-not-created check.** After MATLAB runs, the script verifies the expected output file exists and errors if not ([`scripts/grad_unwarp:142-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L142-L145)).
- **GE Z-offset.** Applied automatically for DICOM input (the converter advantage above).
- **Coil auto-detection.** For recognised DICOM scanners the coil/offset table is selected from headers, so a coil type need not be given.
- **No FreeSurfer-side input validation of `-interp`.** The check is commented out, so an unsupported interpolation name is passed straight to MATLAB and fails there rather than in the wrapper.

## Related Tools

- [[mri_gradunwarp]] — the modern C++ replacement: spherical-harmonic gradient unwarping with no MATLAB or offset tables. Prefer it for new work.
- [[wiki/tools/mri_convert|mri_convert]] — faster DICOM→MGH conversion; called internally for `-cor` output; use `-zgez` for GE before external dewarping.
- [[coordinate-systems]] — context for the `c_ras`/vox2ras half-voxel discrepancy.
- `convert_unwarp_resample.m` *(MATLAB backend, no wiki page)* — implements the offset-table resampling and Jacobian correction.

## Confidence and Gaps

**Medium confidence.** The tcsh wrapper — its full flag set, the DICOM/MGH input handling, the MATLAB driver it emits, the `-cor`/`-corfov` interaction, and the GE Z-offset and half-voxel caveats — is read directly from [`scripts/grad_unwarp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp). The actual unwarping numerics live in the MATLAB backend, which was inspected only at its interface level.

> [!gap] Offset-table availability
> The per-coil offset tables (BRM/CRM/Sonata/Allegra) are large data files located
> via `getenv('DEV')` (defaulting to `$FREESURFER_HOME`). Whether the matching
> `table.mat` / coil tables ship in a stock v8.2.0 install was not verified; if
> they are absent the MATLAB stage will fail for that coil.

> [!gap] MATLAB-side enforcement
> Some constraints (DICOM-dir needs `-s`; MGH input needs `-unwarp <type>`) are
> enforced only inside `convert_unwarp_resample.m`, not by the wrapper, so failures
> surface as MATLAB errors rather than clean argument errors.

## References

- FreeSurfer source: [`scripts/grad_unwarp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp) and [`matlab/convert_unwarp_resample.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/convert_unwarp_resample.m) (v8.2.0).
- Built-in help: `grad_unwarp -help` (the `BEGINHELP` block, [`scripts/grad_unwarp:391-527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/grad_unwarp#L391-L527)).
