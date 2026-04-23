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
last_agent_update: 2026-04-22
gaps:
  - "Exact GCSA file format specification needs cross-reference with gcsa.h."
  - "Semantics of GCSAfill_cpn_holes and GCSAfill_gcsan_holes not fully traced."
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

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a <n>` | integer | 5 | Number of nearest-neighbour smoothing iterations applied to input feature 1. |
| `-debug-vertex <n>` | integer | — | Set diagnostic vertex index (`Gdiag_no`). |
| `-gcs-diff <gcsa1> <gcsa2>` | string string | — | Standalone: compare two GCSA files and report whether they differ. |
| `-gcs-means <gcsa> <inputno> <out.mgz>` | string int string | — | Standalone: extract likelihood means for all classes at the given input index. |
| `-gcs-priors <gcsa> <out.mgz>` | string string | — | Standalone: extract class priors from the GCSA file. |
| `-ic <priors> <classifiers>` | integer integer | 7 4 | Icosahedron resolution for priors and classifiers respectively. |
| `-input <file>` | string | — | Override input scalar feature file name. |
| `-l <label>` | string | all labels | Restrict training to vertices in the named label. |
| `-n <n>` | integer | 1 | Number of input scalar features (max 3: mean curvature, sulc, thickness). |
| `-nbrs <n>` | integer | 2 | Surface neighbourhood size for feature averaging. |
| `-nfill <n>` | integer | — | Maximum number of fill iterations for empty atlas locations. |
| `-no-fill` | — | off | Disable label fill post-processing entirely. |
| `-norm1` | — | off | Apply GCSA normalization to input feature 1 after reading. |
| `-norm2` | — | off | Apply GCSA normalization to input feature 2 after reading. |
| `-norm3` | — | off | Apply GCSA normalization to input feature 3 after reading. |
| `-orig <file>` | string | `smoothwm` | Original surface filename used to load per-vertex geometry. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Subjects directory. |
| `-sulc` | — | off | Use sulcal depth as the only input feature (sulconly mode). |
| `-sulconly` | — | off | Alias for `-sulc`. |
| `-t <file>` | string | — | Read parcellation table (colour look-up table) from `<file>`. |
| `-v <n>` | integer | — | Diagnostic level (`Gdiag_no`). |

## Configuration Interactions

- `-sulc` / `-sulconly` disables curvature as a feature; only sulcal depth is used. This reduces the feature dimensionality.
- `-n <n>` increases the number of input scalar features beyond the default 1 (sulc only) or 2 (curv + sulc). Input order is: 1=mean curvature, 2=sulcal depth, 3=thickness.
- `-nfill` / `-no-fill` control a post-training label fill step that propagates labels to unlabelled atlas locations. Fill is enabled by default; `-no-fill` disables it entirely, while `-nfill <n>` caps the number of fill iterations.
- `which_norm` (mean normalisation) is applied to feature vectors before training.
- `-gcs-means`, `-gcs-priors`, `-gcs-diff` are standalone diagnostic modes that operate on an existing GCSA file and exit; they do not train a new atlas.

> [!gotcha] Annotation vs. colour table
> If a colour table (`-t`) is supplied, it overrides the annotation's embedded colour table. This can cause mismatches if the annotation and colour table are from different atlas versions.

## Typical Use Cases

```bash
# Train a parcellation atlas from bert, ernie, alice (lh aparc)
mris_ca_train lh sphere.reg aparc \
    bert ernie alice \
    /tmp/lh.training.gcs

# Sulcal-depth-only atlas
mris_ca_train -sulconly lh sphere.reg aparc \
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
> The label fill post-processing step (`DoFill`, `-nfill`) calls `GCSAfill_cpn_holes` and `GCSAfill_gcsan_holes`. The exact semantics of what constitutes a "hole" in the CPN and GCSAN structures is not yet documented.
