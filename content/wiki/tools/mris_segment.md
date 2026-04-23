---
title: "mris_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_segment/mris_segment.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_segmentation_stats]]"
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Exact command-line interface is not fully exposed in the first 120 lines; more source reading needed."
  - "Whether this tool is actively used in any standard FreeSurfer workflow is unclear."
tags:
  - segmentation
  - surface
  - connectivity
  - fMRI
---

# mris_segment

## Summary

`mris_segment` segments cortical areas on a surface based on connectivity, correlation, or intensity profiles derived from fMRI correlation matrices. It is a research tool for data-driven parcellation of the cortical surface, using classifiers (Gaussian, similarity, or label fusion) applied to per-vertex correlation vectors. The tool is attributed to Bruce Fischl.

## Source Information

- **Language:** C++
- **Source file:** `mris_segment/mris_segment.cpp`
- **Key libraries:** `mrisurf`, `mri`, `label`, `matrix`
- **Classification modes defined:** `CLASSIFY_GAUSSIAN` (0), `CLASSIFY_SIMILARITY` (1), `CLASSIFY_LABEL_FUSION` (2)

## Purpose and Context

Standard FreeSurfer parcellation uses atlas-based label transfer (see [[mris_ca_label]]). `mris_segment` takes an alternative data-driven approach: it uses connectivity or correlation matrices from fMRI data to group cortical vertices into regions based on the similarity of their functional profiles. This is relevant for delineating functionally-defined areas such as MT+ or other regions where atlas-based boundaries may not reflect individual functional organization.

The tool is research-oriented and is not part of the standard `recon-all` pipeline.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Correlation matrix (`cormat.mgz` by default) | Per-vertex correlation vectors used as feature vectors for classification. | `.mgz` |
| Prior label (e.g., `MT.fsaverage5.label`) | Spatial prior label defining an approximate region of interest on the average surface. | `.label` |
| Prior log-odds map (`invivo.MT.logodds.mgz`) | Spatial prior log-odds volume for the target area. | `.mgz` |
| Subject data directory | fMRI subdirectory (default: `fmri`) within each subject directory. | Directory |
| Subjects directory (`SUBJECTS_DIR`) | Standard FreeSurfer subjects directory. | Directory |

## Outputs

> [!gap] Output files
> The exact output files produced by `mris_segment` are not fully described in the first section of the source code. Reading deeper into the `main()` function would clarify this.

Based on the source structure, the tool likely produces per-vertex label assignments stored as FreeSurfer label files or surface overlay files. The output subject is set via `-output` flag.

## Mathematical Foundations

Three classifier modes are implemented:

**Gaussian classifier (`-g`):**
Each vertex's feature vector (a column from the correlation matrix) is compared to a Gaussian model of the target region's feature distribution. Classification likelihood is:
$$
p(\mathbf{v}_i \mid \text{class}) \propto \exp\!\left(-\frac{(\mathbf{v}_i - \boldsymbol{\mu})^T \Sigma^{-1} (\mathbf{v}_i - \boldsymbol{\mu})}{2}\right)
$$

**Similarity classifier:**
Classification based on cosine or correlation similarity between the query vertex's feature vector and a template profile.

**Label fusion classifier (`-l`):**
Transfers labels from multiple training subjects by weighted voting, weighting each subject's contribution by the similarity of its feature vector to the query vertex.

The spatial prior (log-odds map) modulates the classification likelihoods to incorporate anatomical constraints.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-sdir <path>` | directory | `$SUBJECTS_DIR` | Overrides subjects directory. |
| `-cmat <name>` | filename | `cormat.mgz` | Correlation matrix filename; also accepted as `-input` or `-data`. |
| `-input <name>` | filename | `cormat.mgz` | Alias for `-cmat`. |
| `-data <name>` | filename | `cormat.mgz` | Alias for `-cmat`. |
| `-label <name>` | label name | `MT.fsaverage5.label` | Prior label file. |
| `-prior <name>` | filename | `invivo.MT.logodds.mgz` | Prior log-odds map. |
| `-smooth <N>` | integer | — | Number of smoothing iterations applied to posteriors. |
| `-g` | — | off | Use Gaussian classifier (same as `-classifier 0`). |
| `-l` | — | off | Use label fusion classifier (same as `-classifier 2`). |
| `-lh` | — | off | Process left hemisphere; also accepted as `-rh` for right. |
| `-rh` | — | off | Process right hemisphere; alias for `-lh`. |
| `-prioronly` | — | off | Use spatial prior only, skip feature-based classification; also `-prior_only`. |
| `-prior_only` | — | off | Alias for `-prioronly`. |
| `-noprior` | — | off | Do not use spatial prior; also accepted as `-no_prior`. |
| `-no_prior` | — | off | Alias for `-noprior`. |
| `-dir <dir>` | directory | `fmri` | Subdirectory under subject dir containing fMRI data; also `-input_dir`. |
| `-input_dir <dir>` | directory | `fmri` | Alias for `-dir`. |
| `-t <T>` | float | — | Correlation threshold for classification. |
| `-lthresh <T>` | float | — | Log-odds threshold for prior-based classification. |

## Configuration Interactions

- `-prioronly` (or `-prior_only`) bypasses feature-based classification entirely; only the spatial prior is used. This can serve as a sanity check or baseline.
- `-t` and `-lthresh` together determine the joint threshold; both must be exceeded for a vertex to be classified as belonging to the target region.
- Label fusion mode (`-l`) requires multiple subjects to be specified; it ignores `-t` in favor of weighted voting.

## Typical Use Cases

**Segment MT+ using correlation-based Gaussian classifier:**
```bash
mris_segment \
  -sdir $SUBJECTS_DIR \
  -lh \
  -g \
  -cmat cormat.mgz \
  -label MT.fsaverage5.label \
  -prior invivo.MT.logodds.mgz \
  subject1 subject2 subject3 output_subject
```

## Pipeline Context

`mris_segment` is not called by `recon-all`. It is a standalone research tool for functional parcellation studies. It operates on already-processed subjects (requires surfaces and fMRI correlation matrices).

## Gotchas and Caveats

> [!gap] Underdocumented interface
> The command-line interface, required positional arguments, and output file names are not documented in the embedded help or in the FreeSurfer wiki. The source code suggests a positional argument structure of `<subject1> <subject2> ... <output_subject>` but this needs confirmation.

> [!gotcha] Correlation matrix format
> The tool expects the correlation matrix in a specific `.mgz` format where each frame encodes per-vertex correlations. Creating this input requires separate fMRI preprocessing and correlation computation steps not included in this tool.

## Related Tools

- [[mris_ca_label]] — atlas-based cortical parcellation (the standard FreeSurfer approach)
- [[mris_segmentation_stats]] — computes ROC statistics for surface segmentations
- [[mris_spherical_average]] — averages surface data across subjects on the sphere
- [[surface-format]] — surface and overlay file format reference

## Confidence and Gaps

**Low confidence overall.** The source code exposes the classifier constants and default parameter values, but the full command-line interface is not embedded as a help string in the first ~220 lines of source. The output structure and exact usage require deeper source reading.

> [!gap] Full CLI documentation missing
> The embedded help text appears to be absent or minimal. Full documentation of required positional arguments and output file names requires reading deeper into the `main()` function.
