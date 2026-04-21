---
title: "dmri_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_train.cxx"
  - "trc/blood.h"
  - "trc/blood.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_group]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading parse_commandline()"
  - "Blood class implementation (blood.cxx) not read"
  - "Exact prior file formats not confirmed"
tags:
  - diffusion
  - tractography
  - training
  - prior
  - bayesian
  - tracula
---

# dmri_train

## Summary

`dmri_train` trains the anatomical priors used by the TRACULA probabilistic tractography system (`dmri_paths`). Given a set of training subjects with manually delineated white-matter tracts, it learns spatial position priors, fiber direction (tangent) priors, curvature priors, and neighborhood anatomy priors that encode the expected shape and anatomical context of each tract across subjects. The trained priors are then used by `dmri_paths` to constrain probabilistic tractography in new test subjects.

## Source Information

- **Language:** C++
- **Source files:** `trc/dmri_train.cxx`, `trc/blood.h`, `trc/blood.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_train`
- **Original author:** Anastasia Yendiki (MGH)
- **Core algorithm:** `Blood` class in `blood.cxx`

## Purpose and Context

TRACULA relies on learned anatomical priors to constrain tractography. Without priors, probabilistic tractography in complex regions is ambiguous. `dmri_train` learns these priors from a training dataset of manually labeled tracts, capturing:

1. **Where** the tract typically goes (spatial prior)
2. **Which direction** the fibers point at each position (orientation prior)
3. **How curved** the tract is (curvature prior)
4. **What anatomy** surrounds the tract at each position (neighborhood and local priors)

These priors are stored as files that `dmri_paths` reads during tractography.

## Inputs

From global variables:

| Variable | Description |
|----------|-------------|
| `trainListFile` | Text file listing training subject directories |
| `trainTrkList` | List of manual tract `.trk` files per training subject |
| `trainRoi1List` | Start ROI files for training subjects |
| `trainRoi2List` | End ROI files for training subjects |
| `trainAsegFile` | Anatomical segmentation filename (same for all subjects) |
| `trainMaskFile` | Brain mask filename |
| `testMaskList` | Test subject mask files |
| `testFaList` | Test subject FA map files |
| `testBaseXfmList` | Base transform files for test subjects |
| `outTrkList` | Output tract file list |
| `outPriorBase` | Base filename for output prior files |
| `outPriorDir` | Output directory for priors |
| `nControl` | Number of control points per tract |
| `useAnatomy` | Use neighborhood anatomy in priors |
| `useShape` | Use shape priors |
| `useTrunc` | Use truncated Gaussian priors |
| `numStrMax` | Maximum number of training streamlines |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `*.xyzprior.txt` | Spatial (xyz) position prior | text |
| `*.tangprior.txt` | Tangent direction prior | text |
| `*.curvprior.txt` | Curvature prior | text |
| `*.neighprior.txt` | Neighborhood anatomy prior | text |
| `*.localprior.txt` | Local anatomy prior | text |
| `*.trk` (optional) | Processed training tracts | TrackVis |

## Mathematical Foundations

For each training subject, the manually labeled tract is registered to a common atlas space. At each control point along the tract, the following statistics are computed across training subjects:

**Spatial prior:** Gaussian distribution over the xyz coordinates of each control point:
$$
p(q_k) = \mathcal{N}(q_k; \bar{q}_k, \Sigma_k)
$$
where $q_k$ is the position of control point $k$, $\bar{q}_k$ is the mean position, and $\Sigma_k$ is the covariance.

**Tangent prior:** Von Mises–Fisher distribution (or Gaussian in tangent space) over fiber direction at each control point.

**Curvature prior:** Distribution over bending angle between consecutive tangent vectors.

**Anatomy priors:** Computed from the anatomical segmentation (`aseg`) around each control point. The `useAnatomy` flag enables using the parcellation context as an additional constraint.

> [!internal] Blood class
> The `Blood` class in `trc/blood.cxx` handles the actual prior computation. It processes the training streamlines, performs coordinate transformations, and estimates the prior distributions.

## Configuration Options

> [!gap] Full flag list
> Complete flags require reading `parse_commandline()`. Key configurable parameters from global variables:

| Variable | Likely flag | Default | Description |
|----------|-------------|---------|-------------|
| `trainListFile` | `--tlist` | required | Training subject list |
| `outPriorDir` | `--outdir` | required | Output directory for priors |
| `useAnatomy` | `--anat` | false | Use anatomy priors |
| `useShape` | `--shape` | false | Use shape priors |
| `useTrunc` | `--trunc` | false | Use truncated Gaussians |
| `numStrMax` | `--nmax` | INT_MAX | Max training streamlines |
| `nControl` | `--ncpt` | — | Number of control points |

## Typical Use Cases

> [!gap] Exact command syntax unknown
> In TRACULA, `dmri_train` is called via `trac-all`. Direct invocation:

```bash
# Train priors from manual tract delineations
dmri_train \
  --tlist training_subjects.txt \
  --outdir /data/priors/lh_cst/ \
  --anat \
  --ncpt 7
```

## Pipeline Context

`dmri_train` is run once for each tract using a training dataset. The trained priors are then applied to all new subjects via `dmri_paths`.

```
Training subjects (manual tracts) --> dmri_train (priors)
                                           |
New test subject --------------------------> dmri_paths --> dmri_pathstats --> dmri_group
```

In the TRACULA workflow:
```bash
trac-all -c dmrirc -train  # runs dmri_train
trac-all -c dmrirc -path   # runs dmri_paths using the trained priors
```

## Gotchas and Caveats

> [!gotcha] Training data must be in common space
> The training tracts must be registered to a common atlas space (e.g., MNI305) before training. The registration transforms are specified via `testBaseXfmList`.

> [!gotcha] FreeSurfer ships with pre-trained priors
> For standard TRACULA analyses using the 18 tracts included in the FreeSurfer distribution, `dmri_train` does not need to be run — pre-trained priors are included in `$FREESURFER_HOME/trctrain/`.

## Related Tools

- [[dmri_paths]] — uses the priors trained here for tractography
- [[dmri_pathstats]] — post-processes tract paths
- [[dmri_forrest]] — alternative random-forest classifier

## Confidence and Gaps

> [!gap] Blood class implementation
> The core prior training logic in `trc/blood.cxx` was not read.

> [!gap] Argument parser not read
> Complete flags require reading `parse_commandline()`.

> [!gap] Prior file formats
> The exact format of the output prior files (text/binary, column structure) is not confirmed.
