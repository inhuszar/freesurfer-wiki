---
title: "mris_rf_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_rf_label/mris_rf_label.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_rf_train]]"
  - "[[mri_rf_label]]"
  - "[[mris_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - machine-learning
  - random-forest
  - labeling
  - FCD
---

# mris_rf_label

## Summary

`mris_rf_label` applies a previously trained random forest (RF) classifier to label vertices on a cortical surface. It reads a surface, a set of per-vertex overlay features (curvature files or MGZ overlays), and a pre-trained RF model file produced by [[mris_rf_train]], then classifies each vertex as normal or belonging to the target class (e.g., focal cortical dysplasia, FCD). The output is an MGZ volume indexed by vertex number containing the class label and probability for each vertex.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_rf_label/mris_rf_label.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_rf_label`
- **Original Author:** Bruce Fischl

## Purpose and Context

This tool implements the application (inference) side of a surface-based random forest machine learning pipeline for cortical labeling. The primary application encoded in the source code is detection of focal cortical dysplasia (FCD), a type of cortical malformation characterized by abnormal cortical thickness and curvature. The tool:

1. Loads a pre-trained RF model (which encodes the feature names it requires).
2. Reads the corresponding per-vertex feature overlays from the subject directory.
3. Classifies each non-ripped vertex.
4. Writes a 2-frame output: frame 0 = class label (0 or 1), frame 1 = posterior probability.

The feature set is determined entirely by the trained model; the model stores the overlay names it was trained on.

## Inputs

### Required Inputs

(Positional arguments: `<subject> <rf_model> <output>`)

- **`<subject>`** — FreeSurfer subject ID. Surfaces and overlays are loaded from `$SUBJECTS_DIR/<subject>/`.
- **`<rf_model>`** — path to the trained random forest model file (produced by [[mris_rf_train]]).
- **`<output>`** — output MGZ file path.

Environment variable `SUBJECTS_DIR` must be set, or provided via `--sdir`.

### Input Assumptions

> [!assumption] Feature overlays from surf/ directory
> The RF model stores feature names (e.g., `thickness`, `curv`). The tool reads these as `$SUBJECTS_DIR/<subject>/surf/<hemi>.<feature_name>`. All feature files must exist.

> [!assumption] Cortex label required
> The tool reads `$SUBJECTS_DIR/<subject>/label/<hemi>.cortex` to restrict classification to the cortex. Vertices outside the cortex label are ripped (excluded from classification).

> [!assumption] Optional FCD training label
> If `$SUBJECTS_DIR/<subject>/label/<hemi>.FCD` exists, it is used to mark known FCD vertices and dilate the marking by `ndilates` (default 3) vertices.

## Outputs

### Files Created

- **Output MGZ** — a 2-frame volume with shape `(nvertices, 1, 1, 2)`:
  - Frame 0: integer class label (0 = normal, 1 = dysplastic).
  - Frame 1: posterior probability $P(\text{class}=1 | \text{features})$.

## Mathematical Foundations

Random forests classify by aggregating decisions from an ensemble of decision trees:

$$
P(\text{class}=1 | \mathbf{x}) = \frac{1}{T} \sum_{t=1}^{T} h_t(\mathbf{x})
$$

where $h_t$ is the $t$-th tree's prediction for input feature vector $\mathbf{x}$, and $T$ is the number of trees. The `RFclassify()` function returns both the majority class and the posterior probability.

The feature vector for each vertex is constructed from the overlay values at that vertex across all features:
$$
\mathbf{x}_i = [f_1(i), f_2(i), \ldots, f_K(i)]
$$

If `nbhd_size > 0`, neighbourhood features are included (features from neighbouring vertices within `nbhd_size` hops), making the feature dimension $K \times (\text{nbhd\_size} + 1)$.

**Probability adjustment:** If the class prediction is 0 (normal), the probability stored in frame 1 is $1 - p$ (i.e., the probability of being normal), ensuring a consistent interpretation where larger values indicate higher confidence in class 1.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `--hemi <hemi>` | string | `lh` | Hemisphere (`lh` or `rh`). |
| `--surf <name>` | string | `white` | Surface name (e.g., `white`, `pial`). |
| `--overlay <name>` | string | — | (Parsed but unused at inference time) Overlay name; at inference the overlay list comes from the RF model. |
| `-N <n>` | integer | 0 | Neighbourhood size for feature extraction (single-character flag). |
| `-V <n>` | integer | — | Debug vertex index: enable verbose diagnostics for the specified vertex. |
| `--version` | boolean | — | Print version string and exit. |

> [!gotcha] Overlay list is determined by the model, not by flags
> Unlike [[mris_rf_train]], `mris_rf_label` ignores any `--overlay` flags and reads `rf->nfeatures` and `rf->feature_names` directly from the loaded RF model. The overlays in the model determine what feature files are loaded. The `--overlay` flag is parsed but the count (`noverlays`) is immediately overwritten by `rf->nfeatures` on line 107.

> [!gotcha] `-N` (`nbhd_size`) is dead code at runtime
> Setting `-N` to any value greater than 0 calls `ErrorExit(ERROR_UNSUPPORTED, ...)` and aborts the program.

> [!gotcha] --label and --cortex flags do not exist
> The `label_name` and `cortex_label_name` globals are hard-coded (`"FCD"` and `"cortex"` respectively) and cannot be changed from the command line. There are no `--label` or `--cortex` flags in the `get_option()` function.

### Configuration Interactions

- `--hemi` and `--surf` together determine which surface and overlays are loaded from the subject directory.
- `--ndilates` only affects the marking of known FCD vertices (for diagnostic output); it does not influence the classification itself.

## Typical Use Cases

### Use Case 1: Apply FCD random forest classifier to left hemisphere

```bash
mris_rf_label \
  --hemi lh \
  subject \
  $FREESURFER_HOME/average/lh.FCD.rf \
  $SUBJECTS_DIR/subject/surf/lh.FCD.labels.mgz
```

## Pipeline Context

`mris_rf_label` is not part of standard `recon-all`. It is used in FCD detection pipelines:

1. Train classifier with [[mris_rf_train]] on a labelled dataset.
2. Apply to new subjects with `mris_rf_label`.
3. Threshold the output probability map to identify candidate FCD lesions.

## Gotchas and Caveats

> [!gotcha] Feature names are fixed by the trained model
> The overlay files required by this tool are determined by the model, not by the user. Ensuring that all required features have been generated for the target subject is critical.

> [!gotcha] Cortex label gates classification
> Vertices outside the cortex label (`<hemi>.cortex`) are ripped and receive no classification. Their output values will be 0 (uninitialised from `MRIallocSequence`).

## Related Tools

- [[mris_rf_train]] — trains the random forest model used by this tool
- [[mri_rf_label]] — volumetric random forest labeling (analogous tool for MRI volumes)
- [[mris_ca_label]] — probabilistic atlas-based cortical labeling (alternative approach)

## Confidence and Gaps

Confidence is **high**. The complete `get_option()`, `main()` inference loop, I/O structure, and probability output were read from source. All flags are now fully documented.
