---
title: "mris_entropy"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_entropy/mris_entropy.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_calc]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The entropy measure computed is the L2-normalised entropy of a w-file overlay, not Shannon entropy of the surface geometry per se."
tags:
  - surface
  - entropy
  - morphometry
  - curvature
---

# mris_entropy

## Summary

`mris_entropy` computes the entropy of a surface overlay (w-file) on a FreeSurfer surface. The entropy measure is derived from the L2-normalised distribution of per-vertex values, treating them as a probability-like distribution. The result is a single scalar printed to stdout.

## Source Information

- **Language:** C++
- **Source file:** `mris_entropy/mris_entropy.cpp`
- **Author:** Bruce Fischl
- **Key library calls:** `MRISreadValues()`, `MRISaverageVals()`

## Purpose and Context

Surface entropy measures can quantify the spatial distribution or randomness of a functional or morphometric overlay on the cortical surface. This tool was used in early FreeSurfer research for quantifying curvature or functional map dispersion.

## Inputs

- **Subject** (positional arg 1): Subject name in `$SUBJECTS_DIR`.
- **Hemisphere** (positional arg 2): `lh` or `rh`.
- **W-file** (positional arg 3): Per-vertex overlay file in FreeSurfer w-format (binary curvature/value file).

The tool reads the original surface (`orig`) from `$SUBJECTS_DIR/<subj>/surf/<hemi>.orig`.

## Outputs

- **stdout**: A single scalar entropy value printed to the terminal.
- No output files are written.

## Mathematical Foundations

Let $w_i$ be the absolute value of the overlay at vertex $i$. The L2 normalised weight is:

$$
p_i = \frac{w_i}{\|w\|_2} = \frac{w_i}{\sqrt{\sum_j w_j^2}}
$$

The entropy is then:

$$
H = -\sum_{i} p_i \log p_i
$$

> [!math] Normalisation convention
> The tool first takes the absolute value of all vertex values (`v->val = fabs(v->val)`), then normalises by the L2 norm (root-sum-of-squares) rather than L1 norm. This means the entropy reflects the spread of squared overlay magnitudes rather than a standard probability-mass entropy.

The code exits with an error if the total L2 norm is zero (all-zero overlay).

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-n` | `<int>` | 0 | Number of surface smoothing iterations before computing entropy |
| `-sdir` | `<dir>` | `$SUBJECTS_DIR` | Override subjects directory |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `-n` smooths the overlay values with surface neighbourhood averaging before computing entropy. Larger `-n` reduces high-frequency noise and changes the entropy result.
- `--normalize` flag is parsed but not clearly implemented in the main function (variable `normalize_flag` is set but not used in the entropy computation).

## Typical Use Cases

```bash
# Compute entropy of a curvature overlay
mris_entropy subj001 lh lh.curv.w

# With smoothing
mris_entropy -n 5 subj001 lh lh.curv.w
```

## Pipeline Context

Not called by `recon-all`. Used in specialised morphometric analyses.

## Gotchas and Caveats

> [!gotcha] Reads orig surface
> The tool always reads the `orig` surface from `$SUBJECTS_DIR/<subj>/surf/<hemi>.orig`. The surface is only used for topology (vertex neighbourhood); vertex coordinates are not used in the entropy computation.

> [!gotcha] W-file format required
> The overlay must be in FreeSurfer w-file format (binary). MGZ or curv format overlays cannot be used directly.

> [!gotcha] Not Shannon entropy of geometry
> This does NOT compute the geometric entropy of the surface shape. It computes the distributional entropy of an external overlay. The name is somewhat misleading.

## Related Tools

- [[mris_calc]] — arithmetic operations on surface overlays
- [[surface-format]] — FreeSurfer surface and overlay file formats

## Confidence and Gaps

**Confident (from source):** Input format requirements, entropy formula (L2-normalised), smoothing option, output to stdout only.

**Uncertain:** Whether `normalize_flag` has any effect (set but not used in the visible entropy computation).
