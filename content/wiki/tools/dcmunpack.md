---
title: "dcmunpack"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/dcmunpack"
families: []                     # standalone import script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_probedicom]]"
  - "[[mri_parse_sdcmdir]]"
  - "[[mri_info]]"
  - "[[dt_recon]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact column layout of imagelist.dat / series-info.dat differs between the dcm2niix and legacy mri_probedicom code paths; only partially cross-checked against the awk field indices."
  - "FIPS / fips-set XML generation path not exercised; behaviour described from the script only."
tags:
  - dicom
  - conversion
  - import
  - fsfast
---

# dcmunpack

## Summary

`dcmunpack` sorts and converts a directory of DICOM files (Siemens, GE, or
Philips) into an organised output hierarchy of NIfTI (`nii`/`nii.gz`), MGH
(`mgh`/`mgz`), or Analyze (`img`) volumes. It recursively searches the source
directory or directories, groups the individual DICOM files into series (runs),
prints a human-readable summary of what it found, and — on a second pass — calls
[[wiki/tools/mri_convert|mri_convert]] once per requested series to produce the
output volumes. It is the general, multi-vendor successor to the Siemens-only
`unpacksdcmdir` and accepts most of that tool's command-line arguments.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/dcmunpack`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack)
- **Binary/script location:** `$FREESURFER_HOME/bin/dcmunpack`
- **Key helpers invoked:** [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L250) (DICOM pre-processing / metadata dump), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L670) (the actual conversion), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L680) (output dimension check), `dcm2niix` (bundled, called via `mri_probedicom`/`mri_convert`), and the FreeSurfer shell utilities `getfullpath`, `UpdateNeeded`, `fname2stem`, `fs_temp_file`, and (for FIPS) `fips-set`.

## Purpose and Context

A clinical or research MRI session arrives as a directory tree of DICOM files in
which the mapping from individual `.dcm` files to logical acquisitions (series)
is encoded only in header tags. `dcmunpack` automates the job of turning that
tree into analysis-ready 3D/4D volumes:

1. It walks the source directory or directories recursively, identifies every
   DICOM series, and reports the series number, description, and acquisition
   parameters (TE, TR, flip angle, pixel spacing, phase-encode direction, pixel
   bandwidth, and the first DICOM file of each series).
2. The user inspects that summary and decides which series to keep and what to
   call them.
3. On a second invocation the user names the runs to unpack, and `dcmunpack`
   dispatches each one to [[wiki/tools/mri_convert|mri_convert]], writing the
   result into a tidy [output hierarchy](#output-hierarchy).

It is normally run **by hand** as the first step of getting scanner data into
FreeSurfer or FSFAST. It is *not* part of [[wiki/pipelines/recon-all|recon-all]];
rather, it produces the anatomical or functional volumes that are then fed to
`recon-all -i …`, to FSFAST, or to [[dt_recon]]. To a large extent it replaces
`unpacksdcmdir`; unlike that tool it searches subdirectories and can unpack GE
and Philips data, but it does not emit SPM-style series of 3D files.

> [!gotcha] Usually has to be run twice
> Because the series numbers are not known until the directory has been scanned,
> the normal workflow is: run once with only `-src` to get the list of series,
> then run again adding `-targ` and one `-run` per series you want. Two ways to
> avoid re-scanning the whole tree on the second pass are described under
> [Configuration Interactions](#configuration-interactions): `-auto-runseq`
> (unpack everything in one pass) and `-index-out`/`-index-in` (cache the file
> index).

## Inputs

### Required Inputs

- **One or more DICOM source directories** — given with `-src` (alias `-d`),
  repeatable. Each must exist and be readable; the path is canonicalised with
  `getfullpath` ([`scripts/dcmunpack:910-924`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L910-L924)). The tree is searched
  recursively. DICOM files from Siemens, GE, and Philips are supported.

### Input Assumptions

> [!assumption] DICOM in, recursive search
> The input is assumed to be DICOM (any vendor `mri_probedicom`/`dcm2niix` can
> read). Files that are not DICOM are silently skipped in the legacy path
> (`filetype == notdicom` → `continue`, [`scripts/dcmunpack:306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L306)). The
> search descends into every subdirectory unless you narrow it with `-pre`,
> `-pat`, `-ext`, or `-one-per-dir`.

- For **GE** data, where each series typically lives in its own subdirectory,
  `-one-per-dir` (or `-gedcm`) dramatically speeds up scanning by probing only
  one file per directory.
- For data pushed to **"bourget"** at the MGH Martinos Center, the historical
  naming convention (one file per series ending in `0001.dcm`) can be exploited
  with `-martinos`. Note the help text warns this naming convention has not been
  guaranteed since August 2012 ([`scripts/dcmunpack:1486-1488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1486-L1488)).

## Outputs

### Output Hierarchy

For each `-run` the output path is built as:

| Mode | Path pattern | Set by |
|------|--------------|--------|
| **FSFAST** (default) | `targetdir/subdir/RRR/stem.format` | `FSFAST=1` |
| **Generic** (`-generic`) | `targetdir/subdir/stem.format` | `FSFAST=0` |
| **`-auto-runseq`** | `targetdir/./RRRR.descr.format` | implies `-generic` |

where `RRR` is the zero-padded 3-digit run (series) number
([`printf %03d`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L569)) and `RRRR` in `-auto-runseq` mode is the
zero-padded 4-digit series number plus any `-series-offset`
([`printf %04d`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L460)). Example: `-run 3 bold nii f` →
`targetdir/bold/003/f.nii` (FSFAST) or `targetdir/bold/f.nii` (`-generic`).
`-auto-runseq nii.gz` yields names like `0002.mprage.nii.gz`,
`0003.ge_functionals.nii.gz`.

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `stem.format` (e.g. `f.nii`, `0002.mprage.nii.gz`) | output hierarchy above | the converted volume(s) |
| `dcmunpack.log` | `targetdir/log/` | full command, environment, and per-run conversion log |
| `imagelist.dat` | `targetdir/log/` | one line per image file with its series number and metadata (also the `-index-out` file) |
| `series-info.dat` | `targetdir/log/` | one line per series (description + acquisition parameters); the `-scanonly`/`-series` output |
| `NNN-dicomflst.txt` | `targetdir/log/` | list of DICOM files belonging to series `NNN`, passed to `mri_convert --dcm2niix-dicom-flist` |
| `ScanOnly-Summary.txt` | `targetdir/log/` | `unpacksdcmdir`-style per-series summary (series, protocol, #files, first file) |
| `DoConvert-Summary.txt` | `targetdir/log/` | per-run conversion status and output dimensions (cols rows slices frames) |
| `DoCopy-Summary.txt` | `targetdir/log/` | per-run copy status (only with `-copy-only`) |
| `stem-infodump.dat` | `targetdir/subdir/RRR/log/` | `mri_probedicom`/`dcm2niix` header dump for the run |
| `stem.first.dcm` | output run dir | first DICOM of the series (only with `-first-dicom`) |
| `fips-process.xml` | output run dir | FIPS processing descriptor (only with `-fips`) |

### Output Specifications

Permitted output formats for `-run` are `nii`, `nii.gz`, `mgh`, `mgz`, and `img`
(Analyze) — validated at [`scripts/dcmunpack:932-939`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L932-L939). The
geometry, data type, and orientation of the output are entirely determined by
[[wiki/tools/mri_convert|mri_convert]] (and `dcm2niix`); `dcmunpack` adds no
resampling of its own beyond optional frame trimming (`nskip`/`ndrop`).

> [!gotcha] `img`/Analyze is accepted by the code but omitted from the `-run` error message
> The format validator accepts `img`, but the error string printed for an
> invalid format lists only "nii, nii.gz, mgh, and mgz"
> ([`scripts/dcmunpack:936-937`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L936-L937)). The `BEGINHELP` text does mention
> Analyze. Code is authoritative: `img` works.

## Mathematical Foundations

`dcmunpack` is a **dispatcher**, not a numerical tool: it sorts files into
series and delegates all image computation to
[[wiki/tools/mri_convert|mri_convert]] and the FreeSurfer DICOM I/O library. The
only quantitative operations it performs directly are filename formatting
(`printf %03d`/`%04d`) and frame trimming via `nskip` (drop the first *N* time
points) and `ndrop` (drop the last *N*), both passed straight through to
`mri_convert --nskip`/`--ndrop`.

The one place where a real numerical choice surfaces is the handling of
diffusion **b-vectors** for Siemens data, exposed through `-siemensBVecsCross`:

> [!math] Siemens b-vector reference frame
> Diffusion gradient directions are stored in **scanner** coordinates and must
> be rotated into **voxel** coordinates. The legacy method
> (`dcmGetDWIParamsSiemens`) converted the b-vectors slice-by-slice using a
> slice normal obtained from a **cross product**; the cross product has a sign
> ambiguity that is wrong when the determinant of the direction-cosine matrix is
> negative ($\det < 0$). The current default leaves the b-vectors in scanner
> space and rotates them once the final voxel→RAS matrix is known. Passing
> `-siemensBVecsCross` reverts to the old cross-product behaviour. See the source
> comment at [`scripts/dcmunpack:1294-1312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1294-L1312).

> [!internal] The geometry and DWI math live in the DICOM reader
> The actual vox2ras construction, rescaling, and b-vector rotation happen in
> the FreeSurfer DICOM I/O code reached through `mri_convert`/`mri_probedicom`,
> not in this script. `dcmunpack` only sets the environment variables
> (`FS_RESCALE_DICOM`, `FS_LOAD_DWI`, `FS_dcmGetDWIParamsSiemens_VoxelSpace`)
> that steer that code.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/dcmunpack:826-1207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L826-L1207)). Boolean flags take no argument.

#### Source, target, and run selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src`<br>`-d` | string (repeatable) | *(required)* | DICOM source directory; specify multiple times for multiple trees. Must exist and be readable. |
| `-targ`<br>`-trg`<br>`-o` | string | — | Output (target) directory. Required for unpacking; not needed for a scan-only summary. Setting it turns unpacking on. |
| `-run` | `run subdir format stem [nskip [ndrop]]` | — | Unpack one series. `run` = series number; `subdir` = subdirectory under the target; `format` = `nii`/`nii.gz`/`mgh`/`mgz`/`img`; `stem` = base filename (any extension is stripped via `fname2stem`); optional `nskip`/`ndrop` trim leading/trailing time points. Repeatable. |
| `-auto-runseq` | string (format) | off | Unpack **all** non-scout series in one pass, naming each `RRRR.descr.format`. Implies generic hierarchy. Cannot be combined with `-run`. |
| `-keep-scouts` | bool | off | With `-auto-runseq`, also unpack localizer/scout/setter series (otherwise excluded — see gotcha). |
| `-run-skip` | int (repeatable) | — | Skip the named series number during unpacking (useful with `-auto-runseq`). |
| `-series-offset`<br>`-run-offset` | int | `0` | Added to the series number when forming the `%04d` prefix in `-auto-runseq` filenames. |
| `-generic` | bool | off (FSFAST on) | Do not use the FSFAST `subdir/RRR/` hierarchy; write `subdir/stem.format`. |
| `-fsfast` | bool | **on** | Use the FSFAST `subdir/RRR/` hierarchy (the default). |

#### Scan / index (speed-ups)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-scanonly`<br>`-series` | string (filename) | — | Only scan; write the series summary to `targetdir/log/<file>` (target defaults to `.`). No conversion. |
| `-index-out` | string (filename) | — | Save the per-file index to this path (also kept as `targetdir/log/imagelist.dat`) for reuse on a later run. |
| `-index-in` | string (filename) | — | Read a previously saved index instead of re-probing every file — much faster on the second pass. |
| `-one-per-dir`<br>`-oneperdir` | bool | off | Assume each (sub)directory holds exactly one series; probe only one file per directory. Requires at least one of `-pre`/`-pat`/`-ext`. |
| `-pre` | string | — | Match only files whose name starts with this prefix. |
| `-pat` | string | — | Match only files containing this pattern in the middle of the name. |
| `-ext` | string | — | Match only files with this extension (e.g. `dcm`). |
| `-gedcm`<br>`-one` | bool | off | Shorthand for `-ext .dcm -one-per-dir` (typical GE layout). |
| `-martinos`<br>`-mgh`<br>`-bourget` | bool | off | Assume MGH "push to bourget" naming: one file per series ending in `0001.dcm` (sets `-ext 0001.dcm`). |
| `-old-bourget` | bool | off | Older bourget naming: one file per series ending in `1.dcm` (sets `-ext 1.dcm`). |

#### Conversion behaviour

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-no-convert`<br>`-xml-only` | bool | convert on | Do everything except call `mri_convert` (scan/index/FIPS only). |
| `-copy-only` | bool | off | Copy the raw DICOM files into the output run directory instead of converting (implies `-no-convert`). |
| `-force-update`<br>`-no-force-update` | bool | off | Re-convert even if the output is newer than the input DICOM (otherwise an up-to-date output is skipped via `UpdateNeeded`). |
| `-no-exit-on-error` | bool | exit-on-error | Continue to the next run when a conversion fails, instead of aborting; failures are counted and reported at the end. |
| `-itdicom` | bool | off | Add `-it dicom` to the `mri_convert` command line, forcing Siemens DICOMs to be treated as generic DICOM (can help e.g. for PET). |
| `-iid`<br>`-ijd`<br>`-ikd` | 3 floats each | — | Override the column/row/slice direction cosines, passed through to `mri_convert -iid/-ijd/-ikd`. |
| `-no-rescale-dicom`<br>`-rescale-dicom` | bool | rescale **on** | Toggle DICOM intensity rescaling from tags (0028,1052) intercept / (0028,1053) slope via `FS_RESCALE_DICOM`. On by default. |
| `-no-dwi` | bool | DWI read on | Set `FS_LOAD_DWI=0` to stop trying to read diffusion parameters. |
| `-siemensBVecsCross`<br>`-no-siemensBVecsCross` | bool | off (scanner-space) | Use the legacy slice-by-slice cross-product b-vector rotation instead of the current scanner→voxel method (see [Mathematical Foundations](#mathematical-foundations)). |
| `-phase`<br>`-no-phase` | bool | off | Append `_phase` to the output filename for series whose `ImageType` marks them as phase images. |
| `-max` | bool | off | Print the maximum pixel value of the representative DICOM for each series. |

#### dcm2niix back end

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-dcm2niix`<br>`--dcm2niix`<br>`-dcr3` | bool | **on** (since 2023-04-06) | Use the bundled `dcm2niix` engine for conversion (also re-enables Siemens ASCII dump). |
| `-no-dcm2niix`<br>`--no-dcm2niix`<br>`-no-dcr3` | bool | — | Use the native FreeSurfer DICOM reader instead of `dcm2niix`. |
| `-dcm2niix-dicom-dump`<br>`--dcm2niix-dicom-dump` | bool | **on** | Pre-process DICOMs with `mri_probedicom --dcm2niix-dicom-dump` (the modern CSV index path). |
| `-nodcm2niix-dicom-dump`<br>`--nodcm2niix-dicom-dump` | bool | — | Use the legacy per-file `mri_probedicom` pre-processing path instead. |
| `-createBIDS`<br>`-dcm2niix-createBIDS`<br>`--createBIDS`<br>`--dcm2niix-createBIDS` | bool | off | Emit a BIDS JSON sidecar (only with `-dcm2niix`). |
| `-dcm2niix-no-ForceStackSameSeries`<br>`--dcm2niix-no-ForceStackSameSeries` | bool | off | Do not force-stack slices of the same series (only with `-dcm2niix`). |
| `--dcm2niix-opts` | string | — | Pass through `dcm2niix` options as `key=value` pairs separated by commas. Supported keys: `b, ba, f, i, m, v, o, t, p, x`. Example: `--dcm2niix-opts b=y,o=/dir,m=y`. |

#### Metadata, naming, and logging

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-siemens-ascii`<br>`-no-siemens-ascii` | bool | on | Toggle the Siemens ASCII (CSA) header dump. Disable for newer DICOMs that lack it and would otherwise make `mri_probedicom` fail. |
| `-no-infodump`<br>`-noinfodump` | bool | infodump on | Do not write the per-run `stem-infodump.dat` header dump. |
| `-extra-info`<br>`-no-extra-info` | bool | off | Append session info (patient, study date, manufacturer, scanner model, field strength, serial no.) to each series line. |
| `-base` | bool | off | Report the representative filename without its directory path. |
| `-key` | string | — | Prefix every series line in the summary with this string (makes lines easy to `grep`). |
| `-first-dicom` | bool | off | Copy the first DICOM of each series into the output run directory (e.g. to retain pixel data from a low-signal slice). |
| `-replace-special`<br>`-no-replace-special`<br>`-keep-special` | bool | replace **on** | Replace tick marks, spaces, parentheses, and `#` in output filenames with dashes (on by default); `-no-replace-special`/`-keep-special` preserves them. |
| `-log` | string | `targetdir/log/dcmunpack.log` | Explicit log-file path. |
| `-debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print full help and exit. |
| `-version` | bool | — | Print version string and exit. |

#### FIPS (BIRN functional pipeline) options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-fips` | `project site birnid visit` | — | Generate a FIPS `fips-process.xml` descriptor per run via `fips-set`. |
| `-fips-run` | `run paradigm [nskip [ndrop]]` | — | FIPS analogue of `-run`: name a run by paradigm rather than subdir. Cannot be combined with `-run`. |

### Configuration Interactions

> [!gotcha] `-run` and `-auto-runseq` are mutually exclusive
> Specifying both is a hard error
> ([`scripts/dcmunpack:1235-1238`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1235-L1238)). Choose one selection method:
> name each run explicitly with `-run`, or unpack everything with
> `-auto-runseq`.

> [!gotcha] `-fips-run` cannot be mixed with `-run`
> The two run-specification styles conflict and the script exits with
> "cannot spec -fips-run and -run" ([`scripts/dcmunpack:1248-1251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1248-L1251)).

> [!gotcha] `-one-per-dir` requires a file filter
> `-one-per-dir` on its own errors out; it must be combined with at least one of
> `-pre`, `-pat`, or `-ext` ([`scripts/dcmunpack:1220-1223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1220-L1223)). The
> `-gedcm`/`-martinos`/`-bourget` shortcuts satisfy this automatically because
> they set an extension.

> [!gotcha] `-no-siemens-ascii` can be silently undone by `-dcm2niix`
> The `-dcm2niix` flag handler resets `DoSiemensAscii=1`
> ([`scripts/dcmunpack:1043-1044`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1043-L1044)). Because flags are processed
> left to right, `-no-siemens-ascii -dcm2niix` re-enables the ASCII dump,
> whereas `-dcm2niix -no-siemens-ascii` leaves it off. Order matters.

Other interactions:

- `-copy-only` forces `-no-convert` (sets `DoConvert=0`, `DoCopy=1`).
- `-auto-runseq` forces the generic (non-FSFAST) hierarchy (`FSFAST=0`).
- `-scanonly`/`-series` turns unpacking off and defaults the target directory to
  the current directory; you get a summary without converting anything.
- `-index-out` (first run) then `-index-in` (second run) skip the expensive
  re-probe of every file; this is the recommended speed-up for large GE trees,
  alongside `-one-per-dir`.
- The `-dcm2niix-createBIDS`, `-dcm2niix-no-ForceStackSameSeries`, and
  `--dcm2niix-opts` options only take effect while the `dcm2niix` back end is
  active (the default; disabled by `-no-dcm2niix`).

## Typical Use Cases

### 1. Scan a directory to see what is in it

```bash
# Just enumerate the series — no target directory needed.
cd Avanto-25096-20100325-162822-229000
dcmunpack -src . -martinos
```

This prints subject/date/institution and one line per series (series number,
description, TE, TR, flip angle, pixel spacing, phase-encode direction, pixel
bandwidth, first file) — the information you need to choose run numbers.

### 2. Unpack selected runs into an FSFAST hierarchy

```bash
dcmunpack -src . -martinos -targ /space/ProjectDir/subj5 \
  -run 3 bold nii f.nii \
  -run 4 bold nii f.nii \
  -run 5 bold nii f.nii \
  -run 6 bold nii f.nii
```

Writes `/space/ProjectDir/subj5/bold/003/f.nii` … `/006/f.nii`.

### 3. Unpack an anatomical for recon-all

```bash
# Series 5 is the MPRAGE; write it as an mgz and feed recon-all.
dcmunpack -src /data/session01 -one-per-dir -ext dcm \
  -targ /data/unpacked/sub01 -generic \
  -run 5 anat mgz T1
recon-all -s sub01 -i /data/unpacked/sub01/anat/T1.mgz -all
```

### 4. Unpack everything in a single pass

```bash
# Convert every non-scout series automatically; keep going past errors.
dcmunpack -src /data/session01 -targ /data/unpacked/sub01 \
  -auto-runseq nii.gz -no-exit-on-error
# → 0002.mprage.nii.gz, 0005.ge_functionals.nii.gz, ...
```

### 5. Two-pass run with a cached index (fast second pass)

```bash
# Pass 1: scan + cache the file index
dcmunpack -src /data/bigGEtree -one-per-dir -ext dcm \
  -index-out /tmp/idx.dat -scanonly series.dat

# Pass 2: reuse the index, convert chosen runs
dcmunpack -src /data/bigGEtree -one-per-dir -ext dcm \
  -index-in /tmp/idx.dat -targ /data/out \
  -run 7 bold nii.gz f
```

## Pipeline Context

`dcmunpack` is a stand-alone **import/pre-processing** tool. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]]; instead it sits one step upstream of it.

**Predecessor:** raw DICOM from the scanner → **dcmunpack** → **Successors:**
[[wiki/pipelines/recon-all|recon-all]] (anatomical), FSFAST (functional), or
[[dt_recon]] (diffusion).

Internally it orchestrates other FreeSurfer tools: [[mri_probedicom]] performs
the DICOM scan / metadata dump, [[wiki/tools/mri_convert|mri_convert]] (with the
bundled `dcm2niix`) performs the conversion, and [[mri_info]] reads back the
output dimensions for the conversion summary. It is the multi-vendor replacement
for `unpacksdcmdir`; for inventorying a Siemens directory specifically,
[[mri_parse_sdcmdir]] is the lower-level companion tool.

## Gotchas and Caveats

> [!gotcha] Scouts and localizers are excluded by `-auto-runseq`
> Series whose description matches a fixed list — `Localizer`,
> `Localizer_aligned`, `localizer`, `AAHScout`, `AAHScout_sag/cor/tra`,
> `AAHScout_MPR_sag/cor/tra`, `AAScout`, `T1w_setter`, `T2w_setter` — are skipped
> in `-auto-runseq` mode ([`scripts/dcmunpack:449-455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L449-L455)). Add
> `-keep-scouts` to unpack them anyway. The match is exact, so a differently
> named localizer will *not* be excluded.

> [!gotcha] Special characters in series names are rewritten by default
> With the default `-replace-special`, tick marks are deleted and spaces,
> parentheses, and `#` become dashes in the output filename
> ([`scripts/dcmunpack:550-557`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L550-L557)). The on-disk name can therefore differ
> from the DICOM SeriesDescription. Use `-keep-special` to preserve the original
> characters.

> [!gotcha] `stem` extension is discarded
> In `-run … format stem`, any extension on `stem` is stripped by `fname2stem`,
> and the real extension comes from the `format` argument
> ([`scripts/dcmunpack:942-944`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L942-L944)). So `-run 3 bold nii f.nii` and
> `-run 3 bold nii f` both produce `f.nii`.

> [!gotcha] GE scans can be very slow without `-one-per-dir`
> Probing every file in a large GE tree is slow because each file is
> interrogated individually. The help recommends `-one-per-dir` together with
> `-ext`/`-pat`/`-pre`, and `-index-out`/`-index-in`, to speed this up
> ([`scripts/dcmunpack:1471-1492`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1471-L1492)).

> [!gotcha] `-martinos` naming is no longer guaranteed
> The fast `-martinos`/`-bourget` path relies on a filename convention that the
> help text notes stopped being guaranteed in August 2012
> ([`scripts/dcmunpack:1486-1488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1486-L1488)). If it finds nothing, drop the flag
> and let it search normally (optionally with `-one-per-dir`).

> [!contradiction] Help vs. code on accepted `-run` formats
> The `-run` validation error lists only `nii, nii.gz, mgh, mgz`, but the code
> also accepts `img` (Analyze), and `BEGINHELP` mentions Analyze. Code is
> authoritative — `img` is valid ([`scripts/dcmunpack:932-939`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L932-L939)).

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Before converting (or dumping info), `UpdateNeeded`
  compares output and input timestamps; an output newer than its source DICOM is
  left untouched ([`scripts/dcmunpack:614-615`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L614-L615)). Override with
  `-force-update`. This makes re-runs cheap but can hide the effect of changed
  flags — force an update if you change conversion options.
- **Exit-on-error by default.** A single failed `mri_convert` aborts the whole
  job ([`scripts/dcmunpack:690-698`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L690-L698)); `-no-exit-on-error` converts
  everything it can and reports a count of failures at the end.
- **DICOM rescaling on by default.** Intensities are rescaled using the slope /
  intercept tags unless `-no-rescale-dicom` is given — your output values may be
  scaled relative to the raw stored pixels.
- **Non-DICOM files are skipped** rather than causing an error (legacy path,
  [`scripts/dcmunpack:306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L306)).

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — the converter `dcmunpack` calls once per run; all geometry, rescaling, and format handling happen here.
- [[mri_probedicom]] — does the DICOM scan / metadata dump (`--dcm2niix-dicom-dump`) that `dcmunpack` builds its series list from.
- [[mri_parse_sdcmdir]] — lower-level, Siemens-only directory inventory; companion for inspecting one Siemens tree.
- [[mri_info]] — used internally to read back output dimensions for the conversion summary.
- [[dt_recon]] — a typical downstream consumer of unpacked diffusion volumes.
- `unpacksdcmdir` *(no wiki page yet)* — the legacy Siemens-only unpacker that `dcmunpack` supersedes; `dcmunpack` accepts most of its arguments except `-cfg`, `-seqcfg`, `-nspmzeropad`, `-no-unpackerr`, and `-scanonly` (a scanonly-style summary is still available), and it does not produce SPM output.

## Confidence and Gaps

**High confidence:** complete flag set and aliases, mutual-exclusion rules,
output hierarchy, default-on/-off states, the two-pass workflow, scout
exclusion, special-character rewriting, the `UpdateNeeded` skip, and the
`-siemensBVecsCross` semantics — all read directly from
[`scripts/dcmunpack`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack).

> [!gap] Exact index/series file columns
> The precise column order of `imagelist.dat` and `series-info.dat` differs
> between the `dcm2niix` CSV path and the legacy `mri_probedicom` path. The awk
> field indices were read but not validated against real output files; treat the
> file-layout descriptions above as approximate.

> [!gap] FIPS path not exercised
> The `-fips`/`-fips-run` branch (`fips-set`-driven XML generation) is described
> from the script alone and was not run; the BIRN/FIPS toolchain it targets may
> not be present in current installs.

## References

- FreeSurfer source: [`scripts/dcmunpack`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack) (v8.2.0).
- Built-in help: `dcmunpack -help` (the `BEGINHELP` block, [`scripts/dcmunpack:1417-1554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack#L1417-L1554)).
- FreeSurfer wiki (legacy): the historical `DcmUnpack` / `unpacksdcmdir` pages — superseded for v8 by this code-anchored page.
