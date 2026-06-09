---
title: "make_average_surface"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_average_surface"
families: []
recon_all_stage: null
related:
  - "[[make_average_subject]]"
  - "[[make_average_volume]]"
  - "[[mris_make_average_surface]]"
  - "[[mris_make_template]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_preproc]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - average-subject
  - surface
  - template
  - parcellation
  - icosahedron
---

# make_average_surface

## Summary

`make_average_surface` builds the **surface** half of a FreeSurfer average
subject. For each hemisphere it (1) makes a spherical registration template
(`?h.reg.template.tif`) with [[mris_make_template]], (2) resamples and averages
every input subject's `white` and `pial` surfaces onto a standard icosahedron
with [[mris_make_average_surface]], (3) derives `smoothwm` and `inflated` with
[[mris_smooth]] and [[mris_inflate]], (4) builds average cortical parcellations
with [[annot2std]] and a `?h.cortex.label` with [[mri_cor2label]], and (5)
computes average and standard-deviation maps of per-vertex measures (sulc, curv,
thickness, area, …) with [[mris_preproc]]/[[mri_concat]]/[[mri_surf2surf]]. The
output populates the `surf/`, `label/`, and `stats/` folders of the average
subject.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_average_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_average_surface`
- **Original author:** Doug Greve
- **Tools invoked:** [`mris_make_template`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L204), [`mris_make_average_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L228), [`mris_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L260), [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L290), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L302), [`annot2std`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L314), [`mri_cor2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L334), [`mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L345), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L356), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L368), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L157), [`mri_add_xform_to_header`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L140), plus the helpers `UpdateNeeded`, `fs_temp_file`.

## Purpose and Context

Surface-based group analysis requires every subject to be resampled to a common
spherical coordinate system. `make_average_surface` produces the surface side of
that common space: a set of average `?h.white`/`?h.pial`/`?h.inflated` surfaces
together with average parcellations and per-vertex statistics, all on a standard
icosahedron. It is normally driven by [[make_average_subject]] (which calls it
after [[make_average_volume]]), but it can be run directly to rebuild only the
surfaces of an average subject.

> [!gotcha] Surface averaging uses the *spherical atlas*, not Talairach
> Even though [[make_average_volume]] and the `--xform` flag work in Talairach /
> MNI305 space, the surfaces here are averaged through the spherical surface
> registration (`sphere.reg`), **not** by Talairach coordinate averaging. The
> Talairach transform only supplies the volume geometry header and the scanner→RAS
> placement of the result. This is stated explicitly in the help of
> [[make_average_subject]].

## Inputs

### Required Inputs

- **A subject list** — `--subjects s1 s2 …`, the `SUBJECTS` env var,
  `--fsgd file.fsgd`, or `--f listfile`
  ([`scripts/make_average_surface:417-458`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L417-L458)).
- Each subject must contain `surf/?h.{white,pial,sphere.reg}` and (for the
  parcellation/measure steps) the relevant `?h.*.annot` files and per-vertex
  measures, plus `mri/transforms/talairach.xfm`.

### Input Assumptions

> [!assumption] Spherically registered, recon-complete subjects
> Each subject is assumed to have a valid `?h.sphere.reg` (or the surface named
> by `--surf-reg`) and the standard recon-all surface measures. The default
> measure list is `sulc curv thickness area volume inflated.H` and the default
> annotation list is `aparc.DKTatlas aparc aparc.a2009s`
> ([`scripts/make_average_surface:820-821`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L820-L821));
> subjects missing any of these will cause the corresponding step to fail.

## Outputs

### Files Created

Written under `<sd-out>/<average_subject>/`:

| File | Produced by | Contents |
|------|-------------|----------|
| `?h.reg.template.tif` | [[mris_make_template]] | spherical registration template (MRISP TIF) for this cohort |
| `surf/?h.white`, `surf/?h.pial` | [[mris_make_average_surface]] | average surfaces on the icosahedron |
| `surf/?h.orig` | symlink → `?h.white` | orig points at the average white |
| `surf/?h.smoothwm` | [[mris_smooth]] (`-nw -n 5`) | smoothed white |
| `surf/?h.inflated` | [[mris_inflate]] | inflated smoothwm (no sulc saved) |
| `surf/?h.sphere`, `surf/?h.sphere.reg` | [[mris_convert]] + symlink | the icosahedral sphere and a self-registration |
| `surf/?h.<average>.sphere.reg` | symlink | alias of `?h.sphere` named for this subject |
| `label/?h.<annot>.annot` | [[annot2std]] | average parcellations (e.g. `aparc`, `aparc.a2009s`) |
| `label/?h.cortex.label` | [[mri_cor2label]] | cortex label from the Destrieux (`a2009s`) parcellation |
| `surf/?h.<meas>` (curv format) | [[mri_surf2surf]] | average per-vertex measure (sulc, curv, thickness, …) |
| `surf/?h.white.avg.area.mgh` | [[mri_concat]] `--mean` | average area (kept; back-compat name) |
| `surf/std.?h.<meas>.mgh` | [[mri_concat]] `--std` | std-dev across subjects for each measure |
| `mri/mni305.cor.mgz` | copied + `mri_add_xform_to_header` | MNI305 volume-geometry template (default `talairach.xfm` path) |
| `list.subjects.txt` | this script | the subject list used |
| `scripts/make_average_surface.log` | this script | log |

### Output Specifications

Surfaces are icosahedral tessellations of order `--ico` (default 7 →
~163 842 vertices/hemi); the average-measure files are MGH curvature overlays on
that mesh. The volume geometry written into the surfaces comes from
`mri/mni305.cor.mgz` (default) or from the average orig / first-subject template
when `--xform` is non-default. See [[surface-representations]] and the
[[mrisp-tif]] format page.

## Mathematical Foundations

The script orchestrates; the surface mathematics is in the binaries.

> [!math] Average surface vertex position
> [[mris_make_average_surface]] resamples each subject's surface onto the common
> icosahedron via the spherical registration, then averages the (Talairach-mapped)
> XYZ coordinates of each icosahedral vertex across subjects:
> $$\bar{v}_k = \frac{1}{N}\sum_{i=1}^{N} T_i\!\left(\,v_{i}\!\left(\phi_k\right)\right)$$
> where $\phi_k$ is the spherical location of icosahedral vertex $k$,
> $v_i(\phi_k)$ is subject $i$'s surface point there, and $T_i$ is the volume
> transform (`talairach.xfm` unless `--xform`). The detailed implementation lives
> in [[mris_make_average_surface]].

> [!internal] Smoothing, inflation, and resampling math
> Tangential smoothing (`mris_smooth -nw -n 5`), inflation energy
> ([[mris_inflate]]), and spherical resampling ([[mri_surf2surf]]) are all
> implemented in their respective binaries; this script only chooses iteration
> counts (e.g. `-n 15` inflation, or `-n 2` for `ico ≤ 5`,
> [`scripts/make_average_surface:300-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L300-L302)).

## Configuration Options

### Complete Flag Reference

Enumerated from the parser
([`scripts/make_average_surface:406-784`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L406-L784)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`--subjects` | string list | *(one required)* | Input subjects (variable-length list; consumes args until the next flag). |
| `--fsgd` | file | — | Take the subject list from an FSGD file (`Input` rows). |
| `--f` | file | — | Append subjects listed (one per line) in a text file. |
| `--out` | string | `average` | Name of the output average-subject directory. |
| `--sdir`<br>`--sd` | string | `$SUBJECTS_DIR` | `SUBJECTS_DIR` to use. |
| `--sd-out`<br>`--topdir` | string | `$SUBJECTS_DIR` | Write output here. |
| `--surfreg`<br>`--surf-reg`<br>`--surf_reg` | string | `sphere.reg` | Per-subject spherical registration surface to resample through. |
| `--surf` | string | `(white pial)` | The surface(s) to average (overrides the default white+pial list). |
| `--xform`<br>`--s-xform` | string | `talairach.xfm` | Volume/coordinate transform applied before averaging; sets `-X`. |
| `--mni152` | bool | off | Set the transform to the SynthMorph nonlinear warp `synthmorph.1.0mm.1.0mm/warp.to.mni152.1.0mm.1.0mm.nii.gz`. |
| `--s-dest-lta` | file | — | Destination LTA passed to [[mris_make_average_surface]] (`-d`). |
| `--ico`<br>`--i` | int | `7` | Icosahedron order. |
| `--meas` | string (repeatable) | `sulc curv thickness area volume inflated.H` | Add a per-vertex measure to average; repeatable, replaces the default when given. |
| `--annot` | string (repeatable) | `aparc.DKTatlas aparc aparc.a2009s` | Add a parcellation to average; repeatable, replaces the default when given. |
| `--no-annot` | bool | annot on | Do not build average annotations (also clears `--annot-template`). |
| `--annot-template` | bool | off | Use `aparc` when building the registration TIF (`mris_make_template -annot aparc`). |
| `--no-annot-template` | bool | (on) | Do not use the annotation in the TIF (default; consistent with recon-all). |
| `--no-cortex-label` | bool | label on | Do not build `?h.cortex.label`. |
| `--threads` | int | `1` | Threads passed to [[mris_make_average_surface]]. |
| `--symlink` / `--no-symlink`<br>`--no-link` | bool | symlink on | Use symbolic links (default) vs. copy files for sphere.reg aliases. |
| `--conform`<br>`-conform` / `--no-conform`<br>`-no-conform`<br>`-noconform` | flag | `-conform` | Conform (default) or not; forwarded to [[mris_make_average_surface]]. Both the double- and single-dash spellings are accepted on each side of the toggle ([`scripts/make_average_surface:726-742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L726-L742)). |
| `--no-surf2surf` | bool | off | Use the old parametric surface mapping in [[mris_make_average_surface]] (may give large faces at the poles). |
| `--lh` / `--rh` / `--lhrh` | bool | both | Restrict to one hemisphere (or explicitly both). |
| `--xhemi` / `--no-xhemi` | bool | off | Include each subject's `xhemi/` (left/right-reversed) data, doubling the effective sample for symmetric atlases. |
| `--template-only` / `--no-template-only` | bool | off | Make only the registration TIF, then stop (used by iterative atlas building). |
| `--nocleanup` | bool | — | No-op here; accepted for compatibility with [[make_average_volume]]. |
| `--debug`<br>`--echo` | bool | off | Trace execution. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

Accepted-and-ignored pass-through flags (so a single command line can drive
[[make_average_subject]]): zero-arg `--no-surf`, `--no-vol`, `--force`, `--link`,
`--keep-all-orig`, `--no-ribbon`, `--ctab-default`; one-arg `--ctab`,
`--rca-threads`, `--v-xform` (argument is consumed)
([`scripts/make_average_surface:744-769`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L744-L769)).

### Configuration Interactions

> [!gotcha] `--no-annot` also disables the annotation-based TIF
> Setting `--no-annot` clears both `UseAnnot` and `UseAnnotTemplate`
> ([`scripts/make_average_surface:597-604`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L597-L604)),
> so no average parcellations *and* a curvature-only registration template.

> [!gotcha] The cortex label depends on the Destrieux annotation
> `?h.cortex.label` is built from `label/?h.aparc.a2009s.annot`
> ([`scripts/make_average_surface:325-334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L325-L334)).
> If `aparc.a2009s` is not in the `--annot` list (e.g. because you passed a custom
> `--annot`), that file will be missing and the cortex-label step errors out.
> Either keep `aparc.a2009s` in the annot list or add `--no-cortex-label`.

> [!gotcha] `--xform` changes how the volume-geometry template is obtained
> With the default `talairach.xfm`, the script copies `mni305.cor.mgz` as the
> template. With any other `--xform` it instead builds `volgeom.template.mgz` from
> the first subject's orig via the transform, or reuses an existing average
> `orig.mgz` ([`scripts/make_average_surface:131-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L131-L164)) —
> hence running [[make_average_volume]] *first* (as [[make_average_subject]] does)
> gives a better geometry template.

- `--area` is special-cased: its average is kept as `?h.white.avg.area.mgh` for
  back-compatibility while other measures' temporary averages are deleted
  ([`scripts/make_average_surface:355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L355),
  [`:375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L375)).
- `--ico ≤ 5` reduces the inflation iterations to 2
  ([`scripts/make_average_surface:300-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L300-L301)).

## Typical Use Cases

### 1. Rebuild only the surfaces of an average subject

```bash
make_average_surface --out mystudy_avg --subjects subj01 subj02 subj03 subj04
```

### 2. Build just the registration template (iterative atlas)

```bash
make_average_surface --out atlas.i03 --surf-reg atlas.i02.sphere.reg \
  --subjects `cat subjlist.txt` --template-only --no-annot
```

### 3. Symmetric (xhemi) surface atlas

```bash
make_average_surface --out fsasym --subjects `cat subjlist.txt` --xhemi --lh
```

### 4. Map to MNI152 instead of Talairach

```bash
make_average_surface --out mni152_avg --subjects subj01 subj02 --mni152
```

## Pipeline Context

Normally invoked by [[make_average_subject]] *after* [[make_average_volume]]
([`scripts/make_average_subject:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L103)).
It is **not** part of [[wiki/pipelines/recon-all|recon-all]]. Inside
[[make_folding_atlas]], the `--template-only` mode is used each iteration to
regenerate the registration TIF that subjects are then re-registered to.

**Predecessor:** [[make_average_volume]] (volume-geometry template) →
**make_average_surface** → **Successors:** the `recon-all -cortribbon`
finishing step in [[make_average_subject]], or surface group analysis with
[[mris_preproc]].

## Gotchas and Caveats

> [!gotcha] `?h.orig` and `?h.sphere.reg` are symlinks, not real files
> `?h.orig` is symlinked to `?h.white`, and `?h.sphere.reg` to `?h.sphere`
> ([`scripts/make_average_surface:244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L244),
> [`:271-273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L271-L273)).
> Use `--no-symlink` to materialise copies (e.g. for archiving or for tools that
> dislike symlinks).

> [!gotcha] `mris_make_average_surface`'s own sphere.reg is discarded
> When *not* using the old `--no-surf2surf` path, the script deletes the
> `?h.sphere.reg` that [[mris_make_average_surface]] writes and replaces it with a
> copy of the canonical icosphere
> ([`scripts/make_average_surface:251-267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L251-L267)).
> For ico7 it uses the distributed `?h.sphere.reg`; otherwise `?h.sphere.ico<N>.reg`.

> [!gotcha] Usage-text typo: `--no-lik`
> The help lists `--no-lik` as a synonym for `--no-symlink`
> ([`scripts/make_average_surface:871`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L871));
> this is a typo — the parser accepts `--no-symlink` and `--no-link`, not
> `--no-lik`.

> [!gotcha] `FIX_VERTEX_AREA` is exported globally
> The script sets `FIX_VERTEX_AREA`
> ([`scripts/make_average_surface:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L28)),
> which changes how downstream binaries compute vertex area. This is intentional
> and matches recon-all conventions.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Most expensive steps are guarded by `UpdateNeeded`
  (e.g. template-volume build, sphere convert, smooth, inflate), so re-runs are
  cheap; `--force`-style re-computation is not exposed as a flag here (the
  internal `ForceUpdate` is off).
- Missing inputs (template volume, annotation, subject list) abort with explicit
  errors ([`scripts/make_average_surface:133-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L133-L135),
  [`:327-329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface#L327-L329)).
- Every binary's exit status is checked; failure stops the run.

## Related Tools

- [[make_average_subject]] — the orchestrator that calls this script.
- [[make_average_volume]] — sibling that builds the volume-geometry template this script prefers.
- [[mris_make_average_surface]] — the binary that performs the actual surface coordinate averaging.
- [[mris_make_template]] — builds the `?h.reg.template.tif` spherical registration template.
- [[mris_smooth]], [[mris_inflate]] — derive `smoothwm` and `inflated`.
- [[mris_preproc]], [[mri_concat]], [[mri_surf2surf]] — compute the average/std per-vertex measures.
- [[annot2std]], [[mri_cor2label]] — build average parcellations and the cortex label.
- [[fsaverage]] — the canonical surface average this reproduces.

## Confidence and Gaps

**High confidence:** complete flag list and aliases, the build sequence, the
symlink behaviour, the cortex-label dependency on `aparc.a2009s`, the
`--xform`/template-volume interaction, and the `--meas`/`--annot` defaults — all
read directly from
[`scripts/make_average_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface).

## References

- FreeSurfer source: [`scripts/make_average_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_surface) (v8.2.0).
- Built-in help: `make_average_surface --help`.
- Related concept: [[fsaverage]]; format: [[mrisp-tif]].
