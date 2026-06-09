---
title: "mri-structvits"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/mri-structvits"
families: []                       # legacy FS-FAST/vss structure-vector table builder (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-funcvits]]"
  - "[[mri-func2sph]]"
  - "[[mri-sph2surf]]"
  - "[[morph_tables-lh]]"
  - "[[morph_tables-rh]]"
  - "[[morph_subject-lh]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2surf]]"
  - "[[fsaverage]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The vss-surf2vit / vss-buildvit / vss-resample binaries are not in the v8.2.0 source tree or install; the .vit/.vss byte layouts and the knearest/distthresh sampling semantics are inferred from the call sites only."
  - "The exact resampling rule vss-buildvit uses for the spherical-coordinate table (-distthresh vs -knearest) is read from the command lines, not from the (absent) binary source."
tags:
  - fsfast
  - surface-sampling
  - structure-vectors
  - svit
  - vss
  - legacy
---

# mri-structvits

## Summary

`mri-structvits` builds the **subject-side structure-vector ("svit") tables** that
underpin the legacy FS-FAST / "vss" (Vertex-Structure-System) surface pipeline.
Run once per subject on its anatomy, it precomputes, for each hemisphere, the
vertex-index tables (`.vit`) and structure-vector files (`.vss`) that map the
subject's native cortical surface to and from a standard icosahedron in
spherical-registration space. These tables are the geometric scaffolding that the
downstream tools [[mri-funcvits]], [[mri-func2sph]], and [[mri-sph2surf]] cascade
against to move functional data between the surface and a common icosahedral
space. It is a tcsh driver that does no arithmetic itself; all geometry is
delegated to the external `vss-surf2vit`, `vss-buildvit`, and `vss-resample`
binaries.

> [!gotcha] The "vss" back-end binaries are not part of v8.2.0
> `vss-surf2vit`, `vss-buildvit`, and `vss-resample` are invoked by name but are
> **not present** in the v8.2.0 FreeSurfer source tree or install, and
> `mri-structvits` itself is **not installed** to `$FREESURFER_HOME/bin`. This is
> an older toolchain superseded by the registration-based surface sampling in
> [[mri_vol2surf]] / [[mri_surf2surf]]. This page documents the script as written;
> treat the whole chain as **legacy / largely inoperative** on a stock v8.2.0
> install.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits)
- **Binary/script location:** present in the source tree only; **not installed** to `$FREESURFER_HOME/bin` in v8.2.0 (so `--help` cannot be run).
- **External helpers invoked (not in the v8.2.0 source tree):**
  [`vss-surf2vit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L119)
  (orig-surface hole-fill table),
  [`vss-buildvit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L133-L134)
  (surface ↔ icosahedron vertex-index tables, called three times),
  [`vss-resample`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L146)
  (icosahedron vertex locations in spherical space).
- **Environment setup:** sources [`$FREESURFER_HOME/sources.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L35).

## Purpose and Context

The legacy FS-FAST surface pipeline avoids re-solving cortical geometry for every
functional volume by solving it **once** and storing the result as a chain of
**vertex-index tables** (`.vit`). `mri-structvits` is the **anatomy-only,
once-per-subject** root of that chain. Working in the subject's
spherical-registration frame, it establishes the correspondence between the
subject's native surface vertices and the vertices of a fixed-resolution
icosahedron (default 10242 vertices, subdivision order 5), in **both directions**,
and writes those correspondences to the subject's `svit/` directory.

In the broader FS-FAST chain:

1. **`mri-structvits`** (this tool, anatomy only) builds the subject-side tables
   in `$SUBJECTS_DIR/$subject/svit/`, notably the surface→icosahedron table
   `?h.sph-to-icNNNNN-sc.vit` and the inverse `?h.icNNNNN-to-sph-sc.vit`.
2. [[mri-funcvits]] (once per functional template/registration) projects the
   surface into functional space and **cascades** its function→surface table with
   the structvits surface→ico table to produce `?h.func-to-icNNNNN.vit`.
3. [[mri-func2sph]] applies that function→ico table to each functional volume,
   sampling it onto the icosahedron.
4. [[mri-sph2surf]] applies the structvits **inverse** table
   (`?h.icNNNNN-to-sph-sc.vit`) to bring icosahedral results back onto the
   subject's native surface.

It is run **by hand** (typically via the wrappers [[morph_tables-lh]] /
[[morph_tables-rh]]); it is **not** part of [[wiki/pipelines/recon-all|recon-all]]
or trac-all (no caller exists in either script). The conceptually modern
replacement for "establish a surface↔common-space correspondence once" is the
`?h.sphere.reg`-based resampling performed by [[mri_surf2surf]] (to/from
[[fsaverage]] or another icosahedral target) and [[mri_vol2surf]] for the
volume→surface step.

## Inputs

### Required Inputs

- **`-subject <name>`** — the only required argument (the script exits with usage
  if `$#subject != 1`, [`scripts/mri-structvits:40-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L40-L56)). The subject must
  live under `$SUBJECTS_DIR`.
- For **each requested hemisphere**, three surfaces must already exist under
  `$SUBJECTS_DIR/$subject/surf/` (each is existence-checked,
  [`scripts/mri-structvits:95-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L95-L106)):
  - `?h.<orig>` — the native surface (default `?h.orig`), used to build the
    hole-fill table. See [[surface-format]].
  - `?h.<sphere>` — the unregistered spherical surface (default `?h.sphere`).
  - `?h.<can>` — the **canonical / registered** spherical surface (default
    `?h.sphere.reg`); this is the surface that carries the cross-subject
    correspondence.
- **`$SUBJECTS_DIR`** must be set (used to locate surfaces and the default output
  directory).

### Input Assumptions

> [!assumption] A completed spherical registration must already exist
> The tool assumes [[wiki/pipelines/recon-all|recon-all]] (or the legacy
> [[morph_subject-lh]]) has already produced the spherical surfaces — in
> particular the registered `?h.sphere.reg`. It validates only that the three
> named surface files **exist**; it does not check their resolution, that they are
> genuine spheres, or that the registration is sane. A missing surface aborts that
> hemisphere with an explicit `ERROR: … does not exist`.

The default canonical surface is `sphere.reg`. A comment records that this default
was changed from the older `sphere.dist_new` on **2000-03-27 by D. Greve (dng)**
([`scripts/mri-structvits:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L30)) — the sibling tools [[mri-funcvits]] / [[mri-func2sph]]
still default `-can` to `sphere.dist_new`, so the canonical-surface default is
**not** consistent across the family.

## Outputs

All outputs are written into the **svit directory** — `$SUBJECTS_DIR/$subject/svit`
by default, or the `-outdir` path — which the script creates with `mkdir -p` and
then `cd`s into ([`scripts/mri-structvits:58-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L58-L69)), so all files are written with
bare relative names. `NNNNN` is the icosahedron size (default `10242`).

### Files Created

Per hemisphere (file basenames assembled at
[`scripts/mri-structvits:108-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L108-L111)):

| File / pattern | Format | Contents | Built by |
|----------------|--------|----------|----------|
| `?h.<orig>-fill.vit` (e.g. `lh.orig-fill.vit`) | vertex-index table | Hole-fill table for the native (`orig`) surface — used to fill gaps when sampling onto the surface. | `vss-surf2vit` ([`:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L119)) |
| `?h.sph-to-ic<NNNNN>-cc.vit` | vertex-index table | Canonical-coordinate ("cc") surface → icosahedron map: for each icosahedron vertex, the **nearest** (`-knearest 1`) registered-surface vertex. | `vss-buildvit` ([`:133-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L133-L134)) |
| `?h.ic<NNNNN>-sc.vss` | structure-vector (`.vss`) | The icosahedron vertices' locations in the subject's **spherical** ("sc") coordinate space, obtained by resampling the `sphere` surface through the `-cc` table. | `vss-resample` ([`:146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L146)) |
| `?h.sph-to-ic<NNNNN>-sc.vit` | vertex-index table | Spherical-coordinate ("sc") surface → icosahedron map, built with a **geodesic/distance threshold** (`-distthresh <dist>`) rather than a single nearest neighbour. **This is the table the downstream FS-FAST tools cascade against.** | `vss-buildvit` ([`:160-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L160-L161)) |
| `?h.ic<NNNNN>-to-sph-sc.vit` | vertex-index table | The **inverse**: icosahedron → spherical-coordinate surface map (`-knearest 1`). Used by [[mri-sph2surf]] to bring icosahedral results back onto the native surface. | `vss-buildvit` ([`:173-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L173-L174)) |

The console log records the parameters and per-hemisphere progress with
timestamps; when invoked through [[morph_tables-lh]] this is `tee`-captured to
`?h.sphere.reg.svit.log`.

### Output Specifications

The `.vit` files are **vertex-index tables**: for each target vertex they store
the index (or, where the build uses a distance threshold, the indices) of the
source vertex it maps from. The `.vss` file is a **structure-vector**
representation holding the icosahedron vertices' spherical-space coordinates. The
icosahedron order is fixed by `-icosize` (default 10242 → subdivision order 5).
The exact byte layout of both formats is owned by the `vss-*` binaries, which are
absent from the v8.2.0 tree (see [Confidence and Gaps](#confidence-and-gaps)).
See [[surface-format]] for the native surface inputs.

## Mathematical Foundations

`mri-structvits` performs **no arithmetic itself**; it orchestrates four `vss-*`
invocations whose composition establishes the surface↔icosahedron correspondence.
The geometric content is the choice of **sampling rule** at each step:

1. **Hole-fill table** (`vss-surf2vit`): build a table over the native `orig`
   surface used to fill unsampled vertices later
   ([`scripts/mri-structvits:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L119)).
2. **Canonical-coordinate map** (`vss-buildvit -knearest 1`): in the registered
   (`sphere.reg`) frame, assign each icosahedron vertex its single nearest
   surface vertex ([`scripts/mri-structvits:133-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L133-L134)).
3. **Spherical embedding** (`vss-resample`): push the icosahedron vertices through
   that map to read off their positions on the **unregistered** `sphere` surface,
   yielding the `.vss` ([`scripts/mri-structvits:146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L146)).
4. **Distance-threshold map** (`vss-buildvit -distthresh <dist>`): build the
   forward surface→ico table using a geodesic distance threshold so that each
   icosahedron vertex can gather **all** surface vertices within `dist` mm — a
   one-to-many (area-aware) sampling rather than a single nearest neighbour
   ([`scripts/mri-structvits:160-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L160-L161)).
5. **Inverse map** (`vss-buildvit -knearest 1`): build the ico→surface table with
   single-nearest sampling ([`scripts/mri-structvits:173-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L173-L174)).

> [!math] Why two surface→ico tables (`-cc` vs `-sc`)
> The **`-cc`** table is computed in *canonical* (registered) coordinates with a
> strict nearest-neighbour rule and is used only as an intermediary to read out
> icosahedron positions on the native sphere. The **`-sc`** table is the one that
> actually carries data: it is built in *spherical* coordinates with a geodesic
> **distance threshold** `dist` (default $2\,\text{mm}$), so a coarse icosahedron
> vertex averages over the patch of fine surface vertices around it instead of
> picking exactly one — reducing aliasing when downsampling the dense cortical
> mesh onto the icosahedron.

> [!internal] The geometry lives in the vss toolchain
> Nearest-vertex search, geodesic-threshold gathering, resampling, and the
> `.vit`/`.vss` file formats are implemented in `vss-surf2vit` / `vss-buildvit` /
> `vss-resample`, not in this script. Those binaries are absent from the v8.2.0
> tree; their algorithms are inferred from the call-site flags and FS-FAST
> conventions.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/mri-structvits:196-286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L196-L286)). Every flag takes exactly one
argument except `-noforce` / `-update`, which are booleans. Each option has a
two-letter short alias.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-subject`<br>`-su` | string | *(required)* | FreeSurfer subject ID under `$SUBJECTS_DIR`. The only mandatory argument. |
| `-orig`<br>`-or` | string | `orig` | Name of the native surface (`?h.<name>`) used to build the hole-fill table. |
| `-sphere`<br>`-sp` | string | `sphere` | Name of the unregistered spherical surface (`?h.<name>`). |
| `-can`<br>`-ca` | string | `sphere.reg` | Name of the **canonical / registered** spherical surface (`?h.<name>`) that carries the cross-subject correspondence. Changed from `sphere.dist_new` in 2000 ([`scripts/mri-structvits:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L30)). |
| `-icosize`<br>`-ic` | integer | `10242` | Icosahedron vertex count (subdivision order); sets the `NNNNN` in every output filename. 10242 = order 5. |
| `-hemi`<br>`-he` | `lh`\|`rh` | `lh rh` (both) | Restrict processing to one hemisphere. Only `lh` or `rh` accepted; anything else is a hard error ([`scripts/mri-structvits:239-242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L239-L242)). |
| `-outdir`<br>`-ou` | string | `$SUBJECTS_DIR/$subject/svit` | Output directory for the `.vit` / `.vss` tables; created with `mkdir -p` and `cd`-ed into. |
| `-dist`<br>`-di` | float (mm) | `2` | Geodesic distance threshold passed to `vss-buildvit -distthresh` for the spherical-coordinate surface→ico table; larger values gather a wider surface patch per icosahedron vertex. |
| `-umask`<br>`-um` | string (octal) | — | Set the process umask before writing outputs (e.g. `0` for world-writable). Echoes an INFO line. |
| `-mail`<br>`-ma` | string (user) | — | Email this user when the job finishes or fails ([`scripts/mri-structvits:183-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L183-L186), [`:293-295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L293-L295)). |
| `-update` | bool | off | Skip building any table that already exists in the output directory (resume an interrupted run). Sets the same internal `noforce` flag as `-noforce`. |
| `-noforce` | bool | off | Identical to `-update` (skip already-existing tables). Accepted but **omitted from the usage text**, which lists only `-update` ([`scripts/mri-structvits:50-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L50-L51)). |

### Configuration Interactions

> [!gotcha] `-noforce` / `-update` mean "do **not** force a rebuild" — they are skip flags
> Both flags set the same internal variable `noforce=1`
> ([`scripts/mri-structvits:270-276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L270-L276)). Each of the five output tables is
> rebuilt **unless it already exists *and* `noforce` is set**
> (e.g. [`scripts/mri-structvits:115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L115), [`:129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L129), [`:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L142), [`:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L156), [`:169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L169)). So
> the default (neither flag) **always rebuilds everything**, overwriting prior
> output; pass `-update` (or `-noforce`) to resume cheaply. The skip check is
> existence-only — it does **not** compare timestamps, so a stale table left over
> from changed inputs is **not** detected by `-update`.

> [!gotcha] `-icosize`, `-can`, and `-dist` must match what the downstream tools expect
> The output filenames embed `-icosize` (`?h.sph-to-ic<NNNNN>-sc.vit`).
> [[mri-funcvits]] later reads `?h.sph-to-icNNNNN-sc.vit` for a **specific**
> `NNNNN`; if structvits was run with a different `-icosize`, the cascade input is
> missing. Likewise the registration baked into the `-sc` table is whatever
> surface `-can` named, so the surface used here must be the same registration the
> rest of the analysis assumes.

- **`-hemi` selects one hemisphere; default is both.** Supplying `-hemi lh`
  restricts the whole run to the left hemisphere (used by the per-hemisphere
  wrappers [[morph_tables-lh]] / [[morph_tables-rh]]).
- **`-outdir` is independent of `-subject`** for the *output* path but the
  *inputs* are always read from `$SUBJECTS_DIR/$subject/surf/`; you can redirect
  where tables are written without moving the subject.
- **`-dist` only affects the `-sc` forward table** (`vss-buildvit -distthresh`);
  the `-cc`, `.vss`, and inverse steps use `-knearest 1` and ignore `-dist`.

## Typical Use Cases

### 1. Build svit tables for both hemispheres (default)

```bash
export SUBJECTS_DIR=/data/subjects
# Subject must already have ?h.orig, ?h.sphere, ?h.sphere.reg from recon-all
mri-structvits -subject bert
# -> $SUBJECTS_DIR/bert/svit/{lh,rh}.sph-to-ic10242-sc.vit  (+ the other tables)
```

### 2. Single hemisphere, world-writable, as the morph_tables wrappers call it

```bash
# This is exactly the invocation in scripts/morph_tables-lh:39-40
mri-structvits -subject bert -umask 0 \
  -hemi lh -outdir $SUBJECTS_DIR/bert/svit -can sphere.reg \
  | tee -a $SUBJECTS_DIR/bert/svit/lh.sphere.reg.svit.log
```

### 3. Higher-resolution icosahedron with a wider sampling patch

```bash
mri-structvits -subject bert -icosize 40962 -dist 3
# order-6 icosahedron, 3 mm geodesic gathering for the -sc table
```

### 4. Resume an interrupted run without rebuilding finished tables

```bash
mri-structvits -subject bert -update
# rebuilds only the ?h.*.vit / ?h.*.vss files that are missing
```

## Pipeline Context

`mri-structvits` is the anatomy-only **root table-builder** of the legacy FS-FAST
surface chain. It is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or
trac-all (no reference exists in either script). Its real callers are the legacy
morphometry wrappers:

- [[morph_tables-lh]] and [[morph_tables-rh]] call it live with the fixed line
  `mri-structvits -subject $1 -umask 0 -hemi <hemi> -outdir <subj>/svit -can sphere.reg`
  ([`scripts/morph_tables-lh:39-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L39-L40)).
- [[morph_subject-lh]] / [[morph_subject-rh]] contain the **same** invocation in a
  **dead block after `exit 0`** ([`scripts/morph_subject-lh:87-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L87-L101)) — it never
  runs; the live equivalent is `morph_tables-*`.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] / [[morph_subject-lh]]
(produces `?h.sphere.reg`) → **mri-structvits** → **Successors:** [[mri-funcvits]]
(cascades `?h.sph-to-icNNNNN-sc.vit` into function→ico tables) → [[mri-func2sph]]
(samples functional volumes onto the icosahedron) and [[mri-sph2surf]] (uses
`?h.icNNNNN-to-sph-sc.vit` to return icosahedral results to the native surface).

The modern replacement for the once-per-subject surface↔common-space
correspondence this tool precomputes is [[mri_surf2surf]] (resampling via
`?h.sphere.reg` to/from [[fsaverage]] or any icosahedral target), with
[[mri_vol2surf]] handling the volume→surface step that [[mri-funcvits]] +
[[mri-func2sph]] perform in the legacy chain.

## Gotchas and Caveats

> [!gotcha] Default behaviour overwrites existing tables
> Without `-update`/`-noforce`, every table is regenerated and the prior file is
> overwritten. Re-running on a subject that already has a `svit/` directory
> silently redoes all work. Pass `-update` to make re-runs idempotent.

> [!gotcha] Canonical-surface default differs from the sibling tools
> `mri-structvits` defaults `-can` to `sphere.reg`, but [[mri-funcvits]] and
> [[mri-func2sph]] default `-can` to the older `sphere.dist_new`. If you rely on
> defaults across the chain you can end up referencing two different
> registrations. Set `-can` explicitly when consistency matters.

> [!gotcha] Inputs come from `$SUBJECTS_DIR`, outputs can go elsewhere
> Surfaces are always read from `$SUBJECTS_DIR/$subject/surf/`, but `-outdir`
> redirects only the table destination. The tables encode the subject identity
> implicitly through the surfaces, not through their path.

> [!gotcha] The mail step is malformed
> The success-notification line pipes `echo … | echo "" | mail …`
> ([`scripts/mri-structvits:183-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L183-L186)); the second `echo` discards the first
> message, so the notification body is empty. Only the subject line is meaningful.

## Error Compensation and Guard Rails

- **Usage gate.** Running without exactly one `-subject` prints the full usage and
  exits 1 ([`scripts/mri-structvits:40-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L40-L56)).
- **Output directory created.** `mkdir -p $vitdir`; if it still cannot be reached,
  the script aborts via `error_exit`
  ([`scripts/mri-structvits:62-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L62-L67)).
- **Per-hemisphere input checks.** Each of `?h.<orig>`, `?h.<sphere>`, `?h.<can>`
  is existence-checked before any `vss-*` call; a missing surface aborts with an
  explicit message ([`scripts/mri-structvits:95-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L95-L106)).
- **Every vss step's status is checked.** A non-zero exit from any `vss-surf2vit`
  / `vss-buildvit` / `vss-resample` call aborts the run with an
  `ERROR: vss-…` message ([`scripts/mri-structvits:121-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L121-L125), [`:135-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L135-L138), [`:148-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L148-L152), [`:162-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L162-L165), [`:175-178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L175-L178));
  on failure, if `-mail` was given the user is emailed
  ([`scripts/mri-structvits:289-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L289-L296)).
- **No timestamp comparison.** The `-update` skip is existence-only and does not
  detect inputs newer than an existing table (contrast with `UpdateNeeded`-based
  scripts).

## Related Tools

- [[mri-funcvits]] — consumes the `?h.sph-to-icNNNNN-sc.vit` table this tool builds, cascading it with a function→surface table.
- [[mri-func2sph]] — applies the resulting function→ico table to functional volumes (and uses `vss-resample` like this tool).
- [[mri-sph2surf]] — uses the inverse table `?h.icNNNNN-to-sph-sc.vit` to map icosahedral results back to the native surface.
- [[morph_tables-lh]] / [[morph_tables-rh]] — the legacy wrappers that actually invoke this script (per hemisphere).
- [[morph_subject-lh]] — contains the same call in a dead post-`exit 0` block; produces the `?h.sphere.reg` registration this tool samples.
- [[mri_surf2surf]] — modern surface↔surface/icosahedron resampling (the replacement for this correspondence-building step).
- [[mri_vol2surf]] — modern registration-based volume→surface sampling (replaces the function-projection role in the chain).
- [[fsaverage]] — standard icosahedral average-surface target of the modern chain.

## Confidence and Gaps

**High confidence (read directly from
[`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits)):**
the complete flag set and short aliases, the defaults (icosize 10242, dist 2 mm,
hemi lh+rh, orig/sphere/sphere.reg surface names, `svit/` output), the five output
filenames and which `vss-*` call builds each, the per-hemisphere
existence checks and status checks, the `-update`/`-noforce` skip semantics, and
the fact that the tool is not installed and not called by recon-all/trac-all.

> [!gap] vss back-end and table byte layout
> `vss-surf2vit`, `vss-buildvit`, and `vss-resample` are not present in the v8.2.0
> source tree or install. The `.vit`/`.vss` byte layouts, and the precise meaning
> of `-knearest 1` vs `-distthresh <dist>` (e.g. tie-breaking, how multi-link
> entries are stored, units of the threshold), are inferred from the command-line
> flags and FS-FAST conventions, not verified against binary source or by running
> the tool.

> [!gap] Downstream consumer status
> The only in-tree consumers of the `svit/` tables are the other legacy FS-FAST
> scripts ([[mri-funcvits]], [[mri-func2sph]], [[mri-sph2surf]]). No current
> recon-all stage reads `svit/`. Whether any maintained workflow still uses these
> tables on v8.2.0 is unconfirmed.

## References

- FreeSurfer source: [`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits) (v8.2.0).
- Built-in usage: `mri-structvits` with no/invalid arguments (the usage block, [`scripts/mri-structvits:41-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits#L41-L55)).
- Callers: [`scripts/morph_tables-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh), [`scripts/morph_tables-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh); dead block in [`scripts/morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L87-L101).
- Companion scripts: [`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits), [`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph), [`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf).
