---
title: "internal-colortab"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/colortab.h"
  - "utils/colortab.cpp"
related:
  - "[[color-lut]]"
  - "[[ctab-format]]"
  - "[[annotation-format]]"
  - "[[mgz]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps: []
tags:
  - internal
  - color-table
  - labels
  - annotation
---

# internal-colortab

## Summary

`colortab` is the in-memory **colour-table / lookup-table (LUT)** library:
the `COLOR_TABLE` type and the `CTAB*` functions that map an integer
structure index (e.g. `17` = Left-Hippocampus) to a human-readable **name**,
an **RGB colour**, and a **tissue-type class**. It is the runtime form of
[[color-lut|`FreeSurferColorLUT.txt`]] and of the [[ctab-format|`.ctab`]] files,
and the same machinery produces and decodes the packed **annotation** integers
stored in surface [[annotation-format|`.annot`]] parcellations. Essentially
every tool that emits or interprets a labelled volume or surface — `aseg`,
`aparc`, [[mri_segstats]], `mris_anatomical_stats`, `mri_aparc2aseg`,
[[wiki/tools/freeview|freeview]] — carries a `COLOR_TABLE`, frequently the one
**embedded inside the `.mgz`/annot file itself**.

## Source Layout

| File | Lines | Contains |
|------|-------|----------|
| [`include/colortab.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/colortab.h) | 201 | the `COLOR_TABLE` / `COLOR_TABLE_ENTRY` structs, the annotation-packing macros, and the full public API |
| [`utils/colortab.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/colortab.cpp) | 2750 | ASCII + binary (V1/V2) read/write, lookups, annotation conversion, tissue-type schemas |

## Core Data Structures

A colour table is a (possibly **sparse**) array of entry pointers. The index
into the array *is* the structure/label number, so `entries[17]` is the entry
for label 17; absent labels are `NULL`.

[`include/colortab.h:37-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/colortab.h#L37-L61):

```c
typedef struct {
  char  name[STRLEN];     /* Structure name. */
  int   ri, gi, bi, ai;   /* 0-255 range. */
  float rf, gf, bf, af;   /* 0-1 range.  */
  int   TissueType;
  int   count;            // Number of voxels for this entry
} COLOR_TABLE_ENTRY, CTE;

typedef struct COLOR_TABLE {
  CTE   **entries;        /* Array of CTE ptrs; some may be NULL */
  int   nentries;         /* Size of entries array. */
  char  fname[STRLEN];    /* Original file name. */
  int   version;          /* Version number, if read from binary */
  int   idbase;           // Add this to structure number when writing
  char  TissueTypeSchema[STRLEN];
  struct COLOR_TABLE *ctabTissueType;
} COLOR_TABLE, CT;
```

Fields a developer must understand:

- **`entries` / `nentries`** — the table is indexed by structure number and is
  **sparse**: iterate `0 … nentries-1` and skip `NULL` slots (or use
  `CTABisEntryValid` / `CTABhasEntry`). `nentries` is the array size, *not* the
  count of valid entries (`CTABgetNumberOfValidEntries` gives that).
- **Colours stored twice** — `ri,gi,bi,ai` are 0–255 ints and `rf,gf,bf,af` are
  the same colours in 0–1 floats. The ASCII file stores **transparency**
  (`255 − alpha`); the loader computes both representations.
- **`count`** — a scratch field tools fill with the voxel count for that label
  (e.g. when writing `aseg.stats`); it is not intrinsic to the LUT.
- **`TissueType` / `ctabTissueType`** — each entry can carry a tissue-type class
  (e.g. cortex/WM/CSF), resolved against a second embedded colour table
  (`ctabTissueType`) named by `TissueTypeSchema`. Used by SAMSEG and the GTM PET
  tools to collapse fine labels into tissue classes.
- **`idbase`** — an offset added to the structure number on write (legacy
  numbering shim; almost always 0).

## Capabilities

- **Read / write ASCII** — [`CTABreadASCII2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/colortab.cpp#L70)
  (`index name R G B transparency` per line; duplicates counted in the global
  `ctabDuplicates`), `CTABwriteFileASCII` / `CTABprintASCII`. See [[ctab-format]].
- **Read / write binary** — `CTABreadFromBinary` / `CTABwriteIntoBinary`, with
  zlib variants `znzCTAB*` used to embed the table in `.mgz` and `.annot`.
- **Load the default LUT** — `CTABreadDefault` reads
  `$FREESURFER_HOME/FreeSurferColorLUT.txt` ([[color-lut]]).
- **Lookups** — `CTABfindName`, `CTABfindRGBi`, `CTABcopyName`,
  `CTABrgbAtIndex{i,f}`, `CTABentryNameToIndex`, and the annotation pair
  `CTABannotationAtIndex` / `CTABfindAnnotation`.
- **Allocation / lifetime** — `CTABalloc` (allocates and fills **random**
  colours), `CTABdeepCopy`, `CTABfree`, `CTABaddEntry`, `CTABmerge`.
- **Tissue-type schemas** — `TissueTypeSchemaDefault*`, `CTABprintASCIItt`.

## Algorithms and Mathematical Foundations

### Annotation packing (the surface label encoding)

A surface parcellation stores one **annotation integer** per vertex instead of
a label index; the RGB colour is packed directly into the low 3 bytes (so the
colour *is* the key). The packing is little-endian by channel —
[`CTABrgb2Annotation`, colortab.cpp:1423](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/colortab.cpp#L1423):

$$\texttt{annot} = (b \ll 16) + (g \ll 8) + r$$

and the inverse (macros [`colortab.h:180-185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/colortab.h#L180-L185)):

```c
#define AnnotToRGB(annot,r,g,b)  r =  annot        & 0xff; \
                                 g = (annot >> 8)  & 0xff; \
                                 b = (annot >> 16) & 0xff;
```

`CTABannotationAtIndex` converts a table index → annotation; `CTABfindAnnotation`
/ `CTABfindIndexFromAnnotation` invert it by searching the table. This is why an
`.annot` file pairs a per-vertex annotation array with an **embedded colour
table** — without the table the integers are only colours, not names. See
[[annotation-format]].

### Binary version detection by sign

`CTABreadFromBinary` reads a leading `int` and uses its **sign** to pick the
format ([`colortab.cpp:352-381`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/colortab.cpp#L352-L381)): a **positive** value is the legacy
**V1** layout, where that int is actually `nentries`; a **negative** value is a
version magic, negated to give the real version (currently **V2**,
`CTAB_VERSION_TO_WRITE = 2`). V2 tolerates sparse tables and stores per-entry
name lengths. New tables are always written as V2.

## Invariants, Conventions, and Memory Model

- **Index = structure number.** The array position is the label id; never
  assume entries are dense or contiguous.
- **Ownership.** `CTABalloc`/`CTABread*`/`CTABdeepCopy` return owned tables the
  caller must `CTABfree`. An MRI/MRIS that has a `ct` attached owns it and frees
  it with the parent.
- **Embedded tables are the source of truth.** When a `.mgz` or `.annot` carries
  its own table (via the TAG/znz mechanism — see [[internal-mri-io]] and
  [[mgz]]), use *that* table, not the global LUT: a SAMSEG or custom
  segmentation may use label numbers that disagree with `FreeSurferColorLUT.txt`.

> [!gotcha] `CTABalloc` returns random colours, not a meaningful LUT
> An allocated-but-unread table has random RGB per entry and placeholder names.
> Only `CTABreadASCII`/`CTABreadFromBinary`/`CTABreadDefault` give meaningful
> colours and names.

> [!gotcha] `nentries` ≠ number of labels
> `nentries` is the array length (often the max label id + 1); many slots may be
> `NULL`. Counting labels means iterating and skipping `NULL`
> (`CTABgetNumberOfValidEntries`).

## Consumers

- Volume segmentation outputs (`aseg.mgz`, `aparc+aseg.mgz`, wmparc) embed a
  `COLOR_TABLE`; [[mri_segstats]], `asegstats2table`, `mri_aparc2aseg` read it.
- Surface parcellations (`?h.aparc.annot`) embed one; `mris_anatomical_stats`
  and `mris_ca_label` use it ([[annotation-format]], [[internal-mrisurf]]).
- [[wiki/tools/freeview|freeview]] uses it to colour and name labels under the
  cursor.
- The MRI struct's `ct` field ([[internal-mri]]) is a `COLOR_TABLE`.

## Related Internals

- [[internal-mri]] — the `MRI.ct` field holds the embedded table.
- [[internal-mri-io]] — the TAG/znz mechanism that embeds/extracts the table in `.mgz`.
- [[internal-mrisurf]] — surface annotations and their embedded tables.

## Gotchas and Sharp Edges

> [!gotcha] Annotation packs colour, not label id
> Two structures with the same RGB would collide in annotation space;
> FreeSurfer's LUTs keep colours unique for this reason. Recovering the label
> from an annotation is a table *search*, not a bit-unpack.

## Confidence and Gaps

The struct layout, annotation packing, and version-by-sign logic are read
directly from `colortab.h`/`colortab.cpp`. The exact V1↔V2 byte layouts live in
the `*BinaryV1`/`*BinaryV2` helpers and are specified on the [[ctab-format]]
page; this page documents the in-memory model and API rather than the byte
layout.

## References

- [`include/colortab.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/colortab.h),
  [`utils/colortab.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/colortab.cpp) — Kevin Teich, Bruce Fischl.
- [[color-lut]] — the global `FreeSurferColorLUT.txt`.
- [[ctab-format]] — the on-disk `.ctab` byte layout. [[annotation-format]] — surface `.annot`.
