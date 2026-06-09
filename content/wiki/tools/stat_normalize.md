---
title: "stat_normalize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "stat_normalize/stat_normalize.cpp"
families: []
recon_all_stage: null
related:
  - "[[talairach]]"
  - "[[tkregister2]]"
  - "[[mri_make_register]]"
  - "[[fsaverage]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "This is a legacy FS-FAST event-related statistics tool operating on selavg/selxavg bshort/bfloat volumes; the surrounding FS-FAST workflow that produces and consumes its inputs/outputs was not exercised."
  - "The -E (ellipsoid) coordinate mode is present in the parser but the ELLIPSOID_COORDS branch falls through to the spherical-coordinate code path; behaviour is inferred, not run."
tags:
  - fsfast
  - statistics
  - talairach
  - group-analysis
  - legacy
---

# stat_normalize

## Summary

`stat_normalize` is a legacy FS-FAST tool that **averages a set of functional
statistics volumes into a common anatomical space**. Given one or more
selective-averaging "stat volume" prefixes (the `register.dat` + per-slice
`bshort`/`bfloat` format produced by FS-FAST event-related analysis), it
resamples each subject's per-event means and standard deviations into a single
structural volume — by default a 256 mm field-of-view Talairach grid at 8 mm
resolution — accumulates them, and writes the group-average stat volume. It can
average in Talairach (volume) space or, with `-S`, in spherical surface
coordinates using each subject's registered surface.

## Source Information

- **Language:** C++ (C-style; legacy)
- **Source file:** [`stat_normalize/stat_normalize.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/stat_normalize`
- **Core library:** the FreeSurfer **stats** module ([`utils/stats.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp)) — `StatReadVolume2`, `StatAllocStructuralVolume`, `StatAccumulateTalairachVolume`, `StatAccumulateSurfaceVolume`, `StatWriteVolume`

## Purpose and Context

In the FS-FAST event-related FMRI workflow, each subject's first-level analysis
(`selxavg`/`selavg`) produces per-event hemodynamic estimates (means and
standard deviations) on that subject's own functional grid, accompanied by a
`register.dat` that maps the functional volume to the subject's anatomy. To make
a group statistic you must bring every subject into a common space.
`stat_normalize` does exactly that resampling-and-accumulation step: it reads
each subject's stat volume, transforms it into a shared structural grid (Talairach
by default), and sums it into a running average.

It is a **standalone FS-FAST utility**, not part of
[[wiki/pipelines/recon-all|recon-all]]; it operates on FS-FAST analysis outputs
rather than on `recon-all` anatomical files. It predates modern surface-based
group analysis tools and the `bfloat`/`register.dat` ecosystem it uses is itself
legacy.

> [!gotcha] Operates on FS-FAST "stat volume" prefixes, not on .mgz files
> The positional arguments are *prefixes*, each naming a set of FS-FAST files
> (`register.dat`, `<prefix>.dat`, `<prefix>_NNN.hdr/.bfloat/.dof`), not a single
> image file. Point it at the analysis output stem, not at a `.mgz`.

## Inputs

### Required Inputs

- **One or more input stat-volume prefixes** (`<input sv prefix> …`). Each is read
  by `StatReadVolume2` ([`stat_normalize/stat_normalize.cpp:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L104)), which loads the
  prefix's `register.dat`, the `<prefix>.dat` header (TR, time window, prestim,
  number of events, time-per-event), and the per-slice data.
- **Output prefix** — the last positional argument
  ([`stat_normalize/stat_normalize.cpp:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L95)).
- **`$SUBJECTS_DIR`** must be set in the environment; the tool exits if it is not
  ([`stat_normalize/stat_normalize.cpp:76-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L76-L80)). The registration's subject name
  (`sv->reg->name`) is looked up under `$SUBJECTS_DIR` for the Talairach transform
  and, in surface mode, for the surfaces.

### Input Assumptions

> [!assumption] FS-FAST selavg/selxavg stat volumes with a valid register.dat
> Each input must be a complete FS-FAST stat volume: a `register.dat` linking it
> to a subject under `$SUBJECTS_DIR`, plus the `.dat` parameter file and per-slice
> `bshort`/`bfloat` arrays. All inputs must share the same **number of events**;
> mismatched event counts cause `StatAccumulate…` to error
> ([`utils/stats.cpp:1211-1217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp#L1211-L1217)).

- In **Talairach mode** (default), each subject's `talairach.xfm` (or the file
  named by `-x`) must exist under `$SUBJECTS_DIR/<subj>/mri/transforms/`.
- In **spherical/ellipsoid mode** (`-S`/`-E`), the subject's
  `$SUBJECTS_DIR/<subj>/surf/<hemi>.orig` surface and the named canonical surface
  must be readable ([`stat_normalize/stat_normalize.cpp:118-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L118-L133)).

## Outputs

### Files Created

The group-average stat volume is written by `StatWriteVolume`
([`stat_normalize/stat_normalize.cpp:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L154)) under the output prefix, in the
FS-FAST bshort/bfloat layout ([`utils/stats.cpp:1342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp#L1342)):

| File | Contents |
|------|----------|
| `<outdir>/register.dat` | registration of the output structural volume |
| `<outprefix>.dat` | header: TR, time window, prestim, nbins (events), per-event |
| `<outprefix>_NNN.hdr` | per-slice ASCII dimensions header (`width height nframes 0`) |
| `<outprefix>_NNN.bfloat` | per-slice averaged means and standard deviations |
| `<outprefix>_NNN.dof` | per-slice degrees-of-freedom (for raw stat volumes) |

When run with diagnostic write+verbose flags, it also writes per-event
`avgN.mgh`/`stdN.mgh` debug volumes ([`stat_normalize/stat_normalize.cpp:144-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L144-L151)).

### Output Specifications

The output structural volume is allocated by `StatAllocStructuralVolume` with the
chosen field of view and resolution and the coordinate-system name
([`stat_normalize/stat_normalize.cpp:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L110)). With defaults this is a
256 mm FOV at 8 mm resolution (a coarse ~32³ grid) carrying one mean and one
standard-deviation frame per event. See [[coordinate-systems]] for the Talairach
frame.

## Mathematical Foundations

The core operation is a **voxel-to-voxel resampling** of each subject's stat
volume into the shared structural grid, followed by accumulation. For Talairach
mode, `StatAccumulateTalairachVolume` builds the chain of transforms
([`utils/stats.cpp:1219-1228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp#L1219-L1228)):

- $T_{\text{func}}$ — functional CRS→XYZ (tkreg) from the subject's stat volume,
- $T_{\text{tal}}$ — structural CRS→XYZ of the target Talairach volume,
- $M_{\text{cor2tal}}$ — the subject's `talairach.xfm` (optionally devolved for a
  non-zero volume centre when `-i` is given),

so that each target Talairach voxel is mapped back through Talairach→structural→
functional space to sample the subject's means/stds, which are added into the
running sums. The float→int voxel rounding rule is selectable (`-c`).

> [!math] Accumulated average
> Each subject contributes its per-event mean and standard-deviation volumes,
> resampled into the target grid, to per-event running sums; the final
> `mri_avgs[event]` / `mri_stds[event]` are the across-subject averages. Event
> counts must match across subjects or accumulation aborts.

> [!internal] The transform algebra and resampling live in the stats module
> The transform construction, optional `DevolveXFM` of the Talairach transform,
> the float→int rounding, and the surface-based accumulation are all in
> [`utils/stats.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp)
> (`StatAccumulateTalairachVolume`, `StatAccumulateSurfaceVolume`,
> `StatAllocStructuralVolume`). `stat_normalize.cpp` is just the driver.

## Configuration Options

### Complete Flag Reference

Options are parsed one letter at a time via `toupper(*option)`
([`stat_normalize/stat_normalize.cpp:166-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L166-L226)); the match is therefore
**case-insensitive** for the lettered flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-r <resolution>` | float | `8.0` mm | Output voxel resolution of the structural averaging grid. |
| `-f <fov>` | float | `256.0` mm | Output field of view. **See contradiction below — this flag is unreachable in v8.2.0.** |
| `-S <hemi> <surface>` | strings | off (Talairach) | Average in **spherical** surface coordinates: read `<hemi>.orig` and the named canonical `<surface>` per subject and accumulate on the surface. |
| `-E <hemi> <surface>` | strings | off | Select **ellipsoid** coordinates (parser sets `ELLIPSOID_COORDS`); the accumulation branch falls through to the spherical code path. |
| `-x <xfmfile>` | string | `talairach.xfm` | Use `subjid/mri/transforms/<xfmfile>` as the Talairach transform instead of the default `talairach.xfm` (sets the global `stats_talxfm`). |
| `-i` | boolean | off | "Fix"/devolve the Talairach transform to account for a non-zero centre of the orig volume (sets `stats_fixxfm`). |
| `-c <float2int>` | string | `round` | Float→int voxel-index rounding rule for resampling (e.g. `tkregister`, `round`); parsed by `float2int_code` and rejected if unknown. |
| `-u`, `-?` | boolean | — | Print usage and exit. |
| `--help` | boolean | — | Print help and exit. |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

> [!contradiction] The `-f` (field-of-view) flag is advertised but cannot be reached
> The option dispatcher switches on `toupper(*option)`, but the field-of-view case
> is written as lowercase `case 'f':` ([`stat_normalize/stat_normalize.cpp:215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L215)).
> Because `toupper` always yields `'F'`, the `'f'` label never matches and `-f`
> falls through to the `default` branch, which prints `unknown option -f` and
> exits. This was confirmed empirically: `stat_normalize -f 200 …` →
> `unknown option -f`. The usage text and `-f` documentation are therefore
> **misleading**; in v8.2.0 the field of view is effectively fixed at the 256 mm
> default. (`-r` works because its label is uppercase `'R'`.)

> [!gotcha] `-S` and `-E` change the entire averaging space
> Without `-S`/`-E` the tool averages in Talairach volume space and never reads
> any surface. With `-S` (spherical) or `-E` (ellipsoid) it instead reads
> per-subject surfaces and accumulates on the surface; the Talairach branch is
> skipped. The last of `-S`/`-E`/(default) specified wins, since each just sets
> `coordinate_system`.

> [!gotcha] `-x` and `-i` both act on the Talairach transform
> `-x` chooses which transform file to load; `-i` devolves it for a non-zero orig
> centre. They are independent and combine: `-x mytal.xfm -i` loads `mytal.xfm`
> and devolves it. Neither has any effect in surface (`-S`/`-E`) mode.

## Typical Use Cases

### Use Case 1: Talairach group average at default resolution

```bash
setenv SUBJECTS_DIR /path/to/subjects
# Average three subjects' selxavg stat volumes into one Talairach group volume
stat_normalize subj1/bold/analysis/h subj2/bold/analysis/h \
               subj3/bold/analysis/h group/analysis/h
```

### Use Case 2: Finer output resolution

```bash
# 4 mm Talairach grid instead of the 8 mm default
stat_normalize -r 4 subj1/.../h subj2/.../h group/h
```

### Use Case 3: Surface-based (spherical) averaging

```bash
# Accumulate on the left-hemisphere registered sphere
stat_normalize -S lh sphere.reg subj1/.../h subj2/.../h group_lh/h
```

### Use Case 4: Custom Talairach transform, devolved

```bash
stat_normalize -x talairach.manual.xfm -i \
  subj1/.../h subj2/.../h group/h
```

## Pipeline Context

`stat_normalize` is **not** called by [[wiki/pipelines/recon-all|recon-all]] and
does not appear in the v8.2.0 `recon-all`, `trac-all`, or other shipped pipeline
scripts (verified by grep). It belongs to the FS-FAST functional pipeline: it
runs after first-level selective averaging produces each subject's stat volumes
and before group statistical testing.

**Predecessor:** FS-FAST `selxavg`/`selavg` first-level analysis (per subject) +
[[talairach]] registration → **stat_normalize** (resample + average) →
**Successor:** group-level statistics on the averaged stat volume.

## Gotchas and Caveats

> [!gotcha] Coarse default grid
> The default 256 mm FOV at 8 mm resolution is a very coarse (~32³) grid, suitable
> for the low-resolution functional statistics of the era. Use `-r` for a finer
> output (but note `-f` cannot currently change the FOV — see the contradiction
> above).

> [!gotcha] Legacy bshort/bfloat I/O
> Inputs and outputs are the FS-FAST per-slice `bshort`/`bfloat` + `register.dat`
> format, not `.mgz`/NIfTI. Modern FreeSurfer volumes must be in this layout to be
> consumed, and the output must be read with FS-FAST-aware tooling.

> [!gotcha] All inputs must have the same event count
> Mixing stat volumes from analyses with different numbers of events aborts during
> accumulation ([`utils/stats.cpp:1211-1217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp#L1211-L1217)).

## Error Compensation and Guard Rails

- **Environment check:** exits with a clear error if `$SUBJECTS_DIR` is unset
  ([`stat_normalize/stat_normalize.cpp:76-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L76-L80)).
- **Unknown rounding rule:** an unrecognised `-c` float2int code is rejected with
  an explicit error rather than silently defaulting
  ([`stat_normalize/stat_normalize.cpp:206-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L206-L214)).
- **Read failures:** missing stat files, surfaces, or canonical coordinates all
  abort with `ErrorExit` rather than producing a partial average.
- **No conforming/rescaling** is performed on intensities; the tool only resamples
  geometry and accumulates.

## Known Bugs

- [[00156]] — the advertised `-f` (field-of-view) option is unreachable: the switch is keyed on `toupper(*option)` but the arm is `case 'f'`, so `-f` always prints "unknown option" and exits.

## Related Tools

- [[talairach]] — produces the `talairach.xfm` that Talairach-mode averaging
  depends on.
- [[tkregister2]] / [[mri_make_register]] — create and edit the `register.dat`
  that links each functional stat volume to its anatomy.
- [[fsaverage]] — the modern common surface space; surface-based group analysis
  today is usually done there rather than via this tool.
- [[coordinate-systems]] — background on the Talairach and tkreg frames used in
  the resampling.

## Confidence and Gaps

**Medium confidence.** The complete flag set, the case-insensitive parsing, the
`-f` unreachability (confirmed empirically), the input/output file layout, and the
Talairach transform chain were all read directly from the source and the stats
library, and the usage text was captured from the installed binary. Confidence is
not "high" only because the surrounding FS-FAST workflow that generates and
consumes these stat volumes was not run end-to-end.

> [!gap] FS-FAST workflow not exercised
> The selxavg/selavg first-level analysis that produces the inputs and the
> group-statistics step that consumes the output were not run; the bshort/bfloat
> column semantics are described from `utils/stats.cpp` rather than from real
> files.

> [!gap] Ellipsoid mode
> `-E` sets `ELLIPSOID_COORDS`, but the accumulation `switch` groups it with
> `SPHERICAL_COORDS` and runs the spherical path
> ([`stat_normalize/stat_normalize.cpp:116-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp#L116-L117)). Whether a genuinely distinct
> ellipsoid behaviour was ever implemented is unclear from this file.

## References

- FreeSurfer source: [`stat_normalize/stat_normalize.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/stat_normalize/stat_normalize.cpp) and the stats library [`utils/stats.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/stats.cpp) (v8.2.0).
- FS-FAST documentation (FreeSurfer wiki) for the selxavg/selavg event-related
  workflow that produces and consumes these stat volumes.
