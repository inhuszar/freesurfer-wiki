---
title: "mri_add_xform_to_header"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_add_xform_to_header/mri_add_xform_to_header.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - header
  - transform
  - metadata
---

# mri_add_xform_to_header

## Summary

`mri_add_xform_to_header` embeds a transform filename into a volume's header. For MGH/MGZ volumes, this stores the path to a transform file (e.g., a Talairach transform) as the `transform_fname` field. The volume data itself is not modified; only the header metadata is updated.

## Source Information

- **Language:** C++
- **Source file:** `mri_add_xform_to_header/mri_add_xform_to_header.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

FreeSurfer volume headers (MGH/MGZ format) contain a `transform_fname` field that records the path to a spatial transformation associated with the volume (typically the Talairach transform). Some downstream tools read this field to determine how to interpret the volume in atlas space. `mri_add_xform_to_header` provides a minimal way to set this field without requiring a full `mri_convert` call.

This tool is occasionally used in the `recon-all` pipeline to associate a Talairach transform with a volume after registration.

## Inputs

| Argument | Description |
|----------|-------------|
| `<xform>` | Path to the transform file to be stored in the header |
| `<input>` | Input volume (MGH/MGZ, or a COR directory) |
| `<output>` | (optional) Output file; if omitted, the input file is overwritten |

> [!assumption] Format constraint
> Only MGH and MGZ formats support storing the transform filename in the header. If the input is any other format (as detected by file extension), the tool exits with an error: "currently only .mgz or .mgh saves transform name".

## Outputs

- An MGH/MGZ volume with the `transform_fname` header field set to the specified transform path.
- If the input is a COR directory, the `.info` file is updated instead.
- If no output path is specified, the input file is modified in place.

## Mathematical Foundations

No transformation is applied to the image data. The tool only sets:

```
mri->transform_fname = xform_fname
```

When `-s` is NOT used (i.e., normal mode), the transform is also loaded and validated by calling `input_transform_file()` — this verifies that the transform file is readable and internally consistent. The linear and inverse linear transform pointers are set from the loaded transform structure, then freed. The in-memory transform is not written to the output volume; only the filename string is stored.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | path | required | Transform file path |
| (positional 2) | path | required | Input volume or COR directory |
| (positional 3) | path | — | Output volume (default: overwrite input) |
| `-c` | flag | off | Copy name only (do not load/validate the transform) |
| `-v` | flag | off | Verbose output |
| `-n` | any 1 arg | — | **No-op.** Consumes one argument token (`nargs=1`) without assigning it to any variable. Stubbed-out option. |

> [!gotcha] In-place overwrite
> If only two positional arguments are given, the input file is overwritten silently. There is no confirmation prompt.

## Configuration Interactions

- `-c` (copy-name-only) skips the `input_transform_file()` call, storing the filename string without validating that the transform file is readable. This allows storing a transform path that may not yet exist on disk.

## Typical Use Cases

```bash
# Store Talairach transform path in volume header
mri_add_xform_to_header talairach.xfm orig.mgz orig_with_xform.mgz

# Overwrite header in place
mri_add_xform_to_header talairach.xfm orig.mgz

# Copy name only (no validation of transform file)
mri_add_xform_to_header -c talairach.xfm orig.mgz
```

## Pipeline Context

Used in `recon-all` after Talairach registration to associate the Talairach transform with `orig.mgz` and related volumes. Specifically called to set the `transform_fname` field so that tools like `mri_normalize` can find the transform without an explicit argument.

## Gotchas and Caveats

- Works only with MGH/MGZ volumes (and legacy COR directories). NIfTI and other formats are not supported.
- When no output file is given, the input is modified in place — there is no automatic backup.
- The `-c` flag changes the behaviour from "load and embed the transform name" to "embed just the name string", useful when the transform is being prepared but not yet written.
- The transform file is loaded purely for validation; its content is not written into the volume header (only the path string is stored).

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — general volume conversion, also supports adding transforms
- [[mri_info]] — inspect the `transform_fname` and other header fields

## Confidence and Gaps

**High confidence:** behaviour is clear from the source code.
