---
title: "dmri_neighboringRegions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_neighboringRegions.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_ac.sh]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is a stub — source contains only a TODO comment and prints 'chau'"
  - "Intended functionality is unknown"
tags:
  - diffusion
  - tractography
  - stub
  - anatomicuts
---

# dmri_neighboringRegions

## Summary

`dmri_neighboringRegions` is a stub tool within the AnatomiCuts diffusion MRI pipeline. The current source code contains only a placeholder implementation that prints "chau" (a Spanish informal farewell) and returns. The tool is compiled and installed as a binary but does not perform any meaningful computation.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_neighboringRegions.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_neighboringRegions`
- **Authors:** Alexander Zsikla, Andrew Zhang, Viviana Siless (MGH), Fall 2019

## Purpose and Context

Based on the tool name and its location in the AnatomiCuts pipeline, the intended purpose is likely to identify or analyze anatomically neighboring brain regions along white-matter fiber pathways. However, the implementation has not been completed. The source comment `// TODO` confirms this is unimplemented.

## Inputs

None (the stub ignores all arguments).

## Outputs

Prints `" chau "` to stdout and exits with code 0.

## Mathematical Foundations

Not applicable — no computation is performed.

## Configuration Options

None — all arguments are ignored.

## Typical Use Cases

> [!gotcha] Tool is a non-functional stub
> This tool should not be used in any analysis pipeline. Calling it will produce no useful output.

## Pipeline Context

The tool is part of the AnatomiCuts family. Its intended position in the pipeline is unknown but likely involves post-clustering analysis of neighboring anatomical regions.

## Gotchas and Caveats

> [!gotcha] Stub implementation
> The entire implementation is:
> ```cpp
> int main(int argc, char *argv[]) {
>     // TODO
>     std::cout << " chau " << std::endl;
>     return 0;
> }
> ```
> This binary performs no analysis. It is present in the installed FreeSurfer 8.2.0 distribution despite being unimplemented.

## Related Tools

- [[dmri_AnatomiCuts]] — the core clustering tool in this family
- [[dmri_ac.sh]] — pipeline orchestrator

## Confidence and Gaps

Confidence is high that this tool is a stub. All other aspects (intended functionality, future implementation) are unknown.
