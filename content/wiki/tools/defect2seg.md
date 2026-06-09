---
title: "defect2seg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/defect2seg"
families: []                     # standalone topology-defect utility (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[defect-seg]]"
  - "[[mri_label2vol]]"
  - "[[mris_defects_pointset]]"
  - "[[mri_label2label]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[topology-correction]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact voxelization rule used by `mri_label2vol --defects` (e.g. how a vertex-labelled defect is rasterized into the volume, and how overlapping defects are resolved) lives in mri_label2vol/MRIlib, not in this script, and was not traced to the source."
tags:
  - segmentation
  - topology
  - defects
  - surface
  - recon-all
---

# defect2seg

## Summary

`defect2seg` converts the per-vertex topological-defect labels produced by the
FreeSurfer automatic topology fixer into a **volume segmentation**
(`surface.defects.mgz`) plus a **freeview pointset** marking each defect, so that
a user can inspect where the surface had handles/holes before they were
corrected. For each hemisphere it rasterizes the unfixed surface's
`?h.defect_labels` onto the `orig.mgz` grid via
[[mri_label2vol]] (offsetting the left hemisphere defect IDs by 1000 and the
right by 2000 so they do not collide), and writes a pointset of defect centroids
with [[mris_defects_pointset]]. It is invoked automatically by
[[wiki/pipelines/recon-all|recon-all]] during topology fixing, and can also be
run by hand on a finished subject.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/defect2seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg)
- **Binary/script location:** `$FREESURFER_HOME/bin/defect2seg`
- **FreeSurfer tools invoked:** [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L101) (`--defects` mode, the core conversion), [`mris_defects_pointset`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L105) (defect-centroid pointset), and — only with `--cortex` — [`mri_label2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L96) (`--label-cortex`, to build a cortex label in the unfixed space). Also uses the shell helper `fs_temp_dir`.

## Purpose and Context

FreeSurfer reconstructs the cortical surface by first tessellating the white-matter
mask into a closed triangular mesh; because the segmentation is imperfect, that
initial `?h.orig.nofix` mesh almost always contains topological **defects**
(handles and holes that make its Euler number ≠ 2). The
[[topology-correction]] step (`mris_fix_topology`) detects and repairs these,
writing a per-vertex integer label file `?h.defect_labels` in which each defect
has a distinct number and non-defect vertices are 0.

Those labels live on the surface and are not easy to relate back to the anatomy.
`defect2seg` solves that by projecting them into the subject's volume space so the
defects can be overlaid on `orig.mgz`/`brain.finalsurfs.mgz` in freeview, and by
emitting a pointset that drops a marker at each defect. The result is used for
**quality control** of topology fixing — large or numerous defects can indicate a
poor white-matter segmentation that needs editing.

It is run automatically by [[wiki/pipelines/recon-all|recon-all]] (see
[Pipeline Context](#pipeline-context)) and is also called by the `mmppsp` motion-
correction/surface script. It is a close relative of [[defect-seg]] but is
deliberately lighter weight:

> [!gotcha] defect2seg vs. defect-seg — different tools, similar names
> `defect2seg` produces only a **volume segmentation** (via
> [[mri_label2vol]] `--defects`) and a **pointset**. [[defect-seg]] does more:
> it builds text summaries, surface **annotations** on both the unfixed and fixed
> surfaces, binarized masks, per-defect **statistics** (with [[mri_segstats]]),
> and can resample the defects to `fsaverage`. The help text states it plainly:
> *"This script is similar to defect-seg but does not create annotations or
> sample onto fsaverage."* ([`scripts/defect2seg:383-384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L383-L384)).
> They also use different engines: `defect2seg` uses
> [[mri_label2vol]] (label→volume), whereas `defect-seg` uses
> [[mri_surf2vol]] (surface-value→volume). `defect2seg` is the one wired into
> `recon-all`.

## Inputs

### Required Inputs

In **subject mode** (`--s`, the normal way to run it) all inputs are derived from
the recon-all directory; nothing else need be specified. In **manual mode** you
supply the surface, defect-label file, output pointset path, and label offset
explicitly with `--lh`/`--rh`, plus a `--t` template volume.

- **Unfixed surface** `?h.orig.nofix` — the pre-topology-fix tessellation
  ([[surface-format]]). Subject mode reads `surf/?h.orig.nofix$FS_GII`
  ([`scripts/defect2seg:292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L292)).
- **Defect-label overlay** `?h.defect_labels` — one integer defect ID per vertex,
  produced by the topology fixer ([`scripts/defect2seg:293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L293)).
- **Template volume** (`--t`) — the grid on which the segmentation is built;
  subject mode sets it to `mri/orig.mgz` ([`scripts/defect2seg:283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L283)).
- With `--cortex` only: `mri/aseg.presurf.mgz` is read to build a cortex label
  ([`scripts/defect2seg:304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L304)).

Every input path is checked for existence before processing
([`scripts/defect2seg:319-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L319-L324)).

### Input Assumptions

> [!assumption] Runs on a recon-all subject mid-stream
> Subject mode assumes a standard `$SUBJECTS_DIR/<subj>` layout in which
> `surf/?h.orig.nofix` and `surf/?h.defect_labels` already exist — i.e. the
> tessellation and topology-fixing steps of [[wiki/pipelines/recon-all|recon-all]]
> have run. The surface and the `--t` template (`orig.mgz`) must share the same
> voxel geometry, because the defect vertices are placed into the template grid
> by their surface (tkrRAS) coordinates with no resampling.

- `$FS_GII` (default empty) is appended to the surface/label filenames; if set to
  `.gii` the script reads GIFTI rather than binary FreeSurfer surfaces
  ([`scripts/defect2seg:9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L9), [`scripts/defect2seg:292-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L292-L293)).

## Outputs

### Files Created

Output names depend on hemisphere selection. In subject mode:

| File | Where | When | Contents |
|------|-------|------|----------|
| `surface.defects.mgz` | `$SUBJECTS_DIR/<subj>/mri/` | both hemispheres | volume segmentation; LH defect *N* → label `1000+N`, RH defect *N* → label `2000+N` |
| `lh.surface.defects.mgz` | `.../mri/` | `--lh-only` | LH-only segmentation ([`scripts/defect2seg:286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L286)) |
| `rh.surface.defects.mgz` | `.../mri/` | `--rh-only` | RH-only segmentation ([`scripts/defect2seg:289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L289)) |
| `lh.defects.pointset` | `.../surf/` | LH processed | freeview pointset of LH defect locations ([`scripts/defect2seg:294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L294)) |
| `rh.defects.pointset` | `.../surf/` | RH processed | freeview pointset of RH defect locations ([`scripts/defect2seg:300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L300)) |
| `lh.nofix.cortex.label`, `rh.nofix.cortex.label` | `.../label/` | `--cortex` | cortex labels in the unfixed surface space ([`scripts/defect2seg:305-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L305-L306)) |
| `defect2seg.log` | `.../scripts/` | always | command log ([`scripts/defect2seg:282`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L282)) |

In manual mode the output segmentation path is whatever you pass to `--o`, the
pointsets are the third argument of `--lh`/`--rh`, and the log defaults to
`<outdir>/defect2seg.log` ([`scripts/defect2seg:75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L75)).

### Output Specifications

- The segmentation is an integer-labelled volume on the **template** geometry
  (`orig.mgz`, conformed 256³ 1 mm by default — see [[mgz]]). Its values are the
  **offset defect IDs**: `1000 + defectID` for the left hemisphere and
  `2000 + defectID` for the right. The 1000/2000 offsets are hard-coded
  ([`scripts/defect2seg:296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L296), [`scripts/defect2seg:301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L301)) and passed as the
  `regheader`-offset argument to [[mri_label2vol]].
- The colour table to interpret these labels is `$FREESURFER_HOME/DefectLUT.txt`,
  in which every defect entry is magenta (RGB 255 0 255) — this is the "purple
  defects" the help text refers to. (`defect2seg` does not embed the LUT in the
  volume; load it in freeview/tkmedit.)
- The pointset is a freeview waypoint/control-point file (one entry per defect).

## Mathematical Foundations

`defect2seg` itself performs **no numerical computation** — it is an orchestration
script. The geometric work is the rasterization of surface vertex labels into a
volume, which is done entirely inside [[mri_label2vol]]'s `--defects` code path.

> [!internal] Defect rasterization lives in mri_label2vol
> The mapping from per-vertex defect labels on `?h.orig.nofix` to labelled voxels
> on `orig.mgz` (including how each defect's vertices are projected and how the
> 1000/2000 offset is applied) is implemented in
> [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L101)
> and the underlying `MRISlib`/`MRIlib`. See [[mri_label2vol]]. The pointset
> (defect centroids) is computed by [[mris_defects_pointset]].

The only arithmetic in the script is bookkeeping: choosing the `merge` flag (0 for
the first hemisphere, 1 for the second so the RH segmentation is merged into the
existing LH volume rather than overwriting it, [`scripts/defect2seg:119-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L119-L125))
and run-time reporting.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/defect2seg:169-268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L169-L268)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`--subject` | string | — | Subject ID. Enables **subject mode**: derives template (`orig.mgz`), output (`surface.defects.mgz`), surfaces, defect-label files, pointsets, and the 1000/2000 offsets from the recon-all layout ([`scripts/defect2seg:276-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L276-L308)). The simplest way to run the tool. |
| `--o` | string | *(subject mode: `surface.defects.mgz`)* | Output segmentation volume path (**manual mode**). Its parent directory is created if needed. |
| `--t` | string | *(subject mode: `mri/orig.mgz`)* | Template volume defining the output grid (**manual mode**, required if not in subject mode). |
| `--lh` | `surf defects pointset offset` | — | Process the left hemisphere with explicit paths: unfixed surface, defect-label file, output pointset, and integer label offset. Requires 4 arguments. |
| `--rh` | `surf defects pointset offset` | — | Same as `--lh` for the right hemisphere. Requires 4 arguments. |
| `--lh-only` | bool | off (both done) | In subject mode, process only the left hemisphere; output becomes `lh.surface.defects.mgz`. |
| `--rh-only` | bool | off (both done) | In subject mode, process only the right hemisphere; output becomes `rh.surface.defects.mgz`. |
| `--cortex` | bool | off | Constrain defects to within cortex: build a `?h.nofix.cortex.label` with [[mri_label2label]] `--label-cortex` and pass it to both [[mri_label2vol]] and [[mris_defects_pointset]]. **Does not renumber** the defects ([`scripts/defect2seg:362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L362)). |
| `--no-cortex` | bool | on | Do not constrain to cortex (the default). |
| `--sd` | string | `$SUBJECTS_DIR` | Set the subjects directory. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use a specific temporary directory; also disables cleanup. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | on | Remove the temporary directory at the end (default). |
| `--log` | string | `<scripts>/defect2seg.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

> [!gotcha] `--sd` has a tcsh `setenv` typo
> The handler is written `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/defect2seg:228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L228)). In tcsh, `setenv` does **not** take an
> `=`; this assigns the literal `=` as the value of `SUBJECTS_DIR` (the real path
> becomes a second, ignored argument). Prefer exporting `SUBJECTS_DIR` in the
> environment, or use subject mode, rather than relying on `--sd`. See
> [Confidence and Gaps](#confidence-and-gaps).

### Configuration Interactions

> [!gotcha] Subject mode vs. manual mode
> `--lh-only`/`--rh-only`, the automatic offsets (1000/2000), and the
> `aseg.presurf.mgz` cortex source all apply **only** in `--s` subject mode
> ([`scripts/defect2seg:188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L188), [`scripts/defect2seg:303-307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L303-L307)). In manual mode you
> instead give the offset yourself as the 4th argument of `--lh`/`--rh`, and you
> must supply `--t`. Mixing `--s` with `--lh`/`--rh`/`--o`/`--t` is not blocked,
> but subject-mode `check_params` **overwrites** those values
> ([`scripts/defect2seg:276-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L276-L308)) — so the manual values you passed before `--s`
> are silently discarded.

- **At least one hemisphere is mandatory.** If neither `--lh`/`--rh` (manual) nor
  a subject (which sets them) provides a surface, the script errors with
  "must spec at least one surf" ([`scripts/defect2seg:310-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L310-L313)).
- **A template is mandatory** in manual mode ("must spec template",
  [`scripts/defect2seg:314-317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L314-L317)).
- **Two-hemisphere merge order.** When both hemispheres are processed, LH is
  written first (`merge=0`) and RH is merged into the same file (`merge=1`,
  [`scripts/defect2seg:119-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L119-L125)); the 1000/2000 offsets guarantee the two
  label sets do not collide.
- **`--cortex` without a subject** falls back to writing the cortex labels into
  the temp dir (`$tmpdir/?h.nofix.cortex.label`, [`scripts/defect2seg:69-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L69-L72)),
  but the `--label-cortex` call still needs an `aseg`, which is only set in
  subject mode — so `--cortex` is really only useful with `--s`.

## Typical Use Cases

### 1. Standard subject QC (both hemispheres)

```bash
# Build mri/surface.defects.mgz + surf/?h.defects.pointset for a recon-all subject
defect2seg --s subj01
# Then inspect:
tkmeditfv subj01 brain.finalsurfs.mgz -defect
```

This is the canonical invocation and exactly what
[[wiki/pipelines/recon-all|recon-all]] runs.

### 2. One hemisphere only

```bash
defect2seg --s subj01 --lh-only   # → mri/lh.surface.defects.mgz
```

### 3. Constrain to cortex

```bash
# Ignore defects outside the cortical ribbon (defect IDs are NOT renumbered)
defect2seg --s subj01 --cortex
```

### 4. Manual mode (arbitrary surfaces/labels)

```bash
defect2seg --o /tmp/defects.mgz --t orig.mgz \
  --lh lh.orig.nofix lh.defect_labels /tmp/lh.defects.pointset 1000 \
  --rh rh.orig.nofix rh.defect_labels /tmp/rh.defects.pointset 2000
```

## Pipeline Context

`defect2seg` is an **internal QC step of [[wiki/pipelines/recon-all|recon-all]]**.
It runs in the surface stream (**autorecon2**), inside the *Fix Topology* block,
immediately after `mris_fix_topology` has corrected each hemisphere and written
`?h.defect_labels`. The exact recon-all invocation is
([`scripts/recon-all:3783-3787`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783-L3787)):

```tcsh
set cmd = (defect2seg --s $subjid)            # This needs to be updated for remeshing
if($#hemilist == 1) set cmd = ($cmd --$hemilist-only)
if($DefectsCortex)  set cmd = ($cmd --cortex)
```

So recon-all adds `--lh-only`/`--rh-only` when only one hemisphere is being
processed, and `--cortex` when its `-defects-cortex` option is set. The inline
comment notes the call "needs to be updated for remeshing".

It is also called by the `mmppsp` script
([`scripts/mmppsp:630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L630), [`scripts/mmppsp:888`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L888)).

**Predecessor:** `mris_fix_topology` ([[topology-correction]], writes
`?h.defect_labels`) → **defect2seg** → **Successor:** manual QC in
[[wiki/tools/freeview|freeview]]/tkmedit (`-defect`). It produces no input for
later automatic stages — it is purely for visualization.

## Gotchas and Caveats

> [!gotcha] `--cortex` does not renumber defects
> When you constrain to cortex, defect IDs are left unchanged; the volume simply
> omits voxels outside the cortex label ([`scripts/defect2seg:361-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L361-L362)).
> Do not expect a contiguous 1..N relabelling.

> [!gotcha] Output filename changes with hemisphere selection
> In subject mode the default output is `surface.defects.mgz`, but `--lh-only`
> and `--rh-only` redirect it to `lh.surface.defects.mgz` /
> `rh.surface.defects.mgz` ([`scripts/defect2seg:285-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L285-L290)). Downstream/QC
> scripts that hard-code `surface.defects.mgz` will not find a single-hemisphere
> run's output.

> [!gotcha] Labels are offset, not raw defect numbers
> A voxel value of e.g. `1007` means **left-hemisphere defect 7**, and `2007`
> means right-hemisphere defect 7. This is by design so the two hemispheres can
> share one volume; load `DefectLUT.txt` to see the names.

## Error Compensation and Guard Rails

- **Input existence checks.** Every surface, defect-label, template, and (with
  `--cortex`) aseg file is verified before any processing
  ([`scripts/defect2seg:319-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L319-L324)); a missing file aborts with a clear message.
- **Subject existence check.** `--s` verifies `$SUBJECTS_DIR/<subj>` exists
  ([`scripts/defect2seg:277-280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L277-L280)).
- **Fail-fast.** After each `mri_label2label`/`mri_label2vol`/`mris_defects_pointset`
  call the exit status is checked and the script jumps to `error_exit` on failure
  ([`scripts/defect2seg:99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L99), [`scripts/defect2seg:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L104), [`scripts/defect2seg:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L109)).
- No silent data modification beyond the intended label offsetting and
  cortex masking.

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `--sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.

## Related Tools

- [[defect-seg]] — the heavier-weight sibling; adds annotations, statistics, and fsaverage mapping. See the comparison [callout above](#purpose-and-context).
- [[mri_label2vol]] — does the actual surface-label→volume rasterization (`--defects`).
- [[mris_defects_pointset]] — builds the per-defect pointset.
- [[mri_label2label]] — builds the cortex label in unfixed space for `--cortex`.
- [[topology-correction]] — the `mris_fix_topology` step that produces `?h.defect_labels`.
- [[wiki/pipelines/recon-all|recon-all]] — calls `defect2seg` during autorecon2 topology fixing.
- `mmppsp` *(no wiki page yet)* — another caller of `defect2seg`.

## Confidence and Gaps

**High confidence:** complete flag set, subject-vs-manual mode behaviour, the
1000/2000 label offsets, hemisphere-dependent output names, the `--cortex`
no-renumber rule, the two-hemisphere merge logic, and the exact recon-all
invocation — all read directly from
[`scripts/defect2seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg)
and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783).

> [!gap] `--sd` `setenv =` syntax
> The `--sd` handler uses `setenv SUBJECTS_DIR = $argv[1]`, which is not valid
> tcsh `setenv` syntax and almost certainly does not set the directory as
> intended ([`scripts/defect2seg:228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L228)). Treat `--sd` as unreliable; this
> looks like a latent bug rather than intended behaviour.

> [!gap] Exact voxelization rule
> How `mri_label2vol --defects` chooses which voxels a defect occupies (and how it
> handles two defects touching the same voxel) is internal to
> [[mri_label2vol]] and was not traced here.

## References

- FreeSurfer source: [`scripts/defect2seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg) (v8.2.0).
- Built-in help: `defect2seg --help` (the `BEGINHELP` block, [`scripts/defect2seg:373-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L373-L388)).
- Colour table: `$FREESURFER_HOME/DefectLUT.txt` (all defect entries magenta).
- Related step in the pipeline: [`scripts/recon-all:3712-3787`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3712-L3787) (*Fix Topology*).
