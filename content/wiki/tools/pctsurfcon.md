---
title: "pctsurfcon"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/pctsurfcon"
families: []                     # standalone surface-measure script
recon_all_stage: autorecon3
related:
  - "[[mri_vol2surf]]"
  - "[[mri_concat]]"
  - "[[mri_segstats]]"
  - "[[reg2subject]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mris_anatomical_stats]]"
  - "[[curv-format]]"
  - "[[stats-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - contrast
  - qa
  - recon-all
  - autorecon3
---

# pctsurfcon

## Summary

`pctsurfcon` computes the vertex-by-vertex **percent white/grey contrast** surface
measure for a FreeSurfer subject. For each hemisphere it samples the anatomical
volume (default `rawavg.mgz`) at a point just **inside** the white surface (white
matter, default 1 mm below) and at a point a fraction of the way **into** the
cortical ribbon (grey matter, default 30 % of thickness), then forms the
normalised percent difference $100\,(W-G)/(0.5\,(W+G))$ at every vertex. The
result is written as an overlay `?h.w-g.pct.mgh` in the subject's `surf/`
directory, and per-parcel summary statistics (including SNR) go to
`?h.w-g.pct.stats`. It is a standard step of [[wiki/pipelines/recon-all|recon-all]]
`autorecon3` and is widely used as a grey/white boundary contrast and image-quality
measure.

## Source Information

- **Language:** tcsh shell script
- **Original author:** Doug Greve
- **Source file:** [`scripts/pctsurfcon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon)
- **Binary/script location:** `$FREESURFER_HOME/bin/pctsurfcon`
- **Helpers invoked:**
  [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L101) (sample the volume onto the surface, twice per hemisphere),
  [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L128) (`--paired-diff-norm` to form the percent contrast),
  [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L136) (per-parcel stats), and
  [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L190) (only when `--reg` is given, to recover the subject from a registration file).

## Purpose and Context

The sharpness of the boundary between cortical grey matter and the underlying
white matter is informative both as an **image-quality / QA** metric and as a
**biological** measure (grey/white contrast declines with age and in some
pathologies, and reflects intracortical myelination). `pctsurfcon` quantifies
this boundary by projecting the anatomical intensity to either side of the white
surface and expressing their difference as a percentage of their mean. Because the
measure is computed per vertex, it can be smoothed, mapped to `fsaverage`, and
entered into surface-based group analyses just like thickness or curvature.

In the standard stream it is run by [[wiki/pipelines/recon-all|recon-all]] during
`autorecon3`, once per hemisphere, immediately after the cortical-parcellation
stats stages and before hypointensity relabelling. It can also be run standalone
on any finished subject.

## Inputs

### Required Inputs

- **A FreeSurfer subject** — `--s <subject>`, an existing `$SUBJECTS_DIR`
  directory with completed surfaces. The script reads `?h.white` (and `?h.pial`
  with `--pial`), the cortex label (for masking), and the `aparc` annotation (for
  the stats pass).
- **An intensity volume to sample** — by default
  `mri/<fsvol>.mgz` with `fsvol = rawavg` (i.e. `rawavg.mgz`,
  [`scripts/pctsurfcon:302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L302)). Override the file with `--fsvol` (a
  subject-relative stem) or with an explicit `--mov <vol>`.

### Input Assumptions

> [!assumption] A completed recon-all subject; sampling volume registered by header
> `pctsurfcon` assumes the white (and, with `--pial`, pial) surfaces, the cortex
> label, and the `aparc.annot` parcellation exist. By default it assumes the
> sampling volume is in **the same geometry as the subject's conformed anatomy**
> and registers it with `--regheader` (header geometry) rather than an explicit
> transform ([`scripts/pctsurfcon:104,118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L104)). `rawavg.mgz` is the
> *un-conformed* native average; it shares the subject's anatomical space so
> header registration is valid. If you sample a volume in a different space (e.g.
> a co-registered functional or PET volume), you must supply `--reg`.

## Outputs

### Files Created

Paths are relative to `$SUBJECTS_DIR/<subject>/`. `<ext>` is `mgh` by default.

| File | Where | Contents |
|------|-------|----------|
| `?h.w-g.pct.<ext>` (or `?h.<outbase>.<ext>`) | `surf/` | The per-vertex percent W/G contrast overlay, one value per vertex (non-cortex zeroed by default). |
| `?h.w-g.pct.stats` (or `?h.<outbase>.stats`) | `stats/` | Per-`aparc`-parcel summary statistics of the contrast map, with SNR (`mri_segstats --snr`). |
| `pctsurfcon.log` | `scripts/` | Run log (a previous log is moved to `.old`); suppressed by `--nolog`. |

The output basename `w-g.pct` is changed with `--b <outbase>`; the extension with
`--mgh`/`--mgz`/`--nii.gz` ([`scripts/pctsurfcon:227-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L227-L235)).

### Output Specifications

The overlay is a **one-value-per-vertex surface measure** in [[curv-format]]-style
`.mgh`/`.mgz` (a 1×1×N "volume-encoded" curv overlay), in the subject's surface
space; it is *not* reshaped by default (`--noreshape`,
[`scripts/pctsurfcon:33-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L33-L34)). Values are dimensionless percentages, signed
(W−G positive by default; `--neg` flips to G−W). Non-cortical vertices are 0
unless `--no-mask` is used. The stats file follows the FreeSurfer
[[stats-format]] segmentation-summary layout.

## Mathematical Foundations

> [!math] Percent grey/white contrast
> At every cortical vertex, let $W$ be the sampled intensity at the white-matter
> projection point and $G$ the sampled intensity at the grey-matter projection
> point. The measure is the **normalised (symmetric) percent difference**:
> $$\mathrm{pct} = \mathrm{sign}\cdot\frac{100\,(W-G)}{\tfrac{1}{2}(W+G)}$$
> The factor and sign come from `mri_concat --paired-diff-norm --mul $ConSign`,
> where `ConSign = +100` by default and `-100` with `--neg`
> ([`scripts/pctsurfcon:126-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L126-L132)). `--paired-diff-norm` computes
> $(f_1-f_2)/\big(\tfrac{1}{2}(f_1+f_2)\big)$ with $f_1=W$, $f_2=G$; the `--mul`
> applies the $\pm100$.

> [!math] Where W and G are sampled
> - **White (W):** projected a fixed **absolute distance inside** the white
>   surface, `--projdist -$WMProjAbs` with `WMProjAbs = 1` mm by default
>   ([`scripts/pctsurfcon:101-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L101-L103)). The negative sign projects inward
>   (toward WM).
> - **Grey (G):** projected a **fraction of the cortical thickness outward** by
>   default, `--projfrac $GMProjFrac` with `GMProjFrac = 0.3`
>   ([`scripts/pctsurfcon:116,313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L116)); or an absolute distance with
>   `--gm-proj-abs`.

> [!internal] Sampling and interpolation live in mri_vol2surf
> The actual ray projection along the surface normal, trilinear/nearest
> interpolation, and cortex masking are performed by [[mri_vol2surf]]; the
> normalised difference by [[mri_concat]]. `pctsurfcon` only assembles their
> command lines.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser
([`scripts/pctsurfcon:154-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L154-L285)). Defaults are the initial variable
settings ([`scripts/pctsurfcon:24-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L24-L50)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required unless `--reg`)* | Subject ID. A trailing `/` is stripped via `basename`. |
| `--fsvol` | string | `rawavg` | Subject-relative stem of the intensity volume to sample (`mri/<fsvol>.mgz`). |
| `--mov` | string | `mri/<fsvol>.mgz` | Explicit volume to sample (overrides `--fsvol`); must exist. |
| `--reg` | string | — | Registration (`.lta`/`.dat`) mapping the volume to the surface; the subject is recovered from it via `reg2subject`. Use when the volume is not in the subject's native anatomical space. |
| `--b` | string | `w-g.pct` | Output basename → `?h.<b>.<ext>` and `?h.<b>.stats`. |
| `--gm-proj-frac` | float | `0.3` | GM sample point as a **fraction** of cortical thickness outward from white. |
| `--gm-proj-abs` | float | — | GM sample point as an **absolute** distance (mm); replaces the fraction. |
| `--wm-proj-abs` | float | `1` | WM sample point as an absolute distance (mm) **inside** the white surface. |
| `--pial` | bool | off | Use the **pial** surface as the base instead of white → grey/CSF contrast. |
| `--neg` | bool | off (W−G) | Compute G−W instead of W−G (sets the multiplier to −100). |
| `--pos` | bool | **on** | Compute W−G (multiplier +100); the default. |
| `--no-mask` | bool | mask on | Do **not** zero out non-cortical vertices (omit `--cortex` from `mri_vol2surf`). |
| `--lh-only`<br>`--no-rh` | bool | both | Process the left hemisphere only. |
| `--rh-only`<br>`--no-lh` | bool | both | Process the right hemisphere only. |
| `--nearest` | bool | off | Nearest-neighbour interpolation in `mri_vol2surf`. |
| `--trilin`<br>`--trilinear` | bool | **on** | Trilinear interpolation (the default). |
| `--mgh` | bool | **on** | Output extension `mgh` (default). |
| `--mgz` | bool | off | Output extension `mgz`. |
| `--nii.gz` | bool | off | Output extension `nii.gz`. |
| `--tmp`<br>`--tmpdir` | string | `surf/tmp.pctsurfcon.$$` | Temporary directory; specifying it implies `--nocleanup`. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--nolog` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` / `--help` | bool | — | Print version / help and exit. |

### Configuration Interactions

> [!gotcha] `--gm-proj-frac` and `--gm-proj-abs` are mutually exclusive
> Specifying both is a hard error ([`scripts/pctsurfcon:308-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L308-L311)). If you
> set neither, the fraction defaults to 0.3 ([`scripts/pctsurfcon:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L313)).
> The WM side always uses an absolute distance (`--wm-proj-abs`).

> [!gotcha] `--reg` overrides `--s`
> When `--reg` is given, the subject is taken from the registration file
> (`reg2subject --r $reg`, [`scripts/pctsurfcon:190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L190)), overwriting any
> `--s`. Without `--reg`, sampling uses `--regheader $subject` (header geometry).
> The two are alternative ways of registering the sampling volume to the surface.

Other interactions:

- `--pial` changes only the **base surface** passed to `mri_vol2surf --surf`; the
  same inward/outward projections then sample WM-side and CSF-side of the pial,
  so the "W/G" contrast becomes a grey/CSF contrast.
- `--neg` and `--pos` set the same `ConSign` variable; the last one wins.
- `--no-mask` removes the `--cortex` flag from **both** the WM and GM samplings,
  so non-cortex vertices receive real (non-zero) values.
- The extension flags (`--mgh`/`--mgz`/`--nii.gz`) are last-one-wins.

## Typical Use Cases

### 1. Standard run (as in recon-all)

```bash
# Both hemispheres, sample rawavg, default 1mm WM / 30% GM projections.
pctsurfcon --s subject
# → surf/?h.w-g.pct.mgh, stats/?h.w-g.pct.stats
```

### 2. Single hemisphere (the recon-all parallel pattern)

```bash
pctsurfcon --s subject --lh-only
pctsurfcon --s subject --rh-only
```

### 3. Grey/CSF contrast off the pial surface

```bash
pctsurfcon --s subject --pial --b g-csf.pct
```

### 4. Sample a co-registered volume via a registration

```bash
pctsurfcon --s subject --mov myvol.nii.gz --reg myvol2anat.lta \
  --b myvol.w-g.pct
```

## Pipeline Context

`pctsurfcon` is an **`autorecon3`** step of
[[wiki/pipelines/recon-all|recon-all]]. It is enabled by `-autorecon3` /
`-all` (sets `DoPctSurfCon = 1`,
[`scripts/recon-all:7428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7428)) and toggled individually with
`-pctsurfcon` / `-nopctsurfcon`
([`scripts/recon-all:7098-7104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7098-L7104)). In the stream it runs **after** the
cortical-parcellation stats stages (`-parcstats`, `-cortparc2/3`,
`-parcstats2/3`) and **before** hypointensity relabelling (`-hyporelabel`) and
`-aparc2aseg` ([`scripts/recon-all:9121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L9121)). recon-all calls it once per
hemisphere as `pctsurfcon --s <subjid> --lh-only|--rh-only`
([`scripts/recon-all:4974-4976`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4974-L4976)). It is **skipped in the longitudinal
base** because `rawavg.mgz` does not exist there
([`scripts/recon-all:4965`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4965)).

**Predecessor:** cortical-parcellation stats (`-parcstats3`) →
**pctsurfcon** → **Successor:** `-hyporelabel` / `-aparc2aseg`.

## Gotchas and Caveats

> [!gotcha] The sampled volume is `rawavg.mgz`, not the conformed `T1.mgz`
> By design the contrast is measured on the **native un-conformed** average
> `rawavg.mgz` ([`scripts/pctsurfcon:25,302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L25)), to avoid the intensity
> normalisation/conforming that would flatten true grey/white contrast. Sampling
> `brain.mgz`/`norm.mgz` instead (via `--fsvol`) would change the meaning of the
> measure. This is why the step is skipped in the longitudinal base, where
> `rawavg.mgz` is absent.

> [!gotcha] Sign convention: positive means white brighter than grey
> With the default `--pos`, larger `w-g.pct` = white matter brighter than the
> adjacent cortex, the normal T1 contrast. Use `--neg` only if you deliberately
> want the opposite sign.

> [!gotcha] Non-cortex is zeroed by default
> The `--cortex` mask zeroes medial-wall / non-cortical vertices in the output
> overlay; pass `--no-mask` to retain values there
> ([`scripts/pctsurfcon:106,120,198-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L106)).

> [!gotcha] `--pial` reuses the W/G projection geometry
> With `--pial` the same `--wm-proj-abs`/`--gm-proj-frac` projections are applied
> relative to the **pial** surface, so the "WM" sample sits inside the cortex and
> the "GM" sample sits in CSF. Interpret the resulting `w-g.pct` accordingly
> (it is a grey/CSF, not grey/white, contrast).

## Error Compensation and Guard Rails

- **Mutually-exclusive projection guard.** Setting both GM projection modes is
  caught and rejected ([`scripts/pctsurfcon:308-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L308-L311)); a default fraction
  is supplied when neither is set.
- **Input existence checks.** The subject directory and the sampling volume must
  exist; `--mov` and `--reg` paths are validated at parse time
  ([`scripts/pctsurfcon:176-178,184-186,297-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L297-L306)).
- **Fail-fast.** Any non-zero status from `mri_vol2surf`, `mri_concat`, or
  `mri_segstats` exits the script immediately.
- **No silent conforming.** Unlike volumetric tools, `pctsurfcon` does not
  resample or conform the input; it samples it as-is through `mri_vol2surf`.

## Related Tools

- [[mri_vol2surf]] — performs the two surface samplings (WM-side and GM-side projections).
- [[mri_concat]] — forms the normalised percent difference (`--paired-diff-norm`).
- [[mri_segstats]] — computes the per-parcel `?h.w-g.pct.stats` summary (with SNR).
- [[reg2subject]] — recovers the subject name from a `--reg` registration file.
- [[mris_anatomical_stats]] — the companion surface-stats tool that summarises thickness/area/curvature per parcel; `pctsurfcon`'s contrast measure complements those morphometrics.
- [[wiki/pipelines/recon-all|recon-all]] — calls `pctsurfcon` in `autorecon3`.

## Confidence and Gaps

**High confidence:** complete flag set and aliases, the exact projection
defaults (WM 1 mm inward absolute, GM 0.3 thickness fraction), the
`--paired-diff-norm` percent formula and sign convention, the `rawavg.mgz`
sampling choice, the GM-projection mutual exclusion, and the recon-all
`autorecon3` placement and per-hemisphere invocation — all read directly from
[`scripts/pctsurfcon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon) and cross-checked in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

## References

- FreeSurfer source: [`scripts/pctsurfcon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon) (v8.2.0).
- Built-in help: `pctsurfcon --help` (the `BEGINHELP` block, [`scripts/pctsurfcon:369-394`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L369-L394)).
- recon-all integration: [`scripts/recon-all:4962-4994`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4962-L4994).
- Salat DH, et al. *Age-associated alterations in cortical gray and white matter signal intensity and gray to white matter contrast.* NeuroImage 48 (2009) 21–28 — a standard reference for the W/G contrast measure.
