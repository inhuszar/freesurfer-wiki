---
title: "label2flat"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "label2flat/label2flat.cpp"
families: []
recon_all_stage: null
related:
  - "[[label2patch]]"
  - "[[label-format]]"
  - "[[surface-format]]"
  - "[[mris_flatten]]"
  - "[[coordinate-systems]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The hemisphere is parsed from the patch filename by reading the two characters before the last '.'; non-standard patch names (no '.hemi.' segment) silently default to 'lh'. Behaviour confirmed from source but not exercised on a malformed name."
  - "The -close option sets ndilate and nerode to the same value, but the main loop applies dilate then erode unconditionally without the interleaving a true morphological close implies; the practical effect is documented from the code, not verified against a reference label."
tags:
  - label
  - surface
  - patch
  - flattening
  - coordinates
---

# label2flat

## Summary

`label2flat` projects a surface [[label-format|label]] onto a **flattened
cortical patch**, rewriting each label point's coordinates to the 2D
position of the corresponding vertex in the flat map. Given a subject, a
label, a patch file, and an output path, it reads the subject's `?h.orig`
surface, loads the requested patch, looks up (or re-finds) the surface
vertex for every label point, and writes a new label whose `x y z` columns
are the **flattened** vertex coordinates. Optionally it can morphologically
grow or shrink the label first, carry the label through a *canonical*
(spherical) coordinate system, and even re-express the label on a different
subject's flat map. It is the label-space companion to [[label2patch]]
(which produces the patch itself) and feeds visualisation/analysis of
labels on flat maps produced by [[mris_flatten]].

## Source Information

- **Language:** C++
- **Source file:** [`label2flat/label2flat.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/label2flat`
- **Key library calls:** [`MRISread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L145), [`MRISreadPatch`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L149), [`LabelRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L152), [`MRISreadCanonicalCoordinates`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L173), [`LabelDilate`/`LabelErode`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L176-L179), `LabelToCanonical`, `LabelFromCanonical`, `LabelToFlat`, and `LabelWrite` (the last four are defined locally in an `#if 0` block in this file but the active build calls the library versions of the dilate/erode/IO routines).

## Purpose and Context

A surface [[label-format|label]] is a list of vertex numbers plus a stored
coordinate triple per vertex. The stored coordinates normally hold the
position of the vertex in some 3D surface space (white/inflated/tkreg-RAS).
When a region of cortex has been **cut and flattened** into a 2D patch (for
retinotopy, columnar mapping, or simply to look at a buried sulcus without
occlusion), the natural question is "where does my label land on the flat
map?". `label2flat` answers this by replacing each label point's coordinate
with the 2D `(x, y, z=0)` position the corresponding vertex occupies in the
flattened patch.

Because labels are keyed by vertex index, the projection is in principle
just a table lookup; the value `label2flat` adds is (a) handling label
points that have *lost* their vertex index (e.g. after a canonical-space
round trip), by re-finding the nearest vertex, and (b) supporting
cross-subject transfer through a spherical canonical surface — the same
mechanism FreeSurfer uses to map labels between individuals and
[[fsaverage]].

It is a **manual, interactive-workflow** tool: it is *not* invoked by
[[wiki/pipelines/recon-all|recon-all]] and does not appear in any
FreeSurfer pipeline script (confirmed by a tree-wide search of
`$FREESURFER_SOURCE/scripts`). You run it by hand after you have drawn a
label and cut a flat patch.

## Inputs

`label2flat` takes **four positional arguments** in fixed order, after any
options ([`label2flat/label2flat.cpp:111-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L111-L117)):

```
label2flat [options] <subject name> <label file> <patch file> <output file>
```

### Required Inputs

| Position | Argument | What it is |
|----------|----------|------------|
| 1 | `<subject name>` | Subject ID under `$SUBJECTS_DIR`. Used to locate the surface, patch, label, and Talairach transform. |
| 2 | `<label file>` | Label **name only**, not a path. The file is read from `$SUBJECTS_DIR/<subject>/label/<label>.label` ([`label2flat/label2flat.cpp:123-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L123-L125)). See [[label-format]]. |
| 3 | `<patch file>` | Path to a flattened/cut patch file (FreeSurfer binary patch). The hemisphere is **inferred from this filename** (see assumption below). |
| 4 | `<output file>` | Path of the label to write with flattened coordinates. |

### Input Assumptions

- **`?h.orig` is the working surface.** The surface is always loaded from
  `$SUBJECTS_DIR/<subject>/surf/<hemi>.orig`
  ([`label2flat/label2flat.cpp:139-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L139-L145)), and the patch is then
  applied on top of it with `MRISreadPatch`. The patch must therefore have
  been cut from a mesh with the **same vertex numbering** as `?h.orig`
  (the standard recon-all topology), or the per-vertex lookup is invalid.
- **The Talairach transform must exist.** On startup the program
  unconditionally loads
  `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`
  ([`label2flat/label2flat.cpp:301-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L301-L309)) and exits with an error if it
  cannot be read — even though, in the active code path, the loaded
  transform pointer is never subsequently used (see gotcha). A subject that
  has completed recon-all `-autorecon1` will have this file.
- **`$SUBJECTS_DIR` must be set** in the environment; there is no `-sdir`
  override for this tool ([`label2flat/label2flat.cpp:118-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L118-L121)).

> [!assumption] Hemisphere comes from the patch filename, not a flag
> The hemisphere string is taken from the **patch filename**: the code finds
> the last `.` and copies the two characters immediately before it
> ([`label2flat/label2flat.cpp:132-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L132-L138)). So `lh.occip.patch.flat`
> → `lh`, `rh.full.patch` → `rh`. If the name has **no** `.`, the
> hemisphere silently defaults to `lh`. A patch named, e.g.,
> `myflat` (no dot) on a right hemisphere would therefore load `lh.orig` —
> the wrong surface — without warning.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<output file>` (positional arg 4) | [[label-format|FreeSurfer label]] | A label whose per-point `x y z` columns hold the **2D flattened** vertex coordinates (`z` is the flat-map z, normally ~0). The vertex index column is set to the index of the vertex found on the (possibly different) flat surface. |

The label is written with the local `LabelWrite`/library writer using the
format `vno  x  y  z` per line. No header comment is emitted in this code
path.

### Output Specifications

The output coordinates are **flat-map coordinates**: the `(x, y)` position
of the vertex within the unfolded patch, in the patch's own 2D plane (the
plane onto which [[mris_flatten]] projected the surface). This is *not* a
[[coordinate-systems|tkreg-RAS or scanner-RAS]] coordinate — it is only
meaningful relative to the specific flat patch that was supplied. If
`-output` (a different output subject) was used, the coordinates are on
**that** subject's flat map instead.

## Mathematical Foundations

`label2flat` performs three composable vertex-coordinate substitutions; all
of the geometry is table lookup plus nearest-neighbour search.

**1. Direct flattening (`LabelToFlat`).** For each label point that still
carries a valid vertex index `vno ≥ 0`, the point's coordinates are
overwritten with that vertex's flat position:
$$ (x_n, y_n, z_n) \leftarrow (v_{x}, v_{y}, v_{z}) \quad\text{where } v = \text{mris.vertices}[vno]. $$
Here `mris` is the patch-loaded `?h.orig`, so `(v_x, v_y, v_z)` are the
post-`MRISreadPatch` flattened positions.

**2. Canonical detour (`-canon`).** With `-canon <surf>` the label is first
pushed into the **canonical (spherical) coordinate system**
(`LabelToCanonical`): each point's coordinates are replaced by the vertex's
canonical `(cx, cy, cz)` and its vertex index is cleared to `-1` (the point
is now defined only by a position on the sphere, not by an index). The flat
projection step then detects `vno < 0` and re-acquires a vertex by
**nearest-vertex search** in flat space
(`MRISfindClosestVertex`). This lets a label defined on one tessellation be
laid onto a differently-indexed flat map.

**3. Cross-subject transfer (`-output`).** With `-output <subj2>`, after the
canonical step the program frees the source mesh, loads the *output*
subject's `?h.orig`+patch, and calls `LabelFromCanonical`, which for each
label point finds the closest **canonical** vertex on the new subject
(`MRISfindClosestCanonicalVertex`) and assigns that vertex's index and
canonical coordinates. The final `LabelToFlat` then reads off the new
subject's flat positions. This is the classic spherical-registration
label-resampling used throughout FreeSurfer surface morphometry.

> [!internal] Morphology and label I/O live in `utils/label.cpp`
> `LabelDilate`, `LabelErode`, the closest-vertex searches, and label
> reading/writing are library routines in
> [`utils/label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp)
> and `mrisurf*`. `label2flat` only orchestrates them. The `LabelToCanonical`
> / `LabelFromCanonical` / `LabelToFlat` definitions physically present in
> this `.cpp` are disabled (`#if 0`,
> [`label2flat/label2flat.cpp:332-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L332-L499)); the active program uses the
> library symbols.

## Configuration Options

### Complete Flag Reference

All options are parsed in
[`get_option()`, `label2flat/label2flat.cpp:238-295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L238-L295). Flag matching is
case-insensitive (`stricmp`/`toupper`), so `-dilate`, `-DILATE`, `-D` all
reach the same branch; the table lists the canonical spelling. Single-letter
switches are dispatched by the **first character** of the option, so
`-output` is recognised because it starts with `O`, `-canon` because it
starts with `C` (after the named long-options are tried).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-dilate <n>` | int | `0` | Dilate (grow) the label `n` times over the surface neighbour graph before flattening ([`label2flat/label2flat.cpp:244-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L244-L249)). |
| `-erode <n>` | int | `0` | Erode (shrink) the label `n` times before flattening ([`label2flat/label2flat.cpp:250-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L250-L255)). |
| `-close <n>` | int | `0` | "Close" the label by setting **both** `ndilate` and `nerode` to `n` ([`label2flat/label2flat.cpp:256-263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L256-L263)). See the gotcha on ordering. |
| `-canon <surf>`<br>`-c <surf>` | string | *(off)* | Carry the label through the named **canonical surface** (a spherical coordinate file under `surf/`, e.g. `sphere` or `sphere.reg`); also sets `no_talairach=1` ([`label2flat/label2flat.cpp:265-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L265-L271)). A name containing a `.` is taken as `surf/<name>`; otherwise it is read as `surf/<hemi>.<name>`. |
| `-output <subj>`<br>`-o <subj>` | string | *(off)* | Write the label onto a **different subject's** flat map. Triggers the canonical round-trip + closest-canonical-vertex resampling ([`label2flat/label2flat.cpp:278-282`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L278-L282)). |
| `-n` | bool | *(off)* | Set `no_talairach=1` (do not use Talairach coordinates) ([`label2flat/label2flat.cpp:275-277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L275-L277)). In practice the Talairach transform is loaded but unused regardless (see gotcha), so this flag has no observable effect on output in v8.2.0. |
| `-v` | bool | `0` | Toggle verbose mode (`verbose = !verbose`); prints "done." at the end ([`label2flat/label2flat.cpp:272-274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L272-L274)). |
| `-u`<br>`-?` | bool | — | Print usage and exit ([`label2flat/label2flat.cpp:283-287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L283-L287)). |

> [!contradiction] `--help` is not accepted
> `label2flat --help` prints `unknown option --help` and exits 1, because the
> option dispatcher only recognises `-u`/`-?` for help and the long form is
> not special-cased. Run `label2flat` with no arguments (or `-u`) to get the
> usage line. (Verified by running the installed binary against the source's
> `get_option`.)

### Configuration Interactions

> [!gotcha] `-close` is a degenerate "close", not a true morphological close
> `-close <n>` simply sets `ndilate = nerode = n`
> ([`label2flat/label2flat.cpp:256-263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L256-L263)). The main routine then
> runs `LabelDilate` (if `ndilate>0`) followed by `LabelErode` (if
> `nerode>0`) — i.e. dilate-then-erode, which *is* a closing — but because it
> shares the same two variables, mixing `-close` with an explicit `-dilate`
> or `-erode` makes the **last** flag on the command line win for the shared
> variable. Specify only one of `{-close}` / `{-dilate,-erode}`.

- `-canon` and `-output` are designed to be used **together** for
  cross-subject transfer: `-output` already forces a canonical round trip,
  and `-canon` selects *which* spherical surface (e.g. `sphere.reg`) is used
  as the common frame. Using `-output` without `-canon` still works — the
  source label is saved to `CANONICAL_VERTICES` directly
  ([`label2flat/label2flat.cpp:216-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L216-L218)) — but then no registered
  sphere is consulted, so the alignment is whatever raw canonical coordinates
  happen to be loaded.
- `-canon` sets `no_talairach=1` as a side effect; `-n` does the same
  explicitly. Neither changes output in this version (Talairach is unused).

## Typical Use Cases

### Use Case 1: Project a label onto a subject's own flat map

```bash
# V1 label drawn on the surface, cut into a flat occipital patch.
export SUBJECTS_DIR=/data/subjects
label2flat subj01 lh.V1 \
  $SUBJECTS_DIR/subj01/surf/lh.occip.patch.flat \
  $SUBJECTS_DIR/subj01/label/lh.V1.flat.label
```

The output `lh.V1.flat.label` has each point's coordinates replaced by its
2D position on `lh.occip.patch.flat`, ready to overlay in
[[wiki/tools/freeview|freeview]]/`tksurfer` on the same flat patch.

### Use Case 2: Dilate before flattening to fill holes

```bash
# Grow the label by 2 rings first to close small gaps from manual drawing.
label2flat -dilate 2 subj01 lh.V1 \
  $SUBJECTS_DIR/subj01/surf/lh.occip.patch.flat \
  $SUBJECTS_DIR/subj01/label/lh.V1.dilated.flat.label
```

### Use Case 3: Transfer a label onto another subject's flat map

```bash
# Carry subj01's label through the registered sphere onto subj02's flat map.
label2flat -canon sphere.reg -output subj02 subj01 lh.V1 \
  $SUBJECTS_DIR/subj02/surf/lh.occip.patch.flat \
  $SUBJECTS_DIR/subj02/label/lh.V1.from_subj01.flat.label
```

Each source point is mapped to the nearest vertex on `subj02`'s registered
sphere, then read off `subj02`'s flat patch.

## Pipeline Context

`label2flat` is a stand-alone, interactive surface-analysis utility. It is
not part of any recon-all stage and is not called by any distributed script.

A typical manual workflow:

1. [[wiki/pipelines/recon-all|recon-all]] produces `?h.orig`,
   `?h.inflated`, `?h.sphere(.reg)`, and the label.
2. The user cuts a patch (in `tksurfer`/[[wiki/tools/freeview|freeview]]) and
   flattens it with [[mris_flatten]] → `?h.<region>.patch.flat`.
3. **`label2flat`** rewrites the label into that flat map's coordinates.
4. The flattened label is displayed/used on the flat patch.

**Predecessor:** [[mris_flatten]] (creates the flat patch) and
[[label2patch]] (an alternative way to build the patch from a label) →
**This tool** → **Successor:** flat-map visualisation in
`tksurfer`/[[wiki/tools/freeview|freeview]].

## Gotchas and Caveats

> [!gotcha] A Talairach transform is required but never used
> The program always loads `mri/transforms/talairach.xfm` and aborts if it is
> missing ([`label2flat/label2flat.cpp:130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L130), [`label2flat/label2flat.cpp:301-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L301-L309)). In the active code path the
> returned `linear_transform` pointer is never read, and `-n`/`no_talairach`
> have no consumer. The net effect: a subject without `talairach.xfm` will
> fail even though the transform plays no role in flattening. Ensure
> `-autorecon1` has run, or symlink a transform, if you hit this.

> [!gotcha] Label is read by name, output by path
> Argument 2 is a bare label *name* resolved under
> `$SUBJECTS_DIR/<subject>/label/<name>.label`, but argument 4 is a literal
> *path*. Do not pass a full path as the label name — it will be embedded
> inside the `label/` directory template and not found.

> [!gotcha] Wrong hemisphere if the patch name lacks a dotted hemi token
> Because the hemisphere is sliced out of the patch filename
> ([`label2flat/label2flat.cpp:132-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L132-L138)), a patch whose name does not
> contain a `.` defaults to `lh`, and any name whose two characters before the
> last `.` are not `lh`/`rh` will load a nonsensical surface path. Name flat
> patches with a leading `lh.`/`rh.` (the FreeSurfer convention).

> [!gotcha] Points without a vertex index fall back to nearest-vertex search
> After a canonical detour, label points have `vno = -1` and are re-associated
> by Euclidean nearest-vertex search on the flat map. On a heavily distorted
> or non-overlapping patch this can snap points to unintended vertices. Keep
> the canonical surfaces (`sphere.reg`) consistent between source and output
> subjects.

## Error Compensation and Guard Rails

- **Hard fail on missing surface/patch/transform.** Missing `?h.orig`,
  unreadable patch (`MRISreadPatch` ≠ `NO_ERROR`), or missing
  `talairach.xfm` each cause an immediate `ErrorExit`/`exit`
  ([`label2flat/label2flat.cpp:146-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L146-L150), [`label2flat/label2flat.cpp:307-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L307-L309)).
- **Lost-index recovery.** Label points that have no valid vertex index are
  silently re-acquired by nearest-vertex search rather than dropped
  (`LabelToFlat`), so a canonical round trip never loses points — at the cost
  of possible mis-association on poor patches.
- **No output validation.** The flattened coordinates are written verbatim;
  the tool does not check that the looked-up vertices actually lie inside the
  cut patch, so points outside the cut region inherit whatever flat
  coordinate their nearest in-patch vertex carries.

## Related Tools

- [[label2patch]] — converts a label into a *patch* (a ripped surface) ready
  for flattening; the natural way to **create** the flat patch that
  `label2flat` then projects a label onto.
- [[mris_flatten]] — flattens a cut surface patch into 2D; produces the
  `?h.<region>.patch.flat` files `label2flat` reads.
- [[mri_label2label]] — the general label resampling tool (within and across
  subjects, via the sphere); `label2flat`'s `-canon`/`-output` path is a
  specialised flat-map analogue.
- [[label-format]] — the on-disk label specification; explains the
  coordinate columns `label2flat` rewrites.
- [[surface-format]] / [[coordinate-systems]] — the surface and coordinate
  conventions underlying the flat-map and canonical spaces.

## Confidence and Gaps

**High confidence:** the complete option set, the four positional arguments,
the `?h.orig`+patch loading, the canonical/cross-subject mechanics, the
mandatory-but-unused Talairach load, and the `-close → ndilate=nerode`
behaviour are all read directly from
[`label2flat/label2flat.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp)
and corroborated by the installed binary's usage/`--help` behaviour.

> [!gap] Hemisphere parsing on malformed patch names
> The two-characters-before-last-dot heuristic
> ([`label2flat/label2flat.cpp:132-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp#L132-L138)) is clear from the source,
> but its behaviour on unusual names (multiple dots, single-char hemi tokens)
> was not exercised empirically.

> [!gap] Practical effect of `-canon` vs implicit canonical save
> When `-output` is given without `-canon`, the source label is saved to
> `CANONICAL_VERTICES` directly; the alignment quality of this path relative
> to using a registered `sphere.reg` was not measured.

## References

- FreeSurfer source: [`label2flat/label2flat.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/label2flat/label2flat.cpp) (v8.2.0).
- Label morphology and canonical lookups: [`utils/label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp).
- Flat-map generation method: Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207 (the algorithm behind [[mris_flatten]]).
