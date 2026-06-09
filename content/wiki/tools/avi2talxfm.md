---
title: "avi2talxfm"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # csh
source_files:
  - "scripts/avi2talxfm"
families: []                       # helper for the talairach_avi toolchain
recon_all_stage: null
related:
  - "[[talairach_avi]]"
  - "[[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]]"
  - "[[mri_info]]"
  - "[[tkregister2]]"
  - "[[lta_convert]]"
  - "[[talairach.xfm]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - talairach
  - mni305
  - transform
  - 4dfp
---

# avi2talxfm

## Summary

`avi2talxfm` converts the **voxel-to-voxel** registration matrix produced by the
Avi-Snyder `4dfp` Talairach toolchain (the `t4_vox2vox.txt` file emitted by
[[talairach_avi]]) into a FreeSurfer/MNI **`talairach.xfm`** transform. The
`4dfp` registration is expressed as a mapping between voxel indices; FreeSurfer's
`.xfm` is a RAS-to-RAS linear transform from the subject's native anatomical to
MNI305 space. `avi2talxfm` bridges the two by sandwiching the voxel→voxel matrix
between the vox→RAS geometries of the input and target volumes, then writes the
result in MNI `.xfm` format. It replaces a manual `tkregister2_cmdl --vox2vox …
--xfmout …` invocation.

## Source Information

- **Language:** csh shell script
- **Source file:** [`scripts/avi2talxfm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm) (also distributed as `talairach_avi/avi2talxfm`)
- **Binary/script location:** `$FREESURFER_HOME/bin/avi2talxfm`
- **Original author:** Doug Greve
- **FreeSurfer tools invoked:** [`mri_info --vox2ras`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L50) (geometry of target and input), [`mri_matrix_multiply -fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L56) (the matrix sandwich), and `fs_temp_dir`.

## Purpose and Context

FreeSurfer's MNI305 Talairach registration can be computed either by the classic
MINC `mritotal` route or by the Avi-Snyder `4dfp` route ([[talairach_avi]]). The
`4dfp` route's native output is a `t4` **vox2vox** text file
(`talsrcimg_to_<target>_t4_vox2vox.txt`), not the RAS-to-RAS `talairach.xfm` that
FreeSurfer stores in `mri/transforms/`. `avi2talxfm` performs that final format
conversion. In practice it is invoked **by [[talairach_avi]] itself** as its last
step; this page documents the standalone converter.

The header comment in the source shows the exact command it replaces:

```
tkregister2_cmdl --mov $InVol --targ $FREESURFER_HOME/average/mni305.cor.mgz \
    --xfmout ${XFM} --vox2vox talsrcimg_to_${target}_t4_vox2vox.txt \
    --noedit --reg talsrcimg.reg.tmp.dat
```

## Inputs

### Required Inputs

All four arguments are **positional** and required (in order):

1. **`InVol`** — the input (moving) anatomical volume, e.g.
   `$SUBJECTS_DIR/<subj>/mri/orig.mgz`. Its vox→RAS is read.
2. **`Targ`** — the registration target volume, normally
   `$FREESURFER_HOME/average/mni305.cor.mgz` (MNI305 "fsaverage" space). Its
   vox→RAS is read.
3. **`Vox2Vox`** — the `4dfp` `t4` voxel-to-voxel text matrix from
   [[talairach_avi]] (`talsrcimg_to_<target>_t4_vox2vox.txt`).
4. **`XFMOut`** — output path for the MNI `.xfm` file (e.g.
   `mri/transforms/talairach.xfm`).

> [!assumption] Arguments are positional and order-sensitive
> There is no flag parsing. The script aborts with a usage line unless exactly
> four arguments are given ([`scripts/avi2talxfm:37-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L37-L40)). The Vox2Vox file
> must be the voxel→voxel form (comment lines beginning `#` are stripped before
> use, [`scripts/avi2talxfm:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L54)).

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `XFMOut` | MNI `.xfm` ([[talairach.xfm]]) | RAS→RAS linear transform from the subject's native anatomical to MNI305, in MNI Transform File format. |

The file is written explicitly: a `MNI Transform File` header, a
`% avi2talxfm` provenance comment, `Transform_Type = Linear;`,
`Linear_Transform =`, then the first three rows of the computed 4×4 matrix, with
a trailing semicolon appended to the third row
([`scripts/avi2talxfm:59-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L59-L65)).

### Output Specifications

A standard FreeSurfer `talairach.xfm`: a 3×4 (affine) RAS-to-RAS matrix in MNI
Transform File syntax. See [[talairach.xfm]] for the file and
[[coordinate-systems]] for the MNI305 target space.

## Mathematical Foundations

> [!math] The vox2vox-to-RAS sandwich
> Let $V$ be the `4dfp` voxel→voxel matrix (input voxels → target voxels),
> $S_i$ the input volume's vox→RAS, and $S_t$ the target volume's vox→RAS. The
> RAS→RAS transform is
> $$X \;=\; S_t \, V \, S_i^{-1}.$$
> The script computes this with
> [`mri_matrix_multiply -fsl -im $St -iim $V -iim $Si -om $X`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L56).
> In `mri_matrix_multiply`'s convention `-im A` multiplies and `-iim B` inverts
> before multiplying, so this evaluates $S_t \cdot V^{-1} \cdot S_i^{-1}$. The
> directionality of $V$ (and hence whether it is inverted here) is set by the
> `4dfp` `t4` convention; the result is the native→MNI305 RAS transform that
> FreeSurfer stores as `talairach.xfm`.

> [!internal] Geometry and matrix algebra live in the helpers
> The vox→RAS matrices come from [[mri_info]] and the multiplication/inversion
> from [[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]]; `avi2talxfm` only
> orchestrates them and formats the output.

The `-fsl` flag tells `mri_matrix_multiply` to treat the matrices in the FSL-file
style used here for the intermediate `.fsl` text files
([`scripts/avi2talxfm:49-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L49-L56)).

## Configuration Options

### Complete Flag Reference

`avi2talxfm` has **no option flags** — only four required positional arguments.

| Position | Argument | Description |
|----------|----------|-------------|
| 1 | `InVol` | Input (moving) anatomical volume; its vox→RAS is read. |
| 2 | `Targ` | Target volume (normally `mni305.cor.mgz`); its vox→RAS is read. |
| 3 | `Vox2Vox` | `4dfp` `t4` voxel-to-voxel text matrix from `talairach_avi`. |
| 4 | `XFMOut` | Output `.xfm` path. |

### Configuration Interactions

None — there are no flags to interact. The only requirement is that exactly four
arguments are supplied in the order above; any other count prints the usage and
exits 1.

## Typical Use Cases

### 1. Convert a talairach_avi vox2vox to talairach.xfm

```bash
avi2talxfm \
  $SUBJECTS_DIR/subj/mri/orig.mgz \
  $FREESURFER_HOME/average/mni305.cor.mgz \
  $SUBJECTS_DIR/subj/mri/transforms/talsrcimg_to_711-2C_as_mni_average_305_t4_vox2vox.txt \
  $SUBJECTS_DIR/subj/mri/transforms/talairach.xfm
```

Produces a FreeSurfer `talairach.xfm` from the `4dfp` registration — the same
result [[talairach_avi]] writes internally.

## Pipeline Context

`avi2talxfm` is the **final format-conversion step of the
[[talairach_avi]] toolchain**; it is not called directly by
[[wiki/pipelines/recon-all|recon-all]]. recon-all reaches it transitively when it
runs `talairach_avi` (the `--use-mritotal`-off / AVI Talairach path), which calls
`mpr2mni305` → `imgreg_4dfp` → `compute_vox2vox` and finally `avi2talxfm` to emit
`talairach.xfm`.

**Predecessor:** [[talairach_avi]] (`compute_vox2vox` → `t4_vox2vox.txt`) →
**avi2talxfm** → **Successor:** downstream consumers of `talairach.xfm`
(`mri_add_xform_to_header`, Talairach-dependent normalisation/segmentation).

## Gotchas and Caveats

> [!gotcha] Comment lines in the vox2vox file are stripped
> The `t4` file's `#`-prefixed header lines are removed before the matrix is
> read (`grep -v \#`, [`scripts/avi2talxfm:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L54)). Only the numeric matrix
> rows are used; a malformed (non-4×4) body will produce a wrong `.xfm` silently.

> [!gotcha] Output is overwritten, then appended
> The script `rm -f $XFMOut` first, then builds the file with successive `>>`
> appends ([`scripts/avi2talxfm:59-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L59-L65)). Re-running cleanly replaces a prior
> file, but if the `rm` is blocked (permissions) the new matrix is appended to the
> old contents.

> [!gotcha] Usage message has a typo
> The error/usage line prints `av2talxfm InVol Targ Vox2Vox XFMOut` (missing the
> `i`), although the tool is `avi2talxfm`
> ([`scripts/avi2talxfm:38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L38)).

## Error Compensation and Guard Rails

- **Argument-count check** only: exactly four positional arguments or it exits 1
  ([`scripts/avi2talxfm:37-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L37-L40)).
- **Multiply failure check:** if `mri_matrix_multiply` returns non-zero the
  script aborts before writing the `.xfm`
  ([`scripts/avi2talxfm:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L57)).
- A scratch directory from `fs_temp_dir` holds the intermediate `.fsl` files and
  is removed at the end ([`scripts/avi2talxfm:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm#L67)).

## Related Tools

- [[talairach_avi]] — produces the `t4_vox2vox.txt` this script consumes and calls `avi2talxfm` as its final step.
- [[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]] — performs the $S_t V S_i^{-1}$ matrix sandwich.
- [[mri_info]] — supplies the vox→RAS geometry of the input and target volumes.
- [[tkregister2]] — the `tkregister2_cmdl --vox2vox --xfmout` invocation this script replaces.
- [[lta_convert]] — general transform-format converter (`.xfm`/`.lta`/`.dat`/FSL `.mat`); use it to take this `.xfm` to other formats.
- [[talairach.xfm]] — the output file (glossary entry).

## Confidence and Gaps

**High confidence:** the four positional arguments, the matrix sandwich and its
`-im`/`-iim` evaluation, the exact `.xfm` text layout, and the `talairach_avi`
provenance — all read directly from
[`scripts/avi2talxfm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm) and the `mri_matrix_multiply` usage. No
open questions.

## References

- FreeSurfer source: [`scripts/avi2talxfm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/avi2talxfm) (v8.2.0); identical copy at `talairach_avi/avi2talxfm`.
- Avi Snyder `4dfp` suite (`t4` transform format) — the source of the input vox2vox matrix.
