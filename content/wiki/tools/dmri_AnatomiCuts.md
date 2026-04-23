---
title: "dmri_AnatomiCuts"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/AnatomiCuts.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_ac.sh]]"
  - "[[dmri_match]]"
  - "[[dmri_stats_ac]]"
  - "[[dmri_groupByEndpoints]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "No --help from binary; usage derived from source"
  - "Exact normalized cuts implementation (eigenvalue solver, number of eigenvectors) not fully traced"
tags:
  - diffusion
  - tractography
  - clustering
  - spectral
  - anatomicuts
---

# dmri_AnatomiCuts

## Summary

`dmri_AnatomiCuts` performs anatomically-informed spectral clustering of white-matter streamlines. It partitions a tractography dataset (in `.trk` format) into anatomically coherent bundles using a normalized cuts algorithm, guided by a parcellation image that assigns anatomical labels to the cortical and subcortical regions where streamlines terminate. The result is a set of per-cluster `.trk` files and a hierarchical clustering history CSV file.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/AnatomiCuts.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_AnatomiCuts`
- **Original author:** Viviana Siless (MGH)
- **Key libraries:** ITK, VTK, vnl (for eigensolvers and sparse matrices)

## Purpose and Context

AnatomiCuts addresses the problem of parcellating whole-brain tractography into anatomically meaningful fiber bundles without requiring manual ROI seeds. Instead of seed-based or ROI-filtered tractography, it operates on a complete streamline set and groups fibers by their anatomical connectivity profile (which parcellation regions they pass through or terminate in) combined with geometric similarity.

The tool is the core clustering step in the `dmri_ac.sh` pipeline. It is called after streamlines have been filtered by minimum length and a parcellation has been resampled into DWI space.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Parcellation image | `-s` | Segmentation/parcellation in DWI space | NIfTI/MGZ (integer labels) |
| Fiber tractography | `-f` | Input streamlines | `.trk` |
| Number of clusters | `-c` | Target number of clusters | integer (default: 200) |
| Number of points | `-n` | Points to resample each streamline to | integer (default: 10) |
| Number of fibers for eigen | `-e` | Fibers used for eigenvector computation | integer (default: 500) |
| Output folder | `-o` | Directory for output cluster files | path |
| Neighbor type | `-d` | Neighbor connectivity: `s`(straight), `d`(diagonal), `a`(all), `o`(none) | string (default: `a`) |
| Labels flag | `-labels` | Use label-based membership function | flag |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `<n>.trk` files | One `.trk` file per cluster | TrackVis `.trk` |
| `HierarchicalHistory.csv` | Dendrogram/merging history of hierarchical clustering | CSV |

## Mathematical Foundations

AnatomiCuts uses **normalized spectral clustering** (the Normalized Cuts algorithm of Shi & Malik, 2000):

1. **Streamline representation:** Each streamline is resampled to $n$ equidistant points. At each point, the overlapping parcellation label is recorded, producing a label sequence $\{l_1, l_2, \ldots, l_n\}$ per streamline.

2. **Affinity matrix:** A pairwise affinity $W_{ij}$ between streamlines $i$ and $j$ is computed using one of several membership functions:
   - **Euclidean:** Euclidean distance between corresponding resampled points
   - **Hausdorff:** Maximum of minimum point distances
   - **Label entropy/intersection:** Based on overlap of label histograms

   The Gaussian affinity is:
$$
   W_{ij} = \exp\!\left(-\frac{d(s_i, s_j)^2}{2\sigma^2}\right)
$$

3. **Normalized cuts:** The graph Laplacian is computed, and the generalized eigenvalue problem:
$$
   (\mathbf{D} - \mathbf{W})\mathbf{v} = \lambda \mathbf{D}\mathbf{v}
$$
   is solved for the $k$ smallest non-zero eigenvalues (where $k$ = number of clusters). The resulting eigenvectors form a spectral embedding of the streamlines, which is then partitioned by $k$-means.

4. **Hierarchical agglomeration:** Clusters are hierarchically merged to produce the dendrogram stored in `HierarchicalHistory.csv`.

> [!internal] References internal code
> The normalized cuts filter is implemented in `NormalizedCutsFilter.h` in the anatomicuts directory. The sparse affinity matrix uses `sparse/spMatrix.h`. VNL (vnl_matrix) is used for the eigenvalue computation.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s <file>` | file | required | Parcellation/segmentation image in DWI space |
| `-f <file>` | file | required | Input tractography file (.trk) |
| `-c <n>` | int | 200 | Number of clusters |
| `-n <n>` | int | 10 | Number of points per resampled streamline |
| `-e <n>` | int | 500 | Number of fibers used for eigenvector computation |
| `-o <dir>` | dir | required | Output directory |
| `-d <type>` | string | `a` | Neighbor connectivity type: `s`(straight), `d`(diagonal), `a`(all 26-connected), `o`(none) |
| `-labels` | flag | off | Activate label-based similarity via `LabelsEntropyAndIntersectionMembershipFunction` (sets `SetLabels(true)`) |
| `-labels2` | flag | off | Alternate label flag also activating `SetLabels(true)` in `LabelsEntropyAndIntersectionMembershipFunction` |
| `-euclid` | flag | off | Use Euclidean point-to-point distance as the membership function (`EuclideanMembershipFunction`) |
| `-hausdorff` | flag | off | Use Hausdorff distance as the membership function (`HausdorffMembershipFunction`) |
| `-labelsPTP` | flag | off | Use point-to-point label membership function (`LabelsPointToPointMembershipFunction`); sets all label-count directions |
| `-labelsPTPNN` | flag | off | Like `-labelsPTP` but uses only the nearest-neighbour label count (sets label count to 1) |
| `-labelsAndEuclid` | flag | off | Combine label-based and Euclidean metrics (`SetLabelsAndEuclid(true)`) |
| `-leuclid` | flag | off | Add Euclidean component to label-entropy membership function (`SetEuclidean(true)`) |
| `-intersection` | flag | off | Use label intersection metric within `LabelsEntropyAndIntersectionMembershipFunction` (`SetIntersection(true)`) |
| `-entropy` | flag | off | Use label entropy metric within `LabelsEntropyAndIntersectionMembershipFunction` (`SetEntropy(true)`) |
| `-dice` | flag | off | Use Dice coefficient similarity metric (`SetDice(true)`) |
| `-kulczynskis` | flag | off | Use Kulczynski's similarity coefficient (`SetKulczynskis(true)`) |
| `-jensenshannon` | flag | off | Use Jensen-Shannon divergence as the similarity metric (`SetJensenShannon(true)`) |
| `-ruzicka` | flag | off | Use Ruzicka similarity coefficient (`SetRuzicka(true)`) |
| `-meanEuclidean` | flag | off | Use mean Euclidean distance across all streamline points (`SetMeanEuclidean(true)`) |
| `-meanClosestPointInvert` | flag | off | Use mean closest-point distance with inversion (`SetMeanClosestPointInvert(true)`) |
| `-meanClosestPointGaussian` | flag | off | Use mean closest-point distance with Gaussian weighting (`SetMeanClosestPointGaussian(true)`) |
| `-meanAndCov` | flag | off | Use mean and covariance of the streamline point cloud (point data accumulated per fiber) |
| `-meanAndCovGaussian` | flag | off | Use mean and covariance with Gaussian kernel (`SetMeanAndCovGaussian(true)`) |
| `-meanAndCovInvert` | flag | off | Use mean and covariance with inversion (`SetMeanAndCovInvert(true)`) |

## Configuration Interactions

- **Membership function selection**: The tool uses a priority-based dispatch. If `-labelsPTPNN` or `-labelsPTP` is set, `LabelsPointToPointMembershipFunction` is used. Otherwise if `-euclid`, `EuclideanMembershipFunction` is used. Otherwise if `-hausdorff`, `HausdorffMembershipFunction` is used. Otherwise, `LabelsEntropyAndIntersectionMembershipFunction` is the fallback (all fine-grained options `-intersection`, `-entropy`, `-labels`, `-labels2`, `-leuclid`, `-labelsAndEuclid`, `-dice`, `-kulczynskis`, `-jensenshannon`, `-ruzicka`, `-meanEuclidean`, `-meanClosestPointInvert`, `-meanClosestPointGaussian`, `-meanAndCovGaussian`, `-meanAndCovInvert` apply only within this fallback path).
- `-labels` and `-labels2` both call `SetLabels(true)` in the fallback membership function; they are effectively equivalent.
- `-meanAndCov`, `-meanAndCovGaussian`, `-meanAndCovInvert`: when any of these is active, the per-fiber representation switches from individual sampled points to a mean + covariance encoding.
- `-e` controls a subsampling step: only `-e` fibers are used to compute the affinity matrix eigenvectors, which are then used to assign all streamlines. Larger values improve accuracy but increase memory and computation.
- `-d` controls which voxel neighbors are considered when computing label assignments. `a` (all 26-connected neighbors) is the most inclusive.

## Typical Use Cases

```bash
# Standard AnatomiCuts clustering with 200 clusters, label-based similarity
dmri_AnatomiCuts \
  -s /data/subject01/dmri/wmparc2dwi.nii.gz \
  -f /data/subject01/dmri/FOD/streamlines_l45.trk \
  -l a -c 200 -n 10 -e 500 \
  -labels \
  -o /data/subject01/dmri.ac/45/

# Fewer clusters, straight-neighbor connectivity
dmri_AnatomiCuts \
  -s wmparc2dwi.nii.gz \
  -f streamlines.trk \
  -c 50 -n 10 -e 500 -d s \
  -o output_dir/
```

## Pipeline Context

`dmri_AnatomiCuts` is called by `dmri_ac.sh` (the `anatomiCuts` function). It follows:
- Tractography generation (FSL/MRtrix or `diffusionUtils`)
- Parcellation registration to DWI space (`anat2dwi`)
- Streamline length filtering (`streamlineFilter`)

After `dmri_AnatomiCuts`, the pipeline continues with:
- `streamlineFilter` (spatial outlier removal)
- `dmri_match` (Hungarian cross-subject correspondence)
- `dmri_stats_ac` / `dmri_extractSurfaceMeasurements` (measure extraction)

## Gotchas and Caveats

> [!gotcha] No help flag behavior
> Running `dmri_AnatomiCuts` with no arguments or `-h`/`--help` simply prints a usage line to stdout and exits with code -1. There is no detailed documentation.

> [!gotcha] Large memory use for large tractograms
> The affinity matrix is $N \times N$ where $N$ is the number of streamlines passed to the eigen computation (`-e`). For 500 streamlines this is manageable, but increasing `-e` substantially increases RAM requirements. The full-set assignment is done after the eigenvectors are computed.

> [!gotcha] Output directory must exist or be created by the binary
> The source calls `vtkDirectory::MakeDirectory(outputFolder)` to create the output directory; however, the `-o` path must be on an accessible filesystem.

> [!gotcha] Input streamlines must be in DWI space
> The parcellation image (`-s`) must be registered to the same space as the streamlines. The script `dmri_ac.sh` performs this registration via `mri_vol2vol`.

## Related Tools

- [[dmri_ac.sh]] — pipeline orchestrator that calls this tool
- [[dmri_match]] — Hungarian cross-subject bundle matching
- [[dmri_stats_ac]] — extracts diffusion measures from matched bundles
- [[dmri_groupByEndpoints]] — alternative endpoint-based grouping

## Confidence and Gaps

> [!gap] Exact normalized cuts implementation
> The full normalized cuts implementation is in `NormalizedCutsFilter.h` which was not read in full. The exact eigensolver used (LAPACK? VNL? ITK internal?) and convergence criteria are not confirmed.

> [!gap] `-labels` membership function
> The label-based membership function names visible in the includes (`LabelsHistogramMembershipFunction`, `LabelsEntropyAndIntersectionMembershipFunction`) suggest multiple options, but the exact flag that selects between them is not clear from the main source alone.
