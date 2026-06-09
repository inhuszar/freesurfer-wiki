---
title: "xhemi-tal"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/xhemi-tal"
families: []                     # standalone xhemi helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[xhemireg]]"
  - "[[mri_info]]"
  - "[[mri_matrix_multiply]]"
  - "[[lta-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - cross-hemisphere
  - xhemi
  - talairach
  - registration
  - symmetry
---

# xhemi-tal

## Summary

`xhemi-tal` computes the Talairach registration (`talairach.xfm`) for the
left-right mirror sub-subject created by [[xhemireg]], **analytically** from the
original (unflipped) `talairach.xfm`. Instead of re-registering the flipped
volume to the MNI305 template, it composes the original Talairach transform with
the scanner→tkreg geometry of `orig.mgz` and a pure L-R reflection, using
[[mri_matrix_multiply]], and writes the result as the flipped subject's
`xhemi/mri/transforms/talairach.xfm`. It is a fast, deterministic alternative to
recomputing Talairach for the mirror subject.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/xhemi-tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal)
- **Binary/script location:** `$FREESURFER_HOME/bin/xhemi-tal`
- **Original author:** Doug Greve
- **Key FreeSurfer tools invoked:** [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L79) (`--vox2ras`, `--vox2ras-tkr`), [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L103) (`-fsl`), and `fs_temp_dir`.

## Purpose and Context

The cross-hemisphere ("xhemi") workflow built by [[xhemireg]] mirrors a subject
across the L-R axis so both hemispheres can be analysed on the symmetric template
`fsaverage_sym`. The mirror sub-subject needs its own Talairach registration. There
are two ways to obtain it: **recompute** it by registering the flipped volume to
MNI305 (what `xhemireg --tal-compute` does via `rca-talairach`), or **derive** it
from the existing transform. `xhemi-tal` is the standalone implementation of the
latter — it is the analytic counterpart to `xhemireg --tal-estimate`, expressed
as a closed-form matrix product, and is preferable when the original Talairach was
already trusted (it avoids a second, possibly inconsistent, registration).

`xhemi-tal` is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run
after [[xhemireg]] has created the `xhemi/` directory.

## Inputs

### Required Inputs

- **Subject ID** (`--s subject`) — must already have:
  - `mri/orig.mgz` (the conformed volume, for its geometry), and
  - `mri/transforms/talairach.xfm` (the **original**, unflipped Talairach), and
  - an existing `xhemi/` directory produced by [[xhemireg]]
    ([`scripts/xhemi-tal:213-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L213-L217)).

### Input Assumptions

> [!assumption] xhemireg has already run; orig.mgz defines the geometry
> The script reads the vox→RAS (`N`) and vox→tkrRAS (`T`) matrices from
> `mri/orig.mgz` ([[mri_info]]) and the linear part of the existing
> `talairach.xfm`. It assumes the standard FreeSurfer convention that the L-R
> reflection in tkreg space is the fixed matrix $V$ below. If `xhemi/` is
> missing, it errors and tells you to run [[xhemireg]] first.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `xhemi/mri/transforms/talairach.xfm` | `<subject>/xhemi/mri/transforms/` | the flipped subject's Talairach registration, in MNI `.xfm` (Transform_Type = Linear) format |
| `xhemi/mri/transforms/xhemi-tal.log` | same dir | run log (unless `--nolog`) |

### Output Specifications

The output is a 3×4 linear MNI transform written in the standard `talairach.xfm`
text format ("MNI Transform File" header, `Linear_Transform =` block). It plays
the same role for the `xhemi/` sub-subject that `talairach.xfm` plays for the
original — see [[lta-format]] for the related binary transform representation.

## Mathematical Foundations

> [!math] Flipped Talairach as a matrix product
> Let $X$ be the linear part of the original `talairach.xfm` (tail 3 rows, with a
> `0 0 0 1` row appended), $N$ the scanner vox→RAS of `orig.mgz`, $T$ the tkreg
> vox→RAS of `orig.mgz`, and $V$ the fixed tkreg-space L-R reflection
> $$ V = \begin{pmatrix} -1 & 0 & 0 & 1\\ 0 & 1 & 0 & 0\\ 0 & 0 & 1 & 0\\ 0 & 0 & 0 & 1\end{pmatrix}. $$
> `xhemi-tal` forms ([`scripts/xhemi-tal:103-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L103-L104), via `mri_matrix_multiply -fsl`):
> $$ X_\text{xhemi} = X \, N \, T^{-1} \, V \, T \, N^{-1}. $$
> Reading right to left, this maps scanner-RAS → vox → tkreg, applies the L-R
> reflection in tkreg space, maps back to scanner-RAS, and finally applies the
> original Talairach $X$. The first three rows of $X_\text{xhemi}$ become the
> `Linear_Transform` of the flipped subject's `talairach.xfm`.

> [!internal] The matrix algebra is delegated to mri_matrix_multiply
> All inversion and multiplication is done by [[mri_matrix_multiply]] in FSL
> matrix mode; `xhemi-tal` only assembles the operands ($X$ from the xfm tail,
> $N$/$T$ from [[mri_info]], $V$ written literally) and formats the result. See
> [[mri_matrix_multiply]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/xhemi-tal:147-197`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L147-L197)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; must already have an `xhemi/` directory. |
| `--log` | string | `xhemi/mri/transforms/xhemi-tal.log` | Explicit log file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Temporary directory for the intermediate FSL matrices; sets `cleanup=0`. |
| `--nocleanup` | bool | — | Keep the temporary matrices. |
| `--cleanup` | bool | on | Remove the temporary directory at the end (default). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print help and exit. |

### Configuration Interactions

The only meaningful interaction is between `--tmp`/`--tmpdir` and cleanup:
supplying a temp directory automatically sets `cleanup = 0`
([`scripts/xhemi-tal:170-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L170-L175)), so the intermediate FSL matrices are preserved
for inspection. There are no mutually-exclusive computational flags — the
transform computation is unconditional.

## Typical Use Cases

### Compute the flipped Talairach after xhemireg

```bash
xhemireg --s sub01 --no-tal-compute   # build the mirror without recomputing tal
xhemi-tal --s sub01                    # derive xhemi talairach.xfm analytically
```

This produces `sub01/xhemi/mri/transforms/talairach.xfm` from the original
without a second registration.

## Pipeline Context

`xhemi-tal` is a small, standalone helper in the cross-hemisphere workflow. It is
not invoked by [[wiki/pipelines/recon-all|recon-all]] or trac-all (and, in
v8.2.0, not from other scripts in `scripts/` either — it is a user-facing
alternative to the Talairach branch inside [[xhemireg]]).

**Predecessor:** [[xhemireg]] (creates `xhemi/`) → **xhemi-tal** →
**Successor:** symmetric surface registration to `fsaverage_sym` ([[surfreg]]).

## Gotchas and Caveats

> [!gotcha] Requires the original talairach.xfm and an existing xhemi/ dir
> `xhemi-tal` reads `mri/transforms/talairach.xfm` and writes into
> `xhemi/mri/transforms/`; if [[xhemireg]] has not created `xhemi/`, it exits with
> an instruction to run xhemireg first ([`scripts/xhemi-tal:213-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L213-L217)).

> [!gotcha] Analytic, not re-registered
> The output is a deterministic function of the original Talairach and the
> `orig.mgz` geometry. If the original `talairach.xfm` is wrong, the flipped one
> will be wrong in the mirror-image way; use `xhemireg --tal-compute` if you want
> an independent registration of the flipped volume instead.

## Error Compensation and Guard Rails

- **Prerequisite checks.** Aborts if the subject, the subject directory, or the
  `xhemi/` directory is missing ([`scripts/xhemi-tal:203-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L203-L217)).
- **Self-contained math.** No external registration is performed, so the result
  is reproducible and fast; there is nothing to converge or fail numerically
  beyond the matrix inversions.

## Related Tools

- [[xhemireg]] — creates the `xhemi/` mirror subject; its `--tal-compute` /
  `--tal-estimate` options are the two alternatives to this script.
- [[mri_info]] — supplies the vox→RAS and vox→tkrRAS geometry of `orig.mgz`.
- [[mri_matrix_multiply]] — performs the matrix product (and inversions) that
  build the flipped transform.
- [[lta-format]] — the binary transform format related to `talairach.xfm`.

## Confidence and Gaps

**High confidence:** the entire script is short and fully traced — the matrix
product $X N T^{-1} V T N^{-1}$, the operand assembly, the output format, the
prerequisite checks, and the flag set all come directly from
[`scripts/xhemi-tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal). No open questions.

## References

- FreeSurfer source: [`scripts/xhemi-tal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal) (v8.2.0).
- Built-in help: `xhemi-tal --help` ([`scripts/xhemi-tal:244-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemi-tal#L244-L247)).
- Companion tool: [[xhemireg]].
