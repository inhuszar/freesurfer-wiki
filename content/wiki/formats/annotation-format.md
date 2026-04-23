---
title: "FreeSurfer Cortical Annotation (.annot)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".annot"
produced_by:
  - "[[mris_ca_label]]"
  - "[[mri_annotation2label]]"
  - "[[mris_label2annot]]"
  - "[[mris_translate_annotation]]"
consumed_by:
  - "[[mri_aparc2aseg]]"
  - "[[mris_anatomical_stats]]"
  - "[[mri_label2vol]]"
  - "[[freeview]]"
  - "[[mrisp_paint]]"
related:
  - "[[ctab-format]]"
  - "[[label-format]]"
  - "[[surface-format]]"
  - "[[mris_ca_label]]"
  - "[[coordinate-systems]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - format
  - surface
  - parcellation
  - annotation
---

# FreeSurfer Cortical Annotation (.annot)

## Overview

A `.annot` file stores a per-vertex cortical parcellation for a FreeSurfer
surface. Each vertex is assigned an integer label that encodes the anatomical
structure identity as a packed RGB triplet. The file also embeds a **color
table** ([[color-lut|ctab]]) that maps each packed RGB integer back to a human-readable
structure name and its display RGBA color.

The format is the native output of [[mris_ca_label]], the atlas-based cortical
parcellation tool, and is consumed by [[mri_aparc2aseg]] (to project
parcellations into volumetric space), [[mris_anatomical_stats]] (to compute
per-region morphometric statistics), and FreeSurfer's GUI tools. Every subject
processed by `recon-all` will have at least three annotation files per
hemisphere in `$SUBJECTS_DIR/<subject>/label/`:

- `?h.aparc.annot` — Desikan-Killiany atlas
- `?h.aparc.a2009s.annot` — Destrieux atlas
- `?h.aparc.DKTatlas.annot` — DKT atlas

All integers in the `.annot` file are **big-endian** (i.e., `freadInt` /
`fwriteInt` routines in `utils/fio.cpp` swap bytes on little-endian
architectures).

**Source:** `utils/mrisurf_io.cpp` — functions `__mrisreadannot()` and
`__mriswriteannot()`; `utils/colortab.cpp` — `CTABreadFromBinary()` /
`CTABwriteIntoBinary()`.

---

## Binary Layout

The `.annot` file has two regions: the **vertex data block** followed by an
optional **embedded color table block**.

### Vertex Data Block

```
Offset   Size   Type          Field
------   ----   ----          -----
0        4      int32 (BE)    nvertices   — number of vertices
4        4      int32 (BE)    vno[0]      — vertex number of first entry
8        4      int32 (BE)    annot[0]    — annotation value for vertex vno[0]
...
4+8*j    4      int32 (BE)    vno[j]      — vertex number of j-th entry
8+8*j    4      int32 (BE)    annot[j]    — annotation value for vertex vno[j]
```

The block contains exactly `nvertices` (vertex index, annotation value) pairs.
The loop iterates sequentially: `vno[j] = j` in practice, but the vertex number
is written explicitly for each entry. Reading code confirms the expected
vertex ordering by checking `vno == expected_index` and flagging mismatches as
errors.

Total size of the vertex data block: `4 + 8 × nvertices` bytes.

### Embedded Color Table Block (Optional)

Immediately after the last vertex pair, the reader attempts to read a 4-byte
tag:

```
Offset          Size   Type          Field
------          ----   ----          -----
4+8*nvertices   4      int32 (BE)    tag
```

- If **EOF** is reached before reading the tag, there is no color table. The
  file is valid but requires an external ctab for label lookups.
- If `tag == 1` (`TAG_OLD_COLORTABLE`), an embedded color table follows
  immediately.
- Any other tag value is treated as an error (the parser does not recognize
  other tags in this context).

The embedded color table is written/read by `CTABwriteIntoBinary()` /
`CTABreadFromBinary()` in `utils/colortab.cpp`. Two sub-versions exist.

#### Color Table Sub-Version 1 (legacy)

```
int32 (BE)    nentries                — number of entries (positive value)
int32 (BE)    fname_len               — byte length of origin filename + 1
char[fname_len]                       — null-terminated origin filename
--- repeated nentries times ---
int32 (BE)    name_len                — byte length of structure name + 1
char[name_len]                        — null-terminated structure name
int32 (BE)    r                       — red (0–255)
int32 (BE)    g                       — green (0–255)
int32 (BE)    b                       — blue (0–255)
int32 (BE)    t                       — transparency (0–255); alpha = 255 − t
```

Detection: the first int read is positive (> 0), so it is interpreted directly
as `nentries`. Entries are written in sequential order (no explicit structure
index); the array position is the structure index. Null entries cannot be
represented in v1.

#### Color Table Sub-Version 2 (current default)

Modern FreeSurfer writes version 2 (`CTAB_VERSION_TO_WRITE = 2` in
`include/colortab.h`).

```
int32 (BE)    version_flag            — always −2 (negative signals new format)
int32 (BE)    nentries                — size of the index space (max structure index)
int32 (BE)    fname_len               — byte length of origin filename + 1
char[fname_len]                       — null-terminated origin filename
int32 (BE)    num_entries_to_read     — number of non-null entries actually written
--- repeated num_entries_to_read times ---
int32 (BE)    structure               — structure index (into [0, nentries))
int32 (BE)    name_len                — byte length of structure name + 1
char[name_len]                        — null-terminated structure name
int32 (BE)    r                       — red (0–255)
int32 (BE)    g                       — green (0–255)
int32 (BE)    b                       — blue (0–255)
int32 (BE)    t                       — transparency (0–255); alpha = 255 − t
```

Detection: the first int read is negative (`−2`), which is negated to obtain
the version number `2`. Each entry carries its own structure index, so the
table can be sparse.

> [!gotcha] Alpha is stored as transparency, not opacity
> The on-disk value is `t = 255 − alpha`. When reading, the code converts back
> with `ai = 255 − t`. A value of `t = 0` means fully opaque (alpha = 255),
> which is the common case for all standard parcellation entries. Do not
> confuse `t` with `ai` — they are complementary.

---

## Label Encoding

The annotation value stored per vertex is an RGB-packed 32-bit integer. The
encoding and decoding are defined in `include/colortab.h`:

```c
/* Encoding — RGB → annotation */
#define RGBToAnnot(r,g,b,annot) \
  annot = ((r) & 0xff) | (((g) & 0xff) << 8) | (((b) & 0xff) << 16);

/* Decoding — annotation → RGB */
#define AnnotToRGB(annot,r,g,b) \
  r = annot & 0xff ;            \
  g = (annot >> 8) & 0xff ;    \
  b = (annot >> 16) & 0xff ;
```

Equivalently:

$$
\text{annotation} = R + 256 \cdot G + 65536 \cdot B
$$

$$
R = \text{annotation} \bmod 256, \quad G = \lfloor \text{annotation} / 256 \rfloor \bmod 256, \quad B = \lfloor \text{annotation} / 65536 \rfloor \bmod 256
$$

The same formula is implemented as `CTABannotationAtIndex()` in
`utils/colortab.cpp`:

```c
annotation = (e->bi << 16) + (e->gi << 8) + e->ri;
```

and in `read_named_annotation_table()` / `read_annotation_table()` in
`utils/annotation.cpp`:

```c
atable[i].annotation = atable[i].r + (atable[i].g << 8) + (atable[i].b << 16);
```

All three forms are equivalent. Note that the packed integer is **not** the
same as a standard 0xRRGGBB hex color: the byte order is reversed — R
occupies the least-significant byte, B the most-significant.

### The "unknown" / Unlabeled Sentinel

A vertex is considered unlabeled if its annotation value is `0`. This
corresponds to R=0, G=0, B=0, which is the null RGB triplet. In practice,
medial wall vertices and vertices that fall outside any parcellation label
receive annotation = 0.

> [!gotcha] annotation=0 is NOT the same as the "unknown" ctab entry
> In standard parcellations (e.g., `aparc.annot`), the ctab entry at index 0
> is named `"unknown"` but its RGB is typically non-zero (e.g., R=25, G=5,
> B=25 in the Desikan-Killiany table, giving annotation=0x190519=1639705). The
> code in `annotation2labelV2()` treats `annot <= 0` as "end of labels" when
> processing. Vertices that should be labeled as "unknown" in the atlas
> parcellation carry the annotation value corresponding to the ctab entry named
> "unknown" (a non-zero RGB); vertices with annotation=0 represent the medial
> wall / unassigned cortex. These are distinct concepts and are often
> confused.

The code in `MRISdivideAnnotation()` also confirms this interpretation:

```c
if (v->ripflag || v->annotation <= 0) {
    continue;   // skip unlabeled and medial-wall vertices
}
```

---

## Embedded Color Table Details

The embedded ctab maps each packed annotation integer to a structure name,
index, and RGBA color. The lookup chain is:

1. Vertex holds `annotation` (packed RGB integer).
2. `CTABfindAnnotation(ct, annotation, &index)` searches the ctab for an
   entry whose `(r, g, b)` matches the annotation, returning the structure
   index.
3. `ct->entries[index]->name` gives the structure name.

The origin filename (`ct->fname`) stored in the ctab records where the color
table was originally read from (e.g., a text file in the FreeSurfer average
directory). This is informational only and does not affect the lookup.

### Uniqueness Requirement

Because the ctab lookup is by RGB triple, **each structure must have a unique
(R, G, B)** combination. `CTABunique()` enforces this at allocation time, and
`CTABcountRepeats()` / `CTABfindDuplicateAnnotations()` check for violations.
Duplicate RGB values cause lookup collisions — two structure names would map to
the same annotation integer, making it impossible to distinguish them.

### External Color Table Files

The ctab can also live in a separate ASCII text file (`.ctab` or `.txt`).
The format matches the `FreeSurferColorLUT.txt` layout:

```
<index>  <StructureName>  <R>  <G>  <B>  <T>
```

where `T` is transparency (255 − alpha). These ASCII tables are read by
`CTABreadASCII()` and by `read_named_annotation_table()`. When an annotation
file lacks an embedded ctab, tools typically fall back to
`$FREESURFER_HOME/Simple_surface_labels2009.txt` (the default) or accept an
externally specified table.

---

## Standard Annotation Files

FreeSurfer ships two classes of standard annotation files:

### Atlas templates (in `$FREESURFER_HOME/subjects/[[fsaverage]]/label/`)

Used for registration-based cortical parcellation via [[mris_ca_label]]:

| File | Atlas | Regions per hemisphere | Notes |
|------|-------|----------------------|-------|
| `?h.aparc.annot` | Desikan-Killiany (DK40) | 34 cortical + 1 unknown + 1 corpuscallosum = 36 entries | Default `recon-all` parcellation |
| `?h.aparc.a2009s.annot` | Destrieux 2009 | 74 cortical + 2 others = 76 entries | Higher-resolution parcellation |
| `?h.aparc.a2005s.annot` | Christophe Destrieux 2005 variant | ~76 entries | |
| `?h.PALS_B12_Brodmann.annot` | Brodmann areas (PALS atlas) | — | Approximate; based on surface registration |
| `?h.PALS_B12_Lobes.annot` | Lobe assignments (PALS atlas) | — | |
| `?h.Yeo2011_7Networks_N1000.annot` | Yeo 2011 7-network parcellation | 7 networks | Resting-state functional |
| `?h.Yeo2011_17Networks_N1000.annot` | Yeo 2011 17-network parcellation | 17 networks | Resting-state functional |

### Per-subject output (in `$SUBJECTS_DIR/<subject>/label/`)

Generated by `recon-all` for each processed subject:

| File | Producing tool | Notes |
|------|---------------|-------|
| `?h.aparc.annot` | [[mris_ca_label]] | Desikan-Killiany 34-region parcellation |
| `?h.aparc.a2009s.annot` | [[mris_ca_label]] | Destrieux 148-region (74/hemisphere) |
| `?h.aparc.DKTatlas.annot` | [[mris_ca_label]] | DKT atlas 31-region |
| `?h.BA_exvivo.annot` | [[mris_ca_label]] | Brodmann areas from ex-vivo data |
| `?h.BA_exvivo.thresh.annot` | [[mris_ca_label]] | Thresholded version of BA_exvivo |
| `?h.mpm.vpnl.annot` | [[mris_ca_label]] | Visual/parietal network labels |

---

## Tools Table

| Tool | Reads | Writes | Notes |
|------|-------|--------|-------|
| [[mris_ca_label]] | — | `.annot` | Primary producer; applies probabilistic atlas to spherically-registered surface |
| [[mri_aparc2aseg]] | `.annot` | `.mgz` | Projects parcellation into volumetric space |
| [[mris_anatomical_stats]] | `.annot` | `.stats` | Computes per-label morphometric statistics |
| [[mri_label2vol]] | `.annot` | `.mgz` | Converts annotation labels to a volume |
| [[mri_annotation2label]] | `.annot` | `.label` | Extracts individual labels from annotation |
| [[mris_label2annot]] | `.label` | `.annot` | Assembles individual labels into an annotation |
| [[mris_convert]] | `.annot` | `.annot`, `.gii` | Format conversion (e.g., to GIFTI label file) |
| [[freeview]] | `.annot` | — | Displays parcellation overlay on surface |
| [[mrisp_paint]] | `.annot` | — | Paints annotation values onto a spherical surface |

---

## Conversion

### Annotation → Individual Labels

`mri_annotation2label` extracts each parcellation region from an `.annot` file
as a separate [[label-format|`.label`]] file:

```bash
mri_annotation2label \
  --subject <subj> \
  --hemi lh \
  --annotation aparc \
  --outdir /path/to/labels/
```

Internally, `annotation2label()` in `utils/annotation.cpp` iterates over all
vertices, finds those matching the target structure index (using either
`CTABfindAnnotation()` or the legacy `annotation_to_index()` lookup), and
returns a `LABEL` struct.

### Individual Labels → Annotation

`mris_label2annot` assembles a set of `.label` files back into a `.annot` file:

```bash
mris_label2annot \
  --s <subj> \
  --hemi lh \
  --ctab /path/to/colortable.txt \
  --l lh.precentral.label \
  --l lh.postcentral.label \
  --a myannot
```

The tool assigns each label file a ctab entry and packs the RGB into the
per-vertex annotation integer.

### Annotation → GIFTI Label

`mris_convert` can convert `.annot` to GIFTI `.label.gii` format:

```bash
mris_convert --annot lh.aparc.annot lh.white lh.aparc.label.gii
```

The GIFTI file stores vertex labels as `NIFTI_INTENT_LABEL` with an embedded
`LabelTable` element that records the structure names and RGBA colors.

### Python Access (nibabel)

```python
import nibabel as nib

labels, ctab, names = nib.freesurfer.io.read_annot('lh.aparc.annot')
# labels: int32 array of length nvertices; value is the annotation integer
# ctab:   int32 array of shape (nentries, 5): [R, G, B, A, packed_annotation]
# names:  list of byte strings (structure names)

# Find the annotation integer for a named region
idx = names.index(b'precentral')
packed = ctab[idx, 4]
mask = labels == packed
```

> [!gotcha] nibabel ctab column 4 is the packed annotation, not an index
> In nibabel's return value, `ctab[:, 4]` contains the annotation integer
> (packed RGB), not the structure index. Matching `labels == ctab[i, 4]`
> selects all vertices belonging to structure `i`.

---

## Gotchas and Caveats

> [!gotcha] annotation=0 means medial wall / unlabeled, NOT "unknown" structure
> Vertices with `annotation == 0` (RGB = 0,0,0) are unassigned — typically the
> medial wall, corpus callosum medial surface, or vertices that received no
> label during parcellation. The ctab entry named `"unknown"` at index 0
> conventionally has non-zero RGB, so its annotation integer is also non-zero.
> Code that tests `annot <= 0` to skip unlabeled vertices will miss vertices
> whose annotation has been set to 0 by other means (e.g., manual editing
> without assigning a proper ctab color).

> [!gotcha] Vertex ordering in the file must match the paired surface
> The `.annot` file stores one entry per vertex; vertex `j` is the `j`-th
> entry in the file (i.e., `vno[j] = j`). If the annotation file is paired
> with a surface that has a different vertex count or vertex ordering, the
> parcellation will be silently misassigned. The reader checks that
> `nElem == mris->nvertices` and rejects files where they differ. Do not
> apply an annotation file from one hemisphere to the other, or from one atlas
> surface to a subject surface without registering through the sphere first.

> [!gotcha] Embedded ctab may be absent
> Older `.annot` files (or those produced by tools that did not embed a ctab)
> have no color table. Reading such a file leaves `mris->ct == NULL`. Many
> downstream tools assume `mris->ct` is non-NULL and will segfault or produce
> incorrect results if the ctab is missing. The `MRISisCTABPresentInAnnotation()`
> function can be used to probe for ctab presence before loading.

> [!gotcha] Big-endian byte order
> All integer fields use big-endian encoding. This includes both the vertex data
> block and the embedded ctab. Code that reads the file with native `fread` on
> a little-endian system (x86) must byte-swap all int32 values. FreeSurfer's
> `freadInt()` / `fwriteInt()` handle this automatically. External parsers must
> account for this explicitly.

> [!gotcha] Name strings in the ctab are NOT null-terminated by the length field
> In sub-version 1, the length written is `strlen(name) + 1`, and the `+1` byte
> is the null terminator written as part of the character array. The reader
> allocates `len + 1` bytes and null-terminates manually (`name[len] = 0`). In
> sub-version 2, the same convention applies. Always treat the stored string as
> having its null terminator included in the length count.

> [!gotcha] RGB uniqueness is required but not validated on read
> The annotation lookup is a linear scan of the ctab for a matching RGB triple.
> If two entries happen to have the same RGB (which should never occur in
> well-formed files), `CTABfindAnnotation()` returns the first match
> encountered. Files where this occurs will cause silent mislabeling with no
> error message.

> [!gotcha] The format supports GIFTI, MGZ, and NIfTI as alternate annotation containers
> `MRISreadAnnotation()` inspects the filename extension and dispatches to
> different readers:
> - `.annot` → binary MGH_ANNOT format (described in this page)
> - `.gii` → GIFTI label file
> - `.mgz` / `.nii` / `.nii.gz` → surface-segmentation MRI volume (1 × nvertices × 1)
>
> The binary `.annot` described here is the canonical format. `.mgz`-encoded
> annotations are a newer alternative that can carry the ctab in the MGZ tag
> block; they use integer label indices rather than packed RGB values.

---

## Confidence and Gaps

High confidence. The binary layout is derived directly from `__mrisreadannot()`
and `__mriswriteannot()` in `utils/mrisurf_io.cpp`, the ctab sub-versions from
`CTABreadFromBinaryV1/V2()` and `CTABwriteIntoBinaryV1/V2()` in
`utils/colortab.cpp`, and the label encoding from the `RGBToAnnot` /
`AnnotToRGB` macros in `include/colortab.h`. Actual annotation files were
parsed in Python to verify the byte layout and ctab version in practice.

> [!gap] ctab v1 files in the wild
> Sub-version 1 ctabs were the default before FreeSurfer version ~4. It is
> unclear whether any `.annot` files distributed with current FreeSurfer 8.x
> still use v1 ctabs; all tested files use v2. Legacy user data may still
> contain v1 ctabs.

> [!gap] Behavior when annotation=0 is a valid ctab entry
> If a user constructs a ctab where index 0 has RGB=(0,0,0), the annotation
> integer 0 could be either "unlabeled medial wall" or "structure at index 0
> with black color". The code does not disambiguate. This edge case has not
> been traced through all downstream tools.
