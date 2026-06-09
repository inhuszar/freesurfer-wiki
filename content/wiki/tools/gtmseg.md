---
title: "gtmseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gtmseg"
families: []                     # standalone tcsh wrapper (drives mri_gtmseg)
recon_all_stage: null            # not in recon-all; run by post-recon-all
related:
  - "[[mri_gtmseg]]"
  - "[[mri_gtmpvc]]"
  - "[[xcerebralseg]]"
  - "[[mri_segstats]]"
  - "[[mri_annotation2label]]"
  - "[[cblumwmgyri]]"
  - "[[post-recon-all]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact set of segments and indices added by xcerebralseg (pons, vermis, shell-WM, cerebellum-WM gyri) is described from the gtmseg/xcerebralseg help text and the merge logic in mri_gtmseg, not re-derived voxel-by-voxel."
tags:
  - pet
  - segmentation
  - gtm
  - partial-volume-correction
  - petsurfer
---

# gtmseg

## Summary

`gtmseg` is the high-level tcsh driver that builds the **high-resolution
anatomical segmentation** consumed by PETsurfer's geometric-transfer-matrix
(GTM) partial-volume correction. It does not perform the segmentation itself;
instead it orchestrates a small pipeline: first it calls
[[xcerebralseg]] to construct a *whole-head* segmentation (brain + approximate
extra-cerebral CSF, skull, air cavities, and the rest of the head, plus pons and
vermis), then it calls the C++ workhorse [[mri_gtmseg]] to upsample that volume,
overlay the cortical parcellation, optionally subsegment white matter into lobes,
and emit a single labelled volume (default `gtmseg.mgz`, or
`gtmseg.samseg.mgz` when the SAMSEG head segmentation is used) into
`$SUBJECTS_DIR/<subject>/mri/`. That volume — together with its colour table —
is the segmentation you pass to [[mri_gtmpvc]] (`--gtmseg`). `gtmseg` also
handles custom cortical parcellations, custom subcortical merges, cerebellum-WM
subsegmentation, and an optional segmentation-stats pass.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/gtmseg`
- **Core helpers invoked:**
  [`xcerebralseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L108) (whole-head seg, default engine),
  [`mri_gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L147) (the actual GTM segmentation builder),
  [`cblumwmgyri`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L125) (cerebellum-WM subsegmentation, optional),
  [`mri_annotation2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L138) (lobe annotation for WM subseg),
  [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L173) (optional stats), and the FreeSurfer shell utilities `fs_temp_dir`, `UpdateNeeded`, and `fname2stem`.

## Purpose and Context

PET images suffer from **partial-volume effects** (PVE): the scanner's finite
spatial resolution (point spread function, PSF) blurs activity across tissue
boundaries, so a small or thin structure (e.g. the cortical ribbon) is
contaminated by the activity of its neighbours. The geometric transfer matrix
method models this blurring explicitly: it requires a segmentation that
partitions the head into regions of homogeneous expected uptake, **including
extra-cerebral tissue** (to model spill-in from outside the brain) and at a
**resolution finer than the native anatomical voxel** (to localise the thin
cortex accurately).

`gtmseg` produces exactly that segmentation. Conceptually:

1. **Whole-head segmentation** — [[xcerebralseg]] merges the FreeSurfer brain
   segmentation (`aparc+aseg`-derived) with approximate extra-cerebral labels
   (sulcal CSF, skull, air, soft tissue) to make `apas+head.mgz` (GCA engine) or
   `apas+head.samseg.mgz` (SAMSEG engine). Pons and vermis are added by default.
2. **GTM segmentation** — [[mri_gtmseg]] takes that head segmentation, upsamples
   it by the **upsampling factor** (USF, default 2 → 0.5 mm voxels), uses the
   surface tessellations + cortical annotation to place each cortical parcel,
   relabels corpus callosum and WM hypointensities as white matter (unless
   `--keep-cc`/`--keep-hypo`), and writes `gtmseg.mgz` plus a matching colour
   table `gtmseg.ctab`.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; a finished
`recon-all` subject is the *input*. In FreeSurfer 8 it is run for you by
[[post-recon-all]] (`--gtmseg`), which invokes `gtmseg --s <subject> --xcerseg
--samseg`. Otherwise you run it by hand once per subject before
[[mri_gtmpvc]].

> [!gotcha] This is a wrapper, not the segmenter
> All of the heavy lifting (upsampling, cortex placement, WM relabelling, colour
> table generation) happens inside the C++ binary [[mri_gtmseg]]. `gtmseg` exists
> to assemble the whole-head input via [[xcerebralseg]] and to translate its own
> friendly flags into the right `mri_gtmseg` command line
> ([`scripts/gtmseg:147-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L147-L164)). When in doubt about *what a flag
> actually does to the voxels*, read the [[mri_gtmseg]] page.

## Inputs

### Required Inputs

- **A FreeSurfer subject** — given with `--s <subject>`. The subject must already
  exist under `$SUBJECTS_DIR` and must be a completed [[wiki/pipelines/recon-all|recon-all]]
  run, because the downstream tools read the surfaces (`?h.white`, `?h.pial`),
  the cortical annotation (`?h.aparc.annot`), `aparc+aseg.mgz`, and `norm.mgz`.
  The existence check is at [`scripts/gtmseg:441-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L441-L444).

The **head segmentation** (`apas+head.mgz` / `apas+head.samseg.mgz`) is normally
*produced* by `gtmseg` via [[xcerebralseg]], but you can supply a pre-built or
hand-edited one with `--head`.

### Input Assumptions

> [!assumption] A complete recon-all subject in native conformed space
> `gtmseg` assumes a finished `recon-all` for the subject: white/pial surfaces,
> the `?h.aparc.annot` cortical parcellation, and `aparc+aseg.mgz` must all be
> present, all in the standard 256³, 1 mm conformed anatomical space. The
> cortical GM is taken from the annotation (default `aparc`), the subcortical GM
> from the brain segmentation, and the whole head is built around them by
> [[xcerebralseg]]. The script does **not** validate the surfaces; missing files
> surface as errors from `mri_gtmseg`/`xcerebralseg`, not from `gtmseg` itself.

> [!gotcha] The cortex in a custom `--head` seg must already be ribbon-fixed
> The script comment is explicit ([`scripts/gtmseg:95-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L95-L107)):
> `mri_gtmseg` will **not** fix the cortical ribbon. If you pass your own
> `--head` segmentation, its cortex must already have been corrected against the
> ribbon (e.g. via `mri_surf2volseg`). The cortical *labels* can still be
> replaced by a different annotation with `--ctx-annot`, but the geometry of the
> cortex band is taken as-is.

## Outputs

### Files Created

All paths are relative to `$SUBJECTS_DIR/<subject>/`.

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `gtmseg.mgz` (GCA) or `gtmseg.samseg.mgz` (SAMSEG, the default) | `mri/` | The high-resolution GTM segmentation volume. Name set by `--o`; the SAMSEG default rename happens at [`scripts/gtmseg:476-479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L476-L479). |
| `gtmseg.ctab` (or `<stem>.ctab`) | `mri/` | Colour/anatomy table for the output volume, written by `mri_gtmseg`. Carries the tissue-type schema needed by [[mri_gtmpvc]]. |
| `apas+head.mgz` or `apas+head.samseg.mgz` | `mri/` | Whole-head segmentation, created by [[xcerebralseg]] when `--xcerseg` is set (or auto-created if absent). |
| `gtmseg.stats` (or `<stem>.stats`) | `stats/` | Per-segment stats, only with `--seg-stats` ([`scripts/gtmseg:166-179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L166-L179)). |
| `<outvol>.log` | `scripts/log/` | Full log; a previous log is renamed with the PID appended ([`scripts/gtmseg:78-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L78-L81)). |

### Output Specifications

The output is a single-frame integer label volume in the subject's **native
anatomical space**, **upsampled by the USF** (default 2 → 0.5 mm isotropic; USF=1
→ 1 mm). Each voxel carries an integer segmentation index; the accompanying
`.ctab` maps indices → names → RGBA → **tissue type** (the tissue-type schema is
what lets [[mri_gtmpvc]] group ROIs into GM/WM/CSF). See [[color-lut]] for the
colour-table / tissue-type concept and [[mgz]] for the volume format. The exact
index assignment (cortex = annotation base + parcel, etc.) is performed by
[[mri_gtmseg]].

## Mathematical Foundations

`gtmseg` itself performs **no numerical computation** — it is a dispatcher. The
only arithmetic in the script is run-time bookkeeping (elapsed seconds → hours).

> [!internal] The segmentation algorithm lives in mri_gtmseg
> Upsampling by the USF, ray-casting the surfaces to label the cortical ribbon,
> assigning each cortical parcel its annotation-derived index, relabelling
> corpus callosum / hypointensities, and (with `--subseg-wm`) splitting WM into
> lobar sub-ROIs all happen inside the C++ binary. See [[mri_gtmseg]] for the
> details, and [[mri_gtmpvc]] for the GTM model itself
> ($y = \mathrm{GTM}\,\beta$, where the GTM columns are the PSF-blurred
> region indicator functions).

The one place `gtmseg` encodes a *modelling* choice directly is the **WM
subsegmentation distance** `--dmax` (default 5), passed straight through to
`mri_gtmseg --dmax`: it is the distance threshold used when assigning WM voxels
to lobar sub-regions ([`scripts/gtmseg:151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L151)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gtmseg:219-429`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L219-L429)). Boolean flags take no argument.
Defaults are the script's initial variable settings
([`scripts/gtmseg:6-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L6-L35)).

#### Subject and head segmentation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--o` | string | `gtmseg.mgz` / `gtmseg.samseg.mgz` | Output volume name, relative to `mri/`. With `--samseg` (default), an unspecified output is renamed to `gtmseg.samseg.mgz`. |
| `--xcerseg` | bool | auto | Run [[xcerebralseg]] to (re)create the head seg `apas+head[.samseg].mgz`. Implied if the head seg is absent. |
| `--no-xcerseg` | bool | auto | Do not run `xcerebralseg`; use the existing head seg as-is. |
| `--head` | string | `apas+head[.samseg].mgz` | Use this head segmentation (in `mri/`) instead of building one; implies `--no-xcerseg`. |
| `--samseg` | bool | **on** | Build the head seg with SAMSEG (→ `apas+head.samseg.mgz`). |
| `--no-samseg` | bool | — | Build the head seg with the legacy GCA path (→ `apas+head.mgz`). |
| `--xcthresh` | float | — | `mri_seghead` threshold, forwarded to `xcerebralseg --thresh`. |
| `--no-pons` | bool | add pons | When running `xcerseg`, do **not** add the pons segment. |
| `--no-vermis` | bool | add vermis | When running `xcerseg`, do **not** add the vermis segment. |
| `--threads`<br>`--nthreads` | int | `1` | Thread count; **only** affects the `xcerebralseg` step. |

#### Resolution and WM handling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--usf` | int | `2` | Upsampling factor. USF=2 → 0.5 mm voxels, USF=1 → 1 mm. Higher = more accurate cortex, more disk/compute downstream. |
| `--output-usf` | int | = `--usf` | Override the *output* USF independently of the working USF (debugging). |
| `--subsegwm`<br>`--subseg-wm`<br>`--wmsubseg`<br>`--wm-subseg` | bool | off | Subsegment cerebral WM into lobes (adds `mri_gtmseg --subseg-wm`). |
| `--no-subsegwm` | bool | — | Do not subsegment WM (also clears any `--wm-annot`). |
| `--dmax` | float | `5` | Distance threshold for the WM-lobe subsegmentation. |
| `--wm-erode` | int | `0` | Erode cerebral WM (ids 2, 41) by N voxels, relabelling the eroded shell as 5001/5002 (Left/Right-Shell-Cerebral-White-Matter). |
| `--keep-hypo`<br>`--no-label-hypo` | bool | off (relabel) | Keep WM **hypointensities** as their own label instead of relabelling them as WM. |
| `--no-keep-hypo`<br>`--label-hypo` | bool | — | Relabel hypointensities as WM (the default). |
| `--keep-cc`<br>`--no-label-cc` | bool | off (relabel) | Keep the **corpus callosum** as its own label instead of relabelling it as WM. |
| `--label-cc` | bool | — | Relabel CC as WM (the default). |
| `--subseg-cblum-wm` | bool | off | Subsegment cerebellum WM into a core + gyri (gyri become `CbmWM_Gyri_{Left,Right}`, ids 690/691) via [[cblumwmgyri]]. |
| `--no-subseg-cblum-wm` | bool | — | Disable cerebellum-WM subsegmentation. |

#### Parcellation, colour table, and merges

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ctx-annot` | `annot lhbase rhbase` | `aparc 1000 2000` | Cortical annotation + per-hemisphere index bases. Output cortex indices = base + parcel; bases ≥ 1000 mark the labels as cortex. E.g. `aparc.a2009s.annot 11100 12101`. |
| `--wm-annot` | `annot lhbase rhbase` | `lobes 3200 4200` (with `--subsegwm`) | WM annotation + index bases for WM subsegmentation; setting it implies `--subsegwm`. |
| `--ctab` | string | — | Explicit colour table to use for the output volume. |
| `--merge` | `segname segid1 [segid2 …]` | — | Merge the listed seg IDs from `mri/<segname>` into the output (custom subcortical labels). IDs are read until the next `-`-prefixed token. |
| `--merge-ctab` | string | — | Colour table (with a tissue-type schema) for the merged IDs. Must exist. |

#### Stats, logging, run control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--seg-stats` | bool | off | After segmenting, run `mri_segstats` → `stats/<stem>.stats` (with `--etiv`, excluding id 0). |
| `--no-seg-stats` | bool | — | Skip the stats pass (default). |
| `--force` | bool | off | Force re-run / overwrite even if outputs are newer than inputs; also forces `xcerebralseg` to rebuild the head seg. |
| `--no-force` | bool | — | Honour the `UpdateNeeded` timestamp check (default). |
| `--log` | string | `scripts/log/<outvol>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | `fs_temp_dir --scratch` | Temporary directory; specifying it implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Delete the temporary directory at the end. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

### Configuration Interactions

> [!gotcha] `--samseg` (default) silently changes BOTH the head seg and the output name
> Because `--samseg` is on by default, `check_params` rewrites the head
> segmentation to `apas+head.samseg.mgz` and, if you did not pass `--o`, renames
> the output to `gtmseg.samseg.mgz` ([`scripts/gtmseg:476-479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L476-L479)). The
> help text and the `BEGINHELP` example still say plain `gtmseg.mgz`, which is
> only produced if you add `--no-samseg`. **[[mri_gtmpvc]] must be pointed at
> whichever name was actually written.** This rename runs *after* argument
> parsing, so it overrides the default `gtmseg.mgz` set at the top of the script.

> [!gotcha] Head seg exists but no `--xcerseg`/`--no-xcerseg` → hard error
> If `apas+head[.samseg].mgz` already exists and you give **neither** `--xcerseg`
> **nor** `--no-xcerseg` **nor** `--head`, the script refuses to guess and exits
> with an error telling you to choose ([`scripts/gtmseg:487-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L487-L499)).
> When the head seg is *absent*, it defaults to building one (`DoXCerSeg=1`).

> [!gotcha] `--head` forces `--no-xcerseg`
> Passing `--head <file>` sets `DoXCerSeg=0` ([`scripts/gtmseg:251-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L251-L255)),
> so your supplied segmentation is used verbatim and `xcerebralseg` is not run.
> Combining `--head` with `--xcerseg` later on the command line would re-enable
> rebuilding (flags are processed left to right).

> [!gotcha] `--wm-annot` implies `--subsegwm`; `--no-subsegwm` clears `--wm-annot`
> Setting a WM annotation turns WM subsegmentation on
> ([`scripts/gtmseg:328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L328)); conversely `--no-subsegwm` both disables it and
> discards any annotation you set ([`scripts/gtmseg:331-334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L331-L334)). Order matters
> if you specify both.

> [!gotcha] `--ctab` and `--merge-ctab` are mutually exclusive
> Specifying both is a hard error ([`scripts/gtmseg:514-517`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L514-L517)).

Other interactions:

- `--threads`/`--nthreads` **only** changes the `xcerebralseg` call; the
  `mri_gtmseg` invocation always receives `--threads $threads` too, but the help
  text emphasises the xcerseg case.
- `--no-pons`/`--no-vermis`/`--no-samseg`/`--xcthresh`/`--force` are only
  forwarded **when `xcerebralseg` actually runs** ([`scripts/gtmseg:95-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L95-L118));
  with `--no-xcerseg`/`--head` they have no effect on the existing head seg.
- `--merge` requires its companion `--merge-ctab` (or a tissue type FreeSurfer
  already knows) so that [[mri_gtmpvc]] can classify the merged ROIs; the merge
  IDs you choose **must not collide** with existing `aparc+aseg` indices — there
  is no collision check ([`scripts/gtmseg:632-636`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L632-L636)).

## Typical Use Cases

### 1. Standard PETsurfer segmentation (SAMSEG head seg)

```bash
# Build everything from a finished recon-all subject.
# Produces mri/gtmseg.samseg.mgz (+ .ctab) and mri/apas+head.samseg.mgz.
gtmseg --s subject --xcerseg
```

This is essentially what [[post-recon-all]] runs (it adds `--samseg`
explicitly). Feed the result to [[mri_gtmpvc]]:

```bash
mri_gtmpvc --i pet.nii.gz --reg pet2anat.lta \
  --seg gtmseg.samseg.mgz --psf 6 --default-seg-merge \
  --auto-mask 1 0.01 --mgx 0.01 --o gtmpvc.output
```

### 2. Legacy GCA head seg, plain output name

```bash
# Use the older (non-SAMSEG) whole-head segmentation → gtmseg.mgz
gtmseg --s subject --no-samseg --xcerseg
```

### 3. Keep hypointensities, subsegment WM, 1 mm output

```bash
# Matches the BEGINHELP example: WM split into lobes, hypos preserved,
# CC relabelled as WM, USF=1 (1 mm voxels).
gtmseg --s subject --no-samseg --keep-hypo --subsegwm \
  --o gtmseg.wmseg.hypo.mgz --usf 1
```

### 4. Higher-order cortical parcellation (Destrieux)

```bash
# Use aparc.a2009s as the cortical annotation; bases chosen to match
# FreeSurferColorLUT.txt.
gtmseg --s subject --xcerseg \
  --ctx-annot aparc.a2009s.annot 11100 12101
```

### 5. Merge a custom subcortical segmentation

```bash
# Transfer labels 801 and 802 from mri/myseg.mgz into the output.
gtmseg --s subject --merge myseg.mgz 801 802 \
  --merge-ctab myseg.ctab --o gtmseg+myseg.mgz --xcerseg
```

## Pipeline Context

`gtmseg` is a **post-processing** tool: it runs *after* a complete
[[wiki/pipelines/recon-all|recon-all]] and *before* PET PVC.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (surfaces + `aparc+aseg`)
→ **gtmseg** (`xcerebralseg` → `mri_gtmseg`) → **Successor:** [[mri_gtmpvc]]
(GTM partial-volume correction) → [[gtmstats2table]] (aggregate stats across
subjects).

It is **not** invoked inside `recon-all`. In FreeSurfer 8 it is driven by
[[post-recon-all]], which runs it as
`gtmseg --s <subject> --xcerseg --samseg`
([`scripts/post-recon-all:327-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L327-L340)); a failure there is non-fatal
(logged to `post-recon-all.gtmseg.hardfailure.txt` and processing continues).

## Gotchas and Caveats

> [!gotcha] The default output is `gtmseg.samseg.mgz`, not `gtmseg.mgz`
> See the configuration-interaction note: because `--samseg` is the default, an
> unnamed output becomes `gtmseg.samseg.mgz`. Scripts and the `mri_gtmpvc`
> `--seg` argument must use the actual name.

> [!gotcha] "Subsegment WM" is on at the prose level but the wrapper passes `--no-subseg-wm` by default
> The `BEGINHELP`/usage text lists `--subsegwm` as "(default)", but the script
> variable `SubSegWM` starts at 0 and the wrapper explicitly sends
> `mri_gtmseg --no-subseg-wm` unless you ask for it
> ([`scripts/gtmseg:151-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L151-L152)). Code wins: **WM is not subsegmented unless
> you pass `--subsegwm`/`--wm-annot`.**

> [!contradiction] Help says "(default)" for `--subsegwm`; code defaults it off
> The usage line `--subsegwm : subsegment WM into lobes (default)`
> ([`scripts/gtmseg:549`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L549)) contradicts the initialiser `set SubSegWM = 0`
> ([`scripts/gtmseg:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L10)) and the explicit `--no-subseg-wm` in the
> default command. Treat WM subsegmentation as **opt-in**.

> [!gotcha] Cerebellum-WM subseg overwrites the head seg in place
> `--subseg-cblum-wm` runs [[cblumwmgyri]] to a temporary name and then `mv`s it
> back over `apas+head[.samseg].mgz` ([`scripts/gtmseg:122-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L122-L133)), so the
> head seg on disk is modified.

> [!gotcha] Custom-merge index collisions are not checked
> When using `--merge`, you must ensure the IDs you transfer do not already exist
> in `aparc+aseg.mgz`; the script and `mri_gtmseg` do not detect a collision
> ([`scripts/gtmseg:634-636`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L634-L636)).

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Before calling `mri_gtmseg`, `UpdateNeeded` compares
  the output (and annotations / head seg / merge seg) against their inputs; an
  up-to-date output is left alone ([`scripts/gtmseg:145-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L145-L146)). The optional
  stats pass has its own `UpdateNeeded` guard ([`scripts/gtmseg:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L171)).
  `--force` overrides both.
- **Annotation auto-extension.** If `?h.<annot>` is not found, the script also
  tries `?h.<annot>.annot` and uses that, for both `--ctx-annot` and
  `--wm-annot` ([`scripts/gtmseg:446-474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L446-L474)).
- **Head-seg auto-create.** A missing head segmentation triggers an automatic
  `xcerebralseg` run rather than an error ([`scripts/gtmseg:481-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L481-L486)).
- **Fail-fast on subtool error.** Any non-zero status from `xcerebralseg`,
  `cblumwmgyri`, `mri_annotation2label`, `mri_gtmseg`, or `mri_segstats` jumps to
  `error_exit` and aborts the whole run.

## Related Tools

- [[mri_gtmseg]] — the C++ binary that actually builds the segmentation; `gtmseg` is its driver.
- [[xcerebralseg]] — builds the whole-head segmentation (`apas+head[.samseg].mgz`) that `gtmseg` feeds to `mri_gtmseg`.
- [[mri_gtmpvc]] — the downstream consumer; performs GTM partial-volume correction using the `gtmseg` output as `--seg`.
- [[gtmstats2table]] — aggregates the per-subject `gtm.stats.dat` files produced by `mri_gtmpvc` into a group table.
- [[cblumwmgyri]] — cerebellum-WM core/gyri subsegmentation (only with `--subseg-cblum-wm`).
- [[mri_annotation2label]] — generates the lobar annotation used for WM subsegmentation.
- [[mri_segstats]] — computes the optional `--seg-stats` summary.
- [[post-recon-all]] — the FS8 driver that runs `gtmseg` for you after recon-all.
- [[color-lut]] — explains the colour-table / tissue-type schema carried by `gtmseg.ctab`.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the SAMSEG-default
head-seg/output renaming, the WM-subseg opt-in discrepancy, the
`--ctab`/`--merge-ctab` and head-seg-ambiguity error rules, the `UpdateNeeded`
skip logic, and the exact `mri_gtmseg`/`xcerebralseg` command lines — all read
directly from [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg).

> [!gap] Exact added head-seg segments/indices
> The pons, vermis, shell-WM (5001/5002), and cerebellum-WM gyri (690/691)
> labels are described from the help text and the cross-tool comments, not
> re-derived from the [[xcerebralseg]]/[[cblumwmgyri]] voxel operations. See
> those pages for the authoritative index lists.

## References

- FreeSurfer source: [`scripts/gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg) (v8.2.0).
- Built-in help: `gtmseg --help` (the `BEGINHELP` block, [`scripts/gtmseg:578-696`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmseg#L578-L696)).
- Greve DN, et al. *Cortical surface-based analysis reduces bias and variance in kinetic modeling of brain PET data.* NeuroImage 92 (2014) 225–236 — the PETsurfer / GTM method.
- PETsurfer documentation: https://surfer.nmr.mgh.harvard.edu/fswiki/PetSurfer
