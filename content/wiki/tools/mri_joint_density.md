---
title: "mri_joint_density"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_joint_density/mri_joint_density.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_info]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps: []
tags:
  - statistics
  - histogram
  - joint-intensity
  - analysis
---

# mri_joint_density

## Summary

`mri_joint_density` computes the joint intensity density (2D joint histogram) of two co-registered MRI volumes. Given two volumes, it counts the number of voxels having each combination of intensity values $(v_1, v_2)$ and writes the result as a 2D density matrix to a text file. This is useful for visualizing and quantifying the intensity relationship between two modalities or two time points.

## Source Information

- **Source language:** C++
- **Source file:** `mri_joint_density/mri_joint_density.cpp`
- **Original author:** (no explicit author in header, copyright to MGH)

## Purpose and Context

The joint intensity histogram (joint density) is a fundamental tool in multi-modal image analysis:

- **Cross-modality characterization:** Understanding how T1 and T2 intensities co-vary across tissue types
- **Registration assessment:** Mutual information (derived from joint density) measures misregistration
- **Segmentation validation:** Inspecting clustering patterns in intensity space
- **Protocol comparison:** Characterizing how intensity changes between scanner settings

`mri_joint_density` computes this directly as a 2D histogram by scanning all voxels of both volumes and binning pairs $(v_1, v_2)$ into a matrix.

## Inputs

| Input | Positional | Description |
|-------|-----------|-------------|
| Volume 1 | argv[1] | First MRI volume |
| Volume 2 | argv[2] | Second MRI volume |
| Output file | argv[3] | Path for joint density text file |

The tool takes exactly 3 positional arguments. There is no optional third-volume non-brain mask argument: instead, a nonbrain mask is computed **automatically** by ANDing the two input volumes and binarizing the result (`MRIand` + `MRIbinarize`). The mask is then optionally dilated by `-erode` iterations before applying. Both volumes must have the same dimensions and voxel geometry.

## Outputs

| Output | Description |
|--------|-------------|
| Joint density text file | 2D matrix of voxel counts at each intensity pair $(v_1, v_2)$ |

The output is a MATLAB-compatible text file with a header and an `nbins × nbins` matrix literal:
```matlab
nbins = N;
 cfmin = 10.000000 ;
 cfmax = 5000.000000  ; 
fstep = 10.000000;
joint_density = [...
  <row 0> ;
  ...
  <row N-1> ;
];
```
where `nbins` is determined from the intensity range and `step` parameter.

## Mathematical Foundations

The joint density is defined as:

$$
H(i, j) = \#\left\{v : \text{bin}(V_1(v)) = i \text{ and } \text{bin}(V_2(v)) = j\right\}
$$

where $\text{bin}(x) = \lfloor (x - x_\min) / \Delta \rfloor$ and $\Delta$ is the bin width (default `step = 10.0`).

The intensity range for binning is determined by the minimum and maximum voxel values in each volume, constrained by `cfmin = 10.0` and `cfmax = 5000.0`.

The number of bins is:
$$
N_\text{bins} = \left\lceil \frac{x_\max - x_\min}{\Delta} \right\rceil
$$

**Entropy and mutual information** can be derived from the joint density:

$$
I(V_1; V_2) = \sum_{i,j} H(i,j) \log\frac{H(i,j)}{H_1(i) H_2(j)}
$$

where $H_1$ and $H_2$ are the marginal histograms.

## Configuration Options

Flag list fully verified from `get_option()` in source. All flags are case-insensitive.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-min` | `<float>` | `10.0` | Minimum intensity value included in histogram binning; voxels with values below this are excluded. |
| `-max` | `<float>` | `5000.0` | Maximum intensity value included in histogram binning; voxels with values above this are excluded. |
| `-step` | `<float>` | `10.0` | Bin width for the intensity histogram. Smaller values produce higher-resolution joint density matrices. |
| `-erode` | `<int>` | `0` | Dilate the automatically-computed non-brain exclusion mask by this many iterations before applying it (uses `MRIdilateLabel`). |

> [!gotcha] Flag names differ from wiki
> The flags for intensity range are `-min` and `-max`, not `-cfmin` and `-cfmax`. The variable names in the source are `cfmin`/`cfmax` (internal), but the command-line flags are `-min` and `-max`.

## Configuration Interactions

- `-min` and `-max` define the intensity range used for the joint histogram; voxels with either coordinate outside this range are excluded.
- `-step` controls the bin width and thus the resolution of the 2D histogram; smaller steps produce larger output matrices.
- `-erode` dilates (not erodes) the automatically computed non-brain exclusion mask using `MRIdilateLabel`, expanding the excluded region before the histogram computation. Despite the flag name, the operation is dilation of the exclusion mask.

> [!gotcha] `-erode` performs dilation
> The flag is named `-erode` but the code calls `MRIdilateLabel(mri_nonbrain, mri_nonbrain, 128, erode)`, which dilates the non-brain label. This is counterintuitive: specifying `-erode N` widens the non-brain exclusion zone, not narrows it.

## Typical Use Cases

**Compute joint density of T1 and T2:**
```bash
mri_joint_density T1.mgz T2.mgz joint_density.txt
```

**Custom range and bin width:**
```bash
mri_joint_density -min 0 -max 2000 -step 5 T1.mgz T2.mgz joint_density_fine.txt
```

## Pipeline Context

Not part of `recon-all`. Standalone analysis tool for multi-modal MRI characterization.

## Gotchas and Caveats

> [!gotcha] Volumes must be registered
> Both volumes should be in the same physical space (co-registered). The joint density is computed voxel-by-voxel without any spatial registration.

> [!gotcha] Intensity range clipping
> Voxels with intensities outside [cfmin, cfmax] are excluded from the joint density. Verify that the default range (10–5000) is appropriate for your data.

## Related Tools

- [[mri_info]] — displays volume intensity statistics

## Confidence and Gaps

**High confidence (source read):** Two-volume input only (no external mask), automatic nonbrain mask computation via AND+binarize+dilate, 2D histogram computation, default min=10/max=5000/step=10, output MATLAB-compatible text format, flag names verified.

**Uncertain:** Whether tool supports multi-frame inputs (source only accesses frame 0 implicitly via `MRIsampleVolume`).
