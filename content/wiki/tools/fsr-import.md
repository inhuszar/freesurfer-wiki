---
title: "fsr-import"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-import"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-coreg]]"
  - "[[fsr-longpreproc]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact downstream meaning of the mode-unknown placeholder when no reference mode is chosen is inferred from fsr-coreg, not fully traced."
tags:
  - import
  - multimodal
  - samseg
  - conversion
  - fsr
---

# fsr-import

## Summary

`fsr-import` is the entry point of the FreeSurfer **`fsr-*` multimodal input
framework**. It copies/converts one or more input MRI volumes — possibly several
runs of several modalities (T1w, T2w, FLAIR, or arbitrary user-named "modes") —
into a fixed, mode-keyed directory layout that the rest of the framework expects.
Every input is run through [[wiki/tools/mri_convert|mri_convert]] into `mgz`
format and filed under `outdir/<modename>/runNNN.mgz`, with a per-mode
`nruns.txt` recording how many runs were imported. This import directory is the
canonical input to [[fsr-coreg]] and, ultimately, the basis of a
[[wiki/tools/samseg|samseg]]-based multimodal `recon-all` analysis.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-import`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-import`
- **FreeSurfer tools called:** [[wiki/tools/mri_convert|mri_convert]] (the actual
  format conversion, [`scripts/fsr-import:94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L94)), plus the shell helpers
  `getfullpath`, `UpdateNeeded`, and `fs_temp_dir`.

## Purpose and Context

A multimodal FreeSurfer analysis (notably [[wiki/tools/samseg|samseg]]) needs its
inputs organised so that the framework knows which volume is which modality and
how many acquisitions exist per modality. `fsr-import` performs that organising
step. It is called automatically by the `samseg` wrapper when the user supplies
inputs via `--t1w/--t2w/--flair/--mode` (`samseg` runs
`fsr-import $inputargs --o $importdir`, [`samseg/samseg:166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg#L166)), and by
`samseg-long` once per timepoint ([`samseg/samseg-long:565`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L565)). It can also be run
by hand to prepare an import directory.

It is **not** a recon-all stage; it sits one step upstream of the whole
multimodal stream:

```
fsr-import → fsr-coreg → samseg → samseg2recon → recon-all (surfaces)
```

> [!gotcha] t1w / t2w / flair are special because recon-all can use them
> The three named modalities `t1w`, `t2w`, `flair` get dedicated flags because
> they can all serve as inputs to [[wiki/pipelines/recon-all|recon-all]] (T1 for
> the main stream, T2/FLAIR for pial refinement). Any other modality is imported
> under a user-chosen name via `--mode <name> <file>`, or anonymously via `--i`
> as the placeholder mode `mode-unknown`.

## Inputs

### Required Inputs

At least one input volume **and** an output directory (`--o`) are required.
Inputs are supplied with one of:

- `--t1w <file>` — a T1-weighted volume → mode `t1w`.
- `--t2w <file>` — a T2-weighted volume → mode `t2w`.
- `--flair <file>` — a FLAIR volume → mode `flair`.
- `--mode <name> <file>` — an arbitrary modality named `<name>` (which may **not**
  be `t1w`, `t2w`, `flair`, or `mode-unknown`, [`scripts/fsr-import:155-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L155-L158)).
- `--i <file>` — a volume of unspecified modality → mode `mode-unknown`.

Each flag may be repeated to import **multiple runs of the same modality** (e.g.
two `--t1w` flags ⇒ `t1w/run001.mgz` and `t1w/run002.mgz`). Every input file must
exist; conversion is delegated to [[wiki/tools/mri_convert|mri_convert]], so any
format `mri_convert` reads (DICOM, NIfTI, mgz, Analyze, …) is accepted.

### Input Assumptions

> [!assumption] Within a modality, runs should be co-acquirable
> `fsr-import` does no checking of resolution, orientation, or contrast — it just
> converts each file to `mgz`. The framework assumes that multiple runs of one
> modality are of the **same** subject/modality so that [[fsr-coreg]] can later
> rigidly register and average them. By default the data are **not** conformed
> (`Conform=0`, [`scripts/fsr-import:18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L18)); conforming to 1 mm / 256 must be
> requested with `--conform` (which `samseg` adds automatically unless `--hires`).

## Outputs

### Files Created

For an output directory `outdir` and modality `<mode>` with runs indexed
`1, 2, …`:

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `run001.mgz`, `run002.mgz`, … | `outdir/<mode>/` | each imported run, converted to `mgz` by `mri_convert` ([`scripts/fsr-import:88-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L88-L99)) |
| `nruns.txt` | `outdir/<mode>/` | a single integer: the number of runs imported for that mode ([`scripts/fsr-import:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L101)) |
| `fsr-import.inputlist.txt` | `outdir/log/` | the full list of input file paths |
| `fsr-import.modenames.txt` | `outdir/log/` | the per-input mode name, in input order |
| `fsr-import.unique.modenames.txt` | `outdir/log/` | the sorted unique set of mode names |
| `fsr-import.Y…M…D…H…M….log` | `outdir/log/` | run log |

The three `log/*.txt` manifests are what make the import directory
**self-describing**: [[fsr-coreg]] and [[fsr-longpreproc]] read them to learn the
modes and run counts ([`scripts/fsr-coreg:449-459`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L449-L459)).

> [!contradiction] Help says `r001.mgz`; the code writes `run001.mgz`
> Both the inline usage and the `BEGINHELP` block show the layout as
> `import/t1w/r001.mgz` etc. ([`scripts/fsr-import:375-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L375-L379)). The code actually
> writes `run$ithstr.mgz` with a zero-padded 3-digit index, i.e. **`run001.mgz`**
> ([`scripts/fsr-import:88-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L88-L90)). Code is authoritative — downstream tools
> ([[fsr-coreg]]) read `run001.mgz`.

### Output Specifications

Output volumes are MGZ ([[mgz]]). Geometry/data type are whatever
[[wiki/tools/mri_convert|mri_convert]] produces from the input; with `--conform`
the output is conformed to 256³ at 1 mm isotropic, otherwise the input geometry
is preserved.

## Mathematical Foundations

None of its own — `fsr-import` is an organiser/dispatcher. All resampling and
type conversion happen inside [[wiki/tools/mri_convert|mri_convert]].

> [!internal] Conforming math lives in mri_convert
> When `--conform` is set, the conform-to-256/1mm resampling is performed by
> `mri_convert --conform`, not by this script ([`scripts/fsr-import:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L95)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the parser
([`scripts/fsr-import:137-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L137-L264)). Unrecognised flags are **silently ignored**
(see gotcha).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Root output directory for the import layout. |
| `--t1w` | string (repeatable) | — | Import a T1-weighted run (mode `t1w`). |
| `--t2w` | string (repeatable) | — | Import a T2-weighted run (mode `t2w`). |
| `--flair` | string (repeatable) | — | Import a FLAIR run (mode `flair`). |
| `--mode`<br>`--m` | `name file` (repeatable) | — | Import a run of arbitrary modality `name`. `name` may not be `t1w`/`t2w`/`flair`/`mode-unknown` ([`scripts/fsr-import:155-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L155-L158)). |
| `--i` | string (repeatable) | — | Import a run of unspecified modality (mode `mode-unknown`). |
| `--conform` | bool | **off** | Conform each input to 1 mm isotropic, 256³, via `mri_convert --conform`. |
| `--no-conform`<br>`--hires` | bool | on (no-conform) | Do not conform; preserve native geometry. This is the default. |
| `--force-update` | bool | off | Re-convert even if the output `mgz` is newer than its input (otherwise `UpdateNeeded` skips it). |
| `--log` | string | `outdir/log/fsr-import.*.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Temporary directory (also disables cleanup). Not heavily used. |
| `--nocleanup` / `--cleanup` | bool | cleanup on (no-op) | Toggle tmp-dir cleanup; the cleanup line is commented out. |
| `--debug` | bool | off | `set echo`/`verbose`, and report which unrecognised flags are being ignored. |
| `--help` | bool | — | Print usage + `BEGINHELP`. |
| `--version` | bool | — | Print the version string. |

> [!gotcha] Unrecognised flags are ignored, not rejected
> Unlike most FreeSurfer scripts, the `default` case of `fsr-import`'s parser does
> **not** error on unknown flags — it ignores them (printing a note only under
> `--debug`, [`scripts/fsr-import:259-263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L259-L263)). This is deliberate: `samseg` passes its
> **entire** argument list straight through (`fsr-import $inputargs`), so
> `fsr-import` must tolerate samseg-only flags. The cost is that a typo'd import
> flag is silently dropped.

### Configuration Interactions

> [!gotcha] You cannot add inputs to an existing import directory
> If `outdir/log/fsr-import.*.txt` already exists, supplying any input flag is a
> hard error: "`$outdir already exist, do not specify inputs`"
> ([`scripts/fsr-import:282-287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L282-L287)). Re-running with the **same** inputs and no
> input flags just re-reads the manifests (and, with `--force-update`, re-converts
> stale runs). To change the input set you must use a fresh `--o` directory or
> delete the old one.

> [!gotcha] `--mode` rejects the reserved names
> `--mode t1w/t2w/flair/mode-unknown` errors out and tells you to use the
> dedicated flag instead ([`scripts/fsr-import:155-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L155-L158)). Use `--t1w`/`--t2w`/
> `--flair`/`--i` for those.

- `--conform` vs `--no-conform`/`--hires`: last one on the command line wins;
  default is no-conform. `samseg` injects `--conform` automatically unless the
  user asked for `--hires` ([`samseg/samseg:167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg#L167)).

## Typical Use Cases

### 1. Import several modalities and runs (the framework example)

```bash
fsr-import --t1w run1.T1.slice0.dicom --t1w run2.T1.slice0.dicom \
  --t2w T2.nii.gz --mode pd myPDimage.mgz --flair FLAIR-weighted.dcm \
  --o importdir
# → importdir/t1w/run001.mgz, run002.mgz
#   importdir/t2w/run001.mgz
#   importdir/pd/run001.mgz
#   importdir/flair/run001.mgz
```

This prepares input for [[fsr-coreg]].

### 2. Import without conforming (preserve hi-res native geometry)

```bash
fsr-import --t1w hires_T1.mgz --o importdir --hires
```

### 3. As driven by samseg (automatic)

```bash
# samseg internally runs:
fsr-import --t1w t1.mgz --t2w t2.mgz --refmode t1w --o $SUBJECTS_DIR/$subj/input --conform
```

## Pipeline Context

`fsr-import` is the **import** stage of the multimodal `fsr-*` framework
(`recon_all_stage: null`).

**Predecessor:** raw/converted input volumes (e.g. from
[[wiki/tools/mri_convert|mri_convert]] or `dcmunpack`) → **fsr-import** →
**Successor:** [[fsr-coreg]] (which reads the import directory's manifests and
co-registers the modes). In the longitudinal stream, `samseg-long` calls
`fsr-import` once per timepoint, then [[fsr-coreg]], then [[fsr-longpreproc]]
([`samseg/samseg-long:565-592`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L565-L592)).

It is invoked by [[wiki/tools/samseg|samseg]] (`samseg/samseg`) whenever inputs
are given as `--t1w/--t2w/--flair/--mode`; it is **not** called directly by
[[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] `--i` volumes become `mode-unknown` and need an explicit refmode later
> A volume imported with `--i` is filed under `mode-unknown`. [[fsr-coreg]] only
> auto-selects a reference mode when there is exactly one unique mode; with mixed
> or unknown modes you must pass `--ref` to [[fsr-coreg]] explicitly.

> [!gotcha] No within-modality consistency check at import time
> `fsr-import` will happily import runs of differing dimension into the same mode;
> the mismatch only surfaces later when [[fsr-coreg]] tries to build a robust
> template from them.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date:** `UpdateNeeded $ofile $input` skips conversion when the
  output `mgz` is newer than the input ([`scripts/fsr-import:92-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L92-L99)); override with
  `--force-update`.
- **Missing input → hard error** at parse time
  ([`scripts/fsr-import:159-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L159-L162)).
- **Conversion failure → abort:** a non-zero `mri_convert` status jumps to
  `error_exit` ([`scripts/fsr-import:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L98)).
- **Unknown flags tolerated** (see gotcha) so samseg can pass its full argv.

## Known Bugs

- [[00188]] — [[fsr-longpreproc]]'s consistency check looks for `log/unique.modenames.txt`, but `fsr-import` writes this file as `log/fsr-import.unique.modenames.txt`; the filename mismatch defeats the check.

## Related Tools

- [[fsr-coreg]] — the immediate successor; co-registers and averages the modes that `fsr-import` laid out.
- [[fsr-longpreproc]] — longitudinal base-building stage that consumes per-timepoint import+coreg directories.
- [[wiki/tools/samseg|samseg]] — the main caller; uses `fsr-import` to stage `--t1w/--t2w/--flair/--mode` inputs.
- [[wiki/tools/mri_convert|mri_convert]] — performs every format conversion and the optional conforming.
- [[wiki/pipelines/recon-all|recon-all]] — ultimate downstream consumer (via samseg → samseg2recon).

## Confidence and Gaps

**High confidence:** the complete flag set, the output layout (including the
`run001.mgz` vs `r001.mgz` discrepancy), the three manifest files, the
ignore-unknown-flags behaviour, the existing-directory guard, and the
samseg/samseg-long call sites were all read directly from source.

> [!gap] `mode-unknown` downstream semantics
> How a `mode-unknown` volume is treated by samseg when no `--refmode` is chosen
> is inferred from [[fsr-coreg]]'s single-unique-mode auto-selection rather than
> traced end-to-end through samseg.

## References

- FreeSurfer source: [`scripts/fsr-import`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import) (v8.2.0).
- Caller: [`samseg/samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg) (the `--t1w/--t2w/--flair/--mode` path) and
  [`samseg/samseg-long`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long) (per-timepoint import).
- Built-in help: `fsr-import --help` (`BEGINHELP`, [`scripts/fsr-import:361-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-import#L361-L388)).
