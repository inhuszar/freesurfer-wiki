---
title: "mri_ca_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ca_train/mri_ca_train.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: null
related:
  - "[[mri_ca_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_label]]"
  - "[[mri_em_register]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps: []
tags:
  - atlas
  - GCA
  - training
  - segmentation
---

# mri_ca_train

## Summary

`mri_ca_train` builds a Gaussian Classifier Atlas (GCA) from a training set of subjects for which both a normalized T1 volume and a manual or semi-automated segmentation are available. The GCA encodes, at each node in a 3D atlas grid, the prior probability of each anatomical label and the conditional intensity distribution (Gaussian) for each label. The resulting [[gca-format|`.gca`]] file is the atlas used by [[mri_ca_register]] and [[mri_ca_label]] in the [[recon-all]] pipeline.

## Source Information

- **Language:** C++
- **Source file:** `mri_ca_train/mri_ca_train.cpp`
- **Original author:** Bruce Fischl
- **Reference:** "Whole Brain Segmentation: Automated Labeling of Neuroanatomical Structures in the Human Brain", Fischl et al. (2002), *Neuron*, 33:341–355.

## Purpose and Context

The GCA atlas is the probabilistic model that underlies FreeSurfer's subcortical segmentation. Building a new atlas requires:

1. A cohort of subjects with normalized T1 volumes and corresponding segmentation volumes (labels) already in atlas space.
2. A spatial transform for each subject (from subject to atlas space, typically `talairach.lta` or similar).

`mri_ca_train` reads these inputs and accumulates per-label intensity statistics at each atlas node. The result is a `.gca` file containing a multi-resolution prior+likelihood atlas model.

This tool is used by the FreeSurfer development team to create the distributed atlas files (e.g., `$FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca`). End users typically do not need to run this unless building a custom atlas.

## Inputs

Positional arguments:
1. A list of subject names (each processed in turn, reading data from `SUBJECTS_DIR/<subject>/`)
2. `<output.gca>` — the last positional argument is the output atlas path

Per subject (read from `<subjects_dir>/<subject>/mri/`):
- T1 volume: default `orig` (configurable via `-T1 <name>`)
- Segmentation: default `seg_edited.mgz` (configurable via `-seg <dir>`)
- Transform: configurable via `-xform <name>`, default uses `talairach.lta`

## Outputs

- `<output.gca>` — a GCA atlas file containing:
  - Per-node prior probability distributions
  - Per-node, per-label conditional intensity Gaussian parameters ($\mu$, $\sigma^2$)
  - Node spacing (`node_spacing`, default 4 mm) and prior spacing (`prior_spacing`, default 2 mm)

- Optionally: a `-done` file for pipeline monitoring.

## Mathematical Foundations

The GCA models the joint probability at each atlas location $\mathbf{x}_p$ as:

$$
p(\mathbf{I}, k | \mathbf{x}_p) = p(k | \mathbf{x}_p) \cdot \prod_{c=1}^{C} p(I_c | k, \mathbf{x}_p)
$$

where $C$ is the number of input image channels.

**Prior estimation:**
$$
\hat{p}(k | \mathbf{x}_p) = \frac{\#\{v : k(v) = k, v \in \text{node}(\mathbf{x}_p)\}}{\#\{v : v \in \text{node}(\mathbf{x}_p)\}}
$$

**Conditional intensity Gaussian:**
$$
\hat{\mu}_k(\mathbf{x}_p) = \frac{1}{N_k(\mathbf{x}_p)} \sum_{v \in k, \text{node}(\mathbf{x}_p)} I(v)
$$
$$
\hat{\sigma}_k^2(\mathbf{x}_p) = \frac{1}{N_k(\mathbf{x}_p)} \sum_{v \in k, \text{node}(\mathbf{x}_p)} \left(I(v) - \hat{\mu}_k\right)^2
$$

The dual-resolution design (node_spacing for conditional densities, prior_spacing for priors) allows finer spatial resolution for priors than for intensity models.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-T1 <name>` | string | `orig` | Name of T1 volume within `mri/` directory. |
| `-seg <dir>`<br>`-parc_dir <dir>`<br>`-seg_dir <dir>`<br>`-segmentation <dir>` | string | `seg_edited.mgz` | Segmentation volume or directory name (all four flags are equivalent). |
| `-xform <name>` | string | `talairach.lta` | Transform file to atlas space (path relative to `mri/transforms/`). |
| `-noxform` | — | off | Disable application of any transform. |
| `-node_spacing <val>` | float | 4.0 | GCA node spacing (mm) for conditional densities. |
| `-prior_spacing <val>` | float | 2.0 | GCA prior spacing (mm). |
| `-input <name>` | string | T1 volume | Specify an additional input channel by name (path relative to `mri/`). |
| `-conform <0/1>` | int | 1 | Conform each subject volume to 1 mm isotropic before training. |
| `-flash` | — | off | Use FLASH multi-echo input protocol (sets GCA type to FLASH). |
| `-gradient` | — | off | Add intensity gradient components as extra input channels. |
| `-xgrad` | — | off | Use x-component of intensity gradient as a training feature. |
| `-ygrad` | — | off | Use y-component of intensity gradient as a training feature. |
| `-zgrad` | — | off | Use z-component of intensity gradient as a training feature. |
| `-smooth <sigma>` | float | — | Apply Gaussian smoothing to conditional statistics (value in [0,1]). |
| `-mask <file>` | string | — | Brain mask volume to restrict training (path relative to `mri/`). |
| `-insert <file> <label>` | string+int | — | Insert non-zero voxels from `<file>` as the given label. |
| `-heq <file>` | string | — | Reference volume for histogram equalization. |
| `-prune <N>` | int | — | Prune GCA N times after initial training. |
| `-nomrf` | — | off | Skip computation of MRF statistics. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `-mismatch` | — | off | Allow MR parameter mismatches between subjects. |
| `-check` | — | off | Perform sanity check on training labels. |
| `-check_and_fix` | — | off | Perform sanity check and write corrected volume to `seg_fixed.mgz`. |
| `-sym` | — | off | Enforce left-right symmetry in the output atlas. |
| `-makesym <in> <out>` | string×2 | — | Read a GCA, symmetrize it, write to `<out>`, and exit. |
| `-checksym <file>` | string | — | Check whether a GCA file is symmetric and exit. |
| `-ctab <file>` | string | — | Embed color table from `<file>` into the output `.gca`. |
| `-wmsa <file>` | string | — | Read white matter signal abnormality volume from `<file>`. |
| `-binarize <in> <out>` | int×2 | — | Remap segmentation label value `<in>` to `<out>`. |
| `-done <file>` | string | — | Write done-flag file on successful completion. |
| `-debug_node <x> <y> <z>` | int×3 | — | Debug atlas node at voxel coordinates (x, y, z). |
| `-debug_voxel <x> <y> <z>` | int×3 | — | Debug source voxel at coordinates (x, y, z). |
| `-debug_prior <x> <y> <z>` | int×3 | — | Debug prior node at atlas coordinates (x, y, z). |
| `-debug_label <l>` | int | — | Debug the specified label index. |
| `-debug_nbr <l>` | int | — | Debug the specified neighbour label index. |
| `-threads <N>`<br>`-nthreads <N>` | int | — | Set number of OpenMP threads. |
| `-f` | — | off | Force use of inputs even if acquisition parameters do not match. |
| `-s <scale>` | float | — | Scale all input volumes by `<scale>` after reading. |
| `-a <N>` | int | — | Apply N mean filters to classifiers after training. |
| `-h <file>` | string | — | Write histogram of classes per voxel to `<file>`. |

## Configuration Interactions

- Multiple `-input <name>` flags are used to specify additional input channels; the first call implicitly replaces the default T1 channel.
- `-flash` enables reading FLASH multi-echo data (sets GCA type to FLASH).
- `-conform 1` (default) resamples each subject to 256³ 1mm before accumulating — this is required because the GCA atlas space is defined in this geometry.
- `-prune <N>` removes GCA nodes with insufficient training examples; N specifies the number of pruning passes.
- `-gradient` / `-xgrad` / `-ygrad` / `-zgrad` add gradient components as additional input channels; `-gradient` adds all three at once.
- `-check_and_fix` implies `-check`; it additionally writes `seg_fixed.mgz` with corrected labels.

## Typical Use Cases

**Build a standard single-channel GCA from 30 training subjects:**
```bash
mri_ca_train -sdir /data/subjects \
  subj1 subj2 ... subj30 \
  /output/RB_new_atlas.gca
```

**Build multi-channel FLASH GCA:**
```bash
mri_ca_train -flash \
  -input flash30/T1.mgh \
  -input flash30/PD.mgh \
  -input flash30/T2s.mgh \
  subj1 subj2 ... subj30 \
  RB_flash_atlas.gca
```

## Pipeline Context

Not a standard [[recon-all]] stage for end users. Run once (or periodically) by the FreeSurfer development team when:
- Building the distributed GCA atlas from updated training cohorts.
- Creating custom atlases for specific populations (pediatric, elderly, non-standard pathology).
- Building atlases for new MRI protocols or scanners.

## Gotchas and Caveats

> [!gotcha] Training subjects must already be in atlas space
> Each subject's segmentation must already be warped (or the native-space volumes with per-subject transforms must be provided via `-xform`). If using native-space data, the transform must correctly map the subject to the GCA's coordinate space.

> [!gotcha] Segmentation file defaults
> The default segmentation filename is `seg_edited.mgz`. If your training subjects have a different segmentation name (e.g., `aseg.mgz`), you must specify `-seg aseg.mgz`. Using the wrong segmentation file causes silent incorrect atlas construction.

> [!gotcha] Node spacing affects segmentation resolution
> Increasing `node_spacing` creates a coarser atlas that is faster to build and use but may miss small structures. The distributed atlas uses 4 mm node spacing with 2 mm prior spacing.

> [!gotcha] OpenMP parallelism
> The source has `#ifdef HAVE_OPENMP` blocks. The number of threads is logged at startup, enabling parallel computation over subjects.

## Related Tools

- [[mri_ca_register]] — uses the GCA atlas for nonlinear registration
- [[mri_ca_label]] — uses the GCA atlas for segmentation
- [[mri_ca_normalize]] — uses the GCA atlas for intensity normalization
- [[mri_ca_tissue_parms]] — adds biophysical tissue parameters to a GCA

## Confidence and Gaps

Source code main function and configuration fully read. Confidence is high.

> [!gap] GCA file format internal structure
> The `.gca` binary format is defined in `gca.cpp`. A detailed format specification page does not yet exist in this wiki.
