---
title: "wmsaseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/wmsaseg"
families: []                     # standalone multispectral segmentation utility
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_label]]"
  - "[[mri_edit_segmentation_with_surfaces]]"
  - "[[mri_segstats]]"
  - "[[mri_vol2vol]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact WMSA label numbers written by mri_ca_label -wmsa (the script only quotes ids 78/79 for the per-mode intensity stats, and the GCA's full WMSA label set) were not enumerated from the GCA/atlas; 78/79 are taken from the script."
  - "The --halo1/--halo2 behaviour of mri_edit_segmentation_with_surfaces (-halo1/-halo2) — how large a halo and what it does to WMSA voxels near the GM/WM boundary — is internal to that tool and not traced."
tags:
  - segmentation
  - wmsa
  - white-matter
  - multispectral
  - gca
  - experimental
---

# wmsaseg

## Summary

`wmsaseg` segments **white-matter signal abnormalities (WMSA)** — the
hyperintense white-matter lesions seen in ageing and small-vessel disease — using
a **multi-spectral** Bayesian atlas classifier. It takes the subject's T1 (from
the existing FreeSurfer stream) together with a co-registered **T2** and **proton-
density (PD)** volume, registers the T2/PD to the anatomical with [[bbregister]],
intensity-normalizes all three channels against a dedicated WMSA atlas with
[[mri_ca_normalize]], labels the volume with [[mri_ca_label]] in its `-wmsa`
mode, refines the result against the cortical surfaces with
[[mri_edit_segmentation_with_surfaces]], and finally reports WMSA volumes and
per-channel intensities with [[mri_segstats]]. It is an **experimental** tool —
the header says "still under development. Use at your own risk."

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/wmsaseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/wmsaseg`
- **WMSA atlas (GCA):** `$FREESURFER_HOME/average/wmsa_new_eesmith.gca` (default; overridable with `--gca`)
- **FreeSurfer tools invoked:** [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L84) (T2→anatomical registration), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L95) (apply registration to T2/PD), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L100) (cast to uchar), [`mri_ca_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L146) (multispectral intensity normalization), [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L160) (atlas labelling with `-wmsa`), [`mri_edit_segmentation_with_surfaces`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L168) (surface-based cleanup), and [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L177) (volume + intensity stats). Uses the helper `UpdateNeeded`.

## Purpose and Context

On a standard T1-only FreeSurfer reconstruction, WMSA (white-matter
hyperintensities) are difficult to distinguish from normal-appearing white matter,
and the default `aseg` collapses them into a single "WM-hypointensities" class.
WMSA are much more conspicuous on **T2-weighted** and **proton-density** images,
where they appear hyperintense relative to normal white matter. `wmsaseg`
exploits this by running a **multi-channel** (T1 + T2 + PD) version of FreeSurfer's
GCA (Gaussian Classifier Array) pipeline with a special atlas trained to model
the WMSA tissue class.

The processing chain mirrors the recon-all subcortical-segmentation stream but in
three channels:

1. **Register** the T2 to the subject's anatomical with [[bbregister]] (boundary-
   based registration), and apply the same transform to the PD; cast both to
   8-bit.
2. **Normalize** intensities of T1/PD/T2 jointly against the WMSA GCA with
   [[mri_ca_normalize]].
3. **Label** the normalized multispectral volume with [[mri_ca_label]] in
   `-wmsa` mode, which adds explicit WMSA classes the standard atlas lacks.
4. **Refine** the labels using the cortical surfaces
   ([[mri_edit_segmentation_with_surfaces]]) to remove obvious mislabels near the
   GM/WM boundary.
5. **Quantify** WMSA volume (and total/intracranial reference volumes) and the
   per-channel mean intensity within the WMSA labels with [[mri_segstats]].

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is a research
add-on run after a normal reconstruction, requiring extra T2 and PD acquisitions.

> [!gotcha] Experimental — explicitly "use at your own risk"
> The help opens with *"This program is still under development. Use at your own
> risk."* ([`scripts/wmsaseg:384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L384)) and even contains in-source notes that
> [[mri_ca_normalize]] can **saturate** `T1.canorm.mgz` with certain atlas/LTA
> combinations ([`scripts/wmsaseg:391-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L391-L397)). Treat outputs as provisional.

## Inputs

### Required Inputs

- **Subject ID** (`--s`) — a fully reconstructed `$SUBJECTS_DIR/<subj>` directory.
  The script relies on recon-all products: `mri/brainmask.mgz`, `mri/norm.mgz`,
  `mri/nu.mgz`, the Talairach transforms (`talairach.lta`, `talairach.m3z`), and
  the cortical surfaces in `surf/`.
- **T2 volume** — `mri/orig/T2.mgz` (falling back to `mri/T2.mgz`); by default
  read from the subject itself, or from `--s+orig`/`--s+long`
  ([`scripts/wmsaseg:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L74), [`scripts/wmsaseg:332-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L332-L341)).
- **PD volume** — `mri/orig/PD.mgz` (falling back to `mri/PD.mgz`)
  ([`scripts/wmsaseg:75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L75)).
- **WMSA GCA atlas** — `$FREESURFER_HOME/average/wmsa_new_eesmith.gca` (default),
  existence checked ([`scripts/wmsaseg:342-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L342-L345)).

The help spells out the setup: *"put T2.mgz and PD.mgz into subject/mri/orig, then
run `wmsaseg --s subject`"* ([`scripts/wmsaseg:386-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L386-L388)).

### Input Assumptions

> [!assumption] A finished recon-all subject plus co-acquired T2 and PD
> `wmsaseg` assumes a complete reconstruction (brainmask, norm, nu, Talairach
> linear+nonlinear transforms, and white/pial surfaces all present) **and** that
> T2 and PD images of the same subject are available. The T2/PD need not be
> pre-registered — [[bbregister]] aligns them — but they should be of the same
> head. The WMSA GCA encodes the expected intensity relationships, so the T2/PD
> contrast must be reasonably standard.

- The T2 and PD are cast to **uchar** (8-bit) after registration
  ([`scripts/wmsaseg:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L100), [`scripts/wmsaseg:114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L114)), matching the atlas's expected dynamic
  range.
- In longitudinal use, `--s+long` derives the cross-sectional `origsubject` by
  stripping `.long.<base>` from the timepoint ID
  ([`scripts/wmsaseg:327-330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L327-L330)), so the T2/PD are pulled from the base subject.

## Outputs

### Files Created

All outputs go to `mri/<outsub>/` where `<outsub>` defaults to `wmsa` (set by
`--sub`); `mdir = mri`:

| File | Where | Contents |
|------|-------|----------|
| `T2.anat.mgz`, `PD.anat.mgz` | `mri/` | T2/PD resampled into anatomical space and cast to uchar |
| `T2.register.lta` | `mri/` | boundary-based T2→anatomical registration ([[bbregister]]) |
| `T1.canorm.mgz`, `T2.canorm.mgz`, `PD.canorm.mgz` | `mri/wmsa/` | the three channels after multispectral [[mri_ca_normalize]] |
| `ctrl_pts.wmsa.mgz` | `mri/wmsa/` | control points chosen by [[mri_ca_normalize]] (`-c`) |
| `wmsa.mgz` | `mri/wmsa/` | the raw WMSA segmentation from [[mri_ca_label]] `-wmsa` |
| `wmsa.edited.mgz` | `mri/wmsa/` | WMSA segmentation after surface-based refinement ([[mri_edit_segmentation_with_surfaces]]) — the **main result** |
| `wmsa.stats` | `mri/wmsa/` | per-structure volumes incl. WMSA, with eTIV and gray/WM reference volumes ([[mri_segstats]]) |
| `wmsa.T1.dat`, `wmsa.T2.dat`, `wmsa.PD.dat` | `mri/wmsa/` | mean intensity of WMSA labels (ids 78, 79) in each channel |
| `wmsaseg.log` | `mri/wmsa/` | command log |

### Output Specifications

- All volumes are on the conformed FreeSurfer anatomical grid (256³ 1 mm; see
  [[mgz]]). `wmsa.mgz`/`wmsa.edited.mgz` are integer-labelled, using the WMSA
  GCA's label set (which extends the standard aseg labels with explicit WMSA
  classes; the script references WMSA ids **78** and **79** for the per-channel
  intensity stats, [`scripts/wmsaseg:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L192)).
- `wmsa.stats` is the standard [[mri_segstats]] summary table (volume in mm³,
  with `--etiv`, `--surf-wm-vol`, `--surf-ctx-vol`, `--totalgray` reference
  measures), interpreted with `$FREESURFER_HOME/ASegStatsLUT.txt`.

## Mathematical Foundations

`wmsaseg` is an orchestration script; the statistical model lives entirely in the
GCA tools. The core is **multispectral Bayesian tissue classification**:

> [!math] Multispectral GCA labelling
> [[mri_ca_label]] assigns each voxel $x$ the label $\ell$ maximizing the
> posterior under a per-location Gaussian model over the **vector** of channel
> intensities $\mathbf{I}(x)=(I_{T1},I_{PD},I_{T2})$:
> $$\hat{\ell}(x) = \arg\max_{\ell}\; p_{\ell}(\mathbf{x})\,
>   \mathcal{N}\!\big(\mathbf{I}(x)\,;\,\boldsymbol{\mu}_{\ell}(\mathbf{x}),\,
>   \boldsymbol{\Sigma}_{\ell}(\mathbf{x})\big),$$
> where $p_\ell$, $\boldsymbol{\mu}_\ell$, $\boldsymbol{\Sigma}_\ell$ come from
> the WMSA GCA after non-linear alignment (`talairach.m3z`). The `-wmsa` flag
> activates the WMSA tissue class; `-regularize 0.9` regularizes the covariance
> estimates ([`scripts/wmsaseg:160-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L160-L161)). The multi-channel input is what lets
> WMSA (bright on T2/PD) separate from normal WM.

> [!internal] Normalization, classification, and surface editing are in the GCA library
> The intensity normalization (canonical-intensity matching to the atlas) is in
> [[mri_ca_normalize]]; the EM/MAP labelling is in [[mri_ca_label]]; and the
> surface-constrained relabelling (`-halo1`/`-halo2`) is in
> [[mri_edit_segmentation_with_surfaces]]. `wmsaseg` only wires them together and
> supplies the WMSA atlas. See those pages for the algorithms.

The script itself performs only registration bookkeeping and timing; no arithmetic
beyond `UpdateNeeded` timestamp checks.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/wmsaseg:214-307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L214-L307)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--s+orig` | string | — | Take T2 and PD from a different `origsubject` (e.g. a longitudinal base). Useful when the timepoint lacks its own T2/PD ([`scripts/wmsaseg:227-230`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L227-L230)). |
| `--s+long` | bool | off | Derive `origsubject` by stripping `.long.<base>` from `--s`, then take T2/PD from it ([`scripts/wmsaseg:232-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L232-L234), [`scripts/wmsaseg:327-330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L327-L330)). |
| `--sub`<br>`--subdir` | string | `wmsa` | Output sub-directory under `mri/` ([`scripts/wmsaseg:236-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L236-L240)). |
| `--gca` | string | `$FREESURFER_HOME/average/wmsa_new_eesmith.gca` | Override the WMSA GCA atlas used for both normalization and labelling. |
| `--init-spm` | bool | FSL (`--init-fsl`) | Initialize the [[bbregister]] T2→anat registration with SPM instead of FSL ([`scripts/wmsaseg:242-244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L242-L244)). |
| `--no-reg` | bool | register on | Skip the T2/PD→anatomical registration step (assume `T2.anat.mgz`/`PD.anat.mgz` already exist) ([`scripts/wmsaseg:251-253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L251-L253)). |
| `--reg-only` | bool | off | Do the registration and then **exit** (no normalization/labelling) ([`scripts/wmsaseg:255-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L255-L257), [`scripts/wmsaseg:121-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L121-L132)). |
| `--no-canorm` | bool | canorm on | Skip [[mri_ca_normalize]] (e.g. if you normalized with another tool and the `*.canorm.mgz` files already exist) ([`scripts/wmsaseg:267-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L267-L269)). |
| `--halo1` | bool | off | Pass `-halo1` to [[mri_edit_segmentation_with_surfaces]] (surface-halo refinement, mode 1) ([`scripts/wmsaseg:259-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L259-L261)). |
| `--halo2` | bool | off | Pass `-halo2` to [[mri_edit_segmentation_with_surfaces]] (mode 2). |
| `--tmpdir` | string | auto (`fs_temp_dir`) | Use a specific temporary directory; also disables cleanup. |
| `--nocleanup` | bool | cleanup on | Keep the temporary directory. |
| `--cleanup` | bool | on | Remove the temporary directory at the end (default). |
| `--log` | string | `<outdir>/wmsaseg.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--reg-only` reports completion but does not hard-stop in this version
> The `RegOnly` branch prints "Registration only requested, so exiting now",
> cleans up, and logs run-time ([`scripts/wmsaseg:121-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L121-L132)) — but the `if($RegOnly)`
> block contains **no `exit`**, so execution falls through into the normalization
> and labelling steps anyway. In practice the registration outputs are reused and
> the rest still runs. If you truly want registration only, combine with the
> registration outputs already present and inspect the log; do not rely on
> `--reg-only` to terminate early (see [Confidence and Gaps](#confidence-and-gaps)).

> [!gotcha] `--no-reg` and `--no-canorm` assume prior outputs exist
> Skipping registration requires `T2.anat.mgz`/`PD.anat.mgz` to be present
> already; skipping normalization requires the `T1/T2/PD.canorm.mgz` files. With
> neither produced, the downstream [[mri_ca_label]] step will fail on missing
> inputs. These flags are for re-running a partially completed job.

> [!gotcha] PD reuses the T2 registration
> The script forces `pdreg = $t2reg` ([`scripts/wmsaseg:90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L90)) — the PD is
> aligned with the **T2's** boundary-based transform, on the assumption that T2
> and PD are co-acquired (often a dual-echo sequence). The in-source comment notes
> "this will not always be the case." If your PD is not co-registered with the T2,
> this is wrong.

- **Resume / skip-if-done.** If `mri/wmsa/wmsa.edited.mgz` already exists, the
  whole run is skipped at `check_params` ("Results ... already exist, skipping",
  [`scripts/wmsaseg:323-326`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L323-L326)). Delete it (or use a fresh `--sub`) to recompute.
- **`UpdateNeeded` gating.** The registration and its application are each skipped
  when their outputs are newer than the inputs ([`scripts/wmsaseg:83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L83), [`scripts/wmsaseg:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L93), [`scripts/wmsaseg:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L107)),
  so re-runs are cheap but can mask the effect of changed options.

## Typical Use Cases

### 1. Standard WMSA segmentation

```bash
# Put T2 and PD into the subject first:
cp T2.mgz $SUBJECTS_DIR/subj01/mri/orig/T2.mgz
cp PD.mgz $SUBJECTS_DIR/subj01/mri/orig/PD.mgz
# Then segment:
wmsaseg --s subj01
# Main result: $SUBJECTS_DIR/subj01/mri/wmsa/wmsa.edited.mgz
# Volume: .../wmsa/wmsa.stats
```

### 2. Longitudinal timepoint (T2/PD from the base)

```bash
# Timepoint subj01.long.subj01_base lacks its own T2/PD; pull from the base:
wmsaseg --s subj01.long.subj01_base --s+long
```

### 3. SPM-initialized registration into a custom subdir

```bash
wmsaseg --s subj01 --init-spm --sub wmsa_spm
```

### 4. Re-label only (registration and normalization already done)

```bash
wmsaseg --s subj01 --no-reg --no-canorm
```

## Pipeline Context

`wmsaseg` is a stand-alone, post-reconstruction research add-on. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all` (grep of both
returns nothing). It both consumes recon-all outputs and re-uses the same GCA
machinery in a multispectral configuration.

**Predecessor:** a complete [[wiki/pipelines/recon-all|recon-all]] run (norm, nu,
brainmask, Talairach transforms, surfaces) **plus** co-acquired T2 and PD images
→ **wmsaseg** → **Successor:** group analysis or QC of the WMSA segmentation;
WMSA volumes from `wmsa.stats` (e.g. tabulated with `asegstats2table`), or
visual inspection of `wmsa.edited.mgz` overlaid on the anatomical.

## Gotchas and Caveats

> [!gotcha] Known normalization failure mode
> The in-source comment documents that [[mri_ca_normalize]] can **saturate**
> `T1.canorm.mgz` with the WMSA `.lta`/GCA combination, and gives an alternate
> recipe using `RB_all_2008-03-26.gca` that "works"
> ([`scripts/wmsaseg:391-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L391-L397)). If the normalized T1 looks saturated, the
> downstream labels are unreliable.

> [!gotcha] Large blocks of commented-out validation code
> Most of the `BEGINHELP` is the author's `tkregister2`/`mri_vol2vol` snippets for
> checking the various registrations and the WMSA `.lta`
> ([`scripts/wmsaseg:399-457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L399-L457)). They reference developer-local paths and are
> for debugging only — not part of the normal workflow.

> [!gotcha] Output is keyed to `wmsa.edited.mgz` existence
> Because the resume check keys on `wmsa.edited.mgz`, an interrupted run that got
> as far as that file will be considered "done" and skipped on the next
> invocation. Remove it to force a full recompute.

## Error Compensation and Guard Rails

- **Skip-if-complete.** Existing `wmsa.edited.mgz` short-circuits the run
  ([`scripts/wmsaseg:323-326`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L323-L326)).
- **Input fallbacks.** T2/PD are looked for in `mri/orig/` first, then `mri/`,
  before erroring ([`scripts/wmsaseg:332-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L332-L341)).
- **Existence checks** for subject, T2, PD, and GCA before processing
  ([`scripts/wmsaseg:315-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L315-L345)).
- **Timestamp gating** (`UpdateNeeded`) avoids redundant registration work.
- **Cast to uchar.** T2/PD are converted to 8-bit after resampling
  ([`scripts/wmsaseg:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L100), [`scripts/wmsaseg:114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L114)) — a silent dtype change to match the atlas;
  out-of-range intensities will be clipped.
- **Fail-fast** on every called tool's non-zero exit ([`scripts/wmsaseg:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L87), [`scripts/wmsaseg:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L98), [`scripts/wmsaseg:150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L150), [`scripts/wmsaseg:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L164), [`scripts/wmsaseg:174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L174), [`scripts/wmsaseg:186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L186)).

## Related Tools

- [[bbregister]] — registers the T2 (and, via reuse, PD) to the anatomical.
- [[mri_ca_normalize]] — multispectral intensity normalization against the WMSA atlas.
- [[mri_ca_label]] — the multispectral GCA classifier; `-wmsa` adds the WMSA class.
- [[mri_edit_segmentation_with_surfaces]] — surface-constrained cleanup of the WMSA labels (`-halo1`/`-halo2`).
- [[mri_segstats]] — WMSA volume and per-channel intensity statistics.
- [[mri_vol2vol]] / [[wiki/tools/mri_convert|mri_convert]] — resample and cast the T2/PD into anatomical space.
- [[wiki/pipelines/recon-all|recon-all]] — must run first to provide the T1 stream, transforms, and surfaces.

## Confidence and Gaps

**High confidence:** complete flag set, the full processing chain and the
intermediate/output files, the experimental status and the saturation caveat, the
PD-reuses-T2-registration behaviour, the uchar casting, the resume-on-existing
behaviour, and the multispectral nature of the classification — all read directly
from [`scripts/wmsaseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg).

> [!gap] `--reg-only` does not actually exit
> The `RegOnly` block prints/cleans/logs but has no `exit` statement
> ([`scripts/wmsaseg:121-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L121-L132)), so the script proceeds to normalization and
> labelling. This looks like a latent bug; flagged for developer confirmation.

> [!gap] Full WMSA label set
> The script only quotes WMSA ids **78** and **79** (for the per-channel intensity
> stats, [`scripts/wmsaseg:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L192)). The complete set of WMSA labels emitted by
> `mri_ca_label -wmsa` is defined in the GCA/atlas and was not enumerated here.

> [!gap] `--halo1`/`--halo2` semantics
> What the halo modes do inside
> [[mri_edit_segmentation_with_surfaces]] (halo size, which voxels are
> reconsidered) is internal to that tool and not traced.

## References

- FreeSurfer source: [`scripts/wmsaseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg) (v8.2.0).
- Built-in help: `wmsaseg --help` (the `BEGINHELP` block, [`scripts/wmsaseg:382-457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L382-L457)), which is mostly developer validation snippets.
- WMSA atlas: `$FREESURFER_HOME/average/wmsa_new_eesmith.gca` (the "eesmith" WMSA GCA; the help references an original training path under a developer home, [`scripts/wmsaseg:400`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wmsaseg#L400)).
