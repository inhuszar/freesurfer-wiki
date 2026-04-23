---
title: "talairach_afd"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "talairach_afd/talairach_afd.cpp"
families:
  - "talairach"
recon_all_stage: "autorecon1"
related:
  - "[[talairach]]"
  - "[[talairach2]]"
  - "[[talairach_avi]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The AFD reference files (mean vector, covariance matrix, probability distribution) content and training methodology not documented."
tags:
  - talairach
  - quality-control
  - failure-detection
  - autorecon1
---

# talairach_afd

## Summary

`talairach_afd` (Automatic Failure Detection) automatically detects failures in Talairach alignment by comparing a subject's Talairach transform against a multivariate probability model derived from a population of known-good registrations. The tool reads the subject's `talairach.xfm` transform, extracts its 12 parameters, and evaluates the probability of the transform under a multivariate normal model. If the probability falls below a threshold, the transform is flagged as a likely failure.

## Source Information

- **Language:** C++
- **Source file(s):** `talairach_afd/talairach_afd.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/talairach_afd`
- **Original Author:** Laurence Wastiaux
- **Reference documentation:** `dev/docs/Automatic_Failure_Detection.doc` (internal FreeSurfer document)

## Purpose and Context

Talairach registration can fail silently — the resulting `.xfm` file is syntactically valid but the alignment is incorrect. `talairach_afd` provides automated quality control by:

1. Extracting the 12-parameter affine transform from `talairach.xfm`.
2. Evaluating a multivariate normal probability: $P(\mathbf{t} | \boldsymbol{\mu}, \boldsymbol{\Sigma})$ where $\mathbf{t}$ is the transform parameter vector, $\boldsymbol{\mu}$ is the mean over good registrations, and $\boldsymbol{\Sigma}$ is the covariance matrix.
3. Comparing the p-value to a threshold (default 0.01).
4. Returning exit code 0 (pass) or 1 (fail).

This is called in `recon-all autorecon1` to catch catastrophic registration failures early in the pipeline.

## Inputs

### Required Inputs

(Via flags or positional arguments)

- **`-subj <subject>`** — FreeSurfer subject ID. The `.xfm` path is derived from `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`.
- **`-xfm <path>`** — explicit path to the Talairach `.xfm` file (alternative to `-subj`).

### Input Assumptions

> [!assumption] AFD reference files must be present
> The tool reads mean vector, covariance matrix, and probability distribution files from a reference directory (`afd_dir` or `$FREESURFER_HOME/average/`). These files were generated from a population of known-good Talairach registrations. Their exact names and format are determined by the source.

> [!assumption] Transform is 12-parameter affine
> The tool calls `Load_xfm()` to extract a vector of 12 transform parameters from the `.xfm` file. Non-affine (nonlinear) transforms are not supported.

## Outputs

### Return Values

- **Exit code 0** — registration is consistent with good alignment (p-value ≥ threshold).
- **Exit code 1** — registration flagged as failed (p-value < threshold).

### Console Output

- Subject name, p-value, and pass/fail verdict are printed to stdout.

## Mathematical Foundations

**Transform parameterization:** The 12-parameter affine matrix $M \in \mathbb{R}^{3 \times 4}$ is extracted and flattened into a vector $\mathbf{t} \in \mathbb{R}^{12}$ (translation, rotation, scale, shear).

**Multivariate normal evaluation:** Given population mean $\boldsymbol{\mu}$ and covariance $\boldsymbol{\Sigma}$ from the training distribution:
$$
f(\mathbf{t}) = \frac{1}{(2\pi)^{d/2}|\boldsymbol{\Sigma}|^{1/2}} \exp\left(-\frac{1}{2}(\mathbf{t}-\boldsymbol{\mu})^T \boldsymbol{\Sigma}^{-1} (\mathbf{t}-\boldsymbol{\mu})\right)
$$

The p-value is computed by integrating this density from $-\infty$ to the observed value.

**Probability histogram:** The tool also reads a pre-computed probability density (`ts_probas`) and uses it to compute the area under the curve from the subject's value downward, giving $p = P(f \leq f_{\text{subj}})$.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-subj <subject>` | string | — | Subject ID. The transform path is derived automatically from `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`. |
| `-xfm <path>` | string | — | Explicit transform file path (alternative to `-subj`). |
| `-afd <dir>` | string | `$FREESURFER_HOME/average/` | Directory containing the AFD reference files (mean, covariance, probability distribution). |
| `-t <threshold>`<br>`-threshold` | float | 0.01 | P-value threshold below which registration is flagged as failed. (`-T` also accepted via `case 'T':` switch.) |
| `-v` | boolean | false | Verbose mode. |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

- `-subj` and `-xfm` are alternative input specifications. If `-subj` is used, the transform path is constructed from `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`.
- `-t` controls sensitivity. Lower values reduce false positives but may miss some failures.

## Typical Use Cases

### Use Case 1: Check Talairach registration quality (called by recon-all)

```bash
talairach_afd -subj subject -v
```

### Use Case 2: Check explicit transform file

```bash
talairach_afd -xfm /path/to/talairach.xfm -t 0.05
```

### Use Case 3: Batch QC over multiple subjects

```bash
for s in subject1 subject2 subject3; do
  talairach_afd -subj $s && echo "$s: PASS" || echo "$s: FAIL"
done
```

## Pipeline Context

`talairach_afd` is called in `autorecon1` immediately after the Talairach registration step to validate the registration before proceeding with the rest of the pipeline.

**Predecessor:** [[talairach]] / [[talairach_avi]] (produces `talairach.xfm`) → **This tool** → `mri_em_register`

## Gotchas and Caveats

> [!gotcha] p-value threshold is subjective
> The default threshold of 0.01 was calibrated on a specific training population. For populations with unusual head sizes or shapes (e.g., paediatric, elderly with significant atrophy), the threshold may need adjustment.

> [!gotcha] Exit code usage in scripts
> `recon-all` uses the exit code of `talairach_afd` to decide whether to stop. A failed AFD check (exit code 1) will abort `recon-all` unless the user forces continuation.

> [!gotcha] Only catches catastrophic failures
> The tool detects transforms that are statistically unusual compared to the training population. It may miss subtle but clinically relevant registration errors that are within the population distribution.

## Related Tools

- [[talairach]] — computes the Talairach registration (this tool validates it)
- [[talairach_avi]] — alternative registration method
- [[talairach2]] — subject-level Talairach registration wrapper
- [[coordinate-systems]] — Talairach/MNI305 space definitions

## Confidence and Gaps

Confidence is **high**. The algorithm, statistical model, I/O paths, and exit code semantics are clearly read from source.

> [!gap] AFD reference file format
> The exact format and content of the AFD reference files (mean, covariance, probability) in `$FREESURFER_HOME/average/` were not documented. Read `ReadMeanVect()`, `ReadCovMat()`, `LoadProbas()` to document these formats.

> [!note] Audit noise: `--load`
> An automated audit may flag `--load` as missing. This string does not appear in the `talairach_afd` option parser. It is not a valid flag for this tool.
