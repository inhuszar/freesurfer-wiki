---
title: "mri-func2sph"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/mri-func2sph"
families: []                       # legacy FS-FAST/vss surface-sampling helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-funcvits]]"
  - "[[mri-sph2surf]]"
  - "[[mri-structvits]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2surf]]"
  - "[[fsaverage]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The vss-resample / vss-fillholes / vss-convert binaries this script drives are not present in the v8.2.0 source tree or install; their exact algorithms (especially the hole-filling smoother and the 18x569 bshort packing) are inferred from the call sites only."
  - "The ic10242.vit hole-filling table ($FREESURFER_HOME/lib/bem/ic10242.vit) does not ship in the v8.2.0 install (only ic*.tri files are present), so the default code path cannot be exercised as-is."
tags:
  - fsfast
  - retinotopy
  - surface-sampling
  - legacy
  - vss
  - structvits
---

# mri-func2sph

## Summary

`mri-func2sph` resamples a functional FS-FAST volume (a raw `bvolume`, or a
`selavg`/`selxavg` averaging result) onto a standard icosahedral spherical
surface (default `ic10242`, i.e. icosahedron order 7 with 10242 vertices). It is
a thin tcsh driver around three legacy "vss" (vertex-structure-system) binaries:
it (1) resamples the functional data through a precomputed
**function→icosahedron vertex index table** (`*.func-to-icNNNNN.vit`), (2)
fills the resulting holes by iterative neighbour averaging on the icosahedron,
and (3) repacks the result into a FS-FAST `bfloat` volume. For `selxavg` input it
also recurses to resample the matching `-offset` volume. The function→ico table
it consumes is built beforehand by [[mri-funcvits]] (which in turn depends on the
subject-side tables from [[mri-structvits]]); the spherical output is mapped back
to the native surface by [[mri-sph2surf]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri-func2sph`
- **External helpers invoked (not in the v8.2.0 source tree):** `vss-resample` ([`scripts/mri-func2sph:90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L90)), `vss-fillholes` ([`scripts/mri-func2sph:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L103)), `vss-convert` ([`scripts/mri-func2sph:124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L124)).

> [!gotcha] The "vss" back-end binaries are not part of v8.2.0
> `vss-resample`, `vss-fillholes`, and `vss-convert` are referenced by name but
> are **not present** anywhere in the v8.2.0 FreeSurfer source tree. They belong
> to an older Vertex-Structure-System toolchain that predates `mri_vol2surf` /
> `mri_surf2surf`. The modern equivalent of the whole `mri-funcvits` →
> `mri-func2sph` → `mri-sph2surf` chain is to register the functional volume to
> the anatomy and sample with [[mri_vol2surf]], then resample between subjects /
> to [[fsaverage]] with [[mri_surf2surf]]. This page documents the script as it
> exists; treat it as **legacy / largely inoperative** on a stock v8.2.0 install.

## Purpose and Context

In the original FS-FAST surface analysis workflow, a functional run is acquired
in (low-resolution, e.g. 3.125 mm) EPI voxel space and must be carried onto the
cortical surface so that vertices can be averaged across subjects in a common
spherical frame. Rather than re-deriving the geometry every time a functional
volume is sampled, FS-FAST precomputed the entire voxel→surface→icosahedron
mapping **once** as a chain of vertex index tables (`.vit`) and then applied them
to each functional volume with fast, geometry-free table lookups:

1. [[mri-structvits]] builds the subject-specific surface↔icosahedron tables
   (`svit/?h.sph-to-icNNNNN-{sc,cc}.vit`, `svit/?h.icNNNNN-to-sph-sc.vit`).
2. [[mri-funcvits]] composes those with the functional registration to produce
   `?h.func-to-icNNNNN.vit` (function-voxel → icosahedron vertex).
3. **`mri-func2sph`** applies `?h.func-to-icNNNNN.vit` to an actual functional
   volume, yielding data on the icosahedron.
4. [[mri-sph2surf]] applies the inverse table (`?h.icNNNNN-to-sph-sc.vit`) to map
   icosahedral data back onto the subject's native surface for display.

It is run **by hand** as part of FS-FAST surface processing. It is **not** part
of [[wiki/pipelines/recon-all|recon-all]] or trac-all.

## Inputs

### Required Inputs

- **`-i instem`** — stem of a FS-FAST functional volume in `bvolume`
  (bshort/bfloat) format. The script checks for `instem_000.hdr`
  ([`scripts/mri-func2sph:44-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L44-L45)); the directory of `instem` must
  exist.
- **`-o outstem`** — output stem (its parent directory is created if absent,
  [`scripts/mri-func2sph:80-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L80-L81)).
- **`-hemi lh|rh`** — hemisphere; selects which `?h.func-to-icNNNNN.vit` to use.
- **`-fvitdir dir`** — directory holding the function→ico table
  `$hemi.func-to-icNNNNN.vit` produced by [[mri-funcvits]]
  ([`scripts/mri-func2sph:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L74)).
- **Hole-filling table** `$FREESURFER_HOME/lib/bem/icNNNNN.vit` (e.g.
  `ic10242.vit`), checked at [`scripts/mri-func2sph:67-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L67-L68). Used only when
  `-niters > 0`.

### Input Assumptions

> [!assumption] Bvolume input with a matching pre-built function→ico table
> The input is assumed to be FS-FAST `bvolume`/`selavg`/`selxavg` data with a
> `..._000.hdr` header, and a `?h.func-to-icNNNNN.vit` table built **from the same
> registration and surfaces** must already exist in `-fvitdir`. The script does
> not verify geometric consistency between the volume and the table — supplying a
> table built for a different subject, registration, or icosahedron order will
> silently mis-sample.

If `-intype auto` (the default) the script infers the input type from the
`.dat` companion file ([`scripts/mri-func2sph:51-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L51-L63)):
no `.dat` ⇒ `bvolume`; a `.dat` without a `Version` line ⇒ `selavg`; a `.dat`
containing `Version` ⇒ `selxavg`.

> [!gotcha] `ic10242.vit` is not installed in v8.2.0
> The default hole-filling table `$FREESURFER_HOME/lib/bem/ic10242.vit` is **not
> present** in the v8.2.0 install (`lib/bem/` ships only `ic0.tri`…`ic7.tri`).
> With the default `-niters 100`, the existence check at
> [`scripts/mri-func2sph:68-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L68-L70) therefore fails immediately. Hole filling
> can be disabled with `-niters 0`, but the `vss-*` binaries are still required.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `outstem_000.bfloat` + `outstem_000.hdr` | FS-FAST [bvolume] (bfloat) | the functional data resampled onto the icosahedron, repacked as a slice-major bfloat (see geometry below) |
| `outstem.dat` | text | copy of `instem.dat` (for `selavg`/`selxavg` input only, [`scripts/mri-func2sph:137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L137) / [`:143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L143)) |
| `outstem_000.dof` | text | copy of `instem_000.dof` (`selavg` input only, [`scripts/mri-func2sph:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L138)) |
| `outstem-offset_000.bfloat` (+ `.hdr`) | FS-FAST bvolume | resampled mean-offset volume (`selxavg` input only — produced by the recursive call at [`scripts/mri-func2sph:148-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L148-L151)) |

The intermediate `outstem-icNNNNN.tmp` (vss) and `outstem-icNNNNN.tmpfill`
files are deleted at [`scripts/mri-func2sph:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L133).

### Output Specifications

The final repack hard-codes the on-disk geometry as a function of icosahedron
order ([`scripts/mri-func2sph:117-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L117-L124)):

- **`icosize == 10242`** → `nrows = 18`, `ncols = 569`, `nslices = 1`
  (18 × 569 = 10242 vertices, packed as a single "slice").
- **any other `icosize`** → `nrows = icosize`, `ncols = 1`, `nslices = 1`.

So the output bvolume is not an anatomical image; it is the 10242 icosahedral
vertices folded into an 18 × 569 grid (or an `N` × 1 column for other orders).
The frame count and data values are preserved from the input.

## Mathematical Foundations

`mri-func2sph` performs **no numerical computation of its own**; all arithmetic
lives in the external `vss-*` binaries:

- **Resampling** (`vss-resample`) applies a precomputed vertex index table: for
  each icosahedral vertex it copies (or interpolates, per the table) the value of
  the functional voxel that the geometry chain mapped to it. This is a pure table
  lookup — the expensive geometry was solved once in [[mri-funcvits]] /
  [[mri-structvits]].
- **Hole filling** (`vss-fillholes`, [`scripts/mri-func2sph:100-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L100-L113))
  iteratively averages each unassigned vertex over its icosahedral neighbours
  for `-niters` passes (default 100), using the neighbour topology stored in
  `ic10242.vit`. Vertices that no functional voxel mapped onto (because the EPI
  resolution is coarser than the surface mesh) are thereby interpolated from
  their filled neighbours. `-niters 0` skips this step and the temporary file is
  passed straight through ([`scripts/mri-func2sph:111-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L111-L113)).

> [!internal] The geometry and smoothing live in the vss toolchain
> The voxel→vertex correspondence and the neighbour-averaging smoother are
> implemented in `vss-resample` / `vss-fillholes`, not in this script. Those
> binaries are not in the v8.2.0 tree; their behaviour is described here from the
> call sites and FS-FAST conventions only.

## Configuration Options

### Complete Flag Reference

All flags are enumerated from the argument parser
([`scripts/mri-func2sph:160-225`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L160-L225)). All flags take a value.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` | string | *(required)* | Input functional volume stem (FS-FAST bvolume). Existence is tested via `instem_000.hdr`. |
| `-o` | string | *(required)* | Output stem. The output volume is `outstem_000.bfloat`. |
| `-hemi` | `lh`\|`rh` | *(required)* | Hemisphere; selects the `?h.func-to-icNNNNN.vit` table. Anything other than `lh`/`rh` is rejected ([`scripts/mri-func2sph:178-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L178-L181)). |
| `-fvitdir` | string | *(required)* | Directory containing the function→ico vertex table built by [[mri-funcvits]]. |
| `-icosize`<br>`-ic` | integer | `10242` | Icosahedron vertex count (order). Determines both the table name (`func-to-icNNNNN.vit`, `icNNNNN.vit`) and the output packing (see Output Specifications). |
| `-niters` | integer | `100` | Number of hole-filling neighbour-averaging passes on the icosahedron. `0` disables hole filling (and skips the `icNNNNN.vit` requirement). |
| `-intype` | `auto`\|`bvolume`\|`selavg`\|`selxavg` | `auto` | FS-FAST input type. `auto` infers it from the `.dat` companion (see Inputs). Controls which companion files are copied and whether the `-offset` recursion runs. Validated at [`scripts/mri-func2sph:261-268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L261-L268). |
| `-umask`<br>`-um` | string (octal) | current umask | Set the process umask before writing outputs (e.g. `002` for group-writable). |

### Configuration Interactions

> [!gotcha] `-intype selxavg` triggers a recursive `-offset` resample
> When the (auto-detected or explicit) input type is `selxavg`, the script
> re-invokes **itself** on `instem-offset` → `outstem-offset` with
> `-intype bvolume` ([`scripts/mri-func2sph:146-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L146-L152)). The matching
> `instem-offset_*.{bfloat,hdr}` files (the mean-offset image written by
> `selxavg`) must therefore also exist, or the recursive call fails on its own
> `instem-offset_000.hdr` check.

- **`-niters 0` + missing `ic10242.vit`:** setting `-niters 0` is the only way to
  proceed when the hole-filling table is absent, because the `icNNNNN.vit` check
  is guarded by nothing — it runs regardless — but the *file* is only consumed by
  `vss-fillholes`, which `-niters 0` skips. (You still need the `vss-*` binaries.)
- **`-icosize` must match the table on disk:** the script builds the table name
  from `-icosize`; there is no autodetection. A mismatch between `-icosize` and
  the order used by [[mri-funcvits]] yields a "cannot find …vit" error.

## Typical Use Cases

### 1. Sample an averaged functional run to the standard icosahedron

```bash
# selxavg result h_000.bfloat in ./analysis; tables in ./fvit
mri-func2sph -i ./analysis/h -o ./analysis/sph/h-lh \
  -hemi lh -fvitdir ./fvit -icosize 10242
# -> ./analysis/sph/h-lh_000.bfloat (+ .hdr, .dat) on ic10242,
#    plus ./analysis/sph/h-lh-offset_000.bfloat (the offset recursion)
```

### 2. Sample a raw bvolume with hole filling disabled

```bash
mri-func2sph -i ./bold/f -o ./bold/sph/f-rh \
  -hemi rh -fvitdir ./fvit -niters 0
```

## Pipeline Context

`mri-func2sph` is the **apply** step of the legacy FS-FAST surface chain. It is
not called by [[wiki/pipelines/recon-all|recon-all]] or trac-all (a tree-wide
search finds no caller; the script is referenced only by [[mri-sph2surf]]'s help
text, [`scripts/mri-sph2surf:227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L227)).

**Predecessors:** [[mri-structvits]] (subject surface↔ico tables) → [[mri-funcvits]]
(`?h.func-to-icNNNNN.vit`) → **mri-func2sph** → **Successor:** [[mri-sph2surf]]
(map ico data back to the native surface as a `.w` overlay).

The modern replacement for this whole chain is [[mri_vol2surf]] (functional
volume → subject surface) followed by [[mri_surf2surf]] (subject surface →
[[fsaverage]]).

## Gotchas and Caveats

> [!gotcha] Output is icosahedral, not anatomical
> The `outstem_000.bfloat` is the 10242 icosahedron vertices folded into an
> 18 × 569 grid (or `N`×1 for other orders), **not** a brain-shaped volume. It is
> only meaningful when read back through the inverse vertex table by
> [[mri-sph2surf]] or another vss tool.

> [!gotcha] No geometric self-check
> The script verifies that files *exist* but never that the functional volume,
> the registration that built the `.vit`, and the icosahedron order are mutually
> consistent. A stale or wrong-subject `.vit` produces a plausible-looking but
> incorrect surface map silently.

## Error Compensation and Guard Rails

- Each `vss-*` call's exit status is checked and the script aborts with the
  failing command echoed ([`scripts/mri-func2sph:92-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L92-L97), [`:105-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L105-L110), [`:126-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L126-L131)).
- The output directory is created automatically ([`scripts/mri-func2sph:80-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L80-L81)).
- Hole filling is the only "compensation" for the resolution mismatch between EPI
  voxels and surface vertices, and it is on by default (100 iters).

## Related Tools

- [[mri-funcvits]] — builds the `?h.func-to-icNNNNN.vit` table this script applies.
- [[mri-structvits]] — builds the subject surface↔icosahedron tables that
  [[mri-funcvits]] composes.
- [[mri-sph2surf]] — the inverse step: maps icosahedral data back to the native
  surface as a paint (`.w`) overlay.
- [[mri_vol2surf]] — modern replacement for volume→surface sampling.
- [[mri_surf2surf]] — modern replacement for surface→surface/icosahedron resampling.
- [[fsaverage]] — the standard average surface that the modern chain targets.

## Confidence and Gaps

**High confidence:** the complete flag set, the auto-typing logic, the
`selxavg` offset recursion, the companion-file copying, and the hard-coded
18 × 569 / `N`×1 output packing — all read directly from
[`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph).

> [!gap] vss back-end and missing tables
> The `vss-resample` / `vss-fillholes` / `vss-convert` binaries and the
> `lib/bem/ic10242.vit` table are absent from the v8.2.0 source tree and install.
> The internal resampling/smoothing algorithms and the exact bvolume packing are
> inferred from the call sites and FS-FAST conventions, not verified by running
> the tool. The chain is effectively legacy; use the [[mri_vol2surf]] /
> [[mri_surf2surf]] path for current work.

## References

- FreeSurfer source: [`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph) (v8.2.0).
- Built-in usage: `mri-func2sph` with no arguments (the `usage_exit` block,
  [`scripts/mri-func2sph:273-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph#L273-L284)).
- Companion scripts: [`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits), [`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits), [`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf).
