---
title: "orientLAS"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/orientLAS"
families: []                     # diffusion / orientation helper
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[wiki/tools/trac-preproc|trac-preproc]]"
  - "[[wiki/pipelines/trac-all|trac-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - orientation
  - diffusion
  - dwi
  - tractography
  - utility
---

# orientLAS

## Summary

`orientLAS` reorients a NIfTI volume to **LAS** voxel order
(columns→Left, rows→Anterior, slices→Superior) **without resampling the image
data** — it only relabels the axes by swapping/flipping the direction cosines,
dimensions, and origin and feeding them to [[wiki/tools/mri_convert|mri_convert]]
with nearest-neighbour interpolation. If a matching diffusion gradient table
(`.bvecs`/`.bvals`) is found next to the input, the gradient vectors are permuted
and sign-flipped to track the new axis order, and the b-values are copied
through. An optional `--check` mode opens viewers to confirm the result. It is
the orientation-normalisation step used by FreeSurfer's diffusion / TRACULA
preprocessing.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/orientLAS`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS)
- **Binary/script location:** `$FREESURFER_HOME/bin/orientLAS`
- **Original author:** Anastasia Yendiki (TRACULA / FreeSurfer diffusion)
- **External tools invoked:** [[mri_info]], [[wiki/tools/mri_convert|mri_convert]], `tkregister2`, and (for the diffusion `--check`) FSL's `fslroi`, `bet`, `dtifit`, `fslview`; plus `fs_temp_dir` for scratch space.

## Purpose and Context

Diffusion analysis tools (notably FSL's `flirt`, used inside FreeSurfer's
diffusion preprocessing) can flip or mishandle volumes whose voxel-to-world
orientation has a particular handedness. Standardising every diffusion volume to a
single canonical voxel order — **LAS** — before such steps avoids left/right flips
and keeps the gradient table consistent with the image. `orientLAS` performs this
standardisation.

Crucially, it is a **relabelling**, not a reslice: the script computes how the
input axes must be swapped and inverted to become LAS, then asks
[[wiki/tools/mri_convert|mri_convert]] to write a volume with those new direction
cosines, dimensions, and centre while holding the voxels fixed (`-rt nearest`).
The voxel array is therefore reinterpreted, not interpolated. The matching
diffusion gradient directions are transformed by the **same** axis permutation and
sign changes so that, after reorientation, gradients still point the right way
relative to the image.

It is invoked by [[wiki/tools/trac-preproc|trac-preproc]] (the TRACULA
preprocessing stage of [[wiki/pipelines/trac-all|trac-all]]) on the DWIs and on
field-map magnitude/phase images, with the comment "Change orientation to LAS
before running flirt to avoid flipping"
([`scripts/trac-preproc:1561-1564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1561-L1564),
[`scripts/trac-preproc:399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L399),
[`scripts/trac-preproc:926`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L926),
[`scripts/trac-preproc:944`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L944)). It is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **`inputimage`** (arg 1) — a **NIfTI** volume (`nii`/`nii.gz`). The script
  rejects non-NIfTI input: it runs `mri_info` and requires the reported `type` to
  contain `nii` ([`scripts/orientLAS:46-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L46-L50)). The input must exist
  ([`scripts/orientLAS:39-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L39-L42)).
- **`outputimage`** (arg 2) — output NIfTI path (LAS-oriented).

### Optional Inputs (auto-detected, not flags)

- **`<inputbase>.bvecs`** — if present beside the input, the gradient directions
  are reoriented to LAS and written to `<outputbase>.bvecs`
  ([`scripts/orientLAS:132-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L132-L144)). The base is the filename up to `.nii`
  ([`scripts/orientLAS:122-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L122-L123)).
- **`<inputbase>.bvals`** — if present, copied verbatim to `<outputbase>.bvals`
  (b-values are rotation-invariant) ([`scripts/orientLAS:125-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L125-L130)).

### Input Assumptions

> [!assumption] NIfTI in, FSL-convention gradient table
> The input must be NIfTI (enforced). The companion gradient table is assumed to
> be a `<base>.bvecs` file in **FSL layout** (three rows × N volumes, scanner/world
> x,y,z) and `<base>.bvals` alongside it. The `<base>` is derived by splitting the
> filename at `.nii`, so an input not ending in `.nii`/`.nii.gz` would produce a
> degenerate base name.

## Outputs

### Files Created

| File | When | Contents |
|------|------|----------|
| `outputimage` (`*.nii`/`*.nii.gz`) | always | the input volume relabelled to LAS orientation (no resampling) |
| `<outputbase>.bvals` | input `.bvals` exists | copy of the input b-values |
| `<outputbase>.bvecs` | input `.bvecs` exists | gradient directions permuted/sign-flipped to match LAS |

With `--check`, temporary files are also written under `fs_temp_dir` (single-frame
extracts, a `register.dat`, and — for diffusion — `nodif`, brain mask, and a
`dtifit` tensor fit); these are scratch artefacts for visual QC, not pipeline
outputs.

### Output Specifications

The output volume has voxel order **LAS** and identical voxel **values** to the
input (nearest-neighbour, no interpolation). Its geometry — new column/row/slice
counts, direction cosines, and `c_ras` centre — is computed by the script (below)
and applied by [[wiki/tools/mri_convert|mri_convert]].

## Mathematical Foundations

The reorientation is a pure **axis permutation with sign flips** chosen so the
input orientation string becomes `LAS`, combined with a compensating shift of the
volume centre so the world location of the data is preserved.

**1. Decompose the input orientation.** From `mri_info`'s 3-letter orientation
string (e.g. `RPI`), the script derives, per axis, a **sign** and a **target
order**:

> [!math] Sign and order extraction
> Each letter maps to a sign — $+$ for `L/A/S`, $-$ for `R/P/I`
> ([`scripts/orientLAS:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L58)) — and to a destination index — `L/R`→1
> (x), `A/P`→2 (y), `I/S`→3 (z) ([`scripts/orientLAS:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L59)). The sign is the
> flip needed to turn the input polarity into the LAS polarity (L, A, S positive);
> the order says which output axis each input axis becomes.

**2. Build the output direction cosines.** For each input axis $k$ the script
takes that column of the input voxel→RAS direction-cosine matrix
(`mri_info --cdc/--rdc/--sdc`, [`scripts/orientLAS:65-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L65-L71)), multiplies it
by the axis sign, and assigns it to the output column named by `order[k]`, also
carrying the corresponding dimension `dims[k]`
([`scripts/orientLAS:74-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L74-L88)). The result is the new
$\{$`cdc_new`,`rdc_new`,`sdc_new`$\}$ and $\{n_x,n_y,n_z\}$.

**3. Shift the centre to keep the image in place.** Flipping an axis moves the
voxel grid relative to its centre, so the `c_ras` is corrected by half a
field-of-view along each changed direction:

> [!math] Origin (c_ras) correction
> For each world component $i\in\{R,A,S\}$:
> $$c_{\text{new},i} = c_i + \tfrac{(d^{c}_{\text{new},i}-d^{c}_i)\,\Delta x + (d^{r}_{\text{new},i}-d^{r}_i)\,\Delta y + (d^{s}_{\text{new},i}-d^{s}_i)\,\Delta z}{2}$$
> where $d^{c},d^{r},d^{s}$ are the (old vs. new) column/row/slice direction-cosine
> components and $\Delta x,\Delta y,\Delta z$ are the voxel sizes
> (`--cres/--rres/--sres`). This is exactly the half-FOV recentring at
> [`scripts/orientLAS:97-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L97-L104).

**4. Apply with no resampling.** The new geometry is pushed onto the data via
[`mri_convert -oni/-onj/-onk -oid/-ojd/-okd -oc -rt nearest`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L107-L119),
which sets output dimensions, direction cosines, and centre while keeping voxels
fixed.

**5. Reorient the gradient table the same way.** The b-vector transform mirrors
the image axis map: for each output component $j$ it finds the input axis $k$ with
`order[k]==j` and emits `sign[k]·$k` — i.e. the input gradient component from axis
$k$, sign-flipped to match ([`scripts/orientLAS:137-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L137-L143)). Applied row-wise
to the FSL `.bvecs` file, this permutes and flips the three gradient components
consistently with the image relabelling. b-values are unchanged (copied).

> [!internal] The geometry primitives come from mri_info / mri_convert
> `orientLAS` does no matrix algebra in a library; it reads geometry with
> [[mri_info]] (`--cdc/--rdc/--sdc/--cras/--cres/--rres/--sres/--dim`) and writes
> it back with [[wiki/tools/mri_convert|mri_convert]]'s output-geometry flags. The
> script's contribution is the orientation-string → sign/order logic and the
> half-FOV recentring above.

## Configuration Options

### Complete Flag Reference

`orientLAS` is positional: two required paths and one optional literal flag. There
is no GNU-style option parser.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `inputimage` | string (positional 1) | *(required)* | Input **NIfTI** volume to reorient. Must exist and be NIfTI. |
| `outputimage` | string (positional 2) | *(required)* | Output NIfTI path; written in LAS orientation. |
| `--check` | literal flag (positional 3) | off | After reorienting, open `tkregister2` (input vs. output overlay) and, if a reoriented `.bvecs`/`.bvals` pair exists, run `dtifit` and open `fslview` to inspect the tensors ([`scripts/orientLAS:33-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L33-L37), [`scripts/orientLAS:146-195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L146-L195)). |
| `--help` | literal flag | — | With `--help` present (and not enough real args) prints the usage block and exits 1 ([`scripts/orientLAS:21-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L21-L29)). |

### Configuration Interactions

> [!gotcha] `--check` must be the third argument, exactly spelled
> `--check` is only recognised at position 3 and only if it equals the literal
> string `--check` ([`scripts/orientLAS:33-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L33-L37)). Anything else in that
> slot silently disables checking (`docheck=0`); there is no error for an
> unrecognised third argument.

> [!gotcha] The diffusion part of `--check` needs FSL on PATH
> The tensor QC path calls `fslroi`, `bet`, `dtifit`, and `fslview`
> ([`scripts/orientLAS:177-194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L177-L194)). Without FSL installed, `--check` on a
> diffusion series will fail at those commands even though the reorientation
> itself (which only needs `mri_info`/`mri_convert`) already succeeded.

## Typical Use Cases

### Reorient a single volume to LAS

```bash
# No resampling — just relabels the axes to LAS.
orientLAS T1.nii.gz T1_las.nii.gz
```

### Reorient a DWI series and its gradient table

```bash
# If dwi.bvecs / dwi.bvals sit next to dwi.nii.gz, they are
# converted/copied to dwi_las.bvecs / dwi_las.bvals automatically.
orientLAS dwi.nii.gz dwi_las.nii.gz
```

### Reorient and visually verify

```bash
# Opens tkregister2 (image overlap) and, for DWIs, fslview with the tensors.
orientLAS dwi.nii.gz dwi_las.nii.gz --check
```

## Pipeline Context

`orientLAS` is a diffusion-preprocessing helper. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]]. Within [[wiki/pipelines/trac-all|trac-all]]
it is invoked by [[wiki/tools/trac-preproc|trac-preproc]] to put the DWIs (and the
B0/field-map magnitude and phase images) into LAS before FSL `flirt`-based steps,
preventing left/right flips ([`scripts/trac-preproc:399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L399),
[`scripts/trac-preproc:1561-1564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1561-L1564)).

**Predecessor:** raw/converted DWIs (e.g. from
[[wiki/tools/dcmunpack|dcmunpack]] / [[wiki/tools/mri_convert|mri_convert]]) →
**orientLAS** → **Successor:** FSL `flirt`/eddy-correction and the rest of
[[wiki/tools/trac-preproc|trac-preproc]].

## Gotchas and Caveats

> [!gotcha] No interpolation — voxels are relabelled, not resampled
> Output uses `mri_convert -rt nearest` with explicitly set output geometry
> ([`scripts/orientLAS:107-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L107-L119)). The intensity grid is preserved
> exactly; only the orientation metadata (and voxel traversal order) change. This
> is the intended, loss-free behaviour — do not expect it to also conform or
> resample.

> [!gotcha] `.bvecs`/`.bvals` are matched by name, derived from `.nii`
> The base name is the input path truncated at the first `.nii`
> ([`scripts/orientLAS:122-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L122-L123)). So `dwi.nii.gz` looks for
> `dwi.bvecs`/`dwi.bvals`. A gradient table under a different stem is silently not
> found, and the output gradients are then simply absent — check that the output
> `.bvecs` was produced.

> [!gotcha] Output `.bvecs` is appended, so a stale file is reused
> The b-vector reorientation does `rm -f $outbvecs` then `awk … >> $outbvecs`
> ([`scripts/orientLAS:136-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L136-L143)); the explicit `rm -f` first prevents a
> previous run's rows from accumulating. The `.bvals` is a plain `cp`. Re-running
> is safe, but only because of that `rm -f`.

> [!gotcha] Assumes a meaningful `mri_info` orientation string
> Volumes whose direction cosines are oblique enough that `mri_info` cannot reduce
> them to a clean 3-letter code may produce an unexpected sign/order mapping. The
> script trusts the orientation label verbatim.

## Error Compensation and Guard Rails

- **Argument-count guard:** fewer than two arguments triggers either the usage
  block (if `--help` is present or there are zero args) or
  `ERROR: not enough arguments` + exit 1
  ([`scripts/orientLAS:21-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L21-L29)).
- **Existence guard:** a missing input file is a hard error
  ([`scripts/orientLAS:39-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L39-L42)).
- **Format guard:** non-NIfTI input is rejected via the `mri_info … type … nii`
  check ([`scripts/orientLAS:46-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L46-L50)).
- **Origin recentred automatically:** the half-FOV `c_ras` correction
  ([`scripts/orientLAS:97-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L97-L104)) keeps the reoriented volume in the same
  world location, so downstream registration is unaffected by the relabelling.

## Related Tools

- [[mri_info]] — supplies every geometry quantity (`--cdc/--rdc/--sdc/--cras/--cres/--rres/--sres/--dim`, orientation, determinant) the script reasons about.
- [[wiki/tools/mri_convert|mri_convert]] — applies the new dimensions/direction-cosines/centre to write the LAS volume (with `-rt nearest`).
- [[wiki/tools/trac-preproc|trac-preproc]] — the main caller; uses `orientLAS` on DWIs and field-map images.
- [[wiki/pipelines/trac-all|trac-all]] — the TRACULA pipeline that runs `trac-preproc` and hence `orientLAS`.

## Confidence and Gaps

**High confidence:** the script is 227 lines and was read in full. The
sign/order derivation, output direction-cosine construction, half-FOV `c_ras`
recentring, the `-rt nearest` (no-resample) `mri_convert` call, the
b-vec permutation/sign logic, the `.bvals` copy, the NIfTI-only guard, and the
`--check` viewer paths are all confirmed from
[`scripts/orientLAS`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS). The
[[wiki/tools/trac-preproc|trac-preproc]] call sites and rationale ("avoid
flipping") were confirmed in
[`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc).
All `mri_info` geometry flags used were verified to exist in
[`mri_info/mri_info.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_info/mri_info.cpp).

## References

- FreeSurfer source: [`scripts/orientLAS`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS) (v8.2.0).
- Caller: [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc) (TRACULA preprocessing).
- Built-in usage: `orientLAS --help` ([`scripts/orientLAS:200-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/orientLAS#L200-L227)).
