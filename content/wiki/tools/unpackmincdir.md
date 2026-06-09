---
title: "unpackmincdir"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/unpackmincdir"
families: []                     # standalone MINC import script
recon_all_stage: null
related:
  - "[[unpackimadir]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_make_register]]"
  - "[[unpacksdcmdir]]"
  - "[[dcmunpack]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Several required helper binaries (minc_to_bshort, minc_to_cor, mincinfo, mincheader, getfirstrundir-sess, getscanseqlist as a binary) are NOT present in the v8.2.0 install inspected; the tool appears to be legacy and may not run end-to-end on a current FreeSurfer."
  - "scanseq.unpackinfo default sequence-info file is not present in the inspected install."
tags:
  - minc
  - conversion
  - import
  - fsfast
  - legacy
---

# unpackmincdir

## Summary

`unpackmincdir` unpacks a directory of **MINC** files (one MINC volume per
acquisition run, named `base-...-RUN-mri.mnc[.gz]`) into an FS-FAST "sessions"
directory. For each MINC file it reads the scanning sequence and run number from
the MINC header, looks the sequence up in a sequence-info table to decide the
output subdirectory and format (bshort, COR, or a plain MINC copy), and converts
accordingly. It also writes a `session.info`, per-sequence `seq.info` files, and —
for functional runs alongside a 3D anatomical — a header-based registration with
[[mri_make_register]]. It is the back end of [[unpackimadir]] (which converts
Siemens `.ima` to MINC and then calls this script).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir)
- **Binary/script location:** `$FREESURFER_HOME/bin/unpackmincdir`
- **Original author:** Douglas N. Greve, MGH-NMR Center
- **Key helpers invoked:** `mincinfo`, `mincheader`, `minc2seqinfo`, `minc_to_bshort`, `minc_to_cor` (MINC toolchain), and [`mri_make_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L457) (same-session registration). `mri_convert` and `minc_to_cor`/`minc_to_bshort` existence is checked up front.

> [!gap] Legacy MINC dependencies may be absent
> Of the helpers this script requires, `minc_to_bshort`, `minc_to_cor`,
> `mincinfo`, `mincheader`, and `getfirstrundir-sess` were **not** found in the
> inspected `$FREESURFER_HOME/bin` for v8.2.0 (`minc2seqinfo` and
> `mri_make_register` are present). The script checks for `minc_to_bshort`,
> `mri_make_register`, `mri_convert`, and `minc_to_cor` and exits if any are
> missing ([`scripts/unpackmincdir:144-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L144-L151)). Treat
> `unpackmincdir` as a **legacy** tool that likely will not run end-to-end on a
> current install; it is documented here from the source.

## Purpose and Context

In the era when MGH data flowed through MINC (Siemens `.ima` → MINC via
[[unpackimadir]]), `unpackmincdir` was the step that sorted the MINC volumes into
the FS-FAST sessions layout. It exists to:

1. Find the properly named MINC files in the source directory and order them by
   run ([`scripts/unpackmincdir:153-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L153-L189)).
2. Map each scanning sequence to an output subdirectory + format using a
   sequence-info table (`scanseq.unpackinfo`), defaulting unknown sequences to a
   plain MINC copy ([`:245-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L245-L279)).
3. Convert each run to bshort or COR (or copy MINC), writing `seq.info` and a MINC
   header dump alongside ([`:329-413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L329-L413)).
4. Build a same-session functional→anatomical registration if a `3danat`
   directory exists ([`:447-466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L447-L466)).

It is run **by hand** or via [[unpackimadir]]; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **A MINC source directory** — `-src srcdir`
  ([`scripts/unpackmincdir:491-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L491-L494)). Must contain files named
  `base-..-RUN-mri.mnc` or `.mnc.gz`.
- **A target directory** — `-targ targdir`
  ([`scripts/unpackmincdir:496-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L496-L499)).

### Input Assumptions

> [!assumption] MINC files named `base-..-RUN-mri.mnc[.gz]`
> The script reconstructs a common `base` from the first MINC filename and then
> iterates `run` from 1..998 looking for `base-$run-mri.mnc[.gz]`
> ([`scripts/unpackmincdir:160-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L160-L182)). This deliberately ignores
> differently named MINC files in the same directory. Each file must carry the
> MINC header attributes `acquisition:scanning_sequence`,
> `acquisition:acquisition_id` (run), and the spatial dimension attributes the
> script reads with `mincinfo`.

## Outputs

### Output Hierarchy

Per run: `targdir/<unpackdir>/<RRR>/` where `<unpackdir>` comes from the sequence
table (or the sequence name itself for unknown sequences) and `RRR` is the
zero-padded run number ([`scripts/unpackmincdir:281-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L281-L308)).

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `f_*.bshort` | `targdir/<fsd>/RRR/` | functional run converted to bshort (stem `f`) via `minc_to_bshort` ([`:373-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L373-L388)) |
| COR volume | `targdir/<dir>/RRR/` | anatomical converted to COR via `minc_to_cor` ([`:390-406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L390-L406)) |
| `*.mnc[.gz]` | `targdir/<seq>/RRR/` | unrecognised sequences copied as-is ([`:361-371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L361-L371)) |
| MINC header dump | `targdir/<unpackdir>/RRR/` | `mincheader` output for non-MINC formats ([`:331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L331)) |
| `seq.info` | `targdir/<unpackdir>/` | `minc2seqinfo` output (sequence + geometry) ([`:333-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L333-L338)) |
| `session.info` | `targdir/` | patient full name / id / birthdate / sex / scanner id / study id ([`:204-212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L204-L212)) |
| `same-session-reg.dat` | `targdir/<fsd>/` | functional→anatomical header registration from `mri_make_register` ([`:457-459`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L457-L459)) |
| `unpack.log` | `targdir/` | command, environment, sequence-info table, and per-run log ([`:110-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L110-L128)) |

### Output Specifications

Output format per sequence is whatever the `scanseq.unpackinfo` table specifies
(`bshort`, `COR`, or — for unmatched sequences — `minc`). Geometry handling is
done by the MINC toolchain (`minc_to_bshort`/`minc_to_cor`), not this script.

> [!gotcha] MINC is read but `mri_convert`/COR is the only volumetric conversion
> The COR branch's error message references `mri_convert`, but the command run is
> `minc_to_cor` ([`scripts/unpackmincdir:390-406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L390-L406)). `mri_convert` is
> only validated as present, not invoked for the actual conversion.

## Mathematical Foundations

None in the script itself — sequence/geometry values are read from the MINC header
with `mincinfo` and the conversions are delegated to the MINC toolchain. The only
quasi-numeric step is a 3-vs-4-dimensional check: a sequence the table marks as 4D
(functional) but that has no MINC `time` dimension is redirected to a `t2epi` or
`<dir>-notime` output ([`scripts/unpackmincdir:235-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L235-L271)).

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/unpackmincdir:482-561`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L482-L561)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src` | string | *(required)* | MINC source directory (`base-..-RUN-mri.mnc[.gz]`). |
| `-targ` | string | *(required)* | Parent target directory for the sessions layout. |
| `-scanseqinfo` | string (file) | `$FREESURFER_HOME/scanseq.unpackinfo` | Sequence→(dim, format, subdir) table; each non-comment line has 5 fields. |
| `-funcseq` | string | `ep2d_fid_ts_20b2604` | Sequence name treated as the functional series (routed to `-fsd`). |
| `-fsd` | string | `bold` | Functional subdirectory name. |
| `-anatseq` | string | `mpr_ns_t1_4b130` | **Parsed but ignored.** Sets `anatseq` ([`scripts/unpackmincdir:516-519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L516-L519)) but the value is never read; usage line is commented out. See callout below. |
| `-t1episeq` | string | `se_12b130` | **Parsed but ignored.** Assigns to a variable named `t1epi` (not `t1episeq`) ([`scripts/unpackmincdir:521-524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L521-L524)); never read. See callout below. |
| `-anatonly` | bool | off | **Parsed but ignored.** Sets `anatonly` ([`scripts/unpackmincdir:535-537`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L535-L537)) but it is never read; usage line is commented out. See callout below. |
| `-minconly` | bool | off | Do not convert to bshort/COR; copy every run as MINC. |
| `-nocopy` | bool | off | Create the directory structure and `seq.info` but do not copy/convert data (a dry run). |
| `-umask` | string | inherited | Unix file-permission mask (also sets `MRI_UMASK`). |
| `-verbose` | bool | off | tcsh `verbose`. |
| `-echo` | bool | off | tcsh `echo` tracing. |
| `-debug` | bool | off | `verbose` + `echo`. |
| `-version` | bool | — | Print version and exit. |

> [!contradiction] `-anatseq`, `-t1episeq`, `-anatonly` are parsed but do nothing
> The parser accepts `-anatseq`, `-t1episeq`, and `-anatonly`
> ([`scripts/unpackmincdir:516-524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L516-L524), [`:535-537`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L535-L537)), and the
> corresponding usage lines are **commented out** ([`:600-602`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L600-L602)). The
> values are never used to drive unpacking, and `$anatonly` is set but never
> read. Moreover `-t1episeq` mistakenly assigns to a variable named `t1epi`, not
> `t1episeq` ([`:521-524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L521-L524)). These three flags are effectively
> inert; the sequence routing is governed entirely by `-funcseq`/`-fsd` and the
> `scanseq.unpackinfo` table.

### Configuration Interactions

> [!gotcha] `-minconly` overrides the sequence table's format
> Even when the table maps a sequence to bshort/COR, `-minconly` forces every run
> to be copied as MINC ([`scripts/unpackmincdir:284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L284)).

> [!gotcha] `-funcseq` selects which sequence lands in `-fsd`
> The single sequence equal to `-funcseq` is routed to the `-fsd` subdirectory;
> all other table-listed sequences use the subdir from the table
> ([`scripts/unpackmincdir:256-262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L256-L262)).

> [!gotcha] 4D sequence with no time dimension is redirected
> If the table expects 4D but the file is 3D, a `bold` run becomes `t2epi` and any
> other run gets a `-notime` suffix ([`:264-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L264-L271)).

## Typical Use Cases

> [!gotcha] These commands assume the legacy MINC toolchain is installed
> See the dependency gap above; on a stock v8.2.0 install the helpers may be
> missing and the script will exit at the binary-presence check.

### 1. Unpack a MINC session

```bash
unpackmincdir -src /space/mincsrc -targ /space/sessions/sub01
```

### 2. Keep everything as MINC (no bshort/COR conversion)

```bash
unpackmincdir -src /space/mincsrc -targ /space/sessions/sub01 -minconly
```

### 3. Custom functional sequence and subdirectory

```bash
unpackmincdir -src /space/mincsrc -targ /space/sessions/sub01 \
  -funcseq ep2d_fid_ts_15b3125 -fsd bold
```

## Pipeline Context

`unpackmincdir` is a stand-alone **import** back end, not called by
[[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** MINC files (typically produced by [[unpackimadir]] from Siemens
`.ima`) → **unpackmincdir** → **Successor:** FS-FAST functional analysis on the
emitted sessions directory.

[[unpackimadir]] invokes this script directly: it converts IMA→MINC with `ima2mnc`
and then runs `unpackmincdir -src <mincdir> -targ <targ>`. For modern DICOM data,
this whole MINC route is superseded by [[dcmunpack]]/[[unpacksdcmdir]].

## Gotchas and Caveats

> [!gotcha] Only `base-..-RUN-mri.mnc[.gz]` files are unpacked
> A deliberate filename filter ignores any other MINC files in the directory
> (e.g. `*-sonata-*-mri.mnc` with a different field count)
> ([`scripts/unpackmincdir:168-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L168-L182)).

> [!gotcha] Disk-space check warns but does not stop
> If the target appears to have less free space than the source needs, a WARNING
> is printed and the run continues ([`scripts/unpackmincdir:130-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L130-L141)).

> [!gotcha] Registration step needs a `3danat` directory and `getfirstrundir-sess`
> The same-session registration only runs if `targdir/3danat` exists and relies on
> `getfirstrundir-sess` (not found in the inspected install) to locate the
> anatomical and functional run directories ([`:447-466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L447-L466)).

## Error Compensation and Guard Rails

- **Binary presence check.** `minc_to_bshort`, `mri_make_register`, `mri_convert`,
  and `minc_to_cor` must be on the path or the script exits
  ([`scripts/unpackmincdir:144-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L144-L151)).
- **Sequence-info fallback.** A sequence not in `scanseq.unpackinfo` is copied as
  MINC into a subdir named after the sequence, rather than erroring
  ([`:273-279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L273-L279)).
- **Backward-compat run id.** If `acquisition:acquisition_id` is empty, the run is
  read from `study:acquisition_id` instead ([`:226-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L226-L227)).
- **Gunzip-on-the-fly.** Compressed MINC inputs are transparently decompressed to a
  temp file for conversion and cleaned up afterwards
  ([`:310-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L310-L327), [`:415`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L415)).

## Related Tools

- [[unpackimadir]] — converts Siemens `.ima` to MINC and then calls this script; its natural front end.
- [[wiki/tools/mri_convert|mri_convert]] — checked for presence; the MINC→COR/bshort work is actually done by `minc_to_cor`/`minc_to_bshort`.
- [[mri_make_register]] — builds the same-session functional→anatomical registration.
- [[unpacksdcmdir]] — the DICOM-era replacement for the IMA/MINC import route.
- [[dcmunpack]] — the modern multi-vendor unpacker that supersedes this whole chain.

## Confidence and Gaps

**Medium confidence.** The flag set, sequence-table logic, output layout, the
3D/4D redirection, and the dead `-anatseq`/`-t1episeq`/`-anatonly` flags are all
read directly from
[`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir).
Confidence is held at medium because the tool depends on a legacy MINC toolchain
that is **not present** in the inspected v8.2.0 install, so the runtime behaviour
could not be exercised.

> [!gap] Missing helper binaries
> `minc_to_bshort`, `minc_to_cor`, `mincinfo`, `mincheader`, and
> `getfirstrundir-sess` were not found in `$FREESURFER_HOME/bin` for v8.2.0. The
> script will exit at the presence check on such installs. Whether these are
> shipped in some configurations needs developer confirmation.

> [!gap] Default sequence-info file
> `$FREESURFER_HOME/scanseq.unpackinfo` (the default `-scanseqinfo` table) was not
> present in the inspected install; without it (and without `-scanseqinfo`) the
> script exits ([`scripts/unpackmincdir:82-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L82-L85)).

## References

- FreeSurfer source: [`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir) (v8.2.0).
- Built-in usage: `unpackmincdir` with no args (the `usage_exit` block, [`scripts/unpackmincdir:595-606`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L595-L606)).
