---
title: "make-segvol-table"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/make-segvol-table"
families: []                     # standalone group-stats table builder
recon_all_stage: null
related:
  - "[[mri_label_volume]]"
  - "[[asegstats2table]]"
  - "[[mri_segstats]]"
  - "[[table2map]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Reads the legacy COR-/aseg directory layout (mri/aseg/COR-.info) rather than aseg.mgz; whether modern recon-all output still provides a COR- aseg directory was not verified on disk."
  - "The -idno >255 guard tests an undefined variable ($idlst), so the bound is never actually enforced — flagged as a latent bug."
tags:
  - segmentation
  - volume
  - group-analysis
  - table
  - aseg
---

# make-segvol-table

## Summary

`make-segvol-table` builds a **group volume table**: a plain-text matrix of
subcortical structure volumes (in mm³) with one **row per structure** and one
**column per subject**. It iterates over a list of subjects, calls
[[mri_label_volume]] on each subject's `aseg` segmentation to measure the volume
of every requested structure ID, and pastes the per-subject result columns
side-by-side. The structure-name ↔ ID mapping is taken from a lookup table
(default `$FREESURFER_HOME/tkmeditColorsCMA`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make-segvol-table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table)
- **Binary/script location:** `$FREESURFER_HOME/bin/make-segvol-table`
- **External tools invoked:** [`mri_label_volume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L113) (per-subject, per-structure volume measurement) plus standard Unix `awk`, `grep`, `paste`, `cat`.

## Purpose and Context

Group morphometry studies need a single rectangular table of structure volumes
across subjects — the kind that feeds straight into R, MATLAB, or a spreadsheet.
`make-segvol-table` produces exactly that from a cohort of FreeSurfer subjects,
reading each subject's automatic subcortical segmentation (`aseg`) and reporting
the volume of each labelled structure.

It predates and parallels the more widely used
[[asegstats2table]]/[[mri_segstats]] workflow. Where [[asegstats2table]] collates
the `aseg.stats` summary files that [[wiki/pipelines/recon-all|recon-all]] already
wrote, `make-segvol-table` instead computes volumes **on demand** from the
segmentation directory via [[mri_label_volume]]. It is a **standalone** group
utility, not a stage of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Reads the legacy COR- `aseg` directory, not `aseg.mgz`
> The script looks for `$SUBJECTS_DIR/<subj>/mri/aseg/COR-.info`
> ([`scripts/make-segvol-table#L85-L89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L85-L89)) and passes the **directory**
> `mri/aseg` to [[mri_label_volume]] — i.e. the old COR- volume layout, not the
> single-file `mri/aseg.mgz`. On installations that only have `aseg.mgz`, point
> `-segdir` at a directory containing a COR- segmentation, or prefer
> [[asegstats2table]].

## Inputs

### Required Inputs

- **Subject list** — one or more `-s <subj>` flags, and/or a `-sf <file>` listing
  subjects one per line. Each subject must exist under `$SUBJECTS_DIR`.
- **Output file** — `-o <outfile>`. The text table is written here (the parent
  directory is created if needed).

Each subject must contain a segmentation directory
`$SUBJECTS_DIR/<subj>/mri/<segdir>` (default `aseg`) holding a `COR-.info`
([`scripts/make-segvol-table#L71-L91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L71-L91)).

### Input Assumptions

> [!assumption] FreeSurfer subjects with a COR- aseg and a CMA lookup table
> Assumes a standard `$SUBJECTS_DIR/<subj>/` tree, a COR-format `aseg`
> segmentation directory per subject, and that every requested structure name is
> present in the ID-map table (default `tkmeditColorsCMA`, the classic CMA
> subcortical colour table). Names not found in the table are a hard error
> ([`scripts/make-segvol-table#L54-L59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L54-L59)).

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<outfile>` (`-o`) | text (whitespace/tab-delimited) | Volume table: first column = structure names (header cell `Structure`), first row = subject IDs, body = volume in mm³ per structure × subject. |
| `<outfile>.bak` | text | Backup of a pre-existing `<outfile>` (renamed before writing). |

### Output Specifications

The table is assembled incrementally: a one-column file of structure names is
created first ([`scripts/make-segvol-table#L99-L103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L99-L103)), then for each subject the
[[mri_label_volume]] output (one volume per structure, in the order of
`idnolist`) is `paste`d on as a new column with the subject ID as its header
([`#L109-L126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L109-L126)). Volumes are in mm³ as reported by
[[mri_label_volume]] (`-l`).

> [!gotcha] Structure order is taken from the ID map, not sorted
> Rows appear in the order the IDs are read from the lookup table (or the order
> of your `-id` flags), with the `id == 0` (Unknown) entry skipped
> ([`scripts/make-segvol-table#L60-L67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L60-L67)). The row order in the name column
> and the value order from [[mri_label_volume]] are both driven by the same ID
> list, so they line up.

## Mathematical Foundations

None in this script — it is a **table builder**. All volume computation (counting
labelled voxels and multiplying by the voxel volume) happens inside
[[mri_label_volume]].

> [!internal] Volume measurement lives in mri_label_volume
> `make-segvol-table` only marshals subjects and IDs and stitches columns
> together with `paste`. See [[mri_label_volume]] for how per-structure volumes
> are actually computed.

## Configuration Options

### Complete Flag Reference

All flags are from the argument parser
([`scripts/make-segvol-table#L138-L226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L138-L226)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s` | string (repeatable) | *(required\*)* | Add one subject to the list. Repeat for multiple subjects. |
| `-sf` | string (file) | — | File listing subjects (one per line); appended to the subject list. Must exist. |
| `-o` | string | *(required)* | Output table path. |
| `-id` | string (repeatable) | all structures | Restrict to the named structure(s); the name must appear in the ID map. Default is every structure in the map. |
| `-idno` | integer (repeatable) | — | Add a structure by numeric ID directly (bypassing name lookup). |
| `-idmap`<br>`-t` | string (file) | `$FREESURFER_HOME/tkmeditColorsCMA` | Lookup table mapping structure ID (col 1) ↔ name (col 2). |
| `-segdir`<br>`-asegdir` | string | `aseg` | Segmentation subdirectory under `mri/` to read (a COR- directory). |
| `-sd` | string | `$SUBJECTS_DIR` | Set the subjects directory (also exported to the environment). |
| `-umask` | string | — | Set the Unix file-creation mask. |
| `-verbose` | bool | off | Verbose mode. |
| `-echo` | bool | off | `set echo` — print each command. |
| `-debug` | bool | off | Verbose **and** echo. |
| `-version` | bool | — | Print version and exit. |
| `-help` | bool | — | Print help and exit. |

\* At least one subject (via `-s` and/or `-sf`) is required.

### Configuration Interactions

> [!gotcha] `-id` (by name) and `-idno` (by number) build the same list differently
> `-id` validates the **name** against the ID map and is the normal way to pick
> structures; `-idno` injects a raw ID number into `idnolist` without a name
> lookup ([`scripts/make-segvol-table#L166-L178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L166-L178)). If you use `-idno`, the
> corresponding **row label** in the name column may not be populated, because
> the name column is filled from `idlist` (the names), which `-idno` does not
> extend. Prefer `-id` unless you specifically need an unnamed ID.

> [!gotcha] `-idno` upper-bound check is a no-op (latent bug)
> The guard `if($idlst > 255)` after `-idno`
> ([`scripts/make-segvol-table#L174-L177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L174-L177)) tests the variable `$idlst`, which is
> never assigned anywhere in the script. The intended check (reject IDs > 255)
> therefore never fires; IDs above 255 are accepted. Treated here as a **latent
> bug**, not a feature — code is authoritative, so the bound is effectively
> absent.

- `-idmap`/`-t` are synonyms; so are `-segdir`/`-asegdir`.
- `-debug` is shorthand for `-verbose -echo`.
- With neither `-id` nor `-idno`, the full ID list and name list are read from
  the map (`awk '{print $1}'` / `'{print $2}'`,
  [`scripts/make-segvol-table#L65-L67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L65-L67)).

## Typical Use Cases

### 1. Volume table for a whole cohort, all structures

```bash
make-segvol-table -sf subjects.list -o /study/aseg_volumes.table
# rows = every structure in tkmeditColorsCMA, columns = each subject
```

### 2. A few named structures across two subjects

```bash
make-segvol-table -s bert -s ernie \
  -id Left-Hippocampus -id Right-Hippocampus -id Left-Amygdala \
  -o /tmp/hippo_amyg.table
```

### 3. Use a custom segmentation directory and ID map

```bash
make-segvol-table -sf subjects.list -segdir aseg.auto \
  -idmap /study/my_lut.txt -o /study/custom_volumes.table
```

## Pipeline Context

`make-segvol-table` is a **standalone group-statistics** tool. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** per-subject segmentation from
[[wiki/pipelines/recon-all|recon-all]] (the `aseg` segmentation, measured by
[[mri_label_volume]]) → **make-segvol-table** → **Successor:** statistical
analysis in R/MATLAB, or [[table2map]] to paint a column of the resulting table
back onto a segmentation for visualisation.

## Gotchas and Caveats

> [!gotcha] An existing output file is moved to `.bak`, not appended/overwritten cleanly
> If `<outfile>` exists it is renamed to `<outfile>.bak` before a fresh table is
> built ([`scripts/make-segvol-table#L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L96)). Re-running twice will overwrite the
> previous `.bak`.

> [!gotcha] Strict pre-flight on every subject
> Before any measurement, the script checks each subject directory, the seg
> directory, and `COR-.info` for existence and **exits** on the first missing one
> ([`scripts/make-segvol-table#L71-L91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L71-L91)). One bad subject aborts the whole run.

> [!gotcha] Default ID map is the classic CMA table
> The default `tkmeditColorsCMA` is the historical CMA subcortical colour table,
> distinct from the modern `FreeSurferColorLUT.txt`. Structure names must match
> that file's spelling. See [[color-lut]].

## Error Compensation and Guard Rails

- **Pre-flight existence checks** for subjects, seg dirs, `COR-.info`, the ID map,
  and required arguments ([`scripts/make-segvol-table#L71-L91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L71-L91),
  [`#L232-L247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L232-L247)).
- **Output-directory creation:** `mkdir -p` on the output's parent
  ([`#L94-L95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L94-L95)).
- **Backup of prior output** to `.bak` ([`#L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L96)).
- **mri_label_volume failure** aborts the run with a diagnostic
  ([`#L114-L120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table#L114-L120)).
- The `-idno > 255` bound does **not** function (see gotcha above).

## Related Tools

- [[mri_label_volume]] — does the per-structure volume measurement; this script is a multi-subject wrapper around it.
- [[asegstats2table]] — the modern alternative: builds a subject × structure table from existing `aseg.stats` files rather than re-measuring the segmentation.
- [[mri_segstats]] — generates the `aseg.stats` summaries that [[asegstats2table]] collates.
- [[table2map]] — conceptual inverse for visualisation: maps a column of a value table back onto a segmentation volume.
- [[color-lut]] — explains the structure-ID ↔ name tables (`tkmeditColorsCMA`, `FreeSurferColorLUT.txt`).

## Confidence and Gaps

**High confidence:** complete flag set and synonyms, the row=structure /
column=subject layout, the `paste`-based assembly, the default `tkmeditColorsCMA`
map, and the `.bak` backup behaviour — read directly from
[`scripts/make-segvol-table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table) and confirmed against `--help`.

> [!gap] COR- vs. mgz segmentation
> The script reads the legacy `mri/aseg/COR-.info` layout. Whether current
> recon-all output still ships a COR- `aseg` directory (as opposed to only
> `aseg.mgz`) was not verified on disk; if absent, use `-segdir` or prefer
> [[asegstats2table]].

> [!gap] `-idno` row-label coverage
> Because `-idno` extends the numeric `idnolist` but not the `idlist` of names,
> the exact row-label alignment when mixing `-id` and `-idno` was not exercised
> on real output.

## References

- FreeSurfer source: [`scripts/make-segvol-table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make-segvol-table) (v8.2.0).
- Built-in help: `make-segvol-table -help`.
