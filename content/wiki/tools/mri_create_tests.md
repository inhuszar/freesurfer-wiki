---
title: "mri_create_tests"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_robust_register/mri_create_tests.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Exact distribution of synthetic noise and outlier models not confirmed"
tags:
  - testing
  - synthetic
  - registration
  - noise
---

# mri_create_tests

## Summary

`mri_create_tests` generates modified test images from an input volume by applying random geometric transforms (translation, rotation) and/or adding synthetic noise and outlier voxels. It is a utility for generating paired test image sets for evaluating registration algorithms, particularly `mri_robust_register`. It can also apply or invert a provided LTA transform and output the modified LTA.

## Source Information

- **Language:** C++
- **Source file:** `mri_robust_register/mri_create_tests.cpp`
- **Original author:** Martin Reuter

## Purpose and Context

When developing or validating rigid-body registration algorithms, it is necessary to have test pairs where the ground-truth transform is known. `mri_create_tests` creates such pairs by:
- Applying a random rigid transform (translation and/or rotation) to an input volume
- Optionally adding Gaussian noise
- Optionally inserting a block of outlier voxels (simulating intensity artifacts)
- Optionally applying intensity scaling

The known ground-truth transform (stored as an LTA) can then be compared against the output of a registration algorithm.

## Inputs

- **`--in file`**: input volume
- **`--int file`** (optional): second input volume (template/target)
- **`--lta-in file`** (optional): input LTA to apply as initialization
- Optional mask via `--mask`

## Outputs

- **`--outs file`**: output transformed source volume
- **`--outt file`** (optional): output template volume
- **`--lta-out file`**: output ground-truth LTA
- **`--lta-outs file`** / **`--lta-outt file`**: separate LTAs for source and template
- **`--iscale-out file`**: output intensity scale factor

## Mathematical Foundations

**Random translation**: generates a 3D displacement vector uniformly sampled in the range $[-\text{transdist}, +\text{transdist}]$ mm (default 11 mm).

**Random rotation**: generates rotation angles uniformly sampled in $[-\text{maxdeg}, +\text{maxdeg}]$ degrees (default 25°) around each axis.

**Noise model**: Gaussian noise with standard deviation `noise` is added to voxel intensities.

**Outlier model**: a box of `outlierbox` size is filled with a constant value at a random location in the volume.

**Intensity scaling**: multiplicative intensity scale factor `iscale` is applied to the source volume.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--in` | file | required | Input source volume |
| `--int` | file | — | Input template volume (default: copy of `--in`) |
| `--outs` | file | required | Output transformed source volume |
| `--outt` | file | required | Output transformed template volume |
| `--lta-in` | file | — | Input LTA transform (initialization) |
| `--lta-out` | file | — | Output ground-truth LTA |
| `--lta-outs` | file | — | Output half-way LTA for source (`Inv(A)`) |
| `--lta-outt` | file | — | Output half-way LTA for template (`A`) |
| `--mask` | file | — | Binary mask volume |
| `--noise` | float | `0.0` | Gaussian noise standard deviation |
| `--outlier` | int | `0` | Number of outlier voxels to insert randomly |
| `--outlier-box` | int | `-1` | Insert a box of random voxels (size 0..N) |
| `--translation` | (flag) | `off` | Apply random translation |
| `--transdist` | float | `11` | Max translation distance (mm) |
| `--rotation` | (flag) | `off` | Apply random rotation |
| `--maxdeg` | float | `25` | Max rotation angle (degrees) |
| `--iscale` | double | `1.0` | Use fixed intensity scaling parameter |
| `--intensity` | (flag) | `off` | Apply random intensity scaling |
| `--iscale-out` | file | — | Write intensity scaling parameter to file |

## Configuration Interactions

- `--translation` and `--rotation` can be combined to apply both simultaneously.
- `--intensity` enables random intensity scaling; `--iscale` sets a fixed (non-random) intensity scaling parameter instead.
- `--lta-outs` and `--lta-outt` output the half-way transforms; `--lta-out` outputs the full `A*A` transform (source to target).

## Typical Use Cases

Create a randomly rotated and translated version of a volume:
```bash
mri_create_tests --in brain.mgz --outs brain_transformed.mgz \
  --lta-out ground_truth.lta \
  --translation --rotation
```

Add noise and outliers:
```bash
mri_create_tests --in brain.mgz --outs brain_noisy.mgz \
  --noise 5.0 --outlier 100 --lta-out gt.lta
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. Used in the `mri_robust_register` test suite and for registration algorithm development and validation.

## Gotchas and Caveats

> [!gotcha] Random transforms vary per run
> Unless a seed is set (if such an option exists — not confirmed), each run generates different random transforms. Record the output LTA to preserve the ground truth.

## Related Tools

- `mri_robust_register` — the registration tool this utility was designed to test

## Confidence and Gaps

Confidence is **high** for flag names. The `parseNextCommand()` function was fully read. The mathematical properties of the noise/outlier models remain unconfirmed.
