---
title: "annot2std"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/annot2std"
families: []                       # standalone surface-annotation averaging script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_surf2surf]]"
  - "[[mri_annotation2label]]"
  - "[[mris_seg2annot]]"
  - "[[mri_concat]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[fsaverage]]"
  - "[[annotation-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --overwrite check guards only the final output annot, not the intermediate .p.mgh / stack files, which are written unconditionally."
tags:
  - surface
  - annotation
  - parcellation
  - group-analysis
  - fsaverage
---

# annot2std

## Summary

`annot2std` builds an **average cortical parcellation (annotation) in a standard
space** (typically [[fsaverage]]) from the individual annotations of a group of
subjects. For each subject it converts the annotation to a per-vertex surface
segmentation, maps that segmentation through the subject's spherical surface
registration onto the target subject with [[mri_surf2surf]] (nearest-neighbour),
then takes a **per-vertex vote** across all mapped subjects: the label that wins
the most votes at a vertex becomes that vertex's label in the output annotation.
It also writes a probability overlay giving, at each vertex, the fraction of
subjects that agreed with the winning label. Optionally it includes the
cross-hemisphere (`xhemi`) annotation of each subject for interhemispheric
analyses. Written by Doug Greve.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/annot2std`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std)
- **Binary/script location:** `$FREESURFER_HOME/bin/annot2std`
- **FreeSurfer tools invoked:** [`mri_annotation2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L103) (annotation → surface segmentation), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L115) (map to standard space), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L150) (vote / stack), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L157) (extract the probability frame), [`mris_seg2annot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L174) (segmentation → annotation), and the helpers `getfullpath` / `fs_temp_dir`.

## Purpose and Context

A FreeSurfer cortical parcellation (e.g. `aparc`, `aparc.a2009s`) is stored as a
per-subject [[annotation-format]] file on that subject's own surface. To make a
**group-average parcellation** — for example, to see where the typical boundary
of a gyrus falls across a cohort, or to build a custom atlas in `fsaverage`
space — each subject's annotation must be carried onto a common surface and
combined. `annot2std` automates exactly that:

1. Convert each subject's `?h.<annot>.annot` to a surface segmentation volume.
2. Resample that segmentation onto the target (standard) subject through the
   established surface registration (`?h.sphere.reg` by default).
3. Vote across subjects at each standard-space vertex.
4. Write the winning labels back out as a standard-space annotation, plus a
   per-vertex agreement-probability map.

It is the per-annotation engine behind [[make_average_surface]] /
[[mris_make_average_surface]]: `make_average_surface` calls `annot2std` once per
annotation to populate the average subject's `label/` directory
([`scripts/make_average_surface:314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L314)). It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] (which produces single-subject
annotations, not group averages) or trac-all.

## Inputs

### Required Inputs

- **Subjects** — one or more of `--s subj` (repeatable), `--f subjectlistfile`,
  or `--fsgd fsgdfile` (subjects are the `Input` rows of the FSGD file,
  [`scripts/annot2std:251-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L251-L260)). Each subject must have
  `$SUBJECTS_DIR/$subject/label/$hemi.$inannot.annot` and
  `surf/$hemi.$srcsurfreg` (validated at [`scripts/annot2std:380-403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L380-L403)).
- **Input annotation name** — `--a <name>` (or the shortcuts `--aparc` →
  `aparc`, `--a2009s`/`--aparc.a2009s` → `aparc.a2009s`). Names the
  `?h.<name>.annot` files to average.
- **Target** — `--t <subject>` (e.g. `fsaverage`); must exist under
  `$SUBJECTS_DIR`.
- **Hemisphere** — exactly one of `--lh` / `--rh`.
- **Output** — `--o <outannotpath>` (full path; also produces
  `<outannotpath>.p.mgh`).

### Input Assumptions

> [!assumption] Cross-subject surface registration already exists
> Every subject is assumed to be a completed recon-all subject with the named
> annotation **and** a spherical surface registration `?h.<srcsurfreg>` (default
> `sphere.reg`). The mapping to standard space is done entirely through that
> registration with [[mri_surf2surf]]; there is no volumetric step. If the target
> is **not** `fsaverage`, you must give `--srcsurfreg` explicitly
> ([`scripts/annot2std:374-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L374-L377)).

> [!gotcha] `segbase 0` is forced when converting the annotation
> `mri_annotation2label --segbase 0` is used deliberately
> ([`scripts/annot2std:103-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L103-L107)): otherwise `aparc`/`aparc.2005s` get a non-zero
> seg base that would break the downstream `mri_aparc2aseg` and the vote/annotation
> reconstruction. The segmentation index therefore equals the annotation's
> color-table entry index.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `<outannotpath>` | [[annotation-format]] (`.annot`) | the voted average parcellation on the target surface, written by [`mris_seg2annot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L174-L178) |
| `<outannotpath>.p.mgh` | [[mgz]]/mgh surface overlay (1 frame) | per-vertex probability = fraction of subjects assigned to the winning label (frame 1 of the vote output, [`scripts/annot2std:156-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L156-L160)) |
| `<outannotpath>.log` | text | command/environment log (unless `--log`/`--nolog`) |
| `--seg <file>` | mgh surface segmentation (2 frames: label, p) | the raw vote result (only if `--seg` given; otherwise a temp file, [`scripts/annot2std:148-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L148-L149)) |
| `--stack <file>` | mgh (N frames) | concatenation of all individual mapped segmentations, for debugging (written if `--stack` given or `--nocleanup`, [`scripts/annot2std:162-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L162-L169)) |

Per-subject intermediates (`seg.N.subj.mgh`, `.ctab`, `.std.mgh`) are written
under a scratch temp dir and removed on cleanup ([`scripts/annot2std:73-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L73-L76),
[`:183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L183)).

### Output Specifications

The output annotation is defined on the **target** subject's surface (so it has
the target's vertex count — e.g. 163842 for `fsaverage`). The label set and color
table come from the **first** subject's annotation color table (`ctab1`,
[`scripts/annot2std:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L111) and [`:174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L174)). The `.p.mgh` overlay is in [0,1]
(fraction agreeing). With `--xhemi`, each subject contributes two segmentations
(normal + cross-hemisphere), so the vote denominator doubles.

## Mathematical Foundations

The only computation is a **per-vertex plurality vote** with an associated
agreement fraction, performed by `mri_concat --vote`:

> [!math] Per-vertex vote and probability
> Let $s_i(v)\in\{0,1,\dots,K\}$ be the standard-space label of subject $i$ at
> vertex $v$ (after nearest-neighbour resampling). The output label is the mode:
> $$\hat{s}(v)=\operatorname*{arg\,max}_{k}\;\big|\{\,i : s_i(v)=k\,\}\big|,$$
> and the probability overlay is the winning fraction
> $$p(v)=\frac{\big|\{\,i : s_i(v)=\hat{s}(v)\,\}\big|}{N}\in[0,1],$$
> with $N$ the number of inputs (doubled under `--xhemi`). `mri_concat --vote`
> emits a two-frame volume (frame 0 = winning label $\hat s$, frame 1 = $p$); this
> script splits off frame 1 as `.p.mgh` and feeds frame 0 to `mris_seg2annot`.

The cross-subject mapping uses [[mri_surf2surf]] with `--mapmethod nnf`
(nearest-neighbour, forward) so that integer labels are carried without
interpolation across the surface registration.

> [!internal] Vote and resampling math live in the called binaries
> The plurality vote is in [[mri_concat]] (`--vote`); the registration-based
> surface resampling is in [[mri_surf2surf]]. `annot2std` only orchestrates them.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser ([`scripts/annot2std:199-339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L199-L339)).
Required: an input annot, an output path, a hemisphere, ≥1 subject, and a target
([`scripts/annot2std:343-373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L343-L373)).

#### Subjects, input, target

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subject`<br>`--s` | string (repeatable) | — | Add a subject to the group. Repeat for each subject. |
| `--f` | string (file) | — | Read the subject list from a file (one subject per line). Existence-checked. |
| `--fsgd` | string (file) | — | Read subjects from the `Input` rows of an FSGD group-descriptor file. |
| `--a`<br>`--annot` | string | *(required)* | Input annotation name; reads `?h.<name>.annot`. |
| `--aparc` | bool | — | Shortcut for `--a aparc`. |
| `--a2009s`<br>`--aparc.a2009s` | bool | — | Shortcut for `--a aparc.a2009s` (Destrieux). |
| `--t` | string | *(required)* | Target (standard) subject, e.g. `fsaverage`. Must exist in `$SUBJECTS_DIR`. |

#### Hemisphere and registration

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lh` | bool | — | Process the left hemisphere. Exactly one of `--lh`/`--rh` is required. |
| `--rh` | bool | — | Process the right hemisphere. |
| `--xhemi` | bool | off | Also include each subject's `xhemi/label/?h.<annot>.annot` (cross-hemisphere mapping) in the vote, for interhemispheric analysis ([`scripts/annot2std:123-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L123-L144)). |
| `--surfreg` | string | `sphere.reg` | Set **both** source and target surface registration to this name in one flag ([`scripts/annot2std:274-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L274-L278)). |
| `--srcsurfreg` | string | `sphere.reg` | Source-subject surface registration (`?h.<name>`). **Required** when the target is not `fsaverage`. |
| `--trgsurfreg` | string | `sphere.reg` | Target-subject surface registration (`?h.<name>`). |

#### Output and debugging

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string (path) | *(required)* | Full output annotation path; also produces `<path>.p.mgh`. Canonicalised with `getfullpath` so it is not written into the target's `label/` dir by accident ([`scripts/annot2std:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L65)). |
| `--seg` | string (file) | temp | Save the raw vote as a 2-frame surface segmentation (frame 2 = p). |
| `--stack` | string (file) | — | Save the concatenated individual mapped segmentations (debugging). |
| `--overwrite`<br>`--force` | bool | off | Allow overwriting an existing output annotation (otherwise the script errors, [`scripts/annot2std:353-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L353-L357)). |
| `--tmp`<br>`--tmpdir` | string | `fs_temp_dir --scratch` | Use this temp dir (and keep it: sets `cleanup=0`). |
| `--log` | string | `<outannot>.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | off | Log to `/dev/null`. |
| `--nocleanup` | bool | off | Keep the temp dir (and write the stack). |
| `--cleanup` | bool | on | Remove the temp dir at the end (default). |
| `--debug` | bool | off | tcsh `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] Non-fsaverage target requires `--srcsurfreg`
> If `--t` is anything other than `fsaverage` and `--srcsurfreg` was not given,
> the script errors out ([`scripts/annot2std:374-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L374-L377)). For `fsaverage` the default
> `sphere.reg` is assumed safe; for any custom target you must name the
> registration that aligns the subjects to it.

> [!gotcha] `--surfreg` is a convenience that sets both src and trg
> `--surfreg X` assigns `srcsurfreg = trgsurfreg = X`. Giving `--srcsurfreg` /
> `--trgsurfreg` afterwards (or before) lets you set them independently; ordering
> follows normal left-to-right flag processing, so a later `--trgsurfreg` overrides
> the value `--surfreg` set.

> [!gotcha] The output color table comes from the first subject only
> The final `mris_seg2annot` uses the **first** subject's color table (`ctab1`).
> The in-code comment warns this can fail if later subjects contain parcellation
> labels absent from the first subject's table ([`scripts/annot2std:171-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L171-L173)).
> Order subjects so the first has the most complete label set, or ensure all
> subjects share one color table.

- Subjects from `--s`, `--f`, and `--fsgd` **accumulate** — you can combine them.
- `--seg`/`--stack` only add debug outputs; they do not change the produced
  annotation.
- `--overwrite` guards only the final annotation; the `.p.mgh` and any
  `--seg`/`--stack` outputs are written regardless (see Gaps).

## Typical Use Cases

### 1. Average aparc across a cohort into fsaverage (left hemisphere)

```bash
annot2std --f subjects.list --lh --aparc \
  --o lh.aparc.std.annot --t fsaverage
# -> lh.aparc.std.annot  and  lh.aparc.std.annot.p.mgh
```

### 2. Destrieux atlas average from an FSGD file, right hemisphere

```bash
annot2std --fsgd study.fsgd --rh --a2009s \
  --o rh.aparc.a2009s.std.annot --t fsaverage
```

### 3. Average onto a custom template (explicit registration)

```bash
annot2std --f subjects.list --lh --a myparc \
  --o lh.myparc.std.annot --t mytemplate \
  --srcsurfreg sphere.mytemplate.reg --trgsurfreg sphere.reg
```

### 4. Interhemispheric (xhemi) average

```bash
annot2std --f subjects.list --lh --aparc \
  --o lh.aparc.xstd.annot --t fsaverage_sym --xhemi \
  --srcsurfreg fsaverage_sym.sphere.reg
```

### 5. View the result

```bash
tksurfer fsaverage lh inflated -annot ./lh.aparc.std.annot \
  -ov lh.aparc.std.annot.p.mgh -fminmax .01 1
```

## Pipeline Context

`annot2std` is a stand-alone group-analysis utility. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or trac-all, but it **is** called by
[[make_average_surface]] to build the average subject's annotations
([`scripts/make_average_surface:314-320`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L314-L320)).

**Predecessor:** per-subject recon-all (annotations + `?h.sphere.reg`) →
**annot2std** → **Successor:** display in tksurfer/freeview, or use of the
averaged `.annot` as a label/ROI source for further surface analysis (e.g.
[[mri_annotation2label]], `mri_segstats`).

Internally it chains [[mri_annotation2label]] (annot → seg), [[mri_surf2surf]]
(map to standard space), [[mri_concat]] (`--vote`), [[wiki/tools/mri_convert|mri_convert]]
(probability frame), and [[mris_seg2annot]] (seg → annot).

## Gotchas and Caveats

> [!gotcha] Output is on the target surface, with the first subject's color table
> The averaged annotation lives on the **target** subject (e.g. `fsaverage`), and
> its labels/colors are inherited from the first input subject. A first subject
> with a partial parcellation can make `mris_seg2annot` fail for the whole group.

> [!gotcha] Nearest-neighbour mapping means no label blending
> Labels are integers; `mri_surf2surf --mapmethod nnf` carries them by
> nearest-neighbour so no spurious in-between labels are created. The trade-off is
> that the result inherits any registration misalignment directly at boundaries —
> the `.p.mgh` agreement map is the right place to judge boundary reliability.

> [!gotcha] `--xhemi` doubles the vote count
> Each subject contributes both its normal and its cross-hemisphere segmentation,
> so the probability denominator is `2 × Nsubjects`, not `Nsubjects`.

## Error Compensation and Guard Rails

- Every step's exit status is checked; the script aborts on any failure
  ([`scripts/annot2std:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L110), [`:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L120), [`:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L153), [`:178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L178)).
- Up-front validation confirms each subject's annotation and surface-registration
  files exist (and the xhemi equivalents under `--xhemi`) before any processing
  ([`scripts/annot2std:380-403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L380-L403)).
- The output path is forced to a full path so the annotation is **not** silently
  written into the target subject's `label/` directory
  ([`scripts/annot2std:64-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L64-L65)).
- An existing output is protected unless `--overwrite` is given
  ([`scripts/annot2std:353-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L353-L357)).
- `--segbase 0` is forced to keep segmentation indices consistent with the color
  table (see assumption above).

## Related Tools

- [[mri_surf2surf]] — performs the per-subject mapping into standard space (nearest-neighbour); the core of the cross-subject step.
- [[mri_annotation2label]] — converts each subject's annotation to the surface segmentation that gets mapped.
- [[mri_concat]] — performs the per-vertex `--vote` that turns the stack of mapped segmentations into a winning label + probability.
- [[mris_seg2annot]] — converts the voted segmentation back into the output `.annot`.
- [[wiki/tools/mri_convert|mri_convert]] — splits off the probability frame as `.p.mgh`.
- [[make_average_surface]] / [[mris_make_average_surface]] — call `annot2std` to populate an average subject's annotations.
- [[fsaverage]] — the usual `--t` target.
- [[annotation-format]] — the `.annot` file format produced and consumed.

## Confidence and Gaps

**High confidence:** the complete flag set and shortcuts, the
annotation→seg→surf2surf→vote→annot pipeline, the `--segbase 0` rationale, the
first-subject color-table behaviour, the non-fsaverage `--srcsurfreg`
requirement, and the `--xhemi` doubling — all read directly from
[`scripts/annot2std`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std), and the flag list matches the installed
`annot2std --help`.

> [!gap] Overwrite guard scope
> `--overwrite` protects only the final `.annot`; `<out>.p.mgh` and any
> `--seg`/`--stack` files are (re)written unconditionally. Whether this is intended
> is not stated in the code.

## References

- FreeSurfer source: [`scripts/annot2std`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std) (v8.2.0), original author Doug Greve.
- Built-in help: `annot2std --help` (the `BEGINHELP` block, [`scripts/annot2std:455-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/annot2std#L455-L473)).
- Caller: [`scripts/make_average_surface:314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L314) (builds average-subject annotations).
