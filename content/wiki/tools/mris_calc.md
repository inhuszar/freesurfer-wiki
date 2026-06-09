---
title: "mris_calc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_calc/mris_calc.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_concat]]"
  - "[[curv-format]]"
  - "[[surface-representations]]"
  - "[[mris_anatomical_stats]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Volume file input path through mri_identify() vs curvature detection heuristic not fully traced"
tags:
  - surface
  - arithmetic
  - overlay
  - utility
---

# mris_calc

## Summary

`mris_calc` is a command-line arithmetic calculator for per-vertex surface
overlay files ([[curv-format]]) and volumetric data. It supports binary
operators (add, sub, mul, div, comparison, masking) and unary operators (abs,
sqrt, log, sign), plus aggregation operators that print statistics to stdout
(min, max, mean, std, sum). The name is historical — despite being called
`mris_calc`, it does **not** process surface geometry files (`.surf`): these
are explicitly rejected. It operates on the per-vertex scalar data stored in
curvature/overlay files.

## Source Information

- **Language:** C++
- **Source file:** `mris_calc/mris_calc.cpp` (2628 lines, author: Rudolph Pienaar)
- **Help file:** `mris_calc/mris_calc.help.xml`
- **Binary location:** `$FREESURFER_HOME/bin/mris_calc`

## Purpose and Context

`mris_calc` is used for:

- Per-vertex arithmetic on surface measures (thickness, curvature, sulc, etc.)
- Masking surface overlays by label
- Computing percentage differences, ratios, or other derived measures
- Generating quick statistics (min, max, mean, std) on surface overlays without
  loading a full analysis environment

Not called by [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Command Syntax

```
mris_calc [options] <input1> <ACTION> [<input2> | <floatNumber>]
```

- `input1`: curvature/overlay file (required), or volume file (MGZ/MGH)
- `ACTION`: operator name (see below)
- `input2` (optional): second curvature/overlay file, volume file, or a
  bare floating-point literal (e.g., `2.0`)

When `input2` is a float literal, it is broadcast to all vertices (constant
field).

### File Type Detection

Three accepted input types:

| Type | Detection | Notes |
|------|-----------|-------|
| Float literal | `strtof()` succeeds | Broadcast scalar |
| Volume file | `mri_identify()` returns volume type | Any MGZ/MGH-compatible format |
| Curvature file | `mri_identify()` returns `MRI_CURV_FILE` | [[curv-format]] new or old format |

> [!gotcha] Surface geometry files are rejected
> Despite the `mris_` prefix, actual surface files (`.white`, `.pial`, etc.)
> are explicitly rejected with the message *"FreeSurfer surface files are not
> handled yet."* (`error_surfacesNotHandled()` at line 984). `mris_calc`
> only handles overlay/curvature data.

## Outputs

- Default output file: `"out"` + input file extension (e.g., `out.curv`)
- Override with `--output <filename>`
- Aggregation operators (`min`, `max`, `mean`, `std`, `sum`, `stats`,
  `ascii`) print to stdout; no output file is written (unless `--output`)

## Mathematical Foundations

### Binary operators

All binary operators perform element-wise operations across vertices. When
`input2` is a float literal, the scalar is broadcast:

| Operator | Formula | Special cases |
|----------|---------|---------------|
| `mul` | $A \cdot B$ | — |
| `div` | $A / B$ | Returns 0 if $B = 0$ |
| `mod` | $\text{fmod}(A, B)$ | — |
| `add` | $A + B$ | — |
| `sub` | $A - B$ | — |
| `sub0` | $A - B$ | Returns 0 if $|A| < 2\varepsilon$ or $|B| < 2\varepsilon$ |
| `pow` | $A^B$ | — |
| `sratio` | $A/B$ if $A>B$, else $-B/A$ | Returns 0 if either $\approx 0$ |
| `pctdiff` | $100(A-B)/((A+B)/2)$ | Percentage difference |
| `pctdiff0` | Same | Returns 0 if either $\approx 0$ |
| `sqd` | $(A - B)^2$ | Square difference |
| `mag` | $\sqrt{A^2 + B^2}$ | — |
| `atan2` | $\text{atan2}(A, B)$ | — |
| `set` | $B$ | Sets all vertices to B; output written to input1 filename |
| `bcor` | Bonferroni: $-\log_{10}(1-(1-10^{-|A|})^B) \cdot \text{sign}(A)$ | Input = $-\log_{10}(p)$; B = correction factor |

#### Comparison operators

| Operator | Formula | Output |
|----------|---------|--------|
| `eq` | $A$ if $A = B$, else 0 | — |
| `lt` | $A$ if $A < B$, else 0 | — |
| `lte` | $A$ if $A \le B$, else 0 | — |
| `gt` | $A$ if $A > B$, else 0 | — |
| `gte` | $A$ if $A \ge B$, else 0 | — |
| `masked` | $A$ if $B \ne 0$, else 0 | Masking |
| `and` | $A \mathbin{\&\&} B$ | Logical AND |
| `or` | $A \mathbin{\|} B$ | Logical OR |
| `andbw` | $({\rm int})A \mathbin{\&} ({\rm int})B$ | Bitwise AND |
| `orbw` | $({\rm int})A \mathbin{|} ({\rm int})B$ | Bitwise OR |

#### Clipping operators

| Operator | Formula |
|----------|---------|
| `upperlimit` | $\min(A, B)$ — clips A to upper bound B |
| `lowerlimit` | $\max(A, B)$ — clips A to lower bound B |

### Unary operators

| Operator | Formula | Special cases |
|----------|---------|---------------|
| `abs` | $|A|$ | — |
| `inv` | $1/A$ | — |
| `sqr` | $A^2$ | — |
| `sqrt` | $\sqrt{A}$ | — |
| `not` | 0 if $A > 0.5$, else 1 | — |
| `sign` | $-1$, $0$, or $+1$ | — |
| `log10` | $\log_{10}(A)$ | Returns 0 if $A \le 0$ |
| `log` | $\ln(A)$ | Returns 0 if $A \le 0$ |
| `sig2p` | $10^{-|A|}$ | Converts $-\log_{10}(p)$ significance to $p$-value |
| `norm` | $(A - \min) / (\max - \min)$ | Normalise to [0, 1] |

### Aggregation operators (stdout only)

| Operator | Output |
|----------|--------|
| `size` | Number of vertices |
| `min` | Minimum value and its vertex index |
| `max` | Maximum value and its vertex index |
| `mean` | Mean |
| `std` | Sample std dev: $\sqrt{\sum(v-\bar v)^2/(N-1)}$ |
| `sum` | Sum; also prints negCount, zeroCount, posCount |
| `prod` | Product |
| `stats` | All of the above |
| `ascii` | Dump all values to plain text (one float per line) |

## Configuration Options

### Complete Flag Reference

| Flag | Aliases | Arguments | Default | Description |
|------|---------|-----------|---------|-------------|
| `--output` | `-o`, `-O`, any option starting with `o`/`O` | `filename` | `out` | Override output filename. The parser uses a case-insensitive prefix test on the first letter, so `-O foo`, `-output foo`, and `--output foo` all behave identically. The supplied filename is taken verbatim; if it lacks a recognised extension the input1 type extension is appended (unless `--strictExtensions` is also given, in which case the extension is forced). |
| `--threads`<br>`-threads`<br>`-nthreads` | `--nthreads` | `int` | OMP default | Set the OpenMP thread count via `omp_set_num_threads()`. Only affects the binary-operator inner loop (`CURV_functionRunABC`), which is the only ROMP-parallelised path. Unary and aggregation operators ignore this. |
| `--strictExtensions` | `-e`, `-E`, any option starting with `e`/`E` | none | off | Boolean flag (`Gb_strictExtensions = 1`). Forces the output filename's extension to be reset to match the input1 type, overriding any extension the user supplied via `--output`. |
| `--label` | `-l`, `-L`, any option starting with `l`/`L` | `labelfile` | none | Read a FreeSurfer `.label` file and restrict subsequent operations to its vertices. Sets `Gb_labelMask = 1`. Unlabelled vertices are written as 0 in the output (they are zero-initialised and never touched). |
| `--verbosity` | none | `int` | 0 | Set the global verbosity level (`G_verbosity`). 0 = silent, larger values print progress and diagnostics. Argument is parsed with `atoi`. |
| `--version` | `-v`, `-V`, any option starting with `v`/`V` | none | — | Print the FreeSurfer build version and exit (status 1). |
| `--help` | `--usage`, `-h`, `-H`, `-u`, `-U`, `-?`, any option starting with `h`/`u`/`?` | none | — | Print the full help/synopsis and exit (status 1). |
| `-t` (and any option starting with `t`/`T`) | none | none | — | Recognised but is a no-op stub in `options_parse()` (sets a local `pch_text = "void"` and falls through). It does not take an argument and has no observable effect. Likely a leftover from earlier development. |

> [!gotcha] Single-letter prefix matching is greedy
> `options_parse()` first tries `--output`, `--threads`, `--strictExtensions`,
> `--version`, `--verbosity`, `--label`, `--help`/`--usage` by case-insensitive
> string compare. **Anything else** falls into a `switch (toupper(*option))`
> that branches purely on the first letter. As a result, e.g., `-elephant`
> is silently treated as `--strictExtensions`, `-vortex` is treated as
> `--version`, and `-octopus filename` is treated as `--output filename`. Use
> the long forms to avoid surprises.

### Label Masking (`--label`)

When `--label <file>` is provided:

1. The `.label` file is read to get the set of labelled vertices
2. Operations run only on labelled vertices; unlabelled vertices retain the
   zero-initialised default value in the output
3. Results are re-expanded to the full vertex count before writing

This allows computing statistics or transformations restricted to a specific
cortical region.

### Parallelism

The binary operator loop (`CURV_functionRunABC`) is OpenMP-parallelised using
the `ROMP` reproducible-OpenMP framework. Unary operators are not parallelised.
Use `--threads N` to control the thread count.

### Output File Rules

- Default output: `"out"` + extension of input1's type
- When `--output` specifies a path without a recognised extension, the input
  type extension is appended automatically
- `--strictExtensions` forces the output extension to exactly match the input
  type, overriding any user-specified extension
- Output type must match input1's type (enforced at write time)

## Typical Use Cases

### Scale a thickness map by 2

```bash
mris_calc lh.thickness mul 2.0 --output lh.thickness.x2
```

### Percentage difference between two thickness maps

```bash
mris_calc lh.thickness.ses1 pctdiff lh.thickness.ses2 \
          --output lh.thickness.pctdiff
```

### Mask curvature with cortex label

```bash
mris_calc --label $SUBJECTS_DIR/bert/label/lh.cortex.label \
          lh.curv masked lh.curv \
          --output lh.curv.cortex
```

### Print statistics of a surface overlay

```bash
mris_calc lh.thickness stats
# Prints: size, min, max, mean, std, sum, prod
```

### Convert significance to p-value

```bash
# Input is -log10(p); output is p itself
mris_calc lh.sig sig2p --output lh.pval
```

### Clamp thickness to [0, 6] mm

```bash
mris_calc lh.thickness lowerlimit 0 --output lh.thickness.clamped
mris_calc lh.thickness.clamped upperlimit 6 --output lh.thickness.clamped
```

### Dump values to ASCII

```bash
mris_calc lh.thickness ascii
# Creates lh.thickness.ascii (one float per line, all vertices)
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. Used in post-processing and analysis scripts.

## Gotchas and Caveats

> [!gotcha] Surface geometry files are explicitly rejected
> `mris_calc lh.white ...` fails with an error. Despite the name, this tool
> does not operate on surface meshes. Use [[mri_surf2vol]] or `mris_convert`
> for surface geometry operations.

> [!gotcha] `set` writes to the input1 filename
> The `set` operator outputs B for every vertex and writes the result back to
> the **input1 filename** (not to the default `out.*` filename). This is the
> only operator with this behaviour and can overwrite the input file if you
> are not careful. Use `--output` to redirect.

> [!gotcha] `div` returns 0 for division by zero (no NaN)
> Unlike IEEE 754 which produces `NaN` or `Inf` for 0/0 and A/0, `mris_calc`
> returns 0. This means division results are silently incorrect where the
> denominator is zero.

> [!gotcha] `log` and `log10` return 0 for non-positive inputs
> For $A \le 0$, both `log` and `log10` return 0 rather than raising an error or
> producing `NaN`. This can silently produce incorrect results in
> log-transformed analyses.

> [!gotcha] Label expansion writes zeros for unlabelled vertices
> With `--label`, unlabelled vertices are set to 0 in the output, not to their
> original values. If you need to preserve original values outside the label,
> use `masked` operator instead: `mris_calc A masked label_binary_overlay`.

> [!gotcha] Aggregation operators produce no output file
> Operators like `min`, `max`, `mean`, `std`, `sum`, `stats`, and `ascii`
> print to stdout only. No output file is written by default (the `--output`
> flag redirects the aggregated result to a file, one value per line for
> `ascii`, one scalar for `min`/`max`/`mean`/`std`).

## Related Tools

- [[fscalc]] — tcsh front end to `mris_calc` that adds left-to-right chaining of multiple inputs/operations in one command
- [[sratio]] — standalone tcsh tool that computes the signed ratio (the same operation as the `sratio` operator above) for two volumes
- [[mri_concat]] — frame-level operations on volume files; also can compute
  per-voxel mean, std, etc. across subjects
- [[mri_binarize]] — threshold and binarize volume files (volumetric equivalent)
- [[mris_anatomical_stats]] — produces the per-parcel statistics that
  `mris_calc` can transform at the per-vertex level
- [[curv-format]] — the binary format read and written by `mris_calc`

## Confidence and Gaps

High confidence on all operators and flag handling — derived from the complete
`operation_lookup()`, `CURV_functionRunABC()`, and `CURV_functionRunAC()`
functions in the source.

> [!gap] Volume vs. curvature file detection edge case
> When `mri_identify()` cannot determine the file type from the extension (e.g.,
> a curvature file with an unusual extension), the fallback detection logic may
> classify it as a volume file instead of a curvature file, altering the read
> path. The exact fallback heuristic has not been traced.
