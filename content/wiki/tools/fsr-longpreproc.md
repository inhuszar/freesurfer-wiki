---
title: "fsr-longpreproc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-longpreproc"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-import]]"
  - "[[fsr-coreg]]"
  - "[[fsr-getxopts]]"
  - "[[fsr-checkxopts]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_robust_template]]"
  - "[[mri_coreg]]"
  - "[[mri_vol2vol]]"
  - "[[mri_concatenate_lta]]"
  - "[[lta_convert]]"
  - "[[mri_concat]]"
  - "[[mri_convert]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Several documented usage flags (--i, --refmode, --conform, --mode1) are not implemented in the argument parser; the real inputs come via --tp and from each timepoint's fsr-coreg.par.txt. Exact intended UX is unclear."
  - "The --no-reg-to-base/--resample/--no-resample flags set variables (DoRegToBase, Resample) that the main body does not read; their effect appears inert. Not verified at runtime."
  - "--affine (BaseType 2) path sets `rigid = samseginvlta` but the subsequent steps reference $rigidlta/$rigidconflta which are only defined for BaseType 1; the affine branch may be incomplete."
tags:
  - longitudinal
  - multimodal
  - samseg
  - registration
  - base
  - fsr
---

# fsr-longpreproc

## Summary

`fsr-longpreproc` is the **longitudinal preprocessing** stage of the FreeSurfer
`fsr-*` multimodal framework. Given two or more timepoints — each already
imported by [[fsr-import]] and coregistered by [[fsr-coreg]] — it builds an
unbiased within-subject **base** in the reference modality, registers that base
into the SAMSEG atlas template space, and resamples every timepoint (and every
modality) into the common base/template space. The result is a set of
spatially-aligned, intensity-harmonised longitudinal volumes suitable for
longitudinal [[wiki/tools/samseg|samseg]] (it is driven by `samseg-long`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-longpreproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-longpreproc`
- **FreeSurfer tools called:**
  [[mri_robust_template]] (build the unbiased base with intensity scaling,
  [`scripts/fsr-longpreproc:122-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L122-L124)),
  [[wiki/tools/samseg|samseg]] `--reg-only` (register the base to the atlas template,
  [`scripts/fsr-longpreproc:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L171)),
  [[mri_convert]] (rescale the samseg template to the input resolution,
  [`scripts/fsr-longpreproc:158-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L158-L159)),
  [[mri_info]] (read input resolution/dim, [`scripts/fsr-longpreproc:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L142), [`scripts/fsr-longpreproc:147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L147)),
  [[lta_convert]] (invert / conform the template registration,
  [`scripts/fsr-longpreproc:184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L184), [`scripts/fsr-longpreproc:226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L226)),
  [[mri_coreg]] (`--mat2par`/`--par2mat` to rigidify the template registration,
  [`scripts/fsr-longpreproc:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L195), [`scripts/fsr-longpreproc:213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L213)),
  [[mri_concatenate_lta]] (compose tp→base and base→template, **RAS2RAS**,
  [`scripts/fsr-longpreproc:249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L249)),
  [[mri_vol2vol]] (resample timepoints to base space, [`scripts/fsr-longpreproc:264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L264), [`scripts/fsr-longpreproc:302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L302)),
  [[mri_concat]] (average resampled timepoints into the base, [`scripts/fsr-longpreproc:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L278)),
  plus [[fsr-getxopts]] / [[fsr-checkxopts]] and helpers `getfullpath`,
  `UpdateNeeded`.

## Purpose and Context

Longitudinal analysis needs an **unbiased common space** so that each timepoint
is processed identically and differences reflect change rather than
registration/interpolation asymmetry. `fsr-longpreproc` constructs that space for
the multimodal `fsr-*`/SAMSEG stream. It is invoked by `samseg-long` after it has
run [[fsr-import]] and [[fsr-coreg]] for every timepoint
([`samseg/samseg-long:558-596`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L558-L596)):

```
(per timepoint)  fsr-import → fsr-coreg
                                 ↓  (--tp <importdir>)  ×N timepoints
                          fsr-longpreproc → run_samseg_long
```

It is **not** a recon-all stage. Conceptually it is the longitudinal analogue of
the within-subject base that recon-all's `-base` stream builds with
[[mri_robust_template]], but specialised to the SAMSEG template space.

> [!gotcha] Inputs are coregistered timepoint directories, not raw volumes
> Each `--tp` argument is a directory that has already been through [[fsr-import]]
> **and** [[fsr-coreg]]; `fsr-longpreproc` reads `<tp>/<refmode>/runavg-refmodespace.mgz`
> and `<tp>/log/fsr-coreg.par.txt` ([`scripts/fsr-longpreproc:94-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L94-L96), [`scripts/fsr-longpreproc:570-571`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L570-L571)).
> It derives the reference mode and the mode list from those files, not from the
> command line.

## Inputs

### Required Inputs

- **`--o <outdir>`** — output (base) directory.
- **`--tp <tpdir>`** — a coregistered timepoint directory; specify **at least two**
  ([`scripts/fsr-longpreproc:510-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L510-L514)). Each must contain a
  `log/fsr-coreg.par.txt` ([`scripts/fsr-longpreproc:563-567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L563-L567)) and the reference-mode
  `runavg-refmodespace.mgz` ([`scripts/fsr-longpreproc:593-597`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L593-L597)).

The reference mode and the set of modalities are **read from the first
timepoint's** `fsr-coreg.par.txt` / `fsr-import.unique.modenames.txt` and checked
for consistency across all timepoints ([`scripts/fsr-longpreproc:569-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L569-L599)).

### Input Assumptions

> [!assumption] All timepoints share the same modes, reference mode, and coreg parameters
> Every timepoint's `fsr-coreg.par.txt` must be **identical** to the first
> timepoint's (compared with `diff`); a mismatch is fatal
> ([`scripts/fsr-longpreproc:577-591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L577-L591)). The base is built from the reference mode's
> `runavg-refmodespace.mgz` across timepoints, which are assumed to be the same
> subject. The SAMSEG template
> (`$FREESURFER/average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2/template.nii`,
> [`scripts/fsr-longpreproc:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L7)) is used purely as a **geometric** target (its
> intensities are discarded — it is re-cast to `uchar`).

## Outputs

Outputs are written under `outdir/<refmode>/` (the base in the reference mode)
and `outdir/<mode>/` (each other mode resampled to the base). A symlink
`outdir/refmode → <refmode>` is created for convenience
([`scripts/fsr-longpreproc:100-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L100-L102)).

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `<refmode>/rr.base.mgz` | [[mri_robust_template]] | the **robust-registration base** (median, intensity-scaled) of the reference mode across timepoints ([`scripts/fsr-longpreproc:116-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L116-L124)) |
| `<refmode>/rr.reg.tpNNN.lta`, `<refmode>/rr.reg.tpNNN.scale` | [[mri_robust_template]] | per-timepoint → base transform and intensity scale ([`scripts/fsr-longpreproc:111-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L111-L114)) |
| `samseg.template.nii.gz` | [[mri_convert]] | the SAMSEG template re-sampled to the input resolution/dim, `uchar` ([`scripts/fsr-longpreproc:156-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L156-L164)) |
| `<refmode>/samseg-rr.base/template.lta`, `template.inv.lta` | [[wiki/tools/samseg|samseg]] `--reg-only`, [[lta_convert]] `--invert` | base ↔ template registration ([`scripts/fsr-longpreproc:167-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L167-L188)) |
| `<refmode>/samseg-rr.base/rigid.lta` (and `rigid.conf.lta` if `--conform`) | [[mri_coreg]] `--par2mat`, [[lta_convert]] `--trgconform` | the base→template registration forced to **rigid** (and optionally conformed) ([`scripts/fsr-longpreproc:210-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L210-L234)) |
| `<refmode>/reg.tpNNN.lta` | [[mri_concatenate_lta]] (`-out_type 1`, RAS2RAS) | composite timepoint → base/template transform ([`scripts/fsr-longpreproc:245-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L245-L249)) |
| `<refmode>/tpNNN.base.mgz` | [[mri_vol2vol]] (with intensity `--mul 1/scale`) | each reference-mode timepoint resampled into base/template space ([`scripts/fsr-longpreproc:254-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L254-L269)) |
| `<refmode>/base.mgz` | [[mri_concat]] `--mean` | the **final base volume** (mean of the resampled timepoints) ([`scripts/fsr-longpreproc:275-282`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L275-L282)) |
| `<mode>/tpNNN.base.mgz` | [[mri_vol2vol]] | every **other** modality's timepoint resampled into base space ([`scripts/fsr-longpreproc:288-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L288-L309)) |
| `log/fsr-longpreproc.tplist.txt`, `…parameters.txt`, `…unique.modenames.txt` | this script | manifests of timepoints, parameters (`ntp`, `Conform`, `BaseType`, `Interp`), and modes — read back by `samseg-long` ([`scripts/fsr-longpreproc:78-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L78-L88), [`samseg/samseg-long:603-609`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L603-L609)) |
| `log/fsr-longpreproc.expert.txt` | `cp` of `--expert` file | saved expert options ([`scripts/fsr-longpreproc:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L87)) |

The downstream `run_samseg_long` reads, per timepoint and mode,
`<basedir>/<mode>/tpNNN.base.mgz` (vs. the per-timepoint native
`runavg-refmodespace.mgz`) ([`samseg/samseg-long:103-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L103-L105)).

### Output Specifications

All volumes are MGZ ([[mgz]]) on the **base/template grid**, at the input
resolution and dimensions (the SAMSEG template is re-sampled to match the input
before use, [`scripts/fsr-longpreproc:156-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L156-L164)). Resampling uses the chosen
`--nearest/--trilinear/--cubic` interpolation (default cubic). Transforms are
[[lta|LTA]] files; the composite tp→base transform is forced to **RAS2RAS**.

## Mathematical Foundations

> [!internal] Unbiased base via robust template (median + intensity scaling)
> The base is built with [[mri_robust_template]] using `--average 1` (median),
> `--iscale` (estimate a multiplicative intensity scale per timepoint), and
> `--sat 4.685`, allowing differing voxel sizes (`--allow-diff-vox-size`)
> ([`scripts/fsr-longpreproc:122-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L122-L124)). The median and per-timepoint scale make the
> base robust to outliers and to scanner-gain drift across visits.

> [!math] Intensity de-scaling on resampling
> Each timepoint's robust-registration intensity scale $s$ (file
> `rr.reg.tpNNN.scale`) is undone when resampling into base space by multiplying
> by $1/s$:
> $$I_{\text{base}} = \frac{1}{s}\,I_{\text{tp}}$$
> ([`scripts/fsr-longpreproc:257-264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L257-L264)), so all timepoints share a common intensity
> scale before they are averaged into `base.mgz`.

> [!math] Rigidifying the base→template registration (BaseType=rigid)
> The base→SAMSEG-template registration produced by `samseg --reg-only` is
> inverted, decomposed to 12 affine parameters with [[mri_coreg]] `--mat2par`,
> then **forced rigid** by setting the three scale parameters (indices 7–9) to 1
> and the three shear parameters (indices 10–12) to 0, and re-composed with
> `--par2mat` ([`scripts/fsr-longpreproc:190-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L190-L217)). This keeps the base in atlas
> orientation without scaling the anatomy.

> [!internal] RAS2RAS requirement for the composite transform
> The tp→base transform is composed with [[mri_concatenate_lta]] using
> `-out_type 1` (RAS2RAS). A source comment notes: "as of Feb 6 2023, the LTA
> passed to samseg must be RAS2RAS" ([`scripts/fsr-longpreproc:248-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L248-L249)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the parser
([`scripts/fsr-longpreproc:345-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L345-L467)). **The implemented flags differ from the
usage text** — see the contradiction callout below.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output (base) directory. |
| `--tp` | string (repeatable) | *(required, ≥2)* | A coregistered timepoint directory (an [[fsr-import]]+[[fsr-coreg]] dir). |
| `--rigid` | bool | **on** (`BaseType=1`) | Build a rigid base→template registration (no scaling). |
| `--affine` | bool | off (`BaseType=2`) | Build an affine base→template registration (see gap — branch may be incomplete). |
| `--nearest` | bool | off | Nearest-neighbour resampling. |
| `--trilinear`<br>`--linear` | bool | off | Trilinear resampling. |
| `--cubic` | bool | **on** | Cubic resampling (default `Interp=cubic`). |
| `--reg-base-to-samseg` | bool | **on** | Register the base into SAMSEG template space (the main pathway). |
| `--no-reg-base-to-samseg` | bool | off | Skip the template registration; only build `rr.base.mgz` and resample other modes to it. |
| `--m` | string(s) | (all modes) | Restrict processing to the listed modes (consumes tokens until the next `--`, [`scripts/fsr-longpreproc:411-421`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L411-L421)); must be a subset of the imported modes ([`scripts/fsr-longpreproc:536-559`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L536-L559)). |
| `--threads` | int | `1` | Threads; also exported as `OMP_NUM_THREADS` ([`scripts/fsr-longpreproc:47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L47)). |
| `--expert`<br>`-expert` | string | — | Expert-options file; validated by [[fsr-checkxopts]] ([`scripts/fsr-longpreproc:423-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L423-L430)). |
| `--force-update` | bool | off | Re-run every step regardless of timestamps. |
| `--log` / `--nolog` / `--no-log` | string / bool | `outdir/log/…` | Log-file path / disable logging. |
| `--tmp` / `--tmpdir` / `--nocleanup` / `--cleanup` | — | — | Temp-dir control (cleanup line commented out). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage (+ empty `BEGINHELP`). |
| `--version` | bool | — | Print version string. |
| `--no-reg-to-base`<br>`--no-mc` | bool | — | Sets `DoRegToBase=0`, `Resample=0` (appears inert — see gap). |
| `--resample` / `--no-resample` | bool | — | Sets `Resample`/`DoRegToBase` (appears inert — see gap). |

The following flags are **advertised in the usage block but have no parser case**,
so passing them aborts with `ERROR: Flag <flag> unrecognized.` They are listed
here for completeness; see the contradiction callout below for the real
equivalents.

| Advertised flag (non-functional) | Usage text | Real equivalent |
|----------------------------------|-----------|-----------------|
| `--i` | input volumes ([`scripts/fsr-longpreproc:618`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L618)) | `--tp` (a coregistered timepoint directory) |
| `--refmode` | reference mode ([`scripts/fsr-longpreproc:620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L620)) | read from each timepoint's `fsr-coreg.par.txt` |
| `--conform` | conform output ([`scripts/fsr-longpreproc:622`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L622)) | none implemented (`Conform` is read from the parameters file) |
| `--mode1 <mode2 …>` | mode subset ([`scripts/fsr-longpreproc:624`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L624)) | `--m` |

The expert-options key used here is `longreg-robustreg`, and unlike
[[fsr-coreg]] it passes **only** the user's `--expert` file (no v8/global files):
`fsr-getxopts longreg-robustreg $XOptsFile` ([`scripts/fsr-longpreproc:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L128)).

> [!contradiction] Usage text advertises flags the parser does not implement
> The `usage_exit` block lists `--i visitNmodeM …`, `--refmode modname`,
> `--conform`, and `--mode1 <mode2 …>` ([`scripts/fsr-longpreproc:615-627`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L615-L627)). The
> actual parser has **no** `--i`, **no** `--refmode`, **no** `--conform`, and the
> mode-subset flag is `--m`, not `--mode1` ([`scripts/fsr-longpreproc:345-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L345-L467)).
> Timepoints come via `--tp`; the reference mode and `Conform` value are read from
> each timepoint's `fsr-coreg.par.txt` and the parameters file, not from flags.
> Code is authoritative. `samseg-long` calls it correctly as
> `fsr-longpreproc --o … --$BaseType --$Interp --threads … --tp …` per timepoint
> ([`samseg/samseg-long:558`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L558), [`samseg/samseg-long:592`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L592)).

### Configuration Interactions

> [!gotcha] Re-running on an existing output forbids re-specifying inputs
> If the output already has `log/fsr-longpreproc.*.txt`, supplying `--tp`,
> `--conform`/`Conform`, `--rigid`/`--affine`, or `--expert` is a hard error; the
> parameters are read back from the manifests instead
> ([`scripts/fsr-longpreproc:486-507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L486-L507)). Use a fresh `--o` to change them.

> [!gotcha] `--rigid` and `--affine` are mutually exclusive; rigid is the default
> Only the last of `--rigid`/`--affine` takes effect; with neither, `BaseType`
> defaults to 1 = rigid ([`scripts/fsr-longpreproc:517`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L517)). The affine branch may be
> incomplete (see gap).

> [!gotcha] `--no-reg-base-to-samseg` produces only `rr.base.mgz` plus per-mode resamples
> Without the template registration, the script builds the robust base and
> resamples non-reference modes to it but does **not** create the
> template-aligned `base.mgz`/`tpNNN.base.mgz` products that `run_samseg_long`
> expects ([`scripts/fsr-longpreproc:136-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L136-L284)). The default (on) is what the
> longitudinal SAMSEG stream needs.

## Typical Use Cases

### 1. As driven by samseg-long (the supported path)

```bash
# samseg-long internally, after per-timepoint fsr-import + fsr-coreg:
fsr-longpreproc --o $outdir/base --rigid --cubic --threads 4 \
  --tp $outdir/inputs/tp001 --tp $outdir/inputs/tp002 --tp $outdir/inputs/tp003
```

This builds the within-subject base in the reference modality, registers it to
the SAMSEG template, and resamples every timepoint/mode into base space.

### 2. Two-timepoint base, trilinear, mode subset

```bash
fsr-longpreproc --o subjBase --tp tp1coreg --tp tp2coreg \
  --trilinear --m t1w flair --threads 8
```

### 3. Resume / extend a run

```bash
# Re-run with no inputs to continue from manifests, forcing stale steps:
fsr-longpreproc --o subjBase --force-update
```

## Pipeline Context

`fsr-longpreproc` is the **longitudinal base-building** stage of the `fsr-*`
framework (`recon_all_stage: null`).

**Predecessor:** for each timepoint, [[fsr-import]] → [[fsr-coreg]] (run by
`samseg-long`) → **fsr-longpreproc** (`--tp` per timepoint) → **Successor:**
`run_samseg_long`, which reads the `tpNNN.base.mgz` outputs
([`samseg/samseg-long:103-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L103-L105)). It is called by `samseg-long`
([`samseg/samseg-long:558`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L558)); it is **not** called by
[[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] The SAMSEG template's intensities are irrelevant — only its geometry is used
> The template is re-cast to `uchar` and re-sampled to the input
> resolution/dimensions purely to provide a target grid; "intensity does not
> matter" per the source comment ([`scripts/fsr-longpreproc:153-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L153-L159)).

> [!gotcha] Hard-coded `--sat 4.685`; `--satit` is deliberately disabled
> The base is built with a fixed outlier saturation of 4.685 (matching
> recon-all), with `--satit` (auto-detect) commented out
> ([`scripts/fsr-longpreproc:120-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L120-L124)). Tune it via the `longreg-robustreg`
> expert-options key if needed.

> [!gotcha] Strict cross-timepoint consistency
> Any difference between timepoints' `fsr-coreg.par.txt` (reference mode, etc.)
> or unique-modename files aborts the run ([`scripts/fsr-longpreproc:577-591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L577-L591)). All
> timepoints must have been imported/coregistered with the same settings.

> [!gotcha] Cross-script manifest name mismatch in a consistency check
> The modename consistency check compares the first timepoint's
> `fsr-import.unique.modenames.txt` against each timepoint's
> `log/unique.modenames.txt` ([`scripts/fsr-longpreproc:585`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L585)) — but [[fsr-import]] writes
> `fsr-import.unique.modenames.txt`, not `unique.modenames.txt`. The error
> message itself then prints the `fsr-import.*` name
> ([`scripts/fsr-longpreproc:588-589`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L588-L589)). Treat this check as fragile; it is reported
> here as observed code behaviour.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date:** every stage is guarded by `UpdateNeeded`; `--force-update`
  overrides.
- **≥2 timepoints enforced** ([`scripts/fsr-longpreproc:510-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L510-L514)).
- **Per-timepoint prerequisites checked:** `fsr-coreg.par.txt` and
  `runavg-refmodespace.mgz` must exist for every timepoint
  ([`scripts/fsr-longpreproc:563-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L563-L599)).
- **Cross-timepoint parameter consistency enforced** via `diff`.
- **Intensity harmonisation:** per-timepoint robust-registration scales are
  applied on resampling so timepoints are intensity-comparable before averaging.
- **`--expert` validated** by [[fsr-checkxopts]] before use.

## Known Bugs

- [[00188]] — the per-timepoint modename consistency check `diff`s `log/unique.modenames.txt`, but [[fsr-import]] writes the file as `log/fsr-import.unique.modenames.txt`; the missing file makes the check a silent no-op.

## Related Tools

- [[fsr-import]] / [[fsr-coreg]] — per-timepoint predecessors; produce the directories `--tp` points at.
- [[wiki/tools/samseg|samseg]] — used internally (`--reg-only`) to register the base to the atlas template; `run_samseg_long` is the downstream consumer.
- [[mri_robust_template]] — builds the unbiased, intensity-scaled base.
- [[mri_coreg]] — decomposes/recomposes the base→template registration to rigid.
- [[lta_convert]] — inverts and conforms the template registration.
- [[mri_concatenate_lta]] — composes the tp→base→template transform (RAS2RAS).
- [[mri_vol2vol]] / [[mri_concat]] — resample timepoints and average into the base.
- [[mri_convert]] / [[mri_info]] — re-grid the SAMSEG template to the input geometry.
- [[fsr-getxopts]] / [[fsr-checkxopts]] — expert-option lookup (`longreg-robustreg`) and validation.
- [[wiki/pipelines/recon-all|recon-all]] — the non-longitudinal multimodal stream uses [[fsr-import]]/[[fsr-coreg]] without this base-building step.

## Confidence and Gaps

**High confidence:** the processing flow (robust base → samseg-template
registration → rigidify → composite RAS2RAS transform → resample/average), the
intensity de-scaling, the hard-coded `--sat 4.685`, the output filenames, the
manifest files, and the `samseg-long` call sites were all read directly from
source. `confidence` is set to **medium** because of several flag-level
discrepancies below.

> [!gap] Usage text vs. implemented flags
> `--i`, `--refmode`, `--conform`, and `--mode1` are documented but **not
> implemented**; real inputs use `--tp`, with refmode/Conform read from the
> coreg/parameter files ([`scripts/fsr-longpreproc:615-627`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L615-L627) vs the parser).

> [!gap] Inert resampling flags
> `--no-reg-to-base`/`--no-mc`/`--resample`/`--no-resample` set `DoRegToBase` and
> `Resample`, but the main body gates resampling on `ResampleToBase` /
> `ResampleTPToBase` (initialised to 1 and never changed by these flags). The
> flags therefore appear to have no effect; not verified at runtime.

> [!gap] Affine (`--affine`/BaseType 2) branch
> The affine branch sets `rigid = $samseginvlta` ([`scripts/fsr-longpreproc:219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L219)) but
> the subsequent steps reference `$rigidlta`/`$rigidconflta`, which are only
> assigned in the rigid (BaseType 1) branch. The affine path may be incomplete or
> error at runtime; not exercised.

## References

- FreeSurfer source: [`scripts/fsr-longpreproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc) (v8.2.0).
- Caller: [`samseg/samseg-long`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L558) (per-timepoint import/coreg then `fsr-longpreproc`).
- SAMSEG template: `$FREESURFER/average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2/template.nii`.
- Built-in help: `fsr-longpreproc --help` (usage block, [`scripts/fsr-longpreproc:615-636`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L615-L636); `BEGINHELP` is empty).
