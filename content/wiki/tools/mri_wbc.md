---
title: "mri_wbc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_wbc/mri_wbc.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_concat]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The mathematical definition of the connectivity measure (correlation, coherence, etc.) was not traced in detail."
  - "The output file format and organisation in the outdir was not documented from source."
  - "The --rholist parameter meaning (correlation threshold list?) was not confirmed."
tags:
  - connectivity
  - functional-mri
  - whole-brain
  - correlation
---

# mri_wbc

## Summary

`mri_wbc` computes whole-brain connectivity (WBC) maps from volumetric and/or surface functional MRI data. For each voxel or vertex in a mask, it computes the connectivity (correlation or coherence) with all other masked voxels/vertices within a distance threshold. The tool handles combined volume + surface data (left and right hemispheres) and outputs connectivity maps for short-range, long-range, and combined connectivity.

## Source Information

- **Language:** C++
- **Source file:** `mri_wbc/mri_wbc.cpp`
- **Original author:** Douglas N. Greve (MGH)
- **Key function:** `WholeBrainCon()` — implements the connectivity computation

## Purpose and Context

Whole-brain connectivity analysis characterises the degree to which each brain region's timeseries correlates with the rest of the brain. This is used in resting-state fMRI analyses to study the intrinsic functional organisation of the brain. `mri_wbc` is a low-level tool that performs the dense connectivity computation; it is intended for expert use in conjunction with FreeSurfer's fMRI analysis stream (FSfast).

## Inputs

| Flag | Description |
|------|-------------|
| `--fvol fvol` | 4D functional volume |
| `--volmask mask` | Volumetric mask |
| `--lh flh lhsurface [lhsurface2]` | Left-hemisphere functional surface overlay and surface file |
| `--lhmask lhmask` | Left-hemisphere mask |
| `--lhlabel lhlabel` | Left-hemisphere label to use as mask |
| `--rh frh rhsurface [rhsurface2]` | Right-hemisphere functional surface overlay and surface file |
| `--rhmask rhmask` | Right-hemisphere mask |
| `--rhlabel rhlabel` | Right-hemisphere label to use as mask |

## Outputs

Output files are written to the directory specified by `--o`:

| Flag | Description |
|------|-------------|
| `--o outdir` | Output directory |
| `--volcon file` | Volumetric connectivity map |
| `--lhcon file` | Left-hemisphere surface connectivity |
| `--rhcon file` | Right-hemisphere surface connectivity |
| `--volconS file` | Short-range volumetric connectivity |
| `--lhconS file` | Short-range left-hemisphere connectivity |
| `--rhconS file` | Short-range right-hemisphere connectivity |
| `--volconL file` | Long-range volumetric connectivity |
| `--lhconL file` | Long-range left-hemisphere connectivity |
| `--rhconL file` | Long-range right-hemisphere connectivity |
| `--volrhomean file` | Mean correlation for volume |
| `--lhrhomean file` | Mean correlation for left hemisphere |
| `--rhrhomean file` | Mean correlation for right hemisphere |
| `--mat file` | Full connectivity matrix (dense; can be very large) |

## Mathematical Foundations

The tool computes pairwise connectivity between all masked voxels/vertices. Based on the variable names in the source (`rholist`, `rhomean`, connectivity), the primary metric is the Pearson correlation $\rho$ between timeseries:

$$\rho_{ij} = \frac{\sum_t (f_i(t) - \bar{f}_i)(f_j(t) - \bar{f}_j)}{\sqrt{\sum_t (f_i(t)-\bar{f}_i)^2} \sqrt{\sum_t (f_j(t)-\bar{f}_j)^2}}$$

Short-range vs. long-range connectivity is separated by a distance threshold (`--distthresh`):
- Short: pairs with spatial distance $< d_{\text{thresh}}$
- Long: pairs with spatial distance $\geq d_{\text{thresh}}$

> [!gap] Connectivity measure
> The exact connectivity measure (Pearson $\rho$, z-transformed $\rho$, coherence, etc.) and normalisation convention was not confirmed by reading the `WholeBrainCon()` implementation in detail. The variable name `rholist` strongly suggests correlation.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--fvol` | `fvol` | 4D functional volume input |
| `--volmask` | `mask` | Volumetric mask |
| `--lh` | `flh lhsurf [lhsurf2]` | LH functional data + surface |
| `--lhmask` | `mask` | LH mask |
| `--lhlabel` | `label` | LH label mask |
| `--rh` | `frh rhsurf [rhsurf2]` | RH functional data + surface |
| `--rhmask` | `mask` | RH mask |
| `--rhlabel` | `label` | RH label mask |
| `--o` | `outdir` | Output directory |
| `--volcon` | `file` | Volumetric connectivity output |
| `--lhcon` | `file` | LH connectivity output |
| `--rhcon` | `file` | RH connectivity output |
| `--volconS` | `file` | Short-range vol connectivity |
| `--lhconS` | `file` | Short-range LH connectivity |
| `--rhconS` | `file` | Short-range RH connectivity |
| `--volconL` | `file` | Long-range vol connectivity |
| `--lhconL` | `file` | Long-range LH connectivity |
| `--rhconL` | `file` | Long-range RH connectivity |
| `--volrhomean` | `file` | Mean correlation for volume |
| `--lhrhomean` | `file` | Mean correlation for LH |
| `--rhrhomean` | `file` | Mean correlation for RH |
| `--distthresh` | `mm` | Distance threshold for short/long split (default 10) |
| `--rho` | `val ...` | Correlation thresholds for output (multiple allowed) |
| `--mat` | `file` | Save full connectivity matrix |
| `--threads` | `n` | Number of OpenMP threads |
| `--test` | — | Run internal test (synthetic data) |
| `--debug` | — | Enable debug output |
| `--version` | — | Print version |

## Configuration Interactions

- `--fvol`, `--lh`, and `--rh` are independent and can be specified in any combination — the tool handles volume-only, surface-only, or combined volume+surface connectivity.
- Short/long-range split requires `--distthresh`; the default is 10mm.
- `--mat` outputs the full pairwise matrix, which scales as $O(N^2)$ and can be extremely large for whole-brain analyses.
- OpenMP parallelism is available via `--threads`.

## Typical Use Cases

```bash
# Compute whole-brain volumetric connectivity
mri_wbc \
    --fvol fmri_preprocessed.mgz \
    --volmask brain_mask.mgz \
    --distthresh 20 \
    --volcon connectivity.mgz \
    --o ./wbc_output/

# Combined volume + surface connectivity
mri_wbc \
    --fvol fmri.mgz \
    --volmask brain.mgz \
    --lh lh.fmri.mgh lh.white \
    --rh rh.fmri.mgh rh.white \
    --volcon vol_conn.mgz \
    --lhcon lh_conn.mgh \
    --rhcon rh_conn.mgh \
    --o ./wbc_output/ \
    --threads 8
```

## Pipeline Context

`mri_wbc` is not part of `recon-all`. It is used in resting-state fMRI analysis workflows within the FSfast framework, typically after functional preprocessing (motion correction, temporal filtering, spatial smoothing).

## Gotchas and Caveats

> [!gotcha] Memory and computation scale quadratically
> Dense whole-brain connectivity computes all pairwise correlations among $N$ voxels/vertices. With $N = 50{,}000$, the matrix contains $1.25 \times 10^9$ values. Using `--mat` for large brains can require many gigabytes of RAM.

> [!gotcha] Functional data must be preprocessed
> No temporal preprocessing (detrending, bandpass filtering, nuisance regression) is performed by this tool. Input functional data should be fully preprocessed before running `mri_wbc`.

## Related Tools

- [[mri_vol2surf]] — projects volumetric data onto surfaces for surface-based connectivity
- [[mri_concat]] — concatenates functional volumes

## Confidence and Gaps

**Medium confidence:** flag interface (from parse logic), data structures (WBC struct, short/long range separation), output organisation.

**Low confidence:** exact mathematical definition of connectivity metric (not traced in `WholeBrainCon()`).

> [!gap] Connectivity metric
> The `WholeBrainCon()` function implements the core computation but was not fully traced. The exact metric (Fisher z-transformed correlation, raw correlation, coherence) and any normalisation are unknown.
