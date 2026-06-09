---
title: "gcaprepone"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gcaprepone"
families: []                     # GCA-training helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[gcatrain]]"
  - "[[gcainit]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_add_xform_to_header]]"
  - "[[mri_em_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Behaviour when a subject lacks a tmp/control.dat is benign (skipped), but downstream use of copied control points by recon-all/mri_ca_normalize was not traced here."
tags:
  - atlas
  - training
  - segmentation
  - gca
  - preprocessing
---

# gcaprepone

## Summary

`gcaprepone` prepares **one** training subject for GCA atlas building. It is a
per-subject worker invoked by [[gcatrain]]: for the named subject it creates the
subject tree inside the atlas-training directory, copies the raw
`mri/orig/NNN.mgz` input volumes and the hand-edited manual segmentation from the
source `SUBJECTS_DIR`, runs [[wiki/pipelines/recon-all|recon-all]] `-autorecon1`
far enough to produce `nu.mgz` (NU-corrected, skull-stripped intensity volume),
and writes the Talairach transform into the manual segmentation's header so later
tools do not complain. For the designated **init** subject it additionally copies
the manual Talairach transform and marks the subject as the initialisation
subject.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gcaprepone`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone)
- **Binary/script location:** `$FREESURFER_HOME/bin/gcaprepone`
- **Tools it calls:** [`recon-all -autorecon1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L132-L135) (timed with `fs_time`) and [`mri_add_xform_to_header`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L145).

## Purpose and Context

GCA atlas training (see [[gcatrain]]) needs every subject in a clean, uniform
state: the raw anatomical present as `mri/orig/NNN.mgz`, an intensity-normalised
`nu.mgz`, a brain mask, and a manual segmentation whose header carries a
Talairach transform. `gcaprepone` is the small, single-subject script that brings
one subject to that state. [[gcatrain]] loops over the subject list and dispatches
one `gcaprepone` job per subject (typically via `pbsubmit`), so that all subjects
can be prepared in parallel before the iterative atlas training begins.

It is **not** a stand-alone user tool and **not** part of the ordinary
[[wiki/pipelines/recon-all|recon-all]] stream; it is a building block of the GCA
training pipeline. All existence checks on the inputs are performed by the calling
[[gcatrain]] script, not here ([`scripts/gcaprepone:290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L290)).

## Inputs

### Required Inputs

- **`--g gcadir`** — the atlas-training directory (becomes `SUBJECTS_DIR`). It
  must already contain the `scripts/` text files that [[gcatrain]] wrote
  (`manseg.txt`, `mantal.txt`, `initsubject.txt`), which are read at
  [`scripts/gcaprepone:74-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L74-L76).
- **`--s subject`** — the subject ID to prepare.
- **`--sd src_subjects_dir`** — the source `SUBJECTS_DIR` holding the subject's
  raw data and manual segmentation.

From the source subject directory it consumes:

- `mri/orig/[0-9][0-9][0-9].mgz` — one or more conformed input volumes (copied).
- `mri/<manseg>` — the manual segmentation named in `scripts/manseg.txt` (copied).
- `tmp/control.dat` — optional control-point file (copied if present).
- For the **init subject only:** `mri/transforms/<mantal>` — the manual Talairach
  transform named in `scripts/mantal.txt`.

### Input Assumptions

> [!assumption] A recon-able subject with conformed inputs and a manual segmentation
> The subject is assumed to have conformed `mri/orig/NNN.mgz` volume(s) and a
> hand-edited segmentation volume, suitable for `recon-all -autorecon1`
> (skull strip, intensity normalisation, NU correction). Only the init subject is
> assumed to have a manual Talairach transform; for all other subjects the
> transform is computed by recon-all. The volume-name pattern `NNN.mgz`
> (three digits) is matched case-insensitively
> ([`scripts/gcaprepone:86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L86)).

## Outputs

### Files Created

All paths are under `gcadir/<subject>/`.

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `mri/orig/NNN.mgz` | per subject | copied raw input volume(s) |
| `mri/<manseg>` | per subject | copied manual segmentation, with Talairach added to its header |
| `tmp/control.dat` | per subject | copied control points (only if present at source) |
| `mri/nu.mgz`, `mri/brainmask.mgz`, `mri/T1.mgz`, `mri/transforms/talairach.xfm`, … | per subject | products of `recon-all -autorecon1` |
| `scripts/recon-all.prep.log`, `scripts/recon-all.prep.done` | per subject | recon-all log and done sentinel |
| `mri/transforms/<mantal>` | init subject only | copied manual Talairach transform |
| `gcadir/init.subject` (symlink), `<subject>/gcatrain.init.subject` | init subject only | markers identifying the init subject |
| `log/gcaprepone.<subject>.log` | `gcadir/log/` | this script's log |

### Output Specifications

The headline product is the per-subject `nu.mgz` (and the brain mask / Talairach
needed downstream); their geometry and data type are produced by
[[wiki/pipelines/recon-all|recon-all]]. The manual segmentation is copied byte-for-byte
and then has a transform written into its header by
[[mri_add_xform_to_header]] — the voxel data are unchanged.

## Mathematical Foundations

None of its own — `gcaprepone` only copies files and invokes other tools.

> [!internal] The intensity normalisation / NU correction math lives in recon-all
> All image computation (skull strip, `nu_correct`, intensity normalisation that
> yields `nu.mgz`) is performed by `recon-all -autorecon1`; see
> [[wiki/pipelines/recon-all|recon-all]]. `mri_add_xform_to_header` merely records
> a transform string in the volume header and does not resample voxels.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gcaprepone:188-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L188-L272)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g` | string | *(required)* | Atlas-training directory; becomes `SUBJECTS_DIR`. Must contain the `scripts/*.txt` files written by [[gcatrain]]. (The usage text shows `--o`, but the parser accepts `--g`; see gotcha.) |
| `--s` | string | *(required)* | Subject ID to prepare. |
| `--sd` | string | *(required)* | Source `SUBJECTS_DIR` to copy this subject's raw data and manual segmentation from. |
| `--no-emreg` | bool | EM-reg on | Pass `-no-emreg` to `recon-all` (skip [[mri_em_register]] during preparation). |
| `--emreg` | bool | on | Use [[mri_em_register]] (default). |
| `--nthreads`<br>`--threads` | int | `1` | OpenMP threads; sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS` (passed to recon-all). |
| `--done` | file | — | Write a done file: `0` on success, `1` on error. Used by [[gcatrain]] as the job sentinel. |
| `--nuintensitycor-nomask` | bool | (set; see gotcha) | Sets the internal `UseMaskNuCorrect=0` flag. It is **not** added to the recon-all command (that line is commented out), so it currently has no effect. |
| `--log` | string | `gcadir/log/gcaprepone.<subject>.log` | Explicit log file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] Usage shows `--o` and `--init-subject`, but the parser implements neither
> The usage block advertises `--o gcadir` and `--init-subject`
> ([`scripts/gcaprepone:306-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L306-L314)), but the argument
> parser only accepts `--g` (not `--o`) and has **no** `--init-subject` case
> ([`scripts/gcaprepone:196-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L196-L199)). Whether a subject is the
> init subject is decided automatically by comparing it to
> `scripts/initsubject.txt` ([`scripts/gcaprepone:76-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L76-L79)),
> not via a flag. Passing `--o` or `--init-subject` triggers "Flag unrecognized".

> [!contradiction] `--nuintensitycor-nomask` is a no-op
> The flag sets `UseMaskNuCorrect=0`, but the only line that would have added a
> corresponding option to the `recon-all` command is commented out
> ([`scripts/gcaprepone:136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L136)), with a note that
> non-masked NU correction "is default now in recon-all". So the flag is accepted
> but changes nothing. Code is authoritative.

Other interactions:

- The init-subject branch is taken purely on the name match; only then are the
  manual `.xfm` copied, the `init.subject` symlink made, and the
  `gcatrain.init.subject` marker touched
  ([`scripts/gcaprepone:111-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L111-L127)).
- The `recon-all` call always uses `-no-talcheck` (to speed it up) and `-done`;
  `--no-emreg` adds `-no-emreg` ([`scripts/gcaprepone:132-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L132-L135)).

## Typical Use Cases

### 1. As dispatched by gcatrain (normal use)

```bash
# This is the exact form gcatrain builds, one per subject:
gcaprepone --g rb10-gcatrain --s 990104_vc700 \
  --sd /space/subjects/atlases/aseg_atlas \
  --done rb10-gcatrain/log/done/gcaprep.990104_vc700.done --nthreads 4
```

Copies the subject's data into `rb10-gcatrain/990104_vc700`, runs `recon-all
-autorecon1` to make `nu.mgz`, and (because this ID matches the init subject)
copies the manual Talairach and marks it as the init subject.

### 2. Prepare a non-init subject manually

```bash
gcaprepone --g rb10-gcatrain --s 040806_anon \
  --sd /space/subjects/atlases/aseg_atlas --nthreads 4
```

## Pipeline Context

`gcaprepone` is the **first (per-subject) stage** of the GCA-training pipeline,
called in a loop by [[gcatrain]]
([`scripts/gcatrain:146-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L146-L147)). It is **not**
invoked by the ordinary [[wiki/pipelines/recon-all|recon-all]] or `trac-all`
streams. It internally runs `recon-all -autorecon1` to generate the
intensity-normalised `nu.mgz` that every later stage depends on.

**Predecessor:** [[gcatrain]] (sets up `gcadir/scripts/`) → **gcaprepone** (per
subject) → **Successor:** [[gcainit]] (init subject) and the per-iteration
[[mri_ca_register]]/[[mri_ca_train]] loop in [[gcatrain]].

## Gotchas and Caveats

> [!gotcha] No input validation here — it trusts gcatrain
> A comment states "All checks for existence of files has been done in gcatrain"
> ([`scripts/gcaprepone:290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L290)). Run on its own with a
> missing input, it will fail mid-copy rather than report a clean error.

> [!gotcha] Talairach is added to the manual segmentation, not the init transform
> The script writes the recon-all-produced `transforms/talairach.xfm` into the
> manseg header (`mri_add_xform_to_header`), explicitly **not** the manual
> `mantal`, because only the init subject has a manual transform
> ([`scripts/gcaprepone:141-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L141-L148)).

## Error Compensation and Guard Rails

- **Done file with status code.** On success a `0` is written to `--done`; on any
  failed step the script jumps to `error_exit` and writes `1`
  ([`scripts/gcaprepone:166-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L166-L184)), which [[gcatrain]]
  reads to detect (and warn about) failed subjects.
- **Header transform fix-up.** `mri_add_xform_to_header` is run on the copied
  manual segmentation so that downstream tools that expect a Talairach in the
  header do not complain.
- **Optional control points carried along.** A source `tmp/control.dat` is copied
  only if it exists; its absence is not an error
  ([`scripts/gcaprepone:95-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L95-L103)).

## Related Tools

- [[gcatrain]] — the orchestrator that calls `gcaprepone` once per subject.
- [[gcainit]] — runs next, on the init subject, to build the first atlas.
- [[wiki/pipelines/recon-all|recon-all]] — invoked here (`-autorecon1`) to produce `nu.mgz`.
- [[mri_add_xform_to_header]] — writes the Talairach transform into the manual segmentation's header.
- [[mri_em_register]] — the linear registration step inside recon-all that `--no-emreg` disables.

## Confidence and Gaps

**High confidence:** the complete flag set, the init-subject auto-detection, the
file-copy logic, the `recon-all -autorecon1` invocation, and the two
spec-vs-code discrepancies (`--o`/`--init-subject` usage mismatch and the
`--nuintensitycor-nomask` no-op) — all read directly from
[`scripts/gcaprepone`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone).

> [!gap] Downstream use of copied control points
> A copied `tmp/control.dat` is available to later recon-all/[[mri_ca_normalize]]
> steps, but exactly how (or whether) it is picked up in the GCA-training
> iterations was not traced from within this script.

## References

- FreeSurfer source: [`scripts/gcaprepone`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone) (v8.2.0).
- Built-in help: `gcaprepone --help` (usage block,
  [`scripts/gcaprepone:306-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L306-L319)).
