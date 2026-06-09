---
title: "fscalc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fscalc"
families: []                     # standalone calculator wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris_calc]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_volsynth]]"
  - "[[mri_concat]]"
  - "[[fscalc.fsl]]"
  - "[[sratio]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The `mod` operation is accepted by fscalc's binary-op list but is not advertised in the BEGINHELP unary/binary summaries; its behaviour comes entirely from mris_calc (fmod)."
  - "Exact data-type promotion/clamping when --odt narrows float results to uchar/short/int is delegated to mri_convert and was not exhaustively tested."
tags:
  - calculator
  - arithmetic
  - volumes
  - surfaces
  - utility
---

# fscalc

## Summary

`fscalc` is a command-line **voxel/vertex calculator** for FreeSurfer image and
surface-overlay data. It is a tcsh front end to [[mris_calc]] whose key added
value is **chaining**: where `mris_calc` applies exactly one operation per
invocation, `fscalc` accepts an arbitrary sequence of inputs and operations on a
single command line and applies them left-to-right, threading the running result
through each step. Inputs may be data files (NIfTI, MGH/MGZ, Analyze, bshort,
bfloat, even DICOM) **or** bare numeric constants, and all internal arithmetic is
done in float. This is the native-FreeSurfer calculator and is distinct from
[[fscalc.fsl]], which wraps FSL's `fslmaths`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc)
- **Binary/script location:** `$FREESURFER_HOME/bin/fscalc`
- **FreeSurfer tools invoked:** [`mris_calc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L118) (every arithmetic operation), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L59) (load the first input into a working `tmp.mgh`, and write the final output with the requested data type), [`mri_volsynth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L81-L82) (synthesize a constant-valued volume when the first input is a number), and the shell helpers `fname2ext`/`fname2stem` and `fs_temp_dir`.

## Purpose and Context

A great deal of neuroimaging "glue" work is simple per-element arithmetic on
volumes or surface overlays: subtracting two maps, masking, thresholding, taking
a ratio, converting a significance map to a p-value, scaling, etc.
[[mris_calc]] does each of these, but only one at a time, which forces a chain of
temporary files. `fscalc` removes that friction by letting you write the whole
expression in one line, e.g.

```
fscalc a.nii sub b.mgh div a.nii mul 100 --o pct.diff.nii.gz
```

which fscalc evaluates as `(((a − b) / a) × 100)`. Internally it materialises the
running result in a single scratch `tmp.mgh` that each `mris_calc` step rewrites
in place, then converts that to the requested output file and data type.

It is a **general utility**, not part of [[wiki/pipelines/recon-all|recon-all]],
and it is heavily reused by many downstream FreeSurfer scripts — for example
[[sratio]], `groupstatsdiff`, `vsm-smooth`, `label-cortex`, and `mergeseg` all
call `fscalc` to do their per-element math.

> [!gotcha] Expression order is strict left-to-right, with no precedence
> fscalc has **no operator precedence and no parentheses**. The command line is a
> running accumulator: result ← (result `op` next-input). So
> `a sub b div c mul 100` means `(((a−b)/c)×100)`, not `a − b/c + …`. Reorder the
> tokens to get the grouping you want.

## Inputs

### Required Inputs

- **An expression**: `input1 op [input2 op …]` — at least one input and one
  operation ([`scripts/fscalc:243-246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L243-L246)). Every token that is not a
  recognised flag and not an operation name is treated as an *input*.
  - An **input** is either a path to an existing data file **or** a numeric
    **constant**. The check is literally "does this path exist on disk?"
    ([`scripts/fscalc:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L57)); if not, it is treated as a constant.
  - Supported file formats are whatever `mri_convert`/`mris_calc` read: NIfTI
    (`.nii`, `.nii.gz`), MGH/MGZ, Analyze (`.img`), `bshort`, `bfloat`, and DICOM.
- **An output**: `--o <outvol>` (see flags). Required.

### Input Assumptions

> [!assumption] All file inputs must share the same geometry
> Every input *file* must have the **same dimensions** (and, for surface
> overlays, the same vertex count) because the operations are applied
> element-by-element by [[mris_calc]]. fscalc does no resampling or registration;
> mismatched inputs will make the underlying `mris_calc` step fail. Constants are
> exempt — they are either broadcast by `mris_calc` (binary op with a scalar
> second argument) or, when the *first* input is a constant, expanded by
> [[mri_volsynth]] into a volume matching the first *file* it finds among the
> remaining inputs ([`scripts/fscalc:70-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L70-L83)).

> [!gotcha] A constant first input needs at least one file later in the line
> If `input1` is a constant, fscalc must synthesize a volume for it and needs a
> template. It scans the remaining inputs for the first existing file and uses it
> as the `mri_volsynth --template`. If **none** of the inputs is a file, it errors
> with "no inputs are files (that exist)" ([`scripts/fscalc:77-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L77-L80)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<outvol>` (e.g. `pct.diff.nii.gz`) | path given to `--o` | The final result of the chained expression, written by `mri_convert` in the format implied by the output extension. |
| `fscalc.log` | `<tmpdir>` (default: a scratch dir beside the output) | Full command log: date, build stamp, `uname`, and the exact `mri_convert`/`mri_volsynth`/`mris_calc` commands run for each step. Suppress with `--no-log`, redirect with `--log`. |
| `tmp.mgh`, scratch dir | `<tmpdir>` | The running-accumulator working volume; deleted at the end unless `--nocleanup`/`--tmpdir` is given. |

### Output Specifications

- **All internal computation is in float.** The accumulator `tmp.mgh` is MGH
  float; precision is not lost between chained operations.
- The **output data type** defaults to whatever `mri_convert` writes for the
  target format (typically float for the running result). Use `--odt
  uchar|short|int|float` to force a type; when `--odt` is set, fscalc adds
  `--no_scale 1` to `mri_convert` so values are cast rather than intensity-rescaled
  ([`scripts/fscalc:152-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L152-L153)).
- Output **geometry equals the input geometry** (no resampling).

## Mathematical Foundations

The arithmetic is delegated to [[mris_calc]]; fscalc only sequences it. Every
operation is applied per element, with the result accumulating in `tmp.mgh`.
The operation set fscalc exposes (validated against the `mris_calc` source
[`mris_calc/mris_calc.cpp:300-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_calc/mris_calc.cpp#L300-L481)):

> [!internal] The element-wise functions live in mris_calc
> fscalc passes each operation straight to [[mris_calc]]; the formulas below are
> the `fn_*` definitions in [`mris_calc/mris_calc.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_calc/mris_calc.cpp). $A$ is the running
> accumulator, $B$ the next input.

**Binary operations** ($\text{out} = f(A, B)$):

| Op | Formula / meaning |
|----|-------------------|
| `add` / `sum`, `sub`, `mul`, `div`, `mod`, `pow` | $A+B$, $A-B$, $A\cdot B$, $A/B$ (0 if $B=0$), $\operatorname{fmod}(A,B)$, $A^{B}$ |
| `sub0` | $A-B$, but $0$ if either $A$ or $B$ is $0$ |
| `sratio` | signed ratio: $A/B$ if $A>B$, else $-B/A$; $0$ if either is $0$ |
| `pctdiff`, `pctdiff0` | percent difference $100\,(A-B)/\tfrac{A+B}{2}$ (the `0` variant returns $0$ if either is $0$) |
| `sqd`, `mag`, `atan2` | $(A-B)^2$, $\sqrt{A^2+B^2}$, $\operatorname{atan2}(A,B)$ |
| `eq`, `lt`, `lte`, `gt`, `gte` | relational: return $A$ where the comparison with $B$ holds, else $0$ |
| `upl`, `lrl` | clamp: `upl` = upper-limit ($B$ if $A\ge B$ else $A$); `lrl` = lower-limit ($B$ if $A\le B$ else $A$) |
| `and`, `or` | logical $A\,\&\&\,B$, $A\,\|\|\,B$ |
| `andbw`, `orbw` | bitwise (int-cast) $A\,\&\,B$, $A\,\|\,B$ |
| `masked` | $A$ where $B\ne 0$, else $0$ |
| `bcor` | Bonferroni correction of a significance value: with $p=10^{-|A|}$, returns $-\log_{10}\!\big(1-(1-p)^{B}\big)\cdot\operatorname{sign}(A)$ |

**Unary operations** ($\text{out} = f(A)$):

| Op | Formula / meaning |
|----|-------------------|
| `sqr`, `sqrt`, `abs`, `sign` | $A^2$, $\sqrt{A}$, $|A|$, $\operatorname{sign}(A)\in\{-1,0,1\}$ |
| `log`, `log10` | natural / base-10 log (returns $0$ for $A\le 0$) |
| `inv` | $1/A$ |
| `not` | logical NOT: $0$ if $A>0.5$, else $1$ |
| `sig2p` | significance → p-value: $10^{-|A|}$ |
| `norm` | normalization (a `mris_calc` overlay normalization; see [[mris_calc]]) |

> [!gotcha] A leading dash on an operation is allowed
> fscalc strips a single leading `-` from an operation token
> ([`scripts/fscalc:97-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L97-L98)), so `-mul` and `mul` are equivalent. This lets
> downstream scripts write `fscalc $A -sub $B -o out` (as [[sratio]] does). It also
> means an operation name can never be mistaken for a flag.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/fscalc:167-231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L167-L231)). Anything not matched here is appended to the
input/operation list.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-o`<br>`--o` | string | *(required)* | Output volume/overlay. Its position on the command line is irrelevant — it can come first, last, or in the middle. |
| `-odt`<br>`--odt` | `uchar`\|`short`\|`int`\|`float` | float (mri_convert default) | Force the output data type. When set, fscalc also passes `--no_scale 1` to `mri_convert` so values are cast, not intensity-rescaled. |
| `-float`<br>`--float` | bool | off | Convert the **first** input to float when loading it into the working volume (`mri_convert … -odt float`). Guards against integer truncation of the very first operand. |
| `--log` | string | `<tmpdir>/fscalc.log` | Write the command log to this path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null` (no log file). |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir --scratch --base <outdir>`) | Use this scratch directory for `tmp.mgh`/log; **implies `--nocleanup`** (the dir is preserved). |
| `--nocleanup` | bool | cleanup on | Do not delete the scratch directory at the end (useful for debugging intermediate `tmp.mgh`). |
| `--cleanup` | bool | **on** | Delete the scratch directory at the end (the default). |
| `--no-run` | bool | run on | Dry run: echo the `mri_convert`/`mris_calc`/`mri_volsynth` commands to the log but do not execute them. |
| `--debug` | bool | off | tcsh tracing (`set echo`/`verbose`). |
| `-help` / `--help` | bool | — | Print usage plus the embedded help **and the full `mris_calc -u` help**, then exit. |
| `-version` / `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--tmpdir` silently disables cleanup
> Passing `--tmp`/`--tmpdir` sets `cleanup = 0` ([`scripts/fscalc:202-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L202-L207)),
> so your scratch directory (and `tmp.mgh`) is left on disk even though you did
> not ask for `--nocleanup`. Combine with `--cleanup` (placed *after* `--tmpdir`)
> if you want a named tmpdir removed afterward — flags are processed in order, so
> the later one wins.

> [!gotcha] `--odt` versus `--float`
> `--float` affects only the *first* operand's load; `--odt` controls only the
> *final* write (and disables rescaling). They are independent: internal math is
> always float regardless. Use `--float` if your very first input is an integer
> map whose values would otherwise truncate before the first operation; use
> `--odt` to pin the saved output type.

> [!gotcha] Constant detection is by filename existence
> A token is an input-file if and only if it names an existing path; otherwise it
> is a constant. A typo'd filename therefore becomes a "constant" — and if it is
> the **first** input, fscalc additionally runs a `fname2ext` sanity check and
> aborts with "cannot find <i1>" when the token looks like a filename
> ([`scripts/fscalc:64-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L64-L69)). Later mistyped filenames are **not** caught and
> may be silently treated as numbers — double-check paths.

## Typical Use Cases

### 1. Percent difference between two maps

```bash
# (((a - b) / a) * 100), written as compressed NIfTI
fscalc a.nii sub b.mgh div a.nii mul 100 --o pct.diff.nii.gz
```

### 2. Threshold / mask an overlay

```bash
# Keep thickness only where the significance map sig.mgh is nonzero
fscalc lh.thickness.mgh masked lh.sig.mgh --o lh.thickness.masked.mgh
```

### 3. Scalar arithmetic on every voxel

```bash
# Add 100 to every voxel (constant may appear first or second)
fscalc a.nii add 100 --o a+100.nii
fscalc 100 add a.nii --o a+100.nii
```

### 4. Convert a significance map to a p-value, then save as float

```bash
fscalc lh.sig.mgh sig2p --o lh.pval.mgh --odt float
```

### 5. Combine two binary masks

```bash
# Voxelwise logical AND of two masks (as label-cortex does)
fscalc maskA.mgz and maskB.mgz --o both.mgz
```

## Pipeline Context

`fscalc` is a **general-purpose utility**, not a recon-all stage and not called
by [[wiki/pipelines/recon-all|recon-all]] or trac-all. It is, however, a common
building block **inside** other FreeSurfer scripts: [[sratio]] uses it for the
signed-ratio numerator/denominator math, `groupstatsdiff` for `sub0`/`pctdiff0`
group-difference maps, `vsm-smooth`, `label-cortex` (mask `and`), and `mergeseg`
(`sum`) among others.

**Predecessor:** any tool that produces volumes/overlays (e.g.
[[wiki/tools/mri_convert|mri_convert]], `mri_surf2surf`, a GLM `sig.mgh`) →
**fscalc** → **Successor:** any consumer of the resulting volume/overlay.

Within the script the call chain is
[[wiki/tools/mri_convert|mri_convert]]/[[mri_volsynth]] (load first operand) →
[[mris_calc]] (one call per operation) → [[wiki/tools/mri_convert|mri_convert]]
(write output).

## Gotchas and Caveats

> [!gotcha] No operator precedence (repeat)
> The single most surprising behaviour: the expression is a strict left-to-right
> accumulator. Plan your token order accordingly.

> [!gotcha] `mod`/`pow`/`bcor` are real but under-documented
> `mod`, `pow`, and `bcor` are in fscalc's recognised binary-op list
> ([`scripts/fscalc:105-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L105-L111)) and work via `mris_calc`, but the
> `BEGINHELP` summary lists them inconsistently (e.g. `pow`/`mod` are absent from
> the unary/binary one-liners). Trust the op list, not the help summary.

> [!contradiction] Help text vs. code on the operation list
> The terse usage block advertises a slightly different set of ops than the code
> accepts (e.g. it omits `pow` and `mod`, and the unary line omits `inv`). The
> recognised set is defined by the `if($op == …)` tests at
> [`scripts/fscalc:105-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L105-L128); code is authoritative.

> [!gotcha] DICOM and mixed formats as input are allowed
> Because inputs go through `mri_convert`/`mris_calc`, you may freely mix formats
> in one expression (`a.nii sub b.mgz`) and even use a DICOM file as an operand,
> as long as all *files* share dimensions.

## Error Compensation and Guard Rails

- **Required-argument checks.** Missing `--o` → "must spec output"; fewer than two
  input/op tokens → "must spec an input and an operation"
  ([`scripts/fscalc:239-246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L239-L246)).
- **Per-step status checks.** After every `mri_convert`/`mri_volsynth`/`mris_calc`
  call the script tests `$status` and aborts on failure, so a bad operation stops
  the chain rather than silently producing garbage.
- **Arity check on binary ops.** A binary operation with no following input errors
  with "<op> requires two arguments" ([`scripts/fscalc:113-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L113-L116)).
- **Unrecognized-op guard.** Any token reaching the op slot that matches neither
  the binary nor the unary list errors with "operation <op> not recognized"
  ([`scripts/fscalc:139-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L139-L142)).
- **Leftover-input guard.** If the expression ends on a dangling input (no
  trailing operation consumed it) the script reports "too many inputs"
  ([`scripts/fscalc:147-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc#L147-L150)).
- **Cast-not-rescale on `--odt`.** Adding `--no_scale 1` alongside `--odt` means a
  float result narrowed to an integer type is *cast*, not intensity-windowed —
  important when the output is a label/index map.

## Related Tools

- [[mris_calc]] — the single-operation calculator fscalc wraps; consult it for the precise semantics and the full `mris_calc -u` help (which fscalc appends to its own).
- [[fscalc.fsl]] — the sibling wrapper around FSL's `fslmaths`; same idea, different (FSL) back end. Use `fscalc` for native-FreeSurfer math.
- [[wiki/tools/mri_convert|mri_convert]] — loads the first operand and writes the final output (with `--odt`).
- [[mri_volsynth]] — synthesizes a constant-valued volume when the first input is a number.
- [[mri_concat]] — for stacking/averaging across frames or files (a complementary multi-input tool).
- [[sratio]] — a downstream script that builds a signed-ratio map almost entirely out of `fscalc` calls; a good worked example.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the chaining/accumulator
semantics, constant-vs-file detection, the constant-first template logic, the
leading-dash op handling, the `--odt`/`--no_scale` and `--tmpdir`-implies-no-cleanup
interactions, and the full operation list with formulas — read from
[`scripts/fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc) and cross-checked against
[`mris_calc/mris_calc.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_calc/mris_calc.cpp).

> [!gap] `--odt` narrowing behaviour
> The exact clamping/promotion when a float result is written to `uchar`/`short`/
> `int` is handled inside `mri_convert` (with `--no_scale 1`) and was not
> exhaustively tested for out-of-range values.

> [!gap] `mod` advertisement
> `mod` is accepted by the binary-op test but only partially advertised in the
> help; its semantics are exactly `mris_calc`'s `fmod`.

## References

- FreeSurfer source: [`scripts/fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc) (v8.2.0); operation formulas from [`mris_calc/mris_calc.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_calc/mris_calc.cpp).
- Built-in help: `fscalc --help` (prints the `BEGINHELP` block plus `mris_calc -u`).
- Companion calculator: [[mris_calc]]; FSL-backed sibling: [[fscalc.fsl]].
