---
title: "label2patch"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "label2patch/label2patch.cpp"
families: []
recon_all_stage: null
related:
  - "[[label2flat]]"
  - "[[mris_flatten]]"
  - "[[label-format]]"
  - "[[surface-format]]"
  - "[[mris_extract_patches]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The .stl-only-the-label-mesh behaviour with -writesurf is described in the usage text and relies on MRISwrite's STL writer honouring ripped faces; the STL export path was read from the help string and MRISwrite call but not run."
tags:
  - label
  - surface
  - patch
  - flattening
---

# label2patch

## Summary

`label2patch` turns a surface [[label-format|label]] into a **patch**: it
loads the subject's surface (the `inflated` surface by default), marks every
vertex *outside* the label as ripped, removes the ripped portion, and writes
the surviving sub-mesh as a FreeSurfer binary **patch file** (or, with
`-writesurf`, as a full surface / STL mesh). The resulting patch is the
input that [[mris_flatten]] expects — so `label2patch` is the standard way
to carve a region of interest (e.g. occipital cortex) out of a hemisphere so
it can be cut and flattened. Optional morphological dilation, erosion, and
closing let you tidy the label boundary before the patch is cut.

## Source Information

- **Language:** C++
- **Source file:** [`label2patch/label2patch.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp)
- **Original author:** Bruce Fischl
- **Binary/script location:** `$FREESURFER_HOME/bin/label2patch`
- **Key library calls:** [`MRISread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L106), [`MRIScomputeMetricProperties`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L110), [`LabelRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L111), [`LabelDilate`/`LabelErode`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L112-L120), [`LabelRipRestOfSurface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L122), [`MRISsetRipInFacesWithRippedVertices`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L123), [`MRISwritePatch`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L129) / [`MRISwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L126).

## Purpose and Context

To flatten a piece of cortex you must first **cut it out** of the closed
hemispheric mesh: flattening only works on a surface with a free boundary (a
disk-topology patch), not on a sphere-topology hemisphere. Historically
patches were cut by hand in `tksurfer` by drawing cut lines. `label2patch`
automates the common case where the region you want is already defined by a
**label**: it rips away everything outside the label, leaving exactly the
labelled sub-mesh, and saves it as a patch.

The patch produced is in the geometry of whatever surface you chose with
`-surf` — by default the `inflated` surface, so the patch starts out
inflated and is then flattened by [[mris_flatten]]. Because the boundary of a
labelled region is rarely smooth, `-dilate`/`-erode`/`-close` are provided to
regularise the label edge before the cut.

It is a **manual, interactive** tool: it is not part of
[[wiki/pipelines/recon-all|recon-all]] and is not called by any distributed
FreeSurfer script (verified by a tree-wide search of
`$FREESURFER_SOURCE/scripts`).

## Inputs

`label2patch` takes **four positional arguments** after any options
([`label2patch/label2patch.cpp:82-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L82-L88)):

```
label2patch [options] <subject name> <hemi> <label file name> <output patch file>
```

### Required Inputs

| Position | Argument | What it is |
|----------|----------|------------|
| 1 | `<subject name>` | Subject ID under `$SUBJECTS_DIR`. |
| 2 | `<hemi>` | Hemisphere, `lh` or `rh`. Selects the surface `surf/<hemi>.<surf>`. **Explicit here** (unlike [[label2flat]], which infers it from the patch name). |
| 3 | `<label file name>` | Label **name**; the file is read by `LabelRead(subject, name)` from `$SUBJECTS_DIR/<subject>/label/<name>.label` (a full path also works because `LabelRead` accepts either). See [[label-format]]. |
| 4 | `<output patch file>` | Path of the patch (or surface/STL) to write. |

### Input Assumptions

- **The surface and the label share a vertex numbering.** The label's vertex
  indices are used directly to decide which vertices survive the rip, so the
  label must have been defined on the same tessellation as the chosen
  surface (the standard recon-all topology). See [[surface-format]].
- **`-surf` names a surface that exists** under
  `surf/<hemi>.<surf>`. The default is `inflated`
  ([`label2patch/label2patch.cpp:47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L47)); the path is built at
  [`label2patch/label2patch.cpp:98-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L98-L100).

> [!assumption] The label defines the *kept* region, the rest is ripped away
> `LabelRipRestOfSurface` rips **every** vertex not in the label and then
> removes the ripped mesh ([`utils/label.cpp:629-654`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp#L629-L654)). The label must
> therefore enclose a **connected** region of reasonable size; a sparse or
> disconnected label yields a fragmented patch that may not flatten.

## Outputs

### Files Created

| File | Format | When | Contents |
|------|--------|------|----------|
| `<output patch file>` | FreeSurfer binary **patch** | default | The labelled sub-mesh as a patch (`MRISwritePatch`): a list of surviving vertices with their (chosen-surface) coordinates and a `ripflag`-trimmed face set, suitable for [[mris_flatten]]. |
| `<output patch file>` | FreeSurfer **surface** (or `.stl`) | with `-writesurf` | The mesh written via `MRISwrite`. With a `.stl` extension only the **label-covered** mesh is written; saving in FreeSurfer surface format writes the *full* surface (per the usage note). |

### Output Specifications

The patch carries the **3D coordinates of the chosen surface** (`inflated`
by default), not flattened coordinates — flattening is a separate
[[mris_flatten]] step. The coordinates are in that surface's space
(surface/tkreg-RAS for white/pial-type surfaces; the inflated surface is in
its own inflated geometry). See [[coordinate-systems]].

> [!gotcha] `.stl` writes only the label mesh; FreeSurfer format writes the whole surface
> The usage text is explicit: with `-writesurf`, using a `.stl` filename
> "only write[s] the mesh covered by the label", whereas "saving it in FS
> format will save full surface"
> ([`label2patch/label2patch.cpp:210-212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L210-L212)). The rip is applied to
> the in-memory mesh either way; the difference is in what each writer emits.

## Mathematical Foundations

`label2patch` is topological/combinatorial, not numerical. The core
operation is **ripping the complement of the label**:

1. Optionally regularise the label with surface morphology
   (`LabelDilate`/`LabelErode`; see below).
2. `LabelRipRestOfSurface(label, mris)`
   ([`utils/label.cpp:629-654`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp#L629-L654)):
   - set `ripflag = 1` on **all** vertices,
   - set `ripflag = 0` on the vertices listed in the label,
   - `MRISsetRipInFacesWithRippedVertices` — rip any face touching a ripped
     vertex,
   - `MRISremoveRipped` — physically delete the ripped vertices/faces,
     re-indexing the survivors.
3. `MRISwritePatch` / `MRISwrite` emits the surviving sub-mesh.

The morphological operators act on the **surface neighbour graph**, not on a
voxel grid: dilation adds the 1-ring neighbours of current label vertices,
erosion removes boundary vertices, and closing is dilation followed by
erosion. With $D$ the dilation operator and $E$ the erosion operator applied
over the mesh adjacency, `-close n` computes $E^{n}(D^{n}(L))$, smoothing
small concavities and filling 1-ring holes in the label boundary without
(ideally) changing its overall extent.

> [!internal] Rip, morphology, and metric properties are library code
> The rip/remove logic is in [`utils/label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp)
> and the `mrisurf*` modules; `MRIScomputeMetricProperties`
> ([`label2patch/label2patch.cpp:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L110)) recomputes vertex/face
> areas and normals before the rip so the written patch carries valid metric
> data for the subsequent flattening.

## Configuration Options

### Complete Flag Reference

Options are parsed in
[`get_option()`, `label2patch/label2patch.cpp:142-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L142-L200); matching is
case-insensitive.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-dilate <n>` | int | `0` | Dilate (grow) the label `n` times over the surface neighbour graph before cutting the patch ([`label2patch/label2patch.cpp:148-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L148-L153)). |
| `-erode <n>` | int | `0` | Erode (shrink) the label `n` times before cutting ([`label2patch/label2patch.cpp:154-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L154-L159)). |
| `-close <n>` | int | `0` | Morphologically **close** the label: dilate `n` times then erode `n` times ([`label2patch/label2patch.cpp:160-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L160-L165), applied at [`label2patch/label2patch.cpp:116-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L116-L120)). Fills small holes / smooths concavities while preserving overall extent. |
| `-sdir <path>` | string | `$SUBJECTS_DIR` | Use `<path>` as the subjects directory instead of the environment variable ([`label2patch/label2patch.cpp:166-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L166-L171)). |
| `-surf <name>` | string | `inflated` | Use `surf/<hemi>.<name>` as the surface whose geometry the patch carries ([`label2patch/label2patch.cpp:178-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L178-L183)). |
| `-writesurf` | bool | *(off)* | Write the output via `MRISwrite` (a surface / `.stl`) instead of `MRISwritePatch` ([`label2patch/label2patch.cpp:172-177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L172-L177)). |
| `-v` | bool | `0` | Toggle verbose mode (prints "done." at the end) ([`label2patch/label2patch.cpp:185-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L185-L187)). |
| `-u`<br>`-?` | bool | — | Print usage (with the option list) and exit ([`label2patch/label2patch.cpp:188-192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L188-L192)). |

> [!contradiction] `--help` is not accepted
> `label2patch --help` prints `unknown option --help` and exits 1; the
> dispatcher only recognises `-u`/`-?` (or no arguments) for help. Running it
> with no arguments prints the full usage including every option. (Verified
> against the installed binary.)

### Configuration Interactions

- **`-dilate`, `-erode`, and `-close` use separate counters** (`ndilate`,
  `nerode`, `nclose`) and are applied **in that order** in `main`
  ([`label2patch/label2patch.cpp:112-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L112-L120)): first an explicit
  dilate, then an explicit erode, then a close (dilate-then-erode). Unlike
  [[label2flat]], `-close` here does **not** collide with `-dilate`/`-erode`;
  all three can be combined, though doing so is rarely meaningful.
- `-surf` chooses the patch geometry. For flattening you usually leave it at
  `inflated`; choosing `white`/`pial` produces a folded patch, which
  [[mris_flatten]] can still flatten but with larger metric distortion to
  resolve.
- `-writesurf` changes only the **writer**; the rip is performed regardless,
  so even the "surface" output is the trimmed mesh (full-surface vs
  label-only depends on the file extension, per the gotcha above).

## Typical Use Cases

### Use Case 1: Cut an occipital patch for flattening

```bash
export SUBJECTS_DIR=/data/subjects
# Carve the left occipital ROI label out of the inflated surface.
label2patch subj01 lh lh.occip \
  $SUBJECTS_DIR/subj01/surf/lh.occip.patch
# Then flatten it:
mris_flatten $SUBJECTS_DIR/subj01/surf/lh.occip.patch \
             $SUBJECTS_DIR/subj01/surf/lh.occip.patch.flat
```

### Use Case 2: Clean up a hand-drawn label before cutting

```bash
# Close 2-ring holes and smooth the boundary, then cut.
label2patch -close 2 subj01 lh lh.V1 \
  $SUBJECTS_DIR/subj01/surf/lh.V1.patch
```

### Use Case 3: Export the labelled region as an STL mesh

```bash
# Write only the label-covered mesh as STL (e.g. for 3D printing / external tools).
label2patch -writesurf subj01 rh rh.precentral \
  /tmp/rh.precentral.stl
```

## Pipeline Context

`label2patch` is a stand-alone surface-prep utility, not a recon-all stage.
Its place in the manual flattening pipeline:

1. [[wiki/pipelines/recon-all|recon-all]] produces `?h.inflated`, `?h.white`,
   and the label.
2. **`label2patch`** cuts the label region into a patch.
3. [[mris_flatten]] flattens the patch into a 2D map.
4. (optional) [[label2flat]] projects *other* labels onto that flat map.

**Predecessor:** label creation (`tksurfer`/[[wiki/tools/freeview|freeview]]
manual draw, [[mri_annotation2label]], [[mri_cor2label]], …) → **This tool** →
**Successor:** [[mris_flatten]].

`label2patch` overlaps in spirit with [[mris_extract_patches]] (which extracts
many local surface patches for learning-based methods) but solves a different
problem: `label2patch` cuts **one** ROI patch defined by a label, for
flattening.

## Gotchas and Caveats

> [!gotcha] The output patch geometry is the *inflated* surface by default
> Because `-surf` defaults to `inflated`, the patch you get is in inflated
> geometry, not white/pial. This is usually what you want for flattening, but
> if you intended a folded patch you must pass `-surf white` (or similar)
> explicitly ([`label2patch/label2patch.cpp:47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L47)).

> [!gotcha] Disconnected or tiny labels make unflattenable patches
> The patch is exactly the labelled sub-mesh. A label split into islands
> produces a multi-component patch; flattening expects a single disk-topology
> component. Use `-close`/`-dilate` to bridge small gaps, or ensure the label
> is one connected region.

> [!gotcha] The hemisphere argument must match the label
> `<hemi>` selects the surface, but `LabelRead` does not check that the
> label's vertices are valid for that hemisphere. Passing `rh` with an `lh`
> label will rip against the wrong vertex set and produce garbage. Keep
> hemi/label consistent.

## Error Compensation and Guard Rails

- **Metric recomputation before cutting.** `MRIScomputeMetricProperties` is
  called before the rip ([`label2patch/label2patch.cpp:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L110)) so the
  written patch carries up-to-date vertex/face areas and normals for the
  downstream flattening.
- **Hard fail on missing surface.** If the chosen surface cannot be read,
  the tool exits with an error ([`label2patch/label2patch.cpp:107-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp#L107-L109)).
- **No silent reshaping.** Beyond the optional, user-requested morphology,
  `label2patch` does not modify the label region — it cuts exactly what the
  (possibly dilated/eroded/closed) label specifies.

## Related Tools

- [[mris_flatten]] — flattens the patch this tool produces; the immediate
  downstream consumer.
- [[label2flat]] — the inverse-direction companion: instead of cutting a
  label into a patch, it projects a label *onto* an already-flattened patch.
- [[mris_extract_patches]] — extracts many local surface patches (for
  deep-learning methods); different purpose, same "patch" vocabulary.
- [[mri_annotation2label]] / [[mri_cor2label]] — common producers of the
  labels fed to `label2patch`.
- [[label-format]] — the input label specification.
- [[surface-format]] — the patch/surface output specification.

## Confidence and Gaps

**High confidence:** all options, the four positional arguments, the
default `inflated` surface, the rip-the-complement mechanism, the
dilate→erode→close ordering, and the patch-vs-surface/STL writer choice are
read directly from
[`label2patch/label2patch.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp)
and [`utils/label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp),
and corroborated by the binary's usage output.

> [!gap] STL "label-only" export not exercised
> The claim that a `.stl` filename writes only the label-covered mesh while
> FreeSurfer format writes the full surface comes from the usage string and
> the single `MRISwrite` call; the STL writer's exact handling of ripped
> faces was not run and verified.

## References

- FreeSurfer source: [`label2patch/label2patch.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2patch/label2patch.cpp) (v8.2.0).
- Rip/patch library: [`utils/label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp) (`LabelRipRestOfSurface`).
- Flattening method: Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II*, NeuroImage 9(2):195–207.
