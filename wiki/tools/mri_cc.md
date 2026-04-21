---
title: "mri_cc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_cc/mri_cc.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_ca_label]]"
  - "[[mri_segment]]"
  - "[[recon-all]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - corpus-callosum
  - segmentation
  - white-matter
  - midplane
---

# mri_cc

## Summary

`mri_cc` adds corpus callosum (CC) labels to an existing aseg segmentation, subdividing the callosum into five parts along its anterior-posterior axis (defined by the primary eigenvector of the CC voxel distribution). The output volume (`aseg_with_cc.mgz` by default) is an updated aseg with five CC labels replacing the generic white matter labels in the midplane region.

## Source Information

- **Language:** C++
- **Source file:** `mri_cc/mri_cc.cpp`
- **Original authors:** Bruce Fischl and Peng Yu

## Purpose and Context

The corpus callosum is a large white matter commissure connecting the two cerebral hemispheres. In the [[recon-all]] pipeline, the initial [[mri_ca_label]] step produces an aseg without fine CC subdivision. `mri_cc` post-processes the aseg by identifying the midsagittal CC voxels and dividing them into five anatomically-defined regions:

| Label | CC Region |
|-------|-----------|
| CC_Posterior | Splenium (most posterior) |
| CC_Mid_Posterior | |
| CC_Central | Body |
| CC_Mid_Anterior | |
| CC_Anterior | Genu (most anterior) |

The division is based on the cumulative volume fraction along the primary eigendirection (mostly anterior-posterior).

## Inputs

Positional argument: `<subject_name>`

The tool reads from `$SUBJECTS_DIR/<subject>/mri/`:
- `aseg.mgz` (configurable via `-aseg`)
- `norm.mgz` (configurable via `-norm`)
- `transforms/talairach.lta` (configurable via `-lta`)

`SUBJECTS_DIR` must be set. The `-sdir` flag overrides it.

## Outputs

- `$SUBJECTS_DIR/<subject>/mri/<output_fname>` — default: `aseg_with_cc.mgz`
  - An updated aseg where CC voxels in the midplane are assigned the five CC labels.

## Mathematical Foundations

**CC identification:**

If using the aseg (default `-use_aseg 1`), the algorithm calls `find_cc_with_aseg()` which:
1. Identifies midplane WM voxels in the aseg that are adjacent to both left and right WM regions.
2. Applies iterative slice-based refinement to find the best midsagittal plane orientation.
3. Removes the fornix (which lies nearby) using `remove_fornix_new()`.

The CC center $(x_c, y_c, z_c)$ in Talairach space is anchored at approximately $(0, 0, 27)$ mm in the `cc_tal_*` variables.

**Five-way subdivision:**

After finding all CC voxels, principal component analysis (PCA) of the 3D voxel distribution gives eigenvectors $\mathbf{e}_1, \mathbf{e}_2, \mathbf{e}_3$. The primary eigenvector $\mathbf{e}_1$ is projected onto each CC voxel to compute its position along the AP axis. Voxels are sorted and divided into five equal-volume bins:

$$\text{label}(v) = \text{CC}_{\lfloor 5 \cdot r(v) \rfloor}$$

where $r(v)$ is the fractional rank of voxel $v$ along the primary eigendirection.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory |
| `-aseg <file>` | string | `aseg.mgz` | Input aseg filename (relative to mri/) |
| `-norm <file>` | string | `norm.mgz` | Norm volume filename (relative to mri/) |
| `-lta <file>` | string | (empty, auto-find) | LTA transform filename (relative to mri/) |
| `-o <file>` | string | `aseg_with_cc.mgz` | Output filename |
| `-dxi <N>` | int | 2 | Half-thickness of midplane strip |
| `-force` | flag | off | Force re-run even if CC labels already present in aseg |
| `-write_lta` | flag | off | Write computed LTA transform to disk |
| `-write_cc` | flag | off | Write CC-only binary volume |
| `-lh` | flag | off | Process left hemisphere only |
| `-rh` | flag | off | Process right hemisphere only |
| `-use_aseg <0/1>` | int | 1 | Use aseg-based approach (1) vs WM volume approach (0) |
| `-norm_thresh <N>` | int | 40 | Intensity threshold for norm volume during CC fitting |
| `-max_cc_rot <deg>` | float | 7 | Maximum allowed CC rotation from midplane (degrees) |
| `-ncc <N>` | int | 5 | Number of CC subdivisions (default: 5) |
| `-cc_tal_x/y/z <val>` | float | 0,0,27 | Initial CC center in Talairach space |
| `-fornix` | flag | off | Include fornix in CC segmentation (experimental) |
| `-skip` | flag | off | Skip if CC already present |

## Configuration Interactions

- If the aseg already contains CC labels (detected by checking for `CC_Central` voxels), the tool exits with error 77 unless `-force` is specified.
- `-lh` and `-rh` flags skip CC segmentation and just copy the aseg without changes (useful for partial-hemisphere processing).
- `-use_aseg 0` switches to a legacy WM-volume-based approach; this requires a `mri/wm` volume and is not recommended for standard usage.

> [!gotcha] Error code 77 = CC already present
> Recon-all scripts treat exit code 77 as a soft skip (not an error). This means re-running `mri_cc` on a subject that already has CC labels will silently succeed without modifying the aseg, unless `-force` is used.

## Typical Use Cases

**Add CC labels to aseg (autorecon2 standard call):**
```bash
mri_cc bert
```

**Force re-segmentation of CC:**
```bash
mri_cc -force -o aseg_with_cc.mgz bert
```

**Custom number of CC divisions:**
```bash
mri_cc -ncc 7 -o aseg_with_cc_7.mgz bert
```

## Pipeline Context

In [[recon-all]], `mri_cc` runs in autorecon2 after [[mri_ca_label]] produces the initial `aseg.mgz`. The output `aseg_with_cc.mgz` feeds into subsequent WM editing and surface generation steps. The pipeline call is approximately:

```bash
mri_cc -norm norm.mgz -aseg aseg.mgz -o aseg_with_cc.mgz subject
```

## Gotchas and Caveats

> [!gotcha] CC already present guard
> If the input aseg already contains CC subdivision labels, the tool exits with error code 77. This is intended behavior (to prevent double-processing in recon-all), but may cause confusion if running manually.

> [!gotcha] Talairach transform required
> The tool requires a valid Talairach transform (LTA) to initialize the CC location in atlas space. If the transform is corrupted or missing, CC detection will fail or produce incorrect results.

> [!gotcha] Fornix proximity
> The fornix lies close to the splenium of the CC and can be erroneously included. `remove_fornix_new()` attempts to remove it, but this correction may be imperfect in subjects with unusual anatomy.

## Related Tools

- [[mri_ca_label]] — produces the input aseg.mgz that this tool processes
- [[mri_segment]] — WM segmentation that precedes ca_label
- [[recon-all]] — calls mri_cc in autorecon2

## Confidence and Gaps

Source code fully read. Confidence is high.

> [!gap] Fornix removal algorithm
> The `remove_fornix_new()` function is defined in the same source file but its algorithm is not fully analyzed here.
