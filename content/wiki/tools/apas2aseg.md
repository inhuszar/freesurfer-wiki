---
title: "apas2aseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/apas2aseg"
families: []                     # standalone tcsh wrapper around mri_binarize
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_aparc2aseg]]"
  - "[[mri_surf2volseg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - aseg
  - aparc
  - cortex
---

# apas2aseg

## Summary

`apas2aseg` collapses an `aparc+aseg.mgz` ("apas" = **ap**arc+a**seg**) back into
a plain `aseg`-style segmentation. It is a thin tcsh wrapper around
[[mri_binarize]]: every left-hemisphere cortical parcellation label
(`1000`–`1035`) is replaced with the generic left-cortex label `3`, and every
right-hemisphere cortical label (`2000`–`2035`) with the generic right-cortex
label `42`. All non-cortical labels are left untouched. The point of the
exercise is that the cortical voxels in the result are defined by the surface
(because `aparc+aseg` cortex is filled from the white/pial surfaces), so the
output's cortex agrees with the surface — which is **not** true of the
`aseg.mgz` produced earlier in the stream. The default output is
`apas-aseg.mgz`. It runs in a few seconds.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/apas2aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/apas2aseg`
- **Key helper invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L66) — the only FreeSurfer program it calls; the entire substantive operation is one `mri_binarize` invocation built up with repeated `--replaceonly` pairs.

## Purpose and Context

FreeSurfer produces two whole-brain segmentations that differ in how cortex is
defined:

- `aseg.mgz` — the subcortical segmentation; its cortex label is voxel-based and
  derived before the surfaces are placed, so its grey-matter boundary does not
  follow the final white/pial surfaces.
- `aparc+aseg.mgz` — built by [[mri_aparc2aseg]] (via [[mri_surf2volseg]]); its
  cortical ribbon is filled *from the surfaces* and split into ~35 gyral labels
  per hemisphere using the Desikan-Killiany annotation.

Some analyses want an `aseg`-like volume (cortex as a single label, not 70
parcels) but with the **surface-consistent** cortex boundary of the
`aparc+aseg`. `apas2aseg` produces exactly that: it merges the 1000-series and
2000-series cortical parcels back into the single labels `3` (Left-Cerebral-Cortex)
and `42` (Right-Cerebral-Cortex), keeping everything else as-is.

> [!gotcha] The recon-all `-apas2aseg` flag does NOT call this script
> recon-all has a stage whose flag is `-apas2aseg`, but its source explicitly
> notes "*Not really apas2aseg, but keeping the flag*"
> ([`scripts/recon-all:5023-5025`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5023-L5025)). That stage instead runs
> [`mri_surf2volseg --fix-presurf-with-ribbon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5030-L5031)
> to rebuild `aseg.mgz` from `aseg.presurf.hypos.mgz` and the surfaces. The
> `apas2aseg` *script* documented here is a separate, standalone utility that is
> **not** invoked anywhere in recon-all; do not conflate the two.

## Inputs

### Required Inputs

- **An `aparc+aseg`-style segmentation** — supplied either implicitly via
  `--s <subject>` (which sets the input to
  `$SUBJECTS_DIR/<subject>/mri/aparc+aseg.mgz`,
  [`scripts/apas2aseg:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L121)) or explicitly via `--i <vol>`. Any
  format [[mri_binarize]] can read (`[[mgz]]`, `nii.gz`, …) is accepted; the
  cortical labels must follow the standard FreeSurfer 1000/2000-series scheme.

### Input Assumptions

> [!assumption] Cortex must use the FreeSurfer 1000/2000 label convention
> The script blindly remaps the fixed integer ranges 1000–1035 → 3 and
> 2000–2035 → 42 (loop at [`scripts/apas2aseg:67-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L67-L73)). It assumes the
> input is a Desikan-Killiany-style `aparc+aseg` whose left/right cortical parcels
> occupy exactly those ranges. An input using the Destrieux atlas
> (`aparc.a2009s+aseg`, labels 11100–11175 / 12100–12175) or the DKT atlas in a
> non-standard range will **not** be fully collapsed — those parcels are outside
> the hard-coded window and pass through unchanged. The non-DK ranges are not
> handled.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `apas-aseg.mgz` (default with `--s`) | `$SUBJECTS_DIR/<subject>/mri/` | The collapsed segmentation: cortex as labels 3/42, everything else copied from the input |
| `<outseg>` (with `--o`) | user-specified path | Same, written to an arbitrary location/name |
| `<logfile>` | only if `--log` given (default is `/dev/null`) | Command echo and environment dump |

### Output Specifications

The output is a label/segmentation volume with the **same geometry, voxel size,
data type, and orientation as the input** — [[mri_binarize]] with `--replaceonly`
does a pure value substitution and never resamples. Voxels whose input label was
in 1000–1035 become `3`; voxels in 2000–2035 become `42`; all other voxels keep
their original label value (including subcortical structures, white matter, CSF,
and any cortical parcel outside the two hard-coded ranges).

## Mathematical Foundations

None — this is a deterministic label-substitution. The script constructs a single
[[mri_binarize]] command line with 72 `--replaceonly old new` pairs (36 left, 36
right) and runs it ([`scripts/apas2aseg:66-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L66-L77)):

$$
\text{out}(v) =
\begin{cases}
3  & \text{if } 1000 \le \text{in}(v) \le 1035 \\
42 & \text{if } 2000 \le \text{in}(v) \le 2035 \\
\text{in}(v) & \text{otherwise}
\end{cases}
$$

> [!internal] The substitution is done by mri_binarize
> `--replaceonly A B` tells [[mri_binarize]] to copy the input through unchanged
> except that voxels equal to `A` are set to `B` (as opposed to `--replace`,
> which also zeroes everything not matched). All numerical work lives there; the
> script only assembles the argument list.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/apas2aseg:106-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L106-L176)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string (subject) | — | Subject ID. Sets input to `<subj>/mri/aparc+aseg.mgz` and output to `<subj>/mri/apas-aseg.mgz`. Errors if the subject directory is absent ([`scripts/apas2aseg:114-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L114-L123)). |
| `--i` | string (path) | — | Explicit input segmentation (overrides/instead of the `--s` default). Must exist. |
| `--o` | string (path) | — | Explicit output path (overrides/instead of the `--s` default). |
| `--log` | string (path) | `/dev/null` | Write a log file to this path. |
| `--nolog`<br>`--no-log` | bool | (log off) | Force logging off (`LF=/dev/null`). |
| `--tmp`<br>`--tmpdir` | string (path) | — | Set a temp directory (and implies `--nocleanup`). Note: the script does not actually create or use a temp dir, so this is effectively inert here. |
| `--nocleanup` | bool | off | Do not delete the temp dir (no-op given the above). |
| `--cleanup` | bool | on | Delete the temp dir (no-op given the above). |
| `--debug` | bool | off | `set echo`/`verbose` tcsh tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--s` versus `--i`/`--o`
> The two ways of specifying I/O are not mutually exclusive but interact by
> order. `--s` sets *both* `apas` (input) and `outseg` (output) to subject-dir
> defaults; a later `--i` or `--o` overrides only the one it names. So
> `--s bert --o /tmp/foo.mgz` reads `bert/mri/aparc+aseg.mgz` and writes
> `/tmp/foo.mgz`. With `--i`/`--o` alone (no `--s`), you must supply both —
> `check_params` requires a non-empty input and output
> ([`scripts/apas2aseg:182-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L182-L191)).

The `--tmp`/`--nocleanup`/`--cleanup` flags are vestigial boilerplate copied from
the standard FreeSurfer script template; this tool creates no temporary files, so
they have no observable effect.

## Typical Use Cases

### 1. Collapse a subject's aparc+aseg to a surface-consistent aseg

```bash
# Reads bert/mri/aparc+aseg.mgz, writes bert/mri/apas-aseg.mgz
apas2aseg --s bert
```

### 2. Collapse an arbitrary aparc+aseg to a named output

```bash
apas2aseg --i /data/sub01/aparc+aseg.mgz --o /data/sub01/apas-aseg.mgz
```

Use this when the segmentation is not in a standard `$SUBJECTS_DIR` layout, or to
produce a one-cortex-label mask that respects the surface boundary (e.g. as input
to a downstream ROI or partial-volume step).

## Pipeline Context

`apas2aseg` is a **standalone post-processing utility**, run by hand after
recon-all has produced `aparc+aseg.mgz`. Despite the identically named recon-all
flag, recon-all does **not** call this script (see the gotcha above).

**Predecessor:** [[mri_aparc2aseg]] / [[mri_surf2volseg]] (produce
`aparc+aseg.mgz`) → **apas2aseg** → **Successor:** any tool that wants an
`aseg`-style volume with surface-defined cortex (ROI extraction, masking,
[[mri_segstats]]).

## Gotchas and Caveats

> [!gotcha] Only Desikan-Killiany cortical ranges are collapsed
> The 1000/2000 windows match the default DK `aparc`. Destrieux
> (`aparc.a2009s`, 11100+/12100+) and any other parcel outside 1000–1035 /
> 2000–2035 are passed through verbatim, so running this on a Destrieux
> `aparc.a2009s+aseg` will *not* give you a clean two-label cortex. The argument
> parser does not detect or warn about this.

> [!gotcha] Output cortex differs from aseg.mgz's cortex
> This is the entire point, but it can surprise: voxel counts of
> Left-/Right-Cerebral-Cortex in `apas-aseg.mgz` will not match those in
> `aseg.mgz`, because the former follows the white/pial surfaces and the latter
> does not.

## Error Compensation and Guard Rails

- **Existence checks.** `--s` verifies the subject directory
  ([`scripts/apas2aseg:117-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L117-L120)) and `--i` verifies the input file
  ([`scripts/apas2aseg:133-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L133-L136)) before running.
- **Required-argument checks.** `check_params` aborts if either the input or the
  output is unset ([`scripts/apas2aseg:182-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L182-L191)).
- **No silent data modification beyond the documented remap.** Because it uses
  `--replaceonly` (not `--replace`), nothing outside the two label ranges is
  altered; the tool does not conform, rescale, or reorient.

## Related Tools

- [[mri_binarize]] — the program that does all the work via `--replaceonly`; understand its replace semantics to understand this script.
- [[mri_aparc2aseg]] — produces the `aparc+aseg.mgz` that is this tool's input.
- [[mri_surf2volseg]] — the modern engine behind `aparc+aseg`/`aseg` filling; the recon-all `-apas2aseg` stage uses it directly.
- [[wiki/pipelines/recon-all|recon-all]] — defines the (confusingly named) `-apas2aseg` stage that does *not* call this script.

## Confidence and Gaps

**High confidence:** the complete flag set, the exact label remap (1000–1035→3,
2000–2035→42), the single-`mri_binarize` mechanism, the default I/O paths, and
the fact that recon-all's `-apas2aseg` flag is a misnomer — all read directly
from [`scripts/apas2aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg) and confirmed against
[`scripts/recon-all:5023-5054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5023-L5054).

## References

- FreeSurfer source: [`scripts/apas2aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg) (v8.2.0).
- Built-in help: `apas2aseg --help` (the `BEGINHELP` block,
  [`scripts/apas2aseg:222-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/apas2aseg#L222-L237)).
- FreeSurfer color LUT: `$FREESURFER_HOME/FreeSurferColorLUT.txt` defines labels
  3 (Left-Cerebral-Cortex) and 42 (Right-Cerebral-Cortex).
