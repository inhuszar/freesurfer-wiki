---
title: "rtview"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rtview"
families: []                     # standalone FSFAST retinotopy viewer (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[tksurfer]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2surf]]"
  - "[[mris_calc]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[reg2subject]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Relies on tksurfer and the legacy FreeSurfer Tcl colour-wheel scripts ($FREESURFER_HOME/lib/tcl/{eccen,polar}-{views,flat}.tcl); behaviour of those Tcl files was not traced line-by-line."
  - "The --h (hfile) path that derives real/imag from a multi-frame H-file is implemented but its required-input check is disabled; only described from the script."
tags:
  - fsfast
  - retinotopy
  - visualization
  - surface
  - tksurfer
---

# rtview

## Summary

`rtview` ("retinotopy view") is a tcsh front-end to [[tksurfer]] for displaying
**FSFAST retinotopy** results with the phase-encoded **colour wheel**. Given the
real (cosine) and imaginary (sine) components of a phase-encoded retinotopy
analysis plus a significance map, it prepares per-hemisphere surface overlays,
sets the large collection of environment variables that the legacy Tcl colour-wheel
scripts expect, and launches `tksurfer` on the inflated surface with the
appropriate `eccen-` or `polar-` Tcl view script. The real/imaginary/significance
inputs may be either already on the surface or still in the native volume (in which
case a registration file is supplied and the data are sampled to the surface with
[[mri_vol2surf]]).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rtview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview)
- **Binary/script location:** `$FREESURFER_HOME/bin/rtview`
- **Key helpers invoked:** [`tksurfer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L150) (the actual display), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L91) (volume → surface sampling when `--reg` is given), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L99) (resample / write the paint/`w` overlay, optionally onto another subject), [`mris_calc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L80) (mask the complex parts by the significance map), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L73) (split an H-file into frames), and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L183) (recover the subject name from a registration file). The colour-wheel display logic lives in `$FREESURFER_HOME/lib/tcl/{eccen,polar}-{views,flat}.tcl`.

## Purpose and Context

Phase-encoded retinotopic mapping (eccentricity and polar-angle experiments)
encodes the visual-field position a vertex responds to as the **phase** of a
Fourier component of its fMRI time series. FSFAST stores that as a complex pair —
real (cosine) and imaginary (sine) — together with a significance map. `rtview`
is the canonical way to look at such a result: it renders the phase as hue on a
colour wheel over the inflated cortical surface, with the significance map gating
which vertices are shown.

It is a **visualization front-end**, not an analysis step: it does no statistics
of its own, it just stages the data and configures [[tksurfer]]. It is **not**
part of [[wiki/pipelines/recon-all|recon-all]] (which builds the surfaces it
displays on) and is run **interactively** after an FSFAST retinotopy analysis.

> [!gotcha] This targets "FSFAST version 5" retinotopy data
> The built-in help states it views *"FSFAST version 5 retinotopy data using the
> color wheel"* ([`scripts/rtview:398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L398)). It depends on `tksurfer` and the legacy
> Tcl colour-wheel view scripts, all of which are older-generation FreeSurfer
> components. Modern overlays are usually viewed in
> [[wiki/tools/freeview|freeview]], which `rtview` does not use.

## Inputs

### Required Inputs

- **Real component** (`--real`/`--r`) and **imaginary component** (`--imag`/`--i`)
  — the cosine and sine maps of the phase-encoded analysis (surface overlays such
  as `real.nii`/`imag.nii`, or volumes if `--reg` is also given). Both files must
  exist ([`scripts/rtview:186-205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L186-L205)).
- **Significance map** (`--fsig`) — used to mask the complex parts
  ([`scripts/rtview:80-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L80-L83)).
- **Stimulus type** — exactly one of `--eccen` (eccentricity) or `--polar` (polar
  angle); required ([`scripts/rtview:316-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L316-L319)).
- **Hemisphere** — one of `--hemi lh|rh`, `--lh`, or `--rh`; required
  ([`scripts/rtview:332-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L332-L335)).
- **Subject** — `--s <subject>`, **or** `--reg <regfile>` from which the subject is
  recovered via `reg2subject` ([`scripts/rtview:183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L183)). One of the two is
  required, and the subject must exist under `$SUBJECTS_DIR`
  ([`scripts/rtview:321-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L321-L331)).

### Input Assumptions

> [!assumption] Surface overlays, or volumes plus a registration
> By default the real/imag/fsig inputs are assumed to be **surface** overlays for
> the named hemisphere. If they are **volumes**, you must pass `--reg <regfile>`;
> the script then samples each complex part to the surface with
> [[mri_vol2surf]] using `--mapmethod nnf` (nearest-neighbour float)
> ([`scripts/rtview:91-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L91-L92)). With `--reg`, the subject name is taken from
> the registration and `--s` is not needed. The subject's
> `?h.inflated`, `?h.curv`, and the `aparc` parcellation must already exist (built
> by [[wiki/pipelines/recon-all|recon-all]]).

### Optional Inputs

- `--h <hfile>` — a multi-frame "H-file" from which the imaginary and real maps
  are taken as frames 2 and 3 ([`scripts/rtview:70-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L70-L77)). The check that would
  require `--h` is disabled (`if(0 && ...)`, [`scripts/rtview:348-351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L348-L351)).
- `--ss <n>` — smoothing steps applied on the surface (default 2).
- `--flat` / `--patch <name>` — display on a flattened patch instead of the
  inflated surface.

## Outputs

`rtview` produces no persistent analysis output; it writes only working files into
a **temporary directory** and then launches the viewer.

### Files Created (in `tmpdir`)

| File | Where | Contents |
|------|-------|----------|
| `tkimag.mgh`, `tkreal.mgh` | `tmpdir` | the imaginary/real maps, masked by `fsig` (or extracted from the H-file) ([`scripts/rtview:67-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L67-L84)) |
| `map-{real,imag}-?h.mgh` | `tmpdir` | per-hemisphere surface-sampled complex parts (only when `--reg` is used) ([`scripts/rtview:90-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L90-L93)) |
| `map-{real,imag}-?h.w` | `tmpdir` | the paint (`w`-file) overlays the Tcl colour-wheel scripts read ([`scripts/rtview:98-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L98-L101)) |
| `rtview.log` | `tmpdir` | command line, environment, host info ([`scripts/rtview:56-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L56-L65)) |

The temporary directory defaults to `<srcdir>/tmpdir.rtview` and is **deleted on
exit** unless `--no-cleanup`/`--tmpdir` is given. The visible "output" is the
interactive `tksurfer` window.

### Output Specifications

The `w` (paint) overlays carry one scalar per surface vertex; the colour mapping
(hue = phase) is applied by the Tcl view script, parameterised by the environment
variables `rtview` sets (`fthresh 0.4`, `fmid 0.8`, `fslope 1.3`, `offset 0.4`,
`floatstem map`, `realname -real`, `complexname -imag`, etc.,
[`scripts/rtview:108-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L108-L133)).

## Mathematical Foundations

`rtview` performs **no numerical modelling**; the only arithmetic it does directly
is masking the complex components by the significance map with
[[mris_calc]] (`mul`), i.e. an element-wise product
([`scripts/rtview:80-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L80-L83)):

$$\text{real}_\text{disp} = \text{fsig} \cdot \text{real}, \qquad
\text{imag}_\text{disp} = \text{fsig} \cdot \text{imag}.$$

The phase shown on the colour wheel, $\varphi = \operatorname{atan2}(\text{imag},
\text{real})$, and its mapping to hue are computed **inside `tksurfer`/the Tcl view
script**, not in this script.

> [!internal] The colour-wheel rendering lives in the Tcl view scripts
> The actual phase-to-colour mapping and the retinotopy display are implemented in
> `$FREESURFER_HOME/lib/tcl/eccen-views.tcl` / `polar-views.tcl` (and the `-flat`
> variants), invoked through [[tksurfer]]. `rtview` only stages overlays and sets
> the environment those scripts read.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/rtview:161-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L161-L308)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | — | Display subject (also used as source subject); must exist under `$SUBJECTS_DIR`. |
| `--reg` | string | — | Registration file for **volume** inputs; the source subject is recovered from it with `reg2subject`, so `--s` is not needed. |
| `--real`<br>`--r` | string | *(required)* | Real (cosine) component map. |
| `--imag`<br>`--i` | string | *(required)* | Imaginary (sine) component map. |
| `--fsig` | string | *(required)* | Significance map; multiplies the complex parts to mask them. |
| `--hemi` | `lh`\|`rh` | *(required)* | Hemisphere to display. |
| `--lh` | bool | — | Shorthand for `--hemi lh`. |
| `--rh` | bool | — | Shorthand for `--hemi rh`. |
| `--eccen` | bool | *(one required)* | Eccentricity stimulus: use the `eccen-` Tcl view script. |
| `--polar` | bool | *(one required)* | Polar-angle stimulus: use the `polar-` Tcl view script. |
| `--h` | string | — | Multi-frame H-file; imag = frame 2, real = frame 3. (Its required-input check is disabled.) |
| `--flat` | bool | off | Display on a flattened patch (`occip.patch.flat` by default). |
| `-patch` | string | — | Display on the named patch file (sets flat mode). Note: **single dash**. |
| `--tcl` | string | auto | Use a custom Tcl command file instead of the auto-selected `{eccen,polar}-{views,flat}.tcl`. |
| `--ss` | int | `2` | Surface smoothing steps. |
| `--tmpdir` | string | `<srcdir>/tmpdir.rtview` | Working directory; setting it also disables cleanup. |
| `--no-cleanup`<br>`--nocleanup` | bool | cleanup on | Keep the temporary directory after exit. |
| `--cleanup` | bool | on | Force cleanup of the temporary directory. |
| `--log` | string | `tmpdir/rtview.log` | Log-file path. |
| `--no-log`<br>`--nolog` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] Exactly one of `--eccen` / `--polar` is required
> The stimulus type selects which Tcl view script is loaded
> (`$stimtype-views.tcl` or `$stimtype-flat.tcl`,
> [`scripts/rtview:142-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L142-L148)). If neither is given, `rtview` exits with
> "must --eccen or --polar" ([`scripts/rtview:316-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L316-L319)).

> [!gotcha] Subject identity: `--s` vs `--reg`
> Supply `--s` when the inputs are **already on the surface**; supply `--reg` when
> they are **volumes**. With `--reg`, the source subject is read from the
> registration file via `reg2subject` ([`scripts/rtview:183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L183)) and the
> volumes are sampled to the surface; passing neither errors with "must spec
> subject or reg" ([`scripts/rtview:322-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L322-L325)). A cross-subject display is
> possible because the source and target subjects are tracked separately and
> [[mri_surf2surf]] resamples between them.

> [!gotcha] `--flat`/`-patch` switch the Tcl script to the `-flat` variant
> Setting flat mode loads `$stimtype-flat.tcl` instead of `$stimtype-views.tcl`
> ([`scripts/rtview:142-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L142-L148)) and requires the patch to exist;
> `--flat` defaults the patch to `occip.patch.flat`.

> [!gotcha] `--tmpdir` implies `--no-cleanup`
> Specifying your own `--tmpdir` sets `cleanup = 0`
> ([`scripts/rtview:262-266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L262-L266)), so a directory you named is never deleted —
> otherwise the working files are removed on exit.

## Typical Use Cases

### 1. Display surface eccentricity data

```bash
cd sess/bold/rtopy.lh
rtview --s subject --lh --eccen \
  --real eccen/real.nii --imag eccen/imag.nii --fsig eccen/fsig.nii
```

### 2. Display surface polar-angle data

```bash
rtview --s subject --lh --polar \
  --real polar/real.nii --imag polar/imag.nii --fsig polar/fsig.nii
```

### 3. Display data still in the native volume (with registration)

```bash
cd sess/bold/rtopy.native
rtview --reg ../register.dof6.dat --lh --eccen \
  --real eccen/real.nii --imag eccen/imag.nii --fsig eccen/fsig.nii
```

### 4. Display on a flattened occipital patch, keeping the working files

```bash
rtview --s subject --rh --polar --flat --no-cleanup \
  --real polar/real.nii --imag polar/imag.nii --fsig polar/fsig.nii
```

## Pipeline Context

`rtview` is an interactive **visualization** endpoint of an FSFAST retinotopy
analysis. It is not called by [[wiki/pipelines/recon-all|recon-all]] or
[[trac-all]].

**Predecessor:** FSFAST phase-encoded retinotopy analysis (producing
`real`/`imag`/`fsig`) and [[wiki/pipelines/recon-all|recon-all]] (producing the
surfaces) → **rtview** → **Successor:** interactive inspection in [[tksurfer]] (the
window `rtview` opens). Internally it chains [[mris_calc]] →
[[mri_vol2surf]] (if `--reg`) → [[mri_surf2surf]] → [[tksurfer]].

**Predecessor:** [[mri_vol2surf]] / [[mri_surf2surf]] → **This tool** →
**Successor:** [[tksurfer]].

## Gotchas and Caveats

> [!gotcha] Built on legacy tksurfer + Tcl, not freeview
> `rtview` requires `tksurfer` and the `lib/tcl/*-views.tcl` colour-wheel scripts.
> On builds where the legacy Tcl/Tk viewer is unavailable, it cannot display
> anything. There is no `freeview` code path.

> [!gotcha] The cleanup `rm -f` targets the directory without `-r`
> On exit the script runs `rm -f $tmpdir` (no `-r`,
> [`scripts/rtview:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L154)). Because `rm -f` on a directory does not remove it,
> the temp directory and its contents can be left behind even in the "cleanup"
> case; use `--tmpdir` if you want to control the location explicitly.

> [!gotcha] `-patch` is single-dash among double-dash flags
> Most flags are `--`; the patch flag is the single-dash `-patch`
> ([`scripts/rtview:277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L277)). Use `--flat` (which sets `occip.patch.flat`) or the
> exact `-patch <name>` spelling.

## Error Compensation and Guard Rails

- **Existence checks** on `--reg`, `--real`, `--imag`, `--fsig`, `--h`, and
  `--tcl` files; a missing file aborts immediately
  ([`scripts/rtview:175-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L175-L237)).
- **Required-parameter checks** at `check_params` for stimulus type, subject,
  hemisphere, fsig, real, and imag ([`scripts/rtview:314-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L314-L352)).
- **Subject-exists check** against `$SUBJECTS_DIR` for both source and target
  subjects ([`scripts/rtview:326-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L326-L331)).
- Each helper command's exit status is checked (`if($status) exit 1`), so a failed
  sampling/conversion stops the run before launching the viewer.

## Related Tools

- [[tksurfer]] — the surface viewer `rtview` is a front-end for; it does the colour-wheel rendering via the Tcl view scripts.
- [[mri_vol2surf]] — samples volume real/imag data onto the surface when `--reg` is used.
- [[mri_surf2surf]] — writes the paint (`w`) overlay and resamples between source and target subjects.
- [[mris_calc]] — masks the complex components by the significance map (element-wise multiply).
- [[wiki/tools/mri_convert|mri_convert]] — splits a multi-frame H-file into the real/imag frames (`--h` path).
- [[reg2subject]] — extracts the subject name from a registration file (`--reg` path).

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the surface-vs-volume
decision, the required-parameter rules, the staged temporary files, the
significance masking, and the auto-selection of the `eccen`/`polar` (and `-flat`)
Tcl scripts — all read directly from
[`scripts/rtview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview).

> [!gap] Tcl colour-wheel scripts not traced
> The exact colour mapping and view layout are in
> `$FREESURFER_HOME/lib/tcl/{eccen,polar}-{views,flat}.tcl`, which were confirmed
> to exist but not read line-by-line. The environment variables `rtview` sets are
> documented from the script; their precise effect is defined in those Tcl files.

> [!gap] H-file (`--h`) path
> The multi-frame H-file branch (imag = frame 2, real = frame 3) is implemented
> but its required-input guard is disabled, and it was not exercised; it is
> described from the script only.

## References

- FreeSurfer source: [`scripts/rtview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview) (v8.2.0).
- Built-in help: `rtview --help` (the `BEGINHELP` block, [`scripts/rtview:396-420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rtview#L396-L420)).
- FSFAST retinotopy analysis (the upstream that produces the real/imag/fsig inputs) and the legacy FreeSurfer retinotopy colour-wheel display.
