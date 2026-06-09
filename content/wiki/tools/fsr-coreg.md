---
title: "fsr-coreg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-coreg"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-import]]"
  - "[[fsr-longpreproc]]"
  - "[[fsr-getxopts]]"
  - "[[fsr-checkxopts]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_robust_template]]"
  - "[[mri_coreg]]"
  - "[[mri_vol2vol]]"
  - "[[mri_concatenate_lta]]"
  - "[[mri_concat]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether the final per-mode output is read downstream as runavg-refmodespace.mgz only (samseg) or also under the help's mode.mgz name is not fully traced; samseg uses runavg-refmodespace.mgz."
tags:
  - coregistration
  - multimodal
  - samseg
  - registration
  - fsr
---

# fsr-coreg

## Summary

`fsr-coreg` is the **coregistration** stage of the FreeSurfer `fsr-*` multimodal
framework. Given an import directory produced by [[fsr-import]] (one
subdirectory per modality, each holding one or more `runNNN.mgz` volumes), it
(1) registers and averages the multiple runs **within** each modality with
[[mri_robust_template]], (2) registers each modality's average to a chosen
**reference mode** with [[mri_coreg]] to produce an LTA, and (3) resamples every
run into the reference-mode space with [[mri_vol2vol]] and averages them. The net
result is one volume per modality, all in spatial alignment with the reference
mode — exactly the multimodal input that [[wiki/tools/samseg|samseg]] expects.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-coreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-coreg`
- **FreeSurfer tools called:**
  [[mri_robust_template]] (within-mode registration/averaging,
  [`scripts/fsr-coreg:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L140)),
  [[mri_coreg]] (between-mode registration to the reference,
  [`scripts/fsr-coreg:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L193)),
  [[mri_concatenate_lta]] (compose per-run × mode-to-ref transforms,
  [`scripts/fsr-coreg:227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L227)),
  [[mri_vol2vol]] (resample into reference space,
  [`scripts/fsr-coreg:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L245)),
  [[mri_concat]] (average resampled runs, [`scripts/fsr-coreg:261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L261)),
  plus [[fsr-getxopts]] (per-tool expert options), [[fsr-checkxopts]]
  (validate `--expert`), and the helpers `getfullpath`, `UpdateNeeded`,
  `fs_time`, `tkregisterfv`.

## Purpose and Context

[[wiki/tools/samseg|samseg]] and the multimodal `recon-all` stream require that
every input modality be sampled on the **same voxel grid**, aligned to a common
reference. `fsr-coreg` produces that aligned set. It is the second stage of the
framework:

```
fsr-import → fsr-coreg → samseg → samseg2recon → recon-all (surfaces)
```

It is invoked automatically by the `samseg` wrapper
(`fsr-coreg --importdir $importdir --ref $refmodename --threads $threads --o $coregdir`,
[`samseg/samseg:173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg#L173)) and once per timepoint by `samseg-long`
([`samseg/samseg-long:586`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L586)). It may also be run by hand on a directory built
by [[fsr-import]]. It is **not** a recon-all stage.

> [!gotcha] The reference mode defines the output space for every modality
> All modalities are resampled **into the reference mode's voxel grid**. The
> reference mode itself is not resampled — its aligned output is just a symbolic
> link to its own within-mode average. Choose the reference as the
> highest-quality / highest-resolution modality (usually `t1w`).

## Inputs

### Required Inputs

- **`--importdir` (alias `--id`)** — a directory created by [[fsr-import]]. Must
  exist and contain `log/fsr-import.modenames.txt` and
  `log/fsr-import.unique.modenames.txt` ([`scripts/fsr-coreg:449-456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L449-L456)), plus the
  per-mode `runNNN.mgz` files and each mode's `nruns.txt`.
- **`--ref <modename>`** — the reference modality. Required unless there is
  exactly **one** unique mode (in which case it defaults to that mode,
  [`scripts/fsr-coreg:471-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L471-L476)). It must be one of the imported modes.

### Input Assumptions

> [!assumption] Input is an unmodified fsr-import directory
> `fsr-coreg` reads the mode list and run counts from the `log/` manifests and
> expects `importdir/<mode>/run001.mgz …` with a matching
> `importdir/<mode>/nruns.txt` ([`scripts/fsr-coreg:97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L97), [`scripts/fsr-coreg:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L120)). Within
> a modality the runs are assumed to be the same subject/modality so that a robust
> template is meaningful; [[mri_coreg]] assumes the modalities overlap in
> field-of-view enough for a 6-DOF rigid fit.

## Outputs

By default the output directory **is** the import directory (`--o` defaults to
`--importdir`, [`scripts/fsr-coreg:445`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L445)), so the products below are written
alongside the imported runs under `outdir/<mode>/`.

### Files Created

| File (under `outdir/<mode>/`) | Created by | Contents |
|-------------------------------|-----------|----------|
| `runavg.mgz` | [[mri_robust_template]] `--template` (or a symlink to `run001.mgz` if `nruns==1`) | the within-mode average in **native** space ([`scripts/fsr-coreg:99-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L99-L111), [`scripts/fsr-coreg:130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L130)) |
| `regNNN.lta` | [[mri_robust_template]] `--lta` | run-NNN → within-mode-average transform (multi-run modes) |
| `reg.avg-to-refmodespace.auto.lta` | [[mri_coreg]] | auto-generated mode-average → reference transform ([`scripts/fsr-coreg:179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L179), [`scripts/fsr-coreg:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L193)) |
| `reg.avg-to-refmodespace.lta` | `cp` of the `.auto.lta` | the **editable** mode-average → reference transform (preserved if you hand-edit it — see gotcha) ([`scripts/fsr-coreg:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L180), [`scripts/fsr-coreg:202-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L202-L207)) |
| `regNNN.refmodespace.lta` | [[mri_concatenate_lta]] | run-NNN → reference transform (multi-run modes, [`scripts/fsr-coreg:223-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L223-L227)) |
| `runNNN-refmodespace.mgz` | [[mri_vol2vol]] `--interp cubic` | each run resampled into reference space ([`scripts/fsr-coreg:242-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L242-L245)) |
| `runavg-refmodespace.mgz` | [[mri_concat]] `--mean` | **the per-mode output**: mean of the resampled runs, in reference space ([`scripts/fsr-coreg:258-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L258-L261)). For the reference mode this is a symlink to its own `runavg.mgz` ([`scripts/fsr-coreg:166-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L166-L172)). |
| `log/fsr-coreg.par.txt` | this script | records `refmode <name>` (read back by [[fsr-longpreproc]]) ([`scripts/fsr-coreg:85-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L85-L86)) |
| `log/fsr-coreg.expert.txt` | `cp` of `--expert` file | the saved expert-options file ([`scripts/fsr-coreg:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L87)) |
| `log/registration-check-commands` | this script | ready-to-run `tkregisterfv`/`freeview` commands to QC each registration ([`scripts/fsr-coreg:151-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L151-L157), [`scripts/fsr-coreg:274-286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L274-L286)) |

The downstream consumer ([[wiki/tools/samseg|samseg]]) reads
`coregdir/<mode>/runavg-refmodespace.mgz` as the input for each modality
([`samseg/samseg:180-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg#L180-L186)).

> [!contradiction] Help describes `mode.native.mgz` / `mode.mgz` / `mode.reg-to-ref.lta`; the code writes different names
> The `BEGINHELP` text says the within-mode average is `mode.native.mgz`, the
> mode-to-ref transform is `mode.reg-to-ref.lta`, and the final aligned volume is
> `mode.mgz` ([`scripts/fsr-coreg:541-552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L541-L552)). The code actually writes
> `runavg.mgz`, `reg.avg-to-refmodespace.lta`, and `runavg-refmodespace.mgz`
> respectively ([`scripts/fsr-coreg:130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L130), [`scripts/fsr-coreg:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L180), [`scripts/fsr-coreg:258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L258)).
> Code is authoritative; the help text uses idealized/aspirational names. (Note
> the freeview QC line at [`scripts/fsr-coreg:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L278) even references a
> `<mode>/<mode>.mgz` that the script never creates.)

### Output Specifications

All outputs are MGZ ([[mgz]]) on the **reference mode's voxel grid** (resampling
uses cubic interpolation, [`scripts/fsr-coreg:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L245)). Transforms are
[[lta|LTA]] files. The reference mode's `runavg-refmodespace.mgz` is identical to
its native `runavg.mgz` (it is a symlink, no resampling).

## Mathematical Foundations

`fsr-coreg` is an orchestration of three registration/averaging operations; the
mathematics live in the called tools.

> [!internal] Within-mode averaging: robust template
> Multiple runs of one modality are co-registered and averaged by
> [[mri_robust_template]] with outlier saturation `--sat 4.685`
> ([`scripts/fsr-coreg:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L140); `rtsat` set at [`scripts/fsr-coreg:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L28)). The
> 4.685 value is the standard Tukey biweight saturation used in FreeSurfer's
> robust registration, matching recon-all.

> [!internal] Between-mode registration: mutual-information rigid fit
> Each mode's average is registered to the reference average by [[mri_coreg]]
> ([`scripts/fsr-coreg:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L193)), which performs a multi-resolution,
> mutual-information-style rigid (6-DOF) alignment suited to **cross-contrast**
> registration. The full objective and optimisation are documented on the
> [[mri_coreg]] page.

> [!math] Transform composition for multi-run modes
> For a mode with multiple runs, the run-to-reference transform is the
> composition of the run-to-within-mode-average transform $T_{\text{run}}$ and
> the mode-average-to-reference transform $T_{\text{ref}}$:
> $$T_{\text{run}\to\text{ref}} = T_{\text{ref}} \circ T_{\text{run}}$$
> computed by [[mri_concatenate_lta]] ([`scripts/fsr-coreg:227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L227)). Each run is
> then resampled with that composite and the resampled runs are mean-averaged.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the parser
([`scripts/fsr-coreg:334-426`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L334-L426)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--importdir`<br>`--id` | string | *(required)* | The [[fsr-import]] directory to coregister. Must exist. |
| `--ref`<br>`--refmode` | string | (auto if 1 mode) | Reference modality; all modes register to it. Must be one of the imported modes ([`scripts/fsr-coreg:477-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L477-L486)). |
| `--o` | string | = `--importdir` | Output directory. Defaults to writing back into the import directory. |
| `--threads`<br>`--nthreads` | int | `1` | Threads passed to [[mri_coreg]] `--threads`. |
| `--expert` | string | — | Expert-options file; validated by [[fsr-checkxopts]] then queried per internal tool via [[fsr-getxopts]] ([`scripts/fsr-coreg:383-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L383-L389)). |
| `-v8`<br>`--v8` | bool | `$FS_V8_XOPTS` (0) | Also apply the built-in v8 global expert-options file `$FREESURFER/etc/global-expert-options.v8.txt` ([`scripts/fsr-coreg:51-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L51-L52)). |
| `-no-v8`<br>`--no-v8` | bool | — | Do not apply the v8 global expert-options file. |
| `--force-update`<br>`--force` | bool | off | Re-run every step even if outputs are newer than inputs (otherwise `UpdateNeeded` skips up-to-date steps). |
| `--log` | string | `outdir/log/fsr-coreg.*.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temporary directory (also disables cleanup). Not heavily used. |
| `--nocleanup` / `--cleanup` | bool | cleanup on (no-op) | Toggle tmp-dir cleanup; the cleanup line is commented out. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage + `BEGINHELP`. |
| `--version` | bool | — | Print the version string. |

The expert-options key namespace used by `fsr-coreg` is compound — one key per
internal tool: `fsr-coreg-mri_robust_template`, `fsr-coreg-mri_coreg`,
`fsr-coreg-mri_concatenate_lta`, `fsr-coreg-mri_vol2vol`
([`scripts/fsr-coreg:141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L141), [`scripts/fsr-coreg:194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L194), [`scripts/fsr-coreg:228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L228), [`scripts/fsr-coreg:246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L246)).

### Configuration Interactions

> [!gotcha] Re-running on an existing output forbids re-specifying parameters
> Once `log/fsr-coreg.par.txt` exists, supplying `--ref` or `--expert` again is a
> hard error ("output already exists, don't spec input parameters",
> [`scripts/fsr-coreg:462-466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L462-L466)). On re-runs the reference mode and expert file are
> **read back** from the `log/` files instead. To change them you need a fresh
> output directory.

> [!gotcha] `--ref` is optional only for a single-mode import
> If there is exactly one unique mode, that mode becomes the reference
> automatically; otherwise `--ref` is mandatory and the script lists the valid
> choices ([`scripts/fsr-coreg:471-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L471-L476)).

> [!gotcha] `-v8` reaches into a built-in global expert file
> With `-v8` (or `FS_V8_XOPTS=1`), `$FREESURFER/etc/global-expert-options.v8.txt`
> is prepended to the expert-option search for **every** internal tool
> ([`scripts/fsr-coreg:51-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L51-L52), [`scripts/fsr-coreg:141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L141)). Note that the `GlobXOptsFile`
> variable is referenced in every `fsr-getxopts` call but is never set inside
> `fsr-coreg` (it is empty), so only the v8 file and your `--expert` file
> actually contribute.

## Typical Use Cases

### 1. Coregister a multimodal import (T1 as reference)

```bash
fsr-import --t1w T1.mgz --t2w T2.nii.gz --flair FLAIR.dcm --o importdir
fsr-coreg --importdir importdir --ref t1w --threads 4
# → importdir/<mode>/runavg-refmodespace.mgz for each mode, all on the T1 grid
```

### 2. Coregister with custom internal-tool options

```bash
# expert.txt contains, e.g.:
#   fsr-coreg-mri_coreg --dof 12
fsr-coreg --id importdir --ref t1w --expert expert.txt
```

### 3. As driven by samseg (automatic)

```bash
fsr-coreg --importdir $SUBJECTS_DIR/$subj/input --ref t1w --threads 4 \
  --o $SUBJECTS_DIR/$subj/coreg
```

### 4. Quality-control the registrations afterwards

```bash
# fsr-coreg writes ready-made check commands:
cat coregdir/log/registration-check-commands
# e.g. tkregisterfv --mov flair/runavg.mgz --targ t1w/runavg.mgz --reg flair/reg.avg-to-refmodespace.lta
```

## Pipeline Context

`fsr-coreg` is the **coregistration** stage of the `fsr-*` framework
(`recon_all_stage: null`).

**Predecessor:** [[fsr-import]] (lays out `runNNN.mgz` per mode) → **fsr-coreg**
→ **Successor:** [[wiki/tools/samseg|samseg]] (consumes
`runavg-refmodespace.mgz`). In the longitudinal stream the per-timepoint
`fsr-coreg` outputs feed [[fsr-longpreproc]], which reads
`<tp>/<refmode>/runavg-refmodespace.mgz` and `<tp>/log/fsr-coreg.par.txt`
([`scripts/fsr-longpreproc:570-575`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L570-L575)).

It is called by [[wiki/tools/samseg|samseg]] and `samseg-long`; it is **not**
called directly by [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] You can hand-edit the registration, and it will be preserved
> `fsr-coreg` keeps two LTAs per mode: an `…auto.lta` it regenerates, and an
> editable `…lta` it normally copies from the auto one. If you edit the
> `reg.avg-to-refmodespace.lta` (e.g. to fix a bad registration) so it differs
> from the auto file, a subsequent re-run detects the difference
> (`LTAsAreDiff`) and will **not** overwrite your edit
> ([`scripts/fsr-coreg:181-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L181-L207)). This is the intended manual-correction hook.

> [!gotcha] Reference-mode output is a symlink, not a resampled copy
> For the reference mode, `runavg-refmodespace.mgz` is a symbolic link to
> `runavg.mgz` ([`scripts/fsr-coreg:166-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L166-L172)). Deleting or moving the import
> directory can break it.

> [!gotcha] Single-run modes skip robust averaging entirely
> If a mode has `nruns == 1`, `runavg.mgz` is just a symlink to `run001.mgz`; no
> [[mri_robust_template]] is run ([`scripts/fsr-coreg:99-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L99-L111)).

> [!gotcha] Output defaults into the import directory
> Because `--o` defaults to `--importdir`, coregistration products land **inside**
> the import directory next to the raw runs unless you give a separate `--o`
> ([`scripts/fsr-coreg:445`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L445)). `samseg` always passes a distinct `--o $coregdir`.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date:** every step is guarded by `UpdateNeeded`
  ([`scripts/fsr-coreg:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L133), [`scripts/fsr-coreg:191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L191), [`scripts/fsr-coreg:243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L243), [`scripts/fsr-coreg:259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L259)); `--force-update`
  overrides.
- **Edit-preservation** of the manual LTA (see gotcha above).
- **Missing source run → hard error** ([`scripts/fsr-coreg:122-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L122-L125)).
- **Invalid reference mode → hard error** with the list of valid modes
  ([`scripts/fsr-coreg:482-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L482-L486)).
- **`--expert` validated** by [[fsr-checkxopts]] before use
  ([`scripts/fsr-coreg:386-387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L386-L387)).
- **QC scaffolding:** a `registration-check-commands` file of ready-to-run
  `tkregisterfv`/`freeview` lines is always emitted for multimodal inputs.

## Related Tools

- [[fsr-import]] — produces the import directory this tool consumes.
- [[fsr-longpreproc]] — longitudinal stage that builds a within-subject base from per-timepoint `fsr-coreg` outputs.
- [[wiki/tools/samseg|samseg]] — the main caller and downstream consumer of `runavg-refmodespace.mgz`.
- [[mri_robust_template]] — within-mode registration + averaging (`--sat 4.685`).
- [[mri_coreg]] — cross-contrast rigid registration of each mode to the reference.
- [[mri_concatenate_lta]] — composes per-run and mode-to-ref transforms.
- [[mri_vol2vol]] — resamples runs into reference space (cubic).
- [[mri_concat]] — averages the resampled runs.
- [[fsr-getxopts]] / [[fsr-checkxopts]] — expert-option lookup/validation for the internal tools.
- [[wiki/pipelines/recon-all|recon-all]] — ultimate downstream consumer via samseg → samseg2recon.

## Confidence and Gaps

**High confidence:** the full flag set, the three-phase
within/between-mode/resample-and-average flow, the exact output filenames, the
manual-LTA edit-preservation logic, the `-v8`/expert-options handling, and the
samseg/samseg-long call sites were all read directly from source. The
help-vs-code filename mismatch is documented as a `[!contradiction]`.

> [!gap] Whether any consumer reads the help's `mode.mgz` name
> [[wiki/tools/samseg|samseg]] reads `runavg-refmodespace.mgz`; whether any other
> tool expects the help's `mode.mgz`/`mode.native.mgz` names (which the code does
> not create) was not exhaustively traced. The freeview QC line referencing
> `<mode>/<mode>.mgz` ([`scripts/fsr-coreg:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L278)) appears to be stale.

## References

- FreeSurfer source: [`scripts/fsr-coreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg) (v8.2.0).
- Caller: [`samseg/samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg#L173) and
  [`samseg/samseg-long`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L586).
- Built-in help: `fsr-coreg --help` (`BEGINHELP`, [`scripts/fsr-coreg:522-556`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L522-L556)).
