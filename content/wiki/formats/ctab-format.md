---
title: "FreeSurfer Color Table (.ctab / LUT)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".ctab"
  - ".txt"
produced_by:
  - "[[mris_ca_label]]"
  - "[[mri_ca_label]]"
consumed_by:
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[mri_label2vol]]"
related:
  - "[[annotation-format]]"
  - "[[mgz]]"
  - "[[gcsa-format]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - format
  - segmentation
  - color
  - label
---

# FreeSurfer Color Table (.ctab / LUT)

## Overview

A FreeSurfer color table (ctab) maps integer **label indices** to anatomical
structure names and RGBA display colors. It is the lookup mechanism that gives
every segmentation voxel and surface annotation a human-readable name and a
color for visualization.

Color tables exist in two forms:

1. **ASCII .ctab / .txt** — standalone plain-text files, human-readable.
   The master table for the entire software suite is
   `$FREESURFER_HOME/FreeSurferColorLUT.txt`.

2. **Binary embedded ctab** — a color table serialized into the tag section
   of a [[annotation-format|`.annot`]] or `.mgz` file so that it travels with the segmentation data.
   The embedding is handled by `CTABwriteIntoBinary()` /
   `CTABreadFromBinary()` in `utils/colortab.cpp`.

The in-memory representation is the `COLOR_TABLE` / `CT` struct defined in
`include/colortab.h`. All I/O is implemented in `utils/colortab.cpp`.

---

## ASCII .ctab Format

### Column Layout

Each non-comment line has the format:

```
<index>  <name>  <R>  <G>  <B>  <T>
```

| Column | Type | Description |
|--------|------|-------------|
| `index` | integer | Label index (first column). Becomes the array index in `COLOR_TABLE.entries[]`. The maximum index found in the file determines the size of the entries array. |
| `name` | string | Structure name; no embedded spaces; URL-style hyphenation is conventional (e.g., `Left-Hippocampus`). |
| `R` | integer 0–255 | Red channel. |
| `G` | integer 0–255 | Green channel. |
| `B` | integer 0–255 | Blue channel. |
| `T` | integer 0–255 | **Transparency** (not alpha). Alpha is stored as `alpha = 255 - T`. A value of `0` means fully opaque. |

An optional 7th column encodes a **tissue type** index:

```
<index>  <name>  <R>  <G>  <B>  <T>  <tissue_type>
```

If the 7th column is absent, `TissueType` is set to `-1`.

### Comment Lines

Lines beginning with `#` are ignored by `CTABreadASCII2()`. Blank lines and
lines that do not match the 6-column format are silently skipped. This allows
free-form header comments (as in `FreeSurferColorLUT.txt`) and inline
annotations.

### FreeSurferColorLUT.txt Header

The master lookup table uses this comment as its header:

```
#No. Label Name:                            R   G   B   A
```

The column header says `A` but the fourth color column is transparency, not
alpha — the same convention as all other ctab files (see Gotchas below).

### Example Lines

```
0   Unknown                                 0   0   0   0
2   Left-Cerebral-White-Matter            245 245 245   0
17  Left-Hippocampus                      220 216  20   0
251 CC_Posterior                            0   0  64   0
1001  ctx-lh-bankssts                      25 100  40   0
```

### Tissue Type Extended ASCII Format

`CTABprintASCIItt()` writes an extended format that embeds a tissue type
lookup table into the header via specially prefixed comment lines:

```
# TissueTypeSchema <schema_name>
#ctTType  <tt_index>  <tt_name>  <R>  <G>  <B>  <T>
...
<index>  <name>  <R>  <G>  <B>  <T>  <tissue_type>
```

`CTABreadASCIIttHeader()` reads back the `#ctTType` lines and populates
`COLOR_TABLE.ctabTissueType`. This mechanism is used by tools that need
tissue-type-aware color tables (e.g., for ribbon generation).

### Parsing Rules (from `CTABreadASCII2()`)

- The file is scanned twice: first to find `max_structure` (to allocate the
  entries array), then to populate entries.
- `nentries = max_structure + 1` — entries are indexed from 0 to
  `max_structure` inclusive; gaps (skipped indices) are left as NULL pointers
  in the array.
- Duplicate index entries trigger a warning and are skipped; only the first
  occurrence is kept. The global `ctabDuplicates` counter is incremented.
- Label index 0 is valid and conventional for "Unknown" / background. If the
  file includes a line for index 0, `CTABfindAnnotation()` will return 0 for
  annotation value 0. If index 0 is absent, it returns -1.

### Writing ASCII (from `CTABprintASCII()`)

Output format (per non-NULL entry):

```
%3d  %-30s  %3d %3d %3d  %3d
```

where the last column is `255 - ai` (transparency, not alpha). The `idbase`
field of `COLOR_TABLE` is added to the structure number during output,
allowing index remapping.

---

## Binary Embedded Ctab

Binary ctabs are embedded in `.annot` files and `.mgz` tag sections. Two
on-disk versions exist; the current write version is **2** (defined by
`CTAB_VERSION_TO_WRITE = 2` in `include/colortab.h`).

### Version Detection

The first 4-byte integer (big-endian, via `freadInt()`) determines the version:

| First int value | Meaning |
|-----------------|---------|
| `> 0` | **Version 1 (old format):** the value itself is `nentries`. No explicit version tag. |
| `< 0` | **Version 2 (new format):** negate the value to get the version number; currently `-2` is written. |

### Version 1 Binary Layout

Written/read by `CTABwriteIntoBinaryV1()` / `CTABreadFromBinaryV1()`.

```
[int32]  nentries            (the discriminant read earlier — positive)
[int32]  fname_len           (strlen(fname) + 1)
[char×fname_len]  fname
--- repeated nentries times, in sequential order (no structure index stored) ---
[int32]  name_len            (strlen(name) + 1)
[char×name_len]  name
[int32]  R
[int32]  G
[int32]  B
[int32]  T                   (transparency = 255 - alpha)
```

> [!gotcha] Version 1 cannot represent sparse tables
> Because structure indices are implicit (sequential), version 1 cannot
> correctly encode a table with gaps (NULL entries between valid ones). If a
> sparse table is written as version 1, the structure-to-entry mapping is
> lost. Version 2 was introduced to fix this.

### Version 2 Binary Layout

Written/read by `CTABwriteIntoBinaryV2()` / `CTABreadFromBinaryV2()`.

The comment in the source (`utils/colortab.cpp`, `CTABwriteIntoBinaryV2()`)
documents the layout explicitly:

```
[int32]  -2                  (negative version number)
[int32]  nentries            (total array size including NULL slots = max_structure + 1)
[int32]  fname_len           (strlen(fname) + 1)
[char×fname_len]  fname
[int32]  num_entries_to_write   (count of non-NULL entries only)
--- repeated num_entries_to_write times ---
[int32]  structure           (explicit label index)
[int32]  name_len            (strlen(name) + 1)
[char×name_len]  name
[int32]  R
[int32]  G
[int32]  B
[int32]  T                   (transparency = 255 - alpha)
```

All multi-byte integers use the byte order of the platform's `freadInt()` /
`fwriteInt()` helpers — in FreeSurfer these are big-endian (network byte
order), consistent with the `.mgz` / `.annot` format conventions.

### Embedding in .annot Files

The `.annot` file format is:

```
[int32]   nvertices
[int32×2 × nvertices]   (vno, annotation) pairs
[int32]   TAG_OLD_COLORTABLE  (= 1, optional)
[binary ctab]             (CTABreadFromBinary, optional)
```

`TAG_OLD_COLORTABLE` has the value `1` (defined in `include/tags.h`). It is
the tag type that immediately precedes the binary ctab block. If EOF is
reached before this tag, the annotation file has no embedded ctab and the
caller must supply one externally.

The annotation value per vertex is **not the label index directly**. It is
the packed RGB integer of the entry's color:

$$
\text{annotation} = R + (G \times 256) + (B \times 65536)
$$

equivalently, as implemented in `CTABrgb2Annotation()`:

```c
annotation = (b << 16) + (g << 8) + r;
```

`CTABfindAnnotation()` reverses this: given an annotation integer, it
extracts R, G, B and scans the ctab for an entry with matching colors to
recover the label index. This means **annotation lookup depends on color
uniqueness**: two entries with identical RGB values produce identical
annotation integers and cannot be distinguished.

### Embedding in .mgz Files

`CTABwriteIntoBinary()` / `CTABreadFromBinary()` are also called from the
MGH/MGZ I/O code when a volume carries a tag-embedded ctab
(`TAG_OLD_COLORTABLE = 1`). The binary layout is identical to that in
`.annot` files.

---

## The COLOR_TABLE Struct

Defined in `include/colortab.h`:

```c
typedef struct
{
  char  name[STRLEN];   // Structure name
  int   ri, gi, bi, ai; // Integer RGBA, 0–255; ai = alpha (not transparency)
  float rf, gf, bf, af; // Float RGBA, 0.0–1.0
  int   TissueType;     // -1 if unset; tissue class index
  int   count;          // Number of voxels labeled with this entry (runtime)
}
COLOR_TABLE_ENTRY, CTE;

typedef struct COLOR_TABLE
{
  CTE   **entries;      // Sparse array of CTE pointers; NULL for absent indices
  int   nentries;       // Size of entries array (= max_structure + 1)
  char  fname[STRLEN];  // Source file name (preserved through binary round-trip)
  int   version;        // Binary version (1 or 2); set to CTAB_VERSION_TO_WRITE on read
  int   idbase;         // Added to structure number when writing ASCII
  char  TissueTypeSchema[STRLEN];
  struct COLOR_TABLE *ctabTissueType; // Nested ctab for tissue type labels
}
COLOR_TABLE, CT;
```

Key points:

- `entries` is a **sparse pointer array**: index $i$ maps to `entries[i]`, which
  may be NULL if label $i$ is not defined. This allows direct O(1) lookup by
  label index.
- `ai` stores **alpha** (0 = transparent, 255 = opaque). On-disk (both ASCII
  and binary), the field is stored as **transparency** (`T = 255 - ai`).
  Conversion happens on every read and write.
- `fname` is preserved through binary round-trips, letting tools report the
  original source of an embedded ctab.
- `idbase` is normally 0; tools that remap label ranges use it during ASCII
  output.

---

## Standard Color Tables in FreeSurfer

| File | Location | Labels | Description |
|------|----------|--------|-------------|
| `FreeSurferColorLUT.txt` | `$FREESURFER_HOME/` | 1811 entries (max index 15137) | Master lookup for all structures; read by `CTABreadDefault()` |
| `FreeSurferColorLUT.txt` | `$FREESURFER_HOME/luts/` | Same | Symlink / copy under `luts/` |
| `ASegStatsLUT.txt` | `$FREESURFER_HOME/` | Subset | Labels reported in `stats/aseg.stats` |
| `WMParcStatsLUT.txt` | `$FREESURFER_HOME/` | 3000–4041 | WM parcellation labels (wm-lh-*, wm-rh-*) |
| `Simple_surface_labels2005.txt` | `$FREESURFER_HOME/` | 1–35 | Desikan–Killiany 2005 surface parcellation |
| `Simple_surface_labels2009.txt` | `$FREESURFER_HOME/` | 1–74 | Destrieux a2009s surface parcellation |
| `SubCorticalMassLUT.txt` | `$FREESURFER_HOME/` | Subset | Used by subcortical mass statistics |
| `DefectLUT.txt` | `$FREESURFER_HOME/` | Small | Surface defect labels |
| `SegmentNoLUT.txt` | `$FREESURFER_HOME/` | Small | Segments with no assigned color |

Parcellation-specific ctabs are embedded in `.annot` files (e.g.,
`lh.aparc.annot`, `lh.aparc.a2009s.annot`) rather than shipped as standalone
`.ctab` files in modern FreeSurfer.

---

## Label Index Conventions

FreeSurfer uses a globally consistent label space across segmentation and
parcellation tools.

### Subcortical and Special Labels (from FreeSurferColorLUT.txt)

| Range | Usage |
|-------|-------|
| 0 | Unknown / background |
| 1–39 | Left hemisphere structures (cerebral exterior, WM, cortex, ventricles, subcortical nuclei) |
| 40–71 | Right hemisphere counterparts (offset +39 from left) |
| 2 | Left-Cerebral-White-Matter |
| 41 | Right-Cerebral-White-Matter |
| 251–255 | Corpus callosum segments (CC_Posterior → CC_Anterior) |
| 1000–1035 | Cortical parcellation, left hemisphere (`ctx-lh-*`, Desikan–Killiany) |
| 2000–2035 | Cortical parcellation, right hemisphere (`ctx-rh-*`; offset +1000 from lh) |
| 3000–3041 | WM parcellation, left hemisphere (`wm-lh-*`) |
| 4000–4041 | WM parcellation, right hemisphere (`wm-rh-*`; offset +1000 from lh) |
| 5001–5002 | Unsegmented white matter (left/right) |
| 10000–10049+ | Brainstem structures and cranial nerves |

### Left/Right Offset Convention

For cortical parcellations the right hemisphere labels are exactly 1000 higher
than the corresponding left hemisphere labels:
`ctx-rh-bankssts = 2001 = ctx-lh-bankssts (1001) + 1000`.
The same +1000 offset applies to WM parcellation (3001 → 4001).

For subcortical structures the offset is not uniform — left and right
structures are assigned independently by the atlas construction.

### Annotation vs. Label Index

In `.annot` files, per-vertex values are **not label indices** — they are
packed RGB integers derived from the ctab entry's color. Tools that read
annotations must use the embedded ctab (or `FreeSurferColorLUT.txt`) to
reverse-map RGB → label index. See the Binary Embedded Ctab section above.

---

## Tools Table

| Tool | ASCII read | ASCII write | Binary read | Binary write | Notes |
|------|-----------|-------------|-------------|--------------|-------|
| `CTABreadASCII` | ✓ | — | — | — | Core reader; called by most tools |
| `CTABreadDefault` | ✓ | — | — | — | Reads `$FREESURFER_HOME/FreeSurferColorLUT.txt` |
| `CTABwriteFileASCII` | — | ✓ | — | — | Writes standard 6-column format |
| `CTABwriteFileASCIItt` | — | ✓ | — | — | Writes tissue-type extended format |
| `CTABreadFromBinary` | — | — | ✓ | — | Called by annot and MGZ readers |
| `CTABwriteIntoBinary` | — | — | — | ✓ | Called by annot and MGZ writers |
| [[mri_segstats]] | ✓ | — | ✓ | — | `--ctab` flag; reads either form |
| [[mri_binarize]] | ✓ | — | — | — | `--match` by name requires ctab |
| [[wiki/tools/freeview|freeview]] | ✓ | — | ✓ | — | Loads ctab for segmentation overlay |
| [[mri_label2vol]] | ✓ | — | — | — | Maps labels to volume using ctab |
| [[mris_ca_label]] | — | ✓ | ✓ | ✓ | Embeds ctab into output `.annot` |
| [[mri_ca_label]] | — | — | — | ✓ | Embeds ctab into segmentation `.mgz` |

---

## Annotation Encoding (Color-as-Identity)

FreeSurfer surface annotations use color as a proxy for structure identity.
Each vertex stores one 32-bit integer whose low 24 bits encode the RGB of the
assigned label:

$$
\text{annotation} = R \,|\, (G \ll 8) \,|\, (B \ll 16)
$$

The macros in `include/colortab.h` and `include/mrisurf.h`:

```c
#define RGBToAnnot(r,g,b,annot) \
  annot = ((r) & 0xff) | (((g) & 0xff) << 8) | (((b) & 0xff) << 16)

#define AnnotToRGB(annot,r,g,b) \
  r = annot & 0xff; \
  g = (annot >> 8) & 0xff; \
  b = (annot >> 16) & 0xff
```

To recover the label name from an annotation value, the code calls
`CTABfindAnnotation()`, which scans the ctab for a matching RGB triplet.
This design means:

1. Every ctab entry used in an annotation must have a **unique RGB triple**.
   `CTABalloc()` enforces uniqueness for dynamically generated tables via
   `CTABunique()`.
2. Label index 0 (Unknown) is conventionally assigned RGB = (0, 0, 0),
   giving annotation value 0.
3. The annotation integer is a color encoding, not a label index. Software
   that treats annotation values as label indices directly will produce
   incorrect results.

---

## Conversion and Interoperability

- **mri_convert** can be used with `--ctab` to associate a standalone ctab
  with a volume during conversion.
- **nibabel** (Python): `nibabel.freesurfer.io.read_annot()` returns
  `(labels, ctab, names)` — the ctab array has shape `(N, 5)` with columns
  `[R, G, B, T, annotation]` (note: transparency, not alpha, in column 4 in
  some nibabel versions; verify against the nibabel version in use).
- **Custom ctabs**: any ASCII file matching the 6-column format can be used
  as a ctab. Tools will accept it provided label indices are unique and colors
  are unique (for annotation use).
- The master `FreeSurferColorLUT.txt` should be treated as read-only; local
  copies should be used for customization.

---

## Gotchas and Caveats

> [!gotcha] The fifth column is transparency, not alpha
> Both the ASCII format and the binary format store `T = 255 - alpha` in the
> color column labelled `A` in the `FreeSurferColorLUT.txt` header. The
> `COLOR_TABLE_ENTRY` struct stores `ai` (alpha = 255 - T). Confusing the
> two leads to inverted opacity: a fully opaque structure (`T=0`) would be
> interpreted as fully transparent (`A=0`) if the conversion is omitted. The
> conversion is performed in every read and write path in `colortab.cpp`.

> [!gotcha] The annotation value is a packed RGB, not a label index
> Code that stores annotation values as label indices will silently mismap
> structures. Always use `CTABfindAnnotation()` (or its equivalent) to
> convert annotation → label index via the embedded ctab.

> [!gotcha] Label 0 is background or "Unknown", not "unset"
> The value `0` as an annotation integer corresponds to RGB = (0, 0, 0), which
> is the conventional color for Unknown / background. Whether
> `CTABfindAnnotation()` returns index 0 or -1 for annotation = 0 depends on
> whether an explicit entry for index 0 is present in the ctab. If the file
> does not include a line for index 0, the call returns -1 (not found), which
> can cause "unknown annotation" errors in downstream tools.

> [!gotcha] The embedded ctab in .annot silently overwrites the standalone ctab
> When `MRISreadAnnotation()` finds `TAG_OLD_COLORTABLE` in the file, it reads
> the embedded binary ctab and attaches it to `mris->ct`, replacing any
> externally supplied ctab pointer unless the caller provides one explicitly.
> Tools that pass a custom ctab via command-line flag must do so after the
> annotation is loaded, or the embedded ctab takes precedence.

> [!gotcha] Version 1 binary ctab loses sparse index information
> Version 1 writes entries sequentially with no per-entry structure number.
> A table with gaps (e.g., indices 0, 5, 10 but not 1–4) is written as if
> indices were 0, 1, 2, corrupting the label mapping on readback. Always use
> version 2 (the current default) for sparse tables.

> [!gotcha] Color uniqueness is required for annotation use
> If two entries share identical RGB values, `CTABfindAnnotation()` will
> return the first match. The second structure becomes unreachable via
> reverse lookup. `CTABfindDuplicateAnnotations()` can detect this condition.

> [!gotcha] fname is preserved in binary round-trips
> The binary ctab embeds the original source filename string. When a ctab
> loaded from `FreeSurferColorLUT.txt` is embedded in an `.annot` file, the
> full path to `FreeSurferColorLUT.txt` is stored in the binary block. This
> can expose filesystem paths from the machine where the segmentation was run.

---

## Related Pages

- [[annotation-format]] — `.annot` binary file format; embeds ctab in its tag section
- [[mgz]] — MGH/MGZ volume format; may embed ctab via `TAG_OLD_COLORTABLE`
- [[gcsa-format]] — Atlas file format; uses ctab for parcellation labels
- [[mri_segstats]] — primary tool consuming ctab for segmentation statistics
- [[mri_binarize]] — uses ctab to match structures by name
- [[mris_ca_label]] — produces `.annot` files with embedded ctab

---

## Confidence and Gaps

High confidence. All format details were derived directly from:

- `include/colortab.h` — struct definitions and macro encoding
- `utils/colortab.cpp` — all read/write functions
- `include/tags.h` — `TAG_OLD_COLORTABLE = 1`
- `utils/mrisurf_io.cpp` — `.annot` file structure comments and reader
- `utils/annotation.cpp` — alternative annotation reader path
- `$FREESURFER_HOME/FreeSurferColorLUT.txt` — label range examples

> [!gap] Nibabel column ordering for ctab
> The nibabel `read_annot()` return format for the ctab array (specifically
> whether column 4 is alpha or transparency) varies across nibabel versions
> and should be verified against the version in use before assuming either
> convention.

> [!gap] MGZ tag length field
> When the binary ctab is embedded in `.mgz` via the tag system, the tag
> infrastructure may write a length field before the ctab block. The exact
> interplay between `TAGwriteStart()` / `TAGwriteEnd()` and
> `CTABwriteIntoBinary()` in the MGZ writer was not fully traced.
