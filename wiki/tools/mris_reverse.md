---
title: "mris_reverse"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_reverse/mris_reverse.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_rotate]]"
  - "[[mris_transform]]"
  - "[[mris_left_right_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - hemisphere
  - reflection
  - coordinates
---

# mris_reverse

## Summary

`mris_reverse` reverses (reflects) a cortical surface along one of the three coordinate axes (X, Y, or Z). By default it reflects along the X axis, which is the left-right axis in FreeSurfer RAS coordinates, effectively flipping a left hemisphere surface to a right hemisphere orientation (or vice versa). This is used to produce a mirrored surface for cross-hemisphere registration studies.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_reverse/mris_reverse.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_reverse`

## Purpose and Context

Bilateral symmetry analysis requires comparing left and right hemisphere surfaces in a common coordinate frame. `mris_reverse` flips a surface across a coordinate axis to bring it into the same orientation as the opposite hemisphere. For example, reflecting the left hemisphere's sphere across the X axis produces a "mirrored left" sphere that can be registered to the right hemisphere atlas using standard tools like [[mris_register]].

This is also useful for quality control of surface normals — since reflecting a surface inverts the handedness of face winding, the normals need to be recomputed or explicitly reversed.

## Inputs

### Required Inputs

(Positional arguments: `<input surface> <output surface>`)

- **`<input surface>`** — FreeSurfer binary surface file, or with `-p`, a patch file (preceded by the `.orig` surface read from the same directory).
- **`<output surface>`** — destination for the reversed surface.

### Input Assumptions

> [!assumption] Patch mode requires standard directory layout
> When `-p` (patch mode) is used, the tool reads the `.orig` surface from `<path>/<hemi>.orig` (derived from the input patch filename), then reads the patch on top of that surface. The hemisphere and path are parsed from the patch filename.

## Outputs

### Files Created

- **Reversed surface** — written to `<output surface>` in FreeSurfer binary surface format (`MRIS_TRIANGULAR_SURFACE` type). The surface type is explicitly set to `MRIS_TRIANGULAR_SURFACE` before writing.
- In patch mode (`-p`), the output is written as a patch file using `MRISwritePatch()`.

## Mathematical Foundations

The reflection operation applied by `MRISreverse()` negates one coordinate component for all vertices:

- Default (`REVERSE_X`): $(x, y, z) \to (-x, y, z)$ — reflects across the YZ plane (left-right reflection in RAS).
- `-y` (`REVERSE_Y`): $(x, y, z) \to (x, -y, z)$ — reflects across the XZ plane.
- `-z` (`REVERSE_Z`): $(x, y, z) \to (x, y, -z)$ — reflects across the XY plane.

After negating vertex positions, `MRISreverse()` also reverses face winding order (vertex order within each face is reversed) to maintain outward-facing normals. The `1` argument to `MRISreverse(mris, which, 1)` enables this normals correction.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-p` | boolean | false | Patch mode: interpret input as a surface patch file (reads `.orig` surface from same directory first). Output is written as a patch. |
| `-y` | boolean | false | Reverse along the Y axis instead of the default X axis. |
| `-z` | boolean | false | Reverse along the Z axis instead of the default X axis. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

- `-y` and `-z` are mutually exclusive; the last one specified takes effect (as they set the `which` variable). Specifying both will use `REVERSE_Z` since `-z` is parsed after `-y` in the switch statement.
- `-p` is independent of the axis flags; it only changes the I/O mode (surface vs. patch).

> [!gotcha] Default is X-axis reflection
> If no axis flag is given, X-axis reflection is used. This is the standard left-right flip and is the appropriate default for hemisphere-mirroring applications.

## Typical Use Cases

### Use Case 1: Flip left hemisphere sphere for bilateral analysis

```bash
mris_reverse lh.sphere rh.sphere.mirrored
```

Reflects the left hemisphere sphere across the X axis, producing a mirrored surface in right hemisphere orientation.

### Use Case 2: Reverse a surface patch

```bash
mris_reverse -p lh.occipital.patch lh.occipital.reversed.patch
```

## Pipeline Context

`mris_reverse` is not called by standard `recon-all`. It is used in bilateral registration workflows:

1. Generate spherical registrations for both hemispheres with [[mris_sphere]].
2. Mirror one hemisphere's sphere with `mris_reverse`.
3. Register the mirrored sphere to the opposite hemisphere atlas with [[mris_register]].

**Related pipeline:** [[mris_left_right_register]] uses this concept for whole-hemisphere bilateral registration.

## Gotchas and Caveats

> [!gotcha] Face winding is reversed
> Reflecting a surface inverts the handedness of the mesh. `MRISreverse()` corrects this by reversing the vertex order within each face, maintaining consistent outward-facing normals. However, downstream tools that rely on winding order should be verified.

> [!gotcha] Output type forced to MRIS_TRIANGULAR_SURFACE
> The source explicitly sets `mris->type = MRIS_TRIANGULAR_SURFACE` before writing. This overrides any other surface type (e.g., `MRIS_BINARY_QUADRANGLE_FILE`) that the input surface may have had.

## Related Tools

- [[mris_rotate]] — rotates a surface; complement to reflection
- [[mris_transform]] — applies linear transforms (LTA) to surface vertices
- [[mris_left_right_register]] — performs bilateral spherical registration using hemisphere mirroring

## Confidence and Gaps

Confidence is **high**. The source is short and fully read. The axis flags, patch mode, and face winding correction are all clearly implemented.
