---
title: "dmri_projectEndPoints"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_projectEndPoints.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_groupByEndpoints]]"
  - "[[dmri_extractSurfaceMeasurements]]"
  - "[[dmri_ac.sh]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact overlay format written not confirmed"
tags:
  - diffusion
  - tractography
  - endpoints
  - surface-projection
  - anatomicuts
---

# dmri_projectEndPoints

## Summary

`dmri_projectEndPoints` marks the endpoints of streamlines in a tractography file with a distinct value (hardcoded to 1) and saves the result as a new overlay file. The tool changes per-point data values at the first and last points of each streamline, producing an endpoint overlay that can be used for visualization or downstream endpoint-based analysis.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_projectEndPoints.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_projectEndPoints`
- **Author:** Alexander Zsikla, Viviana Siless (MGH), Summer 2019
- **Key libraries:** ITK, VTK, FreeSurfer surface library (`mrisurf.h`), `vtkKdTreePointLocator`

## Purpose and Context

In tractography analysis, the endpoints of streamlines carry information about which cortical or subcortical regions the tract connects. `dmri_projectEndPoints` creates an overlay file that marks endpoint locations, which can then be overlaid on surfaces or used to identify endpoint parcellations. The tool uses surface projection (via a VTK KD-tree nearest-neighbor search on the pial surface) to map streamline endpoints to the cortical surface.

The `ENDPOINT_VALUE = 1` constant is hardcoded — all endpoints receive value 1 regardless of any other per-point data.

## Inputs

The tool loads:
- A single streamline file (`.trk`) via `-i`
- Pial surface meshes for both hemispheres (`-sl`, `-sr`)
- A reference image for coordinate space handling (`-ri`)

Outputs:
- Two overlay files (`-ol` for LH, `-or` for RH) with endpoint points marked as value 1 and all others as value 0.

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Endpoint overlay | Streamline data with endpoint points set to value 1, all others to 0 | Overlay file (format TBD) |

## Mathematical Foundations

**Endpoint identification:** The first point (index 0) and last point (index $N-1$) of each streamline are flagged. All intermediate points receive value 0; endpoint points receive value `ENDPOINT_VALUE = 1`.

**Surface projection:** Endpoint 3D coordinates are projected to the nearest vertex on the pial surface using a VTK KD-tree:
$$v^* = \arg\min_{v \in \text{surface}} \|\mathbf{p}_{\text{endpoint}} - \mathbf{v}\|_2$$

The `FSToVTK` helper function converts FreeSurfer surface format to VTK polydata for the KD-tree construction.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i <file>` | string | required | Input streamline file (`.trk`). |
| `-sl <file>` | string | required | LH surface file (typically pial surface). Used for KD-tree nearest-neighbour projection of LH endpoints. |
| `-sr <file>` | string | required | RH surface file (typically pial surface). Used for KD-tree nearest-neighbour projection of RH endpoints. |
| `-ol <file>` | string | required | LH output overlay file path. Endpoint values (1) and non-endpoint values (0) are written here. |
| `-or <file>` | string | required | RH output overlay file path. |
| `-ri <file>` | string | required | Reference image for coordinate space handling (ITK image, read to define voxel-to-RAS mapping). |
| `--help` / `-h` | flag | — | Print usage and exit (triggered when fewer than 8 arguments are provided). |

> [!gotcha] Minimum 8 arguments required
> The tool exits with usage if `gp.size() <= 8`, corresponding to the 6 required flag-value pairs plus the program name. Missing any required flag will trigger a usage error without indicating which flag is missing.

> [!gotcha] Hardcoded endpoint value
> The endpoint value is hardcoded as `const int ENDPOINT_VALUE = 1`. All streamline endpoints receive value 1; all other points receive value 0. This cannot be changed without recompiling.

## Typical Use Cases

```bash
# Project streamline endpoints onto bilateral pial surfaces
dmri_projectEndPoints \
  -i cluster_001.trk \
  -sl lh.pial \
  -sr rh.pial \
  -ol cluster_001_lh_endpoints.overlay \
  -or cluster_001_rh_endpoints.overlay \
  -ri reference.nii.gz
```

## Pipeline Context

`dmri_projectEndPoints` is a visualization and analysis utility in the AnatomiCuts pipeline. It is not called by `recon-all` or the main `dmri_ac.sh` pipeline functions.

## Gotchas and Caveats

> [!gotcha] Hardcoded endpoint value
> The endpoint value is hardcoded as `const int ENDPOINT_VALUE = 1` at the top of the source file. This cannot be changed without recompiling.

## Related Tools

- [[dmri_groupByEndpoints]] — groups streamlines by endpoint labels (different approach)
- [[dmri_extractSurfaceMeasurements]] — extracts surface measures at endpoints
- [[dmri_AnatomiCuts]] — clustering tool in the same family

## Confidence and Gaps

**High confidence.** All flags verified from the complete GetPot argument parsing in `main()`. The six required flags (`-i`, `-sl`, `-sr`, `-ol`, `-or`, `-ri`) are confirmed from source. The `ENDPOINT_VALUE=1` constant is confirmed hardcoded.

> [!gap] Output overlay format
> The format of the output overlay files (`-ol`, `-or`) has not been traced through the complete write path in the source.
