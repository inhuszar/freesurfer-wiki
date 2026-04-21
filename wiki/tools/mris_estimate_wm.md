---
title: "mris_estimate_wm"
type: tool
fs_version: "8.2.0"
source_language: "unknown"
source_files:
  - "mris_estimate_wm/mris_estimate_wm"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is a compiled binary only (no .cpp found in mris_estimate_wm/) — implementation language and algorithm unknown."
tags:
  - surface
  - white-matter
  - estimation
---

# mris_estimate_wm

## Summary

`mris_estimate_wm` estimates the white matter boundary on a cortical surface. The source directory contains only a binary and a `CMakeLists.txt` — no C++ source file was found in the expected location. Therefore, implementation details are largely unknown. The tool is likely used in the surface generation pipeline to refine the initial white matter boundary estimate.

## Source Information

- **Language:** Unknown (binary only in source tree)
- **Source location:** `mris_estimate_wm/` (binary: `mris_estimate_wm/mris_estimate_wm`, `CMakeLists.txt`)
- **No .cpp source found** in `mris_estimate_wm/`

> [!gap] Source not available
> Only a compiled binary was found in `mris_estimate_wm/`. The implementation language, algorithm, inputs, outputs, and flags are unknown without running the binary or locating the source elsewhere in the tree.

## Purpose and Context

Based on the tool name, `mris_estimate_wm` likely refines or estimates the white matter surface boundary as part of the cortical surface generation pipeline. This would fit between initial WM segmentation and surface tessellation/smoothing steps.

## Inputs

> [!gap] Unknown — no source available

## Outputs

> [!gap] Unknown — no source available

## Mathematical Foundations

> [!gap] Algorithm unknown

## Configuration Options

> [!gap] Flags unknown

## Configuration Interactions

Unknown.

## Typical Use Cases

```bash
# Check available options
mris_estimate_wm --help 2>&1
```

## Pipeline Context

Likely used in the surface generation pipeline around [[mri_segment]] and [[mris_smooth]] stages of `recon-all`. Exact placement unknown.

## Gotchas and Caveats

> [!gotcha] Binary-only in source tree
> The absence of source code makes it impossible to document this tool accurately. The binary may wrap a Python script or call another compiled binary.

## Related Tools

- [[mri_segment]] — white matter segmentation
- [[mris_smooth]] — surface smoothing
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident:** Tool name, binary exists in source tree.

**Uncertain:** Everything else.

> [!gap] Full documentation requires binary execution or source location
> Run `mris_estimate_wm --help` to obtain the actual interface. This page should be updated after running the tool.
