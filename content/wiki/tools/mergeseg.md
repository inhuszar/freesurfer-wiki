---
title: "mergeseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/mergeseg"
families: []                     # standalone segmentation helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[seg2cc]]"
  - "[[seg2recon]]"
  - "[[samseg2recon]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[fscalc]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - editing
  - recon-all-helper
---

# mergeseg

## Summary

`mergeseg` overlays one segmentation volume (the **merge** segmentation) on top
of another (the **source** segmentation) and writes the combined result. The
output equals the source everywhere except at voxels where the merge volume is
non-zero; there the source label is replaced by the merge label. It is a thin
tcsh wrapper around [[mri_binarize]], [[mri_mask]], and [[fscalc]] that performs
the mask-out / overlay arithmetic in voxel space. It is the low-level building
block used by [[seg2cc]], [[seg2recon]], and [[samseg2recon]] to splice
corpus-callosum labels back into an `aseg`, and is also called by other
FreeSurfer segmentation-assembly scripts (`xcerebralseg`, `segpons`,
`cblumwmgyri`, `spmseg`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/mergeseg`
- **Key helpers invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L75) (build the merge mask / relabel), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L88) (zero the source under the merge region), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L110) (sum the two), and optionally [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L116) (embed a color table). Also uses the FreeSurfer shell utility `fs_temp_dir`.

## Purpose and Context

When a pipeline computes a partial segmentation separately from the main one —
for example, [[mri_cc]] produces a corpus-callosum-only label map, or
`xcerebralseg` produces extracerebral structures — those new labels must be
**inserted** into the existing whole-brain segmentation without disturbing the
rest of it. `mergeseg` performs exactly that insertion as a pure voxel
operation: it carves a hole in the source where the merge map is present and
drops the merge labels into the hole.

It exists so that the various `*2recon` / `seg*` assembly scripts do not each
re-implement the same "paste these labels over that segmentation" logic. It is
**not** an independent stage of [[wiki/pipelines/recon-all|recon-all]]; rather it
is invoked indirectly, once per corpus-callosum label, by [[seg2cc]] (which
recon-all calls at the CC-Seg stage), [[seg2recon]], and [[samseg2recon]].

> [!gotcha] "Merge" means overwrite, not blend
> Wherever the merge volume is non-zero, the source value is **discarded** and
> replaced. There is no averaging, priority, or conflict resolution — the merge
> volume always wins in its support region. Plan the call so the merge map only
> covers the voxels you actually want to overwrite.

## Inputs

### Required Inputs

- **Source segmentation** (`--src`) — the base label volume to be modified
  (e.g. an `aseg`-style volume). Any format [[wiki/tools/mri_convert|mri_convert]]/the FreeSurfer
  I/O library can read; in practice `mgz`/`mgh`. Must exist
  ([`scripts/mergeseg:162-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L162-L165)).
- **Merge segmentation** (`--merge`) — the label volume to paste on top. Must
  exist ([`scripts/mergeseg:171-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L171-L174)).
- **Output path** (`--o`) — where to write the merged result.

### Input Assumptions

> [!assumption] Source and merge share the same voxel grid
> The merge is done by per-voxel masking and addition
> ([`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L88) then [`fscalc … sum`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L110)),
> so the two volumes must occupy the **same dimensions and geometry**. The
> script sets `FS_MRIMASK_ALLOW_DIFF_GEOM 0`
> ([`scripts/mergeseg:13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L13)), which makes
> [[mri_mask]] **refuse** mismatched geometry rather than silently resampling.
> If the volumes differ, resample one into the other's space first (e.g. with
> [[mri_label2vol]] `--regheader`, as the callers do).

The combine step assumes that, after the source has been masked, the source and
merge label maps **do not overlap** — overlap would add the two label numbers
together (see [Mathematical Foundations](#mathematical-foundations)). Because
[[mri_mask]] zeroes the source under the entire merge region first, this holds by
construction for the normal `--merge` workflow.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<outseg>` (`--o`) | user-specified | the merged segmentation: source labels, with merge labels overwriting where present |
| `<outseg>.log` | alongside the output (default) | command line, environment, version, timing; suppressed with `--nolog`, redirected with `--log` |

If `--ctab` is given, the color table is embedded into `<outseg>` in a final
[[wiki/tools/mri_convert|mri_convert]] pass ([`scripts/mergeseg:115-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L115-L120)).

### Output Specifications

The output has the same geometry and dimensions as the inputs. Its data type is
whatever [[fscalc]] writes for an integer-valued sum (typically float `mgz`);
if you need a specific type (e.g. `int`/`uchar` for an `aseg`), convert
afterwards. The label values are: source label numbers outside the merge
support, and either the original merge label numbers, or — if `--segid` was
given — the single constant `segid` everywhere the merge map was non-zero.

## Mathematical Foundations

The merge is three voxelwise array operations. Let $S$ be the source label map
and $M$ the merge label map. The script computes a binary "not-merge" mask, uses
it to zero the source inside the merge footprint, then adds the merge back in:

> [!math] Overlay by mask-and-sum
> 1. Build the complement mask of the merge region:
>    $$\bar{M}(x) = \begin{cases} 1 & M(x) = 0 \\ 0 & M(x) \neq 0 \end{cases}$$
>    via [`mri_binarize --i merge --inv --min 0.5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L75-L81)
>    (or `--match segid` in `--segid-only` mode).
> 2. Keep the source only outside the merge region:
>    $$S'(x) = S(x)\,\bar{M}(x)$$
>    via [`mri_mask src not-merge`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L88).
> 3. Add the (possibly relabelled) merge map:
>    $$O(x) = S'(x) + M'(x)$$
>    via [`fscalc merge sum src-not-merge`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L110),
>    where $M'$ is $M$ itself, or — under `--segid` — $M$ rebinarized so every
>    non-zero merge voxel carries the constant value `segid`
>    ([`mri_binarize … --binval segid`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L96)).

Because step 2 sets the source to zero wherever the merge is present, step 3's
sum reduces to "merge label where merge is present, source label elsewhere" — a
true overwrite, not an arithmetic blend, **provided** the merge map does not
overlap surviving source labels. The arithmetic itself is delegated to
[[mri_binarize]]/[[mri_mask]]/[[fscalc]]; `mergeseg` adds no numerics of its own.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/mergeseg:151-242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L151-L242)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--src` | string | *(required)* | Source segmentation volume to be modified. Must exist. |
| `--merge` | string | *(required)* | Segmentation volume whose non-zero voxels are pasted over the source. Must exist and share the source's geometry. |
| `--o` | string | *(required)* | Output (merged) segmentation path. |
| `--i`<br>`--segid` | int | — | If set, every non-zero voxel of the merge map is written as this single label value instead of keeping the merge's own label numbers. |
| `--segid-only` | int | off | Take **only** voxels equal to this label from the merge map (and write them as that label). Voxels of any other value in the merge map are ignored. Sets `--segid` implicitly to the same value. |
| `--segid-erode` | int | `0` | Erode the selected `--segid-only` region by *N* voxels before merging. Only meaningful with `--segid-only` ([`scripts/mergeseg:194-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L194-L198)). |
| `--ctab` | string | — | Color lookup table (`FreeSurferColorLUT.txt`-style) to embed into the output via [[wiki/tools/mri_convert|mri_convert]] `--ctab`. |
| `--log` | string | `<outseg>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging (sends the log to `/dev/null`). |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir` under the output dir) | Use this scratch directory; also implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory after exit. |
| `--cleanup` | bool | **on** | Remove the temporary directory at the end. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--segid`, `--segid-only`, and bare merge are three different behaviours
> - **No `--segid`:** the merge map's own label numbers are written
>   ([`scripts/mergeseg:106-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L106-L108) — `mergeseg2 = merge`). The merge
>   mask in step 1 uses `--min 0.5`, i.e. **any** non-zero voxel.
> - **`--segid N`:** all non-zero merge voxels are relabelled to `N`
>   ([`scripts/mergeseg:94-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L94-L105)). The mask still uses `--min 0.5`
>   (all non-zero), so the *footprint* is the whole merge map but the *value* is
>   forced to `N`.
> - **`--segid-only N`:** both the mask and the relabel use `--match N`
>   ([`scripts/mergeseg:76-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L76-L81) and [`scripts/mergeseg:97-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L97-L102)),
>   so only voxels already equal to `N` in the merge map are pasted; everything
>   else in the merge map is ignored.

> [!gotcha] `--segid-erode` is silently ignored without `--segid-only`
> The erosion is only applied inside the `if($segidonly)` branches
> ([`scripts/mergeseg:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L78), [`scripts/mergeseg:99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L99)).
> Passing `--segid-erode` together with plain `--segid` (not `--segid-only`) has
> no effect. The help text and the in-code comment both note "only applies to
> `--segid-only`."

> [!gotcha] Geometry mismatch is a hard error, not a resample
> `FS_MRIMASK_ALLOW_DIFF_GEOM` is forced to `0`
> ([`scripts/mergeseg:13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L13)). If the merge and source grids
> differ, the internal [[mri_mask]] step fails and `mergeseg` exits non-zero.
> Resample the merge into the source space (e.g. via [[mri_label2vol]]
> `--regheader`) before calling — this is precisely why the corpus-callosum
> callers map `aseg.auto.conf.mgz` back to native space first.

### Default behaviour when `--segid` is omitted

With only `--src`, `--merge`, `--o`, the script overwrites the source with the
merge's native labels wherever the merge is non-zero — the most common "splice
these structures in" use.

## Typical Use Cases

### Use Case 1: Paste corpus-callosum labels into an aseg (as seg2cc does)

```bash
# ccbin.mgh holds a single CC label (e.g. 251) from mri_cc, in aseg space.
# Overwrite that label into the working aseg, one CC label at a time.
mergeseg --src aseg.auto_noCCseg.mgz --merge ccbin.mgh \
  --o aseg.auto.mgz --segid 251 \
  --ctab $FREESURFER_HOME/FreeSurferColorLUT.txt
```

This forces every non-zero voxel of `ccbin.mgh` to label `251` and writes it
into `aseg.auto.mgz`, leaving all other `aseg` labels untouched. The CC callers
loop this over labels 251–255 (see [[seg2cc]]).

### Use Case 2: Overlay a partial segmentation keeping its own labels

```bash
# Insert extracerebral structures (their own label numbers) into a brain seg.
mergeseg --src brain.seg.mgz --merge xcerebral.seg.mgz --o merged.seg.mgz
```

### Use Case 3: Pull a single label out of a multi-label merge map

```bash
# From a candidate map, paste only label 99, eroded by 1 voxel, into the source.
mergeseg --src src.mgz --merge candidates.mgz --o out.mgz \
  --segid-only 99 --segid-erode 1
```

## Pipeline Context

`mergeseg` is a **helper utility**, not a stand-alone recon-all stage. It is
called from inside several FreeSurfer assembly scripts:

- [[seg2cc]] (which [[wiki/pipelines/recon-all|recon-all]] runs at the **CC Seg**
  stage of `autorecon2`) loops `mergeseg` over CC labels 251–255 to fold
  [[mri_cc]] output back into `aseg.auto.mgz` when the input is non-conformed
  ([`scripts/seg2cc:154-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L154-L155)).
- [[seg2recon]] and [[samseg2recon]] do the same CC merge in their non-conformed
  branch ([`scripts/seg2recon:301-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2recon#L301-L302),
  [`scripts/samseg2recon:376-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/samseg2recon#L376-L377)).
- `xcerebralseg`, `segpons`, `cblumwmgyri`, and `spmseg` also use it to assemble
  composite segmentations.

**Predecessor:** a partial label map (e.g. from [[mri_cc]], resampled to the
target grid) → **mergeseg** → **Successor:** the consuming assembly script's next
step (or directly the final `aseg.auto.mgz`).

## Gotchas and Caveats

> [!gotcha] Output type is not forced to int/uchar
> [[fscalc]] writes the sum in its native (often float) type. An `aseg` is
> conventionally `uchar`/`int`. The callers that need a specific type run a
> separate [[wiki/tools/mri_convert|mri_convert]] afterwards; `mergeseg` itself
> only re-writes the file when `--ctab` is given. If downstream code is
> type-sensitive, convert explicitly.

> [!gotcha] Overlapping labels would be summed, not chosen
> The correctness of the overwrite depends on the source being zeroed under the
> entire merge footprint (step 2). That is guaranteed for the bare/`--segid`
> paths because the mask covers all non-zero merge voxels. But with
> `--segid-only`, only the selected label is masked out of the source; if the
> merge map's *other* labels happened to be non-zero there they are dropped, and
> if the selected merge region overlapped a different surviving source label the
> [[fscalc]] sum would add them. In practice the merge maps used by the callers
> are single-label binarized volumes, so this does not arise.

> [!gotcha] `--tmp/--tmpdir` disables cleanup
> Supplying an explicit temp directory also sets `cleanup = 0`
> ([`scripts/mergeseg:215-220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L215-L220)), so intermediate files are
> left behind unless you add `--cleanup`.

## Error Compensation and Guard Rails

- **Existence checks.** `--src` and `--merge` are verified to exist at parse
  time; missing files abort immediately
  ([`scripts/mergeseg:162-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L162-L165),
  [`scripts/mergeseg:171-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L171-L174)).
- **Required-argument checks.** `check_params` enforces that `--src`, `--merge`,
  and `--o` are all set ([`scripts/mergeseg:250-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L250-L261)).
- **Fail-fast on each sub-command.** After every [[mri_binarize]]/[[mri_mask]]/[[fscalc]]/[[wiki/tools/mri_convert|mri_convert]]
  call the script checks `$status` and jumps to `error_exit` on failure
  ([`scripts/mergeseg:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L85) and following), so a partial output is
  not silently produced.
- **Geometry guard.** `FS_MRIMASK_ALLOW_DIFF_GEOM 0` prevents an accidental
  silent resample (see gotcha above).

## Related Tools

- [[seg2cc]] — primary caller; loops `mergeseg` over CC labels to build `aseg.auto.mgz`.
- [[seg2recon]] / [[samseg2recon]] — also call `mergeseg` for the CC merge in their non-conformed path.
- [[mri_cc]] — produces the corpus-callosum label map that is merged in.
- [[mri_binarize]] — builds the merge/complement masks inside `mergeseg`.
- [[mri_mask]] — zeroes the source under the merge footprint.
- [[fscalc]] — performs the final voxelwise sum.
- [[wiki/tools/mri_convert|mri_convert]] — embeds the color table when `--ctab` is given.
- `xcerebralseg`, `segpons`, `cblumwmgyri`, `spmseg` *(no wiki pages yet)* — other assembly scripts that use `mergeseg`.

## Confidence and Gaps

**High confidence:** the complete flag set, the three label-handling modes
(`--segid`, `--segid-only`, bare), the mask-and-sum algorithm, the geometry
guard, and the cleanup/log behaviour — all read directly from
[`scripts/mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg). The `--help` output matches the source.

No open questions for v8.2.0.

## References

- FreeSurfer source: [`scripts/mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg) (v8.2.0).
- Built-in help: `mergeseg --help` (the `BEGINHELP` block, [`scripts/mergeseg:295-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mergeseg#L295-L303)).
