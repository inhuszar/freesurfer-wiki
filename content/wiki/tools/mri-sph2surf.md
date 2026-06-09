---
title: "mri-sph2surf"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/mri-sph2surf"
families: []                       # legacy FS-FAST/vss surface-mapping helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-func2sph]]"
  - "[[mri-funcvits]]"
  - "[[mri-structvits]]"
  - "[[mri_surf2surf]]"
  - "[[mri_vol2surf]]"
  - "[[fsaverage]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The vss-resample / vss-convert binaries this script drives are not in the v8.2.0 source tree or install; the .vit/.vss table semantics and the paint (.w) packing are inferred from the call sites only."
  - "The ?h.ic10242-to-sph-sc.vit table it requires is produced by mri-structvits (outside the assigned set); its byte layout is not documented here."
tags:
  - fsfast
  - retinotopy
  - surface-sampling
  - paint
  - legacy
  - vss
  - structvits
---

# mri-sph2surf

## Summary

`mri-sph2surf` is the inverse of [[mri-func2sph]]: it takes data defined on the
standard `ic10242` icosahedron (the FS-FAST surface-analysis output) and maps it
back onto a single subject's native cortical surface, writing a paint (`.w`)
overlay for display in tksurfer/freeview. It resamples the icosahedral bvolume
through the subject's precomputed **icosahedron → surface** vertex index table
(`?h.ic10242-to-sph-sc.vit`, built by [[mri-structvits]]) and converts the result
to a paint overlay. The icosahedron order is fixed at 10242 (hard-coded in the
table name). It is a small tcsh driver around the legacy "vss" binaries
`vss-resample` and `vss-convert`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri-sph2surf`
- **External helpers invoked (not in the v8.2.0 source tree):** `vss-resample` ([`scripts/mri-sph2surf:62-64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L62-L64)), `vss-convert` ([`scripts/mri-sph2surf:72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L72)).

> [!gotcha] The "vss" back-end binaries are not part of v8.2.0
> `vss-resample` and `vss-convert` are referenced by name but are **not present**
> in the v8.2.0 FreeSurfer source tree or install. They are an older
> Vertex-Structure-System toolchain superseded by [[mri_surf2surf]] /
> [[mri_vol2surf]]. This page documents the script as written; treat the chain as
> **legacy / largely inoperative** on a stock v8.2.0 install.

## Purpose and Context

After functional data have been sampled onto the standard icosahedron (so that
vertices line up across subjects) with [[mri-func2sph]], the results — group
maps, single-subject maps, retinotopy angles — are still in the abstract
icosahedral packing and cannot be drawn on a brain. `mri-sph2surf` brings a chosen
subject's icosahedral data back onto that subject's own `?h` surface as a paint
overlay so it can be viewed on the inflated/folded surface.

It is run **by hand** at the end of the legacy FS-FAST surface chain; it is
**not** part of [[wiki/pipelines/recon-all|recon-all]] or trac-all.

The whole chain is: [[mri-structvits]] (subject tables) → [[mri-funcvits]]
(`func→ico` table) → [[mri-func2sph]] (volume → icosahedron) → **mri-sph2surf**
(icosahedron → native surface).

## Inputs

### Required Inputs

- **`-i instem`** — stem of the icosahedral input. The file must be named
  `instem-$hemi_000.bfloat` (tried first) or `instem-$hemi_000.bshort`
  ([`scripts/mri-sph2surf:52-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L52-L59)) — exactly the form produced by
  [[mri-func2sph]].
- **`-o outstem`** — output paint stem; the overlay is written `outstem-$hemi.w`
  ([`scripts/mri-sph2surf:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L71)).
- **`-hemi lh|rh`** — hemisphere (only `lh`/`rh` accepted, [`scripts/mri-sph2surf:113-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L113-L116)).
- **`-s subject`** — subject whose native surface receives the data and whose
  `svit` table is used.
- **Inverse table** — `$svitdir/$hemi.ic10242-to-sph-sc.vit` (default
  `$SUBJECTS_DIR/$subject/svit`), required and existence-checked at
  [`scripts/mri-sph2surf:46-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L46-L50). Produced by [[mri-structvits]].

### Input Assumptions

> [!assumption] ic10242 bvolume from mri-func2sph + matching structvits table
> The input must be ic10242 data in the `instem-$hemi_000.{bfloat,bshort}` layout
> that [[mri-func2sph]] emits, and the subject's `?h.ic10242-to-sph-sc.vit` table
> from [[mri-structvits]] must exist. The icosahedron order is **fixed at 10242**
> — there is no `-icosize` flag (the table name is hard-coded at
> [`scripts/mri-sph2surf:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L46)).

> [!gotcha] Icosahedron order is hard-coded to 10242
> Unlike [[mri-func2sph]] and [[mri-funcvits]], `mri-sph2surf` has no `-icosize`
> option; it always looks for `?h.ic10242-to-sph-sc.vit`. Data sampled at a
> different icosahedron order cannot be mapped back with this script as-is.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `outstem-$hemi.w` | paint / `.w` surface overlay (one value per surface vertex) | the icosahedral data resampled onto the subject's native `?h` surface for the selected `-offset` frame |

The intermediate `outstem-$hemi-$subject.vss` (the resampled-but-not-converted
vss file) is created at [`scripts/mri-sph2surf:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L61) and deleted at
[`scripts/mri-sph2surf:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L80).

### Output Specifications

A paint (`.w`) file holds a sparse list of (vertex index, value) pairs for one
hemisphere's surface — the classic tksurfer overlay format. Only **one** frame is
emitted per run: the zero-based `-offset` plane (same meaning as the `paint`
program's plane/frame argument, [`scripts/mri-sph2surf:231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L231)). To export several
frames, run once per `-offset`.

## Mathematical Foundations

`mri-sph2surf` performs **no arithmetic itself**:

- **Resample** (`vss-resample -f bvolume -vit ?h.ic10242-to-sph-sc.vit`,
  [`scripts/mri-sph2surf:62-64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L62-L64)): a pure table lookup that, for each native
  surface vertex, fetches the value of the icosahedral vertex it maps from. The
  icosahedron→surface correspondence was solved once by [[mri-structvits]] and
  stored in the `.vit`.
- **Convert** (`vss-convert -of paint $offset`, [`scripts/mri-sph2surf:72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L72)):
  writes the chosen frame of the resampled vss data out as a `.w` paint overlay.

> [!internal] The geometry lives in the vss toolchain
> The vertex correspondence and the paint serialisation are implemented in
> `vss-resample` / `vss-convert`, absent from the v8.2.0 tree; behaviour is
> inferred from the call sites and FS-FAST conventions.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser ([`scripts/mri-sph2surf:86-166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L86-L166)).
`-i`, `-o`, `-hemi`, and `-s` are required (checked at
[`scripts/mri-sph2surf:169-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L169-L191)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` | string | *(required)* | Input stem; file must be `instem-$hemi_000.bfloat` or `…_000.bshort` (the [[mri-func2sph]] output form). |
| `-o` | string | *(required)* | Output paint stem; overlay written `outstem-$hemi.w`. |
| `-hemi` | `lh`\|`rh` | *(required)* | Hemisphere; appended to the input/output names and the table name. Only `lh`/`rh` accepted. |
| `-s` | string | *(required)* | Subject whose native surface receives the data and whose `svit` table is used. |
| `-offset` | integer | `0` | Zero-based plane/frame number to write to the `.w` overlay (same semantics as `paint`). Run once per frame. |
| `-svitdir` | string | `$SUBJECTS_DIR/$subject/svit` | Directory holding `?h.ic10242-to-sph-sc.vit`. Existence-checked when supplied ([`scripts/mri-sph2surf:130-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L130-L137)). |
| `-umask`<br>`-um` | string (octal) | — | Set the process umask before writing. |
| `-verbose` | bool | off | tcsh `set verbose`. |
| `-version` | bool | — | Print the version string and exit ([`scripts/mri-sph2surf:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L99-L101)). |
| `-help` | bool | — | Print extended help and exit ([`scripts/mri-sph2surf:104-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L104-L108)). |

### Configuration Interactions

> [!gotcha] `-svitdir` default depends on `-s`, so order can matter
> The default `svitdir` is computed as `$SUBJECTS_DIR/$subject/svit`
> **immediately after argument parsing** ([`scripts/mri-sph2surf:39-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L39-L41)), using
> whatever `$subject` was set by `-s`. If you rely on the default `svitdir`, make
> sure `-s` is given. Passing `-svitdir` explicitly overrides this and is checked
> for existence at parse time.

- There is **no `-icosize`**: the table is always `ic10242-to-sph-sc.vit`. This
  must match the order [[mri-func2sph]] produced (also 10242 by default).
- `-offset` selects a single frame; nothing combines frames, so multi-frame
  results need one invocation per offset.

## Typical Use Cases

### 1. Map a group/subject icosahedral map back to the native surface

```bash
# fieldsign-on-ico result from mri-func2sph: fs-ico-lh_000.bfloat
mri-sph2surf -i ./sph/fs-ico -o ./surf/fs -hemi lh -s subj01
# -> ./surf/fs-lh.w  (view with tksurfer/freeview as an overlay)
```

### 2. Export a specific frame

```bash
mri-sph2surf -i ./sph/h-ico -o ./surf/h_f3 -hemi rh -s subj01 -offset 3
# -> ./surf/h_f3-rh.w  (frame 3 only)
```

## Pipeline Context

`mri-sph2surf` is the final, display-oriented step of the legacy FS-FAST surface
chain. It is not called by [[wiki/pipelines/recon-all|recon-all]] or trac-all
(no caller exists in the tree; it is only mentioned in its own help text and as
the producer that [[mri-func2sph]]'s output feeds).

**Predecessors:** [[mri-structvits]] (`?h.ic10242-to-sph-sc.vit`) /
[[mri-func2sph]] (the ic10242 bvolume) → **mri-sph2surf** → **Successor:**
tksurfer/freeview overlay display of `outstem-$hemi.w`.

The modern replacement for icosahedron→subject-surface mapping is
[[mri_surf2surf]] (e.g. `--srcsubject fsaverage --trgsubject subj01`), which reads
and writes standard surface-overlay formats directly.

## Gotchas and Caveats

> [!gotcha] Input must be named exactly `instem-$hemi_000.bfloat`/`bshort`
> The script constructs the input filename itself; an arbitrarily named volume
> will not be found. This naming is exactly what [[mri-func2sph]] writes, so the
> two are meant to be used together.

> [!gotcha] Only one frame per `.w` file
> The `.w` paint format and this script emit a single value per vertex; the
> `-offset` frame chooses which. There is no multi-frame paint output.

## Error Compensation and Guard Rails

- `vss-resample`'s exit status is checked and the script propagates it on failure
  ([`scripts/mri-sph2surf:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L65-L69)); `vss-convert`'s status is likewise checked
  ([`scripts/mri-sph2surf:74-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L74-L78)).
- The input file is sought first as `.bfloat` then `.bshort`, erroring only if
  neither exists ([`scripts/mri-sph2surf:52-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L52-L59)).
- The required `.vit` table is existence-checked before any work
  ([`scripts/mri-sph2surf:46-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L46-L50)).

## Related Tools

- [[mri-func2sph]] — produces the ic10242 bvolume that this script consumes (the inverse direction).
- [[mri-funcvits]] — builds the `func→ico` table used by [[mri-func2sph]].
- [[mri-structvits]] — builds the `?h.ic10242-to-sph-sc.vit` table this script applies.
- [[mri_surf2surf]] — modern replacement for icosahedron/surface→subject-surface mapping.
- [[mri_vol2surf]] — modern volume→surface sampling (upstream of the modern equivalent).
- [[fsaverage]] — standard surface that plays the role the icosahedron does here.

## Confidence and Gaps

**High confidence:** the complete flag set, the fixed `ic10242` table name, the
`instem-$hemi_000.{bfloat,bshort}` input convention, the single-frame paint
output, and the resample→convert sequence — all read directly from
[`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf).

> [!gap] vss back-end and table byte layout
> `vss-resample` / `vss-convert` are not in the v8.2.0 source tree or install, and
> the `?h.ic10242-to-sph-sc.vit` table comes from [[mri-structvits]] (outside the
> assigned set). The `.vit`/`.vss` byte layouts and the paint serialisation are
> inferred from the call sites, not verified by running the tool. The chain is
> legacy; prefer the [[mri_surf2surf]] path.

## References

- FreeSurfer source: [`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf) (v8.2.0).
- Built-in help: `mri-sph2surf -help` (the `help` block, [`scripts/mri-sph2surf:209-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf#L209-L233)).
- Companion scripts: [`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph), [`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits), [`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits).
