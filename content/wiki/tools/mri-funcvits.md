---
title: "mri-funcvits"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/mri-funcvits"
families: []                       # legacy FS-FAST/vss vertex-index-table builder (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-structvits]]"
  - "[[mri-func2sph]]"
  - "[[mri-sph2surf]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2surf]]"
  - "[[fsaverage]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The vss-project / vss-buildvit / vss-cascadevit binaries are not in the v8.2.0 source tree or install; the .vit/.vss table semantics are inferred from the call sites only."
  - "The subject-side svit tables this script consumes (?h.sph-to-icNNNNN-sc.vit) are produced by mri-structvits, which is not in the assigned set; their byte layout is not documented here."
tags:
  - fsfast
  - retinotopy
  - surface-sampling
  - legacy
  - vss
  - structvits
---

# mri-funcvits

## Summary

`mri-funcvits` builds the **functional structure-vectors / vertex index tables**
that map a functional (EPI) acquisition onto the cortical surface and then onto a
standard icosahedron. For each hemisphere it (1) projects the subject's cortical
surface into the functional volume's coordinate frame using the functional
registration, (2) builds a function-voxel → cortical-surface-vertex table, and
(3) cascades that with the subject's precomputed surface → icosahedron table to
yield a single function-voxel → icosahedron-vertex table
(`?h.func-to-icNNNNN.vit`). That table is the input that [[mri-func2sph]] later
applies to actual functional volumes. It is a tcsh driver around the legacy "vss"
(vertex-structure-system) binaries `vss-project`, `vss-buildvit`, and
`vss-cascadevit`, and it depends on the subject-side tables built by
[[mri-structvits]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri-funcvits`
- **External helpers invoked (not in the v8.2.0 source tree):** `vss-project` ([`scripts/mri-funcvits:155-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L155-L156)), `vss-buildvit` ([`scripts/mri-funcvits:172-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L172-L173)), `vss-cascadevit` ([`scripts/mri-funcvits:185-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L185-L186)).

> [!gotcha] The "vss" back-end binaries are not part of v8.2.0
> `vss-project`, `vss-buildvit`, and `vss-cascadevit` are referenced by name but
> are **not present** in the v8.2.0 FreeSurfer source tree or install. They are an
> older Vertex-Structure-System toolchain superseded by the registration-based
> surface sampling in [[mri_vol2surf]] / [[mri_surf2surf]]. This page documents
> the script as written; treat the chain as **legacy / largely inoperative** on a
> stock v8.2.0 install.

## Purpose and Context

This is the **table-building** step of the legacy FS-FAST surface pipeline.
Because applying a geometric mapping to every functional volume would be slow,
FS-FAST instead solves the geometry once and stores it as a chain of vertex index
tables (`.vit`):

1. [[mri-structvits]] (run once per subject, anatomy-only) builds the
   subject-side tables in `$SUBJECTS_DIR/$subject/svit/`, notably
   `?h.sph-to-icNNNNN-sc.vit` (surface → icosahedron) and the inverse
   `?h.icNNNNN-to-sph-sc.vit`.
2. **`mri-funcvits`** (run once per functional template / registration) projects
   the paint surface into functional space via the registration, builds the
   function → surface table, and cascades it with the structvits surface → ico
   table to produce **`?h.func-to-icNNNNN.vit`**.
3. [[mri-func2sph]] applies `?h.func-to-icNNNNN.vit` to each functional volume.
4. [[mri-sph2surf]] applies the structvits inverse table to bring icosahedral
   results back onto the native surface.

It is run **by hand**; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]] or trac-all.

## Inputs

### Required Inputs

- **`-stem template-stem`** — stem of the functional template volume (its
  directory, `dirname stem`, must exist, [`scripts/mri-funcvits:61-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L61-L65)). The
  stem's directory is also the default location for the registration file.
- **`-outdir dir`** — directory to write the `?h.*.vit` / `?h.*.vss` tables
  (created if absent, [`scripts/mri-funcvits:106-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L106-L110)). The script `cd`s into
  it, so all outputs are written there with bare relative names.
- **Registration file** — `templatedir/register.dat` by default, or a path given
  with `-reg` (which is then copied to `templatedir/register.dat`,
  [`scripts/mri-funcvits:74-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L74-L86)). The **subject name is read from the first
  line of this file** ([`scripts/mri-funcvits:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L89)).
- **Subject `svit` directory** — `$SUBJECTS_DIR/$subject/svit` by default (or
  `-svitdir`), which must already contain the [[mri-structvits]] output
  `?h.sph-to-icNNNNN-sc.vit` ([`scripts/mri-funcvits:144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L144)).
- **Surfaces** — `$SUBJECTS_DIR/$subject/surf/?h.white` (the paint surface) and
  `?h.sphere` are referenced ([`scripts/mri-funcvits:139-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L139-L142)).

### Input Assumptions

> [!assumption] register.dat first line is the subject; structvits already run
> The subject is taken from line 1 of the registration file (the classic
> tkregister `register.dat` format), **not** from an LTA `subject` field. The
> subject's `svit/?h.sph-to-icNNNNN-sc.vit` table from [[mri-structvits]] must
> already exist for the same icosahedron order, or `vss-cascadevit` has nothing to
> cascade against.

> [!gotcha] Registration file format must be classic register.dat
> Unlike newer FreeSurfer scripts (which call `reg2subject` and handle LTA), this
> script does a literal `head -n 1` on the registration file
> ([`scripts/mri-funcvits:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L89)). An LTA-format registration whose first line is
> not the subject name will set `$subject` to garbage and the `svit` lookup will
> fail.

## Outputs

All outputs are written into `-outdir` with bare relative names (the script
`cd`s there, [`scripts/mri-funcvits:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L111)), one set per hemisphere.

### Files Created

| File / pattern | Format | Contents | Built by |
|----------------|--------|----------|----------|
| `?h.csurf-fc.vss` | vss structure | cortical-surface vertices expressed in functional ("fc") coordinates | `vss-project` ([`:155-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L155-L156)) |
| `?h.func-to-csurf.vit` | vertex index table | function-voxel → cortical-surface-vertex map (multi-link / `-mli`) | `vss-buildvit` ([`:172-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L172-L173)) |
| `?h.func-to-icNNNNN.vit` | vertex index table | function-voxel → icosahedron-vertex map (the deliverable consumed by [[mri-func2sph]]) | `vss-cascadevit` ([`:185-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L185-L186)) |

The registration is copied to `templatedir/register.dat` if `-reg` supplied a
different path, and removed again at the end ([`scripts/mri-funcvits:201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L201)).

### Output Specifications

The `.vit` files are vertex index tables (binary, vss format) — they hold, per
target vertex, the index/indices of the source element it maps from. The
`func-to-icNNNNN.vit` table's icosahedron order is `NNNNN` (default `10242`,
order 7). The `.vss` is the intermediate structure-vector representation of the
projected surface. (The exact byte layout is defined by the vss binaries, which
are not in the v8.2.0 tree — see Gaps.)

## Mathematical Foundations

`mri-funcvits` performs **no arithmetic itself**; it composes coordinate
transforms via the vss binaries:

1. **Project** (`vss-project`): the paint surface (`?h.white`) is mapped through
   the functional registration matrix (`-pm register.dat -f register`) so its
   vertices are expressed in functional voxel coordinates
   ([`scripts/mri-funcvits:155-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L155-L156)). This is the only place the
   registration enters.
2. **Build VIT** (`vss-buildvit -mli`): for each functional voxel, find which
   cortical-surface vertices project into it, producing a multi-link
   (one-to-many) function → surface table ([`scripts/mri-funcvits:172-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L172-L173)).
3. **Cascade** (`vss-cascadevit`): compose `func→surface` (a→b) with the
   structvits `surface→ico` table (`?h.sph-to-icNNNNN-sc.vit`, b→c) to get the
   net `func→ico` table (a→c, [`scripts/mri-funcvits:185-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L185-L186)).

> [!internal] The geometry lives in the vss toolchain
> Surface projection, voxel-membership testing, and table composition are
> implemented in `vss-project` / `vss-buildvit` / `vss-cascadevit`, not in this
> script. Those binaries are absent from the v8.2.0 tree; their algorithms are
> inferred from the call sites and FS-FAST conventions.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser ([`scripts/mri-funcvits:211-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L211-L318)).
`-stem` and `-outdir` are required (checked together at
[`scripts/mri-funcvits:43-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L43-L59)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-stem`<br>`-st` | string | *(required)* | Functional template stem. Its directory holds (or receives) `register.dat`. |
| `-outdir`<br>`-ou` | string | *(required)* | Output directory for the `?h.*.vit` / `.vss` tables; created and `cd`-ed into. |
| `-reg` | string | `templatedir/register.dat` | Functional → anatomical registration (classic `register.dat`). If given, it is copied to `templatedir/register.dat` for the run and deleted afterwards. |
| `-paintsurf`<br>`-ps` | string | `white` | Surface (`?h.<name>`) projected into functional space — the surface the data are "painted" onto. |
| `-sphere`<br>`-sp` | string | `sphere` | Spherical surface name (`?h.<name>`). Referenced for geometry setup. |
| `-can`<br>`-ca` | string | `sphere.dist_new` | Canonical (registered) spherical surface name. *(Set but only referenced as `$cansurf`; the main table cascade uses the structvits `sph-to-ic` table.)* |
| `-icosize`<br>`-ic` | integer | `10242` | Icosahedron order; selects the structvits table `?h.sph-to-icNNNNN-sc.vit` and names the output `?h.func-to-icNNNNN.vit`. |
| `-hemi`<br>`-he` | `lh`\|`rh` | `lh rh` (both) | Hemisphere(s). A single value restricts to one hemisphere; only `lh`/`rh` accepted ([`scripts/mri-funcvits:273-276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L273-L276)). |
| `-svitdir`<br>`-sv` | string | `$SUBJECTS_DIR/$subject/svit` | Directory of the subject-side structvits tables. |
| `-icodir` | string | `$FREESURFER_HOME/lib/bem/` | Directory of icosahedron reference data. |
| `-umask`<br>`-um` | string (octal) | — | Set the process umask before writing. |
| `-mail`<br>`-ma` | string (user) | — | Email this user when the job finishes ([`scripts/mri-funcvits:196-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L196-L199)). |
| `-noforce` | bool | off | Skip building any table that already exists in `-outdir` (per-table check, [`scripts/mri-funcvits:150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L150), [`:168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L168), [`:181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L181)). |
| `-verbose` | bool | off | tcsh `set verbose`. |
| `-echo` | bool | off | tcsh `set echo`. |
| `-debug` | bool | off | Echo each vss command and enable `echo`+`verbose` ([`scripts/mri-funcvits:228-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L228-L232)). |

### Configuration Interactions

> [!gotcha] `-noforce` resumes a partial build; without it everything is rebuilt
> Each of the three tables is regenerated **unless** it already exists **and**
> `-noforce` is set ([`scripts/mri-funcvits:150-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L150-L153), [`:168-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L168-L170), [`:181-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L181-L183)). Despite the
> name, `-noforce` means "do **not** force a rebuild" — it is a resume/skip flag,
> the opposite of a "force" flag. Use it to continue an interrupted run cheaply.

- **`-reg` vs default registration:** supplying `-reg` overwrites
  `templatedir/register.dat` for the duration of the run and deletes it
  afterwards; omitting `-reg` uses (and keeps) the existing
  `templatedir/register.dat`.
- **`-icosize` must match [[mri-structvits]]:** the cascade reads
  `?h.sph-to-icNNNNN-sc.vit`; that order must equal the one structvits was run
  with, or the cascade input is missing.
- **`-paintsurf`:** must be a real surface for the subject; the default `white`
  matches the current FS-FAST convention. (The original `orig`-based projection is
  commented out at [`scripts/mri-funcvits:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L154).)

## Typical Use Cases

### 1. Build function→ico tables for both hemispheres

```bash
# Subject's structvits tables already in $SUBJECTS_DIR/$subject/svit
mri-funcvits -stem ./bold/template -outdir ./fvit \
  -reg ./bold/register.dat -icosize 10242
# -> ./fvit/{lh,rh}.func-to-ic10242.vit (+ intermediates)
```

### 2. Resume a partial build for the left hemisphere only

```bash
mri-funcvits -stem ./bold/template -outdir ./fvit \
  -hemi lh -noforce
```

## Pipeline Context

`mri-funcvits` is the table-building step of the legacy FS-FAST surface chain. It
is not called by [[wiki/pipelines/recon-all|recon-all]] or trac-all (no caller
exists in the tree).

**Predecessor:** [[mri-structvits]] (subject `svit/?h.sph-to-icNNNNN-sc.vit`) →
**mri-funcvits** → **Successors:** [[mri-func2sph]] (applies
`?h.func-to-icNNNNN.vit` to functional volumes) → [[mri-sph2surf]] (icosahedron →
native surface).

The modern replacement for the geometry this script precomputes is the on-the-fly
registration-based sampling in [[mri_vol2surf]] followed by [[mri_surf2surf]] to
[[fsaverage]].

## Gotchas and Caveats

> [!gotcha] Subject identity comes from register.dat line 1
> If the registration file is not classic tkregister format, the subject name is
> wrong and the `svit` table lookup fails. This is stricter than newer scripts
> that use `reg2subject` / handle LTA.

> [!gotcha] Outputs land in `-outdir`, not next to the template
> The script `cd`s into `-outdir`, so the `?h.func-to-icNNNNN.vit` files are
> written there with bare names — not into `templatedir`.

## Error Compensation and Guard Rails

- Every vss step's exit status is checked; the script aborts with an explicit
  `ERROR: vss-…` message on failure ([`scripts/mri-funcvits:161-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L161-L164), [`:174-177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L174-L177), [`:187-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L187-L190)).
- The template directory, `svit` directory, `icodir`, and output directory are
  all existence-checked up front ([`scripts/mri-funcvits:61-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L61-L110)).
- `-noforce` skips already-built tables, making re-runs cheap and idempotent for
  the existing tables.

## Related Tools

- [[mri-structvits]] — builds the subject `svit/?h.sph-to-icNNNNN-sc.vit` table this script cascades against (and the inverse used by [[mri-sph2surf]]).
- [[mri-func2sph]] — consumes the `?h.func-to-icNNNNN.vit` table this script produces.
- [[mri-sph2surf]] — maps icosahedral results back to the native surface.
- [[mri_vol2surf]] — modern registration-based volume→surface sampling.
- [[mri_surf2surf]] — modern surface→surface/icosahedron resampling.
- [[fsaverage]] — standard average surface targeted by the modern chain.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the per-hemisphere
project → buildvit → cascadevit sequence, the three output tables, the
`register.dat`-line-1 subject extraction, the `-noforce` resume semantics, and
the `-reg` copy/cleanup — all read directly from
[`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits).

> [!gap] vss back-end and table byte layout
> `vss-project` / `vss-buildvit` / `vss-cascadevit` are not in the v8.2.0 source
> tree or install, and the structvits `svit` tables this script consumes are
> produced by [[mri-structvits]] (outside the assigned set). The `.vit`/`.vss`
> byte layouts and the exact projection/membership rules are inferred from the
> call sites, not verified by running the tool. The chain is legacy; prefer the
> [[mri_vol2surf]] / [[mri_surf2surf]] path.

## References

- FreeSurfer source: [`scripts/mri-funcvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits) (v8.2.0).
- Built-in usage: `mri-funcvits` with no/invalid arguments (the usage block,
  [`scripts/mri-funcvits:44-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-funcvits#L44-L58)).
- Companion scripts: [`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits), [`scripts/mri-func2sph`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-func2sph), [`scripts/mri-sph2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-sph2surf).
