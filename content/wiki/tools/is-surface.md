---
title: "is-surface"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/is-surface"
families: []                     # standalone file-type predicate
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[surface-format]]"
  - "[[isanalyze]]"
  - "[[isnifti]]"
  - "[[IsLTA]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "No in-tree caller of is-surface was found in scripts/ (v8.2.0); it appears to be a standalone/library helper rather than part of a pipeline."
tags:
  - utility
  - file-type
  - predicate
  - surface
  - formats
---

# is-surface

## Summary

`is-surface` decides whether a file is a **volume-encoded FreeSurfer surface** —
that is, surface data (e.g. a per-vertex overlay or a surface stored in a volume
container) recognised by its degenerate geometry rather than by extension. It asks
[[mri_info]] for the number of columns and rows in the file's header and applies a
simple heuristic: if there are **more than 1000 columns and exactly 1 row**, it is
treated as a surface. It prints `1` (is a surface) or `0` (is not) to stdout and
exits `0`; on any error (file missing, [[mri_info]] failure) it exits `1`.

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/is-surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface)
- **Original author:** Doug Greve ([`scripts/is-surface:6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L6))
- **Binary/script location:** `$FREESURFER_HOME/bin/is-surface`
- **External tools called:** [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L50) (twice — once for `--ncols`, once for `--nrows`).

## Purpose and Context

FreeSurfer often stores **surface-based scalar data** (overlays, statistics, or a
remapped surface) inside a volume file format such as MGH/MGZ. A surface with *V*
vertices is laid out as a 1-D volume of dimensions `V × 1 × 1` — many columns,
a single row, a single slice — so that the standard volume I/O can carry it. From
the header alone, such a file looks nothing like an anatomical volume (which has
balanced column/row/slice counts). `is-surface` exploits that signature to tell
the two apart **without** relying on the filename, which for surface-encoded data
is often just an `.mgh`/`.mgz` like any volume.

This is a **geometry-based** predicate. It is more like [[IsLTA]] (which inspects
content) than [[isanalyze]]/[[isnifti]] (which inspect the name): it reads the
header via [[mri_info]] and reasons about the dimensions.

> [!gotcha] Heuristic, not a format check
> "Surface" here means "looks like a surface-shaped volume": > 1000 columns and
> exactly 1 row ([`scripts/is-surface:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L70)). It does **not** read the
> FreeSurfer binary [[surface-format]] (the `lh.white`-style geometry files with
> the `0xFFFFFF` magic number) — those are not volume-readable by [[mri_info]] at
> all. `is-surface` is specifically for surface data stored in a *volume*
> container.

## Inputs

### Required Inputs

- **Exactly one argument:** the file to classify
  ([`scripts/is-surface:22-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L22-L36)). The file **must exist** — a
  missing file prints `ERROR: cannot find <file>` and exits `1`
  ([`scripts/is-surface:39-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L39-L42)). It must also be readable by
  [[mri_info]] (any volume format MGH/MGZ/NIfTI/ANALYZE/…).

### Input Assumptions

> [!assumption] A surface is a Vx1x1 volume with V > 1000
> The file is assumed to be a volume that [[mri_info]] can open. A surface overlay
> is recognised by having more than 1000 columns and exactly 1 row. The implicit
> assumption is that real anatomical/functional volumes have a row count greater
> than 1, and that any surface of interest has more than 1000 vertices — both
> safe for whole-brain FreeSurfer surfaces (tens of thousands of vertices) but see
> the gotchas for edge cases.

## Outputs

### Files Created

None on disk. Two scratch temp files (`/tmp/is-surface.$$.tmp`,
`.tmp2`) hold the [[mri_info]] output and stderr and are removed before exit
([`scripts/is-surface:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L44-L47), [`:76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L76)). The result is printed to
stdout.

### Output Specifications — the output / exit-code contract

The **verdict is on stdout**:

| stdout value | Meaning |
|--------------|---------|
| `1` | Is a surface: `ncols > 1000` **and** `nrows == 1` ([`scripts/is-surface:70-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L70-L71)). |
| `0` | Is not a surface (any other geometry) ([`scripts/is-surface:72-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L72-L74)). |

Exit-status behaviour:

| Exit status | Meaning |
|-------------|---------|
| `0` | Normal completion — a `1` or `0` was printed ([`scripts/is-surface:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L78)). |
| `1` | Error: wrong argument count ([`:22-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L22-L36)), file not found ([`:39-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L39-L42)), or either [[mri_info]] call failed ([`:52-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L52-L56), [`:61-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L61-L65)). On an `mri_info` failure the captured stderr is echoed before exiting. |

> [!gotcha] Answer on stdout, not in the exit code
> Like [[IsLTA]] and unlike [[isanalyze]]/[[isnifti]], `is-surface` reports its
> yes/no answer as the printed `1`/`0` and reserves the **exit status purely for
> errors** (always `0` on a successful classification, `1` on any failure). Branch
> on the captured stdout, not on `$status`.

## Mathematical Foundations

None beyond an integer comparison. The decision is the boolean
$(\text{ncols} > 1000) \wedge (\text{nrows} = 1)$, evaluated by the csh `@`
integer arithmetic on the values returned by [[mri_info]]
([`scripts/is-surface:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L57), [`:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L66), [`:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L70)).

> [!internal] Column/row counts come from mri_info
> The actual header reading — opening the volume and reporting `--ncols` /
> `--nrows` — is done by [[mri_info]]. `is-surface` only thresholds those two
> integers.

## Configuration Options

### Complete Flag Reference

`is-surface` has **no flags**. It takes exactly one positional argument (the
file) and no options.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | One positional filename argument. Any other count (including zero) prints the multi-line usage/help block — which doubles as the help text — and exits `1` ([`scripts/is-surface:22-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L22-L36)). There is no dedicated `-help`/`-version` flag; running with no argument shows usage and the version string. |

### Configuration Interactions

None — there are no flags to interact.

## Typical Use Cases

### Use Case 1: Tell a surface overlay apart from a volume

```tcsh
set issurf = `is-surface $infile`
if($issurf) then
  echo "$infile is a surface overlay (Vx1x1)"
else
  echo "$infile is a volume"
endif
```

### Use Case 2: Quick interactive check

```bash
is-surface lh.thickness.mgh   # prints 1  (e.g. ~140k cols, 1 row)
is-surface orig.mgz           # prints 0  (256x256x256 volume)
is-surface /no/such/file      # prints "ERROR: cannot find ..." and exits 1
```

## Pipeline Context

`is-surface` is a **standalone file-type utility**. It is not called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`, and no caller was found
elsewhere in `scripts/` for v8.2.0 (see [Confidence and Gaps](#confidence-and-gaps)).
It is a convenience helper for scripts or interactive use that need to
discriminate a surface-encoded volume from a genuine image volume — for example
before deciding whether to reshape data or which resampling tool to use.

**Predecessor:** any tool that emits a volume-encoded file (e.g.
[[mri_vol2surf]], [[mris_preproc]]) → **is-surface** → **Successor:**
surface-vs-volume-dependent logic in the calling script.

## Gotchas and Caveats

> [!gotcha] The 1000-column / 1-row thresholds are hard-coded
> A surface overlay with ≤ 1000 vertices (rare, but possible for ROIs, custom
> meshes, or downsampled spheres) is reported as **not** a surface, and a volume
> that happens to be `N×1×1` with `N > 1000` (e.g. an unusual 1-D data file)
> would be reported **as** a surface. The heuristic targets typical whole-brain
> surfaces ([`scripts/is-surface:68-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L68-L71)).

> [!gotcha] Only `nrows == 1` exactly counts
> A surface reshaped to a different layout (e.g. spread across rows and slices)
> would fail the `nrows == 1` test even with > 1000 columns. The signature is the
> canonical FreeSurfer `V × 1 × 1` packing.

> [!gotcha] Not for native binary surfaces
> Geometry files like `lh.white`/`lh.pial` (the binary [[surface-format]]) are
> *not* volumes; [[mri_info]] cannot report `--ncols`/`--nrows` for them, so the
> [[mri_info]] call fails and `is-surface` exits `1` (error), not `0`. Use this
> tool only for surface data carried in a volume container.

> [!gotcha] Fixed `/tmp` scratch paths
> Temp files are hard-coded under `/tmp` with the PID (`/tmp/is-surface.$$.tmp`);
> on systems where `/tmp` is not writable, the [[mri_info]] redirect will fail.

## Error Compensation and Guard Rails

- **Argument-count and existence checks** up front: no/extra args → usage + exit
  `1` ([`scripts/is-surface:22-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L22-L36)); missing file → error + exit `1`
  ([`:39-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L39-L42)).
- **mri_info failures are surfaced**: if either [[mri_info]] call returns
  non-zero, its captured stderr is printed and the temp files are cleaned up
  before exiting `1` ([`scripts/is-surface:52-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L52-L56), [`:61-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface#L61-L65)).
- There is no compensation for borderline geometries — the threshold is fixed and
  the answer is a hard yes/no.

## Related Tools

- [[mri_info]] — supplies the `--ncols`/`--nrows` header values this tool thresholds.
- [[surface-format]] — the native binary surface format (which `is-surface` does **not** detect; it detects surface data stored in a *volume*).
- [[isanalyze]], [[isnifti]] — sibling file-type predicates, but extension-based and exit-code-valued.
- [[IsLTA]] — content-based sibling predicate (for transforms), like `is-surface` it prints its answer and reserves the exit code for errors.

## Confidence and Gaps

**High confidence** on behaviour: the threshold rule, the [[mri_info]] usage, the
output/exit contract, and the error handling were read directly from
[`scripts/is-surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface).

> [!gap] No in-tree caller found
> A search of `scripts/` for v8.2.0 turned up no script that invokes
> `is-surface` (only the build's `CMakeLists.txt` lists it for installation). It
> appears to be a standalone/interactive helper or one used by code outside the
> `scripts/` tree; the exact downstream consumers are unconfirmed.

## References

- FreeSurfer source: [`scripts/is-surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/is-surface) (v8.2.0).
- Header-reading helper: [[mri_info]] (`--ncols`, `--nrows`).
