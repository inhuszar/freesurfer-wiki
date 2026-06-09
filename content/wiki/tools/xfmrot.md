---
title: "xfmrot"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/xfmrot"
families: []                       # TRACULA/diffusion gradient helper
recon_all_stage: null
related:
  - "[[trac-all]]"
  - "[[trac-preproc]]"
  - "[[lta_convert]]"
  - "[[coordinate-systems]]"
  - "[[dt_recon]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The eddy 16-column .mat vs eddy-log discrimination relies on word/line counts; pathological files (e.g. a 4-line, 16-word log) could be misclassified, but this was not exercised at runtime."
tags:
  - diffusion
  - registration
  - gradients
  - bvecs
  - eddy
  - tracula
---

# xfmrot

## Summary

`xfmrot` extracts the **rotation** component of an affine transform and applies it
to a set of 3-D diffusion **gradient direction vectors** (b-vectors). When
diffusion volumes are motion- and eddy-current-corrected, each volume is
resampled by a rigid (or affine) transform; the gradient directions, which are
defined relative to the scanner, must be rotated by the same rotation so they
stay consistent with the corrected data. `xfmrot` reads the per-volume transforms
from an FSL `eddy_correct` log, an FSL `eddy` parameter file, or a single `.mat`
matrix file, derives the 3×3 rotation for each volume, multiplies each gradient
vector by it, and writes the rotated vectors out in the same row/column layout as
the input.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/xfmrot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot)
- **Binary/script location:** `$FREESURFER_HOME/bin/xfmrot`
- **External tool invoked:** [`avscale --allparams`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L76-L77) (FSL) — used to decompose a `.mat`/`eddy_correct` affine into its rotation rows.
- **Shell helpers:** `bc -l` (arbitrary-precision trig evaluation), `fs_temp_file`.

## Purpose and Context

Diffusion MRI gradient tables (b-vectors) describe the direction of each
diffusion-weighting gradient. Head-motion and eddy-current correction reorient
each diffusion volume; to keep the gradient directions physically correct, the
**rotation** part of each volume's correction transform must be applied to its
b-vector. (Translation, scaling, and shear do not affect a direction and are
discarded.) `xfmrot` is the FreeSurfer utility that performs this rotation,
called inside the **TRACULA** preprocessing stream
([[trac-preproc]] / [[trac-all]]) immediately after eddy correction.

It is not part of [[wiki/pipelines/recon-all|recon-all]]; it belongs to the
diffusion (TRACULA) toolchain and is occasionally used standalone in custom
diffusion scripts.

## Inputs

### Required Inputs

Positional arguments:

1. **`<transform file>`** — one of three accepted types, auto-detected:
   - an FSL **`eddy_correct`** log (`.ecclog`): detected because it contains the
     word `processing`; holds an 8-line block per volume with the 4×4 affine on
     lines 4–7.
   - an FSL **`eddy`** parameter file (`dwi.eddy_parameters`): detected because
     its first line has **16** whitespace-separated fields; rotation angles are
     read directly from columns 4–6 of each row.
   - a single **`.mat`** matrix file: detected because the whole file is 16 words
     on 4 lines (one 4×4 matrix).
2. **`<input vector file>`** — the gradient table, either as **3 rows**
   (x-row, y-row, z-row) or **3 columns** (one vector per row); the layout is
   auto-detected.

### Optional Input

3. **`[<output vector file>]`** — destination for the rotated vectors. If omitted,
   the **input vector file is overwritten** (the output path defaults to the
   input, [`scripts/xfmrot:14-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L14-L18)).

> [!assumption] Transform-file type is inferred from structure, not extension
> Detection uses content/word/line counts, not the filename
> ([`scripts/xfmrot:21-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L21-L35)). An `eddy_correct` log is recognised by the
> literal word `processing`; an `eddy` parameter file by a 16-field first line;
> a `.mat` by being exactly 16 words on 4 lines. The number of gradient vectors
> is taken from the vector file, and the per-volume transforms are read in
> lockstep.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<output vector file>` (or the input, in place) | text b-vecs | The input gradient directions rotated by each volume's rotation matrix, in the **same** 3-row or 3-column layout as the input. |

### Output Specifications

Each output vector is `R · v`, where `R` is the 3×3 rotation for that volume and
`v` is the input direction. Components are printed with `%1.7f` precision in
row layout, or `%g` in column layout
([`scripts/xfmrot:99-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L99-L122)). The output is a rotated b-vector table
ready to pair with eddy-corrected diffusion data.

## Mathematical Foundations

Two paths produce the rotation `R`, depending on the transform type.

> [!math] From an affine matrix (`.mat` / `eddy_correct`): rotation via avscale
> For `.mat` and `eddy_correct` inputs, the 4×4 affine is decomposed by FSL's
> `avscale --allparams`, and the rotation rows are taken from the matrix output
> ([`scripts/xfmrot:76-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L76-L78)). This isolates the pure rotation, dropping the
> translation/scale/shear of the registration.

> [!math] From eddy rotation angles: explicit Euler matrix
> For an `eddy` parameter file, the three rotation angles $(\theta_x,\theta_y,\theta_z)$
> are read from columns 4–6 and the rotation matrix is built explicitly in `bc`
> ([`scripts/xfmrot:87-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L87-L95)):
> $$R=\begin{pmatrix}
> c_y c_z & s_x s_y c_z - c_x s_z & c_x s_y c_z + s_x s_z\\
> c_y s_z & s_x s_y s_z + c_y c_z & c_x s_y s_z - s_x c_z\\
> -s_y & s_x c_y & c_x c_y
> \end{pmatrix}$$
> with $c_\bullet=\cos$, $s_\bullet=\sin$. The rotated vector is then
> $\,v' = R\,v\,$ ([`scripts/xfmrot:98-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L98-L103)).

> [!gotcha] Scientific notation is rewritten for `bc`
> `bc` cannot read `1.2e-03`, so every value is passed through
> `sed 's/E/*10^/g; s/e/*10^/g; s/+//g'` to turn `1.2e-3` into `1.2*10^-3`
> before evaluation ([`scripts/xfmrot:58-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L58-L60), [`:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L78), [`:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L81)).
> `set noglob` is also enabled so `*` in the rewritten expressions is not
> filename-expanded.

> [!internal] The affine decomposition is FSL's
> The rotation extraction for matrix inputs is delegated to FSL `avscale`; only
> the angle-based path computes the matrix within the script.

## Configuration Options

### Complete Flag Reference

`xfmrot` has **no option flags** — two or three positional arguments only
([`scripts/xfmrot:3-10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L3-L10)).

| Position | Argument | Required | Description |
|----------|----------|----------|-------------|
| 1 | `<transform file>` | yes | `eddy_correct` log, `eddy` parameter file, or `.mat` matrix (type auto-detected). |
| 2 | `<input vector file>` | yes | Gradient table in 3 rows or 3 columns (layout auto-detected). |
| 3 | `<output vector file>` | no | Output path; **defaults to the input file (in-place)** if omitted. |

### Configuration Interactions

None — there are no flags. The only "modes" are the auto-detected transform-file
type and the auto-detected vector layout, neither of which the user selects
explicitly. Output layout always matches input layout.

## Typical Use Cases

### 1. Rotate b-vecs after FSL eddy (TRACULA's call)

```bash
# From eddy: dwi.eddy_parameters holds per-volume rotation angles
xfmrot dwi.eddy_parameters dwi_orig_las.bvecs dwi.bvecs
```

This is exactly how [[trac-preproc]] invokes it after running `eddy`
([`scripts/trac-preproc:819-826`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L819-L826)).

### 2. Rotate b-vecs after FSL eddy_correct

```bash
# From eddy_correct: the .ecclog holds a 4x4 affine per volume
xfmrot dwi.ecclog dwi_orig_las.bvecs dwi.bvecs
```

### 3. Apply a single rotation matrix to a gradient table

```bash
# A single 4x4 .mat (16 numbers on 4 lines) applied to every vector
xfmrot neg.mtx.r2v.txt bvecs.txt r2v.bvecs
```

(mirrors the standalone use in `process_exvivo_diff_data_bay3.sh`.)

## Pipeline Context

`xfmrot` is a **diffusion (TRACULA) preprocessing helper**, not part of
[[wiki/pipelines/recon-all|recon-all]]. It runs inside [[trac-preproc]] (the
preprocessing stage of [[trac-all]]) right after eddy-current/motion correction,
when `dorotbvecs` is set: the corrected diffusion data (`eddy`/`eddy_correct`)
and the original b-vecs go in, and the rotated b-vecs (`dwi.bvecs`) come out for
the rest of the tractography stream.

**Predecessor:** FSL `eddy`/`eddy_correct` within [[trac-preproc]] →
**xfmrot** → **Successor:** the remainder of [[trac-all]] tensor fitting /
tractography (which use the rotated `dwi.bvecs`).

## Gotchas and Caveats

> [!gotcha] Omitting the output overwrites your input b-vecs
> With only two arguments, the output path is set to the **input** vector file
> ([`scripts/xfmrot:14-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L14-L18)). Pass an explicit third argument to keep the
> originals.

> [!gotcha] Only rotation is applied
> Translation, scaling, and shear from the correction transform are intentionally
> discarded — a direction vector is invariant to translation and should not be
> scaled/sheared. Only the 3×3 rotation acts on the b-vectors.

> [!gotcha] Transform/vector counts must correspond
> The loop runs once per gradient vector and reads the matching per-volume
> transform in step ([`scripts/xfmrot:69-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L69-L114)). A mismatch between the number
> of volumes in the transform file and the number of b-vectors will silently
> produce wrong or truncated output.

> [!gotcha] Requires FSL `avscale` for matrix inputs
> The `.mat`/`eddy_correct` path calls FSL `avscale`; without FSL on the path,
> those two input types fail. The `eddy` angle path uses only `bc` and does not
> need FSL.

## Error Compensation and Guard Rails

- **Argument-count guard:** fewer than 2 or more than 3 arguments prints usage
  and exits 1 ([`scripts/xfmrot:3-10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L3-L10)).
- **Transform-type validation:** an input that matches none of the three
  recognised structures errors out with "should be eddy_correct/eddy log file or
  .mat file" ([`scripts/xfmrot:32-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L32-L35)).
- **Vector-layout validation:** a vector file that is neither 3-row nor 3-column
  is rejected ([`scripts/xfmrot:41-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot#L41-L44)).
- **Notation normalisation:** scientific-notation inputs are converted to a
  `bc`-readable form, and `noglob` prevents `*` expansion.

## Related Tools

- [[trac-preproc]] — TRACULA preprocessing stage that calls `xfmrot` after eddy correction to rotate the gradient table.
- [[trac-all]] — the TRACULA pipeline orchestrator that runs `trac-preproc`.
- [[dt_recon]] — diffusion tensor reconstruction; a sibling diffusion utility whose b-vecs must likewise match the (corrected) data.
- [[lta_convert]] — general affine-transform converter; complementary for inspecting/converting the matrices `xfmrot` reads.
- [[coordinate-systems]] — background on the scanner vs voxel frames that make gradient rotation necessary.

## Confidence and Gaps

**High confidence:** the three transform-file types and their detection, the two
rotation-derivation paths (avscale vs explicit Euler matrix), the explicit
rotation-matrix formula, the row/column auto-detection, the in-place-overwrite
default, and the `bc`/scientific-notation handling — all read directly from
[`scripts/xfmrot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot), corroborated by its use in
[`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L819-L826).

> [!gap] Type discrimination is structural and could mis-detect edge cases
> The `eddy` vs `.mat` distinction hinges on word/line counts (16 words; 4
> lines). A pathological file matching one signature while being the other type
> would be misclassified; not exercised here.

## References

- FreeSurfer source: [`scripts/xfmrot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xfmrot) (v8.2.0).
- Caller: [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L819-L826) (TRACULA b-vector rotation).
- FSL `eddy` / `eddy_correct` and `avscale` documentation (external) for the transform-file formats and the affine decomposition.
