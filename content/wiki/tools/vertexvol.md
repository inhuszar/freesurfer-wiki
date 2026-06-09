---
title: "vertexvol"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/vertexvol"
families: []                     # standalone tcsh wrapper around mris_convert / mris_calc
recon_all_stage: autorecon3
related:
  - "[[mris_convert]]"
  - "[[mris_calc]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - morphometry
  - volume
  - thickness
---

# vertexvol

## Summary

`vertexvol` computes a **per-vertex grey-matter volume** map for one hemisphere
and writes it as a surface overlay (`?h.volume`, one scalar per vertex). It also
(re)computes the mid-surface area overlay `?h.area.mid` as a by-product. By
default it uses the accurate "TH3" method, which sums the volumes of three
tetrahedra spanning the white and pial surfaces around each vertex (algorithm by
Anderson Winkler); this work is delegated to [[mris_convert]] `--volume`. A
legacy, less accurate mode (`--no-th3`) instead multiplies the mid-surface area
by the cortical thickness using [[mris_calc]]. The per-vertex volume is the
surface-based volumetric morphometry measure that complements thickness and area.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vertexvol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol)
- **Binary/script location:** `$FREESURFER_HOME/bin/vertexvol`
- **Key helpers invoked:**
  [`mris_calc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L54) (build `area.mid`; and the `--no-th3` area×thickness path),
  [`mris_convert --volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L81) (the TH3 tetrahedral volume), and
  [`UpdateNeeded`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L52) (skip-if-up-to-date helper).

## Purpose and Context

FreeSurfer's standard surface morphometry measures are **thickness** (distance
between white and pial), **area** (per-vertex surface area), and **curvature**.
Grey-matter **volume** is a fourth measure that, unlike a simple
thickness × area product, accounts for the fact that the white and pial surfaces
have different areas (the cortex flares outward). `vertexvol` produces this
per-vertex volume overlay so it can be smoothed, mapped to fsaverage, and entered
into vertex-wise group analyses ([[wiki/tools/mri_glmfit|mri_glmfit]]) exactly
like thickness.

It is a normal, automatic step of recon-all's autorecon3 surface stream and is
rarely run by hand. It writes its outputs into the subject's `surf/` directory.

> [!gotcha] recon-all hard-codes TH3 and disables the global TH3 flag
> recon-all sets its own `TH3Flag = 0` early on, with the comment
> "*turn off now because TH3 hard-coded in vertexvol*"
> ([`scripts/recon-all:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L180)), and then invokes
> [`vertexvol --s $subjid --$hemi --th3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4807)
> with `--th3` explicit (also noted at
> [`scripts/recon-all:8261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8261)). So in the pipeline the accurate
> tetrahedral method is always used regardless of any older global setting.

## Inputs

### Required Inputs

`vertexvol` operates inside `$SUBJECTS_DIR/<subject>/surf` ([`scripts/vertexvol:46-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L46-L47))
and reads, for the chosen hemisphere:

- `?h.white`, `?h.pial` — the white and pial surfaces (TH3 path,
  [`scripts/vertexvol:76-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L76-L77)).
- `label/?h.cortex.label` — the cortex label (TH3 path,
  [`scripts/vertexvol:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L78)); restricts the measure to cortex.
- `?h.area` and `?h.area.pial` — white and pial per-vertex area overlays, used to
  build `?h.area.mid` ([`scripts/vertexvol:52-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L52-L62)).
- `?h.thickness` — cortical thickness overlay (only the `--no-th3` path,
  [`scripts/vertexvol:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L67)).

The subject ID (`--s`) and a hemisphere (`--lh`/`--rh`) are mandatory
([`scripts/vertexvol:183-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L183-L190)).

### Input Assumptions

> [!assumption] Surfaces and area overlays from a completed recon-all
> The tool assumes a finished surface reconstruction: matching `?h.white`,
> `?h.pial`, `?h.area`, `?h.area.pial`, and `?h.cortex.label` for the hemisphere,
> all in vertex-correspondence (same number of vertices). It does no surface
> placement of its own. If `?h.area.mid` is missing or out of date it is rebuilt;
> otherwise the existing one is reused.

The optional `FS_GII` environment variable appends a suffix (e.g. `.gii`) to every
surface/overlay name so the tool can operate on GIFTI files
([`scripts/vertexvol:15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L15)); by default it is empty.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `?h.volume` (default; `--o` overrides the name) | `$SUBJECTS_DIR/<subject>/surf/` | Per-vertex cortical grey-matter volume, one float per vertex |
| `?h.area.mid` | `$SUBJECTS_DIR/<subject>/surf/` | Per-vertex mid-surface area = (`?h.area` + `?h.area.pial`)/2; built/refreshed as a side effect |

With `FS_GII` set, the names gain that suffix (e.g. `lh.volume.gii`).

### Output Specifications

Both outputs are **surface scalar overlays** in the
[[curv-format|FreeSurfer "curv" format]] (or GIFTI functional data with
`FS_GII`): one floating-point value per vertex, indexed in correspondence with the
hemisphere's surfaces. `?h.volume` is in mm³ per vertex; `?h.area.mid` is in mm²
per vertex. Values outside `?h.cortex.label` are produced by the underlying tool
according to its masking (the cortex label is passed so the measure is meaningful
on cortex).

## Mathematical Foundations

> [!math] TH3 — per-vertex volume from three tetrahedra (default)
> For each cortical vertex, the slab of grey matter between the white and pial
> surfaces around that vertex is partitioned into **three tetrahedra**, and the
> vertex volume is the sum of their (signed) volumes. The volume of a tetrahedron
> with vertices $a,b,c,d$ is
> $$V = \tfrac{1}{6}\,\bigl|\,(b-a)\cdot\bigl[(c-a)\times(d-a)\bigr]\,\bigr|.$$
> Summing three such tetrahedra over the white→pial prism associated with each
> vertex yields a volume that correctly accounts for the differing white and
> pial areas — unlike a flat area × thickness estimate. The algorithm is credited
> to Anderson Winkler ([`scripts/vertexvol:74-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L74-L75)).

> [!internal] The TH3 computation lives in mris_convert
> The script merely calls
> [`mris_convert --volume <subject> <hemi> <out>`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L81);
> the tetrahedral integration is implemented inside [[mris_convert]] (and the
> shared surface library), not in this script.

**Legacy `--no-th3` method.** When TH3 is disabled, the volume is the elementwise
product of the mid-surface area and thickness overlays
([`scripts/vertexvol:66-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L66-L67)):
$$\text{vol}(v) = \text{area.mid}(v)\;\times\;\text{thickness}(v),\qquad
\text{area.mid}(v) = \tfrac{1}{2}\bigl(\text{area}(v)+\text{area.pial}(v)\bigr).$$
The script's own comment flags this as "not accurate"
([`scripts/vertexvol:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L65)).

**`area.mid`** is always computed as the per-vertex mean of the white and pial
areas via two [[mris_calc]] steps (`add` then `div 2`,
[`scripts/vertexvol:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L54-L58)). The comment notes it is not needed for TH3 but is
kept because other programs use it ([`scripts/vertexvol:50-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L50-L51)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/vertexvol:104-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L104-L175)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string (subject) | *(required)* | Subject ID; the tool `cd`s into `<subj>/surf`. |
| `--lh` | bool | *(one required)* | Process the left hemisphere (`hemi=lh`). |
| `--rh` | bool | *(one required)* | Process the right hemisphere (`hemi=rh`). |
| `--o` | string (filename) | `?h.volume` | Output overlay name (written into `surf/`). |
| `--th3` | bool | **on** | Use the accurate tetrahedral (TH3) volume via [[mris_convert]] `--volume`. |
| `--no-th3` | bool | off | Use the legacy area.mid × thickness estimate via [[mris_calc]] instead. |
| `--log` | string (path) | — | Log-file path. (Declared and parsed; the script does little explicit logging beyond stdout.) |
| `--nolog`<br>`--no-log` | bool | — | Set the log file to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string (path) | — | Temp directory (implies `--nocleanup`). No temp files are actually created, so this is inert. |
| `--nocleanup` | bool | off | Do not delete the temp dir (no-op given the above). |
| `--cleanup` | bool | on | Delete the temp dir (no-op given the above). |
| `--debug` | bool | off | `set echo`/`verbose` tcsh tracing. |
| `--help` | bool | — | Print help and exit. Note the help text's `BEGINHELP` body is empty. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--th3` and `--no-th3` are last-wins, not an error
> They simply set the same `TH3Flag` variable (1 vs 0). The last one on the
> command line wins; specifying both does not error. The default is TH3 on
> ([`scripts/vertexvol:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L19)). recon-all always passes `--th3` explicitly.

> [!gotcha] `--no-th3` needs `?h.thickness`; `--th3` does not
> The legacy path reads `?h.thickness`, the TH3 path does not (it reads only the
> two surfaces and the cortex label). Choosing `--no-th3` on a subject without a
> thickness overlay will fail in [[mris_calc]].

`--lh` and `--rh` are not combinable in one run — only the **last** one set takes
effect (each just assigns `hemi`). To do both hemispheres, run the tool twice (as
recon-all does, once per hemi).

## Typical Use Cases

### 1. Compute the per-vertex volume overlay for one hemisphere (TH3)

```bash
vertexvol --s bert --lh --th3
# writes surf/lh.volume (and refreshes surf/lh.area.mid)
```

### 2. Both hemispheres (the recon-all pattern)

```bash
vertexvol --s bert --lh --th3
vertexvol --s bert --rh --th3
```

### 3. Legacy area × thickness estimate to a custom file

```bash
vertexvol --s bert --rh --no-th3 --o rh.volume.legacy
```

Useful only for comparison with the old method; the TH3 output is the
recommended measure.

## Pipeline Context

`vertexvol` runs inside recon-all's **autorecon3** surface stream, in the
"area and vertex vol" step that immediately follows thickness computation, and is
done once per hemisphere:

```tcsh
# scripts/recon-all (autorecon3), per hemi:
set cmd = (vertexvol --s $subjid --$hemi --th3 $xopts) # hard-code th3 now
```
([`scripts/recon-all:4798-4815`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4798-L4815)). It is gated by the same surface
flags as thickness/area and is skipped via `UpdateNeeded` when `?h.volume` is
newer than the white and pial surfaces.

**Predecessor:** surface placement + `?h.thickness`, `?h.area`, `?h.area.pial`
(white/pial surfaces and their area overlays) → **vertexvol** → **Successors:**
[[mris_anatomical_stats]] (which tabulates GrayVol per parcel),
`mris_preproc`/`mri_surf2surf` (resample to fsaverage), and
[[wiki/tools/mri_glmfit|mri_glmfit]] (vertex-wise group analysis of volume).

## Gotchas and Caveats

> [!gotcha] `?h.volume` is a per-vertex overlay, not a single number
> The output is a full surface map of vertex volumes, not a scalar total.
> Whole-cortex or per-parcel grey-matter volume is obtained by summing this
> overlay (e.g. with [[mris_anatomical_stats]] / [[mris_calc]]).

> [!gotcha] Help body is empty
> `vertexvol --help` prints the short usage and then nothing, because the
> `BEGINHELP` section of the script has no text after it
> ([`scripts/vertexvol:228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L228)). The usage lines are the only built-in
> documentation.

> [!gotcha] Stray mris_calc debug files are cleaned up only in --no-th3
> After the legacy path, the script removes `.xdebug_mris_calc` files from `mri/`
> and `surf/` ([`scripts/vertexvol:71-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L71-L72)). The TH3 path does not, so a
> `.xdebug_mris_calc` left by the unconditional `area.mid` step may persist.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** `area.mid` is rebuilt only when older than `?h.area`/
  `?h.area.pial` ([`scripts/vertexvol:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L52)), and the TH3 volume only when
  older than the white/pial surfaces and cortex label
  ([`scripts/vertexvol:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L79)). Re-runs are therefore cheap and idempotent.
- **Required-argument checks.** Aborts if subject or hemisphere is missing, or if
  the subject directory does not exist ([`scripts/vertexvol:183-195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L183-L195)).
- **Fail-fast on helper errors.** Any non-zero status from [[mris_calc]] or
  [[mris_convert]] jumps to `error_exit` and stops the script
  ([`scripts/vertexvol:96-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L96-L100)).

## Related Tools

- [[mris_convert]] — implements the TH3 tetrahedral volume via `--volume`; the heart of the default path.
- [[mris_calc]] — builds `area.mid` and performs the legacy area × thickness estimate.
- [[mris_anatomical_stats]] — consumes/summarises per-vertex grey-matter volume into per-parcel `GrayVol` statistics.
- [[wiki/pipelines/recon-all|recon-all]] — calls `vertexvol --th3` once per hemisphere in autorecon3.

## Confidence and Gaps

**High confidence:** the complete flag set, the TH3-vs-legacy branch, the exact
`area.mid` construction, all input/output filenames, the recon-all invocation and
its hard-coded `--th3`, and the empty help body — all read directly from
[`scripts/vertexvol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol) and
[`scripts/recon-all:4798-4815`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4798-L4815).

> [!gap] Exact masking of non-cortex vertices in the output overlay
> The script passes `?h.cortex.label` to the TH3 path, but whether non-cortex
> vertices in `?h.volume` are set to 0 or left at a computed value is decided
> inside [[mris_convert]] `--volume` and was not separately verified here.

## References

- FreeSurfer source: [`scripts/vertexvol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol) (v8.2.0).
- recon-all invocation: [`scripts/recon-all:4798-4815`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4798-L4815) and the
  hard-coded-TH3 notes at [`scripts/recon-all:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L180),
  [`scripts/recon-all:8261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8261).
- The TH3 tetrahedral grey-matter volume method is attributed in-source to
  Anderson Winkler.
