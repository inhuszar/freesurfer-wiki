---
title: "make_cortex_label"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_cortex_label"
families: []
recon_all_stage: null
related:
  - "[[mri_annotation2label]]"
  - "[[mri_mergelabels]]"
  - "[[make_average_surface]]"
  - "[[parcellation-schemes]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - label
  - cortex
  - parcellation
  - surface
---

# make_cortex_label

## Summary

`make_cortex_label` builds a surface `?h.cortex.label` for a subject by taking a
cortical parcellation (`aparc` by default) and merging **every** parcel except the
medial-wall / non-cortical ones into a single label. Internally it explodes the
annotation into one label per parcel with [[mri_annotation2label]], deletes the
non-cortex parcels, and merges the rest with [[mri_mergelabels]]. The result is the
set of vertices that belong to neocortex — the same label that recon-all produces
by a different route — used to restrict surface analyses (e.g.
[[mris_preproc]] `--cortex-only`) to cortex.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_cortex_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_cortex_label`
- **Original author:** Douglas Greve
- **Tools invoked:** [`mri_annotation2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L68), [`mri_mergelabels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L82).

## Purpose and Context

Many surface analyses should be confined to cortex, excluding the medial wall
(corpus callosum, non-cortical tissue) where the surface representation is
arbitrary. FreeSurfer ships a `?h.cortex.label` with every recon, but
`make_cortex_label` lets you (re)generate it — or generate a variant from a
different parcellation — by merging the cortical parcels of an annotation. It is
used, for example, by [[make_average_surface]]'s cortex-label step (which uses the
Destrieux parcellation directly) and any time a subject lacks the label or needs
one tied to a specific parcellation.

## Inputs

### Required Inputs

- **Subject** — `--s <subject>` (must exist under `SUBJECTS_DIR`).
- The parcellation annotation `label/?h.<parc>.annot` for each requested
  hemisphere (default `aparc`); the script aborts if it is missing
  ([`scripts/make_cortex_label:56-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L56-L60)).

### Input Assumptions

> [!assumption] A standard FreeSurfer parcellation must already exist
> The subject must have `label/?h.aparc.annot` (or `aparc.a2009s`/`aparc.a2005s`
> if you pass `--a2009s`/`--a2005s`). The non-cortical parcel names removed depend
> on the chosen atlas: `aparc` removes `unknown` and `corpuscallosum`; the
> Destrieux/`a2005s`/`a2009s` atlases remove `Medial_wall`
> ([`scripts/make_cortex_label:32-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L32-L38),
> [`:124-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L124-L132)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `label/?h.cortex.label` (or `?h.<outname>.label`) | `SUBJECTS_DIR/<subject>/label/` | merged label of all cortical vertices for each hemisphere |

The output basename is `cortex` unless changed with `--o`.

### Output Specifications

A standard FreeSurfer surface label (one row per vertex: index, R, A, S, value);
see [[label-format]]. The vertices are those of the subject's surface that fall in
any non-excluded parcel.

## Mathematical Foundations

None — this is a set operation. The cortex label is the union of the vertex sets
of all parcels except the medial-wall list:
$\text{cortex} = \bigcup_{p\notin \text{NonCtx}} V_p$, performed by exploding the
annotation ([[mri_annotation2label]]), deleting the excluded label files, and
merging the rest ([[mri_mergelabels]]).

## Configuration Options

### Complete Flag Reference

Enumerated from the parser
([`scripts/make_cortex_label:104-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L104-L148)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject name (under `SUBJECTS_DIR`). |
| `--h` | string | `lh rh` | Hemisphere to process (`lh` or `rh`); default is both. |
| `--lh` / `--rh` | bool | both | Restrict to one hemisphere. |
| `--a2009s` | bool | off | Use the `aparc.a2009s` (Destrieux) parcellation; sets the non-cortex list to `Medial_wall`. |
| `--a2005s` | bool | off | Use the older `aparc.a2005s` parcellation; sets the non-cortex list to `Medial_wall`. |
| `--o` | string | `cortex` | Output label basename → `?h.<outname>.label`. |
| `--debug` | bool | off | Trace execution (`set echo`/`verbose`). |
| `--version` | flag | — | Print version and exit (handled before parsing). |

### Configuration Interactions

> [!gotcha] `--help` is NOT recognised — it errors out
> Unlike most FreeSurfer scripts, `make_cortex_label` has no `--help` case. Any
> unknown flag (including `--help`) hits the `default:` branch and exits with
> "ERROR: <flag> not recognized"
> ([`scripts/make_cortex_label:144-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L144-L147)).
> Run it **with no arguments** to see the usage text instead
> ([`scripts/make_cortex_label:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L45)).
> (`--version` *is* handled.)

> [!gotcha] `--a2009s`/`--a2005s` both change the atlas *and* the exclusion list
> Selecting either atlas also swaps the removed-parcel list to `Medial_wall`. If
> you instead point at a Destrieux annotation by other means without these flags,
> the default `unknown`/`corpuscallosum` names would not match and nothing would be
> excluded.

- `--o` only changes the **output** basename, not the input parcellation; combine
  with `--a2009s` to build, e.g., a Destrieux-derived cortex label under a custom
  name.

## Typical Use Cases

### 1. Regenerate the standard cortex label

```bash
make_cortex_label --s subj01
# → label/lh.cortex.label and label/rh.cortex.label
```

### 2. Build a Destrieux-based cortex label, left hemisphere only

```bash
make_cortex_label --s subj01 --lh --a2009s --o cortex.a2009s
# → label/lh.cortex.a2009s.label
```

## Pipeline Context

`make_cortex_label` is a stand-alone utility. It is **not** called directly by
[[wiki/pipelines/recon-all|recon-all]] (recon-all creates `?h.cortex.label` by a
different process). It is conceptually the same operation as the cortex-label step
inside [[make_average_surface]], which builds the label for an average subject from
the Destrieux parcellation via [[mri_cor2label]].

**Predecessor:** [[mris_ca_label]] / recon-all parcellation (produces the
`?h.aparc.annot`) → **make_cortex_label** → **Successor:** cortex-restricted
surface analysis (e.g. [[mris_preproc]] `--cortex-only`, masking in
[[mri_glmfit|mri_glmfit]]).

## Gotchas and Caveats

> [!gotcha] Will overwrite an existing cortex label
> The script writes `label/?h.<outname>.label` directly with
> [[mri_mergelabels]] `-o`; an existing `?h.cortex.label` is replaced. (The header
> comment about halting if the label exists describes older intent and is not
> enforced by the v8.2.0 code.)

> [!gotcha] A per-hemisphere temp dir is created under the subject's directory
> The intermediate per-parcel labels go to
> `SUBJECTS_DIR/<subject>/make_cortex_label.tmp.$$`, which is removed at the end of
> each hemisphere ([`scripts/make_cortex_label:63-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L63-L65),
> [`:88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L88)).

## Error Compensation and Guard Rails

- Subject and annotation existence are checked before processing
  ([`scripts/make_cortex_label:56-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L56-L60),
  [`:161-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label#L161-L165)).
- The two child commands' exit statuses are checked; failure aborts.
- No automatic input correction — the script is a pure set-merge of existing
  parcels.

## Related Tools

- [[mri_annotation2label]] — explodes the annotation into per-parcel labels.
- [[mri_mergelabels]] — merges the surviving (cortical) labels into one.
- [[make_average_surface]] — performs the analogous cortex-label step for an average subject (via [[mri_cor2label]]).
- [[parcellation-schemes]] — the `aparc` / Destrieux atlases that define the parcels.
- [[label-format]] — the output label file format.

## Confidence and Gaps

**High confidence:** the full flag set, the per-atlas exclusion lists, the missing
`--help` handling, and the explode-delete-merge workflow — all read directly from
[`scripts/make_cortex_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label).

## References

- FreeSurfer source: [`scripts/make_cortex_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_cortex_label) (v8.2.0).
- Usage text: run `make_cortex_label` with no arguments.
