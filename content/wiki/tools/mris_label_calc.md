---
title: "mris_label_calc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_label_calc/mris_label_calc.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_label_area]]"
  - "[[mris_label2annot]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - labels
  - set-operations
  - utility
---

# mris_label_calc

## Summary

`mris_label_calc` performs Boolean set operations and morphological operations on FreeSurfer surface label files. It supports union, intersection, inversion, erosion, and dilation of labels. The tool is designed for manipulating label files to create custom ROIs, compute label intersections, or dilate/erode label boundaries on the cortical surface mesh.

## Source Information

- **Language:** C++
- **Source file:** `mris_label_calc/mris_label_calc.cpp`
- **Original author:** Martin Reuter

## Purpose and Context

Surface label files (`.label`) define sets of vertices on the cortical surface. `mris_label_calc` provides basic set algebra operations:

- **union**: $L_1 \cup L_2$ — vertices in either label
- **intersect**: $L_1 \cap L_2$ — vertices in both labels
- **invert**: $\overline{L_1}$ on surface $S$ — vertices in $S$ but not in $L_1$
- **erode**: shrink label boundaries by removing vertices at the periphery
- **dilate**: expand label boundaries by adding neighboring vertices

This is used for:
- Combining multiple ROI labels
- Computing overlap between labels
- Creating buffer zones around ROIs
- Generating complement labels

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` | Command: `union`, `intersect`, `invert`, `erode N`, `dilate N` |
| `argv[2]` | First input label file (input1) |
| `argv[3]` | Second input label file (input2) — or surface file for `invert` |
| `argv[4]` | Output label file |

For `union` and `intersect`: `mris_label_calc <command> inlabel1 inlabel2 outlabel`

For `invert`: `mris_label_calc invert inlabel surface outlabel`

For `erode` and `dilate`: `mris_label_calc erode N inlabel surface outlabel`

## Outputs

| Output | Description |
|--------|-------------|
| Output label | Result of the operation, written to `argv[4]` |

## Mathematical Foundations

**Union:** Combine all vertices from both labels, removing duplicate entries:
$$L_{\text{out}} = L_1 \cup L_2$$
Implemented via `LabelCombine` + `LabelRemoveDuplicates`.

**Intersection:** Retain only vertices present in both labels:
$$L_{\text{out}} = L_1 \cap L_2$$

**Inversion:** Retain all surface vertices NOT in the input label:
$$L_{\text{out}} = S \setminus L_1$$
where $S$ is the full vertex set of the input surface.

**Erosion:** Remove boundary vertices from the label (vertices with any neighbor outside the label). Performed $N$ times:
$$L^{(k+1)} = \text{erode}(L^{(k)}) = \{v \in L^{(k)} : \mathcal{N}(v) \subseteq L^{(k)}\}$$

**Dilation:** Add vertices neighboring the label. Performed $N$ times:
$$L^{(k+1)} = \text{dilate}(L^{(k)}) = L^{(k)} \cup \{v \notin L^{(k)} : \exists u \in L^{(k)}, u \in \mathcal{N}(v)\}$$

Erosion and dilation use `LabelErode` and `LabelDilate` from the FreeSurfer label library.

## Configuration Options

| Command | Arguments | Description |
|---------|-----------|-------------|
| `union` | `input1 input2 output` | Union (OR) of both labels |
| `intersect` | `input1 input2 output` | Intersection (AND) of both labels |
| `invert` | `input surface output` | Inversion (NOT) of label on surface |
| `erode N` | `N input surface output` | Erode label N times on surface |
| `dilate N` | `N input surface output` | Dilate label N times on surface |

## Configuration Interactions

- `union` and `intersect` require two label files; `invert`, `erode`, and `dilate` require one label file and a surface file.
- For `erode` and `dilate`, the surface file provides the mesh topology (vertex neighborhood information). Any FreeSurfer surface file for the same hemisphere works.
- `erode N` and `dilate N` accept a count $N$ as the second argument. Calling with $N=0$ produces no change.
- The tool does not use `SUBJECTS_DIR` — all paths are absolute or relative.

## Typical Use Cases

**Union of two ROI labels:**
```bash
mris_label_calc union lh.V1.label lh.V2.label lh.V1V2.label
```

**Intersection of two labels:**
```bash
mris_label_calc intersect lh.fusiform.label lh.fmri_activation.label lh.overlap.label
```

**Invert a label on the white surface:**
```bash
mris_label_calc invert lh.V1.label lh.white lh.notV1.label
```

**Dilate a label 3 times:**
```bash
mris_label_calc dilate 3 lh.V1.label lh.white lh.V1.dilated3.label
```

**Erode a label to remove boundary vertices:**
```bash
mris_label_calc erode 2 lh.V1.label lh.white lh.V1.eroded2.label
```

## Pipeline Context

Not part of `recon-all`. Used in post-processing ROI manipulation workflows.

Typical use sequence:
1. Create ROIs in tksurfer/freeview as label files
2. Use `mris_label_calc` to combine, restrict, or expand them
3. Pass resulting labels to [[mris_label2annot]] or other analysis tools

## Gotchas and Caveats

> [!gotcha] Argument order differs by command
> The argument order changes depending on the command. For binary operations (union, intersect): `command input1 input2 output`. For unary operations (invert, erode, dilate): `command [N] input surface output`.

> [!gotcha] Subject name stored in label is cleared
> The `subject_name` field of the output label is set to an empty string. If downstream tools rely on the subject name in the label header, they may not find it.

> [!gotcha] No overlap resolution in union
> `LabelRemoveDuplicates` removes exact vertex duplicates but does not resolve stat-field conflicts. If both input labels have values for the same vertex, the behavior depends on which vertex appears first.

## Related Tools

- [[mris_label_area]] — compute area of label regions
- [[mris_label2annot]] — convert labels to annotation format
- [[surface-format]] — label and surface file formats

## Confidence and Gaps

**Confident (from source):**
- All five commands and their signatures
- Use of `LabelCombine`, `LabelRemoveDuplicates`, `LabelErode`, `LabelDilate`
- Empty subject name in output
