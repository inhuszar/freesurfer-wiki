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
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full option list requires reading parse_commandline section of source not yet read"
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
- **`--in_t file`** (optional): second input volume (template/target)
- **`--ltain file`** (optional): input LTA to apply as initialization
- Optional mask via `--mask`

## Outputs

- **`--outs file`**: output transformed source volume
- **`--outt file`** (optional): output template volume
- **`--ltaout file`**: output ground-truth LTA
- **`--ltaouts file`** / **`--ltaoutt file`**: separate LTAs for source and template
- **`--iscaleout file`**: output intensity scale factor

## Mathematical Foundations

**Random translation**: generates a 3D displacement vector uniformly sampled in the range $[-\text{transdist}, +\text{transdist}]$ mm (default 11 mm).

**Random rotation**: generates rotation angles uniformly sampled in $[-\text{maxdeg}, +\text{maxdeg}]$ degrees (default 25°) around each axis.

**Noise model**: Gaussian noise with standard deviation `noise` is added to voxel intensities.

**Outlier model**: a box of `outlierbox` size is filled with a constant value at a random location in the volume.

**Intensity scaling**: multiplicative intensity scale factor `iscale` is applied to the source volume.

## Configuration Options

Based on the `Parameters` struct in source:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--in` | required | Input source volume |
| `--in_t` | — | Input template volume |
| `--outs` | required | Output transformed source |
| `--outt` | — | Output transformed template |
| `--ltain` | — | Input LTA transform |
| `--ltaout` | — | Output ground-truth LTA |
| `--ltaouts` | — | Output source LTA |
| `--ltaoutt` | — | Output template LTA |
| `--mask` | — | Binary mask |
| `--noise` | 0.0 | Gaussian noise std |
| `--outlier` | 0 | Number of outlier voxels |
| `--outlierbox` | -1 | Outlier box size |
| `--translation` | false | Apply random translation |
| `--rotation` | false | Apply random rotation |
| `--iscale` | 1.0 | Intensity scale factor |
| `--doiscale` | false | Apply intensity scaling |
| `--iscaleout` | — | Save intensity scale to file |
| `--transdist` | 11 mm | Max translation distance |
| `--maxdeg` | 25° | Max rotation angle |

> [!gap] Flag syntax not confirmed
> The exact flag names (single vs. double dash) should be verified by running the binary with `--help` or inspecting the `parse_commandline()` function in the full source.

## Configuration Interactions

- `--translation` and `--rotation` can be combined to apply both simultaneously.
- `--doiscale` and `--iscale` work together; `--doiscale` enables intensity scaling and `--iscale` sets the factor.

## Typical Use Cases

Create a randomly rotated and translated version of a volume:
```bash
mri_create_tests --in brain.mgz --outs brain_transformed.mgz \
  --ltaout ground_truth.lta \
  --translation --rotation
```

Add noise and outliers:
```bash
mri_create_tests --in brain.mgz --outs brain_noisy.mgz \
  --noise 5.0 --outlier 100 --ltaout gt.lta
```

## Pipeline Context

Not called by [[recon-all]]. Used in the `mri_robust_register` test suite and for registration algorithm development and validation.

## Gotchas and Caveats

> [!gotcha] Random transforms vary per run
> Unless a seed is set (if such an option exists — not confirmed), each run generates different random transforms. Record the output LTA to preserve the ground truth.

## Related Tools

- `mri_robust_register` — the registration tool this utility was designed to test

## Confidence and Gaps

Confidence is **medium**. The `Parameters` struct and high-level structure were read. The full command-line parsing was not.
