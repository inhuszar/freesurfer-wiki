---
title: "label_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label_subject"
families: []                     # legacy GCA subcortical-labelling driver (label_subject family)
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_em_register]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[label_subject_mixed]]"
  - "[[label_child]]"
  - "[[label_elderly_subject]]"
  - "[[label_subject_flash]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[gca-format]]"
  - "[[aseg.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Requires the GCA atlas path to be provided via the $GCA environment variable, which the script never sets or validates; the calling context that defines $GCA is external (historically a wrapper or the user's shell)."
  - "Pre-dates the modern recon-all -gcareg/-canorm/-careg/-calabel stream; not invoked by recon-all in v8.2.0. Whether it is still used by any active workflow is unverified."
tags:
  - segmentation
  - atlas
  - subcortical
  - aseg
  - legacy
---

# label_subject

## Summary

`label_subject` is a legacy tcsh driver that performs whole-brain **subcortical
segmentation** of a single subject using a Gaussian Classifier Atlas (GCA). It is
a thin orchestration wrapper that runs the four canonical GCA tools in sequence —
[[mri_em_register]] (affine atlas alignment), [[mri_ca_normalize]] (atlas-guided
intensity normalisation), [[mri_ca_register]] (non-linear atlas registration),
and [[mri_ca_label]] (Bayesian voxel labelling) — to turn an intensity-corrected
T1 (`nu`) into a labelled `aseg.mgz`. It optionally runs `nu_correct` first if the
non-uniformity-corrected volume is missing. All four steps use the
**cross-sequence** preset, so the script is intended for data whose contrast does
not match the atlas's native acquisition. The GCA atlas itself is supplied through
the external `$GCA` environment variable.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/label_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/label_subject`
- **FreeSurfer tools invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L60), [`mri_ca_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L61), [`mri_ca_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L62), [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L63), and (conditionally) [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L54) + `nu_correct` for the optional non-uniformity correction.

## Purpose and Context

This script captures, as a standalone command, the classic GCA subcortical
labelling pipeline that modern [[wiki/pipelines/recon-all|recon-all]] implements
internally as its `-gcareg → -canorm → -careg → -calabel` stream (autorecon2/3).
It exists so that the labelling stage can be run by hand on an already-skull-
stripped, NU-corrected subject — for example to re-segment with a different atlas,
or to drive labelling from another script. The sibling
[`segment_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L56)
script calls `label_subject $1` as its final step; the related
`segment_subject_talmgh` and `segment_subject_notal2` scripts contain the same
call commented out.

It is **not** invoked by `recon-all` or `trac-all` in v8.2.0. It is the canonical
member of a small family of variant drivers ([[label_subject_mixed]],
[[label_child]], [[label_elderly_subject]], [[label_subject_flash]]) that differ
only in the atlas and the `mri_ca_label` options they use.

> [!gotcha] The atlas comes from `$GCA`, which the script never sets
> Every atlas tool here is invoked with `$GCA` as the classifier-array argument,
> but `label_subject` itself never assigns `$GCA`
> ([`scripts/label_subject:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L60-L63)).
> The variable must be exported by the caller's environment before the script is
> run (e.g. `setenv GCA $FREESURFER_HOME/average/RB_all_2020-01-02.gca`). Because
> the script uses `#!/bin/tcsh -ef`, an unset `$GCA` aborts the run with an
> "Undefined variable" error rather than producing a partial result.

## Inputs

### Required Inputs

- **Subject ID** — the sole positional argument (`$1`), resolved against
  `$SUBJECTS_DIR` ([`scripts/label_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L21), [`:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L30)).
- **`$GCA`** (environment) — path to the [[gca-format|GCA]] atlas used by all four
  steps.
- **`mri/brain`** (or `brain.mgz`) — the skull-stripped brain, used as the `-mask`
  for em-register, ca-normalize, and ca-register
  ([`scripts/label_subject:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L32-L36)).
- **`mri/nu`** (or `nu.mgz`) — the non-uniformity-corrected T1 that is registered,
  normalised, and labelled ([`scripts/label_subject:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L38-L42)). If
  missing, it is generated from `mri/orig` (see Error Compensation).

### Input Assumptions

> [!assumption] A partially-processed subject directory
> The script assumes a `$SUBJECTS_DIR/<subj>/mri/` tree that already contains a
> skull-stripped `brain` and (ideally) a `nu` volume, plus a
> `transforms/` subdirectory to receive `talairach.lta` and `talairach.m3z`. The
> `nu`/`brain` volumes are taken as-is; only `nu` is auto-generated when absent.
> The contrast of `nu` need not match the atlas because every step uses the
> cross-sequence preset, but the data is assumed conformed (1 mm isotropic) as
> produced by the upstream recon-all stages.

The script probes whether the `.mgz` or extensionless form of each volume exists
and selects accordingly, so it tolerates both the modern (`brain.mgz`/`nu.mgz`)
and very old (`brain`/`nu`) naming conventions.

## Outputs

### Files Created

All paths are under `$SUBJECTS_DIR/<subj>/mri/`.

| File | Created by | Contents |
|------|-----------|----------|
| `transforms/talairach.lta` | [[mri_em_register]] | Affine subject→atlas transform ([[lta-format]]) |
| `norm.mgz` | [[mri_ca_normalize]] | Atlas-guided intensity-normalised T1 |
| `transforms/talairach.m3z` | [[mri_ca_register]] | Non-linear (morph) subject→atlas warp ([[m3z-format]]) |
| `aseg.mgz` | [[mri_ca_label]] | Subcortical segmentation label volume ([[aseg.mgz]]) |
| `nu.mgz` | `nu_correct` (only if `nu` absent) | Non-uniformity-corrected T1 |

Intermediate MINC files (`/tmp/nu$$0.mnc`, `/tmp/nu$$1.mnc`) used by the optional
`nu_correct` step are deleted afterwards
([`scripts/label_subject:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L54-L58)).

### Output Specifications

The geometry and label set of `aseg.mgz` are entirely determined by the chosen
`$GCA` atlas and by [[mri_ca_label]]; `label_subject` adds no resampling of its
own. Labels follow the standard FreeSurfer [[color-lut|colour LUT]].

## Mathematical Foundations

None in the script itself — `label_subject` is pure orchestration. All numerical
work (EM affine registration, GCA bias-field normalisation, non-linear atlas
morph, and Bayesian MAP labelling) lives in the four binaries it calls.

> [!internal] The labelling mathematics live in the GCA tools
> See [[mri_em_register]], [[mri_ca_normalize]], [[mri_ca_register]], and
> [[mri_ca_label]] for the registration, normalisation, and maximum-a-posteriori
> classification equations. The [[gca-format]] page describes the Gaussian
> classifier array these tools consume.

## Configuration Options

### Complete Flag Reference

`label_subject` takes **no command-line flags** — only the subject ID as `$1`.
All behaviour is fixed in the script body; configuration is via environment
variables and the on-disk volumes.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `$1` (subject) | positional | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$GCA` | env | *(required, unset by script)* | GCA atlas path passed to all four atlas tools. |
| `$SUBJECTS_DIR` | env | *(required)* | Root of the subject tree. |
| `$LOGNAME` | env | login user | Used to scope the `*.imp` cleanup after `nu_correct`. |

The fixed filenames the script hard-codes are
`M3D=talairach.m3z` and `LTA=talairach.lta`
([`scripts/label_subject:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L23-L24)).

The exact commands run are:

```tcsh
mri_em_register   -mask brain  nu  $GCA  transforms/talairach.lta
mri_ca_normalize  -mask brain  nu  $GCA  transforms/talairach.lta  norm.mgz
mri_ca_register   -cross-sequence -mask brain -T transforms/talairach.lta \
                  norm.mgz  $GCA  transforms/talairach.m3z
mri_ca_label      -cross-sequence  norm.mgz  transforms/talairach.m3z  $GCA  aseg.mgz
```

(paths shown relative to `mri/`; see
[`scripts/label_subject:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L60-L63)).

### Configuration Interactions

> [!gotcha] `-cross-sequence` is hard-wired into the registration and labelling
> Both [`mri_ca_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L62)
> and [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L63)
> are called with `-cross-sequence`, which (per [[mri_ca_label]]) is equivalent to
> `-renormalize 1 9 -a 2 -regularize 0.5`. This renormalises the atlas intensity
> model to the subject, which is appropriate when the input contrast differs from
> the atlas. Note that the `mri_em_register` and `mri_ca_normalize` calls do
> **not** add a cross-sequence flag, so only the warp and the labelling step
> renormalise.

> [!gotcha] `norm.mgz` is overwritten
> `mri_ca_normalize` writes `mri/norm.mgz`, the same canonical filename recon-all
> uses. Running `label_subject` on a subject already processed by recon-all will
> overwrite that subject's `norm.mgz` (and `aseg.mgz`, `talairach.lta`,
> `talairach.m3z`). Use a scratch subject if you need to preserve a recon-all run.

## Typical Use Cases

### Re-segment a subject with a chosen GCA atlas

```bash
setenv SUBJECTS_DIR /data/study
setenv GCA $FREESURFER_HOME/average/RB_all_2020-01-02.gca
label_subject subj01
# → mri/aseg.mgz, mri/norm.mgz, transforms/talairach.{lta,m3z}
```

### As the final step of an older segmentation wrapper

```bash
# segment_subject_sc ends with:  label_subject $1
segment_subject_sc subj01
```

## Pipeline Context

`label_subject` reimplements the GCA subcortical-labelling chain that
[[wiki/pipelines/recon-all|recon-all]] now runs internally (its
`-gcareg`/`-canorm`/`-careg`/`-calabel` steps in autorecon2/3). It is **not**
called by recon-all in v8.2.0.

**Predecessor:** upstream recon-all stages producing `mri/orig`, `mri/nu`,
`mri/brain` → **`label_subject`** (em-register → ca-normalize → ca-register →
ca-label) → **Successor:** downstream consumers of `aseg.mgz` (statistics,
[[wiki/tools/freeview|freeview]] inspection, surface placement).

## Gotchas and Caveats

> [!gotcha] `set echo=1` makes the script very verbose
> Command tracing is enabled near the top
> ([`scripts/label_subject:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L44)),
> so every command is echoed to the terminal. This is expected, not an error.

> [!gotcha] Hard-coded `/tmp` scratch and a broad cleanup
> The optional `nu_correct` path writes `/tmp/nu$$0.mnc` / `/tmp/nu$$1.mnc` (`$$`
> = PID) and then runs `find /tmp -prune -name "*.imp" -user $LOGNAME -exec rm -f`
> to clean MINC import files ([`scripts/label_subject:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L54-L58)).
> This deletes only your own `*.imp` files at the top of `/tmp` and is harmless,
> but worth knowing on shared machines.

## Error Compensation and Guard Rails

- **Auto-generates `nu` if missing.** If neither `mri/nu` nor `mri/nu.mgz` exists,
  the script converts `mri/orig` to MINC, runs
  `nu_correct -stop .0001 -iterations 3 -normalize_field -clobber`, converts back
  to `mri/nu.mgz`, and cleans up
  ([`scripts/label_subject:47-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject#L47-L59)). This is the script's
  one substantive piece of error compensation.
- **Filename-form probing.** Both `brain`/`brain.mgz` and `nu`/`nu.mgz` (and
  `orig`/`orig.mgz`) are detected by existence checks, so the script works with
  either the modern or the legacy extensionless naming.
- **No `--help` / argument validation.** The script does not parse options; any
  first argument (including `--help`) is treated as a subject name, which then
  fails downstream when the directory does not exist.

## Related Tools

- [[mri_em_register]] — step 1: affine subject→atlas alignment (`talairach.lta`).
- [[mri_ca_normalize]] — step 2: atlas-guided intensity normalisation (`norm.mgz`).
- [[mri_ca_register]] — step 3: non-linear atlas morph (`talairach.m3z`).
- [[mri_ca_label]] — step 4: Bayesian subcortical labelling (`aseg.mgz`).
- [[label_subject_mixed]] — variant using `mixed.gca` and a single `mri_ca_label` call.
- [[label_child]] / [[label_elderly_subject]] / [[label_subject_flash]] — paediatric / elderly / FLASH variants.
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline that subsumes this chain.
- [[wiki/tools/mri_convert|mri_convert]] / `nu_correct` — used in the optional NU-correction fallback.

## Confidence and Gaps

**High confidence:** the four-step command sequence, the fixed transform/atlas
filenames, the `-cross-sequence` presets, the `nu` auto-generation fallback, and
the `brain`/`nu` form-probing — all read directly from
[`scripts/label_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject).

> [!gap] `$GCA` is supplied externally
> The script relies on `$GCA` being exported by the caller and never sets or
> validates it. Which atlas was historically intended is not recorded in the
> script; any GCA the four tools accept will work.

> [!gap] Active usage in v8.2.0 unverified
> `label_subject` is not on the recon-all/trac-all path and is only referenced by
> the `segment_subject_*` scripts (one live call, two commented). Whether any
> current workflow still drives it is unknown.

## References

- FreeSurfer source: [`scripts/label_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject) (v8.2.0).
- Calling script: [`scripts/segment_subject_sc:56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L56).
