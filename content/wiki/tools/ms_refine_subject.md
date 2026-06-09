---
title: "ms_refine_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/ms_refine_subject"
families: []                     # thin wrapper, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[mris_ms_refine]]"
  - "[[mri_ms_fitparms]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The vol1.lta target-volume registration is passed as a fixed positional argument; the script assumes it already exists in the parameter_maps directory but does not create or check it."
tags:
  - surface
  - flash
  - multispectral
  - wrapper
  - parameter-maps
---

# ms_refine_subject

## Summary

`ms_refine_subject` is a thin convenience wrapper that runs the surface-refinement
binary [[mris_ms_refine]] on a subject's **multi-spectral / FLASH parameter maps**.
Given a subject and a hemisphere, it collects every `vol*.mgh` volume in the
subject's `mri/flash/parameter_maps/` directory and invokes `mris_ms_refine` to
refine that hemisphere's white/pial surfaces against the multi-echo FLASH data,
using `vol1.lta` as the registration. It sets no options of its own beyond
assembling the volume list and turning on shell command echoing.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/ms_refine_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/ms_refine_subject`
- **Wraps:** [`mris_ms_refine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L30)

## Purpose and Context

FreeSurfer can refine cortical surfaces using the richer contrast of
multi-spectral FLASH acquisitions (multiple flip angles / echoes) rather than a
single T1, via the binary [[mris_ms_refine]]. That binary takes a long, ordered
argument list (subjects dir, subject, hemisphere, a registration, then every FLASH
volume). `ms_refine_subject` exists purely to spare the user from typing that list
by hand: it discovers the FLASH parameter-map volumes automatically and forwards
everything to [[mris_ms_refine]]. It is a standalone helper — **not** part of
[[wiki/pipelines/recon-all|recon-all]] — and is the natural follow-on to
[[mri_ms_fitparms]], which produces the FLASH parameter maps in the first place.

## Inputs

This script takes **two positional arguments** (no flags):

```
ms_refine_subject <subject> <hemi>
```

- **`<subject>`** (`$1`) — subject ID under `$SUBJECTS_DIR`
  ([`scripts/ms_refine_subject:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L19)).
- **`<hemi>`** (`$2`) — hemisphere (`lh` or `rh`)
  ([`scripts/ms_refine_subject:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L20)).

### Input Assumptions

> [!assumption] FLASH parameter maps and a vol1.lta must already exist
> The script reads every `vol*.mgh` in
> `$SUBJECTS_DIR/<subject>/mri/flash/parameter_maps/`
> ([`scripts/ms_refine_subject:24-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L24-L28)) and passes `vol1.lta` (in that directory)
> as the registration ([`scripts/ms_refine_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L30)). It assumes those files —
> typically produced by [[mri_ms_fitparms]] — and an existing recon (white/pial
> surfaces for `<hemi>`) are already present. With the `-ef` shebang, any missing
> file or a non-zero exit from `mris_ms_refine` aborts the script immediately.

## Outputs

`ms_refine_subject` writes no files itself; all outputs are produced by
[[mris_ms_refine]] (refined surfaces / parameter volumes for the requested
hemisphere). See [[mris_ms_refine]] for the exact output specification.

## Mathematical Foundations

None in the wrapper — it performs no computation. The multi-spectral surface
refinement model (fitting surface placement to the multi-echo FLASH signal) lives
entirely in the binary.

> [!internal] All math is in mris_ms_refine
> The wrapper only assembles arguments. The refinement algorithm is implemented in
> [[mris_ms_refine]] ([`mris_ms_refine/mris_ms_refine.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ms_refine/mris_ms_refine.cpp)).

## Configuration Options

`ms_refine_subject` defines **no command-line flags** of its own. The complete
invocation it builds is fixed
([`scripts/ms_refine_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L30)):

```tcsh
mris_ms_refine -sdir $SUBJECTS_DIR $subject $hemi vol1.lta $VOL_LIST
```

where `$VOL_LIST` is the sorted list of `vol*.mgh` files in the parameter-maps
directory. To change any refinement behaviour you pass options to
[[mris_ms_refine]] directly rather than through this wrapper.

| "Flag" | Type | Default | Description |
|--------|------|---------|-------------|
| `<subject>` (positional `$1`) | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `<hemi>` (positional `$2`) | string | *(required)* | Hemisphere `lh`/`rh`. |

### Configuration Interactions

None — there are no optional flags to interact. The fixed `vol1.lta`
registration and the auto-discovered volume list are the only variable inputs,
and both come from the parameter-maps directory.

## Typical Use Cases

### Refine one hemisphere from FLASH parameter maps

```bash
# After mri_ms_fitparms has populated mri/flash/parameter_maps/ with vol*.mgh
# and vol1.lta:
ms_refine_subject sub01 lh
ms_refine_subject sub01 rh
```

## Pipeline Context

`ms_refine_subject` is a standalone post-processing helper, not a stage of
[[wiki/pipelines/recon-all|recon-all]] or trac-all.

**Predecessor:** [[mri_ms_fitparms]] (creates the FLASH parameter maps and
`vol*.mgh` / `vol1.lta`) → **ms_refine_subject** → **Successor:** downstream
analysis of the refined multi-spectral surfaces.

## Gotchas and Caveats

> [!gotcha] No argument checking — `-ef` aborts on the first problem
> The script does not validate its arguments or print usage; with `--help` it
> simply passes `--help` as the subject name and fails when the resulting
> parameter-maps path does not exist. Because of the `#!/bin/tcsh -ef` shebang it
> exits on the first error (missing directory, missing `vol1.lta`, or a
> `mris_ms_refine` failure). Make sure the parameter maps and `vol1.lta` exist
> before running.

> [!gotcha] `vol1.lta` is hard-coded
> The registration filename is fixed to `vol1.lta` in the parameter-maps
> directory ([`scripts/ms_refine_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L30)); the script neither creates nor
> verifies it. If your registration has a different name, call
> [[mris_ms_refine]] directly.

## Error Compensation and Guard Rails

Minimal. The only guard is the `-ef` shebang, which makes the script stop on the
first error or undefined variable rather than continuing with a bad state. There
is no input validation, no logging, and no `UpdateNeeded`-style skip logic in the
wrapper itself.

## Related Tools

- [[mris_ms_refine]] — the binary this wrapper runs; all options and outputs are defined there.
- [[mri_ms_fitparms]] — produces the FLASH parameter maps (`vol*.mgh`) and the registration this script consumes.

## Confidence and Gaps

**High confidence:** the script is 33 lines and fully traced — it sets
`$SUBJECTS_DIR`-relative paths, lists `vol*.mgh`, and calls
[`mris_ms_refine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject#L30) with a fixed argument order. There are no flags or
branches.

> [!gap] vol1.lta provenance
> The wrapper assumes `vol1.lta` already exists in the parameter-maps directory
> but does not create it; which upstream step writes it (vs. expecting the user
> to supply it) is not determined from this script alone.

## References

- FreeSurfer source: [`scripts/ms_refine_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/ms_refine_subject) (v8.2.0).
- Wrapped binary: [[mris_ms_refine]] ([`mris_ms_refine/mris_ms_refine.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ms_refine/mris_ms_refine.cpp)).
