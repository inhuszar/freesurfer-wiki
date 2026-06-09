---
title: "inflate_subject3"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject3"
families: []                     # legacy *_subject surface helper variant
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[inflate_subject]]"
  - "[[inflate_subject-lh]]"
  - "[[inflate_subject-rh]]"
  - "[[mri_fill]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether inflate_subject3 was ever functional in this form: line 31 `$p1=$!` is not valid tcsh and would error under most shells, so the parallelisation as written looks broken."
tags:
  - surface
  - inflation
  - legacy
  - tcsh
  - variant
  - parallel
---

# inflate_subject3

## Summary

`inflate_subject3` is a **parallel variant** of the canonical [[inflate_subject]]
driver: it fills the WM volume with [[mri_fill]], then launches the
left-hemisphere worker [[inflate_subject-lh]] in the background while running the
right-hemisphere worker [[inflate_subject-rh]] in the foreground, and finally
`wait`s for the background job. The intent is to halve wall-clock time by
inflating both hemispheres at once. As written, the backgrounding contains a
syntax error (see [Gotchas](#gotchas-and-caveats)), so the page documents the
script's evident intent and flags the defect. It is otherwise functionally
equivalent to [[inflate_subject]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/inflate_subject3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject3`
- **Tools invoked:** [`mri_fill`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L29), then [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L30) (backgrounded) and [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L32) (foreground).

## Purpose and Context

This is the speed-oriented member of the [[inflate_subject]] family. The two
hemisphere inflations are independent once `mri/filled` exists, so they can run
concurrently. `inflate_subject3` differs from the canonical driver in three
non-essential ways: it uses `pushd`/`popd` instead of a bare `cd`, it uses
`tcsh -f` (no `-e`, so it does **not** abort on the first error), and it
backgrounds the LH worker before running the RH worker and waiting. It is **not**
part of [[wiki/pipelines/recon-all|recon-all]] (recon-all has its own
`-parallel`/`-threads` machinery for the per-hemisphere `mris_inflate` steps).

> [!gotcha] Sets `DIAG 0x04040`
> Like [[inflate_subject]], it exports `DIAG 0x04040`
> ([`scripts/inflate_subject3:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L21)).

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **`$SUBJECTS_DIR/$1/mri/wm`** — read by [[mri_fill]] (see [[wm.mgz]]).

### Input Assumptions

> [!assumption] Standard subject tree with `mri/wm`
> Same assumptions as [[inflate_subject]]: `$SUBJECTS_DIR` set; the subject's
> `scripts/`, `mri/`, and `surf/` folders exist; `mri/wm` present. **Unlike**
> [[inflate_subject]], the shebang is `tcsh -f` (no `-e`), so an error in
> `mri_fill` or a worker does not necessarily abort the script — it may continue
> and leave partial outputs.

## Outputs

Same outputs as [[inflate_subject]]: `mri/filled` and the
`surf/{lh,rh}.{orig,smoothwm,inflated}` surfaces (plus `NOTES`). Only the
execution order (parallel) differs. See [[inflate_subject]] for the full table.

## Mathematical Foundations

None in the script. All math is in the called tools; see [[mri_fill]] and
[[mris_inflate]] (run with `-dist 0` by the workers).

## Configuration Options

### Complete Flag Reference

No option parser; one positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |

### Configuration Interactions

None. The defining difference from the family is execution strategy
(background LH + foreground RH + `wait`), not any user-settable flag.

## Typical Use Cases

### Inflate both hemispheres concurrently

```bash
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject3 bert     # intended: LH and RH inflate in parallel
```

> [!gotcha] Prefer the canonical driver
> Because of the syntax defect below, use [[inflate_subject]] (sequential) unless
> you have verified this script runs in your shell; the wall-clock saving is the
> only advantage.

## Pipeline Context

A legacy standalone variant; **not** a recon-all step.

**Predecessor:** edited `mri/wm` → **inflate_subject3** → **Successor:** surface
QA. recon-all does **not** call it and provides its own parallel inflation.

## Gotchas and Caveats

> [!gotcha] Line 31 `$p1=$!` is not valid tcsh
> After backgrounding the LH worker, the script tries to capture its PID with
> [`scripts/inflate_subject3:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L31): `$p1=$!`. In tcsh a variable
> assignment must be `set p1 = $!`; writing `$p1=$!` expands the (unset) variable
> `p1` and is a syntax/usage error. The subsequent
> [`wait $p1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3#L33)
> therefore cannot reference the job by PID. Under `tcsh -f` (no `-e`) the error
> may be non-fatal but the intended PID-specific wait does not work as written.
> Treat the parallelisation as **unverified/likely broken**; the safe equivalent
> is [[inflate_subject]].

> [!gotcha] `tcsh -f`, not `-ef`
> Unlike [[inflate_subject]] and the `-lh`/`-rh` workers (`-ef`), this script does
> not use `-e`, so a failed `mri_fill` does not stop it from proceeding to the
> hemisphere workers.

## Error Compensation and Guard Rails

- **No fail-fast:** `-f` (without `-e`) means errors do not abort the script.
- Provenance to `NOTES` is still written by the `-lh`/`-rh` workers it calls.

## Known Bugs

- [[00177]] — invalid tcsh `$p1=$!` (should be `set p1 = $!`) never captures the backgrounded lh PID, so `wait $p1` does not join on it as intended.

## Related Tools

- [[inflate_subject]] — the canonical sequential driver this variant parallelises.
- [[inflate_subject-lh]] / [[inflate_subject-rh]] — the workers (run concurrently here).
- [[mri_fill]] — the fill step.
- [[wiki/pipelines/recon-all|recon-all]] — provides its own parallel inflation.

## Confidence and Gaps

**High confidence** on the control flow and the differences from
[[inflate_subject]] (read from the full 35-line script).

> [!gap] Functional status of the parallel path
> The `$p1=$!` line is not valid tcsh; whether this script ever inflated both
> hemispheres correctly in this form is doubtful and was not test-run here.

## References

- FreeSurfer source: [`scripts/inflate_subject3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject3) (v8.2.0).
