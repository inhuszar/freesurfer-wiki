---
title: "FreeSurfer Label Scheme and Color LUT"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
  - "[[mri_ca_label]]"
  - "[[mris_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[wiki/tools/freeview|freeview]]"
related_concepts:
  - "[[parcellation-schemes]]"
  - "[[surface-representations]]"
related_formats:
  - "[[ctab-format]]"
  - "[[annotation-format]]"
  - "[[mgz]]"
  - "[[subject-directory]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - segmentation
  - labels
  - color
  - lut
  - aseg
---

# FreeSurfer Label Scheme and Color LUT

## Overview

The FreeSurfer Color Lookup Table (LUT) is the master registry that maps integer voxel label values to anatomical structure names and display colors. Every segmentation volume produced by FreeSurfer — `aseg.mgz`, `aparc+aseg.mgz`, `wmparc.mgz`, and all derived segmentations — stores integer values whose meaning is defined by this table.

The master file is located at:

```
$FREESURFER_HOME/FreeSurferColorLUT.txt
```

In FreeSurfer 8.2.0, this file contains **1,811 labeled entries** spanning integer values from 0 to 15,137, organized into named groups by anatomical domain and parcellation atlas.

### File Format

Each non-comment line contains four space-separated columns:

```
<integer_label>  <structure_name>  <R>  <G>  <B>  <A>
```

where R, G, B are 0–255 color channel values and A is the alpha channel (always 0 in standard entries). Comment lines begin with `#`. The file is read by `CTABreadASCII()` in `utils/colortab.cpp`.

> [!internal] File format details
> The on-disk plain-text format and the in-memory `COLOR_TABLE` struct are documented in [[ctab-format]]. This page documents the **meaning** of the label integers — the anatomical and parcellation scheme — rather than the storage format.

### Why a Canonical Label Registry Matters

FreeSurfer represents segmented brain images as integer-valued volumes: each voxel stores a single integer that encodes its anatomical identity. Without a canonical mapping from integer to name, statistics tools (`mri_segstats`), visualization tools (`freeview`), and analysis scripts would need hard-coded tables or would produce unlabeled output. The LUT makes the label scheme explicit, extensible, and human-readable while keeping the segmentation volumes compact.

---

## The Label Ranges

The LUT is organized into distinct numeric ranges, each corresponding to a category of structures or a particular parcellation atlas. The ranges are not always contiguous — gaps exist because new structures have been inserted without renumbering existing labels.

| Range | Category |
|-------|----------|
| 0 | Background / Unknown |
| 1–39 | Left hemisphere structures (core aseg) |
| 40–71 | Right hemisphere structures (core aseg) |
| 72–99 | Bilateral / misc structures |
| 100–199 | Intensity abnormalities, extra-cerebral tissue, brainstem sub-structures, hippocampal sub-fields |
| 192 | Corpus Callosum (global, unlabeled) |
| 193–232 | Hippocampal sub-field labels (lateral-only and bilateral) |
| 250–255 | Fornix and corpus callosum segments |
| 256–267 | Extra-cerebral CSF and misc |
| 270–281 | Cortical layer labels (experimental) |
| 331–359 | Vascular / lymph node labels |
| 370–377 | Right cortical layer labels (experimental) |
| 400–439 | Brodmann area / retinotopic / IPS labels |
| 498–499 | WM lesion labels |
| 500–558 | High-resolution hippocampal labels |
| 600 | Tumor |
| 601–691 | Cerebellar parcellation labels (SUIT / FastSurfer-CerebNet) |
| 701–703 | FSL-FAST tissue class labels |
| 801–870 | Hypothalamic sub-region labels |
| 883–930 | Pituitary, pineal, SAMSEG-CHARM labels |
| 951–984 | Olfactory bulb and HypVINN pipeline labels |
| 999 | SUSPICIOUS (placeholder) |
| 1000–1035 | DK40 cortical parcels, **left** hemisphere (`ctx-lh-*`) |
| 1100–1212 | Destrieux (a2005s) cortical parcels, **left** hemisphere (`ctx-lh-*`) |
| 1301–1307 | Lobar parcels, **left** hemisphere |
| 2000–2035 | DK40 cortical parcels, **right** hemisphere (`ctx-rh-*`) |
| 2100–2212 | Destrieux (a2005s) cortical parcels, **right** hemisphere |
| 2301–2307 | Lobar parcels, **right** hemisphere |
| 3000–3035 | DK40 WM parcels, **left** hemisphere (`wm-lh-*`) |
| 3100–3181 | Destrieux WM parcels, **left** hemisphere |
| 3201–3207 | Lobar WM parcels, **left** hemisphere |
| 3301 | Gyrus ambiens WM, left |
| 4000–4035 | DK40 WM parcels, **right** hemisphere (`wm-rh-*`) |
| 4100–4181 | Destrieux WM parcels, **right** hemisphere |
| 4201–4207 | Lobar WM parcels, **right** hemisphere |
| 4301 | Gyrus ambiens WM, right |
| 5001–5002 | Unsegmented ("centrum semiovale") white matter, left/right |
| 5024–5027 | TDP-43 pathology density labels |
| 5100–5325 | White-matter pathway labels (dmri_paths) |
| 6000–6118 | Additional tractography and sinus labels |
| 7001–7406 | Amygdala nuclei, brainstem nuclei, locus coeruleus sub-structures |
| 8001–8233 | Thalamic nuclei labels |
| 8103–8233 | Histological thalamus atlas (Iglesias et al.) |
| 11000–14175 | Destrieux (a2009s) cortical and WM labels (`ctx-lh/rh-*`, `wm-lh/rh-*`) |
| 15000–15137 | Yeo 7-network and 17-network atlas labels |

### How Label Numbers Are Assigned

Label integers were assigned incrementally as FreeSurfer evolved. The core subcortical labels (1–99) were established first and have remained stable. Cortical parcellation labels (1000+) were introduced later using large offsets to avoid collision with the core range. New segmentation modules (hippocampal subfields, thalamic nuclei, etc.) have been assigned ranges in the thousands. This incremental design means the LUT has **gaps** — integer values with no entry are simply not used, but their absence is not an error.

---

## Key Subcortical Labels (Core aseg)

These are the labels reported in `stats/aseg.stats` (the ASegStatsLUT.txt subset). They are the most commonly used labels in FreeSurfer analysis pipelines.

### Left Hemisphere

| Integer | C Constant | Structure | Type |
|---------|-----------|-----------|------|
| 2 | `Left_Cerebral_White_Matter` | Cerebral white matter | WM |
| 3 | `Left_Cerebral_Cortex` | Cerebral cortex (aggregate) | GM |
| 4 | `Left_Lateral_Ventricle` | Lateral ventricle | CSF |
| 5 | `Left_Inf_Lat_Vent` | Inferior lateral ventricle | CSF |
| 7 | `Left_Cerebellum_White_Matter` | Cerebellum WM | WM |
| 8 | `Left_Cerebellum_Cortex` | Cerebellum cortex | GM |
| 10 | `Left_Thalamus` | Thalamus | Subcortical GM |
| 11 | `Left_Caudate` | Caudate nucleus | Subcortical GM |
| 12 | `Left_Putamen` | Putamen | Subcortical GM |
| 13 | `Left_Pallidum` | Pallidum (globus pallidus) | Subcortical GM |
| 17 | `Left_Hippocampus` | Hippocampus | Subcortical GM |
| 18 | `Left_Amygdala` | Amygdala | Subcortical GM |
| 26 | `Left_Accumbens_area` | Accumbens area | Subcortical GM |
| 28 | `Left_VentralDC` | Ventral diencephalon | Subcortical |
| 31 | `Left_choroid_plexus` | Choroid plexus | Other |

### Right Hemisphere (mirrored at +39)

| Integer | C Constant | Structure | Type |
|---------|-----------|-----------|------|
| 41 | `Right_Cerebral_White_Matter` | Cerebral white matter | WM |
| 42 | `Right_Cerebral_Cortex` | Cerebral cortex (aggregate) | GM |
| 43 | `Right_Lateral_Ventricle` | Lateral ventricle | CSF |
| 44 | `Right_Inf_Lat_Vent` | Inferior lateral ventricle | CSF |
| 46 | `Right_Cerebellum_White_Matter` | Cerebellum WM | WM |
| 47 | `Right_Cerebellum_Cortex` | Cerebellum cortex | GM |
| 49 | `Right_Thalamus` | Thalamus | Subcortical GM |
| 50 | `Right_Caudate` | Caudate nucleus | Subcortical GM |
| 51 | `Right_Putamen` | Putamen | Subcortical GM |
| 52 | `Right_Pallidum` | Pallidum | Subcortical GM |
| 53 | `Right_Hippocampus` | Hippocampus | Subcortical GM |
| 54 | `Right_Amygdala` | Amygdala | Subcortical GM |
| 58 | `Right_Accumbens_area` | Accumbens area | Subcortical GM |
| 60 | `Right_VentralDC` | Ventral diencephalon | Subcortical |
| 63 | `Right_choroid_plexus` | Choroid plexus | Other |

### Bilateral / Midline Structures

| Integer | C Constant | Structure | Type |
|---------|-----------|-----------|------|
| 14 | `Third_Ventricle` | 3rd ventricle | CSF |
| 15 | `Fourth_Ventricle` | 4th ventricle | CSF |
| 16 | `Brain_Stem` | Brainstem (aggregate) | GM/WM |
| 24 | `CSF` | General CSF | CSF |
| 72 | `Fifth_Ventricle` | 5th ventricle (cavum septi) | CSF |
| 77 | `WM_hypointensities` | WM hypointensities (aggregate) | Lesion |
| 85 | `Optic_Chiasm` | Optic chiasm | WM |
| 192 | `Corpus_Callosum` | Corpus callosum (undivided) | WM |

### Corpus Callosum Segments

| Integer | C Constant | Structure |
|---------|-----------|-----------|
| 250 | `Fornix` | Fornix |
| 251 | `CC_Posterior` | CC posterior |
| 252 | `CC_Mid_Posterior` | CC mid-posterior |
| 253 | `CC_Central` | CC central |
| 254 | `CC_Mid_Anterior` | CC mid-anterior |
| 255 | `CC_Anterior` | CC anterior |

> [!gotcha] Label 255 is not a special value
> Label 255 (`CC_Anterior`) is a valid anatomical label in FreeSurfer segmentations. However, the `IS_UNKNOWN()` macro in `cma.h` also treats 255 as unknown (line 519: `(label == 255)`). This creates an ambiguity: in aseg volumes where the corpus callosum is subdivided, label 255 is a real anatomical segment, but IS_UNKNOWN() will mistakenly classify it as background. Code that uses IS_UNKNOWN() may silently exclude CC_Anterior voxels.

---

## The C Constants in `cma.h`

The file `include/cma.h` (relative to the FreeSurfer source root) defines C preprocessor constants (`#define`) for most of the clinically important labels. These constants are used throughout the FreeSurfer C codebase to avoid hard-coding integers.

### Selected Key Defines

```c
// Background
#define Unknown                        0

// Left hemisphere core
#define Left_Cerebral_White_Matter     2
#define Left_Cerebral_Cortex           3
#define Left_Lateral_Ventricle         4
#define Left_Cerebellum_White_Matter   7
#define Left_Cerebellum_Cortex         8
#define Left_Thalamus                 10   // also Left_Thalamus_Proper
#define Left_Caudate                  11
#define Left_Putamen                  12
#define Left_Pallidum                 13
#define Left_Hippocampus              17
#define Left_Amygdala                 18
#define Left_Accumbens_area           26
#define Left_VentralDC                28

// Bilateral
#define Third_Ventricle               14
#define Fourth_Ventricle              15
#define Brain_Stem                    16
#define CSF                           24
#define WM_hypointensities            77
#define Optic_Chiasm                  85
#define Corpus_Callosum              192

// Corpus callosum segments
#define Fornix                       250
#define CC_Posterior                 251
#define CC_Mid_Posterior             252
#define CC_Central                   253
#define CC_Mid_Anterior              254
#define CC_Anterior                  255

// WM parcellation (centrum semiovale)
#define Left_Unsegmented_WM         5001
#define Right_Unsegmented_WM        5002
```

### Classification Macros

`cma.h` also provides boolean macros for testing label membership in anatomical categories. These are used extensively in processing code:

```c
#define IS_UNKNOWN(label)  (((label) == Unknown) || (label == 255) || \
                            (label == Bright_Unknown) || (label == Dark_Unknown))

#define IS_BRAIN(label)  ((!IS_UNKNOWN(label) && label < Dura) || IS_CC(label))
    // Dura = 98; this means label 98 and above are not IS_BRAIN by default

#define IS_WM(label)     (((label) == Left_Cerebral_White_Matter) || \
                          ((label) == Right_Cerebral_White_Matter) || \
                          IS_CC(label) || IS_CEREBELLAR_WM(label) || \
                          (label == Left_VentralDC) || \
                          (label == Right_VentralDC))

#define IS_CC(label)     ((label >= CC_Posterior) && (label <= CC_Anterior))
    // i.e., 251 <= label <= 255

#define IS_CORTEX(l)     (((l) == Left_Cerebral_Cortex) || \
                          ((l) == Right_Cerebral_Cortex))
    // Only labels 3 and 42; does NOT include 1000+ parcel labels

#define IS_VENTRICLE(l)  (IS_LAT_VENT(l) || IS_INF_LAT_VENT(l) || \
                          ((l) == Third_Ventricle) || ((l) == Fourth_Ventricle))

#define IS_HIPPO(l)      (((l) == Left_Hippocampus) || ((l) == Right_Hippocampus))

#define IS_HYPO(label)   (((label) == WM_hypointensities) || \
                          ((label) == Left_WM_hypointensities) || \
                          ((label) == Right_WM_hypointensities))
```

> [!gotcha] IS_BRAIN uses a hard threshold at Dura (98)
> The `IS_BRAIN()` macro returns false for any label >= 98 (the value of `Dura`) unless the label is a CC segment (251–255). This means labels like WM_hypointensities (77) are IS_BRAIN, but Epidermis (118), Cranium (121), and all labels >= 98 are not — regardless of whether they are anatomically "inside the brain." Code using IS_BRAIN will silently exclude high-numbered structures like hypothalamic subregions (801+) and thalamic nuclei (8001+).

---

## How Tools Use the LUT

### `mri_segstats`

`mri_segstats` reads the LUT to annotate its output with structure names and colors. Two relevant flags:

- `--ctab-default` — automatically loads `$FREESURFER_HOME/FreeSurferColorLUT.txt`. Implemented as:
  ```c
  sprintf(ctabfile, "%s/FreeSurferColorLUT.txt", FREESURFER_HOME);
  ```
- `--ctab <file>` — loads any user-specified ctab file
- `--ctab-gca <gca>` — extracts the color table embedded inside a GCA atlas file

Without `--ctab`, `mri_segstats` reports only integer IDs unless the input volume already has an embedded color table (`seg->ct`). With a ctab, the output `stats/aseg.stats` file gains a `# ColorTable` header and structure name columns.

The tool reports only those label IDs that actually appear in the segmentation volume — it does not iterate over every LUT entry.

### `mri_binarize`

`mri_binarize` supports `--match-ctab <ctabfile> [xid1 xid2 ...]` which reads a color table and uses all valid entries (minus any excluded IDs) as the set of matching integers. This allows binarizing all labeled voxels in a ctab subset without enumerating every integer manually.

### `freeview`

`freeview` loads `$FREESURFER_HOME/FreeSurferColorLUT.txt` automatically when displaying a volume whose embedded color table is absent or when the user selects "Lookup Table" display mode. Each integer voxel value is rendered with the corresponding R/G/B color. Users can override the color table via the volume options dialog.

### `mri_ca_label` / `mri_aparc2aseg`

These tools write segmentation volumes whose integer values are defined by the LUT. The GCA atlas used by `mri_ca_label` embeds its own internal color table (accessible via `--ctab-gca` in `mri_segstats`), but the output label integers are designed to match the LUT entries for the aseg core structures.

---

## The `aparc+aseg` Label Scheme

When `mri_aparc2aseg` replaces the aggregate cortex labels (3 and 42) with gyrus-level parcellation labels, it uses a systematic integer offset scheme. The offset depends on the annotation atlas and hemisphere.

### DK40 (Desikan-Killiany) Atlas — Default

The `aparc` annotation uses indices 0–35 internally. `mri_aparc2aseg` maps these to volume labels as follows (from the source code, `mri_aparc2aseg/mri_aparc2aseg.cpp`, lines 836–839):

| Hemisphere | Tissue | Formula | Example |
|-----------|--------|---------|---------|
| Left cortex | GM | `annotIdx + 1000` | left precentral = 1024 |
| Right cortex | GM | `annotIdx + 2000` | right precentral = 2024 |
| Left cortex | WM | `annotIdx + 3000` | left precentral WM = 3024 |
| Right cortex | WM | `annotIdx + 4000` | right precentral WM = 4024 |

The voxels that `aseg.mgz` labeled as `Left_Cerebral_Cortex` (3) or `Right_Cerebral_Cortex` (42) are replaced by these 1000+/2000+ values in `aparc+aseg.mgz`.

### Destrieux (a2005s) Atlas — `--a2005s` flag

The `aparc.a2005s` annotation uses a `baseoffset = 100` applied on top of the hemisphere base:

| Hemisphere | Tissue | Formula | Example |
|-----------|--------|---------|---------|
| Left cortex | GM | `annotIdx + 1000 + 100 = annotIdx + 1100` | |
| Right cortex | GM | `annotIdx + 2000 + 100 = annotIdx + 2100` | |
| Left cortex | WM | `annotIdx + 3000 + 100 = annotIdx + 3100` | |
| Right cortex | WM | `annotIdx + 4000 + 100 = annotIdx + 4100` | |

This places Destrieux parcels in the 1100–1212 / 2100–2212 / 3100–3181 / 4100–4181 ranges visible in the LUT.

### Destrieux (a2009s) Atlas — `--a2009s` flag

The `aparc.a2009s` annotation uses a `baseoffset = 10100`:

| Hemisphere | Tissue | Formula |
|-----------|--------|---------|
| Left cortex | GM | `annotIdx + 1000 + 10100 = annotIdx + 11100` |
| Right cortex | GM | `annotIdx + 2000 + 10100 = annotIdx + 12100` |
| Left cortex | WM | `annotIdx + 3000 + 10100 = annotIdx + 13100` |
| Right cortex | WM | `annotIdx + 4000 + 10100 = annotIdx + 14100` |

These are the 11000+ and 12000+ entries visible at the end of the LUT.

### Centrum Semiovale

After cortical parcellation, WM voxels that could not be attributed to any gyrus receive labels:
- **5001** (`Left-UnsegmentedWhiteMatter`) — left hemisphere unassigned WM
- **5002** (`Right-UnsegmentedWhiteMatter`) — right hemisphere unassigned WM

The LUT comment calls these "Centrum semiovale." The C constants in `cma.h` use the name `Left_Unsegmented_WM` / `Right_Unsegmented_WM`.

### Lobar Parcellation

Running `mri_aparc2aseg` with the `lobes` annotation and a `--base-offset` argument produces lobar-level labels. The standard lobar labels use offsets 300 (cortex lh: 1300+, rh: 2300+) and 200 (WM lh: 3200+, rh: 4200+), resulting in the `ctx-lh-*-lobe` entries at 1301–1307 and `wm-lh-*-lobe` at 3201–3207.

---

## Adding Custom Labels

The simplest way to add custom labels is to create a custom ctab file that appends new entries after the last existing entry (or uses unused integer values). Tools that accept `--ctab` will use the custom file in place of the master LUT. Tools that load the LUT from `$FREESURFER_HOME` by default (e.g., `freeview`) may need explicit configuration to use the custom file.

Custom entries must follow the four-column format:

```
<integer>  <name>  <R>  <G>  <B>  <A>
```

There is no mechanism to enforce uniqueness of integer values or names within a ctab file — duplicate entries are resolved by the last occurrence winning in `CTABreadASCII()`.

---

## Supplementary LUT Files

Several partial LUTs in `$FREESURFER_HOME` serve specialized purposes:

| File | Purpose |
|------|---------|
| `ASegStatsLUT.txt` | Subset of labels reported in `stats/aseg.stats`. Includes only the 45 structures that `recon-all` measures volumetrically. Used internally by `mri_segstats` during `recon-all`. |
| `WMParcStatsLUT.txt` | Labels reported in `stats/wmparc.stats`. Contains the DK40 and Destrieux WM parcellation ranges (3000–4181) plus 5001/5002. |
| `Simple_surface_labels2005.txt` | The raw Destrieux (a2005s) annotation indices with names; 81 entries from index 0. This is the colortable embedded in `aparc.a2005s` annotation files. |
| `Simple_surface_labels2009.txt` | The raw Destrieux (a2009s) annotation indices; 75 entries from index 0. Embedded in `aparc.a2009s` annotation files. |
| `DefectLUT.txt` | Labels for surface topology defects (used by surface correction tools). Entries are named `Defect-NNN`; all share the same magenta color. |
| `SegmentNoLUT.txt` | Numeric-only LUT where structure names are `SegNNNN`. Useful for displaying clustering outputs that have no anatomical names. Colors match the order of entries in `FreeSurferColorLUT.txt`. |
| `SubCorticalMassLUT.txt` | Two-entry LUT used by `mri_fill`: label 127 = Right-SubCorticalMass (green), label 255 = Left-SubCorticalMass (blue). |

---

## Gotchas and Caveats

> [!gotcha] Label 0 is Unknown, not "no label"
> Label 0 is the valid entry `Unknown` with a black display color (0, 0, 0). It is assigned to voxels outside the brain mask and to unclassified tissue. It is not equivalent to a missing value. Many analysis scripts must explicitly exclude label 0 when computing statistics over all labeled structures.

> [!gotcha] Left hemisphere is NOT always < right hemisphere
> The naive assumption that left labels = right labels + 39 breaks down above label 39. The Left/Right pairing is only systematic for the core aseg (labels 1–74). Above that (e.g., WM hypointensities, brainstem sub-structures), lateralized labels occupy non-symmetric integer positions. Always use the structure name, not the integer, to infer laterality for labels > 74.

> [!gotcha] Labels 3/42 and 2/41 are aggregate placeholders
> `Left_Cerebral_Cortex` (3) and `Right_Cerebral_Cortex` (42) represent the entire cortical GM as a single category. In `aseg.mgz` these are the only cortical labels. In `aparc+aseg.mgz`, these are replaced by gyrus-specific 1000+/2000+ labels — but only for voxels that could be matched to a surface vertex. Any cortical voxel that was too far from the surface to be assigned a parcel retains label 3 or 42 in `aparc+aseg.mgz`. Similarly, `Left_Cerebral_White_Matter` (2) and `Right_Cerebral_White_Matter` (41) represent all cerebral WM in `aseg.mgz` and are replaced by 3000+/4000+ labels in `wmparc.mgz`.

> [!gotcha] IS_CORTEX() does not match parcellated cortex
> The `IS_CORTEX()` macro in `cma.h` returns true only for labels 3 and 42. It returns false for all 1000–2035 parcellation labels. Code that uses `IS_CORTEX()` to test whether a voxel is cortical will classify parcellated-cortex voxels from `aparc+aseg.mgz` as non-cortical. This is intentional — IS_CORTEX() tests for the *aseg* cortex label, not for cortical tissue in general.

> [!gotcha] Label 9 / 48 are deprecated
> The LUT contains `Left-Thalamus-unused` (9) and `Right-Thalamus-unused` (48). The `cma.h` constants `Left_Thalamus` and `Right_Thalamus` map to 10 and 49, respectively. If a segmentation volume contains label 9 or 48, these are artefacts from an older FreeSurfer version and should be treated as thalamus.

> [!gotcha] The LUT evolves between FreeSurfer versions
> New structures are added regularly. The 8.2.0 LUT includes hypothalamic subregions (800s), histological thalamic nuclei (8100s), Yeo atlas networks (15000s), and FastSurfer-specific labels that did not exist in FreeSurfer 6.x or 7.x. Segmentation volumes produced by different FreeSurfer versions should always be interpreted against the LUT from the **same version**. Running `mri_segstats` with the LUT from a newer version on segmentations from an older version may produce mismatched names for any labels that were re-assigned.

> [!gotcha] Not all tools respect the LUT
> Many internal FreeSurfer processing steps use hard-coded integer comparisons (`if (label == 17)`) rather than loading the LUT. The LUT is primarily a user-facing annotation tool. Programmatic classification of labels (e.g., IS_WM, IS_HIPPO macros) is controlled by the C constants in `cma.h`, which are separately maintained and may drift from the LUT in edge cases.

> [!gotcha] Alpha channel is always 0
> The fourth column (A) in all standard LUT entries is 0. This column exists for future use and is preserved in the `COLOR_TABLE` struct but has no effect on current tools. Custom LUT files should set A=0 to maintain consistency.

---

## Confidence and Gaps

**High confidence (directly verified from source):**
- All label integers and structure names come from reading `$FREESURFER_HOME/FreeSurferColorLUT.txt` directly (8.2.0, 1,811 entries)
- C constant values confirmed against `include/cma.h`
- Parcellation offset arithmetic (`annotIdx + 1000`, baseoffset values) confirmed from `mri_aparc2aseg/mri_aparc2aseg.cpp` lines 836–839, 1363–1375
- `mri_segstats` LUT loading confirmed from source lines 1677–1684
- IS_BRAIN Dura threshold confirmed from `cma.h` line 521
- Supplementary LUT files confirmed by reading each file directly

**Medium confidence:**
- The claim that freeview loads the LUT "automatically" — confirmed by user experience and documentation, but the exact code path was not traced in the freeview source.
- The statement about `CTABreadASCII()` resolving duplicates by last-occurrence — this is the standard behavior for sequential read/insert implementations but was not explicitly verified against the `colortab.cpp` source.

> [!gap] Label 9 / 48 behavior in practice
> The LUT marks labels 9 and 48 as `Left-Thalamus-unused` / `Right-Thalamus-unused`, and the `cma.h` comment (line 43/83) shows `Left_Thalamus_Proper = 10`. However, it is unclear whether any released FreeSurfer version actually writes label 9/48 into aseg outputs, or whether this is purely a historical relic. Human verification against aseg volumes from older FreeSurfer versions would clarify this.

> [!gap] GCA atlas internal label table vs. LUT
> The GCA atlas files embed their own color table, accessible via `mri_segstats --ctab-gca`. The relationship between GCA-internal label integers and the master LUT integers is not fully documented here. A separate internal page covering GCA atlas structure would be appropriate.
