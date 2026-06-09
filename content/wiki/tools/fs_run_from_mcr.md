---
title: "fs_run_from_mcr"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/fs_run_from_mcr"
families: []                     # standalone runtime wrapper for MCR-launched tools
recon_all_stage: null
related:
  - "[[fs_time]]"
  - "[[fs_lib_check]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - infrastructure
  - matlab
  - mcr
  - library-path
  - segmentation
---

# fs_run_from_mcr

## Summary

`fs_run_from_mcr` is a tiny wrapper that lets a MATLAB-compiled FreeSurfer tool
safely shell out to a *native* FreeSurfer binary. A program running under the
MATLAB Compiler Runtime (MCR) has its `LD_LIBRARY_PATH` rewritten to point at the
MCR's bundled shared libraries; if a native binary like
[[wiki/tools/mri_convert|mri_convert]] is launched in that environment it may
pick up the MCR's incompatible system libraries and crash. `fs_run_from_mcr`
restores the *host* library path — either clearing `LD_LIBRARY_PATH` or replacing
it with a pre-saved snapshot — and then `exec`s the requested command. It is
prepended to every `system()` call to a FreeSurfer executable inside the compiled
hippocampal-subfield, thalamic-nuclei, and brainstem-segmentation MATLAB tools.

## Source Information

- **Language:** bash shell script (14 lines)
- **Source file:** [`scripts/fs_run_from_mcr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_run_from_mcr`
- **Key environment variable:** `LD_LIBRARY_PATH_MCR_SNAPSHOT`

## Purpose and Context

Several FreeSurfer modules — the HippoSF hippocampal-subfield segmentation,
ThalamicNuclei, and BrainstemSS — are distributed as MATLAB code compiled against
the MCR. The MCR launcher prepends its own library directories to
`LD_LIBRARY_PATH` so that the compiled MATLAB can find its runtime. The problem:
those modules also call out to ordinary FreeSurfer binaries
([[wiki/tools/mri_convert|mri_convert]], `mri_robust_register`, `bbregister`,
`mri_binarize`, …) via MATLAB's `system()`. Inside the MCR-modified environment a
native binary can resolve a conflicting MCR copy of a system library (libstdc++,
libz, etc.) and fail.

`fs_run_from_mcr` is the fix: the MATLAB code builds the call path as
`<FSpath>/fs_run_from_mcr <FSpath>/<binary> …` (see e.g.
`ThalamicNuclei/src/SegmentThalamicNuclei.m:44`,
`FSpath = [FSpath '/fs_run_from_mcr ' FSpath '/'];`), so every native binary is
invoked through this wrapper. The wrapper neutralises the MCR's library-path
modification before handing off, so the native binary runs against the host's
own libraries. It is purely an environment shim and is not part of any
text-pipeline stage.

## Inputs

### Required Inputs

- **A command line to execute**, supplied as the wrapper's positional arguments
  (`"$@"`). The wrapper does no argument parsing — the first argument is the
  program to run and the rest are its arguments. With no arguments, `exec` with
  an empty list is a no-op and the wrapper simply exits.

### Input Assumptions

> [!assumption] `LD_LIBRARY_PATH_MCR_SNAPSHOT` holds the pre-MCR library path
> The wrapper assumes that, *if* the host library path needs to be preserved
> (rather than cleared), it has been captured in the environment variable
> `LD_LIBRARY_PATH_MCR_SNAPSHOT` before the MCR altered `LD_LIBRARY_PATH`. The
> MCR launch wrapper / `run_*.sh` scripts are expected to set this snapshot. If
> it is unset, the wrapper falls back to clearing `LD_LIBRARY_PATH` entirely.

## Outputs

### Files Created

None. `fs_run_from_mcr` produces no output of its own; it modifies the
environment and then `exec`s, so the wrapped command's stdout, stderr, and exit
status pass through transparently (the `exec` replaces the wrapper process, so
its exit status *is* the wrapper's).

### Output Specifications

The only observable effect is the environment seen by the wrapped command:
`LD_LIBRARY_PATH` is either **unset** or set to the value of
`LD_LIBRARY_PATH_MCR_SNAPSHOT`. Everything else in the environment is inherited
unchanged.

## Mathematical Foundations

None — this is an environment-manipulation shim with no computation.

## Configuration Options

### Complete Flag Reference

`fs_run_from_mcr` has **no flags**. It is invoked as
`fs_run_from_mcr <command> [args …]` and treats all arguments as the command to
run.

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `<command> [args …]` | string(s) | *(required)* | The program and arguments to execute after the library path is reset ([`scripts/fs_run_from_mcr:14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L14)). |

### Controlling environment variable

| Variable | Effect |
|----------|--------|
| `LD_LIBRARY_PATH_MCR_SNAPSHOT` | If **set** (non-empty), `LD_LIBRARY_PATH` is exported as this value ([`scripts/fs_run_from_mcr:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L10)). If **unset/empty**, `LD_LIBRARY_PATH` is `unset` entirely ([`scripts/fs_run_from_mcr:7-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L7-L8)). |

### Configuration Interactions

> [!gotcha] Empty snapshot ⇒ library path is cleared, not preserved
> The branch is `if [ -z "$LD_LIBRARY_PATH_MCR_SNAPSHOT" ]`
> ([`scripts/fs_run_from_mcr:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L7-L11)). So when the snapshot variable is empty,
> the wrapped binary runs with **no** `LD_LIBRARY_PATH` at all (relying on the
> system default loader paths). This is the intended safe default — it removes
> the MCR contamination — but a native binary that genuinely needs a custom
> `LD_LIBRARY_PATH` entry not captured in the snapshot will not see it.

## Typical Use Cases

### 1. How the compiled MATLAB tools call it (the normal usage)

```matlab
% Inside SegmentThalamicNuclei.m / segmentSubject*.m:
FSpath = [FSpath '/fs_run_from_mcr ' FSpath '/'];
% ... later ...
system([FSpath '/mri_convert ' mov ' ' out ' -odt float ... ']);
% expands to:
%   <FSpath>/fs_run_from_mcr <FSpath>/mri_convert <mov> <out> -odt float ...
```

The native [[wiki/tools/mri_convert|mri_convert]] therefore runs with the host
library path rather than the MCR's.

### 2. Manual use to run a binary with a clean library path

```bash
# Run mri_convert as if no LD_LIBRARY_PATH override were in effect:
fs_run_from_mcr mri_convert in.mgz out.mgz
```

## Pipeline Context

`fs_run_from_mcr` is an infrastructure shim, not a pipeline stage. It is not
called by [[wiki/pipelines/recon-all|recon-all]] directly; rather, the **compiled
MATLAB segmentation tools** that recon-all (or the user) invokes —
`segmentHA_T1`/HippoSF, `segmentThalamicNuclei`, `segmentBS`/BrainstemSS — use it
internally to wrap every native FreeSurfer binary they shell out to.

**Predecessor:** the MCR launcher (which set the MCR `LD_LIBRARY_PATH`) →
**fs_run_from_mcr** (resets it) → **Successor:** the native FreeSurfer binary
(e.g. [[wiki/tools/mri_convert|mri_convert]], `mri_robust_register`,
`bbregister`).

## Gotchas and Caveats

> [!gotcha] Conceptually parallel to `fs_time` — a "run this command after
> adjusting the environment" wrapper
> Like [[fs_time]] (which prefixes a command to *time* it), `fs_run_from_mcr`
> prefixes a command to *fix its library environment*. Both rely on `exec`-style
> hand-off so the wrapped command's status is preserved. Do not confuse the two:
> `fs_run_from_mcr` changes `LD_LIBRARY_PATH`; `fs_time` does not.

> [!gotcha] It does not restore the MCR path afterward
> Because it `exec`s ([`scripts/fs_run_from_mcr:14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L14)), the wrapper process is
> replaced by the wrapped command; there is no "after". The library-path reset
> applies only to that one child process, which is exactly the intent — the
> parent MCR process keeps its own environment.

## Error Compensation and Guard Rails

- **Safe default of clearing the path.** If the snapshot variable is missing, the
  wrapper unsets `LD_LIBRARY_PATH` rather than leaving the MCR's value in place
  ([`scripts/fs_run_from_mcr:7-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr#L7-L11)) — erring toward the host loader defaults,
  which is the correct behaviour for native FreeSurfer binaries.
- **Status transparency via `exec`.** The native binary's exit status is returned
  unchanged because the wrapper does not survive the `exec`.

## Related Tools

- [[fs_time]] — the other small "prefix a command to alter its execution" wrapper; `fs_time` adds resource timing, `fs_run_from_mcr` fixes the library path.
- [[fs_lib_check]] — diagnoses missing/incorrect shared libraries; `fs_run_from_mcr` exists precisely to prevent the MCR from injecting *wrong* libraries into native binaries.
- [[wiki/tools/mri_convert|mri_convert]] — a canonical native binary the compiled MATLAB tools call through this wrapper.
- HippoSF / ThalamicNuclei / BrainstemSS compiled segmentation tools *(no wiki pages yet)* — the consumers that prepend `fs_run_from_mcr` to every native call.

## Confidence and Gaps

**High confidence:** the entire 14-line script was read; the two-branch
library-path logic, the controlling `LD_LIBRARY_PATH_MCR_SNAPSHOT` variable, the
no-flags interface, and the `exec` hand-off are unambiguous. The usage pattern
was confirmed in the compiled-MATLAB sources
(`ThalamicNuclei/src/SegmentThalamicNuclei.m:44`,
`HippoSF/src/segmentSubjectT1_autoEstimateAlveusML.m:48`).

## References

- FreeSurfer source: [`scripts/fs_run_from_mcr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_run_from_mcr) (v8.2.0).
- Consumer example: `ThalamicNuclei/src/SegmentThalamicNuclei.m:44` (constructs `FSpath '/fs_run_from_mcr ' FSpath '/'`).
- MATLAB Compiler Runtime (MCR) documentation — background on the MCR's modification of `LD_LIBRARY_PATH`.
