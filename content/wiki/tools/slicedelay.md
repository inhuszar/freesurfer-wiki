---
title: "slicedelay"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/slicedelay"
families: []                     # FSFAST slice-timing utility
recon_all_stage: null
related:
  - "[[stc.fsl]]"
  - "[[preproc-sess]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact SMS slice-ordering convention for ngroups>1 (the per-group interleave) is taken from the code; not cross-checked against a Siemens SMS acquisition log."
tags:
  - fsfast
  - fmri
  - slice-timing
  - fsl
---

# slicedelay

## Summary

`slicedelay` writes an FSL "custom slice-timing" file for use with FSL
`slicetimer` (`--tcustom=<file>`). The file has one value per slice; each value is
that slice's acquisition delay expressed as a fraction of the TR, ranging from
`+0.5` (acquired at the very start of the TR) to `-0.5` (acquired at the very end).
It supports the common slice-acquisition orders — sequential up/down, interleaved
odd/even, and the Siemens interleave rule — and handles simultaneous-multi-slice
(SMS / multiband) acquisitions via a slice-group count. It is a small helper used
by FreeSurfer's FSFAST fMRI stream, **not** part of the TRACULA diffusion pipeline.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`)
- **Source file:** [`scripts/slicedelay`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay)
- **Script location:** `$FREESURFER_HOME/bin/slicedelay`
- **Output consumer:** FSL `slicetimer` (the `.fsl` wrapper), which reads the file via `--tcustom`.

## Purpose and Context

In an interleaved or sequential EPI acquisition, different slices of a volume are
collected at different times within each TR. Slice-timing correction shifts each
slice's time series to a common reference time. FSL's `slicetimer` can take a
**custom** delay file when the acquisition order is not one of its built-ins;
`slicedelay` generates that file for the orders FreeSurfer's FSFAST stream needs,
including multiband, where slices are acquired in simultaneously-excited groups.

`slicedelay` is invoked by FSFAST's slice-timing front end [[stc.fsl]] (which in
turn is called by [[preproc-sess]]); see Pipeline Context. Despite being grouped
here with TRACULA, the code is unrelated to diffusion — it belongs to the fMRI
preprocessing path.

> [!gotcha] Not a TRACULA tool
> `slicedelay` does not appear in `trac-all`/`trac-preproc`/`trac-paths`. The only
> FreeSurfer caller is the FSFAST slice-timing wrapper `stc.fsl`
> (`slicedelay --nslices … --<order> --o <sdf> --ngroups …`). Treat it as an FSFAST
> fMRI utility.

## Inputs

`slicedelay` takes no image input — it derives the delays purely from the slice
count and ordering.

### Required Inputs

- **`--nslices <N>`** — total number of slices in the volume.
- **`--order <order>`** (or a shorthand flag) — the slice-acquisition order: one of
  `up`, `down`, `odd`, `even`, `siemens`.
- **`--o <file>`** — the output slice-delay file to write.

### Input Assumptions

> [!assumption] Slice count divisible by the number of SMS groups
> For SMS data, `nslices` must be an exact multiple of `ngroups`; otherwise the
> script prints "cannot divide nslices … by ngroups …" and exits
> ([`scripts/slicedelay#L100-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L100-L104)). The per-group slice count is `nslices/ngroups`.
> The `siemens` order auto-selects the odd-first or even-first interleave from the
> parity of the per-group slice count ([`#L130-L134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L130-L134)).

## Outputs

### Files Created

| File | Contents |
|------|----------|
| `--o <file>` | one floating-point value per slice (`%15.13f`, one per line): the slice delay as a fraction of the TR, in `[+0.5, -0.5]`. Directly usable as FSL `slicetimer --tcustom`. |

### Output Specifications

A single-column text file with `nslices` rows (for SMS, the same `nslices/ngroups`
acquisition delays are repeated for each of the `ngroups` groups), written at
[`scripts/slicedelay#L144-L146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L144-L146).

## Mathematical Foundations

> [!math] Acquisition delay as a fraction of the TR
> Within one SMS group of $n_{pg}=\text{nslices}/\text{ngroups}$ slices, the
> acquisition delay of the slice at acquisition position $s\in\{1,\dots,n_{pg}\}$ is
> $$D(s) = \frac{\tfrac{n_{pg}-1}{2} - (s-1)}{n_{pg}}$$
> ([`scripts/slicedelay#L115-L118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L115-L118)). This is centred on zero, so the first-acquired
> slice gets $+\tfrac{n_{pg}-1}{2n_{pg}}$ (near $+0.5$) and the last gets the
> negative of that (near $-0.5$).
>
> The acquisition **order** then maps each anatomical slice index to its position
> in the acquisition sequence ([`#L126-L134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L126-L134)):
> - `up`: $1,2,\dots,n_{pg}$
> - `down`: $n_{pg},\dots,2,1$
> - `odd`: odd indices first ($1,3,5,\dots$) then even ($2,4,\dots$)
> - `even`: even indices first then odd
> - `siemens`: if $n_{pg}$ is odd, odd-first; if even, even-first
>
> The delays are then re-ordered so the output is indexed by **anatomical** slice
> position (the inverse permutation of the acquisition order,
> `AnatAcqSliceOrder0`, [`#L140-L142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L140-L142)), and the whole block is repeated once per
> SMS group.

## Configuration Options

### Complete Flag Reference

Enumerated from `parse_args()`
([`scripts/slicedelay#L32-L72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L32-L72)):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o <file>` | string (path) | *(required)* | Output slice-delay file. |
| `--nslices <N>` | integer | *(required)* | Total number of slices in the volume. |
| `--order <order>` | string | *(required)* | Slice order: `up`, `down`, `odd`, `even`, or `siemens`. |
| `--ngroups <N>` | integer | `1` | Number of simultaneously-acquired slice groups (SMS / multiband factor). |
| `--up` | bool | — | Shorthand for `--order up`. |
| `--down` | bool | — | Shorthand for `--order down`. |
| `--odd` | bool | — | Shorthand for `--order odd`. |
| `--even` | bool | — | Shorthand for `--order even`. |
| `--siemens` | bool | — | Shorthand for `--order siemens`. |
| `--debug` | bool | off | Print each parsed flag. |
| `--help` | bool | — | Print usage/help and exit (note: exits with status 1). |

### Configuration Interactions

> [!gotcha] All three of output, nslices, and order are mandatory
> `check_args` exits with an error (and prints help) if any of `--o`, `--nslices`,
> or `--order` is missing ([`scripts/slicedelay#L81-L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L81-L96)). The shorthand
> order flags (`--up`/`--down`/`--odd`/`--even`/`--siemens`) are equivalent to
> `--order <name>`; if several are given, the last one wins (each just overwrites
> `order`).

> [!gotcha] `--ngroups` must divide `--nslices`
> A non-divisible combination is rejected before any output is written
> ([`scripts/slicedelay#L100-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L100-L104)). Note this particular failure path calls
> `sys.exit(0)` (a zero/"success" status) despite being an error.

## Typical Use Cases

### 1. Interleaved single-band acquisition (Siemens)

```bash
# 40 slices, Siemens interleave, one band.
slicedelay --nslices 40 --siemens --o sdf.txt
# then:
slicetimer -i func.nii.gz -o func_stc.nii.gz --tcustom=sdf.txt
```

### 2. Sequential ascending

```bash
slicedelay --nslices 32 --order up --o sdf.txt
```

### 3. Multiband (SMS) acquisition

```bash
# 60 slices acquired as 3 simultaneous groups of 20, Siemens order within a group.
slicedelay --nslices 60 --ngroups 3 --siemens --o sdf.txt
```

## Pipeline Context

`slicedelay` is a leaf utility of the **FSFAST** fMRI preprocessing stream, not of
recon-all or TRACULA. It is invoked by FSL's slice-timing front end
[[stc.fsl]]:

```
slicedelay --nslices $nslices --$SliceSeq --o $sdf --ngroups $ngroups
slicetimer.fsl -i $intmp -o $outtmp --tcustom=$sdf
```

([`fsfast/bin/stc.fsl#L90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L90), [`#L112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L112)), which is itself driven
by [[preproc-sess]].

**Predecessor:** [[preproc-sess]] → [[stc.fsl]] → **slicedelay** (writes the delay
file) → **Successor:** FSL `slicetimer` (applies the correction).

It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]].

## Gotchas and Caveats

> [!gotcha] `--help` and the divisibility error exit non-conventionally
> `--help` exits with status **1** ([`scripts/slicedelay#L63-L65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L63-L65)), and the
> nslices/ngroups divisibility failure exits with status **0**
> ([`#L100-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L100-L104)). A caller that keys off the exit code (as `stc.fsl` does
> not) should be aware these do not follow the usual 0=success/1=error convention.

> [!gotcha] Output is indexed by anatomical slice, not acquisition order
> The values are written in anatomical slice order (slice 1, 2, 3, …), with the
> delay of each computed from when that slice was acquired — exactly what FSL
> `slicetimer --tcustom` expects.

## Error Compensation and Guard Rails

- **Required-argument checks** for `--o`, `--nslices`, `--order` before any
  computation ([`scripts/slicedelay#L81-L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L81-L96)).
- **Divisibility guard** for SMS groups ([`#L100-L104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L100-L104)).
- **Unrecognised-order guard:** an `order` that is none of the five known values
  leaves the acquisition list empty and triggers "slice order … not recognized"
  ([`scripts/slicedelay#L136-L138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay#L136-L138)). (Note: a truly unknown `--order` value is
  only caught here, after argument parsing accepts it.)

## Related Tools

- [[stc.fsl]] — the FSFAST slice-timing-correction wrapper that calls `slicedelay` and then FSL `slicetimer`.
- [[preproc-sess]] — the FSFAST session preprocessing driver that invokes `stc.fsl`.

## Confidence and Gaps

**High confidence:** the full flag set and shorthands, the delay formula, the five
slice orders and the Siemens odd/even rule, the SMS group handling, the required-
argument and divisibility guards, and the FSFAST caller — all read directly from
[`scripts/slicedelay`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay) and
[`fsfast/bin/stc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl).

> [!gap] SMS per-group ordering not cross-checked against hardware
> The repetition of the same per-group delay block for every SMS group, and the
> Siemens parity rule, are taken from the code; they were not validated against a
> real Siemens multiband acquisition's slice-timing log.

## References

- FreeSurfer source: [`scripts/slicedelay`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/slicedelay) (v8.2.0).
- Caller: [`fsfast/bin/stc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl) ("front-end for FSL's slicetimer slice timing correction").
- FSL `slicetimer` documentation (the `--tcustom` custom slice-timing option).
