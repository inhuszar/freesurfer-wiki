---
title: "mri_fill"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fill/mri_fill.cpp"
  - "mri_fill/mri_fill.help.xml"
  - "mri_fill/myutil.cpp"
  - "mri_fill/subroutines.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_segment]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_pretess]]"
  - "[[mri_tessellate]]"
  - "[[mri_watershed]]"
  - "[[recon-all]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - white-matter
  - hemisphere-separation
  - topology
  - autorecon2
---

# mri_fill

## Summary

`mri_fill` takes the white matter (WM) segmentation volume and creates a filled WM volume where the two cerebral hemispheres are labeled with distinct values (left: `MRI_LEFT_HEMISPHERE = 255`, right: `MRI_RIGHT_HEMISPHERE = 127`). It uses Talairach coordinates to locate seed points in the corpus callosum and pons, then flood-fills each hemisphere from seed points. Topological corrections are also applied to ensure each hemisphere is a topologically closed, simply connected region. This is a critical `autorecon2` step that enables separate processing of left and right hemisphere surfaces. Original author: Bruce Fischl. Reference: Dale et al., NeuroImage 1999.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fill/mri_fill.cpp`
- **Help file:** `mri_fill/mri_fill.help.xml`
- **Key dependencies:** `mri.h`, `talairachex.h`, `connectcomp.h`, `mrisegment.h`, `ctrpoints.h`, `mrimorph.h`

## Purpose and Context

Before cortical surface reconstruction can proceed, the two cerebral hemispheres must be separated into distinct labeled regions in the WM volume. `mri_fill` achieves this by:

1. Finding seed points in the corpus callosum (CC) and pons to establish the midsagittal plane
2. Using these seeds to constrain hemisphere-specific flood-fills
3. Applying topological corrections to ensure the filled volumes are topologically equivalent to spheres (required by the subsequent tessellation step)

The output `filled.mgz` is the primary output of this stage.

## Inputs

Positional arguments (in order):
1. Input WM volume (`wm.asegedit.mgz`) — must be `MRI_UCHAR` type
2. Output filled volume path (`filled.mgz`)

The input WM volume should have been pre-processed by `mri_edit_wm_with_aseg`. Voxels above a WM threshold (typically 90) are considered WM.

`SUBJECTS_DIR` and the Talairach transform are used internally for seed point location.

## Outputs

- `filled.mgz`: Filled WM volume where left hemisphere = 255 (`MRI_LEFT_HEMISPHERE`), right hemisphere = 127 (`MRI_RIGHT_HEMISPHERE`), background = 0.

## Mathematical Foundations

### Hemisphere Separation

The algorithm locates anatomical seed points:

1. **Corpus Callosum (CC) seed**: Default Talairach coordinates $(0, 0, 27)$ mm. Used to find the midline plane separating hemispheres.
2. **Pons seed**: Default Talairach coordinates $(-2, -15, -17)$ mm. Used to cut the pons from the fill.

These Talairach coordinates are transformed to volume voxel coordinates via the subject's `talairach.xfm`:
$$
v_{\text{vox}} = M_{\text{tal}}^{-1} \cdot v_{\text{tal}}
$$

### Flood Fill

Starting from seed points in each hemisphere (LH: Talairach $(-29, -12, 28)$; RH: $(29, -12, 28)$), a 3D connected flood-fill assigns each voxel to its hemisphere. The CC and pons seeds define "disconnection" points that prevent the fill from crossing the midsagittal plane.

### Topological Correction

`mri_topofix()` is called to ensure the filled volumes are topologically correct. This involves:
- `mriRemoveEdgeConfiguration()`: removes diagonal edge configurations
- `mriRemoveCornerConfiguration()`: removes diagonal corner configurations
- `mriRemoveBackgroundCornerConfiguration()`: removes background corner issues

These corrections make each hemisphere simply-connected, a requirement for genus-0 surface tessellation.

## Configuration Options

All flags are case-insensitive (parsed with `stricmp`). Single-character fallbacks (`-T`, `-C`, `-P`, `-L`, `-A`, `-F`, `-D`) are processed via a `switch` block and are also case-insensitive via `toupper`.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--help` / `--usage` | — | — | Print help text and exit |
| `--version` | — | — | Print version string and exit |
| `-rval <n>` | int | 127 (`MRI_RIGHT_HEMISPHERE`) | Override fill value used for the right hemisphere voxels |
| `-lval <n>` | int | 255 (`MRI_LEFT_HEMISPHERE`) | Override fill value used for the left hemisphere voxels |
| `-lh <x> <y> <z>` | float×3 | automatic | Set LH flood-fill seed in Talairach coordinates (mm); sets `lh_seed_set=1` |
| `-rh <x> <y> <z>` | float×3 | automatic | Set RH flood-fill seed in Talairach coordinates (mm); sets `rh_seed_set=1` |
| `-lhv <x> <y> <z>` | int×3 | — | Set LH flood-fill seed in volume (voxel) coordinates; overrides Talairach conversion |
| `-rhv <x> <y> <z>` | int×3 | — | Set RH flood-fill seed in volume (voxel) coordinates; overrides Talairach conversion |
| `-C <x> <y> <z>` | float×3 | $(0, 0, 27)$ | Set corpus callosum seed in Talairach coordinates (mm); sets `cc_seed_set=1` |
| `-P <x> <y> <z>` | float×3 | $(-2, -15, -17)$ | Set pons seed in Talairach coordinates (mm); sets `pons_seed_set=1` |
| `-CV <x> <y> <z>` | float×3 | — | Set corpus callosum seed in volume (voxel) coordinates; sets `cc_seed_vol_set=1` |
| `-PV <x> <y> <z>` | float×3 | — | Set pons seed in volume (voxel) coordinates; sets `pons_seed_vol_set=1` |
| `-T <n>` | int | 1 (`DEFAULT_NEIGHBOR_THRESHOLD`) | Minimum number of 27-connected neighbours a voxel must have to be retained during fill (sets `neighbor_threshold`) |
| `-F <n>` | int | 0 | Override the internal fill value used for image plane generation; normally 0 (disabled) |
| `-lhonly` | — | off | Assume only the left hemisphere is present; skip RH fill entirely |
| `-rhonly` | — | off | Assume only the right hemisphere is present; skip LH fill entirely |
| `-fillonly` | — | off | Skip CC/pons automatic seed detection and apply flood-fill directly from the provided seed coordinates |
| `-fillven <0\|1>` | int | 0 | Fill (1) or skip (0) ventricular voxels during the hemisphere flood-fill |
| `-findlhv` | — | off | Automatically search for a LH seed voxel that has all 27 neighbours on (`find_lh_voxel=1`) |
| `-findrhv` | — | off | Automatically search for a RH seed voxel that has all 27 neighbours on (`find_rh_voxel=1`) |
| `-ccmask` | — | on | Toggle CC-based masking of the pons region; default is on (`cc_mask=1`); flag inverts the current state |
| `-topofix <norm_vol>` | path | off | Apply volumetric topology correction using the provided normalised T1 volume; sets `topofix=1` |
| `-segmentation <file>` | path | none | Load a pre-existing segmentation volume to guide hemisphere separation |
| `-xform <file>` | path | none | Load an LTA transform file to use instead of the default Talairach transform for seed point mapping |
| `-atlas <file> <subject>` | path + string | none | Load a WM probability atlas and specify subject name for atlas-based auto-filling (note: atlas code path is disabled with `&& 0` — dead code) |
| `-L <file>` | path | none | Write cutting plane log to the specified file |
| `-A <file>` | path | none | Write augmented cutting plane log (CRS and Talairach XYZ for CC and pons) to the specified file |
| `-D` | — | off | Enable diagnostic logging (`logging=1`) |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Set global debug voxel `(Gx,Gy,Gz)` for verbose per-voxel diagnostic output (single-dash form; uses `+1` strip) |
| `-auto-man <auto> <man> <editsfile>` | 3 paths | off | Propagate manual edits: compare automatically-generated volume `auto` to manually-edited volume `man`, write differences to `editsfile` (pass `nofile` to suppress); sets `DoAutoMan=1` |
| `-no-auto-man` | — | — | Disable auto-man propagation (`DoAutoMan=0`) |
| `-ctab <file>` | path | none | Load a colour table from the specified ASCII file for label interpretation |
| `-pointset <invol> <outvol> <ps1> [<ps2>…]` | paths | — | **Stand-alone mode:** fill voxels along lines connecting points in each named point-set file and write result to `outvol`; exits immediately after completion |

> [!gotcha] Dead code: `-atlas`
> The atlas code path inside `main()` is guarded by `if (atlas_name && 0)`, meaning it is compiled but never executed. Specifying `-atlas` stores the filenames but the atlas is never applied.

> [!gotcha] `-ccmask` toggles rather than sets
> The flag flips `cc_mask` from its current value (`cc_mask = !cc_mask`). Since `cc_mask` starts at 1, a single `-ccmask` disables it. A second `-ccmask` re-enables it.

## Configuration Interactions

- Talairach seed coordinates (`-C`, `-P`, `-lh`, `-rh`) are transformed to voxel space using the LTA; volume-space seeds (`-CV`, `-PV`, `-lhv`, `-rhv`) skip the Talairach conversion and are used directly.
- `-fillonly` skips the automatic CC/pons seed detection; the hemisphere seed coordinates (`-lh`/`-lhv` and `-rh`/`-rhv`) must therefore be provided explicitly.
- `-lhonly` and `-rhonly` are mutually exclusive; setting both would conflict.
- `-topofix` is not enabled by default in `recon-all`; it requires a normalised volume argument and adds significant computation time.
- `-fillven` controls whether ventricular voxels receive a hemisphere label during the flood-fill; default is off (0).
- `-auto-man` is a stand-alone correction pass that propagates manual edits from a previous run; it is independent of the main fill logic.
- `-pointset` exits immediately after processing and does not perform any hemisphere fill operations.

## Typical Use Cases

```bash
# Standard autorecon2 call
mri_fill wm.asegedit.mgz filled.mgz

# Manual seed override (when automatic seed detection fails)
# CC seed: -C, pons seed: -P (both in Talairach mm)
mri_fill -C 0 0 27 -P -2 -15 -17 wm.asegedit.mgz filled.mgz

# Fill only from specified RH voxel seed (skip auto-detection)
mri_fill -rhv 130 120 128 -fillonly wm.asegedit.mgz filled.mgz

# Propagate manual edits from a previous run
mri_fill -auto-man wm.asegedit_prev.mgz wm.asegedit_manual.mgz edits.txt \
  wm.asegedit.mgz filled.mgz
```

## Pipeline Context

In `[[recon-all]]` `autorecon2`, the sequence is:
1. `[[mri_segment]]` → `wm.mgz`
2. `[[mri_edit_wm_with_aseg]]` → `wm.asegedit.mgz`
3. **`mri_fill`** → `filled.mgz`
4. `[[mri_pretess]]` → `wm_pretess110.mgz`
5. `[[mri_tessellate]]` → `lh.orig.nofix`, `rh.orig.nofix`

`filled.mgz` is the direct input to `[[mri_pretess]]`.

## Gotchas and Caveats

> [!gotcha] Seed detection failure is a common pipeline failure mode
> If the CC or pons seed detection fails (e.g., due to unusual anatomy or image quality problems), the hemisphere separation will fail. The `-cc`, `-pons`, `-lh`, `-rh` flags allow manual override. The recon-all `control.dat` file mechanism can also be used to specify control points.

> [!gotcha] Input must be UCHAR
> The code checks `mri_im->type != MRI_UCHAR` and converts if needed. Values outside [0, 255] are clipped.

> [!gotcha] Talairach transform must be available
> Default seed points are in Talairach coordinates and require a valid `talairach.xfm` or equivalent transform to be present in the subject directory.

> [!gotcha] CC label replacement with WM
> The function `MRIreplaceCCwithWM()` is called internally to handle voxels labeled as corpus callosum; these are temporarily treated as WM during the fill.

> [!gotcha] Left hemisphere fill value is 255, right is 127
> These values are specific to FreeSurfer (`MRI_LEFT_HEMISPHERE` and `MRI_RIGHT_HEMISPHERE`). Downstream tools (tessellation, surface placement) expect exactly these values.

## Related Tools

- `[[mri_segment]]` — produces the WM volume input to this tool
- `[[mri_edit_wm_with_aseg]]` — edits the WM volume before filling
- `[[mri_pretess]]` — prepares the filled volume for tessellation
- `[[mri_tessellate]]` — creates the initial surface mesh from the filled volume
- `[[mri_watershed]]` — skull stripping that precedes WM processing

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. Seed point defaults, fill values, topological correction steps, dead code in atlas path, and pipeline position all verified.
