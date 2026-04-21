---
title: "mri_pretess"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mc/mri_pretess.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_segment]]"
  - "[[mri_tessellate]]"
  - "[[recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps: []
tags:
  - segmentation
  - topology
  - pretessellation
  - autorecon2
---

# mri_pretess

## Summary

`mri_pretess` modifies a binary segmentation volume so that all voxels with a
given label are **face-connected** (6-connectivity) to their neighbours —
eliminating edge-only (12-connectivity) and corner-only (8-connectivity) shared
contacts. This topological fix is a mandatory prerequisite for
[[mri_tessellate]], which uses a surface-boundary extraction algorithm that
cannot represent edge or corner adjacencies as valid surface geometry.

The tool works by scanning the volume for ambiguous edge and corner
configurations and resolving them by adding the brighter of the two competing
voxels to the labelled region — a heuristic that tries to preserve the signal
of the underlying T1.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_mc/mri_pretess.cpp` (1413 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_pretess`
- **Note:** The source lives under `mri_mc/` (marching cubes), not a dedicated
  `mri_pretess/` directory.

## Purpose and Context

In a 3-D volume, two voxels can touch in three ways: sharing a face (6-
connectivity), an edge (12-connectivity), or a corner (8-connectivity). The
FreeSurfer surface tessellation algorithm (`mri_tessellate`) uses a simple
surface-boundary extraction that only handles face-connected regions. Edge and
corner adjacencies create ambiguous topological situations — two labelled voxels
sharing only an edge would produce a geometrically degenerate surface (a
triangle fan with zero area at the shared edge). `mri_pretess` eliminates these
cases before tessellation.

`mri_pretess` is called **twice** per hemisphere in recon-all:

1. **On `wm.seg.mgz`** (or `wm.asegedit.mgz`) to produce `wm.mgz` — this is
   the main WM topology fix.
2. **On `filled.mgz`** just before tessellation by [[mri_tessellate]] — to
   produce `filled-pretessNNN.mgz` (where NNN = 255 for lh, 127 for rh).

## Inputs

### Required Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `filledvol` | 1 | Input segmentation volume (usually `wm.seg.mgz` or `filled.mgz`) |
| `labelstring` | 2 | Label to fix: `"wm"` (auto-binarises WM) or an integer label value |
| `normvol` | 3 | Original intensity volume (used to pick brighter voxel when resolving ambiguities), usually `norm.mgz` |
| `newfilledvol` | 4 | Output volume (may be the same path as `filledvol` for in-place editing) |

### Input Assumptions

> [!assumption] Input and intensity volumes must match in dimensions
> The tool checks that `filledvol` and `normvol` have identical width, height,
> and depth; if they differ it exits with `ERROR_BADPARM`.

> [!assumption] Label "wm" triggers automatic binarisation
> When `labelstring == "wm"`, the tool binarises the input: any voxel with
> value ≥ `WM_MIN_VAL` (typically 5) is treated as label=128. The original
> values are preserved in the output, with newly added voxels receiving
> `PRETESS_FILL` (a special marker value).

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `newfilledvol` | [[mgz]] UCHAR | Topology-corrected segmentation (in-place if same path) |

## Mathematical Foundations

### Topological Conflict Detection and Resolution

`mri_pretess` identifies three types of ambiguous configurations:

**Edge configurations (`mriRemoveEdgeConfiguration`):**
Two labelled voxels share only an edge, with neither adjacent face-neighbour
labelled. For example, in the XY-plane: voxel $(i,j,k)$ and voxel
$(i+1, j+1, k)$ are both labelled, but neither $(i, j+1, k)$ nor
$(i+1, j, k)$ is labelled. The tool resolves this by adding the neighbour with
the higher intensity in `normvol` to the labelled set:

$$
v^* = \arg\max_{v \in \{(i,j+1,k),\, (i+1,j,k)\}} I(v)
$$

This is applied iteratively in all four diagonal directions of each cardinal
plane (XY, XZ, YZ) until no modifications remain (`nfound == 0`).

**Corner configurations (`mriRemoveCornerConfiguration`):**
Two labelled voxels share only a corner (e.g., $(i,j,k)$ and
$(i+1,j+1,k+1)$) with no shared face or edge neighbours. Resolved by adding
one of six possible intermediate voxels — the pair with the highest summed
intensity is chosen.

**Background corner configurations
(`mriRemoveBackgroundCornerConfiguration`):**
Dual of the above — two background (non-labelled) voxels in a corner
relationship, surrounded by labelled voxels, are resolved by adding the
brighter one to the labelled set.

All three sweeps are nested in an outer loop (`while niter-- > 0`, default
`niter=1`) that repeats until convergence.

### Iteration and convergence

The inner while-loops for each configuration type are **not bounded** — they
run until `nfound == 0`. In practice, each pass should reduce the count
monotonically since added voxels can create new conflicts that are resolved in
subsequent passes. The outer `niter` loop adds a second full-pass safety check.

When newly added voxels are written back into the original (wm) volume via
`mri_seg_orig`, they receive `PRETESS_FILL`. This constant is defined as **215**
in `include/mri.h`, distinguishing newly-added pretess voxels from manual
WM edits (`WM_EDITED_ON_VAL = 255`) and ordinary segmented WM (`128`).

## Configuration Options

### Complete Flag Reference

All flag names are matched case-insensitively (the parser upper-cases the
option string before comparison, so e.g. `-NOCORNERS` and `-NoCorners` are
equivalent to `-nocorners`).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `filledvol` | positional (argv[1]) | — | Input segmentation volume (`MRIread`); read whole into memory before any output is written |
| `labelstring` | positional (argv[2]) | — | Either the literal string `"wm"` (case-insensitive) — which triggers WM-binarisation mode (`label = WM_EDITED_ON_VAL = 255`, threshold `WM_MIN_VAL`) — or an integer label value parsed by `atoi` |
| `normvol` | positional (argv[3]) | — | Reference intensity volume; consulted only to choose the brighter voxel when resolving conflicts. Must match `filledvol` in width/height/depth or the tool exits with `ERROR_BADPARM` |
| `newfilledvol` | positional (argv[4]) | — | Output volume path; with `-keep` it is also *read back* before writing to recover existing edit markers. May be the same path as `filledvol` (in-place). NOT written when `-test` is set |
| `-nocorners` | bool flag | OFF (i.e. `corners = 1`) | Sets the static `corners` flag to 0; `mriRemoveCornerConfiguration` and `mriRemoveBackgroundCornerConfiguration` are skipped, leaving only `mriRemoveEdgeConfiguration` |
| `-keep` | bool flag | OFF (`keep_edits = 0`) | After conflict resolution, re-reads `newfilledvol` (argv[4]) and copies any voxels whose value equals `WM_EDITED_ON_VAL` (255) or `WM_EDITED_OFF_VAL` (1) back into the result, preserving manual `tkmedit`/`freeview` WM edits across the topology fix |
| `-test` | bool flag | OFF (`test_edge = 0`) | Calls `MRIaddEdgeVoxel` to inject one synthetic edge-conflict voxel (value `WM_EDITED_ON_VAL`) before processing, as a self-test that pretess will remove it. **Output is not saved** when this flag is set |
| `-w` | bool flag | OFF | Single-character option: ORs `DIAG_WRITE` into `Gdiag`, enabling diagnostic intermediate writes from the underlying MRI library |
| `-debug_voxel C R S` | three ints | — | Sets `Gx`, `Gy`, `Gz` (the global FS debug voxel); enables verbose per-voxel debug output for that location. Consumes 3 extra argv tokens |
| `-h`, `-u`, `-?`, `--help`, `--usage` | bool flag | — | Print XML-driven help text (`mri_pretess.help.xml`) and exit with status 1 |
| `--version`, `--all-info`, etc. | — | — | Standard FreeSurfer version/info flags handled by `handleVersionOption` before option parsing |

### Configuration Interactions

> [!gotcha] `-keep` reads the existing output file
> When `-keep` is specified, the tool reads the *output* file (argv[4]) after
> processing to retrieve manual edit markers. If the output file does not
> exist (first run), `ErrorPrintf` is called but processing continues.

> [!gotcha] `-test` suppresses output entirely
> `-test` short-circuits the final `MRIwrite(mri_seg, argv[4])` call; only
> a console message is printed. This makes `-test` mutually incompatible with
> any productive use — it is strictly a self-diagnostic mode.

> [!gotcha] `-test` interacts with `-keep`
> The injected test voxel is set to `WM_EDITED_ON_VAL` so it would be
> *retained* by `-keep`, defeating the test. The two flags should not be
> combined.

> [!gotcha] labelstring "wm" vs. integer changes how output is written
> With `"wm"`, the tool works on a binarised copy and merges results back
> into the original `mri_seg_orig` volume by setting newly labelled voxels to
> `PRETESS_FILL` (=215). With an integer label, the volume is converted to
> UCHAR and all voxels matching the label are preserved as-is.

## Typical Use Cases

### Use Case 1: WM topology fix (recon-all Stage wmsegment)

```bash
mri_pretess wm.asegedit.mgz wm norm.mgz wm.mgz
```

With edit preservation:
```bash
mri_pretess -keep wm.asegedit.mgz wm norm.mgz wm.mgz
```

### Use Case 2: Pre-tessellation fix on filled hemisphere

```bash
# Left hemisphere (label 255):
mri_pretess filled.mgz 255 norm.mgz filled-pretess255.mgz
# Right hemisphere (label 127):
mri_pretess filled.mgz 127 norm.mgz filled-pretess127.mgz
```

## Pipeline Context

**autorecon2 — two call sites:**

**Call site 1: WM topology fix** (recon-all lines 3368–3384)

```
mri_segment → wm.seg.mgz
mri_edit_wm_with_aseg → wm.asegedit.mgz
                              ↓
              mri_pretess wm.asegedit.mgz wm norm.mgz wm.mgz
                              ↓
                          wm.mgz
```

Exact command:
```bash
mri_pretess [$-keep] wm.asegedit.mgz wm norm.mgz wm.mgz
```

**Call site 2: Pre-tessellation fix** (recon-all lines 3563–3573)

```
mri_fill → filled.mgz
                ↓
   mri_pretess filled.mgz $hemivalue norm.mgz filled-pretess$hemivalue.mgz
                ↓
   mri_tessellate filled-pretess$hemivalue.mgz $hemivalue $hemi.orig.nofix
```

Note the comment in recon-all: *"necessary second pretess, per f.segonne"* —
indicating this was explicitly required after input from Florent Ségonne, the
original author of `mri_pretess`.

## Gotchas and Caveats

> [!gotcha] Edge and corner removal order is interdependent
> The three sweep functions (`mriRemoveEdgeConfiguration`,
> `mriRemoveCornerConfiguration`, `mriRemoveBackgroundCornerConfiguration`)
> run sequentially in a single outer-loop iteration. Voxels added by one
> sweep may introduce new edge/corner conflicts detectable only by subsequent
> sweeps. The outer while-loops handle this by continuing until convergence,
> but the *global* convergence (no new conflicts of any type) is only achieved
> after the outer niter loop completes — which may be just 1 pass by default.

> [!gotcha] Intensity volume is for disambiguation only — not for intensity
> The `normvol` argument (typically `norm.mgz` from [[mri_normalize]]) is
> used only to select *which* voxel to add when resolving a conflict
> (brighter = preferred). It is never subtracted from or added to the
> segmentation values. Passing the wrong intensity volume (e.g., `orig.mgz`
> instead of `norm.mgz`) will still run without error but may make suboptimal
> choices at conflict sites.

> [!gotcha] `-nocorners` skips corner removal entirely
> With `-nocorners`, only `mriRemoveEdgeConfiguration` runs.
> `mriRemoveCornerConfiguration` and `mriRemoveBackgroundCornerConfiguration`
> are skipped. This produces a less aggressive fix and may leave corner
> adjacencies that `mri_tessellate` cannot handle properly.

> [!gotcha] Output file is overwritten in place by default in recon-all
> recon-all typically uses the *same* path for `filledvol` and `newfilledvol`
> (e.g., `wm.mgz`). The tool reads the entire input into memory first, so
> this is safe, but it means the original input cannot be recovered after the
> call.

## Related Tools

- [[mri_segment]] — produces `wm.seg.mgz` (primary input)
- [[mri_tessellate]] — consumes the pretess output to produce surface meshes
- `mri_fill` — produces `filled.mgz` (second pretess input); not yet documented
- `mri_edit_wm_with_aseg` — edits `wm.seg.mgz` before pretess; not yet documented
- [[recon-all]] — orchestrates both call sites

## Confidence and Gaps

Confidence **high** for algorithm, flag parsing, and recon-all call sites (all
read from source code). The `PRETESS_FILL` constant value is the only remaining
uncertainty.

## References

- Original author: Florent Ségonne (see recon-all comment at line 3563)
- Fischl, B., Sereno, M.I., Dale, A.M. (1999). *Cortical Surface-Based
  Analysis I: Segmentation and Surface Reconstruction.* NeuroImage, 9(2):179–194.
