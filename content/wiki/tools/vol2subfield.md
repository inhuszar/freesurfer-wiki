---
title: "vol2subfield"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/vol2subfield"
families: []                     # standalone subfield-sampling driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_vol2vol]]"
  - "[[mri_concatenate_lta]]"
  - "[[tkregister2]]"
  - "[[reg2subject]]"
  - "[[bbregister]]"
  - "[[mri_coreg]]"
  - "[[vol2segavg]]"
  - "[[extract_seg_waveform]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --sd flag uses `setenv SUBJECTS_DIR = $argv[1]`, which sets SUBJECTS_DIR to the literal '=' rather than the supplied path; --sd appears non-functional. Confirmed from source but not exercised."
tags:
  - subfields
  - hippocampus
  - thalamus
  - brainstem
  - registration
  - sampling
  - segmentation
---

# vol2subfield

## Summary

`vol2subfield` maps an arbitrary input volume into the voxel space of a FreeSurfer "subfield" segmentation — the hippocampal/amygdalar, thalamic-nuclei, or brainstem-substructure label volumes produced by the FreeSurfer subsegmentation modules — and, optionally, computes per-label statistics of the input within that segmentation. It works by chaining a header registration between the subfield volume and the subject's `orig.mgz` with the user-supplied input→`orig` registration, producing a single LTA that takes the input volume directly into subfield space. Despite the name, the "subfield" volume can be *any* volume that shares a RAS space with `orig.mgz` (e.g. `orig/001.mgz`); it need not be a segmentation. It is a thin tcsh front end around [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L89), [[mri_concatenate_lta]], [[mri_vol2vol]], and [[mri_segstats]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vol2subfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield)
- **Binary/script location:** `$FREESURFER_HOME/bin/vol2subfield`
- **Key helpers invoked:** [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L89) (header registration subfield→orig), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L96) (compose and invert the two LTAs), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L107) (resample the input into subfield space), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L114) (per-label statistics), and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L308) (read the subject name out of the input registration).

## Purpose and Context

FreeSurfer's subsegmentation tools (hippocampal subfields, amygdala nuclei, thalamic nuclei, brainstem substructures) each emit a high-resolution label volume that lives in the subject's anatomical (`orig.mgz`) RAS space but typically on a finer voxel grid. A common downstream task is to measure some *other* contrast — a diffusion metric such as FA, a quantitative T1/T2 map, a PET image, or a functional statistic — within those tiny structures. Doing so correctly requires getting the other contrast into voxel-for-voxel alignment with the subfield labels.

`vol2subfield` automates exactly that. Given:

1. the input volume,
2. an LTA registration that maps the input volume to the subject's conformed `orig.mgz` (e.g. from [[bbregister]] or [[mri_coreg]]), and
3. the subfield (target) volume,

it builds the composite input→subfield transform, resamples the input into subfield space, and can then run [[mri_segstats]] to produce a per-label summary table and/or average waveform.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is a manual post-processing utility run after both `recon-all` and the relevant subsegmentation module have finished. Convenience flags (`--lh.hippoamyg`, `--thalamus`, `--brainstem`, etc.) pre-fill the canonical subfield filenames so the user does not have to remember them.

> [!gotcha] The input registration is the load-bearing assumption
> The script propagates the supplied input→`orig` registration verbatim. The
> help text warns in capitals that *if this registration is inaccurate, the
> output will be wrong* ([`scripts/vol2subfield:406-408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L406-L408)).
> Check it first with `tkregisterfv --mov invol --reg reg.lta --surfs`.

## Inputs

### Required Inputs

- **Input volume** (`--i`) — any volume readable by [[mri_vol2vol]] (e.g. `nii`, `nii.gz`, `mgz`). This is the contrast you want sampled into subfield space.
- **Input→orig registration** (`--reg`) — an [[lta-format|LTA]] mapping the input volume to the subject's conformed `orig.mgz`. The subject name is recovered from this file with [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L308), and `$SUBJECTS_DIR/<subject>/mri/orig.mgz` must exist ([`scripts/vol2subfield:308-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L308-L313)).
- **Subfield (target) volume** (`--sf`, or a convenience flag) — the segmentation/volume to sample into. May be an absolute path or a name relative to `$SUBJECTS_DIR/<subject>/mri/` ([`scripts/vol2subfield:322-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L322-L328)). Must share a RAS ("header") space with `orig.mgz`.
- **An output** — at least one of `--o` (resampled volume) or `--outreg` (the composite LTA) ([`scripts/vol2subfield:330-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L330-L333)).

### Input Assumptions

> [!assumption] Subfield volume is header-registered to orig.mgz
> The whole method rests on the subfield volume being in the same RAS/scanner
> space as `orig.mgz` (true for all FreeSurfer subsegmentation outputs, which
> are derived in that space). The subfield→orig step is computed with
> [`tkregister2_cmdl --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L89-L90),
> i.e. purely from the two volumes' headers — no intensity-based registration is
> performed. If the subfield volume does **not** share that space, the result is
> silently wrong.

> [!assumption] `orig.mgz` is present for the subject
> The subject is inferred from `--reg`; the script aborts if
> `$SUBJECTS_DIR/<subject>/mri/orig.mgz` is missing
> ([`scripts/vol2subfield:309-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L309-L313)). A full
> [[wiki/pipelines/recon-all|recon-all]] (and the relevant subsegmentation
> module, to produce the labels) must have been run beforehand.

## Outputs

### Files Created

| File / pattern | Set by | Contents |
|----------------|--------|----------|
| output volume (`--o`) | `--o` | the input volume resampled into subfield voxel space (voxel-for-voxel aligned to `--sf`); suitable for `mri_segstats` or `tkmeditfv -f out -seg sf` |
| composite registration (`--outreg`) | `--outreg` | [[lta-format|LTA]] mapping the input volume directly to the subfield volume |
| segmentation summary (`--stats`) | `--stats` | [[mri_segstats]] `--sum` table: per-label volume and statistics of the input |
| average waveform (`--avgwf`) | `--avgwf` | [[mri_segstats]] `--avgwf` text file: mean of the input per label (per time point if 4D) |
| average-waveform volume (`--avgwfvol`) | `--avgwfvol` | [[mri_segstats]] `--avgwfvol`: the same averages written as a small volume |
| `<output>.log` | always | run log next to the output volume (or output reg) |

If `--outreg` is not given but statistics are requested, an internal LTA is written under the temporary directory and discarded on cleanup; pass `--outreg` to keep it.

### Output Specifications

The output volume inherits the **voxel grid, geometry, and orientation of the subfield volume** (`--targ $subfieldvol` to [[mri_vol2vol]]). Resampling uses nearest-neighbour interpolation by default; `--trilin` or `--cubic` switch the [[mri_vol2vol]] `--interp` mode. The [[mri_segstats]] statistics are computed on this resampled output, with segment `0` excluded (`--exclude 0`, [`scripts/vol2subfield:114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L114)).

## Mathematical Foundations

The script performs no numerical modelling of its own; the only computation is the **composition of two rigid/affine transforms** into the input→subfield mapping, delegated to [[mri_concatenate_lta]].

> [!math] Transform composition
> Let $T_{\text{in}\to\text{orig}}$ be the supplied `--reg` LTA and
> $T_{\text{sf}\to\text{orig}}$ the header registration of the subfield volume
> to `orig.mgz`. The script forms
> $$T_{\text{in}\to\text{sf}} = T_{\text{sf}\to\text{orig}}^{-1} \; \circ \; T_{\text{in}\to\text{orig}},$$
> realised by [`mri_concatenate_lta -invert2 -invertout $sf2conflta $reg $outreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L96).
> Here `-invert2` inverts the second input ($T_{\text{in}\to\text{orig}}$) and
> `-invertout` inverts the composed result, so the saved LTA is the input→subfield
> direction used by [[mri_vol2vol]].

> [!internal] Resampling and statistics math live elsewhere
> The actual interpolation kernels (nearest/trilinear/cubic) are implemented in
> [[mri_vol2vol]], and all per-label statistics (mean, std, volume, average
> waveform) in [[mri_segstats]]. `vol2subfield` only orchestrates them.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/vol2subfield:153-289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L153-L289)).

#### Required / core I/O

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input volume to be sampled into subfield space. |
| `--reg` | string | *(required)* | Input→`orig.mgz` registration ([[lta-format|LTA]]); subject is read from it. |
| `--sf` | string | *(required\*)* | Subfield/target volume: absolute path or name under `$SUBJECTS_DIR/<subject>/mri/`. (\*required unless set via a convenience flag below.) |
| `--o` | string | — | Output volume (input resampled into subfield space). Required unless only `--outreg` is wanted. |
| `--outreg` | string | — | Save the composite input→subfield [[lta-format|LTA]]. |

#### Statistics outputs (each invokes [[mri_segstats]])

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--stats` | string | — | Write [[mri_segstats]] `--sum` summary table to this file. |
| `--avgwf` | string | — | Write [[mri_segstats]] `--avgwf` average-waveform text file. |
| `--avgwfvol` | string | — | Write [[mri_segstats]] `--avgwfvol` average-waveform volume. |
| `--ctab` | string | `$FREESURFER_HOME/FreeSurferColorLUT.txt` | Color lookup table passed to [[mri_segstats]] for label naming. |

#### Subfield convenience flags (set `--sf` to a canonical filename)

| Flag | Sets `--sf` to | Description |
|------|----------------|-------------|
| `--lh.hippoamyg`<br>`--rh.hippoamyg` | `{l,r}h.hippoAmygLabels-T1.v21.mgz` | Hippocampal/amygdalar subfield labels (T1, v21). |
| `--lh.hbt`<br>`--rh.hbt` | `{l,r}h.hippoAmygLabels-T1.v21.HBT.mgz` | Head/Body/Tail (HBT) collapsed hippocampal labels. |
| `--thalamus`<br>`--thalamic` | `ThalamicNuclei.v10.T1.mgz` | Thalamic-nuclei segmentation (T1, v10). |
| `--brainstem` | `brainstemSsLabels.v12.mgz` | Brainstem substructures (v12). |

These resolve relative to `$SUBJECTS_DIR/<subject>/mri/`. See the [gotcha](#configuration-interactions) about how they parse arguments.

#### Interpolation and runtime

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nearest` | bool | **on** | Nearest-neighbour interpolation in [[mri_vol2vol]]. |
| `--trilin` | bool | off | Trilinear interpolation. |
| `--cubic` | bool | off | Cubic interpolation. |
| `--sd` | string | `$SUBJECTS_DIR` | Intended to set `SUBJECTS_DIR`; **see gap — currently non-functional** ([`scripts/vol2subfield:181-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L181-L184)). |
| `--log` | string | `<output>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`/scratch` or output dir) | Use a named temp directory and **do not** clean it up. |
| `--nocleanup` | bool | off | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory when done. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version string and exit. |

### Configuration Interactions

> [!gotcha] `--sd` does not set SUBJECTS_DIR
> The handler runs `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/vol2subfield:181-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L181-L184)). In tcsh,
> `setenv` takes `NAME VALUE` (no `=`), so this sets `SUBJECTS_DIR` to the literal
> string `=` and silently drops the path. To select a subjects directory, export
> `SUBJECTS_DIR` in the environment before calling `vol2subfield` rather than
> relying on `--sd`.

> [!gotcha] Statistics require an output volume
> Any of `--stats`, `--avgwf`, or `--avgwfvol` forces `--o` to be given; the
> script aborts otherwise ([`scripts/vol2subfield:336-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L336-L341)).
> [[mri_segstats]] runs on the resampled output volume, so that file must be
> produced first.

> [!gotcha] Subfield convenience flags consume no argument but still demand one
> Each convenience flag (`--thalamus`, `--lh.hbt`, …) sets `subfieldvol` to a
> fixed filename, but its handler begins with `if($#argv < 1) goto arg1err`
> *without* shifting an argument
> ([`scripts/vol2subfield:209-213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L209-L213)). In practice this only
> means the flag must not be the very last token on the command line; place
> another flag (or its values) after it. The fixed filename it sets does **not**
> consume the following token.

- `--nearest`/`--trilin`/`--cubic` are mutually exclusive; the last one on the
  command line wins (each simply overwrites `interp`).
- `--outreg` alone (no `--o`) produces only the composite LTA and skips
  resampling — the [`finished`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L105) shortcut is taken when `--o`
  is absent.
- `--tmp`/`--tmpdir` implies `--nocleanup` (sets `cleanup = 0`).

## Typical Use Cases

### 1. Just build the input→subfield registration

```bash
# Save the composite LTA only; no resampling.
vol2subfield --i fa.nii.gz --reg reg.lta \
  --sf rh.hippoAmygLabels-T1.v21.HBT.mgz --outreg fa2hbt.lta
```

`fa2hbt.lta` maps `fa.nii.gz` into the HBT label volume. Useful when you want to
apply the transform later or inspect it.

### 2. Sample a diffusion metric into hippocampal subfield space

```bash
# Resample FA into the right hippocampal/amygdala label grid.
vol2subfield --i fa.nii.gz --reg reg.lta --rh.hippoamyg \
  --o fa.rh.hippoamyg.mgz
```

The output is voxel-for-voxel aligned with `rh.hippoAmygLabels-T1.v21.mgz` and
ready for `mri_segstats` or visual QC (`tkmeditfv -f fa.rh.hippoamyg.mgz -seg
rh.hippoAmygLabels-T1.v21.mgz`).

### 3. Per-label statistics of a contrast over thalamic nuclei

```bash
vol2subfield --i qT1.nii.gz --reg reg.lta --thalamus \
  --o qT1.thalamus.mgz \
  --stats qT1.thalamus.stats --avgwf qT1.thalamus.avgwf.dat
```

Produces the resampled volume plus a per-nucleus summary table and average
waveform via [[mri_segstats]].

## Pipeline Context

`vol2subfield` is a stand-alone post-processing utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or [[trac-all]] (it appears only in
`scripts/CMakeLists.txt`).

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] → a subsegmentation
module (hippocampal/amygdala, thalamic, or brainstem) producing the label volume,
plus an input→`orig` registration from [[bbregister]] or [[mri_coreg]] →
**vol2subfield** → **Successors:** [[mri_segstats]]-based analysis, or visual QC.

It is the close cousin of [[vol2segavg]] and [[extract_seg_waveform]], which also
resample an input into a segmentation's space before averaging — those use a
bounding-box optimisation and target whole-brain segmentations, whereas
`vol2subfield` targets header-registered subfield volumes and can emit the
composite registration.

## Gotchas and Caveats

> [!gotcha] "Subfield" is a misnomer — any header-matched volume works
> `--sf` accepts any volume sharing RAS space with `orig.mgz`, e.g.
> `orig/001.mgz`. The script does not check that the target is a segmentation;
> the convenience flags are just shortcuts for the canonical subfield filenames
> ([`scripts/vol2subfield:191-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L191-L218)).

> [!gotcha] Nearest-neighbour is the default even for continuous data
> The default interpolation is `nearest` ([`scripts/vol2subfield:18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L18)),
> which preserves label values but can alias a smooth metric map. For continuous
> contrasts (FA, qT1, PET) consider `--trilin` or `--cubic` for the resampled
> volume — though note that subsequent per-label averaging in [[mri_segstats]]
> is fairly robust to this choice.

> [!gotcha] Filename versions are hard-coded
> The convenience flags embed specific version strings (`v21`, `HBT`, `v10`,
> `v12`). If your FreeSurfer subsegmentation produced a different version suffix,
> the shortcut will not find the file — pass the actual filename via `--sf`.

## Error Compensation and Guard Rails

- **Existence checks.** The input volume, the registration, and (after relative-path
  resolution) the subfield volume are all checked for existence; missing files
  abort with an explicit message ([`scripts/vol2subfield:315-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L315-L328)).
- **Relative subfield resolution.** If `--sf` is not found as given, the script
  retries under `$SUBJECTS_DIR/<subject>/mri/` before failing
  ([`scripts/vol2subfield:322-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L322-L328)).
- **Fail-fast on sub-tool error.** Every internal command checks `$status` and
  jumps to `error_exit` on non-zero, so a failed registration or resample stops
  the run rather than producing a partial result.
- **No automatic registration QC.** The script does *not* verify the accuracy of
  the supplied `--reg`; it only prints a `tkregisterfv` command line you can run
  to check it manually.

## Related Tools

- [[mri_segstats]] — computes the per-label statistics (`--sum`/`--avgwf`/`--avgwfvol`) on the resampled output.
- [[mri_vol2vol]] — performs the actual resampling of the input into subfield space.
- [[mri_concatenate_lta]] — composes and inverts the two LTAs into the input→subfield transform.
- [[tkregister2]] — `tkregister2_cmdl` computes the header registration of the subfield volume to `orig.mgz`.
- [[reg2subject]] — recovers the subject name from the `--reg` LTA.
- [[bbregister]], [[mri_coreg]] — typical sources of the required input→`orig` registration.
- [[vol2segavg]], [[extract_seg_waveform]] — sibling "sample-then-average" utilities for whole-brain segmentations and 4D time-courses.

## Confidence and Gaps

**High confidence:** complete flag set, the transform-composition logic, the
three output modes (registration / resampled volume / statistics), the
subfield-filename shortcuts, default interpolation, and all guard-rail checks —
read directly from [`scripts/vol2subfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield).

> [!gap] `--sd` is effectively broken
> `setenv SUBJECTS_DIR = $argv[1]` ([`scripts/vol2subfield:181-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L181-L184))
> sets `SUBJECTS_DIR` to `=`, not the supplied path. This is a source bug; set
> `SUBJECTS_DIR` in the environment instead. Behaviour read from source, not
> exercised at runtime.

## References

- FreeSurfer source: [`scripts/vol2subfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield) (v8.2.0).
- Built-in help: `vol2subfield --help` (the `BEGINHELP` block, [`scripts/vol2subfield:395-449`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2subfield#L395-L449)).
- Hippocampal subfields & amygdala nuclei: <https://surfer.nmr.mgh.harvard.edu/fswiki/HippocampalSubfieldsAndNucleiOfAmygdala>
- Thalamic nuclei: <http://freesurfer.net/fswiki/ThalamicNuclei>
- Brainstem substructures: <https://surfer.nmr.mgh.harvard.edu/fswiki/BrainstemSubstructures>
