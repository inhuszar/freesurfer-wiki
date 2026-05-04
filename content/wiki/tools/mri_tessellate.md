---
title: "mri_tessellate"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_tessellate/mri_tessellate.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_pretess]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Surface RAS coordinate offset formula (voxel-to-surfaceRAS) — MRIvoxelToSurfaceRAS() not traced in detail"
  - "MAXV=10000000 cap: consequences for very dense surfaces not explored"
tags:
  - tessellation
  - surface
  - autorecon2
---

# mri_tessellate

## Summary

`mri_tessellate` creates a triangulated surface mesh from a binary volume by
extracting the boundary of all voxels with a given label value using a 6-
connected boundary extraction algorithm. The output is a FreeSurfer binary
surface file (typically `?h.orig.nofix`) in **surface RAS** coordinates. It is
the tool that converts the volumetric WM segmentation into the initial cortical
surface representation.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_tessellate/mri_tessellate.cpp` (720 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_tessellate`

## Purpose and Context

`mri_tessellate` is the step that instantiates the FreeSurfer surface model
from volumetric data. Its output — `?h.orig.nofix` — is the starting surface
for all subsequent surface processing stages: smoothing, inflation, spherical
mapping, parcellation, pial surface placement, and morphometric analysis.

The "nofix" in the output name indicates that the surface has not yet been
topologically corrected; it may contain handles and holes that the topology
fixer (`mris_fix_topology`) addresses in a later stage.

`mri_tessellate` must always be preceded by [[mri_pretess]] on the input
volume. Without `mri_pretess`, edge/corner-only adjacencies produce degenerate
surface triangles.

## Inputs

### Required Inputs

| Argument | Description |
|----------|-------------|
| `invol` | Input volume (topology-fixed filled hemisphere, e.g., `filled-pretess255.mgz`) |
| `labelvalue` | Integer label to tessellate: `255` = left hemisphere, `127` = right hemisphere |
| `outsurf` | Output surface file path (e.g., `surf/lh.orig.nofix`) |

The label value can also be inferred from the output surface filename if it
contains `lh.` or `rh.` (lines 163–189 of source):

```
lh → MRI_LEFT_HEMISPHERE  = 255
rh → MRI_RIGHT_HEMISPHERE = 127
```

### Input Assumptions

> [!assumption] Volume must be face-connected (6-connectivity) for label
> `mri_tessellate` extracts face boundaries only. If the labelled region
> contains edge- or corner-only adjacencies, the tessellation will produce
> degenerate zero-area triangles or topology errors. [[mri_pretess]] must be
> run first.

> [!assumption] Non-UCHAR volumes are silently converted
> `read_images()` calls `MRIchangeType(mri, MRI_UCHAR, 0.0, 0.999, TRUE)` on
> any non-UCHAR input. The scale range `[0, 0.999]` maps to `[0, 255]`. For
> label volumes this is safe, but for float volumes it would rescale all values.

> [!assumption] Surface coordinates are in Surface RAS space (tkRAS)
> The output vertex coordinates use `MRIvoxelToSurfaceRAS()` (not
> `MRIvoxelToWorld()`). Surface RAS differs from Scanner RAS by the offset
> of the volume centre (c_r, c_a, c_s = 0 for conformed volumes).
> See [[coordinate-systems]] for full derivation.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `outsurf` | FreeSurfer binary surface | Triangulated mesh in Surface RAS coordinates |

The output surface is a standard `MRIS` binary surface file (see
[[surface-format]]) readable by [[wiki/tools/freeview|freeview]], `mris_convert`, [[mris_smooth]],
etc.

### Surface coordinates

The code comments explain the coordinate convention ([lines 27–63](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_tessellate/mri_tessellate.cpp#L27-L63)):

The tessellation selects voxels at the boundary:

$$
v_{\text{surf}} = v_{\text{boundary}} - \tfrac{1}{2}
$$

This half-voxel offset in voxel-index space places the surface at the face
between the labelled and background voxels. The actual RAS coordinates are
then computed via `MRIvoxelToSurfaceRAS()`.

> [!gotcha] Half-voxel bias toward higher indices
> The boundary voxel selection has a bias toward larger (i, j, imnr) values.
> The comment in the source notes: *"You see that there is a bias toward
> larger i, j, imnr."* In a conformed 256³ volume with c_ras = 0, this
> half-voxel bias is symmetric and does not cause systematic offsets in
> surface RAS space, but it is worth knowing when comparing surface positions
> to voxel centres.

## Mathematical Foundations

### Boundary Extraction Algorithm

The algorithm extracts the 6-connected boundary of the labelled region:

For each voxel $v = (i, j, k)$ with label = `value`, for each of its 6 face-
adjacent neighbours $v'$, if $v'$ does not have the label, add the face between
$v$ and $v'$ to the surface.

Each such face becomes two triangles. The vertex at the face corner is shared
between adjacent faces. The algorithm uses two lookup tables,
`face_index_table0` and `face_index_table1`, to reuse vertices from the
previous slice and avoid duplication.

Maximum capacity: `MAXV = 10,000,000` vertices and `MAXFACES = 20,000,000`
triangles. Exceeding these limits causes `ErrorExit`.

### Surface RAS coordinates

Vertex positions are computed using `MRIvoxelToSurfaceRAS()`. For a conformed
256³ 1 mm isotropic volume with `c_r = c_a = c_s = 0`, Surface RAS ≡ Scanner
RAS. For non-conformed volumes with non-zero `c_ras`, Surface RAS differs from
Scanner RAS by the volume centre offset.

The `-n` / `compatibility=0` flag switches to `MRIvoxelToWorld()` (true Scanner
RAS). The default `compatibility=1` uses `MRIvoxelToSurfaceRAS()`.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `invol` | positional | — | Input binary/label volume (any FreeSurfer-readable volume; non-UCHAR is silently rescaled to UCHAR via `MRIchangeType`) |
| `labelvalue` | positional int | inferred from `outsurf` | Integer label to tessellate (255=lh, 127=rh in `filled.mgz`). If omitted, the tool inspects the basename of `outsurf` for `lh.` or `rh.` and sets `value` to `MRI_LEFT_HEMISPHERE` (255) or `MRI_RIGHT_HEMISPHERE` (127); any other name causes `ErrorExit(ERROR_UNSUPPORTED)`. |
| `outsurf` | positional | — | Output surface file path |
| `-a` | bool flag | OFF | Sets `all_flag = 1`. In `facep()`/`check_face()` the boundary test becomes "any pair of differing labels" rather than "label==value vs. background", producing the surface between **every** pair of distinct labels in the volume. The `value` argument is then ignored for connectivity. |
| `-h` | bool flag | OFF | Hippocampus mode. Sets `hippo_flag = 1` AND `compatibility = 0` (forces real Scanner RAS output, see `-n`). After loading the volume, `remove_non_hippo_voxels()` zeroes out every label that is not in the hard-coded hippocampal subfield list, then sets `all_flag = 1` so the boundary between every retained subfield is tessellated. |
| `-n` | bool flag | OFF (`compatibility = 1`) | Sets `compatibility = 0`: vertex coordinates are written via `extract_i_to_r(mri)` (true Scanner RAS, equivalent to `MRIvoxelToWorld()`) instead of `surfaceRASFromVoxel_(mri)` (Surface/tkRAS). The `TAG_USEREALRAS` tag in the output surface is set to 1, and the `TAG_OLD_SURF_GEOM` block is **not** written (see code lines 574–582). |
| `-seed <n>` | long (1 arg) | unset | Calls `setRandomSeed(atol(argv[2]))`. The tessellation algorithm itself is deterministic, so this only affects any downstream library code that consults the RNG; for the standard code path it is effectively a no-op. |
| `-maxv <n>`<br>`-max_vertices <n>` | long (1 arg) | `MAXV = 10000000` | Overrides `MAXVERTICES`; `MAXFACES` is then set to `2 * MAXVERTICES`. Controls the static allocation of the `vertex` and `face` arrays. Exceeding the limit during `add_vertex`/`add_face` triggers `ErrorExit(ERROR_NOMEMORY)`. |
| `-new` | bool flag | OFF | Sets `UseMRIStessellate = 1`. The tool then bypasses its built-in tessellator and calls the library routine `MRIStessellate(mri, value, all_flag)`, writing the result via `MRISwrite()` (which honours `FS_GII` for GIFTI output). The half-voxel offset, `compatibility`/`-n` handling, and `-maxv` cap of the legacy code path do **not** apply on this branch. |
| `-no-new` | bool flag | — | Sets `UseMRIStessellate = 0`. Used to force the legacy code path even when `FS_GII=.gii` is set in the environment. |
| `-?`<br>`-u`<br>`--help`<br>`--usage` | bool flag | — | Print the XML help (`mri_tessellate.help.xml`) and exit. |
| `--version` | bool flag | — | Print the version string and exit. |

### Environment Variables

| Variable | Effect |
|----------|--------|
| `FS_GII=.gii` | Automatically enables `-new` (`MRIStessellate()`) for GIFTI output |

### Configuration Interactions

> [!gotcha] `-h` subsumes `-a` and forces real RAS
> `-h` sets `hippo_flag = 1`, `compatibility = 0`, and (after the non-hippocampal
> labels have been zeroed) `all_flag = 1`. So `-h` implicitly behaves like
> `-a -n -h`; specifying `-a` or `-n` alongside `-h` is redundant. The
> `value` positional is also irrelevant in this mode because `all_flag` is on.

> [!gotcha] `-new` / `FS_GII` bypass most other flags
> When `UseMRIStessellate = 1` (set by `-new` or by `FS_GII=.gii` in the
> environment), `main()` short-circuits to `MRIStessellate(mri, value, all_flag)`
> and `MRISwrite()`, then exits. On this branch `compatibility`/`-n`,
> `-maxv`, the legacy `write_binary_surface()` (and therefore the
> `TAG_USEREALRAS`/`TAG_OLD_SURF_GEOM` writing logic) are all bypassed.
> `-no-new` forces the legacy path back on even if `FS_GII=.gii` is set.

> [!gotcha] `labelvalue` is optional only if output filename contains `lh.` or `rh.`
> When invoked with only 2 positional arguments (`invol outsurf`), the tool
> calls `FileNameOnly()` on the output path and looks for the substring `h.`
> preceded by `l` or `r`. Anything else triggers
> `ErrorExit(ERROR_UNSUPPORTED, "if no fillval is specified, then output hemi must be")`.

> [!gotcha] `-n` disables the embedded volume geometry tag
> In `write_binary_surface()` the `TAG_OLD_SURF_GEOM` block is only written
> when `useRealRAS == 0` (i.e. `compatibility == 1`, the default). Surfaces
> saved with `-n` therefore lack the embedded `vol_geom` and downstream
> tools that rely on it (e.g. `mris_convert` round-trips, registration
> utilities) may complain about a missing source volume.

## Typical Use Cases

### Use Case 1: Standard recon-all cortical surface tessellation

```bash
# Left hemisphere:
mri_tessellate filled-pretess255.mgz 255 ../surf/lh.orig.nofix
# Right hemisphere:
mri_tessellate filled-pretess127.mgz 127 ../surf/rh.orig.nofix
```

### Use Case 2: Tessellate all labels (e.g., for aseg visualisation)

```bash
mri_tessellate -a aseg.mgz 0 all_labels.surf
```

### Use Case 3: Hippocampal subfield surface

```bash
mri_tessellate -h hippoSfVolumes.mgz 0 lh.hippocampus.surf
```

## Pipeline Context

**autorecon2 — Tessellate stage** (recon-all lines 3547–3608)

```
mri_fill → filled.mgz
               ↓
   mri_pretess filled.mgz 255 norm.mgz filled-pretess255.mgz  (lh)
               ↓
   mri_tessellate filled-pretess255.mgz 255 surf/lh.orig.nofix
               ↓
   rm filled-pretess255.mgz
               ↓
   mris_extract_main_component lh.orig.nofix lh.orig.nofix
```

**Exact recon-all command ([`scripts/recon-all:3580`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3580)):**

```bash
mri_tessellate ../mri/filled-pretess$hemivalue.mgz $hemivalue $outfile
```

Where `$hemivalue` = 255 (lh) or 127 (rh), and `$outfile` is
`../surf/$hemi.orig.nofix`.

After tessellation, `mris_extract_main_component` removes disconnected
components (islands), keeping only the largest connected component.

If `$DoDecimation` is enabled, `mris_remesh` reduces face count before the
final `orig.nofix` is written.

**Predecessors:** [[mri_pretess]] (topology fix) → `mri_fill` (hemisphere
labelling) → [[mri_segment]] (WM segmentation)

**Successors:** [[mris_smooth]] (Smooth1 stage on `orig.nofix`), eventually
[[mris_inflate]], [[mris_sphere]], [[mris_register]]

## Gotchas and Caveats

> [!gotcha] The temporary `filled-pretess*.mgz` files are deleted after use
> recon-all deletes `filled-pretess$hemivalue.mgz` immediately after
> tessellation ([`scripts/recon-all:3584`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3584)). If you need to inspect the pre-tessellation
> volume, you must run `mri_pretess` manually and keep the output.

> [!gotcha] Main component extraction is a separate step
> `mri_tessellate` may produce a surface with disconnected components
> (islands of WM not connected to the main cortical WM). These are removed
> by `mris_extract_main_component` in a subsequent recon-all call. The
> intermediate surface with islands can be inspected at `lh.orig.nofix`
> before `mris_extract_main_component` overwrites it.

> [!gotcha] MAXV cap: large volumes may exceed vertex limit
> Extremely high-resolution (sub-1 mm) surfaces can exceed MAXV = 10,000,000.
> This causes an `ErrorExit`. The `-maxv` flag can increase the limit.

## Related Tools

- [[mri_pretess]] — topology fix required before tessellation
- `mri_fill` — produces the filled hemisphere volume (no dedicated wiki page yet)
- [[mri_segment]] — WM segmentation upstream of `mri_fill`
- [[mris_smooth]] — smooths `orig.nofix` to produce `smoothwm.nofix`
- [[mris_inflate]] — inflates `smoothwm.nofix` to `inflated.nofix`
- [[mris_sphere]], [[mris_register]] — downstream surface registration
- [[wiki/tools/freeview|freeview]] — visualise the resulting surface
- [[wiki/pipelines/recon-all|recon-all]] — orchestrating pipeline

## Confidence and Gaps

Confidence **high** for the algorithm, flags, and recon-all integration (read
from source).

> [!gap] Surface RAS offset formula
> `MRIvoxelToSurfaceRAS()` is defined in a shared library. The exact formula
> (and how it differs from `MRIvoxelToWorld()`) was not traced in detail.
> See [[coordinate-systems]] for conceptual documentation.

## References

- Dale, A.M., Fischl, B., Sereno, M.I. (1999). *Cortical Surface-Based
  Analysis I: Segmentation and Surface Reconstruction.* NeuroImage, 9(2):179–194.
  [cited in source header]
