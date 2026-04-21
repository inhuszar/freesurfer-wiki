---
title: "mris_ca_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_ca_train/mris_ca_train.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact GCSA file format specification needs cross-reference with gcsa.h."
  - "nfillmax default and fill behaviour needs confirmation."
tags:
  - parcellation
  - atlas
  - training
  - GCA
  - surface
---

# mris_ca_train

## Summary

`mris_ca_train` builds a [[gcsa-format|Gaussian Classifier Surface Atlas]] (GCSA, stored as `.gcs`) from a training set of manually labelled subjects. The atlas encodes the probabilistic relationship between cortical geometry features (curvature, sulcal depth) and anatomical labels at each location on the spherically registered surface. The resulting `.gcs` file is used by [[mris_ca_label]] to automatically parcellate new subjects.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_ca_train/mris_ca_train.cpp`
- Uses the `GCSA` (Gaussian Classifier Surface Atlas) infrastructure from `gcsa.h` / `gcsa.cpp`.

## Purpose and Context

Automatic cortical parcellation in FreeSurfer relies on a probabilistic atlas trained from manually annotated expert subjects. `mris_ca_train` is the training step: it reads annotations, [[curv-format|curvature]], and sulcal depth from each training subject, and builds per-vertex Gaussian classifiers in a spherically parameterised atlas space. The atlas is essentially a spatial prior of label probabilities conditioned on geometric features.

The standard FreeSurfer atlases (`aparc.annot`, `aparc.a2009s.annot`) were built with this tool.

## Inputs

For each subject in the training set:
- `$SUBJECTS_DIR/<subject>/surf/<hemi>.<canon_surf_name>` (canonical/registered sphere)
- `$SUBJECTS_DIR/<subject>/surf/<hemi>.<orig_name>` (smoothwm or other reference surface)
- `$SUBJECTS_DIR/<subject>/surf/<hemi>.<thickness_name>` (thickness scalar)
- `$SUBJECTS_DIR/<subject>/surf/<hemi>.<sulc_name>` (sulcal depth)
- `$SUBJECTS_DIR/<subject>/label/<hemi>.<annot_name>.annot` (training annotation)

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<hemi>` | Hemisphere: `lh` or `rh` |
| `<canon_surf_name>` | Canonical sphere surface name (e.g., `sphere.reg`) |
| `<annot_name>` | Annotation name (e.g., `aparc`) |
| `<subject1> ... <subjectN>` | Training subject names |
| `<output_fname>` | Output GCSA file (`.gcs`) |

## Outputs

| Output | Description |
|--------|-------------|
| `<output_fname>` | GCSA file (`.gcs`) encoding the trained cortical parcellation atlas |

## Mathematical Foundations

At each location in the spherical parameter space (discretised at the resolution of icosahedron `icno_classifiers` = 4), a Gaussian classifier is trained on the feature vector of each training subject's vertex projected to that location:

$$
\mathbf{x}(v) = [\text{curv}(v),\; \text{sulc}(v)]^T \quad \text{(default 2 inputs)}
$$

For each label class $c$ and atlas location $(\theta, \phi)$, the classifier models:

$$
p(\mathbf{x} \mid c, \theta, \phi) = \mathcal{N}(\mathbf{x}; \boldsymbol{\mu}_c, \boldsymbol{\Sigma}_c)
$$

The prior $p(c \mid \theta, \phi)$ is estimated from label frequencies at location $(\theta, \phi)$ in the training set, encoded at the coarser icosahedron resolution `icno_priors` = 7.

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `-n <nbrs>` | Surface neighbourhood size | 2 |
| `-t <navgs>` | Smoothing averages applied to features | 5 |
| `-1` | Use only sulcal depth (sulconly mode) | off |
| `-w <curv_fname>` | Custom curvature file name | — |
| `-l <label_name>` | Restrict training to a specific label | all labels |
| `-L <label_index>` | Label index to use with `-l` | — |
| `-p <ptable_fname>` | Output parcellation table file | — |
| `-t <ctab_fname>` | Read [[color-lut|colour table]] file | — |
| `-c <n>` | Input feature count (`ninputs`) | 1 |
| `-f <input_fname>` | Override input scalar file name | — |
| `-prior <icno>` | Icosahedron resolution for priors | 7 |
| `-classifier <icno>` | Icosahedron resolution for classifiers | 4 |
| `--fill` | Enable label fill after training | on |
| `--nofill` | Disable label fill | off |
| `--nfillmax <n>` | Max fill iterations | -1 (unlimited) |

> [!gap] Flag names need verification
> Flag parsing is done via `get_option()`; some flags above were inferred from global variables.

## Configuration Interactions

- `-1` (sulconly) disables curvature as a feature; only sulcal depth is used. This reduces the feature dimensionality.
- `-c <n>` increases the number of input scalar features beyond the default 1 (sulc) or 2 (curv + sulc).
- `--fill` / `--nofill` control a post-training label fill step that propagates labels to unlabelled atlas locations.
- `which_norm` (mean normalisation) is applied to feature vectors before training.

> [!gotcha] Annotation vs. colour table
> If a colour table (`-t`) is supplied, it overrides the annotation's embedded colour table. This can cause mismatches if the annotation and colour table are from different atlas versions.

## Typical Use Cases

```bash
# Train a parcellation atlas from bert, ernie, alice (lh aparc)
mris_ca_train lh sphere.reg aparc \
    bert ernie alice \
    /tmp/lh.training.gcs

# Sulcal-depth-only atlas
mris_ca_train -1 lh sphere.reg aparc \
    bert ernie alice bob \
    /tmp/lh.sulconly.gcs
```

## Pipeline Context

Not part of the standard per-subject `recon-all` pipeline. `mris_ca_train` is the atlas construction step used once (by atlas developers), while [[mris_ca_label]] is the per-subject application step.

Atlas construction workflow:
1. Manually annotate training subjects with tksurfer or Freeview.
2. Register subjects to a common sphere: [[mris_register]].
3. **`mris_ca_train`** — build the GCSA atlas.
4. [[mris_ca_label]] — apply the atlas to new subjects.

## Gotchas and Caveats

> [!gotcha] Subject count affects atlas quality
> The statistical reliability of the Gaussian classifiers depends on having enough training subjects per label per atlas location. Very small training sets (< 10 subjects) produce unreliable atlases.

> [!gotcha] Feature normalisation required
> The tool applies mean normalisation to the feature vectors before training. If custom scalar files are used, they should be in comparable units and dynamic range to the standard curvature/sulc files.

> [!gotcha] icno_priors vs. icno_classifiers
> The priors and classifiers operate at different icosahedron resolutions (7 and 4 respectively). This multi-scale representation allows spatial priors to be smoother than the classifiers.

## Related Tools

- [[mris_ca_label]] — applies the trained atlas
- [[mris_register]] — required before training
- [[mris_sphere]] — produces the canonical sphere

## Confidence and Gaps

**Confident:** Core algorithm, GCSA structure, feature set, and icosahedron resolutions confirmed from source.

> [!gap] GCSA file format
> The internal binary format of `.gcs` files is defined in `gcsa.h`/`gcsa.cpp`. It is not documented here.

> [!gap] Fill step details
> The label fill post-processing step (`DoFill`, `nfillmax`) was not fully traced in the source.
