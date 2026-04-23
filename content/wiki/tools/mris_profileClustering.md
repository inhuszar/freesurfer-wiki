---
title: "mris_profileClustering"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_profileClustering.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_multimodal]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - clustering
  - cortical-profile
  - k-means
  - ITK
---

# mris_profileClustering

## Summary

`mris_profileClustering` clusters surface vertices based on their cortical intensity profiles — the sequence of MRI values sampled at multiple depths along the surface normal. Using k-means clustering (via ITK's `KdTreeBasedKmeansEstimator`), it groups vertices whose intensity depth profiles are similar, producing a parcellation into cortical types or microstructural classes.

## Source Information

- **Language:** C++ (ITK/VTK-based)
- **Source file:** `resurf/mris_profileClustering.cxx`
- **Dependencies:** ITK (KdTree, k-means, list sample, decision rule), VTK (rendering, polydata)
- **Location:** `resurf/` research subdirectory

## Purpose and Context

Cortical thickness and myelination vary across the cortex in ways that are not captured by curvature or sulcal depth alone. By examining the full depth profile of MRI intensity (from WM through cortex to CSF), vertices can be grouped into classes that reflect microstructural differences. This approach is related to "cortical type" mapping from quantitative MRI and can reveal architectural boundaries not visible in structural images.

Potential applications:
- Identification of primary sensory areas (which have distinct myelin profiles)
- Mapping of cortical layers using high-resolution MRI
- Unsupervised discovery of cortical parcels based on MRI contrast

## Inputs

- `-s surface` — input surface file
- `-i N image1 ... imageN` — N input image files (e.g., T1, T2, MTsat)
- `-c numClusters` — number of k-means clusters
- `-d deep` — depth parameter (number of steps or total depth along normal)

## Outputs

- `-o outputImage` — output cluster assignments as an image
- `-b outputSurface` — output surface with cluster labels
- `-a annotation` — output annotation file (cortical parcellation)

## Mathematical Foundations

For each vertex $v$ on the surface, a profile vector $\mathbf{p}_v \in \mathbb{R}^{N \times D}$ is formed by sampling $N$ input images at $D$ depths along the outward normal. K-means clustering minimises:

$$
\arg\min_{k=1..K} \sum_{v} \|\mathbf{p}_v - \mathbf{\mu}_{k(v)}\|^2
$$

where $\mathbf{\mu}_k$ is the centroid of cluster $k$. ITK's `KdTreeBasedKmeansEstimator` implements this using a KD-tree acceleration structure.

The assignment of each vertex to a cluster is output as both an image overlay and an annotation.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s <surface>` | string | required | Input FreeSurfer surface file (e.g. `lh.white`). |
| `-i <N> <img1> ... <imgN>` | int + N strings | 1 image | Number of input images `N`, followed by exactly `N` image file paths. The images are sampled along surface normals to build the intensity profile vectors. |
| `-c <numClusters>` | integer | 10 | Number of k-means clusters. |
| `-d <deep>` | integer | 10 | Half-depth of the sampling window along the surface normal. For each vertex, the profile is sampled at positions from `-deep` to `+deep` steps (total `2*deep+1` sample points per image). Profile vector length = `(2*deep+1) * N`. |
| `-o <outputImage>` | string | `""` | Output image path for cluster assignment map. |
| `-b <outputSurface>` | string | `""` | Output surface file with cluster labels embedded. |
| `-a <annotation>` | string | `""` | Output annotation file path (FreeSurfer `.annot` format). |
| `--help` / `-h` | flag | — | Print usage and exit. |

> [!gotcha] `-d deep` is a half-depth, not total depth
> The profile spans from `-deep` to `+deep` (inclusive), giving `2*deep+1` sample points per image. With the default `deep=10`, each per-image profile has 21 samples. The total feature vector length is `(2*deep+1) * N_images`.

## Configuration Interactions

- `-i N img1 ... imgN` — the integer `N` must immediately precede the `N` image filenames on the command line. The GetPot parser reads exactly `N` successive filenames using `cl.next("")` in a loop.
- `-c` and `-d` jointly determine the dimensionality and coarseness of the clustering. Higher `-d` with fixed `-c` may lead to overfitting with limited data.
- All three output flags (`-o`, `-b`, `-a`) are optional; any combination can be specified.

## Typical Use Cases

```bash
# Cluster based on T1 and T2 profiles into 5 types
mris_profileClustering \
  -s lh.white \
  -i 2 T1.mgz T2.mgz \
  -c 5 -d 15 \
  -o lh.profile_clusters.mgz \
  -a lh.profile_clusters.annot \
  -b lh.clustered
```

## Pipeline Context

Not part of `recon-all`. Research tool for cortical architecture studies. Requires that the subject's surfaces and intensity volumes are already available (i.e., after `recon-all` and potentially after `mris_place_surface` with T2).

## Gotchas and Caveats

> [!gotcha] ITK/VTK dependency
> Requires ITK and VTK at build time. The binary may not be available in all FreeSurfer distributions.

> [!gotcha] VTK rendering dependencies
> The code includes VTK rendering pipeline components (`vtkRenderer`, `vtkRenderWindow`). This may require a display or virtual framebuffer on headless systems.

> [!gotcha] Depth parameter interpretation
> The exact meaning of the `-d deep` parameter (number of steps, total mm, or fraction of thickness) was not determined from the first 100 lines of source. The default is 10.

## Related Tools

- [[mris_multimodal]] — multimodal surface refinement that also samples along normals
- [[surface-format]] — FreeSurfer annotation format

## Confidence and Gaps

**High confidence.** All flags verified from the complete GetPot argument parsing in `main()`. The `-d deep` half-depth semantics confirmed from the loop `for(unsigned int d=-deep; d<=deep; d++)` and the profile vector length formula `vectorLength = (deep*2+1)*imageNumber`. Flag defaults (10 for both `-c` and `-d`, 1 for `-i`) confirmed from `cl.follow()` calls.
