---
title: "mri_volcluster"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_volcluster/mri_volcluster.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_z2p]]"
  - "[[coordinate-systems]]"
  - "[[mri_volsynth]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The CSD (cluster-size distribution) file format and simulation workflow is not fully documented here."
  - "The Bonferroni correction interaction with CSD-based cluster-wise p-values needs clarification."
tags:
  - statistics
  - cluster-inference
  - thresholding
  - functional-mri
---

# mri_volcluster

## Summary

`mri_volcluster` identifies spatially contiguous clusters in a volumetric statistical map that exceed a threshold, and reports their sizes, coordinates, and optionally cluster-level p-values. It implements connected-components labelling with optional size, distance, and cluster-wise significance thresholds. Cluster-wise p-values can be computed using Gaussian random field (GRF) theory or empirical cluster-size distributions (CSD) from Monte Carlo simulation. Coordinates are reported in MNI305/Talairach space when a registration file is provided.

## Source Information

- **Language:** C++
- **Source file:** `mri_volcluster/mri_volcluster.cpp`
- **Key library:** `volcluster.c/.h` — contains the core `clustGrow()`, `clustMaxMember()`, `clustComputeTal()`, `clustPruneBySize()`, `clustPruneByDistance()`, `clustSortClusterList()` functions.

## Purpose and Context

Cluster-level inference is a standard method in neuroimaging statistical analysis:
1. Apply a voxel-level threshold to a statistical map (e.g., $z > 1.64$ for one-tailed $p < 0.05$)
2. Identify contiguous suprathreshold clusters
3. Assess cluster significance by comparing each cluster's size to a null distribution

This tool is the volumetric analogue of surface-based cluster tools and is frequently used in FSfast (FreeSurfer's fMRI analysis stream) and in conjunction with `mri_glmfit`.

## Inputs

| Flag | Default | Description |
|------|---------|-------------|
| `--in vol`<br>`--i vol` | — | Input statistical volume |
| `--thmin thresh` | — (required) | Minimum threshold |
| `--thmax thresh` | none (∞) | Maximum threshold (optional upper bound) |
| `--sign {abs,pos,neg}` | `abs` | Threshold sign: `abs` (both), `pos` (positive only), `neg` (negative only) |
| `--reg regfile` | — | Registration to MNI305 for coordinate reporting |
| `--mask maskid` | — | Restrict analysis to a mask volume |
| `--frame n` | 0 | Process frame n of a 4D volume |
| `--csd csdfile` | — | Cluster-size distribution file for empirical p-values |
| `--fwhm fwhm` | — | FWHM for GRF-based cluster p-values |

## Outputs

| Flag | Default | Description |
|------|---------|-------------|
| `--sum sumfile` | — | Text summary file with cluster table (primary output) |
| `--o outvol` | — | Cluster-labelled output volume |
| `--outmask outmaskid` | — | Binary mask of all suprathreshold voxels |
| `--pointset file` | — | Cluster maxima as a Freeview-compatible pointset |
| `--vwsig file` | — | Voxel-wise significance map |
| `--cwsig file` | — | Cluster-wise significance map |

### Summary file format

```
# Cluster   Size(n)   Size(mm^3)   TalX   TalY   TalZ   Max   [CWP  CWPLow  CWPHi]
     1        512       4096.0     -24.5   12.3   -8.1   4.23  0.001  0.0005  0.002
```

## Mathematical Foundations

**Connected components:** Uses a region-growing algorithm (`clustGrow()`) with 6-connectivity (face-connected) by default, or 26-connectivity (diagonal allowed) with `--allowdiag`.

**Size threshold:** Clusters with fewer voxels than $N_{\min} = S_{\text{thresh}} / V_{\text{vox}}$ (where $V_{\text{vox}}$ is voxel volume in mm³) are pruned.

**Coordinate reporting:** Cluster peak coordinates are transformed to MNI305 Talairach space via the registration matrix when `--reg` is provided:

$$
\begin{pmatrix} x_{\text{MNI}} \\ y_{\text{MNI}} \\ z_{\text{MNI}} \end{pmatrix} = M_{\text{CRS2MNI}} \begin{pmatrix} c \\ r \\ s \\ 1 \end{pmatrix}
$$

**GRF cluster p-values** (when `--fwhm` is provided): Uses `RFprobZClusterSigThresh()` / `RFprobZCluster()` from the `randomfields` library, implementing Gaussian random field theory for the probability of a cluster of given size at a given threshold under the null hypothesis.

**CSD cluster p-values** (when `--csd` is provided): Uses `CSDpvalClustSize()` — looks up the empirical distribution from a Monte Carlo simulation file to assign p-values.

**One-tailed adjustment:** When `threshsign != 0` (one-tailed) and `AdjustThreshWhenOneTail = 1` (default), the GRF threshold is adjusted accordingly. With `threshsign == 0` (abs), a factor-of-2 correction is applied as a hack.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--in`<br>`--i` | `vol` | — | Input statistical volume |
| `--thmin` | `thresh` | — (required) | Lower threshold |
| `--thmax` | `thresh` | none (∞) | Upper threshold |
| `--sign` | `string` | `abs` | `abs`, `pos`, or `neg` |
| `--match` | `val` (int) | — | Set `thmin = val − 0.5`, `thmax = val + 0.5` (for matching integer labels) |
| `--frame` | `n` | 0 | Frame index in 4D input |
| `--mask` | `maskid` | — | Restrict to mask |
| `--maskthresh` | `t` | 0.5 | Mask threshold |
| `--masksign` | `string` | `abs` | Mask sign (`abs`, `pos`, `neg`) |
| `--maskinvert` | — | off | Invert mask |
| `--maskframe` | `n` | 0 | Frame of mask volume to use |
| `--mask_type` | `type` | auto | File format type of the mask volume |
| `--outmask` | `outmaskid` | — | Binary suprathreshold mask |
| `--outmask_type` | `type` | auto | File format type of the outmask volume |
| `--minsize` | `mm3` | 0.0 | Minimum cluster size in mm³ |
| `--minsizevox` | `n` | 0 | Minimum cluster size in voxels |
| `--mindist` | `mm` | 0.0 (off) | Minimum distance between cluster peaks |
| `--allowdiag` | — | off | Allow diagonal connectivity (26-connectivity) |
| `--no-allowdiag` | — | on | Disable diagonal connectivity (default face-only) |
| `--reg` | `regfile` | — | Registration to MNI305 space |
| `--regheader` | `subject` | — | Use header geometry (writes temp reg file) |
| `--mni152reg` | — | — | Use built-in MNI152 registration |
| `--fsaverage` | — | off | Assume input is in fsaverage space |
| `--sum` | `sumfile` | — | Output text summary |
| `--o`<br>`--out` | `outvol` | — | Cluster-labelled output volume |
| `--out_type` | `type` | auto | Output volume type |
| `--in_type` | `type` | auto | Input volume type |
| `--ocn` | `file` | — | Output cluster number volume |
| `--ocn_type` | `type` | auto | Output cluster number volume type |
| `--csd` | `csdfile` | — | Cluster-size distribution for empirical p-values |
| `--csd-out` | `file` | — | Write CSD to file |
| `--csdpdf` | `pdffile` | — | Save CSD as PDF |
| `--csdpdf-only` | — | off | Write CSD PDF file and exit; skip cluster analysis |
| `--cwpvalthresh` | `pval` | −1 (off) | Cluster-wise p-value threshold for output |
| `--cwsig` | `file` | — | Save cluster-wise significance map |
| `--mincwpval` | `file` | — | Save p-value of largest cluster |
| `--vwsig` | `file` | — | Save voxel-wise significance map |
| `--vwsigmax` | `file` | — | Save maximum voxel-wise significance |
| `--fwhm` | `fwhm` | −1 (off) | FWHM (mm) for GRF cluster p-values |
| `--fwhmdat` | `file` | — | Read FWHM from a text file (alternative to `--fwhm`) |
| `--bonferroni` | `n` | 0 (off) | Bonferroni correction factor (for multiple spaces) |
| `--bonferroni-max` | `n` | 0 (off) | Bonferroni factor applied only with `--sig2p-max` |
| `--sig2p-max` | — | off | Convert max value from −log10(p) to p |
| `--gte` | — | off | Use >= (rather than >) for CSD p-value lookup |
| `--synth` | `function` | — | Synthesise input for null distribution testing (`uniform`, `loguniform`, `gaussian`) |
| `--label`<br>`--labelfile` | `file` | — | Label file to restrict analysis |
| `--labelbase` | `base` | — | Base name for per-cluster label files |
| `--nlabelcluster` | `n` | −1 | Cluster number to save as label (requires `--label`) |
| `--seg` | `subject segvol` | — | Annotate clusters with FreeSurfer segmentation (requires SUBJECTS_DIR) |
| `--sd` | `dir` | — | Set SUBJECTS_DIR |
| `--ctab` | `file` | — | Color table for segmentation annotation |
| `--grow` | — | — | Grow clusters beyond threshold |
| `--fill` | — | — | Remove islands and holes in a binary volume (standalone mode) |
| `--verbose` | — | off | Verbose output |
| `--no-fixmni` | — | off | Report raw MNI305 coordinates (not Talairach-converted) |
| `--fixmni` | — | on | Apply MNI-to-Talairach fix |
| `--fixtkreg` | — | on | Apply tkregister fix to registration (default on) |
| `--nofixtkreg` | — | — | Disable tkregister fix |
| `--no-adjust` | — | off | Disable one-tail GRF threshold adjustment |
| `--pointset` | `file` | — | Save cluster maxima as pointset |
| `--debug` | — | off | Verbose debug output |
| `--diag` | `diagno` (int) | — | Set diagnostic level (`Gdiag_no`); controls diagnostic verbosity of FreeSurfer library functions |
| `--help` | — | — | Print full help text and exit |
| `--version` | — | — | Print version |

## Configuration Interactions

- `--csd` and `--fwhm` are alternative methods for cluster-wise p-values; do not use both simultaneously.
- `--reg` is required for coordinates to be reported in MNI305/Talairach space; without it, voxel indices are reported instead.
- `--sign pos` or `neg` with `--thmin` implements one-tailed thresholding; `abs` (default) is two-tailed.
- `--minsize` is in mm³; the equivalent voxel count depends on voxel size, which is computed automatically. Use `--minsizevox` to specify in voxels directly.
- `--allowdiag` changes connectivity from 6-face to 26-neighbour, producing larger clusters.
- `--bonferroni n` multiplies the number of tests for Bonferroni correction (used for multiple spaces, e.g., surface + volume).

## Typical Use Cases

```bash
# Find clusters in a z-statistic map with threshold z > 1.96
mri_volcluster \
    --in zstat.mgz \
    --thmin 1.96 \
    --sign pos \
    --reg register.dat \
    --sum clusters.txt \
    --o cluster_labels.mgz

# Apply GRF cluster-wise p-values with known FWHM
mri_volcluster \
    --in zstat.mgz \
    --thmin 2.0 \
    --reg register.dat \
    --fwhm 8.0 \
    --cwpvalthresh 0.05 \
    --sum clusters_grf.txt

# Use CSD file from Monte Carlo simulation
mri_volcluster \
    --in zstat.mgz \
    --thmin 2.0 \
    --reg register.dat \
    --csd simulation.csd \
    --sum clusters_csd.txt

# Restrict to brain mask, find positive and negative clusters
mri_volcluster \
    --in tstat.mgz \
    --thmin 2.5 \
    --sign abs \
    --mask brainmask.mgz \
    --minsize 100 \
    --sum clusters.txt
```

## Pipeline Context

`mri_volcluster` is not called by `recon-all`. It is used in group analysis workflows:

- Downstream of `mri_glmfit` (the FreeSurfer GLM tool) for statistical thresholding
- Part of FSfast (FreeSurfer's fMRI analysis pipeline)
- Works with [[mri_volsynth]] to generate null distributions for empirical cluster-level inference

## Gotchas and Caveats

> [!gotcha] "Talairach" coordinates are MNI305
> Cluster coordinates are reported as "Talairach" in the summary file but are actually in MNI305 space. Use `--no-fixmni` to report raw MNI305 coordinates (disabling the default Talairach fix). See [[coordinate-systems]] for the distinction.

> [!gotcha] One-tailed threshold correction
> When `threshsign == 0` (abs), the GRF p-value computation applies a factor-of-2 correction as an acknowledged hack in the source comments. This may not be mathematically rigorous for all use cases.

> [!gotcha] Random seed is hardcoded
> The random seed for synthesis (`setRandomSeed(53)`) is hardcoded at program startup, not user-configurable. Monte Carlo simulations for CSD generation should use dedicated tools.

> [!gotcha] --minsize is in mm³; use --minsizevox for voxel counts
> The `--minsize` argument is in mm³. The equivalent voxel count is computed internally from the voxel dimensions. Use `--minsizevox` to specify the threshold directly in voxels. This is different from surface cluster tools, which use mm².

## Related Tools

- [[mri_z2p]] — converts z-statistics to p-values before clustering
- [[mri_binarize]] — applies threshold to create binary masks
- [[mri_volsynth]] — synthesises null distribution volumes for testing

## Confidence and Gaps

**High confidence:** core algorithm (connected components, pruning, sorting), output format, flag table (from variable declarations and parse logic in source), coordinate transform.

> [!note] Help-text alias discrepancies — not real flags
> The `BEGINUSAGE` / `PrintUsage()` help text in `mri_volcluster.cpp` uses names that differ from the option strings the parser actually matches:
> - Help says `--maskinverse`; `parse_commandline()` matches `--maskinvert` (line 783). Only `--maskinvert` works.
> - Help says `--mindistance`; `parse_commandline()` matches `--mindist` (line 1028). Only `--mindist` works.
> - Help says `--sumfile`; `parse_commandline()` matches `--sum` (line 917). Only `--sum` works.
> - Help says `--sig2pmax`; `parse_commandline()` matches `--sig2p-max` (line 790). Only `--sig2p-max` works.
> The flag table above uses the authoritative parsed names.

> [!gap] CSD file format
> The format of the `.csd` (cluster-size distribution) file generated by Monte Carlo simulation was not documented. This is required for the `--csd` workflow.

> [!gap] mri_glmfit integration
> The exact workflow connecting `mri_glmfit` output to `mri_volcluster` input was not traced.
