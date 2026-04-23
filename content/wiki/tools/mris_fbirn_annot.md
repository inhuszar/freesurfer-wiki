---
title: "mris_fbirn_annot"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_fbirn_annot/mris_fbirn_annot.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-22
gaps:
  - "FBIRN ROI definition not documented here; external FBIRN documentation required."
  - "Full flag list and exact output format not available."
  - "Tool is in the 'attic' directory, suggesting it may be deprecated or unmaintained."
tags:
  - surface
  - annotation
  - parcellation
  - FBIRN
  - legacy
---

# mris_fbirn_annot

## Summary

`mris_fbirn_annot` creates a cortical surface annotation file using the FBIRN (Function Biomedical Informatics Research Network) ROI parcellation scheme. The FBIRN project defined a set of standardised cortical regions of interest for functional MRI studies. This tool maps those regions onto a subject's surface in FreeSurfer annotation format.

## Source Information

- **Language:** C++
- **Primary source:** `attic/mris_fbirn_annot/mris_fbirn_annot.cpp`
- **Original author:** Douglas Greve (based on template; `mris_fbirn_annot.cpp` was derived from a standard dummy template)

> [!gotcha] Tool is in the attic directory
> The source file is located in `attic/mris_fbirn_annot/`, indicating this tool is legacy, deprecated, or no longer actively maintained in the main FreeSurfer codebase. Use with caution in modern workflows; it may not be built or installed by default.

## Purpose and Context

The FBIRN consortium developed a set of standardised brain ROIs for multi-site fMRI studies to enable reproducible comparison of functional connectivity and activation across sites. `mris_fbirn_annot` provides a way to generate these ROIs as a FreeSurfer surface annotation, enabling surface-based analysis aligned with the FBIRN parcellation.

## Inputs

> [!gap] Inputs not confirmed
> The source file was derived from a template and the BEGINHELP/BEGINUSAGE sections are empty (`BEGINHELP ENDHELP`, `BEGINUSAGE ENDUSAGE`). The actual inputs require reading the full source.

## Outputs

| Output | Description |
|--------|-------------|
| Annotation file (`.annot`) | FreeSurfer annotation mapping FBIRN ROIs to surface vertices. |

## Mathematical Foundations

> [!gap] Algorithm not documented
> The FBIRN ROI mapping algorithm (whether it uses atlas registration, label projection from MNI space, or a hard-coded parcellation) is not documented in the source header. A complete source read is required.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--temp-vol` | `volfile` | — | Template volume file. Stored in `TempVolFile` but not used further in the current source (tool body is a stub). |

> [!gap] Tool is a stub
> The `mris_fbirn_annot` source body is an empty template derived from `dummy.c`. The `--temp-vol` flag is parsed and stored but no processing is performed. The `check_options()` function does nothing. This tool is not functional in its current state.

## Configuration Interactions

> [!gap] Interactions unknown

## Typical Use Cases

> [!gap] No verified example available

## Pipeline Context

`mris_fbirn_annot` is not part of the standard `recon-all` pipeline. It was designed for the FBIRN multi-site fMRI consortium workflow.

## Gotchas and Caveats

> [!gotcha] Legacy tool in attic directory
> This tool is located in the `attic/` directory of the FreeSurfer source tree, which typically contains tools that are no longer actively maintained or have been superseded by newer tools. It may not be compiled or installed in current FreeSurfer distributions.

> [!gotcha] FBIRN project status
> The FBIRN consortium's original ROI definitions were developed in the mid-2000s. The relevance and compatibility of this parcellation with current FreeSurfer atlases (Desikan-Killiany, Destrieux) has not been verified.

## Related Tools

- [[surface-format]] — FreeSurfer annotation format

## Confidence and Gaps

Confidence is **low**. The source file header contained only a standard copyright notice and an empty help template. No algorithmic information, flag list, or usage examples were available from the source excerpt.

> [!gap] Complete source review needed
> Reading the full `mris_fbirn_annot.cpp` source is required to document this tool adequately. The FBIRN ROI definitions and mapping approach are entirely undocumented from the available information.
