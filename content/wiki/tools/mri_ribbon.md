---
title: "mri_ribbon"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ribbon/mri_ribbon.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mri_pretess]]"
  - "[[mri_tessellate]]"
  - "[[surface-format]]"
  - "[[mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact recon-all call syntax and output filenames"
tags:
  - ribbon
  - cortex
  - surface
  - mask
  - autorecon3
---

# mri_ribbon

## Summary

`mri_ribbon` creates a cortical ribbon mask by filling the volume between two surfaces (an inner surface and an outer surface). For each voxel in the input volume, it determines whether the voxel lies between the inner and outer surfaces (i.e., in the cortical ribbon) and marks it accordingly in the output. The classic use case is computing `ribbon.mgz` from `lh.white` + `lh.pial` and `rh.white` + `rh.pial`.

## Source Information

- **Language:** C++
- **Source file:** `mri_ribbon/mri_ribbon.cpp`
- **Original author:** Andre van der Kouwe
- **Key includes:** `mrisurf.h`, `mrishash.h`, `label.h`

## Purpose and Context

The cortical ribbon is the thin layer of grey matter between the white matter surface (inner boundary) and the pial surface (outer boundary). `mri_ribbon` creates a volumetric representation of this ribbon, which is used in:
- Computing cortical thickness (distance between surfaces)
- Creating cortical grey matter masks
- Surface-to-volume mapping and ROI definition

The tool takes an inner surface, outer surface, an input reference volume (for geometry/voxel spacing), and writes the ribbon as a volume with the input geometry. An optional label file can be used to crop the ribbon to a specified region.

## Inputs

| Input | Description |
|-------|-------------|
| `inner_surface_fname` | Inner boundary surface (e.g., `lh.white`) |
| `outer_surface_fname` | Outer boundary surface (e.g., `lh.pial`) |
| `input_volume_pref` | Input volume prefix (for geometry reference) |
| Optional: `-l <label>` | Label file to crop ribbon to a specific region |

## Outputs

- **Ribbon volume:** A volume with the same geometry as the input, where ribbon voxels are marked (nonzero). The output uses the `output_volume_pref` as a filename prefix.

## Mathematical Foundations

For each voxel $v$ in the volume:
1. Map the voxel center to the surface coordinate system.
2. Find the closest point on the inner surface and outer surface.
3. Determine if the voxel is inside (between inner and outer surfaces):
   - If the voxel is inside the inner surface: not in ribbon (white matter)
   - If the voxel is outside the outer surface: not in ribbon (CSF/background)
   - Otherwise: in the ribbon (cortical grey matter)

The signed distance to each surface is computed using the `MRISHash` structure for efficient surface proximity queries.

The optional `-l` flag uses `MRIcropVolumeToLabel()` to restrict the ribbon to the region enclosed by the label before the surface-based determination.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-l` | `<label_fname>` | — | Crop ribbon to the region enclosed by this label file |

**Positional arguments (required):**
```
mri_ribbon [-l label.label] inner_surface outer_surface input_vol_pref output_vol_pref
```

## Configuration Interactions

- `-l` is the only option. It uses `LabelRead()` and `MRIcropVolumeToLabel()` to restrict processing to a subset of the volume. Without `-l`, the full volume is processed.

## Typical Use Cases

```bash
# Create ribbon from lh white and pial surfaces
mri_ribbon lh.white lh.pial rawavg lh_ribbon

# Create ribbon for right hemisphere
mri_ribbon rh.white rh.pial rawavg rh_ribbon

# Create cropped ribbon using a label
mri_ribbon -l ROI.label lh.white lh.pial rawavg lh_ribbon_ROI
```

In [[wiki/pipelines/recon-all|recon-all]], the typical call creates the combined `ribbon.mgz` for both hemispheres.

## Pipeline Context

`mri_ribbon` is called during [[wiki/pipelines/recon-all|recon-all]] `autorecon3`, after the pial surface has been reconstructed. The output `ribbon.mgz` is used by subsequent tools including `mris_anatomical_stats` for cortical parcellation statistics and surface-to-volume mapping.

The pipeline creates the ribbon using both hemispheres' white and pial surfaces to produce the combined `mri/ribbon.mgz`.

## Gotchas and Caveats

> [!gotcha] Older tool — recon-all uses a different ribbon creation mechanism
> The `recon-all` pipeline may use `mri_surf2volseg` or equivalent for ribbon creation in newer FreeSurfer versions, not necessarily this older `mri_ribbon` binary. The exact mechanism used in FreeSurfer 8.2.0's `recon-all` should be verified from the script.

> [!gotcha] Input/output are prefixes, not full filenames
> The `input_volume_pref` and `output_volume_pref` arguments are used as filename prefixes. The tool may append suffixes (e.g., frame number or hemisphere) to construct actual file paths.

> [!gotcha] Surfaces must be in the same space as the volume
> The tool does not perform any coordinate transformation between the surface and the reference volume. Both must be in the same coordinate system (typically tkRAS). See [[coordinate-systems]].

## Related Tools

- [[mri_pretess]] — Pre-tessellation volume preparation
- [[mri_tessellate]] — Surface tessellation from segmentation
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**High confidence:** Source language, file location, input/output argument structure, `-l` flag, algorithm principle (inside/outside surface test).

**Medium confidence:** Whether this specific binary is what `recon-all` calls in FS 8.2.0 (modern versions may use alternatives).

> [!gap] recon-all integration
> The exact `recon-all` call in FS 8.2.0 that produces `ribbon.mgz` should be verified from the `recon-all` script. It may call `mri_surf2volseg` or a similar tool instead.

> [!note] Audit noise: `-l` false positive
> An automated audit may flag `-l` as C3 invalid. The flag IS present in source (`case 'L':` at line 67). The audit tool's switch-statement extractor matches `switch (*option)` but this tool uses the non-standard form `switch (toupper(argv[1][1]))`, which the extractor does not recognise.
