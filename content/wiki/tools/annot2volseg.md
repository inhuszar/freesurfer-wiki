---
title: "annot2volseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/annot2volseg"
families: []                     # standalone tcsh wrapper around mris_apply_reg + mri_surf2volseg
recon_all_stage: null
related:
  - "[[mri_surf2volseg]]"
  - "[[mris_apply_reg]]"
  - "[[mri_aparc2aseg]]"
  - "[[mri_label2vol]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - annotation
  - aparc
  - surface-to-volume
  - atlas
  - yeo
---

# annot2volseg

## Summary

`annot2volseg` turns a **surface annotation** (a `.annot` parcellation living on a
spherical surface) into a **volumetric segmentation** for a target subject. It
maps an annotation defined on one subject (commonly an average such as
`fsaverage`, e.g. the Yeo 7- or 17-network atlas) onto a second subject's surface
via spherical registration, then fills the cortical ribbon of that subject's
volume with the mapped parcels — merging the result with an existing whole-brain
volume segmentation (the `aseg` by default) to produce an `aparc+aseg`-style
volume in which cortex voxels carry the annotation's labels. Optionally it can
also label the adjacent white matter (`--label-wm`, as in `wmparc`). It is the
general, atlas-agnostic counterpart to [[mri_aparc2aseg]], driven entirely by
[[mris_apply_reg]] (surface mapping) and [[mri_surf2volseg]] (surface-to-volume
fill).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/annot2volseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/annot2volseg`
- **Key helpers invoked:**
  [`mris_apply_reg --src-annot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L113) (resample the annotation from the source
  subject's sphere to the target subject's sphere) and
  [`mri_surf2volseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L94) (fill the volume cortex/WM from the mapped
  annotation and surfaces). Uses
  [`UpdateNeeded`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L111) for skip-if-up-to-date.

## Purpose and Context

FreeSurfer's standard cortical volume segmentation, `aparc+aseg.mgz`, is built
inside recon-all by [[mri_aparc2aseg]] from the Desikan-Killiany annotation, with
atlas-specific refinement. But researchers frequently want a *different*
parcellation projected into the volume — most commonly a functional atlas defined
on `fsaverage` (Yeo networks, or any custom `.annot`). `annot2volseg` provides
that path generically:

1. **Map** the annotation from the annotation-subject's sphere
   (`?h.sphere.reg`) onto the target subject's sphere via [[mris_apply_reg]],
   writing `surf/?h.<annot>.annot` for the target.
2. **Fill** the target's cortical ribbon in the volume from that mapped annotation
   and the white/pial surfaces via [[mri_surf2volseg]] `--label-cortex`, merging
   into the base volume segmentation (`aseg.mgz`), producing
   `mri/<annot>+<baseseg>.mgz`.

It is run **by hand**, after recon-all. It deliberately uses only the surface
registration and does **not** apply the atlas-specific fine-tuning that recon-all
performs; the in-source note and help both warn that applying the *standard*
`aparc` this way is not the preferred method
([`scripts/annot2volseg:276-280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L276-L280),
[`scripts/annot2volseg:459-462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L459-L462)).

## Inputs

### Required Inputs

- **Target subject** (`--s`) — the subject whose volume gets segmented; must exist
  under `$SUBJECTS_DIR`. Its `surf/?h.sphere.reg`, `surf/?h.white`,
  `surf/?h.pial`, and `label/?h.cortex.label` are used.
- **Annotation source** — either an **annotation subject** (`--s-annot`, e.g.
  `fsaverage`) whose `label/?h.<annot>.annot` and `surf/?h.sphere.reg` exist, or
  explicit per-hemisphere annotation files via `--lh-annot`/`--rh-annot`. The
  source sphere is always taken from the annotation subject.
- **Annotation name** (`--annot`) — the base name (no hemi, no extension), e.g.
  `Yeo2011_7Networks_N1000`. Looked up as
  `<annot-subject>/label/?h.<annot>.annot` unless overridden by
  `--lh-annot`/`--rh-annot`.
- **Base segmentation** — `<target>/mri/<baseseg>.mgz` (default `aseg.mgz`,
  [`scripts/annot2volseg:402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L402)); the cortex labels are written into a copy of
  this, so it must exist.

All required surfaces/annotations are existence-checked per hemisphere before
running ([`scripts/annot2volseg:389-412`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L389-L412)).

### Input Assumptions

> [!assumption] Both subjects fully reconstructed and spherically registered
> The tool assumes a completed recon-all for the target (white/pial surfaces,
> `?h.cortex.label`, `?h.sphere.reg`, and the base `aseg.mgz`) and an annotation
> subject with the named `.annot` and its `?h.sphere.reg`. Mapping is purely
> surface-registration-based: accuracy depends on the quality of both spherical
> registrations. The base numbers (below) must be chosen so the new cortical
> labels do not collide with labels already present in the base segmentation.

> [!gotcha] `--annot aparc` / `aparc.a2009s` is refused
> The argument parser hard-rejects `--annot aparc` and `--annot aparc.a2009s`
> ("ERROR: do not use ...", [`scripts/annot2volseg:219-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L219-L222)), and the
> `--aparc` shortcut is disabled with "Don't use --aparc" and an immediate exit
> ([`scripts/annot2volseg:275-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L275-L281)). For the standard atlases use
> [[mri_aparc2aseg]] inside recon-all instead — that path refines the parcellation;
> this tool intentionally does not.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `?h.<annot>.annot` | `<target>/surf/` | The annotation resampled from the annotation subject onto the target subject's surface |
| `<annot>+<baseseg>.mgz` (default; cortex run) | `<target>/mri/` | The base segmentation with the cortical ribbon relabelled by the mapped annotation (`aparc+aseg`-style) |
| `<baseseg>.wm.mgz` (with `--label-wm`) | `<target>/mri/` | White-matter labelled like `wmparc` (see WM note below) |
| `<outbase>.mgz` (with `--o`) | `<target>/mri/` | Output under a user-chosen base name instead of the default |
| log file | `<target>/scripts/log/annot2volseg.Y…log` (or `--log`) | Timestamped command log |

> [!gotcha] Output name flips between cortex and WM modes
> When `--o` is **not** given, the default output name depends on the mode
> ([`scripts/annot2volseg:138-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L138-L148)): the cortex run writes
> `<annot>+<baseseg>.mgz` (and passes [[mri_surf2volseg]] `--label-cortex`),
> whereas `--label-wm` writes `<baseseg>.wm.mgz` (and passes `--label-wm`). Note
> the WM output is named from the **base** seg, not the annotation — so the
> recommended WM workflow first builds the cortical seg, then re-runs with that
> cortical seg as `--baseseg` (see Typical Use Cases).

### Output Specifications

The volume outputs share the geometry/voxel size/orientation of the base
segmentation (a [[mgz]] label volume). Cortex voxels receive labels of the form
`base + annotation_index` (left uses `lhbase`, right uses `rhbase`); all other
voxels keep their base-segmentation label. The embedded colour table is the
FreeSurfer default LUT unless `--ctab` supplies one
([`scripts/annot2volseg:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L95)).

## Mathematical Foundations

There is **no numerical model** in this script — it is a mapping/fill pipeline. The
only "arithmetic" is label index assignment:

> [!math] Cortical label index
> A cortex voxel assigned annotation index $k$ (the per-hemisphere entry in the
> annotation's colour table) receives the volume label
> $$L = \text{base}_{\text{hemi}} + k,\qquad
> \text{base}_{\text{hemi}} \in \{\text{lhbase}, \text{rhbase}\}.$$
> The base offsets keep left and right disjoint and away from the base
> segmentation's existing labels; they also become the row indices the output
> expects in the colour LUT ([`scripts/annot2volseg:470-485`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L470-L485)). Defaults are
> `lhbase = 1000`, `rhbase = 2000` ([`scripts/annot2volseg:17-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L17-L18)); the Yeo
> shortcuts use higher, non-colliding ranges (see flag table).

> [!internal] The surface→volume fill lives in mri_surf2volseg
> Deciding which voxels are cortex (between white and pial, within
> `?h.cortex.label`) and assigning them the annotation label is implemented in
> [[mri_surf2volseg]]; the annotation resampling (sphere→sphere barycentric
> mapping) is implemented in [[mris_apply_reg]]. `annot2volseg` only constructs
> their command lines and merges per-hemisphere arguments.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/annot2volseg:193-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L193-L349)). Boolean flags take no argument.

#### Core inputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string (subject) | *(required)* | Target subject whose volume is segmented. |
| `--s-annot` | string (subject) | *(required unless --lh/rh-annot)* | Subject the annotation is defined on (e.g. `fsaverage`). |
| `--annot` | string (name) | *(required)* | Annotation base name, no hemi/extension (e.g. `Yeo2011_7Networks_N1000`). Rejects `aparc`/`aparc.a2009s`. |
| `--lh-annot` | string (path) | — | Explicit left annotation file (when not in `<annot-subject>/label`). Still requires `--annot` for naming. |
| `--rh-annot` | string (path) | — | Explicit right annotation file. Still requires `--annot`. |
| `--base-seg`<br>`--baseseg` | string (stem) | `aseg` | Base volume segmentation `<target>/mri/<stem>.mgz` to merge cortex (or WM) into. |
| `--o` | string (base) | `<annot>+<baseseg>` (or `<baseseg>.wm` for WM) | Output base name; result is `mri/<outbase>.mgz`. |

#### Label numbering and atlas shortcuts

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lh-base`<br>`--lhbase` | int | `1000` | Offset added to left annotation indices → left cortex label ids. |
| `--rh-base`<br>`--rhbase` | int | `2000` | Offset added to right annotation indices → right cortex label ids. |
| `--yeo7` | bool | off | Shortcut: `--s-annot fsaverage`, `--annot Yeo2011_7Networks_N1000`, `lhbase=15000`, `rhbase=15010`. |
| `--yeo17` | bool | off | Shortcut: `--s-annot fsaverage`, `--annot Yeo2011_17Networks_N1000`, `lhbase=15100`, `rhbase=15120`. |
| `--aparc` | bool | **disabled** | Refuses to run ("Don't use --aparc", immediate exit). Present only as a documented dead-end; use [[mri_aparc2aseg]]. |
| `--ctab` | string (path) | FS default LUT | Colour table to embed in the output volume. Must exist. |

#### White matter, hemis, run control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--label-wm` | bool | off | Label white matter (like `wmparc`) instead of cortex; default output becomes `<baseseg>.wm.mgz`. |
| `--lh` | bool | both | Process the left hemisphere only. |
| `--rh` | bool | both | Process the right hemisphere only. |
| `--sd` | string (path) | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--threads` | int | `1` | Threads passed to [[mri_surf2volseg]]. |
| `--force` | bool | off | Force regeneration even if outputs are up to date. |
| `--no-force` | bool | on | Honour the `UpdateNeeded` skip (the default). |
| `--log` | string (path) | timestamped in `scripts/log/` | Log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Set the log file to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string (path) | — | Temp dir (implies `--nocleanup`). The temp dir is computed but **commented out** (`mkdir` disabled), so this is effectively inert. |
| `--nocleanup` / `--cleanup` | bool | — | Temp-dir retention toggles (inert, as above). |
| `--debug` | bool | off | `set echo`/`verbose` tcsh tracing. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

### Configuration Interactions

> [!gotcha] `--label-wm` is a two-pass workflow, not a single switch
> Running `--label-wm` directly on `--baseseg aseg` would label WM next to the
> *aseg* cortex, not your annotation. The intended sequence (from the help,
> [`scripts/annot2volseg:506-520`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L506-L520)) is: **first** build the cortical seg
> (`annot2volseg --s subj --yeo7`), **then** re-run with `--label-wm`, a *new*
> base/WM offset, and `--baseseg <that cortical seg>` so the WM labels are derived
> from your annotation. Example in Typical Use Cases. The WM output name comes from
> the base seg (`<baseseg>.wm.mgz`), which is why the second pass sets
> `--baseseg Yeo2011_7Networks_N1000+aseg`.

> [!gotcha] Base numbers must avoid colliding with the base segmentation
> Cortex labels are `base + index`. Since `aseg.mgz` uses ids well under 1000,
> the default 1000/2000 (or the Yeo 15000+ ranges) are safe; if you pick small
> offsets you can overwrite or alias subcortical labels. The output expects these
> indices to exist in the colour table — you may need a custom `--ctab`
> ([`scripts/annot2volseg:470-485`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L470-L485)).

> [!gotcha] `--lh`/`--rh` restrict the whole run, including the merge
> Selecting a single hemisphere maps and fills only that side; the other
> hemisphere's cortex in the output retains its base-segmentation labels. Use both
> (the default) for a whole-brain annotation seg.

- `--yeo7`/`--yeo17` overwrite `--s-annot`, `--annot`, `lhbase`, and `rhbase`;
  giving them together with conflicting explicit flags is order-dependent (last
  wins) and best avoided.
- `--lh-annot`/`--rh-annot` relax the requirement for `--s-annot` in
  `check_params` ([`scripts/annot2volseg:363-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L363-L368)) but the source sphere
  (`?h.sphere.reg`) is still taken from `--s-annot`, so an annotation subject is
  still effectively needed to define the source registration.

## Typical Use Cases

### 1. Map the Yeo 7-network atlas into a subject's volume

```bash
# Resamples fsaverage Yeo7 onto bert and fills cortex.
# Writes surf/?h.Yeo2011_7Networks_N1000.annot and
#        mri/Yeo2011_7Networks_N1000+aseg.mgz
annot2volseg --s bert --yeo7
```

View it:

```bash
tkmeditfv bert orig.mgz -seg \
  $SUBJECTS_DIR/bert/mri/Yeo2011_7Networks_N1000+aseg.mgz \
  -surfs -annot Yeo2011_7Networks_N1000.annot
```

### 2. Add white-matter labels (wmparc-style) for the Yeo atlas

```bash
# Pass 1: cortical seg (as above)
annot2volseg --s bert --yeo7
# Pass 2: label WM from that cortical seg, with non-colliding offsets
annot2volseg --s bert --yeo7 --label-wm \
  --lh-base 16000 --rh-base 16100 \
  --baseseg Yeo2011_7Networks_N1000+aseg
# → Yeo2011_7Networks_N1000+aseg.wm.mgz
```

### 3. Map a custom annotation that lives outside the annotation subject's label dir

```bash
annot2volseg --s bert --s-annot fsaverage --annot myparc \
  --lh-annot /atlases/lh.myparc.annot \
  --rh-annot /atlases/rh.myparc.annot \
  --lh-base 17000 --rh-base 17200 \
  --ctab /atlases/myparc.lut.txt
```

## Pipeline Context

`annot2volseg` is a **standalone, post-recon-all** tool with **no recon-all
stage** of its own. It mirrors what recon-all does for the built-in atlases
(recon-all calls [[mri_surf2volseg]] `--label-cortex` to make `aparc+aseg.mgz`
and `--label-wm` to make `wmparc.mgz`), but for an arbitrary annotation and
without the atlas-specific refinement.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] on the target subject
(surfaces, `?h.cortex.label`, `?h.sphere.reg`, base `aseg.mgz`) **and** an
annotation defined on an annotation subject (e.g. Yeo on `fsaverage`) →
**annot2volseg** → **Successors:** [[mri_segstats]] (regional stats on the new
seg), or [[mris_anatomical_stats]] for the *surface-side* counterpart — note that
[[mris_anatomical_stats]] tabulates per-parcel cortical statistics directly from
the `?h.<annot>.annot` that this tool also produces, so the surface and volume
analyses can share the same mapped annotation.

## Gotchas and Caveats

> [!gotcha] Not a substitute for recon-all's aparc+aseg
> For the standard Desikan-Killiany/Destrieux atlases, use the recon-all
> [[mri_aparc2aseg]] output; this tool refuses those names and, by design, omits
> the refinement step. It is meant for *other* atlases (Yeo, custom).

> [!gotcha] You may need to hand-build a colour LUT
> Because cortex labels are `base + index`, the standard LUT will not contain your
> chosen indices unless they are pre-registered (the Yeo ranges are). The help
> describes a recipe: dump the annotation's table with
> [[mri_info]] `--ctab`, duplicate it, and shift each copy by `lhbase`/`rhbase`
> ([`scripts/annot2volseg:474-485`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L474-L485)). Without matching LUT rows the labels
> render without names/colours.

> [!gotcha] Temp-dir flags are inert
> `--tmpdir`/`--nocleanup`/`--cleanup` are accepted but the temp directory's
> `mkdir` and cleanup `rm` are commented out
> ([`scripts/annot2volseg:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L67), [`scripts/annot2volseg:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L164)); the
> tool writes intermediates straight into `surf/`/`label/` and never uses a temp
> dir.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** The per-hemisphere annotation mapping
  ([`scripts/annot2volseg:111-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L111-L118)) and the volume fill
  ([`scripts/annot2volseg:150-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L150-L155)) each run only when `UpdateNeeded`
  reports the output older than its inputs; `--force` overrides.
- **Comprehensive existence checks.** Target/annotation subjects, every required
  sphere/surface/annotation, the base seg, and any `--ctab` are verified before
  processing ([`scripts/annot2volseg:359-412`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L359-L412)).
- **Atlas-name guard.** Rejects `aparc`/`aparc.a2009s` and the `--aparc` shortcut
  (see assumptions/gotchas) to steer users to the refined recon-all path.
- **Fail-fast.** Any non-zero status from [[mris_apply_reg]] or
  [[mri_surf2volseg]] jumps to `error_exit`.

## Related Tools

- [[mri_surf2volseg]] — the engine that fills the volume cortex (`--label-cortex`) or white matter (`--label-wm`) from the mapped annotation; the heart of this script.
- [[mris_apply_reg]] — resamples the annotation from the annotation subject's sphere to the target subject's sphere.
- [[mri_aparc2aseg]] — the recon-all tool that builds the *standard* `aparc+aseg`/`wmparc`; the refined alternative this script deliberately does not replace.
- [[mri_label2vol]] — a more general label/annotation-to-volume mapper (single labels or annotations) when you do not want the aseg merge or surface-ribbon semantics.
- [[mris_anatomical_stats]] — computes per-parcel cortical statistics from the same `?h.<annot>.annot` this tool produces (the surface-side counterpart).
- [[wiki/pipelines/recon-all|recon-all]] — produces all the per-subject inputs; uses [[mri_surf2volseg]] internally the same way this script does.

## Confidence and Gaps

**High confidence:** the two-step map-then-fill pipeline, the per-hemisphere
argument construction, the `base + index` labelling and default/Yeo offsets, the
cortex-vs-WM output-name flip and the WM two-pass workflow, the refusal of
`aparc`/`--aparc`, and the inert temp-dir flags — all read directly from
[`scripts/annot2volseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg) and cross-checked against the
recon-all [[mri_surf2volseg]] invocations
([`scripts/recon-all:5082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5082),
[`scripts/recon-all:5121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5121)).

## References

- FreeSurfer source: [`scripts/annot2volseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg) (v8.2.0).
- Built-in help: `annot2volseg --help` (the `BEGINHELP` block,
  [`scripts/annot2volseg:451-525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2volseg#L451-L525)).
- Yeo et al. (2011), *The organization of the human cerebral cortex estimated by
  intrinsic functional connectivity*, J Neurophysiol 106:1125-1165 — the source of
  the `Yeo2011_*Networks_N1000` atlases the `--yeo7`/`--yeo17` shortcuts target.
- Colour LUT: `$FREESURFER_HOME/FreeSurferColorLUT.txt` (contains the Yeo network
  entries).
