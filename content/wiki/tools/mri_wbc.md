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
last_agent_update: 2026-04-21
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

$$
\rho_{ij} = \frac{\sum_t (f_i(t) - \bar{f}_i)(f_j(t) - \bar{f}_j)}{\sqrt{\sum_t (f_i(t)-\bar{f}_i)^2} \sqrt{\sum_t (f_j(t)-\bar{f}_j)^2}}
$$

Short-range vs. long-range connectivity is separated by a distance threshold (`--dist`):
- Short: pairs with spatial distance $< d_{\text{thresh}}$
- Long: pairs with spatial distance $\geq d_{\text{thresh}}$

> [!gap] Connectivity measure
> The exact connectivity measure (Pearson $\rho$, z-transformed $\rho$, coherence, etc.) and normalisation convention was not confirmed by reading the `WholeBrainCon()` implementation in detail. The variable name `rholist` strongly suggests correlation.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fvol` | `fvol` | — | 4D functional volume input |
| `--volmask` | `mask` | — | Volumetric mask |
| `--lh` | `flh lhsurf [lhsurf2]` | — | LH functional data + surface (optional second surface for distance refinement) |
| `--lhmask` | `mask` | — | LH mask |
| `--lhlabel` | `label` | — | LH label mask |
| `--rh` | `frh rhsurf [rhsurf2]` | — | RH functional data + surface (optional second surface for distance refinement) |
| `--rhmask` | `mask` | — | RH mask |
| `--rhlabel` | `label` | — | RH label mask |
| `--o` | `outdir` | — | Output directory |
| `--volcon` | `file` | — | Volumetric connectivity output (auto-set to `outdir/vol.con.nii.gz` when `--fvol` is given) |
| `--lhcon` | `file` | — | LH connectivity output (auto-set to `outdir/lh.con.nii.gz` when `--lh` is given) |
| `--rhcon` | `file` | — | RH connectivity output (auto-set to `outdir/rh.con.nii.gz` when `--rh` is given) |
| `--volconS` | `file` | — | Short-range vol connectivity (auto-set when `--dist` is given) |
| `--lhconS` | `file` | — | Short-range LH connectivity (auto-set when `--dist` is given) |
| `--rhconS` | `file` | — | Short-range RH connectivity (auto-set when `--dist` is given) |
| `--volconL` | `file` | — | Long-range vol connectivity (auto-set when `--dist` is given) |
| `--lhconL` | `file` | — | Long-range LH connectivity (auto-set when `--dist` is given) |
| `--rhconL` | `file` | — | Long-range RH connectivity (auto-set when `--dist` is given) |
| `--volrhomean` | `file` | — | Mean correlation for volume (auto-set to `outdir/vol.rho.mean.nii.gz`) |
| `--lhrhomean` | `file` | — | Mean correlation for LH (auto-set to `outdir/lh.rho.mean.nii.gz`) |
| `--rhrhomean` | `file` | — | Mean correlation for RH (auto-set to `outdir/rh.rho.mean.nii.gz`) |
| `--dist` | `mm` | — | Distance threshold (mm) for short/long range split; activates short/long separation |
| `--rho` | `val ...` | `0.2` | Correlation threshold(s) for connectivity output (multiple allowed; default 0.2 if none given) |
| `--mat` | `file` | — | Save full pairwise connectivity matrix (dense; can be very large) |
| `--threads` | `n` | — | Number of OpenMP threads |
| `--test` | — | `off` | Run internal self-test (synthetic data) |
| `--test-fail` | — | `off` | Run self-test and force a failure (for testing error handling) |
| `--save-test` | — | `off` | Run self-test and save the test outputs |
| `--uppersub-test` | `N` | — | Run `Index2UpperSubscriptTest(N)` and exit (developer diagnostic) |
| `--debug` | — | `off` | Enable debug output |
| `--version` | — | — | Print version and exit |

## Configuration Interactions

- `--fvol`, `--lh`, and `--rh` are independent and can be specified in any combination — the tool handles volume-only, surface-only, or combined volume+surface connectivity.
- Short/long-range split is activated by specifying `--dist <mm>`; providing this flag sets `DoDist = 1` and records the threshold. Without `--dist`, only aggregate connectivity maps are produced.
- `--mat` outputs the full pairwise matrix, which scales as $O(N^2)$ and can be extremely large for whole-brain analyses.
- OpenMP parallelism is available via `--threads`.
- `--test`, `--test-fail`, and `--save-test` are developer/diagnostic modes that run synthetic-data self-tests rather than processing real input.

## Typical Use Cases

```bash
# Compute whole-brain volumetric connectivity
mri_wbc \
    --fvol fmri_preprocessed.mgz \
    --volmask brain_mask.mgz \
    --dist 20 \
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
> Dense whole-brain connectivity computes all pairwise correlations among $N$ voxels/vertices. With $N = 50{,}000$, the matrix contains $1.25 \times 10^9$ values. Using --mat for large brains can require many gigabytes of RAM.

> [!gotcha] Functional data must be preprocessed
> No temporal preprocessing (detrending, bandpass filtering, nuisance regression) is performed by this tool. Input functional data should be fully preprocessed before running `mri_wbc`.

## Related Tools

- [[mri_vol2surf]] — projects volumetric data onto surfaces for surface-based connectivity
- [[mri_concat]] — concatenates functional volumes

## Confidence and Gaps

**Medium confidence:** flag interface confirmed from `parse_commandline()` in source. Data structures (WBC struct, short/long range separation), output organisation.

**Low confidence:** exact mathematical definition of connectivity metric (not traced in `WholeBrainCon()`).

**Note:** The flag --distthresh does not exist in source; the correct flag is --dist.

> [!gap] Connectivity metric
> The `WholeBrainCon()` function implements the core computation but was not fully traced. The exact metric (Fisher z-transformed correlation, raw correlation, coherence) and any normalisation are unknown.
