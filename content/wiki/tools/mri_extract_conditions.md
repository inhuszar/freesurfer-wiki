---
title: "mri_extract_conditions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_extract_conditions/mri_extract_conditions.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_concat]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/; detrending algorithm details not fully documented"
tags:
  - fmri
  - time-series
  - conditions
  - legacy
---

# mri_extract_conditions

## Summary

`mri_extract_conditions` extracts condition-specific frames from a 4D fMRI time-series volume based on a paradigm file that assigns each time point to a condition. It reads the input 4D volume and a paradigm file (with one row per time point specifying time and condition index), then selects or averages frames corresponding to specific experimental conditions and writes them to an output volume. An optional detrending step is also available.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_extract_conditions/mri_extract_conditions.cpp`
- **Note:** Source is in `attic/`; may be legacy/deprecated
- **Key dependencies:** `mri.h`, `matrix.h`

## Purpose and Context

In fMRI analysis, it is sometimes useful to extract and average the volumes corresponding to a specific experimental condition. This tool reads a paradigm file (format: `timepoint  condition_index`) and selects the corresponding frames from the 4D MRI time series. It was likely used in early FreeSurfer fMRI analysis workflows.

## Inputs

Positional arguments (in order):
1. Input 4D volume (`.mgz` or other supported format)
2. Paradigm file — ASCII file with `mri_in->nframes` rows, each row: `<timepoint_value> <condition_index>`
3. Output volume path

The paradigm file format: each line contains a float timepoint and an integer condition index.

## Outputs

- Output volume at specified path containing frames for the selected condition(s).

## Mathematical Foundations

The tool builds condition index vectors by reading the paradigm file:

```
conditions[t] = condition_index_at_timepoint_t
timepoints[t] = timepoint_value_at_timepoint_t
```

`MRIextractConditions(mri_in, conditions, mri_out)` selects or averages the frames matching a specific condition.

Optional detrending: `MRIdetrendVolume(mri_in, conditions, mri_out)` removes a polynomial trend from the time series before extraction.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-d` | — | off | Detrend the time series before extracting conditions. The help text shows this as `-detrend` but the parser matches only the first character (`D`), so both `-d` and `-detrend` are accepted. |

## Configuration Interactions

- `-d` (`-detrend`) is applied before condition extraction.

## Typical Use Cases

```bash
# Extract condition 1 frames from an fMRI run
mri_extract_conditions fmri.mgz paradigm.par condition1.mgz

# Detrend before extraction (-d and -detrend both work)
mri_extract_conditions -d fmri.mgz paradigm.par condition1.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Legacy fMRI utility. Modern FreeSurfer fMRI analysis uses different workflows.

## Gotchas and Caveats

> [!gotcha] Source in attic/
> Legacy code; may not be maintained in future releases.

> [!gotcha] Paradigm file must have exactly nframes rows
> The tool reads exactly `mri_in->nframes` rows from the paradigm file and exits with `ERROR_BADFILE` if any row is missing or malformed.

## Related Tools

- `[[mri_concat]]` — concatenates volumes (can be used to re-combine extracted conditions)

## Confidence and Gaps

**Medium confidence:** main function logic confirmed from source. Extraction algorithm details require reading `MRIextractConditions()` in the library.
