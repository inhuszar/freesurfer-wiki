---
title: "aparc_stats_aseg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/aparc_stats_aseg"
families: []                     # standalone orchestrator script (no mri_*/mris_* family)
recon_all_stage: null            # not invoked by recon-all
related:
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[mri_aparc2aseg]]"
  - "[[mri_segstats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[annotation-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Version gate keys on the legacy `freesurfer` version string (5.3.0 / 6.0.0 / dev); how an 8.2.0 install reports here, and therefore which conditional branches fire, was not exercised at runtime."
tags:
  - parcellation
  - segmentation
  - stats
  - aparc
  - aseg
---

# aparc_stats_aseg

## Summary

`aparc_stats_aseg` is a small tcsh orchestrator that runs the three steps needed
to apply a **custom cortical parcellation atlas** (a `.gcs` file) to an
already-reconstructed FreeSurfer subject and to derive the standard cortical
products from it: (1) cortical parcellation with [[mris_ca_label]], (2)
per-region surface anatomical statistics with [[mris_anatomical_stats]], and (3)
mapping of the surface parcellation into the volume, merged with the `aseg`, via
[[mri_aparc2aseg]]. It exists so that a user with a non-default or
locally-trained parcellation atlas can reproduce the `?h.aparc.<name>.annot`,
`?h.aparc.<name>.stats`, and `aparc.<name>+aseg.mgz` outputs that
[[wiki/pipelines/recon-all|recon-all]] normally produces only for the built-in
Desikan-Killiany and Destrieux atlases.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/aparc_stats_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg)
- **Binary/script location:** `$FREESURFER_HOME/bin/aparc_stats_aseg`
- **Tools invoked:** [`mris_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L57), [`mris_anatomical_stats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L101-L103), [`mri_aparc2aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L131), plus the FreeSurfer helpers `fsr-getxopts`, `fsr-checkxopts`, `getfullpath`, and the `freesurfer` version-reporting wrapper.

## Purpose and Context

A standard [[wiki/pipelines/recon-all|recon-all]] run produces a cortical
parcellation only for the atlases shipped with FreeSurfer. When a lab trains its
own Gaussian Classifier Surface atlas (a `.gcs` file, see [`mris_ca_train`])
— or simply wants to re-apply the Destrieux atlas with explicit control over the
output names — it needs to drive the three downstream tools by hand in the
correct order, against the correct already-built surfaces. `aparc_stats_aseg`
packages exactly that recipe:

1. **Cortical parcellation** ([`scripts/aparc_stats_aseg:42-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L42-L76)):
   for each hemisphere, [[mris_ca_label]] classifies every vertex of
   `?h.sphere.reg` against the per-hemisphere atlas
   `<gcsdir>/<hemi>.<gcs>.gcs`, optionally constrained to the cortex label and
   informed by the existing `aseg`, writing `?h.aparc.<name>.annot`.
2. **Surface anatomical statistics** ([`scripts/aparc_stats_aseg:82-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L82-L113)):
   [[mris_anatomical_stats]] reads that annotation and the `white` surface and
   emits `?h.aparc.<name>.stats` (surface area, gray-matter volume, thickness,
   curvature, etc., per parcel).
3. **Volume mapping** ([`scripts/aparc_stats_aseg:118-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L118-L170)):
   [[mri_aparc2aseg]] projects both hemispheres' parcellations into the volume
   and merges them with the subcortical `aseg`, writing
   `aparc.<name>+aseg.mgz`.

It is run **by hand** on a finished subject; it is **not** part of recon-all
(recon-all hard-codes the canonical atlas invocations instead). It therefore
sits *after* a full reconstruction and assumes all of recon-all's surface and
volume products already exist.

> [!gotcha] This is an orchestrator, not a stats calculator
> Despite the name, `aparc_stats_aseg` computes nothing itself. The
> "stats" come entirely from [[mris_anatomical_stats]]; the script only chains
> the parcellation → stats → volume-mapping tools and manages output paths,
> expert-options files, and longitudinal naming.

## Inputs

### Required Inputs

- **Subject** (`-s`/`-subject`/`-subjid`/`-sid`): the name of a fully
  reconstructed subject under `$SUBJECTS_DIR`. The subject directory must already
  contain the recon-all surface and volume products (see Assumptions).
- **GCS atlas name** (`-gcs <name>`): the base name of a per-hemisphere Gaussian
  Classifier Surface atlas. The script looks for
  `<gcsdir>/<hemi>.<name>.gcs` and **errors out if either hemisphere's file is
  missing** ([`scripts/aparc_stats_aseg:348-353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L348-L353)). With `-a2009s`
  the GCS name is forced to the bundled Destrieux atlas and `-gcs` is not
  required.

### Input Assumptions

The script reaches into a recon-all subject tree by **relative path** from
`$SUBJECTS_DIR/<subj>/scripts` (it `cd`s there first), so the following must
already exist:

| Required pre-existing file | Used by | Referenced at |
|----------------------------|---------|---------------|
| `surf/?h.sphere.reg` | mris_ca_label (spherical registration target) | [`:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L71) |
| `surf/?h.white` | mris_anatomical_stats (geometry) | [`:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L107) |
| `label/?h.cortex.label` | mris_ca_label / mris_anatomical_stats `-cortex` (only when `-noaseg` is **not** given) | [`:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L58), [`:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L106) |
| `mri/aseg.mgz` (or `aseg.presurf.mgz` on the `6.0.0`/`dev` path) | mris_ca_label `-aseg` | [`:60-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L60-L62) |
| `mri/norm.mgz`, `mri/transforms/talairach.m3z` | mri_aparc2aseg `--relabel` (only on the `6.0.0`/`dev` path, and only if `talairach.m3z` is present) | [`:134-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L134-L137) |

> [!assumption] A finished recon-all subject is required
> `aparc_stats_aseg` assumes a complete reconstruction: registered spheres,
> white surfaces, cortex labels, and an `aseg`. It does **not** build any of
> these. Running it on an incomplete subject fails inside the first tool that
> cannot find its input. The matching `.gcs` atlas for **both** hemispheres must
> also be present, or the script aborts before doing any work.

## Outputs

### Files Created

Paths are shown for the default case; with `-o <dir>` every product is written
under that directory instead (see Configuration Interactions).

| File | Default location | Contents |
|------|------------------|----------|
| `?h.aparc.<name>.annot` | `$SUBJECTS_DIR/<subj>/label/` | per-hemisphere cortical parcellation ([[annotation-format]]) from [[mris_ca_label]] |
| `?h.aparc.<name>.stats` | `$SUBJECTS_DIR/<subj>/stats/` | per-parcel surface statistics from [[mris_anatomical_stats]] |
| `aparc.<name>+aseg.mgz` | `$SUBJECTS_DIR/<subj>/mri/` | volumetric parcellation merged with the `aseg`, from [[mri_aparc2aseg]] |
| `aparc_stats_aseg.log` | `<subj>/scripts/` (or `<outdir>/`) | full run log (every command line is `tee`d here) |

Here `<name>` is the parcellation name: the `-name` value if given, else
`a2009s` under `-a2009s`, else the bare GCS name
([`scripts/aparc_stats_aseg:358-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L358-L364)).

> [!gotcha] The colour table is created and then deleted
> [[mris_anatomical_stats]] is told to write a colour table
> `label/aparc.annot.<name>.ctab` with `-c`, but the script `rm`s it immediately
> after the per-hemisphere loop ([`scripts/aparc_stats_aseg:112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L112)). It is a
> transient scratch file, not a deliverable.

### Output Specifications

The geometry, label IDs, and data types of all outputs are determined entirely
by the three sub-tools. The `aparc.<name>+aseg.mgz` volume is an integer label
volume in the subject's conformed `mri/` space (matching `aseg.mgz`), with
cortical voxels carrying the parcellation label IDs and subcortical voxels
carrying the `aseg` IDs; `--volmask` ([`scripts/aparc_stats_aseg:131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L131))
restricts cortical relabelling to the ribbon mask.

## Mathematical Foundations

None in this script — it performs no arithmetic beyond string assembly. The
substantive computation lives in the sub-tools:

> [!internal] All math is in the sub-tools
> Vertex classification (Bayesian MAP labelling against the GCS atlas) is in
> [[mris_ca_label]]; per-parcel area / volume / thickness integration is in
> [[mris_anatomical_stats]]; surface-to-volume projection and `aseg` merge is in
> [[mri_aparc2aseg]]. See those pages for the equations.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/aparc_stats_aseg:193-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L193-L313)). Defaults are the values set at
the top of the script ([`scripts/aparc_stats_aseg:3-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L3-L27)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s`<br>`-subject`<br>`-subjid`<br>`-sid` | string | *(required)* | Subject name under `$SUBJECTS_DIR`. |
| `-gcs` | string | *(required unless `-a2009s`)* | Base name of the per-hemisphere GCS atlas; the script uses `<gcsdir>/<hemi>.<gcs>.gcs`. Also sets the default parcellation name. |
| `-sd`<br>`-sdir` | string | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR` for this run. |
| `-gcsd`<br>`-gcsdir` | string | `$FREESURFER_HOME/average` | Directory holding the `?h.<gcs>.gcs` atlas files. |
| `-name` | string | GCS name (or `a2009s`) | Parcellation name `<name>` embedded in every output filename. |
| `-o` | string | *(in-tree)* | Write all outputs to this directory instead of the subject's `label/`, `stats/`, `mri/`; symlinks the annots back into `label/` during the run. |
| `-log` | string | `<subj>/scripts/aparc_stats_aseg.log` (or `<outdir>/aparc_stats_aseg.log`) | Explicit log-file path. |
| `-a2009s` | bool | off | Use the bundled Destrieux atlas (`destrieux.simple.2009-07-29.gcs`), set the parcellation name to `a2009s`, and pass `--a2009s` to [[mri_aparc2aseg]]. |
| `-lh`<br>`-lh-only` | bool | off | Process the left hemisphere only (also passes `-noglobal` to anatomical stats and `--lh` to aparc2aseg). |
| `-rh`<br>`-rh-only` | bool | off | Process the right hemisphere only (also `-noglobal` / `--rh`). |
| `-noaseg` | bool | aseg used | Do **not** use the cortex label or `aseg` in `mris_ca_label`, and **skip `mri_aparc2aseg` entirely** (sets `DoAParc2ASeg=0`). |
| `-nocortparc` | bool | parc on | Skip the cortical-parcellation step (reuse existing annots). |
| `-noparcstats` | bool | stats on | Skip the surface-statistics step. |
| `-noaparc2aseg` | bool | mapping on | Skip the volume-mapping step. |
| `-th3` | bool | **on** | Pass `-th3` to `mris_anatomical_stats` (newer gray-matter volume calculation); only takes effect on the `6.0.0`/`dev` version path. |
| `-no-th3` | bool | off | Pass `-no-th3` instead (legacy volume calculation). |
| `-norandomness` | bool | **on** | Make `mris_ca_label` deterministic by passing a fixed `-seed`. |
| `-randomness` | bool | off | Allow `mris_ca_label` to use a random seed (omit `-seed`). |
| `-seed`<br>`-rng-seed` | int | `1234` | Fixed random seed for `mris_ca_label` (also forces `-norandomness`). |
| `-long`<br>`-longitudinal` | `<tpNid> <templateid>` | off | Longitudinal mode: builds the subject ID `<tpNid>.long.<templateid>`, forces determinism, and passes `-long -R <base>/label/?h.aparc.<name>.annot` to `mris_ca_label`. |
| `-expert` | string (file) | — | Expert-options file passed through `fsr-getxopts` to each sub-tool; validated by `fsr-checkxopts` and copied to `scripts/expert-options`. |
| `-xopts-use` | bool | **on** | Use a pre-existing `scripts/expert-options` file. |
| `-xopts-clean` | bool | off | Delete a pre-existing `scripts/expert-options` file. |
| `-xopts-overwrite` | bool | off | Overwrite a pre-existing `scripts/expert-options` with the `-expert` file. |

> [!gotcha] `-o` does not validate its argument
> The `-o` case shifts its argument without the `if($#argv < 1) goto arg1err`
> guard that every other value-taking flag uses
> ([`scripts/aparc_stats_aseg:225-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L225-L227)). Putting `-o` last on the command
> line (with no directory after it) does not produce the clean "flag requires one
> argument" error; it consumes whatever follows, or sets an empty `OUTDIR`. Always
> give `-o` an explicit directory.

### Configuration Interactions

> [!gotcha] `-xopts-use` and `-xopts-clean` are mutually exclusive
> Both default-on `-xopts-use` and an explicit `-xopts-clean` is rejected with
> "cannot specify both" ([`scripts/aparc_stats_aseg:378-381`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L378-L381)). Because a
> pre-existing `scripts/expert-options` plus neither flag also errors, you must
> consciously choose what to do with a stale expert-options file. A
> `$SUBJECTS_DIR/global-expert-options.txt` further requires `-xopts-use`
> ([`scripts/aparc_stats_aseg:427-441`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L427-L441)).

> [!gotcha] `-noaseg` silently disables the volume-mapping step
> `-noaseg` sets both `UseAseg=0` **and** `DoAParc2ASeg=0`
> ([`scripts/aparc_stats_aseg:245-248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L245-L248)). So requesting "no aseg" also means
> "no `aparc.<name>+aseg.mgz`", even without `-noaparc2aseg`. Conversely,
> [[mri_aparc2aseg]] reads the on-disk `aseg`, so the aseg-merged volume is
> produced only while the cortex/aseg constraints are active.

- **`-a2009s` overrides `-gcs`/`-name`:** it forces the Destrieux GCS file and
  (absent `-name`) the parcellation name `a2009s`, and adds `--a2009s` to
  aparc2aseg ([`scripts/aparc_stats_aseg:241-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L241-L243), [`:154-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L154-L158)).
- **`-lh`/`-rh` are per-hemisphere switches** that also add `-noglobal` to
  `mris_anatomical_stats` and `--lh`/`--rh` to aparc2aseg, so a single-hemisphere
  run does not attempt to write a both-hemisphere volume.
- **The three `-noXXX` skip flags compose:** you can, e.g., re-run only the stats
  step on existing annots with `-nocortparc -noaparc2aseg`.
- **`-seed` implies `-norandomness`;** `-randomness` undoes the default fixed
  seed. Use `-randomness` only if you deliberately want non-reproducible labelling.

## Typical Use Cases

### 1. Apply a custom-trained atlas to a finished subject

```bash
# Atlas files lh.myatlas.gcs / rh.myatlas.gcs live in /atlases.
aparc_stats_aseg -s subj01 -gcsd /atlases -gcs myatlas
# → label/?h.aparc.myatlas.annot, stats/?h.aparc.myatlas.stats,
#   mri/aparc.myatlas+aseg.mgz
```

### 2. Re-create the Destrieux (a2009s) products

```bash
aparc_stats_aseg -s subj01 -a2009s
# uses the bundled destrieux atlas; outputs named ...a2009s...
```

### 3. Write outputs to a side directory (leave the recon-all tree untouched)

```bash
aparc_stats_aseg -s subj01 -gcs myatlas -name custom -o /scratch/subj01_custom
```

### 4. Statistics only, on an existing parcellation

```bash
# Already have ?h.aparc.myatlas.annot — just (re)compute the .stats.
aparc_stats_aseg -s subj01 -gcs myatlas -nocortparc -noaparc2aseg
```

## Pipeline Context

`aparc_stats_aseg` is a **post-reconstruction** utility. It is not called by
[[wiki/pipelines/recon-all|recon-all]] (a search of the source tree finds no
recon-all invocation); recon-all instead embeds the canonical Desikan-Killiany /
Destrieux invocations of the same three tools directly in its own
`-cortparc`/`-parcstats`/`-apas2aseg` stages.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (full reconstruction) →
**this script** → **Successors:** [[mri_segstats]] (e.g.
`mri_segstats --seg aparc.<name>+aseg.mgz --sum …` to tabulate volumes from the
merged label volume), `aparcstats2table` / `asegstats2table` (to collate the
`?h.aparc.<name>.stats` across subjects).

Internally the data flow is:

```
?h.sphere.reg ─┐
?h.cortex.label├─▶ mris_ca_label ─▶ ?h.aparc.<name>.annot ─┬─▶ mris_anatomical_stats ─▶ ?h.aparc.<name>.stats
aseg.mgz ──────┘                                           └─▶ mri_aparc2aseg ─▶ aparc.<name>+aseg.mgz
```

## Gotchas and Caveats

> [!gotcha] Version gating keys on the `freesurfer` version string
> The script reads the version via the `freesurfer` wrapper and collapses it to
> `5.3.0`, `6.0.0`, or `dev`, **erroring if none of those match**
> ([`scripts/aparc_stats_aseg:443-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L443-L453)). Several behaviours (using
> `aseg.presurf.mgz` vs `aseg.mgz`, the `-th3` option, and the
> `mri_aparc2aseg --relabel`/`--aseg aseg.presurf.hypos` path) only fire on the
> `6.0.0`/`dev` branch. How a stock 8.2.0 install reports here determines which
> branch runs — see Confidence and Gaps.

> [!gotcha] `-o` mode creates and removes symlinks in `label/`
> In `-o` mode the script symlinks `<outdir>/?h.aparc.<name>.annot` into the
> subject's `label/` so [[mri_aparc2aseg]] (which reads from the standard tree)
> can find them, then removes those symlinks afterwards
> ([`scripts/aparc_stats_aseg:148-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L148-L151), [`:164-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L164-L169)). If the run
> dies mid-way, stale `label/?h.aparc.<name>.annot` symlinks can be left behind.

> [!gotcha] Atlas-name collision overwrites recon-all's annots
> If `-name` (or the GCS base name) matches a standard atlas — e.g. `aparc` or
> `aparc.a2009s` — the outputs land at the same paths recon-all uses and will
> overwrite them. Use a distinctive `-name` for custom atlases.

## Error Compensation and Guard Rails

- **Pre-flight atlas check.** Both `?h.<gcs>.gcs` files must exist or the script
  aborts before running anything ([`scripts/aparc_stats_aseg:348-353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L348-L353)).
- **Environment checks.** `FREESURFER_HOME` and `SUBJECTS_DIR` must be set and
  exist, and the subject directory must exist
  ([`scripts/aparc_stats_aseg:321-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L321-L344)).
- **Stop-on-error.** After each sub-tool the script checks `$status` and jumps to
  `error_exit` on failure ([`scripts/aparc_stats_aseg:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L74), [`:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L110), [`:163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L163)); it does
  not continue past a broken step.
- **Determinism by default.** `mris_ca_label` is seeded (`-seed 1234`) unless you
  pass `-randomness`, so repeated runs reproduce the parcellation.
- **No input auto-correction.** The script does not conform, reslice, or
  otherwise modify your data; it only assembles command lines.

## Related Tools

- [[mris_ca_label]] — performs the cortical parcellation (step 1); the GCS atlas is its input.
- [[mris_anatomical_stats]] — computes the per-parcel surface statistics (step 2).
- [[mri_aparc2aseg]] — maps the surface parcellation into the volume and merges with the `aseg` (step 3).
- [[mri_segstats]] — the usual downstream consumer of `aparc.<name>+aseg.mgz` to tabulate per-label volumes/intensities.
- [[wiki/pipelines/recon-all|recon-all]] — produces the subject this script operates on, and runs the same three tools for the built-in atlases.
- `aparcstats2table` / `asegstats2table` *(no wiki page yet)* — collate the `.stats` outputs across a group.
- `mris_ca_train` *(no wiki page yet)* — trains the `.gcs` atlases that this script applies.

## Confidence and Gaps

**High confidence:** the three-step orchestration, complete flag set with
aliases and defaults, the output filename scheme, the `-noaseg`→no-aparc2aseg
coupling, the expert-options mutual-exclusion rules, the `-o` side-directory
symlink dance, and the transient ctab deletion — all read directly from
[`scripts/aparc_stats_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg).

> [!gap] Which version branch fires on a stock 8.2.0 install
> The conditional logic keys on the legacy `freesurfer` version string mapped to
> `5.3.0`/`6.0.0`/`dev` ([`scripts/aparc_stats_aseg:443-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L443-L453)). The exact
> string an 8.2.0 build reports — and therefore whether the `aseg.presurf.mgz`,
> `-th3`, and `--relabel` branches execute — was not verified at runtime. If the
> string is not recognised the script exits with "Freesurfer not found".

## References

- FreeSurfer source: [`scripts/aparc_stats_aseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg) (v8.2.0).
- Built-in usage: `aparc_stats_aseg` with no arguments (the `usage_exit` block, [`scripts/aparc_stats_aseg:464-519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc_stats_aseg#L464-L519)).
- FreeSurfer wiki: the `mris_ca_label` / Cortical Parcellation pages describe the GCS atlas and the per-parcel statistics this script reproduces.
