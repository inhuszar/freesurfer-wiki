---
title: "sratio"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/sratio"
families: []                     # standalone convenience wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[fscalc]]"
  - "[[mri_concat]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[meanval]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - volume-math
  - comparison
  - convenience
---

# sratio

## Summary

`sratio` computes a voxel-wise **signed ratio** of two volumes A and B and writes
the result to an output volume. Where A is larger it stores $+A/B$; where B is
larger it stores $-B/A$. This makes the ratio symmetric around zero and always
$\ge 1$ in magnitude (or $\le -1$), so a value of $+1.2$ means "A is 20% larger
here" and $-1.2$ means "B is 20% larger here". It is a small tcsh orchestrator
that builds the result entirely from [[fscalc]], [[mri_binarize]],
[[mri_concat]], and [[mri_mask]]; it no longer depends on `fslmaths`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/sratio`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/sratio`
- **Helpers invoked:** [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L114) (subtract/divide/multiply/add), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L142) (build the A>B and B>A masks), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L99) (`--abs` and the `--max` mask), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L186) (apply the magnitude threshold), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L192) (write the unmasked output), and `fs_temp_dir` for scratch ([`scripts/sratio:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L74)).

## Purpose and Context

A plain ratio $A/B$ is awkward to read: values below 1 (where B>A) are compressed
into $(0,1)$ while values above 1 (where A>B) run to infinity, so the same
percentage difference looks very different depending on which volume is larger.
`sratio` rewrites the comparison on a **signed, symmetric** scale: the magnitude
is the larger-over-smaller ratio and the **sign** records which input won. This
is convenient for difference maps such as comparing a parameter map between two
processing streams, two time points, or two groups.

It is a stand-alone analysis utility (originally built for QA-style volume
comparisons) and is **not** part of [[wiki/pipelines/recon-all|recon-all]] or
`trac-all`. The header comment notes it formerly used `fslmaths` but now uses only
FreeSurfer tools ([`scripts/sratio:8-10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L8-L10)). It sets
`FSLOUTPUTTYPE=NIFTI` ([`scripts/sratio:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L26)) and does all intermediate
work in NIfTI; the final format follows the extension of the output you name.

## Inputs

### Required Inputs

`sratio` takes **three positional arguments** in order (parsed by the `default:`
case of the argument loop, [`scripts/sratio:267-287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L267-L287)):

1. **A** — first input volume ([[mgz]], [[nifti]], …); must exist
   ([`scripts/sratio:268-273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L268-L273)).
2. **B** — second input volume, same voxel space as A; must exist
   ([`scripts/sratio:274-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L274-L279)).
3. **sAdivB** — output volume path (the signed ratio) ([`scripts/sratio:280-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L280-L281)).

The flags (`--abs`, `--mask-thresh`, …) may be interspersed; anything that is not
a recognised flag is consumed positionally as A, then B, then the output.

### Input Assumptions

> [!assumption] A and B share voxel geometry
> All arithmetic is done voxel-by-voxel by [[fscalc]] with no resampling or
> registration, so A and B must have identical dimensions and geometry. The
> output inherits that geometry.

> [!assumption] Strictly-positive inputs give clean results
> Because the result involves $A/B$ and $B/A$, zeros and negative values are
> numerically awkward: division by zero yields infinities/NaNs and negative
> inputs break the "magnitude is the larger/smaller ratio" interpretation. Use
> `--abs` to take absolute values first, and/or `--mask-thresh` to exclude
> low-signal voxels (see [Mathematical Foundations](#mathematical-foundations)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `sAdivB` (3rd positional arg) | user-specified path | The signed-ratio volume ($+A/B$ where A>B, $-B/A$ where B>A), masked if `--mask-thresh` was given. |
| `<tmpdir>/*.nii` | scratch dir | Intermediate volumes (`A.nii`, `B.nii`, `AgtB.nii`, `BgtA.nii`, `AdivB.nii`, `BdivA.nii`, the two masks, `mask.nii`, `sAdivB.nii`); removed unless `--nocleanup`/`--tmpdir`. |

By default no log file is written: the log path is hard-set to `/dev/null`
([`scripts/sratio:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L79)), so the `--log`/`--nolog` flags are not honoured (see gotcha).

### Output Specifications

A single-volume, single-frame map in the geometry of the inputs. Values lie in
$(-\infty, -1] \cup [1, +\infty)$ for voxels where one input strictly exceeds the
other; voxels where $A=B$ evaluate to 0 (neither the A>B nor the B>A mask selects
them — see below). With `--mask-thresh`, voxels failing the magnitude threshold
are set to 0 by [[mri_mask]]. The final on-disk format is determined by the
output filename extension via the closing [[wiki/tools/mri_convert|mri_convert]]
(or [[mri_mask]]) call.

## Mathematical Foundations

> [!math] Signed ratio
> For each voxel $v$,
> $$ s(v) = \begin{cases} +\,A(v)/B(v) & A(v) > B(v) \\ -\,B(v)/A(v) & B(v) > A(v) \\ 0 & A(v) = B(v). \end{cases} $$
> Equivalently the magnitude is $\max(A,B)/\min(A,B)$ and the sign is $+$ when A
> wins, $-$ when B wins.

The script realises this with a sequence of [[fscalc]] / [[mri_binarize]] steps
rather than a single conditional ([`scripts/sratio:112-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L112-L173)):

1. `AgtB = A - B`, `BgtA = B - A` ([`scripts/sratio:113-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L113-L124)).
2. `AdivB = A / B`; `BdivA = (B / A) * (-1)` — the sign is injected here
   ([`scripts/sratio:127-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L127-L138)).
3. Masks from the differences: `AgtBmask = (A-B ≥ 0)`, `BgtAmask = (B-A ≥ 0)` via
   `mri_binarize --min 0` ([`scripts/sratio:141-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L141-L145), [`scripts/sratio:155-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L155-L159)).
4. `Anum = AdivB * AgtBmask`, `Bnum = BdivA * BgtAmask`, then
   `sAdivB = Anum + Bnum` ([`scripts/sratio:148-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L148-L173)).

> [!gotcha] Equal voxels: `--min 0` makes both masks include A=B, but the parts cancel
> `mri_binarize --min 0` is **inclusive** of zero, so a voxel with $A=B$ is set
> in *both* `AgtBmask` and `BgtAmask`. There it contributes $+A/B = +1$ from the
> A-branch and $-B/A = -1$ from the B-branch, which sum to **0**. So tied voxels
> come out as 0, not 1 — worth knowing when you interpret a zero in the output.

> [!math] `--abs` preprocessing
> With `--abs`, A and B are first replaced by $|A|$ and $|B|$ using
> `mri_concat --abs` ([`scripts/sratio:97-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L97-L110)), so the signed ratio is computed
> on magnitudes.

> [!math] `--mask-thresh` magnitude mask
> With `--mask-thresh T`, a mask is formed from the **voxel-wise maximum of the
> magnitudes**, `mask = (max(|A|,|B|) ≥ T)` (`mri_concat --abs --max` then
> `mri_binarize --min T`), and applied to the result with [[mri_mask]]
> ([`scripts/sratio:175-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L175-L189)). This suppresses noisy low-signal voxels where the
> ratio is meaningless.

## Configuration Options

### Complete Flag Reference

Flags were enumerated from the argument parser
([`scripts/sratio:230-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L230-L290)). The three volumes are positional, not flagged.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(positional 1)* `A` | string | *(required)* | First input volume. |
| *(positional 2)* `B` | string | *(required)* | Second input volume (same space as A). |
| *(positional 3)* `sAdivB` | string | *(required)* | Output signed-ratio volume. |
| `--abs` | bool | off | Replace A and B by their absolute values before computing the ratio ([`scripts/sratio:238-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L238-L240)). |
| `--mask-thresh` | float | off | Keep only voxels where `max(|A|,|B|) ≥ thresh`; others set to 0 ([`scripts/sratio:242-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L242-L245)). |
| `--tmp`<br>`--tmpdir` | string | `fs_temp_dir --scratch` | Use this scratch directory and keep it (sets `cleanup=0`) ([`scripts/sratio:247-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L247-L252)). |
| `--nocleanup` | bool | off | Keep the scratch directory after exit ([`scripts/sratio:254-256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L254-L256)). |
| `--cleanup` | bool | on | Delete the scratch directory (the default) ([`scripts/sratio:258-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L258-L260)). |
| `--debug` | bool | off | Enable tcsh `set echo`/`verbose` tracing ([`scripts/sratio:262-265`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L262-L265)). |
| `--help` | bool | — | Print usage (with the `BEGINHELP` body, which is empty) and exit ([`scripts/sratio:40-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L40-L44)). |
| `--version` | bool | — | Print the version string and exit ([`scripts/sratio:45-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L45-L49)). |

### Configuration Interactions

> [!gotcha] `--log`/`--nolog` are accepted as variables but never take effect
> `LF` is declared ([`scripts/sratio:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L30)) but is then unconditionally
> overwritten to `/dev/null` at [`scripts/sratio:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L79), and there is **no**
> `--log`/`--nolog` case in the parser. There is effectively no run log; the
> usage text does not advertise one either.

> [!gotcha] `--tmpdir` implies keep
> Naming a temporary directory sets `cleanup=0` ([`scripts/sratio:251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L251)), so it
> is **not** removed afterwards.

- `--abs` and `--mask-thresh` compose: with both, the absolute values are used for
  the ratio **and** the threshold is applied on `max(|A|,|B|)` (which equals the
  max of the already-absolute inputs).
- The three positional arguments must appear in the order **A B output**; a fourth
  non-flag argument triggers "Flag … unrecognized" ([`scripts/sratio:282-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L282-L285)).

## Typical Use Cases

### 1. Compare a map between two processing streams

```bash
# +1.10 means stream A is 10% higher here; -1.10 means stream B is.
sratio streamA/thickness.mgz streamB/thickness.mgz sratio.thickness.mgz
```

### 2. Compare magnitudes and ignore low-signal voxels

```bash
# Take |A| and |B|, and mask out voxels below an intensity of 30.
sratio --abs --mask-thresh 30 a.nii.gz b.nii.gz sratio.masked.nii.gz
```

### 3. Visual QA of the signed ratio

```bash
sratio scan1.mgz scan2.mgz sr.mgz
# The script prints a ready-made viewer line, e.g.:
#   tkmedit -f scan1.mgz -aux scan2.mgz -fminmax 1.01 1.2 -ov sr.mgz
freeview -v scan1.mgz scan2.mgz sr.mgz:colormap=heat:heatscale=1.01,1.2,2
```

## Pipeline Context

`sratio` is a stand-alone volume-comparison utility. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** two co-registered/co-sampled volumes (e.g. two thickness maps,
two parameter maps, the same measure from two pipelines) → **sratio** →
**Successor:** the signed-ratio map is inspected in
[[wiki/tools/freeview|freeview]] or fed to a thresholding / statistics step. For a
single masked **scalar** comparison rather than a voxel map, see [[meanval]]; for
the underlying voxel arithmetic, [[fscalc]].

## Gotchas and Caveats

> [!gotcha] Tied voxels and out-of-mask voxels are 0
> Because the A-branch and B-branch contributions cancel for $A=B$ (see
> [Mathematical Foundations](#mathematical-foundations)), and `mri_mask` zeroes
> out-of-mask voxels, a 0 in the output can mean either "A equals B" or "below
> threshold" — not "ratio of 1". Use `--mask-thresh` deliberately so you can
> interpret the zeros.

> [!gotcha] Division by zero
> Voxels where the smaller input is 0 produce infinities/NaNs from
> [[fscalc]] `-div`. Mask such voxels out beforehand or with `--mask-thresh`.

> [!gotcha] No alignment is performed
> A and B are assumed to be in the same voxel grid. `sratio` neither registers
> nor reslices them; misaligned inputs give a meaningless map (or an `fscalc`
> dimension error).

## Error Compensation and Guard Rails

- **Existence checks.** A and B are each verified to exist as they are consumed
  ([`scripts/sratio:268-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L268-L279)); all three positional arguments are required
  ([`scripts/sratio:296-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L296-L309)).
- **Output directory auto-created.** The directory of the output is created with
  `mkdir -p` ([`scripts/sratio:66-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L66-L71)).
- **Propagates failure.** Every helper call is followed by `if($status) exit 1`
  (or `goto error_exit` for the `--abs` step), so a failure in any stage aborts
  the run ([`scripts/sratio:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L102), [`scripts/sratio:117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L117)).
- **No FSL dependency.** Despite setting `FSLOUTPUTTYPE`, all computation is done
  with FreeSurfer tools; `fslmaths` is no longer used ([`scripts/sratio:8-10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L8-L10)).

## Related Tools

- [[fscalc]] — the per-voxel calculator that performs every subtraction, division, multiplication, and addition.
- [[mri_binarize]] — builds the A>B / B>A selection masks and the magnitude threshold mask.
- [[mri_concat]] — provides `--abs` (absolute value) and the `--max` used for the threshold mask.
- [[mri_mask]] — applies the `--mask-thresh` mask to the result.
- [[wiki/tools/mri_convert|mri_convert]] — writes the final output in the requested format.
- [[meanval]] — sibling Doug-Greve convenience wrapper for a single masked mean rather than a voxel-wise ratio.

## Confidence and Gaps

**High confidence:** the signed-ratio definition, the exact `fscalc`/`mri_binarize`
sequence, the tie-cancellation behaviour, the `--abs` and `--mask-thresh`
semantics, and the dead `--log`/`--nolog` handling are all read directly from
[`scripts/sratio`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio). The `BEGINHELP` block is empty, so `--help` prints only the
short usage, which matches the source.

## References

- FreeSurfer source: [`scripts/sratio`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio) (v8.2.0).
- Built-in help: `sratio --help` (usage at [`scripts/sratio:325-336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/sratio#L325-L336); the `BEGINHELP` body is empty).
