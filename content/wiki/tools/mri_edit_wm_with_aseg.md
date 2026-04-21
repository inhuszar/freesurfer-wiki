---
title: "mri_edit_wm_with_aseg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp"
  - "mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.help.xml"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_segment]]"
  - "[[mri_fill]]"
  - "[[mri_edit_segmentation]]"
  - "[[mri_edit_segmentation_with_surfaces]]"
  - "[[recon-all]]"
  - "[[mgz]]"
  - "[[freeview-editing]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - white-matter
  - editing
  - autorecon2
  - segmentation
---

# mri_edit_wm_with_aseg

## Summary

`mri_edit_wm_with_aseg` uses the aseg (automatic subcortical segmentation) volume as an anatomical prior to correct the white matter (wm) volume. It removes WM voxels that are inconsistent with subcortical structures visible in the aseg (e.g., paths through cortex to non-WM structures, medial temporal lobe intrusions), fills topology problems near medial temporal structures, and propagates manual edits from prior runs. This is an `autorecon2` step called immediately after `mri_segment`.

## Source Information

- **Source language:** C++
- **Source file:** `mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.cpp`
- **Help file:** `mri_edit_wm_with_aseg/mri_edit_wm_with_aseg.help.xml`
- **Key dependencies:** `mri.h`, `cma.h`, `gcamorph.h`, `transform.h`

## Purpose and Context

The WM segmentation from `[[mri_segment]]` is a binary volume that can contain topological errors: paths connecting the two hemispheres, white matter erroneously extending into medial temporal lobe structures (hippocampus, amygdala), and connections to subcortical nuclei. `mri_edit_wm_with_aseg` corrects these errors by consulting the aseg to identify which voxels are labelled as non-WM structures, and removes WM labels from those locations or their vicinity.

The tool is called in `recon-all` with the command:
```
mri_edit_wm_with_aseg wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz
```

## Inputs

Positional arguments (in order):
1. WM volume (`wm.mgz`) — must be `MRI_UCHAR` type
2. T1/brain volume (brain.mgz or norm.mgz) — converted to UCHAR if needed
3. aseg volume (`aseg.presurf.mgz`)
4. Output WM volume path

## Outputs

- Edited WM volume at the path specified by argument 4.
- The output preserves manual edits (voxels with `WM_EDITED_ON_VAL` / `WM_EDITED_OFF_VAL`) when `-keep` is used.

## Mathematical Foundations

The core editing functions implement anatomy-specific rule-based corrections:

- **`remove_paths_to_cortex()`**: Identifies and removes WM paths that lead to cortical regions by consulting aseg labels.
- **`edit_segmentation()`** (local function): The main editing function that applies aseg-guided rules, including:
  - `remove_medial_voxels()` — removes WM in medial wall region
  - `remove_gray_matter_voxels()` — removes WM labeled as cortical GM in aseg
  - `remove_unknown_voxels()` — removes WM in aseg "unknown" class
  - `remove_lateral_and_anterior_hippocampus()` — removes WM in lateral/anterior hippocampus
  - `remove_anterior_and_superior_amygdala()` — removes WM in amygdala border region
- **`spackle_wm_superior_to_mtl()`**: Fills WM voxels superior to medial temporal lobe structures to ensure a continuous WM representation.
- **`MRIfixEntoWM()`**: Applies entorhinal cortex WM fixup when an entowm volume is provided.
- **`KeepHAILVCP()`**: Preserves specific structures (Hippocampus, Amygdala, Inferior Lateral Ventricle, Choroid Plexus) from WM removal.

## Configuration Options

All flags are case-insensitive. The full `get_option()` has been read.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--help` / `--usage` | — | — | Print help and exit |
| `-dilate` | — | — | Accepted but ignored (empty handler; `if (!stricmp(option, "dilate")) {}`) |
| `-lh` | — | off | Process left hemisphere only; sets `lh_only=1` |
| `-rh` | — | off | Process right hemisphere only; sets `rh_only=1` |
| `-keep` | — | off | Preserve manual edits from the **output** volume (propagates `WM_EDITED_ON/OFF_VAL`); sets `keep_edits=1` |
| `-keep-in` | — | off | Preserve manual edits from the **input** volume; sets both `keep_edits=1` and `keep_edits_input=1` |
| `-fillven <0\|1>` | int | 1 | Fill (1) or skip (0) ventricular voxels; default is on (1); note: `strcmp` not `stricmp` — exact case required |
| `-fcd` | — | off | Focal Cortical Dysplasia mode: do not fill non-WM lesions that would normally be treated as WM; sets `fcd=1` |
| `-fix-scm-ha <n>` | int | off | Fix subcortical mass/hippocampus/amygdala boundary artefacts using `n` dilations (usually 1); sets `FixSCMHA=1`, `FixSCMHANdil=n` |
| `-fix-scm-ha-only <aseg> <SCM> <ndil> <out>` | 4 paths/int | — | **Stand-alone mode:** fix SCM/HA in `SCM` using `aseg` with `ndil` dilations, write `out`, then exit |
| `-fix-ento-wm <entowm> <level> <lhval> <rhval>` | path + 3 nums | off | Apply entorhinal cortex WM fixup using the named entowm volume; `level`: 1=entowm only, 2=gyrus ambiens only, 3=both; values are set in the WM volume for LH/RH respectively |
| `-sa-fix-ento-wm <entowm> <level> <lhval> <rhval> <invol> <outvol>` | 6 args | — | **Stand-alone mode:** apply entorhinal WM fixup to `invol` and write `outvol`, then exit |
| `-wmsa <file>` | path | none | Load a WMSA (White Matter Signal Abnormality) volume; WMSA voxels (labels 77, 78, 79, 99) will be set to 250 in the output WM volume; sets `wmsafile` |
| `-label-acj <aseg> <out>` | 2 paths | — | **Stand-alone mode:** label amygdala-cortical junction (ACJ) from `aseg` and write mask to `out`, then exit |
| `-fix-acj <aseg> <lhval> <rhval>` | path + 2 floats | off | Apply amygdala-cortical junction WM fixup; loads ACJ mask from `aseg`, sets fill values for LH/RH; sets `FixACJ=1` |
| `-sa-fix-acj <aseg> <lhval> <rhval> <invol> <outvol>` | 5 args | — | **Stand-alone mode:** apply ACJ fixup to `invol` and write `outvol`, then exit |
| `-fill-seg-wm` | — | off | Fill segmentation-based WM regions (for use with SynthSeg, which labels WMHs as WM); sets `FillSegWM=1` |
| `-no-fill-seg-wm` | — | — | Disable segmentation-based WM fill; sets `FillSegWM=0` |
| `-keep-hailvcp <lhval> <rhval>` | 2 floats | off | Preserve hippocampus (H), amygdala (A), inferior lateral ventricle (ILV), and choroid plexus (CP) voxels; sets `KeepH=KeepA=KeepILV=KeepCP=1` |
| `-debug_voxel <x> <y> <z>` | int×3 | disabled | Enable per-voxel diagnostic output; sets `Gx`, `Gy`, `Gz` |
| `-?` / `-H` / `-U` | — | — | Print usage and exit |

> [!gotcha] `-fillven` uses `strcmp` (case-sensitive)
> Unlike most other flags, `-fillven` is checked with `strcmp` (not `stricmp`). The flag must be spelled with exact case: `-fillven`. `-Fillven` or `-FILLVEN` will not be recognised.

> [!gotcha] `-dilate` is accepted but ignored
> The `-dilate` branch contains an empty body `{}`. The flag is parsed without error but has no effect. This is presumably a stub left from development.

> [!gotcha] `-keep-hailvcp` has a nargs bug
> The handler for `-keep-hailvcp` reads `argv[2]` and `argv[3]` but does not set `nargs` (it stays 0). This means the two float arguments are read but not consumed by the parser. The next iteration will attempt to parse `argv[2]` (the lhval string) as the next flag, causing an "unknown option" error unless `lhval` happens to start with a non-flag character that `ISOPTION()` does not recognise.

## Configuration Interactions

- `-lh` and `-rh` are mutually exclusive; if both are set only the second will take effect.
- `-keep` and `-keep-in` are alternatives for the source of manual edits to preserve; both set `keep_edits=1`, but `-keep-in` additionally sets `keep_edits_input=1` to use the input file rather than the output file.
- `-fix-ento-wm` and `-sa-fix-ento-wm` are mutually exclusive use patterns; the stand-alone (`-sa-`) form exits immediately after processing.
- `-fix-acj` and `-sa-fix-acj` are similarly exclusive.
- Stand-alone modes (`-fix-scm-ha-only`, `-sa-fix-ento-wm`, `-sa-fix-acj`, `-label-acj`) exit the program immediately after processing and do not perform the main WM editing pass.
- `-fill-seg-wm` and `-no-fill-seg-wm` control the same variable (`FillSegWM`); the last one specified wins.

## Typical Use Cases

```bash
# Standard autorecon2 call
mri_edit_wm_with_aseg wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz

# Preserve manual edits from a previous run
mri_edit_wm_with_aseg -keep wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz

# Left hemisphere only (e.g., debugging)
mri_edit_wm_with_aseg -lh wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.lh.mgz

# Apply WMSA edits
mri_edit_wm_with_aseg -wmsa wmsa.mgz wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz

# Stand-alone SCM/HA fix (exits immediately after)
mri_edit_wm_with_aseg -fix-scm-ha-only aseg.presurf.mgz wm.seg.mgz 1 wm.seg.fixed.mgz
```

## Pipeline Context

In `[[recon-all]]` `autorecon2`, the sequence is:
1. `[[mri_segment]]` → `wm.mgz`
2. **`mri_edit_wm_with_aseg`** → `wm.asegedit.mgz`
3. `[[mri_fill]]` → `filled.mgz`

The edited WM volume is then used by `[[mri_fill]]` to separate the two hemispheres.

## Gotchas and Caveats

> [!gotcha] Input WM volume must be MRI_UCHAR
> The code explicitly checks `mri_wm->type != MRI_UCHAR` and exits with an error if the type is wrong.

> [!gotcha] T1 volume is also converted to UCHAR
> If the T1 volume is not UCHAR, it is silently converted: `MRIchangeType(mri_T1, MRI_UCHAR, 0, 1, 1)`. This means floating-point T1 volumes are rescaled to [0, 255] before use, which may lose information.

> [!gotcha] Manual edit propagation requires correct flag usage
> When re-running after manual edits in the WM volume, the user must specify `-keep` (to propagate from the output file) or `-keep-in` (to propagate from the input). Forgetting these flags will overwrite manual edits.

> [!internal] MRIfixEntoWM
> The entorhinal WM fixup function `MRIfixEntoWM()` is defined elsewhere in the FreeSurfer library. Its exact behaviour when called with `flag=1` (ACJ mode) vs `flag=0` (standard mode) is not documented here.

## Related Tools

- [[mri_segment]] — produces the WM volume that this tool edits
- [[mri_fill]] — uses the edited WM volume to separate hemispheres
- [[mri_edit_segmentation]] — edits the aseg volume (different target)
- [[mri_entowm_seg]] — produces the entorhinal WM volume used with `-entowm`
- [[freeview-editing]] — GUI for further manual corrections to `wm.mgz` after this automated step; Recon Edit mode targets the same volume

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. The `-fillven` case-sensitivity bug, `-dilate` dead handler, `-keep-hailvcp` nargs bug, and all stand-alone mode exits verified from source code.
