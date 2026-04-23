---
title: "mri_entowm_seg"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/mri_entowm_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_sclimbic_seg]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Full argument list for mri_sclimbic_seg passthrough not documented here"
  - "Output segmentation label set not confirmed beyond ctab reference"
tags:
  - segmentation
  - entorhinal
  - white-matter
  - deep-learning
---

# mri_entowm_seg

## Summary

`mri_entowm_seg` is a tcsh wrapper script that segments the entorhinal cortex white matter (EntoWM) region using a deep learning model based on `mri_sclimbic_seg`. It loads a pre-trained model (`entowm.fsm31.t1.nstd00-30.nstd21-108.h5`) and corresponding color table from `$FREESURFER/models/`, and passes arguments through to `mri_sclimbic_seg`. The output is an EntoWM segmentation volume that can be used by `mri_edit_wm_with_aseg` to refine the WM mask.

## Source Information

- **Source language:** tcsh (C shell script)
- **Source file:** `scripts/mri_entowm_seg`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_entowm_seg`
- **DL model:** `$FREESURFER/models/entowm.fsm31.t1.nstd00-30.nstd21-108.h5`
- **Color table:** `$FREESURFER/models/entowm.ctab`
- **Delegates to:** `mri_sclimbic_seg`

## Purpose and Context

The entorhinal cortex and surrounding parahippocampal region contain thin white matter bands that are difficult to delineate with standard WM segmentation. `mri_entowm_seg` provides a specialized segmentation of this region using a deep learning model trained specifically on entorhinal anatomy. The resulting EntoWM volume is consumed by `mri_edit_wm_with_aseg` (via the `-entowm` flag) to ensure the WM volume correctly captures these structures.

## Inputs

Arguments are passed through to `mri_sclimbic_seg`. The wrapper enforces:
- Model file existence: `$FREESURFER/models/entowm.fsm31.t1.nstd00-30.nstd21-108.h5`
- Color table existence: `$FREESURFER/models/entowm.ctab`

Both files must exist or the script exits with an error.

## Outputs

- EntoWM segmentation volume (base name: `entowm`; exact path depends on `mri_sclimbic_seg` arguments passed through)
- Output format and location controlled by sclimbic arguments

The wrapper passes `--output-base entowm` to `mri_sclimbic_seg`, so outputs are named `entowm*.mgz`.

## Mathematical Foundations

The segmentation is performed by the deep learning model via `mri_sclimbic_seg`. The exact architecture is not described in the wrapper script. The model was trained on data labelled `fsm31` (presumably FreeSurfer Manual label set 31) with varying noise standard deviation parameters (`nstd00-30` to `nstd21-108`).

## Configuration Options

All arguments not handled by the wrapper are passed through to `mri_sclimbic_seg`. The wrapper always adds:
- `--no-cite-sclimbic` — suppresses sclimbic citation output
- `--model <model>` — specifies the EntoWM model
- `--keep_ac` — keep anterior commissure
- `--ctab <ctab>` — specifies the EntoWM color table
- `--percentile 99.9` — intensity normalization percentile
- `--vmp` — verbose memory profiling
- `--output-base entowm` — output base name

> [!gap] mri_sclimbic_seg argument passthrough
> Any arguments supported by `mri_sclimbic_seg` can be passed to `mri_entowm_seg` and will be forwarded. These are not documented here.

## Configuration Interactions

- The model and ctab paths are hardcoded relative to `$FREESURFER` (not `$FREESURFER_HOME`). Both must be present.
- `mri_sclimbic_seg` arguments appended by the wrapper (`--no-cite-sclimbic`, `--keep_ac`, etc.) cannot be overridden by the user.

## Typical Use Cases

```bash
# Run EntoWM segmentation on a subject
mri_entowm_seg --s <subject> --sd <SUBJECTS_DIR>

# The output entowm.mgz is then used in mri_edit_wm_with_aseg:
mri_edit_wm_with_aseg -entowm entowm.mgz <level> <lhval> <rhval> \
  wm.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz
```

## Pipeline Context

`mri_entowm_seg` is not a standard `[[recon-all]]` step but is called in modified pipelines that incorporate entorhinal WM refinement. Its output feeds into `[[mri_edit_wm_with_aseg]]` via the `-entowm` flag.

## Gotchas and Caveats

> [!gotcha] Uses $FREESURFER, not $FREESURFER_HOME
> The script sources `$FREESURFER_HOME/sources.csh` if available, but then references `$FREESURFER` for model paths. On some installations `$FREESURFER` and `$FREESURFER_HOME` may differ.

> [!gotcha] Model files must exist
> The script checks for both the model `.h5` file and the `.ctab` file and exits with `ERROR: cannot find <file>` if either is missing.

## Related Tools

- `[[mri_edit_wm_with_aseg]]` — consumes the EntoWM segmentation via `-entowm` flag
- `[[mri_sclimbic_seg]]` — the underlying segmentation tool

## Confidence and Gaps

**Medium confidence:** wrapper logic is fully readable. The underlying `mri_sclimbic_seg` behaviour and model architecture require separate documentation.

> [!note] mri_sclimbic_seg flags are not mri_entowm_seg flags
> The `parse_args` section of `scripts/mri_entowm_seg` only directly handles `--debug`. Every other flag falls through to a `default:` case that appends it to `$sclimbicargs` (line 120) for forwarding to `mri_sclimbic_seg`. The flags `--ctab`, `--i`, `--keep_ac`, `--model`, `--no-cite-sclimbic`, `--o`, `--output-base`, `--percentile`, and `--vmp` are `mri_sclimbic_seg` options that `mri_entowm_seg` hardcodes in its internal invocation (lines 67–69) or that users can pass through — they are **not** flags parsed by `mri_entowm_seg` itself. Automated flag-scanning tools that read the sub-tool invocation at line 67 will erroneously report these as `mri_entowm_seg` flags.
