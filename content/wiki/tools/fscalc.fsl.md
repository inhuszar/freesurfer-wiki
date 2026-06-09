---
title: "fscalc.fsl"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fscalc.fsl"
families: []                     # FSL-bridge voxel calculator (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_surf2surf]]"
  - "[[mri_concat]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "fscalc.fsl pre-dates and is largely superseded by the native fscalc (mris_calc/mri_concat family); the relationship to that native tool was not cross-audited here."
tags:
  - fsl
  - fslmaths
  - voxel-arithmetic
  - calculator
  - surface
---

# fscalc.fsl

## Summary

`fscalc.fsl` is a thin tcsh wrapper around FSL's **`fslmaths`** voxel calculator
that lets you use **any FreeSurfer-readable input format and any
FreeSurfer-writable output format** with the ordinary `fslmaths` command line.
It transparently converts non-NIfTI inputs to NIfTI (via
[[wiki/tools/mri_convert|mri_convert]]), runs `fslmaths` with your exact flags and
operands, and converts the result back to whatever output format you asked for.
It additionally has a `--surf` mode that reshapes a volume-encoded **surface
overlay** so it fits inside the NIfTI dimension limits, runs the calculation, and
(optionally) reshapes the result back to its original 1-D spatial layout — so
`fslmaths` operations can be applied to per-vertex surface data. The output data
type is forced to **float**.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fscalc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl)
- **Binary/script location:** `$FREESURFER_HOME/bin/fscalc.fsl`
- **External dependency:** **FSL** — calls `fslmaths` (falls back to the legacy `avwmaths` if `fslmaths` is absent, [`scripts/fscalc.fsl:84-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L84-L93)).
- **Key FreeSurfer helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L153) (format conversion in and out), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L114) (surface reshaping), and the helpers `isnifti`, `fname2stem`.

## Purpose and Context

`fslmaths` is FSL's general-purpose voxelwise calculator (add, multiply,
threshold, smooth, mask, binarise, …), but it only reads/writes NIfTI/Analyze.
FreeSurfer data frequently lives in `mgz`, surface overlays, or other native
formats. `fscalc.fsl` removes that friction: you keep the familiar `fslmaths`
syntax but feed and receive FreeSurfer formats, with the format handling and a
forced float output type taken care of. The `--surf` mode further bridges the
volume/surface gap, exploiting the fact that a 1-D per-vertex overlay can be
*reshaped* into a small 2-/3-D NIfTI as long as the vertex count is not (almost)
prime.

It is a **standalone command-line convenience tool**, run by hand. It is **not**
part of [[wiki/pipelines/recon-all|recon-all]]. FreeSurfer also ships a native
calculator named `fscalc` (built on the `mris_calc`/`mri_concat` family); this
FSL-backed variant exists for users who want `fslmaths`'s specific operators.

## Inputs

### Required Inputs

- **An `fslmaths` command line** — the same operands and operators `fslmaths`
  accepts, with the **last argument** being the output file. Any operand that is
  an existing file may be in any FreeSurfer-readable format; non-file arguments
  (numbers, operator keywords like `-add`, `-mul`, `-thr`, …) are passed through
  untouched. The script requires at least three arguments after option stripping
  ([`scripts/fscalc.fsl:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L55)).

### Input Assumptions

> [!assumption] Output format and FSL output type
> The output file is **always the last token** on the command line
> ([`scripts/fscalc.fsl:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L98)). Its extension selects the final format; if it is not
> NIfTI (or its NIfTI flavour disagrees with `$FSLOUTPUTTYPE`) the result is
> computed in a temp NIfTI and converted back ([`scripts/fscalc.fsl:166-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L166-L217)).
> The computed output data type is forced to **float** (`-odt float`) when
> `fslmaths` is used ([`scripts/fscalc.fsl:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L92)).

> [!assumption] `--surf` requires a non-prime vertex count
> Surface mode reshapes a 1-D overlay into NIfTI; this is only possible if the
> largest prime factor of the number of vertices is `< 2^15` (i.e. the vertex
> count is not prime or near-prime). The help states this restriction
> explicitly ([`scripts/fscalc.fsl:66-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L66-L68)).

## Outputs

### Files Created

| File / pattern | When | Contents |
|----------------|------|----------|
| **output file** (last CLI argument) | always | the `fslmaths` result, in the format implied by its extension, data type **float**. |

Intermediate NIfTI conversions and (in `--surf` mode) reshaped surface files are
written into a temporary directory `<outdir>/tmp.fscalc.fsl.$$` and removed at
the end ([`scripts/fscalc.fsl:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L103), [`220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L220)).

### Output Specifications

The geometry, dimensions, and (in volume mode) orientation of the output follow
whatever `fslmaths` produces from the inputs; `fscalc.fsl` only changes the
*container format* and forces float values. In `--surf` mode the output is a
surface overlay for the named subject/hemisphere; by default it remains in the
reshaped layout, and `--reshape1d` converts it back to native 1-D spatial
dimensions via a second [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L196-L211) pass.

## Mathematical Foundations

None of the arithmetic is performed by this script — every voxelwise operation is
delegated to **FSL `fslmaths`**. `fscalc.fsl` contributes only:

> [!math] Surface ⇄ volume reshaping
> A per-vertex overlay with $N$ vertices is rewritten by
> [`mri_surf2surf --reshape`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L114) into a multi-dimensional NIfTI whose voxel count is
> still $N$ but whose shape (factorising $N$) fits NIfTI's per-dimension size
> limit — feasible exactly when $N$'s largest prime factor is $< 2^{15}$. The
> calculation runs on the reshaped data; `--reshape1d` undoes the reshape on the
> output. This is bookkeeping, not image math.

> [!internal] The actual operators live in FSL `fslmaths`
> Refer to FSL's `fslmaths` documentation for the semantics of `-add`, `-sub`,
> `-mul`, `-div`, `-thr`, `-bin`, `-s` (smoothing), masking, etc. This wrapper is
> operator-agnostic.

## Configuration Options

`fscalc.fsl` has **only two wrapper flags of its own**; everything else is passed
verbatim to `fslmaths` ([`scripts/fscalc.fsl:14-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L14-L49)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surf`<br>`--surface` | `subject hemi` | — | Treat operands as surface overlays for `subject`/`hemi` (`lh` or `rh`); reshape them to fit NIfTI before the calculation. `subject` must exist in `$SUBJECTS_DIR`; `hemi` must be `lh` or `rh`. Enables surface mode (and `--reshape1d` handling). |
| `--reshape1d` | bool | off (on-disk default differs — see note) | After the calculation, reshape the output overlay back to native 1-D spatial dimensions. Only meaningful with `--surf`. |
| `--no-reshape1d` | bool | (sets the flag off) | Leave the output in the reshaped layout. |
| *(any other argument)* | — | — | Passed straight to `fslmaths` (operands and operators), with file operands auto-converted to/from NIfTI. |

> [!gotcha] `--surf` is silently ignored unless it appears with two valid arguments
> If `--surf` is not supplied (or `subject` is unset), the script resets to plain
> pass-through mode and forces `DoReshape1D = 0`
> ([`scripts/fscalc.fsl:50-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L50-L53)). The two `--surf` arguments are validated (subject
> exists, hemi ∈ {lh,rh}); an invalid hemi or missing subject is a hard error.

### Configuration Interactions

> [!gotcha] `--reshape1d` does nothing without `--surf`
> `--reshape1d` only takes effect in surface mode. Without `--surf` the script
> clears it, because there is no surface layout to restore
> ([`scripts/fscalc.fsl:50-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L50-L53)).

- **Output token is positional.** Because the output is always the *last*
  argument, you write the `fslmaths` line exactly as usual; do not add a separate
  output flag.
- **`fslmaths` vs `avwmaths`.** If `fslmaths` is missing the script falls back to
  the legacy `avwmaths`, in which case the `-odt float` (float output) option is
  **not** added ([`scripts/fscalc.fsl:84-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L84-L93)).
- **`$FSLOUTPUTTYPE` controls the temp extension** (`nii` vs `nii.gz`) and is
  compared against the requested output flavour to decide whether a final
  conversion is needed ([`scripts/fscalc.fsl:95-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L95-L96), [`174-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L174-L186)).

## Typical Use Cases

### Use Case 1: Arithmetic between two mgz volumes

```bash
# Subtract one mgz from another and write the result as mgz (float)
fscalc.fsl a.mgz -sub b.mgz diff.mgz
```

`a.mgz` and `b.mgz` are converted to NIfTI, `fslmaths a -sub b` runs, and the
result is converted back to `diff.mgz`.

### Use Case 2: Threshold and binarise, output as nii.gz

```bash
fscalc.fsl stat.mgz -thr 2.3 -bin mask.nii.gz
```

### Use Case 3: Smooth a surface overlay with fslmaths

```bash
# Apply an fslmaths spatial operation to per-vertex lh data for subject bert
fscalc.fsl --surf bert lh lh.thickness.mgh -mul 2 lh.thickness_x2.mgh --reshape1d
```

The overlay is reshaped to fit NIfTI, `fslmaths ... -mul 2` runs, and
`--reshape1d` restores the 1-D vertex layout of the output.

## Pipeline Context

`fscalc.fsl` is a **standalone utility**; it is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or any other FreeSurfer pipeline in the
source tree (it appears only in `CMakeLists.txt` and itself).

**Predecessor:** any tool that produces a FreeSurfer volume or surface overlay →
**This tool** (wraps FSL `fslmaths`) → **Successor:** any tool that reads the
output. Its native FreeSurfer counterpart is `fscalc`
([[mri_concat]]/`mris_calc`-based); use that when you do not specifically need
`fslmaths` operators.

## Gotchas and Caveats

> [!gotcha] Output is always float
> When `fslmaths` is used the output data type is forced to float (`-odt float`,
> [`scripts/fscalc.fsl:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L92)). Integer label or mask volumes come back as float and
> may need re-casting (e.g. `mri_convert -odt uchar`) before use as a
> segmentation.

> [!gotcha] Only existing-file operands are converted
> An operand is treated as a file (and converted) only if it exists on disk
> ([`scripts/fscalc.fsl:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L138)). A mistyped filename is therefore passed to `fslmaths`
> as a literal token rather than triggering a clear "file not found" from the
> wrapper.

> [!gotcha] Surface mode needs a friendly vertex count
> If the hemisphere's vertex count is prime (or has a prime factor ≥ 2^15) the
> reshape into NIfTI is impossible and `--surf` will not work. This is inherent to
> packing 1-D data into NIfTI's dimension limits.

## Error Compensation and Guard Rails

- **Automatic format conversion** of every file operand to NIfTI and of the
  output back to the requested format ([`scripts/fscalc.fsl:133-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L133-L217)).
- **`avwmaths` fallback** when `fslmaths` is unavailable.
- **Surface reshaping** to make per-vertex data tractable for a volume tool, with
  optional restoration of the 1-D layout.
- **Temp-dir cleanup** at exit.
- **Input validation** for `--surf` (subject existence, hemi value).

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — performs the FreeSurfer↔NIfTI conversions on each side of the `fslmaths` call.
- [[mri_surf2surf]] — reshapes surface overlays in/out of NIfTI for `--surf` mode.
- [[mri_concat]] — underlies FreeSurfer's native `fscalc`; the non-FSL alternative for voxel/overlay arithmetic.
- FSL `fslmaths` *(no wiki page)* — the actual calculator this wraps; consult FSL docs for operator semantics.

## Confidence and Gaps

**High confidence:** the two wrapper flags and their interaction, the
last-argument-is-output rule, the float-output forcing, the `fslmaths`/`avwmaths`
selection, the conversion in/out logic, and the `--surf`/`--reshape1d` reshaping
behaviour — all read directly from [`scripts/fscalc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl).

> [!gap] Relationship to native `fscalc`
> FreeSurfer also ships a native `fscalc`. The exact feature overlap and which to
> prefer were not cross-audited; this page documents only the FSL-backed
> `fscalc.fsl`.

## References

- FreeSurfer source: [`scripts/fscalc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl) (v8.2.0).
- FSL `fslmaths`: FMRIB Software Library. https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils
