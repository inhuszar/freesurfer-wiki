---
title: "mris_thickness_diff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness_diff/mris_thickness_diff.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_thickness]]"
  - "[[mris_surface_stats]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - cortical-thickness
  - longitudinal
  - difference
  - surface
  - morphometry
---

# mris_thickness_diff

## Summary

`mris_thickness_diff` computes the vertex-wise difference between two surface scalar maps (typically thickness maps) on two different surfaces, without requiring atlas registration. It finds the closest vertex on surface 2 for each vertex on surface 1, then computes the difference of the scalar values at those corresponding vertices. This avoids artifacts from spherical registration when comparing thickness maps between surfaces. Attributed to Xiao Han.

## Source Information

- **Language:** C++
- **Source file:** `mris_thickness_diff/mris_thickness_diff.cpp`
- **Key library:** `mrishash` — spatial hash for efficient nearest-neighbor lookup
- **Key technique:** Nearest-neighbor correspondence without atlas registration

## Purpose and Context

Standard thickness difference analysis maps both subjects' thickness to the atlas (fsaverage) sphere, then subtracts. This introduces a source of noise from the registration (sphere morphing). `mris_thickness_diff` avoids atlas registration entirely by finding the geometrically nearest vertex on surface 2 for each vertex on surface 1 (using a 3D spatial hash table), then computing the thickness difference at those matched vertex pairs. This is particularly useful for within-subject longitudinal comparisons where the two surfaces are in close spatial proximity.

The print_help() text documents the semantics as "Result = data2 - data1 (in the sense of closest vertex)".

## Inputs

Positional arguments: `surface1 data1 surface2 data2`

| Positional | Description | Format |
|-----------|-------------|--------|
| `surface1` | Reference surface (e.g., baseline `lh.white`). | FreeSurfer binary surface |
| `data1` | Scalar map on surface1 (e.g., baseline `lh.thickness`). | `.mgh`, `.mgz`, curvature (`curv`), or paint (`w`) |
| `surface2` | Target surface (e.g., follow-up `lh.white`). | FreeSurfer binary surface |
| `data2` | Scalar map on surface2 (e.g., follow-up `lh.thickness`). | `.mgh`, `.mgz`, curvature (`curv`), or paint (`w`) |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `-out <fname>` | Per-vertex difference map: data2(nearest) − data1. | `.mgh`, `.mgz`, curvature, or paint |
| `-out_resampled <fname>` | Optional: data2 resampled (nearest-neighbour) to surface1's vertex grid. | `.mgh`, `.mgz` |
| `-map_out <fname>` | Optional: volumetric map of thickness differences (requires `-map_like`). | MGZ volume |

## Mathematical Foundations

For each vertex $v$ on surface 1 at position $\mathbf{p}_{v,1}$, find the nearest vertex $w^*$ on surface 2:

$$
w^* = \arg\min_{w \in \text{surface2}} \|\mathbf{p}_{v,1} - \mathbf{p}_{w,2}\|_2
$$

Compute the signed difference:

$$
\Delta_v = f_2(w^*) - f_1(v)
$$

where $f_1$ and $f_2$ are the scalar maps on surface 1 and 2 respectively.

If `-abs` is set, the absolute value $|\Delta_v|$ statistics are reported. If `-percentage` is set, relative differences $\Delta_v / f_1(v)$ are computed. If `-distance` is set, the 3D Euclidean distance between matched vertices is written instead of the scalar difference.

The nearest-neighbor search uses `MRIS_HASH_TABLE` for efficient spatial lookup.

## Configuration Options

### Complete Flag Reference

> [!note] Single-dash flag format
> `mris_thickness_diff` uses a legacy single-dash option parser (`get_option`). All flags take a single leading dash (e.g., `-out`, `-src`, `-dst`). Double-dash variants (e.g., `--src`) are NOT accepted.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-out <fname>`<br>`-out_file <fname>`<br>`-out_name <fname>` | string | — | Output file for the difference map. All three spellings are accepted as aliases. |
| `-out_resampled <fname>` | string | — | Output file for data2 resampled (nearest-neighbour) onto surface1's vertex grid. |
| `-src_type <type>` | string | — | Format type of the input data files: `curv` (FreeSurfer curvature), `paint` or `w` (paint/w files). |
| `-trg_type <type>` | string | — | Format type for the output file: `curv`, `paint`, or `w`. |
| `-nsmooth <n>` | integer | 0 | Number of surface smoothing iterations applied to input data before computing the difference. |
| `-abs` | boolean | — | Report statistics on absolute-valued differences (does not modify the output values, only affects the printed mean/std). |
| `-percentage` | boolean | — | Compute percentage thickness-difference: $\Delta / f_1(v)$. |
| `-distance` | boolean | — | Compute 3D Euclidean distance between nearest-neighbour vertex pairs instead of scalar difference. |
| `-register` | boolean | — | Perform ICP (iterative closest point) rigid registration of surface2 onto surface1 before nearest-neighbour matching. |
| `-xform <lta>` | string | — | Apply the specified LTA transform to align surface1 to surface2. |
| `-invert` | boolean | — | Apply the LTA transform specified by `-xform` in the inverse direction. |
| `-src <vol>` | string | — | Source volume for the LTA transform (used with `-xform`). |
| `-dst <vol>` | string | — | Target volume for the LTA transform (used with `-xform`). |
| `-annot <annotfile> <annotname>` | string × 2 | — | Limit comparison to vertices with annotation label `<annotname>` in the annotation file `<annotfile>`. Consumes 2 additional arguments. |
| `-annotation <annotfile> <annotname>` | string × 2 | — | Alias for `-annot`. |
| `-label <labelfile>` | string | — | Limit comparison to vertices inside the specified label file. |
| `-L <logfile>`<br>`-Log <logfile>` | string | — | Log file for summary statistics (mean, abs_mean, std). Both spellings accepted. |
| `-S <name>`<br>`-subj <name>` | string | — | Subject name recorded in the log file. Both spellings accepted. |
| `-map_like <vol>` | string | — | Reference volume file that defines the geometry of the output map (`-map_out`). |
| `-map_out <fname>` | string | — | Output volumetric map file. Requires `-map_like`. |
| `-debug <vno>` | integer | — | Enable verbose diagnostic output for vertex index `<vno>`. |
| `--help` | boolean | — | Print extended help and exit. |
| `--version` | boolean | — | Print version string and exit. |

## Configuration Interactions

- `-out` / `-out_file` / `-out_name` are exact aliases; only one need be specified.
- `-annot` and `-annotation` are exact aliases; both consume 2 additional arguments (annotation file and label name).
- `-L` and `-Log` are exact aliases for the log file.
- `-S` and `-subj` are exact aliases for the subject name.
- `-xform` requires `-src` and `-dst` volumes to establish the voxel-to-surface coordinate mapping for the transform.
- `-invert` only has effect when `-xform` is also specified.
- `-map_like` and `-map_out` must be specified together; one without the other does nothing.
- `-abs` and `-percentage` are independent: `-abs` affects the reported standard deviation statistics, while `-percentage` changes the computed output values.
- `-register` and `-xform` are alternative alignment strategies: `-register` uses ICP on the surfaces directly; `-xform` uses a precomputed linear transform.

## Typical Use Cases

### Compute longitudinal thickness difference (no atlas registration)

```bash
mris_thickness_diff \
  -out lh.thickness_change.mgh \
  -trg_type curv \
  -register \
  $SUBJECTS_DIR/sub01_tp1/surf/lh.white \
  $SUBJECTS_DIR/sub01_tp1/surf/lh.thickness \
  $SUBJECTS_DIR/sub01_tp2/surf/lh.white \
  $SUBJECTS_DIR/sub01_tp2/surf/lh.thickness
```

### Log summary statistics with subject ID

```bash
mris_thickness_diff \
  -out lh.thickness_diff.mgh \
  -L /tmp/thickness_stats.txt \
  -S subject01 \
  lh.white_tp1 lh.thickness_tp1 \
  lh.white_tp2 lh.thickness_tp2
```

### Restrict comparison to a label

```bash
mris_thickness_diff \
  -out lh.diff_roi.mgh \
  -label $SUBJECTS_DIR/sub01/label/lh.frontal.label \
  lh.white_tp1 lh.thickness_tp1 \
  lh.white_tp2 lh.thickness_tp2
```

## Pipeline Context

`mris_thickness_diff` is not part of `recon-all`. It is used in longitudinal neuroimaging workflows:
1. Run [[mris_thickness]] at each time point (or obtain thickness from `recon-all`).
2. Run `mris_thickness_diff` to compute per-vertex changes.
3. Use further surface analysis tools for group-level statistics.

## Gotchas and Caveats

> [!gotcha] Semantics: result = data2 - data1 (not data1 - data2)
> The difference is computed as $f_2(w^*) - f_1(v)$, i.e., follow-up minus baseline. A positive value means the scalar (e.g., thickness) increased between time points. This is the opposite of the positional argument order.

> [!gotcha] Surfaces must be in the same coordinate space
> The nearest-neighbor search uses 3D Euclidean distance. If the two surfaces are in different coordinate spaces (different subjects or different scans without co-registration), the correspondences will be meaningless. Use `-register` or `-xform` to handle coordinate misalignments.

> [!gotcha] `-annot` takes 2 arguments
> The `-annot` flag consumes both an annotation file path and a label name as separate arguments. The label name is a string annotation value (e.g., `"caudalanteriorcingulate"`) that must match the annotation's color table.

> [!gotcha] `-log` does not exist — use `-L` or `-Log`
> The flag for the log file is `-L` or `-Log`. There is no `-log` flag.

> [!gotcha] `-subject` does not exist — use `-S` or `-subj`
> The flag for the subject name is `-S` or `-subj`. There is no `-subject` flag.

> [!gotcha] `-compute_distance` does not exist — use `-distance`
> The flag to compute surface-to-surface 3D distance is `-distance`. There is no `-compute_distance` flag.

## Related Tools

- [[mris_thickness]] — computes the thickness maps that are input to this tool
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

Confidence is **high**. The complete `get_option()` function (lines 808–961 of `mris_thickness_diff.cpp`) and `print_usage()` / `print_help()` ([lines 676–791](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_thickness_diff/mris_thickness_diff.cpp#L676-L791)) were read from source. All flags are confirmed from the `stricmp`-based parser.
