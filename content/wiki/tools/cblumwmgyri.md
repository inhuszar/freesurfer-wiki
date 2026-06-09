---
title: "cblumwmgyri"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/cblumwmgyri"
families: []                     # standalone cerebellum WM relabelling script
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
  - "[[mergeseg]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[gtmseg]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "fscalc has no wiki page yet; its `and` (logical-AND) semantics are described from cblumwmgyri usage, not from fscalc's own source."
tags:
  - segmentation
  - cerebellum
  - white-matter
  - morphology
  - relabelling
---

# cblumwmgyri

## Summary

`cblumwmgyri` subdivides the **cerebellar white matter** in an existing
segmentation into a **core** component and a **gyral** (branching, leaf-like)
component, using a purely geometric erosion/dilation rule. It erodes then dilates
the segmentation to strip the thin WM that penetrates the folia (leaving the
core), then labels as "gyral WM" the original cerebellar-WM voxels that are *not*
in the core but *are* adjacent to dilated cerebellar grey matter. The new gyral
labels (690 left, 691 right) are merged into a copy of the input segmentation;
core WM keeps its original IDs (7 left, 46 right). Nothing else is altered.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/cblumwmgyri`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri)
- **Original author:** (MGH/Martinos; Doug Greve toolchain)
- **Binary/script location:** `$FREESURFER_HOME/bin/cblumwmgyri`
- **External tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L76) (`--erode-seg`, `--dil-seg`), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L87) (masking), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L115) (logical `and`), [`mergeseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L125) (label merge), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L135) (optional stats), and `fs_temp_dir`.

## Purpose and Context

In FreeSurfer's standard subcortical segmentation, cerebellar white matter is a
single label per hemisphere (7 left, 46 right). For some analyses — notably PET
partial-volume correction, where the geometry of thin WM blades matters — it is
useful to separate the compact **core** of the cerebellar WM from the thin
**gyral** WM that interdigitates with the cerebellar cortex. `cblumwmgyri`
produces that split with a few morphological operations, with no surface model or
training data required.

It is a **standalone** relabelling utility. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]], but it **is** called by
[[gtmseg]] (the geometric transfer matrix segmentation for PET PVC) when its
`SubSegCblumWM` option is set — see [Pipeline Context](#pipeline-context).

> [!gotcha] Only cerebellar WM is touched; cortex and GM are preserved
> The output retains all original segmentations unchanged except that cerebellar
> WM is now split into core (IDs 7/46, kept) and gyral (IDs 690/691, new). The
> help text states cerebellar GM and everything else are unaffected
> ([`scripts/cblumwmgyri#L313-L318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L313-L318)).

## Inputs

### Required Inputs

- **Subject** (`--s`) — a FreeSurfer subject under `$SUBJECTS_DIR` whose
  `mri/<seg>` contains a segmentation with cerebellum split into cortex and WM.
- **Source segmentation** (`--seg`, default `aparc+aseg.mgz`) — read from
  `$SUBJECTS_DIR/<subj>/mri/<seg>`; must contain cerebellar cortex (IDs 8/47)
  and cerebellar WM (IDs 7/46).

### Input Assumptions

> [!assumption] Cerebellum is segmented into cortex (8/47) and WM (7/46)
> The geometric rule relies on the standard FreeSurfer label IDs: left/right
> cerebellum cortex = 8/47, left/right cerebellum WM = 7/46
> ([`scripts/cblumwmgyri#L87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L87), [`#L94-L98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L94-L98)). A segmentation lacking a
> distinct cerebellar-WM label cannot be subdivided. The input is assumed to be a
> standard recon-all `aparc+aseg.mgz` (or equivalent) on the subject's conformed
> grid.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `mri/<seg-stem>+cblumwmgyri.mgz` (or `--o`) | [[mgz]] | Copy of the input segmentation with cerebellar WM split: core WM 7/46, gyral WM **690/691**. |
| `stats/<outseg-stem>.stats` | [[stats-format]] | [[mri_segstats]] summary for the relabelled volume (unless `--no-segstats`). |
| `cblumwmgyri.log` | text | Run log (unless `--no-log`). |

### Output Specifications

The output segmentation is on the input grid (geometry inherited through
[[mergeseg]]/[[mri_binarize]]). New voxel values 690 (left gyral cerebellar WM)
and 691 (right) are added; all other labels, including cerebellar GM, are copied
through unchanged. The optional `.stats` file tabulates a fixed structure list
covering both core and gyral cerebellar WM plus neighbouring structures
([`scripts/cblumwmgyri#L135-L139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L135-L139)).

## Mathematical Foundations

> [!math] Core vs. gyral cerebellar WM by erode–dilate
> Let $S$ be the input segmentation and $n$ = `--n` (default 2). Define the
> **opened** segmentation by an $n$-voxel erosion followed by an $n$-voxel
> dilation of the label map:
> $$S_{\text{open}} = \mathrm{dilate}_n(\mathrm{erode}_n(S)).$$
> A morphological opening removes thin protrusions, so cerebellar WM in
> $S_{\text{open}}$ is the **core**. For each hemisphere with WM id $w$ (7 or 46):
> - $\text{core}^c = \mathbb{1}[\,S_{\text{open}} \neq w\,]$ — *not* in the opened
>   (core) WM (`mri_binarize --match w --inv`);
> - $\text{wm}_0 = \mathbb{1}[\,S = w\,]$ — original cerebellar WM;
> - $\text{cblumGM}^{+} = \mathrm{dilate}_n(\mathbb{1}[\,S_{\text{open}} \in
>   \{8,47\}\,])$ — cerebellar GM (both sides), dilated by $n$.
>
> The **gyral WM** is their logical intersection
> $$\text{gyri} = \text{core}^c \;\wedge\; \text{wm}_0 \;\wedge\;
>   \text{cblumGM}^{+},$$
> i.e. voxels that were cerebellar WM, are not in the core, and lie within $n$
> voxels of cerebellar cortex ([`scripts/cblumwmgyri#L72-L120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L72-L120)). The
> intersection is computed by [`fscalc … and … and …`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L115-L117).

> [!internal] Erosion/dilation and segmentation arithmetic are in the binaries
> The morphological operations live in [[wiki/tools/mri_convert|mri_convert]]
> (`--erode-seg`/`--dil-seg`) and [[mri_binarize]] (`--dilate`, `--match`,
> `--inv`); the voxelwise logical `and` is in `fscalc`; the relabel-merge is in
> [[mergeseg]]. `cblumwmgyri` only sequences them.

## Configuration Options

### Complete Flag Reference

All flags are from the argument parser
([`scripts/cblumwmgyri#L179-L253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L179-L253)). `--help` matches.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--seg` | string | `aparc+aseg.mgz` | Input segmentation (relative to `mri/`) to subdivide. |
| `--o` | string | `<seg-stem>+cblumwmgyri.mgz` | Output segmentation filename (written under `mri/`). |
| `--n` | integer | `2` | Number of erosion = dilation steps defining the core (the morphological opening radius, in voxels). |
| `--no-segstats` | bool | segstats on | Skip the [[mri_segstats]] step. |
| `--sd` | string | `$SUBJECTS_DIR` | Set the subjects directory. |
| `--log` | string | `mri/cblumwmgyri.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Disable logging (`LF=/dev/null`). |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir --scratch`) | Use this scratch directory and **do not** clean it up. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | on | Remove the temporary directory at the end. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print help and exit. |

### Configuration Interactions

> [!gotcha] `--n` sets *both* the erosion and the dilation radius
> The same `--n` value is used for the erosion, the matching dilation that
> reconstructs the core, **and** the GM dilation used to find the gyral band
> ([`scripts/cblumwmgyri#L76-L87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L76-L87)). Larger `--n` shrinks the core and widens
> the gyral band; there is no separate control for the two radii.

> [!gotcha] `--tmp`/`--tmpdir` implies `--nocleanup`
> Passing an explicit temp directory also sets `cleanup = 0`
> ([`scripts/cblumwmgyri#L226-L231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L226-L231)), so the intermediate masks are left
> behind for inspection. `--cleanup` after it re-enables removal.

- The hemispheres are processed in a fixed order (lh then rh) and **chained**:
  the left merge reads the original `--seg` and writes `--o`; the right merge
  reads `--o` and writes `--o` again, accumulating both gyral labels into one
  output ([`scripts/cblumwmgyri#L122-L131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L122-L131)).

## Typical Use Cases

### 1. Default cerebellar WM subdivision

```bash
cblumwmgyri --s bert
# → $SUBJECTS_DIR/bert/mri/aparc+aseg+cblumwmgyri.mgz
#   plus stats/aparc+aseg+cblumwmgyri.stats
```

### 2. Custom segmentation, larger opening, no stats

```bash
cblumwmgyri --s bert --seg aseg.mgz --n 3 \
  --o aseg+cblumwmgyri.mgz --no-segstats
```

### 3. As used inside gtmseg (PET PVC)

```bash
# gtmseg invokes it on its head segmentation with no stats and no log:
cblumwmgyri --s $subject --seg $headseg --n 2 \
  --o $headseg2 --no-segstats --no-log
```

## Pipeline Context

`cblumwmgyri` is **not** called by [[wiki/pipelines/recon-all|recon-all]] or
`trac-all`. It **is** an optional sub-step of [[gtmseg]]: when `SubSegCblumWM` is
enabled, `gtmseg` runs `cblumwmgyri … --n 2 --no-segstats --no-log` on its head
segmentation and renames the result back over that segmentation
([`scripts/gtmseg#L120-L133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L120-L133)).

**Predecessor:** [[mri_aparc2aseg|aparc+aseg.mgz]] from
[[wiki/pipelines/recon-all|recon-all]] (or a [[gtmseg]] head segmentation) →
**cblumwmgyri** → **Successor:** [[gtmseg]] / PET partial-volume correction, or
[[wiki/tools/freeview|freeview]] / `tkmedit` inspection.

## Gotchas and Caveats

> [!gotcha] Gyral labels 690/691 may need adding to your colour table
> The new IDs 690 (left) and 691 (right) gyral cerebellar WM are non-standard.
> To display them with names/colours in [[wiki/tools/freeview|freeview]] or
> `tkmedit`, ensure these entries exist in the active LUT (see [[color-lut]]).

> [!gotcha] Output overwrites in place when re-run
> Re-running writes the same default `<seg>+cblumwmgyri.mgz` under `mri/`; the
> right-hemisphere [[mergeseg]] both reads and writes `--o`
> ([`scripts/cblumwmgyri#L123-L127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L123-L127)), so a clean output requires the left
> pass to have produced a fresh file first.

> [!gotcha] Stats list is fixed
> The optional [[mri_segstats]] call uses a hard-coded `--id` list
> (`7 8 690 46 47 691 16 15 17 53` — cerebellar core/gyral WM and cortex plus
> brainstem and hippocampi) and `--ctab-default`
> ([`scripts/cblumwmgyri#L135-L139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L135-L139)). It does not summarise the whole
> segmentation.

## Error Compensation and Guard Rails

- **Pre-flight checks:** subject directory and the input segmentation must exist,
  else the script aborts ([`scripts/cblumwmgyri#L259-L273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L259-L273)).
- **Step-by-step error trapping:** every `mri_convert`/`mri_binarize`/`fscalc`/
  `mergeseg`/`mri_segstats` call is followed by `if($status) goto error_exit`, so
  a failure in any stage stops the run with `ERROR:`
  ([`scripts/cblumwmgyri#L79-L142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L79-L142), [`#L172-L175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri#L172-L175)).
- **Scratch isolation:** intermediates are written under an auto-created temp
  directory and removed on success (unless `--nocleanup`/`--tmp`).
- No correction is applied if the input lacks cerebellar-WM labels; the
  downstream masks would simply be empty.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — performs the segmentation erosion/dilation (`--erode-seg`/`--dil-seg`) that defines the core.
- [[mri_binarize]] — builds the WM/core/GM masks (`--match`, `--inv`, `--dilate`).
- [[mergeseg]] — merges the new gyral labels (690/691) into the segmentation.
- [[mri_segstats]] — computes the optional `.stats` summary of the relabelled volume.
- [[gtmseg]] — PET geometric-transfer-matrix segmentation that optionally calls this script.
- `fscalc` *(no wiki page yet)* — voxelwise calculator; used here for the logical `and` intersection of the three masks.
- [[color-lut]] — where the non-standard 690/691 gyral-WM entries should be registered for display.

## Confidence and Gaps

**High confidence:** complete flag set, the erode/dilate core definition, the
three-mask intersection rule for gyral WM, the 7/46 → +690/691 labelling, the
hemisphere chaining, and the [[gtmseg]] call site — all read directly from
[`scripts/cblumwmgyri`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri) and [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg), and consistent with `--help`.

> [!gap] `fscalc` semantics
> The voxelwise logical-`and` behaviour of `fscalc` is inferred from its use
> here; `fscalc` does not yet have its own wiki page documenting its operators.

## References

- FreeSurfer source: [`scripts/cblumwmgyri`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cblumwmgyri) (v8.2.0).
- Caller: [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L120-L133) (`SubSegCblumWM` branch).
- Built-in help: `cblumwmgyri --help`.
