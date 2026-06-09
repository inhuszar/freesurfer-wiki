---
title: "label-cortex"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label-cortex"
families: []                     # standalone tcsh orchestration script (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[mri_label2label]]"
  - "[[make_cortex_label]]"
  - "[[mri_entowm_seg]]"
  - "[[mri_vol2surf]]"
  - "[[mri_binarize]]"
  - "[[mris_convert]]"
  - "[[mri_cor2label]]"
  - "[[mri_mergelabels]]"
  - "[[mris_label2annot]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether recon-all's FixGA/FixEntoWM default to on or off is set in a sourced config (distribution/etc/recon-config.yaml), not in recon-all itself; the script gates --fix-ga on the recon-all $FixGA variable, which is forced off when entowm volumes are too small."
  - "fscalc is invoked as a bare command for the nx/nz mask intersection; the wiki has fscalc.fsl.md (the FSL-named variant) rather than a generic fscalc page."
tags:
  - label
  - cortex
  - surface
  - roi
  - recon-all
  - gyrus-ambiens
---

# label-cortex

## Summary

`label-cortex` builds the **`?h.cortex.label`** for a subject — the surface label
that defines cerebral cortex proper (excluding the medial wall, and excluding
hippocampus/amygdala) on the white-matter-preaparc surface. By default it is a
thin wrapper that runs [[mri_label2label]] with the `--label-cortex` directive,
deriving the label from `?h.white.preaparc` and `aseg.presurf.mgz`. When
`--fix-ga` is given it additionally performs an elaborate **gyrus-ambiens
recovery**: it re-adds the medial portion of the gyrus ambiens (part of
entorhinal cortex) that the default method tends to drop, by sampling the
ento-WM segmentation onto the surface, masking by surface-normal direction, and
merging the recovered patch back into the cortex label. It can also create the
**`?h.cortex+hipamyg.label`** variant (cortex including hippocampus and amygdala)
needed later in surface placement.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/label-cortex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex)
- **Binary/script location:** `$FREESURFER_HOME/bin/label-cortex`
- **FreeSurfer tools invoked (default path):**
  [`mri_label2label --label-cortex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L106) ([[mri_label2label]]).
- **FreeSurfer tools invoked (`--fix-ga` path):**
  [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L135) ([[mri_binarize]]),
  [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L146) ([[mri_vol2surf]]),
  [`mris_convert --to-scanner -n`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L157) ([[mris_convert]]),
  [`fscalc … and …`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L195) (voxel-wise logical AND),
  [`mri_cor2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L206) ([[mri_cor2label]]),
  [`mri_mergelabels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L219) ([[mri_mergelabels]]).
- **Helpers:** `UpdateNeeded` (timestamp dependency check),
  `fsr-getxopts` (expert-options lookup, on the `--hip-amyg` path only),
  and `fsvglrun freeview` (assembled as the suggested view command).

## Purpose and Context

The `?h.cortex.label` is one of the most consequential files in a FreeSurfer
subject: it marks which surface vertices are cortex (as opposed to the medial
wall, subcortical structures, and the corpus callosum), and it drives surface
placement, cortical parcellation, and all surface-based morphometry. In modern
FreeSurfer (v8) this label is produced during the surface stream by
`label-cortex`, which calls [[mri_label2label]]'s built-in `--label-cortex`
algorithm on the `white.preaparc` surface using `aseg.presurf.mgz` as the
volumetric guide.

`label-cortex` is the **current** generator of `?h.cortex.label`. The older
[[make_cortex_label]] builds the same-named file by a different route (from the
`aparc` annotation, excluding `Medial_wall`) and refuses to run if the label
already exists; it predates this surface-stream method. When the wiki or older
docs disagree, the recon-all-invoked `label-cortex` path is authoritative for v8.

The `--fix-ga` extension exists because the default method excludes any vertex
that falls into hippocampus or amygdala in the segmentation — and segmentation
inaccuracies frequently place hip/amyg on the medial side of the **gyrus
ambiens** (GA), so GA is wrongly dropped from cortex. The script attempts to
recover just the medial GA patch and merge it back ([`scripts/label-cortex:114-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L114-L124)).

## Inputs

### Required Inputs

| Flag | What it is |
|------|------------|
| `--s <subject>` | **Required.** FreeSurfer subject ID under `$SUBJECTS_DIR` ([`scripts/label-cortex:387-390`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L387-L390)). |

Resolved input files (per hemisphere, checked for existence):

| File | Role | Checked at |
|------|------|-----------|
| `surf/?h.white.preaparc` (`+$FS_GII` if `--gii`) | The surface the label is defined on | [`scripts/label-cortex:403-409`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L403-L409) |
| `mri/aseg.presurf.mgz` | Volumetric segmentation that guides the cortex/medial-wall/subcortical decision | [`scripts/label-cortex:398-402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L398-L402) |
| `mri/entowm.mgz` | Ento-WM segmentation (from [[mri_entowm_seg]]); **only** required with `--fix-ga` | [`scripts/label-cortex:411-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L411-L417) |

### Input Assumptions

> [!assumption] A partially-completed recon-all subject
> `label-cortex` assumes the subject directory already contains the
> `white.preaparc` surface and `aseg.presurf.mgz` — i.e. recon-all has progressed
> through white-surface pre-parcellation. With `--fix-ga` it additionally assumes
> `entowm.mgz` exists, which requires recon-all to have been run with
> `-fix-ento-wm` (the script's help states this explicitly,
> [`scripts/label-cortex:510-513`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L510-L513)). The surface name and aseg name are
> hard-wired to `white.preaparc` and `aseg.presurf`
> ([`scripts/label-cortex:28-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L28-L29)).

> [!gotcha] `--fix-ga` requires `mri_entowm_seg` output and a reasonable segmentation
> The GA fix reads `entowm.mgz` and binarizes the gyrus-ambiens label (3201 for
> lh, 4201 for rh) from it ([`scripts/label-cortex:130-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L130-L135)). If the
> ento-WM segmentation is poor or empty (some AD subjects have none,
> [`scripts/label-cortex:123-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L123-L124)) the fix can fail; the script even
> prints a hint to rerun with `-no-fix-ga` if `mri_cor2label` finds no matching
> voxels ([`scripts/label-cortex:209-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L209-L211)).

## Outputs

### Files Created

| File | Where (default) | Contents | Produced by |
|------|-----------------|----------|-------------|
| `?h.cortex.label` | `$SUBJECTS_DIR/<subj>/label/` (or `--o <outdir>`) | The cortex label (cortex minus medial wall, hip, amyg) | default path, and the merge target on the `--fix-ga` path |
| `?h.cortex+hipamyg.label` | same | Cortex **including** hippocampus and amygdala | only with `--hip-amyg` ([`scripts/label-cortex:82-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L82-L91)) |
| `label-cortex.<hemistr>.Y…M…D…H…M….log` | `<outdir>/log/` or `<subj>/scripts/log/` | Run log | the script |

`--fix-ga` additionally writes a series of **intermediate** files in the scratch
`tmpdir` (removed unless `--nocleanup`/`--tmpdir`): `gyrus-ambiens.?h.mgz`,
`?h.gyrus-ambiens.mgz`, `?h.white.preaparc.nxyz.mgz`, `?h.nx.mask.mgz`,
`?h.nz.mask.mgz`, `?h.gyrus-ambiens.lat.mask.mgz`,
`?h.gyrus-ambiens.med.label`, and `?h.cortex-no-ga.label`
([`scripts/label-cortex:99-224`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L99-L224)).

### Output Specifications

The primary outputs are surface labels in the ASCII [[label-format]]: a header
line, a vertex count, then `vno x y z stat` rows referencing
`?h.white.preaparc`. They are written by [[mri_label2label]] (default path) or by
[[mri_mergelabels]] merging the GA patch into the no-GA label (`--fix-ga` path).
Coordinates are the surface (TkReg) RAS positions of the labelled vertices.

> [!gotcha] Output paths must contain a "/" (a code requirement)
> Several output label paths are deliberately built with a directory component
> because `LabelRead()` fails on a bare filename. The script annotates this at
> the `?h.cortex+hipamyg.label` and `?h.cortex-no-ga.label` definitions
> ([`scripts/label-cortex:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L82), [`:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L100)). When choosing `--o`, give a real
> directory.

## Mathematical Foundations

The **default** cortex-labelling math is not in this script — it lives inside
[[mri_label2label]]'s `--label-cortex` routine, which classifies each surface
vertex as cortex/non-cortex using the underlying `aseg.presurf` labels.

> [!internal] Default cortex labelling is implemented in mri_label2label
> `label-cortex` merely invokes
> `mri_label2label --label-cortex <surf> <aseg> <flag> <out>`
> ([`scripts/label-cortex:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L106)). The third positional argument is
> `0` for `?h.cortex.label` (exclude hip/amyg) and `1` for
> `?h.cortex+hipamyg.label` (include them). See [[mri_label2label]] for the
> vertex-classification algorithm.

The **gyrus-ambiens fix** does carry a small geometric idea worth stating: the
medial face of the gyrus ambiens has a characteristic surface-normal direction,
and the fix isolates vertices by the **sign of the normal's x- and z-components**.

> [!math] Selecting the medial gyrus ambiens by surface-normal orientation
> Let $\mathbf{n} = (n_x, n_y, n_z)$ be the outward surface normal (in scanner
> RAS) at a vertex, obtained with `mris_convert --to-scanner -n`. On the medial
> side of the GA the normal points **down** and toward the midline:
> $$
> \text{left hemi: } n_x > +t,\quad n_z < -t \qquad
> \text{right hemi: } n_x < -t,\quad n_z < -t
> $$
> where $t$ is the threshold (`--thresh`, default $0.01$). The script binarizes
> $n_x$ with `--min +t` (lh) or `--max -t` (rh)
> ([`scripts/label-cortex:170-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L170-L172)) and $n_z$ with `--max -t` (both
> hemis, [`scripts/label-cortex:184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L184)), both restricted to the GA binary
> mask, then takes their voxel-wise intersection with `fscalc … and …`
> ([`scripts/label-cortex:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L195)). The surviving vertices become a label and
> are merged into the cortex label.

The full `--fix-ga` pipeline is, per hemisphere:

1. `mri_label2label --label-cortex … 0 …` → the no-GA cortex label.
2. `mri_binarize --match {3201|4201}` on `entowm.mgz` → GA volume mask.
3. `mri_vol2surf --projdist-max -1 0 .1` → sample GA mask onto the surface,
   searching 1 mm inward.
4. `mris_convert --to-scanner -n` → per-vertex normals in scanner RAS.
5. `mri_binarize` on the $n_x$ and $n_z$ frames (signed by hemi), masked to GA.
6. `fscalc nx and nz` → intersection (medial-side vertices).
7. `mri_cor2label --thresh 0.5` → label of the medial GA.
8. `mri_mergelabels -i <no-GA cortex> -i <medial GA> -o ?h.cortex.label`.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/label-cortex:271-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L271-L379)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--sd` | string | `$SUBJECTS_DIR` | Override the subjects directory (sets `SUBJECTS_DIR`). |
| `--o` | string | `<subj>/label` | Output directory for the cortex label(s). |
| `--lh` | boolean | both | Process the left hemisphere only ([`scripts/label-cortex:317-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L317-L319)). |
| `--rh` | boolean | both | Process the right hemisphere only ([`scripts/label-cortex:321-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L321-L323)). |
| `--fix-ga` | boolean | off | Recover the medial gyrus ambiens and merge it into the cortex label. Requires `entowm.mgz` ([`scripts/label-cortex:299-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L299-L301)). |
| `--no-fix-ga` | boolean | (default) | Disable the GA fix ([`scripts/label-cortex:302-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L302-L304)). |
| `--hip-amyg` | boolean | off | Also create `?h.cortex+hipamyg.label` (cortex including hippocampus + amygdala), as needed by recon-all (RCA) ([`scripts/label-cortex:306-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L306-L308)). |
| `--no-hip-amyg` | boolean | (default) | Do not create the hipamyg variant ([`scripts/label-cortex:309-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L309-L311)). |
| `--thresh` | float | `0.01` | Threshold for binarizing the x- and z-normals in the GA fix ([`scripts/label-cortex:294-297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L294-L297)). |
| `--gii` | boolean | off | Use GIFTI surfaces: sets `FS_GII=.gii` so the input surface is `?h.white.preaparc.gii` ([`scripts/label-cortex:313-315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L313-L315)). |
| `--force-update`<br>`--force` | boolean | off | Rebuild even if outputs are newer than inputs (overrides the `UpdateNeeded` skip) ([`scripts/label-cortex:325-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L325-L328)). |
| `--no-force` | boolean | (default) | Honour the up-to-date skip ([`scripts/label-cortex:329-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L329-L331)). |
| `-dontrun`<br>`--dontrun`<br>`-no-run`<br>`--no-run` | boolean | off | Print the commands but do not execute them (`RunIt=0`) ([`scripts/label-cortex:333-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L333-L338)). |
| `--log` | string | auto (timestamped) | Explicit log-file path; also marks the log as user-passed so it is not auto-deleted ([`scripts/label-cortex:340-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L340-L344)). |
| `--nolog`<br>`--no-log` | boolean | off | Send the log to `/dev/null` ([`scripts/label-cortex:346-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L346-L350)). |
| `--tmp`<br>`--tmpdir` | string | auto | Use this scratch directory and keep it (`cleanup=0`) ([`scripts/label-cortex:352-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L352-L357)). |
| `--nocleanup` | boolean | off | Keep the scratch directory ([`scripts/label-cortex:359-361`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L359-L361)). |
| `--cleanup` | boolean | **on** | Remove the scratch directory at the end ([`scripts/label-cortex:363-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L363-L365)). |
| `--debug` | boolean | off | tcsh tracing (`set echo`, `verbose`) ([`scripts/label-cortex:367-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L367-L370)). |
| `--version` | boolean | — | Print version and exit ([`scripts/label-cortex:43-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L43-L47)). |
| `--help` | boolean | — | Print full help (`BEGINHELP`) and exit ([`scripts/label-cortex:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L38-L42)). |

### Configuration Interactions

> [!gotcha] `--fix-ga` is gated on the ento-WM segmentation
> `--fix-ga` only works if `mri/entowm.mgz` exists; the script errors at startup
> if it is missing ([`scripts/label-cortex:411-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L411-L417)). Inside recon-all this
> means `-fix-ento-wm` must have been requested. If the GA fix later finds no
> voxels, the recommended recovery is to rerun with `-no-fix-ga`
> ([`scripts/label-cortex:209-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L209-L211)).

> [!gotcha] `--no-fix-ga` and `--no-hip-amyg` last-one-wins
> The `--fix-ga`/`--no-fix-ga` and `--hip-amyg`/`--no-hip-amyg` pairs each just
> set a boolean, so the **last** occurrence on the command line wins. recon-all
> appends `--fix-ga` conditionally on its own `$FixGA` state
> ([`scripts/recon-all:3973`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3973)).

> [!gotcha] `--thresh` only affects the GA fix
> The `--thresh` value is used **only** to binarize the surface-normal x/z
> components during `--fix-ga` ([`scripts/label-cortex:170-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L170-L184)). Without
> `--fix-ga` it has no effect on the output.

Other interactions:

- **Per-step `UpdateNeeded` skipping.** Each output is rebuilt only if it is
  older than its inputs (or `--force-update` is set). When nothing needs
  rebuilding the script reports "Cortex label update not needed" and exits
  before doing any work ([`scripts/label-cortex:430-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L430-L444)).
- **Empty-log cleanup.** If no update was made and the log was auto-generated
  (not `--log`-passed), the log file is deleted to avoid accumulating empty logs
  ([`scripts/label-cortex:253-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L253-L257)).
- `--tmp`/`--tmpdir` implies keeping the scratch dir (`cleanup=0`), useful for
  inspecting the `--fix-ga` intermediates.

## Typical Use Cases

### 1. Build the cortex label for one subject (default method)

```bash
# Both hemispheres, default (no GA fix), writes to <subj>/label/?h.cortex.label
label-cortex --s subj01
```

### 2. Rebuild with the gyrus-ambiens fix (requires -fix-ento-wm earlier)

```bash
# entowm.mgz must already exist (recon-all -fix-ento-wm)
label-cortex --s subj01 --fix-ga --force-update
```

### 3. One hemisphere, custom output directory, also make the hipamyg variant

```bash
label-cortex --s subj01 --lh --o /scratch/subj01_labels --hip-amyg
```

### 4. Dry run (print commands only)

```bash
label-cortex --s subj01 --fix-ga --no-run
```

## Pipeline Context

`label-cortex` **is** part of [[wiki/pipelines/recon-all|recon-all]]. It runs in
the **autorecon2** surface stream, at the `#@# CortexLabel` step, immediately
after `WhitePreAparc` and before `Smooth2`/`Inflation2`/`Sphere`/`Cortical Parc`
([`scripts/recon-all:3965-4012`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3965-L4012)). recon-all calls it once per hemisphere:

```bash
label-cortex --s $subjid --$hemi [--fix-ga] [--gii] [--force-update] $xopts
```

with `--fix-ga` appended only when recon-all's `$FixGA` is set
([`scripts/recon-all:3972-3973`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3972-L3973)). recon-all builds the
`?h.cortex+hipamyg.label` itself in the following block via a direct
`mri_label2label --label-cortex … 1 …` call ([`scripts/recon-all:3986-4003`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3986-L4003)),
rather than passing `--hip-amyg` to `label-cortex` — so inside recon-all the
`--hip-amyg` branch of this script is normally not exercised.

**Predecessor:** white-surface pre-parcellation (`?h.white.preaparc`) and
`aseg.presurf.mgz`; with `--fix-ga`, the EntoWM segmentation step
([[mri_entowm_seg]]) → **label-cortex** → **Successor:** the cortex label feeds
surface placement, cortical parcellation, and `mris_anatomical_stats`.

## Gotchas and Caveats

> [!gotcha] This is the v8 cortex-label generator, not make_cortex_label
> `?h.cortex.label` is produced here, from `white.preaparc` + `aseg.presurf` via
> `mri_label2label --label-cortex`. The legacy [[make_cortex_label]] builds the
> same filename from the `aparc` annotation and **halts if it already exists**.
> Do not run both; in a v8 recon-all subject the file already exists from this
> script.

> [!gotcha] Default-method side effect that motivates `--fix-ga`
> The default cortex label excludes any vertex falling in hippocampus or amygdala
> per the segmentation. Because seg errors often misplace hip/amyg medial to the
> gyrus ambiens, GA is frequently dropped from cortex
> ([`scripts/label-cortex:114-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L114-L124)). `--fix-ga` recovers it; a related fix
> in this region is the amyg-ctx-junction fix (`-fix-acj`) mentioned in the code
> comment ([`scripts/label-cortex:126-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L126-L127)).

> [!gotcha] Hard-wired surface and aseg names
> The input surface is always `white.preaparc` and the segmentation is always
> `aseg.presurf` ([`scripts/label-cortex:28-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L28-L29)); there is no flag to point
> the tool at a different surface or aseg.

> [!gotcha] Hemisphere-dependent normal sign in the GA fix
> The x-normal threshold flips sign between hemispheres (lh wants $n_x>+t$, rh
> wants $n_x<-t$) because the medial direction is opposite
> ([`scripts/label-cortex:170-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L170-L172)). The z-normal threshold ("points down")
> is the same for both ([`scripts/label-cortex:184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L184)).

## Error Compensation and Guard Rails

- **Input existence checks** for subject, `aseg.presurf.mgz`,
  `?h.white.preaparc`, and (with `--fix-ga`) `entowm.mgz`, each aborting with a
  clear message ([`scripts/label-cortex:387-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L387-L417)).
- **Up-to-date skipping** via `UpdateNeeded` throughout, so re-running is cheap
  and idempotent; `--force-update` overrides it
  ([`scripts/label-cortex:83-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L83-L104), [`:430-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L430-L444)).
- **Per-command error trapping:** every sub-command checks `$status` and jumps to
  `error_exit` on failure ([`scripts/label-cortex:90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L90), [`:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L109), …).
- **Helpful GA-failure hint:** if `mri_cor2label` finds no GA voxels, the log
  suggests rerunning with `-no-fix-ga` rather than failing silently
  ([`scripts/label-cortex:209-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L209-L211)).
- **Empty-log self-cleanup** when no work was done
  ([`scripts/label-cortex:253-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L253-L257)).

## Related Tools

- [[mri_label2label]] — implements the actual `--label-cortex` algorithm that
  builds the default cortex (and `+hipamyg`) labels.
- [[make_cortex_label]] — the **legacy/alternative** generator of
  `?h.cortex.label` (from the `aparc` annotation); supplanted by this script in
  the v8 surface stream.
- [[mri_entowm_seg]] — produces `entowm.mgz`, the prerequisite for `--fix-ga`.
- [[mri_vol2surf]] — samples the GA segmentation onto the surface in the fix.
- [[mris_convert]] — extracts per-vertex surface normals (`--to-scanner -n`).
- [[mri_binarize]] — thresholds the GA mask and the signed normal components.
- [[mri_cor2label]] — converts the recovered medial-GA surface mask to a label.
- [[mri_mergelabels]] — merges the medial-GA label into the cortex label.
- [[mris_label2annot]] — a downstream consumer that assembles labels into an
  annotation ([[annotation-format]]).
- [[wiki/pipelines/recon-all|recon-all]] — calls this script at the autorecon2
  `CortexLabel` step.

## Confidence and Gaps

**High confidence:** the full argument parser and both processing paths (default
and `--fix-ga`) were read from
[`scripts/label-cortex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex) (515 lines), and the recon-all invocation,
stage, and conditional `--fix-ga`/hipamyg handling were confirmed in
[`scripts/recon-all:3965-4012`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3965-L4012). The cortex/no-GA classification itself is
delegated to [[mri_label2label]]; the GA-fix geometry (normal-sign masking,
intersection, merge) is fully traced here.

> [!gap] recon-all FixGA/FixEntoWM default
> Whether recon-all turns `--fix-ga`/`-fix-ento-wm` on by default is determined
> by a sourced configuration (`distribution/etc/recon-config.yaml`), not by
> `recon-all` itself, so the as-shipped default was not read from a single
> `set FixGA = …` line. recon-all forces `$FixGA=0` when the EntoWM volume is too
> small ([`scripts/recon-all:2894-2896`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2894-L2896)).

> [!gap] `fscalc` page naming
> The mask intersection uses a bare `fscalc … and …`
> ([`scripts/label-cortex:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L195)); the wiki currently documents the
> FSL-named variant (`fscalc.fsl`) rather than a generic `fscalc` page.

## References

- FreeSurfer source: [`scripts/label-cortex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex) (v8.2.0).
- recon-all invocation: [`scripts/recon-all:3965-4012`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3965-L4012).
- Built-in help: `label-cortex --help` (the `BEGINHELP` block,
  [`scripts/label-cortex:508-513`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label-cortex#L508-L513)).
- Label file layout: [[label-format]].
