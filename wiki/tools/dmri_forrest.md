---
title: "dmri_forrest"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_forrest.cxx"
  - "trc/forrest.h"
  - "trc/forrest.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_train]]"
  - "[[dmri_paths]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Forrest class implementation (forrest.cxx) not read — feature extraction details unknown"
  - "Relationship between dmri_forrest and dmri_train unclear"
tags:
  - diffusion
  - tractography
  - random-forest
  - classification
  - white-matter
---

# dmri_forrest

## Summary

`dmri_forrest` is a random-forest classifier for white-matter tract segmentation. It applies a trained random-forest model to classify voxels in a test subject as belonging to specific white-matter tracts, using diffusion orientation and anatomical features. It is part of the FreeSurfer probabilistic tractography pipeline alongside `dmri_train` (which trains the forest) and `dmri_paths` (which performs full probabilistic tractography).

## Source Information

- **Language:** C++
- **Source files:** `trc/dmri_forrest.cxx`, `trc/forrest.h`, `trc/forrest.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_forrest`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

`dmri_forrest` implements the inference step of a random-forest classification approach to white-matter tract segmentation. The classifier is trained on manual tract annotations from training subjects (using `dmri_train`) and then applied to new test subjects to predict tract membership. Unlike full probabilistic tractography (`dmri_paths`), which uses MCMC sampling, the random-forest approach provides a faster voxel-wise classification.

## Inputs

From the verified `parse_commandline()`:

| Input | Flag | Description |
|-------|------|-------------|
| Test subject directory | `--test` | Directory containing test subject data (mask, aseg, orientation volumes) |
| Training list file | `--train` | Text file listing training subject directories |
| Brain mask | `--mask` | Mask filename (relative to subject dirs) |
| Anatomical segmentation | `--seg` | Aparc+aseg filename (optional) |
| Diffusion orientation | `--diff` | Orientation map filename (optional) |
| Tract label volumes | `--tract` | One or more tract label filenames (relative to subject dirs) |

## Outputs

> [!gap] Output format
> The output files and their format are not confirmed from the top-level source. Based on context, outputs are likely per-voxel probability or classification label maps in MGZ/NIfTI format.

## Mathematical Foundations

A random forest is an ensemble of $T$ decision trees. Each tree is trained on a bootstrap sample of the training data with random feature subsets at each node. During inference, each tree votes for a class label, and the final classification is determined by majority vote:

$$\hat{y}(\mathbf{x}) = \text{mode}\left\{h_t(\mathbf{x})\right\}_{t=1}^{T}$$

where $h_t$ is the $t$-th decision tree. The probability estimate for class $c$ is:

$$\hat{p}(c|\mathbf{x}) = \frac{1}{T} \sum_{t=1}^T \mathbf{1}[h_t(\mathbf{x}) = c]$$

Features likely include local diffusion orientation histograms, tensor-derived measures, and anatomical context from the aseg parcellation, consistent with the input files (orientation map, aseg).

The source shows the random classifier is tested at randomly sampled voxels (100 per iteration):
```cpp
for (int k = 0; k < 100; k++) {
    const int ix = (int) round(drand48() * (nx-1)),
              iy = (int) round(drand48() * (ny-1)),
```

> [!gap] Feature computation
> The exact feature set used by the random forest (diffusion orientation bins, tensor metrics, anatomical labels, context offsets) is implemented in `forrest.cxx`/`forrest.h` which were not read.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--test <dir>` | string | required | Test subject directory. Resolved to a full path via `fio_fullpath()`. Contains the brain mask, aseg, and orientation volumes (named by the other flags). |
| `--train <file>` | string | required | Text file listing training subject directories, one per line. Each must contain the same named mask/aseg/orientation/tract files as the test subject. |
| `--mask <file>` | string | required | Filename (relative to subject directories) of the brain mask volume. |
| `--seg <file>` | string | — | Filename (relative to subject directories) of the anatomical segmentation volume (`aparc+aseg`). Optional; enables anatomical context features. |
| `--diff <file>` | string | — | Filename (relative to subject directories) of the diffusion orientation volume. Optional; enables orientation-based features. |
| `--tract <file> [...]` | string(s) | required | Filename(s) (relative to subject directories) of the tract label volume(s). Multiple filenames can be specified consecutively until the next `--` flag. |
| `--debug` | flag | off | Enable verbose debug output. |
| `--checkopts` | flag | off | Check options and exit without running. |
| `--nocheckopts` | flag | — | Disable option checking. |
| `--help` | flag | — | Print usage and exit. |
| `--version` | flag | — | Print version string and exit. |

## Typical Use Cases

```bash
# Apply trained random forest to classify tract membership in a test subject
dmri_forrest \
  --test /data/subjects/testsubj \
  --train /data/training_subjects.txt \
  --mask brainmask.mgz \
  --seg aparc+aseg.mgz \
  --diff dwispace.mgz \
  --tract lh.cst.mgz rh.cst.mgz
```

## Pipeline Context

`dmri_forrest` is part of the FreeSurfer TRACULA (TRActs Constrained by UnderLying Anatomy) pipeline, alongside `dmri_train`, `dmri_paths`, `dmri_pathstats`, and `dmri_group`. The typical TRACULA workflow is:

```
dmri_train (train priors) --> dmri_paths (probabilistic tractography) 
dmri_train (train forest) --> dmri_forrest (classify voxels)
```

## Gotchas and Caveats

> [!gotcha] Experimental/research tool
> `dmri_forrest` appears to be a research-stage tool within the TRACULA framework. Its relationship to the standard `dmri_paths` probabilistic tractography and whether it is used in the recommended TRACULA workflow is unclear.

## Related Tools

- [[dmri_train]] — trains the priors and potentially the random forest
- [[dmri_paths]] — probabilistic tractography using Bayesian MCMC
- [[dmri_pathstats]] — post-processing of tractography results

## Confidence and Gaps

**Medium confidence.** The complete `parse_commandline()` function was fully read and all flags are verified. The algorithm structure (random forest classification, test/train framework) is understood. Feature extraction details remain unknown (implemented in `trc/forrest.cxx`).

> [!gap] forrest.cxx not read
> The `Forrest` class that does the actual classification is implemented in `trc/forrest.cxx`. This contains the feature extraction, tree construction/prediction, and training logic. Without reading it, the mathematical foundations are only partially characterized.
