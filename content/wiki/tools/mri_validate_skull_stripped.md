---
title: "mri_validate_skull_stripped"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_watershed/mri_validate_skull_stripped.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_synthstrip]]"
  - "[[mri_binarize]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Progname is set to 'Validation', not 'mri_validate_skull_stripped' — may indicate this binary is a testing helper rather than a primary user tool."
  - "Relationship to the main mri_watershed pipeline unclear. No --help flag in source."
tags:
  - skull-stripping
  - validation
  - quality-control
---

# mri_validate_skull_stripped

## Summary

`mri_validate_skull_stripped` compares a skull-stripped test volume against a reference volume and computes two error metrics — the false-positive rate ($p_f$) and the false-negative (miss) rate ($p_m$) — weighted by a user-supplied cost parameter. It is a diagnostic utility for quantitatively evaluating skull-stripping quality.

## Source Information

- **Language:** C++
- **Source file:** `mri_watershed/mri_validate_skull_stripped.cpp`
- **Note:** The source sets `Progname = "Validation"` rather than the binary name, suggesting this may have originated as an internal testing utility co-located with `mri_watershed`.

## Purpose and Context

After skull stripping, it is important to confirm that brain tissue has not been erroneously removed (false negatives, i.e., misses) and that non-brain tissue has not been retained (false positives). This tool quantifies both failure modes against a gold-standard reference segmentation. The weighted error $E(c)$ penalises misses more heavily when $c > 1$, reflecting the clinical priority of preserving all brain tissue.

## Inputs

| Argument | Description |
|----------|-------------|
| `mri_reference` | Reference (gold-standard) skull-stripped volume |
| `mri_test` | Test skull-stripped volume to be evaluated |
| `weight` | Cost parameter $c \geq 1$; values $> 1$ penalise misses more than false positives |

All volumes must be read-compatible formats (MGZ, NIfTI, etc.) via the standard `MRIread()` call.

> [!assumption] Input data assumption
> Both volumes must have identical dimensions (width, height, depth). The program exits with an error if dimensions do not match.

## Outputs

Printed to stdout (no output file is written):

```
   pf   =  <float>    # false-positive rate
   pm   =  <float>    # false-negative (miss) rate
```

No output volumes are created.

## Mathematical Foundations

The program counts voxels in the union of the two non-zero masks and computes:

$$
p_f = \frac{N_{\text{false positive}}}{N_{\text{union}}}
$$

$$
p_m = \frac{N_{\text{false negative}}}{N_{\text{union}}}
$$

$$
E(c) = \frac{p_f + c \cdot p_m}{1 + c}
$$

where:
- $N_{\text{false positive}}$: voxels with `test > 0` but `reference == 0`
- $N_{\text{false negative}}$: voxels with `reference > 0` but `test == 0`
- $N_{\text{union}}$: total voxels in the union of both masks
- $c$: user-supplied cost weight (must be $\geq 1$)

$E(c)$ reduces to the simple error rate when $c = 1$; increasing $c$ progressively penalises missed brain voxels over false inclusions.

> [!math] Consistency check
> The code also tracks an integer `consistent` flag that is set to 0 if any voxel has `reference > 0`, `test > 0`, and `reference != test`. However, this check is present but its result is not printed in the current source (the `printf` is commented out).

## Configuration Options

The tool takes exactly three positional arguments:

| Position | Name | Description |
|----------|------|-------------|
| 1 | `mri_reference` | Reference gold-standard brain mask |
| 2 | `mri_test` | Test brain mask to evaluate |
| 3 | `weight` | Cost weight $c$ (float, must be $\geq 1$) |

There are no flags. If argument count is not exactly 3, usage is printed and the program exits.

## Configuration Interactions

No flags; all configuration is positional. The only constraint is that `weight` must satisfy $c \geq 1$ (enforced with an error exit otherwise).

## Typical Use Cases

```bash
# Compare a watershed-stripped brain to a manual reference
mri_validate_skull_stripped \
    bert/mri/brainmask_manual.mgz \
    bert/mri/brainmask.mgz \
    1.5
```

Output will be two lines reporting `pf` and `pm`.

## Pipeline Context

This tool is not called by `recon-all` during standard processing. It is used offline to benchmark skull-stripping methods:

- Run after [[mri_watershed]] or [[mri_synthstrip]] to compare against a manual reference
- Useful when developing or tuning skull-stripping parameters

## Gotchas and Caveats

> [!gotcha] Progname mismatch
> The internal program name is hardcoded as `"Validation"` rather than `"mri_validate_skull_stripped"`. This affects error messages and version-string reporting.

> [!gotcha] No --help flag
> There is no `--help` or `-h` option. Running the tool with zero or wrong argument count prints a minimal usage string: `USAGE: tntester mri_reference mri_test weight (>1)`. The internal name `tntester` is a legacy artefact.

> [!gotcha] $E(c)$ is computed but not printed
> The weighted combined error $E(c)$ is computed in the source but the corresponding `printf` line is commented out. Only $p_f$ and $p_m$ are printed.

> [!gap] User-facing status
> It is unclear whether this is intended as a primary user tool or a developer testing utility. The binary name, internal name (`tntester`), and commented-out output lines all suggest it was originally a development helper that was compiled and installed alongside `mri_watershed`.

## Related Tools

- [[mri_watershed]] — skull-stripping tool whose output this validates
- [[mri_synthstrip]] — deep learning skull stripper (preferred in 8.x)
- [[mri_binarize]] — can binarize brain masks for further comparison

## Confidence and Gaps

**High confidence:** mathematical formulas (directly from source), argument parsing, output format.

**Low confidence:** intended use context (tool appears to be a developer utility; unclear if it is part of any documented workflow).

> [!gap] Relationship to recon-all QC
> It is unknown whether any automated QC script within the FreeSurfer distribution calls this tool to validate skull-stripping results.
