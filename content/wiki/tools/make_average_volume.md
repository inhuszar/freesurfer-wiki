---
title: "make_average_volume"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_average_volume"
families: []
recon_all_stage: null
related:
  - "[[make_average_subject]]"
  - "[[make_average_surface]]"
  - "[[mri_average]]"
  - "[[mri_concat]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_vol2vol]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - average-subject
  - volume
  - segmentation
  - template
  - talairach
---

# make_average_volume

## Summary

`make_average_volume` builds the **volume** half of a FreeSurfer average subject.
It maps each input subject's intensity volumes (`nu`, `norm`) into a common space
(MNI305/Talairach by default), averages them with [[mri_average]], and creates a
voted average segmentation (`aseg.mgz`) plus its voxelwise probability
(`p.aseg.mgz`) by transforming each subject's `aseg` with [[mri_vol2vol]] and
combining them with [[mri_concat]] [`--vote`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L254).
It also writes an identity `talairach.xfm` (the template *is* the target space)
and the symlink web (`orig.mgz`, `T1.mgz`, `brain.mgz`, …) that the rest of
FreeSurfer expects in a subject's `mri/` directory.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_average_volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_average_volume`
- **Original author:** Doug Greve
- **Tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L128), [`mri_average`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L143), [`mri_add_xform_to_header`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L149), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L157), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L231), and `fs_time`.

## Purpose and Context

The volume side of an average subject is needed so that the template has a
defined intensity image and segmentation in a standard space, and so that
[[make_average_surface]] has a volume-geometry header to attach to its surfaces.
`make_average_volume` is normally called first by [[make_average_subject]]
(before the surface step), but can be run directly to (re)build just the volumes.

The default target space is **MNI305** (the FreeSurfer Talairach space): every
subject's volume is resampled through its `mri/transforms/talairach.xfm`, and the
output `c_ras` is set to 0 so the template is centred. With `--xform`/`--mni152`
a different transform (including a nonlinear SynthMorph warp or an `.m3z`) can be
used instead.

## Inputs

### Required Inputs

- **A subject list** — `--subjects`, the `SUBJECTS` env var, `--fsgd`, or `--f`
  ([`scripts/make_average_volume:333-374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L333-L374)).
- Each subject must contain `mri/nu.mgz`, `mri/norm.mgz`, `mri/aseg.mgz`, and
  `mri/transforms/talairach.xfm` (or the transform named by `--xform`).

### Input Assumptions

> [!assumption] Recon-complete subjects with valid Talairach
> The default transform is `talairach.xfm`, so each subject's Talairach
> registration must be accurate. Missing `nu`, `norm`, `aseg`, or the transform
> aborts the run with an explicit error
> ([`scripts/make_average_volume:108-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L108-L118)).

## Outputs

### Files Created

Written under `<sd-out>/<average_subject>/mri/`:

| File | Produced by | Contents |
|------|-------------|----------|
| `nu.mgz`, `norm.mgz` | [[mri_average]] | average intensity volumes in template space |
| `rawavg.mgz`, `orig.mgz`, `T1.mgz` | symlinks → `nu.mgz` | conventional aliases |
| `brain.mgz`, `brainmask.mgz` | symlinks → `norm.mgz` | conventional aliases |
| `orig.all.mgz` | [[mri_concat]] | per-subject orig volumes concatenated — *see contradiction below; not produced in practice* |
| `aseg.mgz` | [[mri_concat]] (`--vote`) + [[wiki/tools/mri_convert\|mri_convert]] (frame 0) | majority-voted average segmentation |
| `p.aseg.mgz` | [[wiki/tools/mri_convert\|mri_convert]] (frame 1) | per-voxel probability of the winning label |
| `aseg.presurf.mgz`, `aseg.presurf.hypos.mgz` | symlinks → `aseg.mgz` | needed by the ribbon/`aparc+aseg` step |
| `transforms/talairach.xfm` | this script | identity transform (template = target space) |
| `scripts/make_average_volume.log` | this script | log |

### Output Specifications

By default outputs are 1 mm isotropic conformed MGZ in MNI305 space with
`c_ras = 0`. The segmentation is integer-typed (nearest-neighbour resampled). The
written `talairach.xfm` is the identity
([`scripts/make_average_volume:173-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L173-L181)),
reflecting that the average already lives in Talairach space. See
[[coordinate-systems]] and [[mgz]].

## Mathematical Foundations

> [!math] Intensity averaging and label voting
> Intensities are averaged voxelwise after spatial normalisation:
> $\bar{I}(x) = \frac{1}{N}\sum_i I_i\!\big(T_i^{-1}x\big)$, performed by
> [[mri_average]]. The segmentation uses **majority voting**: for each voxel the
> output label is $\arg\max_\ell \#\{i : S_i(x)=\ell\}$ and the probability map
> stores $p(x) = \max_\ell \#\{i:S_i(x)=\ell\}/N$, computed by
> [[mri_concat]] (`--vote`; frame 0 = label, frame 1 = probability).

> [!internal] Resampling and interpolation
> The spatial transforms (`--apply_transform`, `mri_vol2vol --xfm/--m3z`) and the
> conform/interpolation choices are implemented in
> [[wiki/tools/mri_convert|mri_convert]] and [[mri_vol2vol]]. Intensities use the
> default (trilinear); segmentations use nearest-neighbour.

## Configuration Options

### Complete Flag Reference

Enumerated from the parser
([`scripts/make_average_volume:322-593`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L322-L593)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`--subjects` | string list | *(one required)* | Input subjects (variable-length list). |
| `--fsgd` | file | — | Subject list from an FSGD file. |
| `--f` | file | — | Append subjects from a text file. |
| `--out` | string | `average` | Output average-subject name. |
| `--sd-out` | string | `$SUBJECTS_DIR` | Write output here. |
| `--sdir`<br>`--sd` | string | `$SUBJECTS_DIR` | `SUBJECTS_DIR` to use. |
| `--xform`<br>`--v-xform` | string | `talairach.xfm` | Volume transform under `mri/transforms/` applied before averaging. |
| `--mni152` | bool | off | Use the SynthMorph warp `synthmorph.1.0mm.1.0mm/warp.to.mni152.1.0mm.1.0mm.nii.gz`. |
| `--ctab` | file | — | Embed this color table into the output segmentations. |
| `--ctab-default` | bool | off | Embed `$FREESURFER_HOME/FreeSurferColorLUT.txt`. |
| `--no-aseg` | bool | aseg on | Do not build the average segmentation. |
| `--aseg` | bool | on | Build the average segmentation (the default). |
| `--keep-all-orig` | bool | off | Intended to concatenate per-subject orig into `orig.all.mgz` (see contradiction). |
| `--conform`<br>`-conform` / `--no-conform`<br>`-no-conform`<br>`-noconform` | flag | `-conform` | Conform output volumes (default) or not; passed to [[mri_average]] and the seg conform. Both the double- and single-dash spellings are accepted on each side of the toggle ([`scripts/make_average_volume:553-569`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L553-L569)). |
| `--xhemi` | bool | off | Also include each subject's `xhemi/` data (requires the `xhemi` dir to exist). |
| `--threads` | int | — | Threads (stored; passed through context). |
| `--nocleanup` | bool | cleanup on | Keep the temporary working directory. |
| `--debug`<br>`--echo` | bool | off | Trace execution. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

Accepted-and-ignored pass-through flags (so one command line drives
[[make_average_subject]]): zero-arg `--symlink`, `--no-symlink`, `--no-link`,
`--template-only`, `--no-template-only`, `--link`, `--no-surf`, `--no-vol`,
`--force`, `--lh`, `--rh`, `--lhrh`, `--no-ribbon`, `--no-annot`,
`--no-annot-template`, `--no-cortex-label`, `--no-surf2surf`; one-arg `--surfreg`,
`--surf-reg`, `--surf_reg`, `--ico`, `--annot`, `--meas`, `--rca-threads`,
`--s-xform`, `--s-dest-lta` (argument consumed)
([`scripts/make_average_volume:466-519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L466-L519)).

### Configuration Interactions

> [!contradiction] `--keep-all-orig` produces nothing here
> The help says `--keep-all-orig` concatenates the orig volumes into
> `mri/orig.all.mgz`, and the concat command exists at
> [`scripts/make_average_volume:155-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L155-L160).
> But it is gated by `$volid == orig`, while the intensity loop only iterates over
> `nu` and `norm` ([`scripts/make_average_volume:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L103)) —
> `orig` is never a loop value, so the branch is dead and `orig.all.mgz` is **not**
> created by `make_average_volume` in v8.2.0. (`--keep-all-orig` is still accepted
> as a flag.) Code is authoritative.

> [!gotcha] Talairach vs. non-Talairach transform changes the seg path
> For the **default** `talairach.xfm` the segmentation is resampled to
> `mni305.cor.mgz` with [[mri_vol2vol]] (`--xfm` for `.xfm`, `--m3z`/`--s` for an
> `.m3z`). For any **other** `--xform` it is resampled with
> [[wiki/tools/mri_convert|mri_convert]] `--apply_transform` and, if conforming,
> re-conformed to int
> ([`scripts/make_average_volume:210-246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L210-L246)).

> [!gotcha] `-oc 0 0 0` only with `talairach.xfm`
> The intensity volumes get `c_ras = 0` (centred) only on the default Talairach
> path ([`scripts/make_average_volume:129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L129)).
> With a custom `--xform`, the output centre is whatever the transform yields.

- `--no-aseg` skips the entire segmentation block, so no `aseg.mgz`,
  `p.aseg.mgz`, or the `aseg.presurf*` symlinks — which means the downstream
  ribbon/`aparc+aseg` step in [[make_average_subject]] would have nothing to read.
- `--conform`/`--no-conform` is forwarded to [[mri_average]] and also controls
  whether a non-Talairach segmentation is re-conformed.

## Typical Use Cases

### 1. Rebuild only the volumes of an average subject

```bash
make_average_volume --out mystudy_avg --subjects subj01 subj02 subj03 subj04
# → mri/{nu,norm,orig,T1,brain,brainmask}.mgz, aseg.mgz, p.aseg.mgz
```

### 2. Average with an embedded color table

```bash
make_average_volume --out mystudy_avg --subjects subj01 subj02 \
  --ctab-default
```

### 3. Average into MNI152 (nonlinear)

```bash
make_average_volume --out mni152_avg --subjects subj01 subj02 --mni152
```

### 4. Intensities only, no segmentation

```bash
make_average_volume --out introi_avg --subjects subj01 subj02 --no-aseg
```

## Pipeline Context

Called first by [[make_average_subject]]
([`scripts/make_average_subject:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_subject#L92)),
so that the volume-geometry template exists before [[make_average_surface]] runs.
It is **not** part of [[wiki/pipelines/recon-all|recon-all]]. Inside
[[make_folding_atlas]] it is optionally run (via `make_average_subject --vol`) on
the last iteration to give the atlas subject a volume.

**Predecessor:** N× [[wiki/pipelines/recon-all|recon-all]] →
**make_average_volume** → **Successors:** [[make_average_surface]] (uses the
geometry template) and the `recon-all -cortribbon -aparc2aseg` finishing step.

## Gotchas and Caveats

> [!gotcha] The symlink web mirrors a real subject
> `orig.mgz`/`T1.mgz`/`rawavg.mgz` point at `nu.mgz`, and
> `brain.mgz`/`brainmask.mgz` at `norm.mgz`
> ([`scripts/make_average_volume:165-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L165-L171)).
> These are **symlinks**, so deleting `nu.mgz`/`norm.mgz` breaks several "files".

> [!gotcha] Voting needs a brainmask; failure is non-fatal
> The vote is masked by `mri/brainmask.mgz` and, if it fails, the script prints a
> *warning* and continues without that segmentation rather than aborting
> ([`scripts/make_average_volume:254-262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L254-L262)).
> An average subject can therefore silently end up without an `aseg.mgz`.

> [!gotcha] `aparc+aseg`/`wmparc` are intentionally *not* voted here
> The script comments that `aparc+aseg` and `wmparc` "don't work so well" by
> voting, so only `aseg` is voted; the surface-based `aparc+aseg` is built later by
> the recon-all step in [[make_average_subject]]
> ([`scripts/make_average_volume:184-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L184-L186)).

## Error Compensation and Guard Rails

- All required per-subject inputs (`nu`, `norm`, `aseg`, transform) are checked
  before use; a missing one aborts
  ([`scripts/make_average_volume:108-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L108-L118),
  [`:195-206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L195-L206)).
- Reference to each subject's individual `talairach.xfm` is stripped from the
  averaged header with `mri_add_xform_to_header -c auto`
  ([`scripts/make_average_volume:149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume#L149)).
- A temporary working directory under `<out>/tmp/` is removed unless
  `--nocleanup` is set.
- The voting step's failure is downgraded to a warning (see Gotchas), so check the
  log if the average subject is missing its segmentation.

## Known Bugs

- [[00190]] — `--keep-all-orig` is a silent no-op: the volume loop only iterates over `nu`/`norm`, so the `$volid == orig` guard never fires and `mri/orig.all.mgz` is never written.

## Related Tools

- [[make_average_subject]] — the orchestrator that calls this script first.
- [[make_average_surface]] — sibling that consumes the volume-geometry template.
- [[mri_average]] — averages the intensity volumes.
- [[mri_concat]] — performs the majority vote (`--vote`) and `--mean`/`--std`.
- [[wiki/tools/mri_convert|mri_convert]], [[mri_vol2vol]] — apply the spatial transforms / resampling.
- [[fsaverage]] — the canonical average subject this reproduces.

## Confidence and Gaps

**High confidence:** complete flag list and aliases, the intensity-average and
voting workflow, the symlink web, the Talairach vs. non-Talairach seg path, the
identity `talairach.xfm`, and the dead `--keep-all-orig` branch — all read
directly from
[`scripts/make_average_volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume).

## References

- FreeSurfer source: [`scripts/make_average_volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_average_volume) (v8.2.0).
- Built-in help: `make_average_volume --help`.
- Related concept: [[fsaverage]].
