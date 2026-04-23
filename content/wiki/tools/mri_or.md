---
title: "mri_or"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_and/mri_or.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - binary
  - logical
  - mask
---

# mri_or

## Summary

`mri_or` performs a voxel-wise logical OR operation across two or more binary MRI volumes. At each voxel position, the output is nonzero if any of the input volumes is nonzero at that position. Optionally, the original label values from the inputs can be preserved instead of collapsing to a binary output.

## Source Information

- **Language:** C++
- **Source file:** `mri_and/mri_or.cpp` (lives in the `mri_and` directory alongside `mri_and.cpp`)
- **Original author:** Bruce Fischl
- **Key functions:** `MRIor()`, `MRIorVal()`

## Purpose and Context

`mri_or` is a simple utility for combining binary masks or label volumes. It is useful whenever multiple segmentation masks need to be merged — for example, combining left and right hemisphere masks, or merging a white-matter mask with a grey-matter mask to form a brain mask. The tool accepts an arbitrary number of input volumes and produces a single output volume. All inputs must share the same voxel geometry and RAS coordinates.

When a single input volume is provided, `mri_or` binarizes it (all nonzero values become 1, unless `-o` is specified).

## Inputs

- **Input volumes (2+):** Any number of FreeSurfer-readable binary or label volumes with identical geometry. Passed as positional arguments before the output filename.
- All inputs must have the same dimensions, voxel size, and RAS orientation.

## Outputs

- **Output volume:** A single volume with the same geometry as the inputs. Each voxel value is:
  - `1` (binary) if any input is nonzero at that position (default mode)
  - The label value from the first nonzero input at that position (`-o` mode)

## Mathematical Foundations

The logical OR operation:

$$
O(v) = \begin{cases} 1 & \text{if } \exists\, i : I_i(v) \neq 0 \\ 0 & \text{otherwise} \end{cases}
$$

With the `-o` flag (preserve original values via `MRIorVal`):

$$
O(v) = \begin{cases} I_k(v) & \text{where } k = \min\{i : I_i(v) \neq 0\} \\ 0 & \text{otherwise} \end{cases}
$$

## Configuration Options

All flags are parsed from `get_option()`. The tool has very few options.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-o`<br>`-O` | — | off | Preserve original label values rather than binarising output; calls `MRIorVal()` instead of `MRIor()` (`use_orig_value=1`) |
| `--help` | — | — | Print help text and exit |
| `-u`<br>`-U`<br>`-?` | — | — | Print usage and exit |
| `-v`<br>`-V` | — | — | Print version string and exit |

## Configuration Interactions

- `-o` changes the output from a binary (0/1) volume to a label-preserving volume. When multiple inputs share the same voxel position, the label from the first input that has a nonzero value at that position is used.
- Without `-o`, the output is always a binary (0/1) volume regardless of input label values.

## Typical Use Cases

```bash
# Merge two binary masks
mri_or lh_mask.mgz rh_mask.mgz combined_mask.mgz

# Merge three label volumes preserving original labels
mri_or -o seg1.mgz seg2.mgz seg3.mgz merged_labels.mgz

# Binarize a single label volume (any non-zero value becomes 1)
mri_or label_volume.mgz binarized.mgz
```

## Pipeline Context

`mri_or` is not a standard step in the main [[recon-all]] pipeline. It is commonly used in custom post-processing scripts when multiple segmentation masks need to be combined. For example, it can merge hemisphere-specific ribbon masks or combine outputs from different segmentation tools.

## Gotchas and Caveats

> [!gotcha] All inputs must have identical geometry
> The tool calls `MRIor` / `MRIorVal` on volumes sequentially without any resampling. If inputs differ in dimensions or voxel size, the behaviour is undefined (likely a crash or silent misalignment).

> [!gotcha] Single-input mode is a binarizer
> When only one input file is provided (before the output argument), `mri_or` binarizes the volume. This is intentional (documented in the source comments) but non-obvious from the tool name.

> [!gotcha] Source file lives in `mri_and` directory
> Both `mri_or` and `mri_and` are compiled from the same directory (`mri_and/`). The source file for `mri_or` is `mri_and/mri_or.cpp`.

## Related Tools

- [[mri_binarize]] — More flexible binarization with threshold control
- [[mri_segment]] — White-matter segmentation that produces binary masks

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. The flag list is exhaustive; the only meaningful non-trivial option is `-o`.
