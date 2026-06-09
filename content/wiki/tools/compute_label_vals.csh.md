---
title: "compute_label_vals.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/compute_label_vals.csh"
families: []                     # standalone exvivo-pipeline helper
recon_all_stage: null            # called by recon-all-exvivo, not the main recon-all
related:
  - "[[mri_label_vals]]"
  - "[[mri_segstats]]"
  - "[[compute_label_volumes.csh]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Consumed by the ex-vivo FLASH-optimization pipeline (recon-all-exvivo → compute_opt_volume.m); the downstream MATLAB step was not traced in depth."
tags:
  - segmentation
  - label
  - intensity
  - exvivo
  - flash
---

# compute_label_vals.csh

## Summary

`compute_label_vals.csh` extracts the **intensity values inside three tissue
labels** (white matter, gray matter, and fluid) from every flip-angle / echo
image of an ex-vivo FLASH acquisition. For each input volume under
`$base/mri/orig/norm/` it runs [[mri_label_vals]] once per label and dumps the
per-voxel sampled values to a `.dat` text file, building the per-label intensity
samples that the ex-vivo tissue-parameter optimizer later reads. It is a fixed,
non-parameterised helper: it takes **no command-line arguments** and is driven
entirely by the `$base` environment variable.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/compute_label_vals.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh)
- **Binary/script location:** `$FREESURFER_HOME/bin/compute_label_vals.csh`
- **Tool invoked:** [`mri_label_vals`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L52) (once per input volume × label).

## Purpose and Context

This script is a building block of FreeSurfer's **ex-vivo** processing, where
multiple FLASH volumes acquired at different flip angles are combined and tissue
parameters (e.g. T1, proton density) are estimated by fitting the signal across
flip angles. To drive that fit, the optimizer needs the observed intensity
distribution of each tissue class in each flip-angle image.
`compute_label_vals.csh` produces exactly those samples: for every corrected
FLASH volume it reads the white-matter, gray-matter, and fluid `.label` files and
writes the volume's intensity at each labelled point to a `.dat` file.

It is invoked by the [`recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L244)
driver (which sets `base` and then calls this script with no arguments,
immediately before running the MATLAB optimizer `compute_opt_volume.m`). It is
**not** part of the standard [[wiki/pipelines/recon-all|recon-all]] stream — it
belongs only to the ex-vivo pipeline.

> [!gotcha] No arguments — controlled by the `$base` environment variable
> Unlike the other `compute_*` label scripts, this one has no flag parser. It
> requires the shell variable `$base` to be set to the subject directory
> (`$SUBJECTS_DIR/<subject>`) and exits with an error if it is not
> ([`scripts/compute_label_vals.csh:3-6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L3-L6)). `recon-all-exvivo` sets it via
> `setenv base $SUBJECTS_DIR/$s` before the call. Running it standalone requires
> the same setup.

## Inputs

### Required Inputs

- **`$base` environment variable** — the subject directory. From it the script
  derives `$base/mri/orig` (the FLASH images) and `$base/label` (the tissue
  labels) ([`scripts/compute_label_vals.csh:8-9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L8-L9)).
- **FLASH volumes** at `$base/mri/orig/norm/*.mgz` — the normalised /
  flip-angle-corrected ex-vivo images, one per flip angle. Several housekeeping
  files are skipped (see below).
- **Tissue label files** at `$base/label/{wm,gm,fluid}.label` — sparse surface/voxel
  [[label-format]] files marking white matter, gray matter, and fluid.

### Input Assumptions

> [!assumption] An ex-vivo FLASH subject prepared by recon-all-exvivo
> The script assumes the directory layout produced earlier in
> [`recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo): a populated `mri/orig/norm/`
> of per-flip-angle `.mgz` volumes and `wm.label` / `gm.label` / `fluid.label` in
> `label/`. It silently skips the non-flip-angle files it finds in `norm/`:
> `001`, `opt`, `opt.unmasked`, `fluid_mask`, `brainmask`, `sse`, `faf`, `bias`
> ([`scripts/compute_label_vals.csh:24-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L24-L47)). Any other `.mgz` in `norm/`
> is treated as a flip-angle image to sample.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<flip>.wm.dat`, `<flip>.gm.dat`, `<flip>.fluid.dat` | `$base/mri/orig/opt_files/` | one [[mri_label_vals]] output per (flip-angle volume × label): the volume's intensity sampled at every point of that label, one value per line |
| `flist.dat` | `$base/mri/orig/opt_files/` | the list of flip-angle volume stems processed (full path without extension), one per line; rebuilt each run |

`<flip>` is the base name of each processed `norm/*.mgz` volume. The output
directory `opt_files/` is created if absent ([`scripts/compute_label_vals.csh:11-12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L11-L12)),
and `flist.dat` is deleted and rewritten on each run ([`scripts/compute_label_vals.csh:14-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L14-L18)).

### Output Specifications

Each `.dat` file is plain text: one floating-point intensity value per line, as
emitted by [[mri_label_vals]] (`printf("%f\n", val)`,
[`mri_label_vals.cpp:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_label_vals/mri_label_vals.cpp#L156)). The values are the FLASH-image
intensities at the voxels covered by the label, sampled nearest-neighbour. These
files are consumed by the MATLAB optimizer (`compute_opt_volume.m`), not by a
human.

## Mathematical Foundations

None in this script — it performs no arithmetic. The only operation is sampling
the volume at label points, which happens inside [[mri_label_vals]].

> [!internal] Sampling is done by mri_label_vals
> For each point of the `.label` file, [[mri_label_vals]] maps the label
> coordinate into the volume and reads the intensity there (nearest-neighbour,
> `MRIsampleVolumeType(..., SAMPLE_NEAREST)`,
> [`mri_label_vals.cpp:147-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_label_vals/mri_label_vals.cpp#L147-L156)). The downstream
> flip-angle / tissue-parameter fit lives in the MATLAB optimizer, not here.

## Configuration Options

### Complete Flag Reference

**None.** `compute_label_vals.csh` accepts no command-line flags or positional
arguments; its entire behaviour is fixed in the source and parameterised only by
the `$base` environment variable. The set of labels (`wm gm fluid`) and the list
of skipped housekeeping files are hard-coded
([`scripts/compute_label_vals.csh:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L10), [`:24-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L24-L47)).

### Configuration Interactions

None — there are no options to interact.

> [!gotcha] `tcsh -ef` makes any failure fatal
> The shebang is `#!/bin/tcsh -ef`: the `-e` flag aborts the whole script on the
> first command that returns non-zero, and `set echo=1`
> ([`scripts/compute_label_vals.csh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L20)) echoes every command. So a single
> missing `norm/*.mgz`, a missing label file, or a failed [[mri_label_vals]] call
> halts the run. To change the labels or inputs you must edit the script.

## Typical Use Cases

### 1. As invoked by the ex-vivo pipeline (the normal path)

```bash
# recon-all-exvivo sets this up, then calls the script with no arguments:
setenv base $SUBJECTS_DIR/exvivo_subj
compute_label_vals.csh
# → $base/mri/orig/opt_files/<flip>.{wm,gm,fluid}.dat  and  flist.dat
# (recon-all-exvivo then runs matlab < $FREESURFER_HOME/matlab/compute_opt_volume.m)
```

### 2. Re-run the sampling for a prepared subject

```bash
# After ex-vivo preprocessing, regenerate the per-label intensity samples.
setenv base /data/subjects/exvivo_07
compute_label_vals.csh
```

## Pipeline Context

`compute_label_vals.csh` is an **ex-vivo-only** helper. It is not in the standard
[[wiki/pipelines/recon-all|recon-all]] stream; it is called by
[`recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L244)
between the bias-field correction of the FLASH volumes and the MATLAB
tissue-parameter optimization:

```
recon-all-exvivo: ... bias-correct norm/*.mgz ─▶ compute_label_vals.csh
                  ─▶ matlab compute_opt_volume.m (builds mri/orig/opt.mgz) ─▶ ...
```

**Predecessor:** [`recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo)
(FLASH normalisation + bias correction; creation of the `wm`/`gm`/`fluid` labels)
→ **this script** → **Successor:** `compute_opt_volume.m`
(`$FREESURFER_HOME/matlab/`), which reads the `.dat` samples to optimise the
combined FLASH volume.

## Gotchas and Caveats

> [!gotcha] Hard-coded skip list keyed on file stem
> Only the exact stems `001`, `opt`, `opt.unmasked`, `fluid_mask`, `brainmask`,
> `sse`, `faf`, `bias` are skipped in `norm/`
> ([`scripts/compute_label_vals.csh:24-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L24-L47)). Any other `.mgz` you place in
> that directory will be treated as a flip-angle image and sampled — including
> stray intermediate files. Keep `norm/` clean.

> [!gotcha] Fixed three-label scheme
> The labels are hard-wired to `wm`, `gm`, and `fluid`
> ([`scripts/compute_label_vals.csh:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L10)); the corresponding
> `label/{wm,gm,fluid}.label` files must exist. This is an ex-vivo tissue scheme,
> not a general label tool — for arbitrary labels use [[mri_label_vals]] directly
> or [[mri_segstats]].

> [!gotcha] `flist.dat` is rebuilt every run
> A pre-existing `opt_files/flist.dat` is removed at the start
> ([`scripts/compute_label_vals.csh:16-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L16-L18)) and regenerated, so the file
> always reflects the current contents of `norm/`.

## Error Compensation and Guard Rails

- **`$base` check.** The script aborts immediately if `$base` is unset
  ([`scripts/compute_label_vals.csh:3-6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L3-L6)).
- **Output directory auto-created.** `opt_files/` is made with `mkdir -p`
  ([`scripts/compute_label_vals.csh:12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh#L12)).
- **Fail-fast.** `tcsh -ef` aborts on the first error, so a missing input does not
  silently produce partial `.dat` files for later volumes.
- **No input modification.** The FLASH volumes and label files are read-only; only
  `.dat` text outputs and `flist.dat` are written.

## Related Tools

- [[mri_label_vals]] — the C++ tool this script calls to sample a volume's intensities at label points (the actual work).
- [[mri_segstats]] — the general per-label intensity/volume statistics tool; the right choice for non-ex-vivo, arbitrary-label intensity summaries.
- [[compute_label_volumes.csh]] — sibling `compute_*` script (label volumes rather than intensity samples).
- [[label-format]] — the `.label` file format read for `wm`/`gm`/`fluid`.
- `recon-all-exvivo` *(no wiki page yet)* — the ex-vivo pipeline driver that sets `$base` and invokes this script.
- `compute_opt_volume.m` *(MATLAB, no wiki page yet)* — the downstream optimizer that consumes the `.dat` outputs.

## Confidence and Gaps

**High confidence:** the no-argument, `$base`-driven design; the fixed
`wm`/`gm`/`fluid` label set; the hard-coded skip list; the per-volume×label
[[mri_label_vals]] invocation; the `opt_files/` outputs and `flist.dat`; and the
`recon-all-exvivo` call site — all read directly from
[`scripts/compute_label_vals.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh)
and [`scripts/recon-all-exvivo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L244).

> [!gap] Downstream MATLAB optimizer not traced
> The exact format expectations and fitting performed by
> `compute_opt_volume.m` (which reads these `.dat` files and `flist.dat`) were not
> examined in detail; the description of how the samples are *used* is from the
> pipeline context, not the MATLAB source.

## References

- FreeSurfer source: [`scripts/compute_label_vals.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_vals.csh) (v8.2.0).
- Call site: [`scripts/recon-all-exvivo:244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all-exvivo#L244).
- FreeSurfer wiki: the ex-vivo / FLASH multi-flip-angle processing documentation describes the tissue-parameter optimization this sampling feeds.
