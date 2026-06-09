---
title: "rca-rcac-prep"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-rcac-prep"
families: []                     # recon-all component / clinical-prep script (rca-* family)
recon_all_stage: null            # standalone preprocessor; not called by recon-all (it hands off TO recon-all)
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_synthseg]]"
  - "[[mri_synthsr]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_pretess]]"
  - "[[seg2cc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Two helper steps reference $subjdir (seg2cc fallback symlinks, synthseg fallback symlink) and seg2cc itself was not audited; whether seg2cc produces aseg.auto.mgz exactly as assumed is taken from the script's UpdateNeeded targets."
  - "Three symlink lines near L172-L173 (transforms, source.mgz -> rcac/conf.mgz) appear to reference rcac filenames that the recon-all-clinical step must have produced; the existence of rcac/conf.mgz / rcac/transforms is inferred, not byte-verified."
tags:
  - clinical
  - synthseg
  - synthsr
  - preprocessing
  - recon-all
  - arbitrary-contrast
---

# rca-rcac-prep

## Summary

`rca-rcac-prep` **preprocesses an input volume of arbitrary MRI contrast** so that
it can be fed into the standard [[wiki/pipelines/recon-all|recon-all]] surface
stream. It chains the *recon-all-clinical* (RCAC) deep-learning tools —
[[mri_synthseg]] (segmentation + parcellation), [[mri_synthsr]] (synthesis of a
1 mm isotropic T1-like image), and the SynthSurf model
(`mri_synth_surf.py`) — to manufacture the volumes recon-all normally derives from
a real T1 (`orig.mgz`, `nu.mgz`, `norm.mgz`, `brainmask.mgz`, `wm.seg.mgz`, …),
then runs a handful of conventional FreeSurfer commands ([[mri_edit_wm_with_aseg]],
[[mri_pretess]], [[seg2cc]]) to bring the subject directory to exactly the state
from which `recon-all -autorecon2-wm -autorecon3` can take over. It is the
editable, recon-all-compatible alternative to `recon-all-clinical.sh`. It is run
**by hand** (or with `--run-recon-all` to chain straight into recon-all); recon-all
does **not** call it.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-rcac-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-rcac-prep`
- **Model file:** `$FREESURFER_HOME/models/synthsurf_v10_230420.h5` ([`scripts/rca-rcac-prep#L13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L13))
- **Tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L93) (copy/conform/reslice), [`mri_synthseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L112) (run twice: with `--parc` on the source, and `--robust` on the conformed source), [`mri_synthsr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L124) (synthetic T1), `fspython mri_synth_surf.py` ([SynthSurf model](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L136)), [`seg2cc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L202) (corpus-callosum segmentation), [`mri_edit_wm_with_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L225), [`mri_pretess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L238), and (optionally) [`recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L245) with `--run-recon-all`. Helpers: `UpdateNeeded`, `fs_time`.

## Purpose and Context

Standard recon-all assumes a **1 mm isotropic T1-weighted** input. Clinical scans
are frequently non-T1, non-isotropic, or low-resolution, and would fail or produce
poor surfaces if fed directly. FreeSurfer's *recon-all-clinical* (RCAC) approach
sidesteps this by using contrast-agnostic deep-learning networks to (a) segment the
brain regardless of contrast ([[mri_synthseg]]) and (b) synthesize a clean
T1-like image ([[mri_synthsr]]) from which surfaces can be placed.

`rca-rcac-prep` packages that approach into a recon-all-compatible prep step. Its
design intent, per the in-source documentation, is to "use recon-all-clinical to
process volumes of arbitrary contrast in a way that would produce all of the
regular recon-all output, take advantage of changes to recon-all, and also be
**editable**" — unlike the stock `recon-all-clinical.sh`, which "does not respect
edits" ([`scripts/rca-rcac-prep#L476-L483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L476-L483)). After it runs, you continue with
`recon-all -s <subject> -autorecon2-wm -autorecon3`, optionally disabling the
default fixes (`-no-fix-ento-wm -no-fix-ga -no-fix-mca-dura -no-fix-acj
-no-fix-vsinus`).

> [!gotcha] Do not let recon-all run stages before autorecon2-wm
> The script prepares the subject directory specifically for the
> `-autorecon2-wm` entry point. The help is explicit: "Do not run recon-all in a
> way that it calls commands prior to autorecon2-wm"
> ([`scripts/rca-rcac-prep#L460-L463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L460-L463)). Running earlier stages would overwrite
> the synthesized volumes with real-T1 processing the input cannot support.

## Inputs

### Required Inputs

- **`--s <subject>`** — the subject ID to create/populate under `$SUBJECTS_DIR`.
- **`--i <invol>`** — the input volume, **any contrast** (T1, T2, FLAIR, PD,
  proton-density, low-res clinical, etc.); any format [[wiki/tools/mri_convert|mri_convert]]
  can read. Required on the **first** run; omitted on re-runs (see below).
  Internally copied to `mri/source.mgz` as float ([`scripts/rca-rcac-prep#L93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L93)).

### Input Assumptions

> [!assumption] Arbitrary contrast, but a single brain volume
> The input may be of any contrast and is conformed internally; it is assumed to
> be a single anatomical brain volume. SynthSeg/SynthSR are robust to contrast and
> moderate resolution, but pathology or large field-of-view artefacts can degrade
> the synthetic T1 and hence surface placement (the help flags "worries about the
> surface placement on the synthSR synthetic T1," [`scripts/rca-rcac-prep#L472-L474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L472-L474)).
> Note that `synthseg` is run on the **conformed source**, not on the synthetic
> `orig.mgz`, because `orig.mgz` is itself synthetic ([`scripts/rca-rcac-prep#L461-L463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L461-L463)).

> [!assumption] Re-runs must omit `--i`
> On a second or later run on the same subject, **do not pass `--i`**. Passing an
> input volume when `mri/rcac/conf.mgz` already exists is a hard error
> ([`scripts/rca-rcac-prep#L394-L398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L394-L398)); the script resumes from the existing
> `source.conf.mgz` instead ([`scripts/rca-rcac-prep#L399-L402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L399-L402)).

## Outputs

### Files Created

Working volumes live under `mri/rcac/`; the recon-all-visible volumes are
**symlinks** into `mri/rcac/` so the rest of recon-all sees the expected names.

| File / path | Origin | Role |
|-------------|--------|------|
| `mri/source.mgz` | `mri_convert <invol> -odt float` | The raw input as float. |
| `mri/source.conf.mgz` | `mri_convert --conform … --no_scale 1` | Conformed (256³, 1 mm) source — the SynthSeg input. |
| `mri/rcac/synthseg.apas.mgz` (+ `.csv`, `.qc.csv`) | [[mri_synthseg]] `--parc --robust` | SynthSeg segmentation+parcellation feeding SynthSurf. |
| `mri/rcac/synthSR.raw.mgz` | [[mri_synthsr]] | Synthetic 1 mm T1-like image. |
| `mri/rcac/norm.mgz`, `mri/rcac/wm.seg.mgz`, `mri/rcac/transforms/…`, `mri/rcac/conf.mgz` | SynthSurf (`mri_synth_surf.py`) | The RCAC surface-prep outputs; only `norm` and `wm.seg` are consumed further. |
| `mri/rcac/norm.conf.mgz` | `mri_convert --reslice_like source.conf` | RCAC norm cropped 266³→256³. |
| `mri/rcac/wm.seg.conf.mgz` | `mri_convert --reslice_like … -odt uchar --no_scale 1` | RCAC wm.seg cropped to 256³. |
| `mri/{orig,orig_nu,nu,T1,brainmask.auto,synthstrip,norm,brain,brainmask,antsdn.brain,rawavg}.mgz` | symlinks → `rcac/norm.conf.mgz` | All the "T1-domain" volumes recon-all expects, pointed at the RCAC norm ([`scripts/rca-rcac-prep#L166-L170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L166-L170)). |
| `mri/wm.seg.mgz` | symlink → `rcac/wm.seg.conf.mgz` | RCAC white-matter segmentation. |
| `mri/synthseg.rca.mgz` (+ `stats/synthseg.vol.csv`) | [[mri_synthseg]] `--robust` on `source.conf` | Second SynthSeg, used as the aseg seed. |
| `mri/aseg.auto_noCCseg.mgz` | symlink → `synthseg.rca.mgz` | aseg before corpus-callosum labelling. |
| `mri/aseg.auto.mgz` | [[seg2cc]] (or symlink if `--skip-cc`) | aseg with corpus callosum. |
| `mri/aseg.presurf.mgz` | `cp aseg.auto.mgz` | Pre-surface aseg. |
| `mri/wm.asegedit.mgz` | [[mri_edit_wm_with_aseg]] `-keep-in -fill-seg-wm` | wm.seg edited against the aseg. |
| `mri/wm.mgz` | [[mri_pretess]] | Topology-corrected WM — the entry point for `-autorecon2-wm`. |
| `scripts/rca-rcac-prep.*.log` | written | Per-run log. |

### Output Specifications

All volumes are presented as **256³, 1 mm isotropic, T1-weighted-appearing**
(even the segmentations are resliced to the conformed grid), so downstream
recon-all stages behave as if a normal T1 had been processed
([`scripts/rca-rcac-prep#L455-L457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L455-L457)). The RCAC tools natively emit 266³ volumes,
which the script crops back to 256³ via `mri_convert --reslice_like
source.conf.mgz` ([`scripts/rca-rcac-prep#L144-L162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L144-L162)).

## Mathematical Foundations

`rca-rcac-prep` is an **orchestrator**: the modelling is in the deep networks it
calls. There are no equations in the script itself beyond run-time arithmetic.

> [!internal] The contrast-agnostic models do the work
> Segmentation/parcellation is a SynthSeg CNN ([[mri_synthseg]]); the synthetic T1
> is produced by SynthSR ([[mri_synthsr]]); the surface-prep `norm`/`wm.seg`
> come from the SynthSurf model (`models/synthsurf_v10_230420.h5`, driven by
> `mri_synth_surf.py`). The conventional steps that follow —
> [[mri_edit_wm_with_aseg]] (fill WM from the segmentation with `-fill-seg-wm`)
> and [[mri_pretess]] (topology cleanup) — use the same algorithms as in normal
> recon-all. See those pages for the methods.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-rcac-prep#L284-L377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L284-L377)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subject>` | string | *(required)* | Subject ID under `$SUBJECTS_DIR` to create/populate. |
| `--i <invol>` | string | — (required on first run) | Input volume of any contrast/format. **Omit on re-runs** (see assumption above). |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `--threads <n>` | integer | `1` | Threads passed to `mri_synthseg`, `mri_synthsr`, `mri_synth_surf.py`, and (with `--run-recon-all`) recon-all. |
| `--lh` | bool | both | Append `lh` to the hemi list (used only to pass `-hemi lh` to recon-all under `--run-recon-all`). |
| `--rh` | bool | both | Append `rh` to the hemi list (as above). |
| `--rca`<br>`--recon-all`<br>`--run-recon-all` | bool | off | After prep, run `recon-all -s <subject> -autorecon2-wm -autorecon3 -threads <n>` automatically. |
| `--skip-cc` | bool | off | Do **not** segment the corpus callosum with [[seg2cc]]; instead symlink `aseg.auto.mgz → aseg.auto_noCCseg.mgz`. "Good for ex vivo." |
| `--no-skip-cc` | bool | (default) | Force corpus-callosum segmentation on. |
| `--force`<br>`--no-force` | bool | off | Force every step even if the output is newer than its inputs (bypass `UpdateNeeded`). |
| `--log <file>` | string | auto (`scripts/rca-rcac-prep.*.log`) | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir <dir>` | string | auto | Temp directory (sets `cleanup=0`); not actively used in v8.2.0 (the `mkdir`/`rm` lines are commented out). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp cleanup (no effect, as above). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] First run needs `--i`; re-runs must drop it
> On the first run `--i` is mandatory and `mri/rcac/conf.mgz` must not yet exist;
> on later runs `--i` must be **omitted** and `mri/source.conf.mgz` must already
> exist ([`scripts/rca-rcac-prep#L394-L402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L394-L402)). Passing `--i` to a started subject
> aborts with "subject … has already been started." This two-phase contract lets
> you resume or re-tune the conventional steps without re-synthesizing.

> [!gotcha] `--skip-cc` swaps a tool for a symlink
> Without `--skip-cc`, [[seg2cc]] creates `aseg.auto.mgz` with a labelled corpus
> callosum. With `--skip-cc`, the script instead symlinks `aseg.auto.mgz` to the
> no-CC segmentation ([`scripts/rca-rcac-prep#L201-L210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L201-L210)). Use it for ex-vivo
> data where CC segmentation is inappropriate.

- `--lh`/`--rh` are **only** forwarded to recon-all and only matter together with
  `--run-recon-all`; they do not restrict the prep itself, and if exactly one is
  given the hemi list stays single (else it defaults to `lh rh`,
  [`scripts/rca-rcac-prep#L404`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L404)).
- `--run-recon-all` chains directly into recon-all from `-autorecon2-wm`; doing
  the two steps by hand is equivalent (the help shows both forms,
  [`scripts/rca-rcac-prep#L442-L449`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L442-L449)).

## Typical Use Cases

### 1. Prep an arbitrary-contrast volume, then run recon-all by hand

```bash
rca-rcac-prep --s subjC --i flair.nii.gz --threads 20
recon-all -s subjC -autorecon2-wm -autorecon3 -threads 20 \
  -no-fix-ento-wm -no-fix-ga -no-fix-mca-dura -no-fix-acj -no-fix-vsinus
```

### 2. Prep and run recon-all in one shot

```bash
rca-rcac-prep --s subjC --i t2.nii.gz --threads 20 --run-recon-all
```

### 3. Resume / re-tune without re-synthesizing (no `--i`)

```bash
# After a first run; recomputes only the conventional steps as needed.
rca-rcac-prep --s subjC --threads 20
```

### 4. Ex-vivo data (skip corpus-callosum segmentation)

```bash
rca-rcac-prep --s exvivoA --i exvivo.mgz --threads 20 --skip-cc
```

## Pipeline Context

`rca-rcac-prep` is a **standalone preprocessor that hands off TO**
[[wiki/pipelines/recon-all|recon-all]]; recon-all does **not** call it
(`recon_all_stage: null`). It produces exactly the subject-directory state from
which `recon-all -autorecon2-wm -autorecon3` runs, so functionally it stands in
for the autorecon1 → early-autorecon2 portion of the normal stream, but using
clinical/synthetic models instead of real-T1 processing.

**Predecessor:** an arbitrary-contrast input volume → **rca-rcac-prep** (runs
[[mri_synthseg]], [[mri_synthsr]], SynthSurf, then [[seg2cc]],
[[mri_edit_wm_with_aseg]], [[mri_pretess]]) → **Successor:**
[[wiki/pipelines/recon-all|recon-all]] `-autorecon2-wm -autorecon3` (white/pial
surface placement, parcellation, statistics). It is closely related to, but
distinct from, the stock `recon-all-clinical.sh` pipeline (see
[[wiki/faq/recon-all-clinical|recon-all-clinical FAQ]]); the results are "very
close" but not identical ([`scripts/rca-rcac-prep#L465-L470`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L465-L470)).

## Gotchas and Caveats

> [!gotcha] Every recon-all-visible volume is a symlink to one RCAC norm
> `orig.mgz`, `nu.mgz`, `T1.mgz`, `brain.mgz`, `brainmask.mgz`, `norm.mgz`,
> `rawavg.mgz`, etc. are **all symlinks to the same `rcac/norm.conf.mgz`**
> ([`scripts/rca-rcac-prep#L166-L170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L166-L170)). They are not independent images. This is
> intentional (they all "appear as T1-weighted so they work with the rest of
> recon-all," [`scripts/rca-rcac-prep#L455-L457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L455-L457)), but means that, e.g.,
> `rawavg.mgz` is not the original acquisition — `source.mgz` is.

> [!gotcha] Results differ from recon-all-clinical.sh and from real-T1 recon-all
> RCAC folds hippocampus+amygdala into the subcortical mass, and recon-all's
> default fixes (entowm, vsinus, mca/dura, acj) further diverge results if left on
> ([`scripts/rca-rcac-prep#L465-L470`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L465-L470)). For closest agreement with clinical
> output, disable those fixes in the follow-on recon-all (as in Use Case 1).

> [!gotcha] Control points have no effect; some edits do
> The script is designed to be editable (`filled.mgz`,
> `brain.finalsurfs.manedit.mgz`), but the author notes control points "will not
> do anything," and is "not sure" aseg edits propagate
> ([`scripts/rca-rcac-prep#L476-L483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L476-L483)). Treat control-point editing as
> unsupported in this path.

> [!gotcha] SynthSR can over-clean white matter
> SynthSR "does have a heavy hand" and may remove real WM detail while also
> usefully removing junk ([`scripts/rca-rcac-prep#L472-L474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L472-L474)). Inspect the
> synthetic T1 / surfaces, especially for non-standard anatomy.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Every stage is guarded by `UpdateNeeded`; re-runs only
  redo what changed (or everything, with `--force`).
- **Started-subject guard.** Passing `--i` to an already-started subject aborts to
  prevent overwriting the synthesized volumes ([`scripts/rca-rcac-prep#L394-L398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep#L394-L398)).
- **Conform + crop.** The input is force-conformed (256³, 1 mm) and the 266³ RCAC
  outputs are resliced back to 256³, so downstream geometry is always the standard
  conformed grid.
- **Hard exit on any failure** (`if($status) goto error_exit` after each command).
- **Hippocampus/amygdala caveat and default-fix divergence** are documented rather
  than auto-corrected — the user is expected to disable recon-all fixes for
  closest fidelity.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the downstream pipeline; this script prepares its `-autorecon2-wm` entry point.
- [[mri_synthseg]] — contrast-agnostic segmentation+parcellation; run twice here.
- [[mri_synthsr]] — synthesizes the 1 mm T1-like image used for surface placement.
- [[mri_edit_wm_with_aseg]] — fills WM from the segmentation (`-fill-seg-wm`) to build `wm.asegedit.mgz`.
- [[mri_pretess]] — topology cleanup producing the final `wm.mgz`.
- [[seg2cc]] — adds the corpus callosum to the aseg (skipped by `--skip-cc`). *(no wiki page yet)*
- [[wiki/tools/mri_convert|mri_convert]] — conforms/crops/copies the volumes.
- `recon-all-clinical.sh` — the stock RCAC pipeline this script parallels (but is editable); see [[wiki/faq/recon-all-clinical|recon-all-clinical FAQ]].

## Confidence and Gaps

**High confidence:** the complete flag set, the full chain of synthesis +
conventional steps and their outputs, the symlink farm into `mri/rcac/`, the
first-run-vs-re-run `--i` contract, the `--skip-cc` behaviour, the 266³→256³ crop,
and the hand-off to `recon-all -autorecon2-wm -autorecon3` — all read directly from
[`scripts/rca-rcac-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep).

> [!gap] `seg2cc` internals and a few `$subjdir`/`rcac` symlink targets
> [[seg2cc]] was not audited; the assumption that it writes `aseg.auto.mgz` is
> taken from the script's `UpdateNeeded` targets. A few late symlinks reference
> `rcac/conf.mgz` and `rcac/transforms`, which the SynthSurf step is expected to
> have produced; their existence is inferred from the code, not byte-verified.

## References

- FreeSurfer source: [`scripts/rca-rcac-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-rcac-prep) (v8.2.0).
- [[wiki/faq/recon-all-clinical|recon-all-clinical FAQ]] — the stock clinical pipeline this script parallels.
- Billot B, Greve DN, Puonti O, et al. *SynthSeg: Segmentation of brain MRI scans of any contrast and resolution without retraining.* Medical Image Analysis 2023;83:102789.
- Iglesias JE, Billot B, Balbastre Y, et al. *SynthSR: A public AI tool to turn heterogeneous clinical brain scans into high-resolution T1-weighted images for 3D morphometry.* Science Advances 2023;9(5):eadd3607.
