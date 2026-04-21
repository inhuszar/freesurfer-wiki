---
title: "mri_topologycorrection"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_topologycorrection/mri_topologycorrection.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_pretess]]"
  - "[[mri_tessellate]]"
  - "[[mri_segment]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Details of the topology correction algorithm (voxel surgery, Morse theory steps) not fully traced."
  - "Relationship to mris_topology_fixer (surface-based correction) not documented."
tags:
  - topology
  - segmentation
  - surface-reconstruction
  - autorecon2
---

# mri_topologycorrection

## Summary

`mri_topologycorrection` corrects topological defects in volumetric binary segmentations. It modifies voxel labels in a segmentation volume to ensure that the resulting surface tessellation from the labeled region will have correct spherical topology (Euler number = 2, genus 0). Uses the approach of Ségonne et al. (2004) for topology correction combined with intensity-based label refinement.

## Source Information

- **Language:** C++
- **Source file:** `mri_topologycorrection/mri_topologycorrection.cpp`
- **Original author:** F. Ségonne (MGH)
- **Key reference:** Ségonne F et al. "A Hybrid Approach to the Skull-Stripping Problem in MRI." NeuroImage, 22:1160–1075, 2004.
- **Key libraries:** `mri_topology.h`, `gca`, `mri_tess`, `mrishash`, `icosahedron`

## Purpose and Context

When a voxel-based segmentation is converted to a surface via tessellation (e.g., `mri_tessellate`), topological defects in the segmentation (handles, bridges, disconnected components) produce a surface that is not genus-0 (sphere-like). FreeSurfer's cortical surface pipeline requires surfaces with genus-0 topology for spherical parameterization (`mris_sphere`), registration (`mris_register`), and other operations.

`mri_topologycorrection` operates in voxel space before tessellation to:
1. Identify topologically problematic voxels using a graph-based analysis.
2. Relabel those voxels based on T1 intensities and GCA (Gaussian Classifier Atlas) probabilities.
3. Produce a corrected segmentation that tessellates to a genus-0 surface.

## Inputs

Positional arguments (in order from `main()`):

| Position | Description |
|----------|-------------|
| 1 | `in_orig_fname` — T1/intensity volume for label refinement |
| 2 | `in_seg_fname` — binary or labeled segmentation volume to correct |
| 3 | `out_fname` — output directory or volume path for corrected result |

**Usage:** `mri_topologycorrection [options] <input_orig_vol> <input_seg_vol> <output>`

## Outputs

| Output | Description |
|--------|-------------|
| Corrected segmentation | Volume with topological defects repaired, written to `out_fname` |
| Optional initial surface | Written to file specified by `-initial_surf` if provided |
| Optional final surface | Written to file specified by `-final_surf` if provided |
| Optional debug maps | Written to folder specified by `-maps` if provided |

## Mathematical Foundations

The topology correction procedure:

1. **Topology analysis:** For each voxel in the segmentation, evaluate whether its removal or addition would create or resolve topological defects using discrete Morse theory / Euler characteristic analysis.
2. **Label optimization:** For identified problematic voxels, use T1 intensity histograms per label and GCA posterior probabilities to determine the most likely correct label.
3. **Graph surgery:** Apply the minimum-cost edit to restore genus-0 topology.

> [!math] Euler characteristic constraint
> For a triangulated surface to be genus-0 (sphere), it must satisfy:
> $$\chi = V - E + F = 2$$
> The correction algorithm identifies the minimum set of voxel label changes to make this true after tessellation.

## Configuration Options

All flags use `strcmp` (case-sensitive, unlike most FreeSurfer tools). The full `get_option()` has been read.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-nothing` | — | — | No-op mode: tool runs initialisation but does not apply any corrections |
| `-verbose` | — | off | Enable verbose output (`parms.verbose_mode=1`) |
| `-final_surf <file>` | path | none | Write the final corrected surface to this file (`parms.final_surface_file`) |
| `-initial_surf <file>` | path | none | Write the initial (pre-correction) surface to this file (`parms.initial_surface_file`) |
| `-foreground` | — | off | Prioritise corrections on the foreground (sets `parms.background_priority=0`); despite the flag name, the message says "Making corrections on the background first" — wording inverted in code |
| `-background` | — | off | Prioritise corrections on the background (sets `parms.background_priority=1`); message says "Making corrections on the foreground first" — wording inverted in code |
| `-only` | — | off | Apply corrections only to the foreground or background (whichever is selected by `-foreground`/`-background`), not both; sets `parms.only=1` |
| `-tess <n>` | int | -1 (→ connectivity) | Tessellation mode; -1 means "use the connectivity value"; sets `parms.tesselation_mode` |
| `-priors <transform> <gca>` | 2 paths | none | Use GCA atlas information: load transform and GCA to compute per-voxel prior probabilities; sets `parms.using_gca_maps=1`, `parms.transform_fname`, `parms.gca_fname` |
| `-priormap <file>` | path | none | Load a pre-computed prior map from file instead of computing from GCA (`parms.prior_map_file`) |
| `-VOXEL` | — | default | Cost function = number of voxels changed; sets `parms.mode=VOXEL_MODE` |
| `-MAP` | — | off | Cost function = MAP estimate; sets `parms.mode=MAP_MODE` |
| `-PROB` | — | off | Cost function = sum of voxel probabilities; sets `parms.mode=PROB_MODE` |
| `-PROB_MAP` | — | off | Cost function = MAP estimate from probabilities; sets `parms.mode=PROB_MAP_MODE` |
| `-guess` | — | off | Guess the initial segmentation from atlas; sets `parms.guess_initial_segmentation=1` |
| `-maps <folder>` | path | none | Write intermediate probability map files into the named folder (`parms.debugging_map_folder`) |
| `-connectivity <n>` | int | 1 | Voxel connectivity model for topology analysis; 1 = 6-connected face-neighbours (default); sets `parms.connectivity` |
| `-label <n>` / `-L <n>` | int | none | Add label `n` to the list of labels for which topology correction is applied; can be specified multiple times; stored in `parms.labels[]` |
| `-beta <f>` | float [0,1] | 1.0 | Mixing weight between voxel-count cost and GCA probability cost; clamped to [0,1]; sets `parms.beta` |
| `-alpha <f>` | float [0,1] | 1.0 | Second mixing parameter; clamped to [0,1]; sets `parms.alpha` |

> [!gotcha] Flag names are case-sensitive
> Unlike most FreeSurfer tools, `get_option()` uses `strcmp` (not `stricmp`). Flag names must be typed exactly as listed. `-VOXEL`, `-MAP`, `-PROB`, `-PROB_MAP` must be uppercase; `-verbose`, `-label`, etc. must be lowercase.

> [!gotcha] `-foreground` and `-background` flag descriptions are inverted in the source
> The source code prints "Making corrections on the background first" when `-foreground` is specified, and "Making corrections on the foreground first" when `-background` is specified. This appears to be an inversion of the display messages relative to the actual effect on `parms.background_priority`.

## Configuration Interactions

- `-priors` enables GCA-based cost computation; `-alpha` and `-beta` only have an effect when `-priors` is also specified (when not using GCA maps, both are reset to 1.0 in `main()`).
- `-VOXEL`, `-MAP`, `-PROB`, `-PROB_MAP` are mutually exclusive cost function selectors; the last one specified wins.
- `-connectivity` determines both the neighbourhood model and (when `-tess` is not explicitly specified) the tessellation mode (`tesselation_mode = connectivity` when `tesselation_mode == -1`).
- `-foreground` and `-background` control which component is corrected first; `-only` restricts correction to just that component.
- `-label` can be specified multiple times; up to `MAX_LABELS` labels are supported (array-bounded).

## Pipeline Context

Called during **autorecon2** of `recon-all`, between the initial white matter segmentation and surface tessellation:

```
recon-all autorecon2:
  mri_pretess → binary WM volume
  mri_tessellate → initial surface (may have topology defects)
  mri_topologycorrection → correct topology in voxel space
  OR:
  mris_topology_fixer → correct topology in surface space
```

FreeSurfer uses both volume-based (`mri_topologycorrection`) and surface-based (`mris_topology_fixer`) approaches at different stages.

## Gotchas and Caveats

> [!gotcha] This is a volume-space tool
> `mri_topologycorrection` operates on the binary segmentation volume, not on the surface directly. For surface-based topology fixing, FreeSurfer also has `mris_topology_fixer`.

> [!gotcha] GCA-based refinement may be aggressive
> When a GCA atlas is used, the label refinement can change voxel values based on probabilistic priors, potentially altering anatomy beyond just topology fixes.

## Related Tools

- [[mri_pretess]] — prepares segmentation for tessellation
- [[mri_tessellate]] — creates surface from corrected segmentation
- [[mri_segment]] — initial WM segmentation

## Confidence and Gaps

**High confidence (flags):** All flags confirmed from complete reading of `get_option()` in source. Defaults from `MRI_TOPOLOGY_PARMSdefault()` verified from source. Case-sensitivity of flag matching and the inverted `-foreground`/`-background` message wording confirmed from source.

**Medium confidence (algorithm):** The topology correction algorithm internals were not fully traced.
