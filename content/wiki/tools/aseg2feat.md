---
title: "aseg2feat"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/aseg2feat"
families: []                     # FSL/FEAT interoperability script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[aparc2feat]]"
  - "[[mri_label2vol]]"
  - "[[reg2subject]]"
  - "[[feat2segstats]]"
  - "[[feat2surf]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - fsl
  - feat
  - segmentation
  - aseg
  - registration
  - interoperability
---

# aseg2feat

## Summary

`aseg2feat` resamples a FreeSurfer **volumetric segmentation** — by default the
subcortical `aseg.mgz` from [[wiki/pipelines/recon-all|recon-all]], or
optionally `aparc+aseg` or any other segmentation volume — into the functional
space of an **FSL FEAT** analysis directory. The output is an integer-labelled
volume that is voxel-for-voxel registered to the FEAT `example_func`, letting
you draw subcortical region-of-interest masks (e.g. the putamen) or feed the
segmentation to [[feat2segstats]] for per-structure statistics. Like its
cortical counterpart [[aparc2feat]], it is a thin tcsh wrapper around
[[mri_label2vol]]; unlike `aparc2feat`, it can also map results into FSL
**standard (MNI) space**. It requires that `reg-feat2anat` has already produced
the FEAT↔anatomical registration.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/aseg2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat)
- **Binary/script location:** `$FREESURFER_HOME/bin/aseg2feat`
- **Original author:** Doug Greve
- **Core helper invoked:** [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L101-L103) (the segmentation→volume resampling) and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L89) (recovers the subject ID from the registration file).

## Purpose and Context

FSL FEAT analyses live in a functional (EPI) voxel space that has no inherent
relation to FreeSurfer's anatomy. `aseg2feat` brings FreeSurfer's
**subcortical/volumetric** segmentation into that space so that a contrast,
COPE, or z-statistic can be summarised structure-by-structure (left putamen,
thalamus, hippocampus, …) or masked to a single nucleus.

It is one of the FreeSurfer/FSL bridge scripts authored by Doug Greve:

- `reg-feat2anat` — establishes the registration (run **first**).
- [[aparc2feat]] — imports the **cortical surface** parcellation.
- **`aseg2feat`** — imports the **subcortical/volume** segmentation (this tool).
- [[feat2segstats]] — extracts per-segment statistics from FEAT volumes using
  one of the imported segmentations.
- [[feat2surf]] — the reverse direction: FEAT statistics → FreeSurfer surface.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run by hand
once a FreeSurfer recon and an FSL FEAT analysis exist for the same subject.

## Inputs

### Required Inputs

- **One or more FEAT directories** — given with `--feat` (repeatable) and/or via
  `--featdirfile`. Each must contain a `reg-feat2anat` registration. In native
  mode the script uses `featdir/reg/freesurfer/<regfile>` (default
  `anat2exf.register.dat`); in standard mode it uses
  `featdir/reg/freesurfer/anat2std.register.dat`
  ([`scripts/aseg2feat:83-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L83-L87)).
- **A FreeSurfer subject** — read from the registration file, not from the
  command line (via [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L89);
  the pre-flight check reads the first line directly,
  [`scripts/aseg2feat:233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L233)).
- **The segmentation volume** — `$SUBJECTS_DIR/<subj>/mri/<segvol>.mgz` (the
  script also accepts a legacy COR directory form,
  [`scripts/aseg2feat:94-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L94-L95)).
  Default `segvol` is `aseg`.
- **`$SUBJECTS_DIR`** must be set and point at an existing directory.

### Input Assumptions

> [!assumption] reg-feat2anat must already have been run
> `aseg2feat` computes no registration. It assumes the appropriate register file
> already exists in `featdir/reg/freesurfer/`. A missing register file is a fatal
> error: "You must run reg-feat2anat first"
> ([`scripts/aseg2feat:228-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L228-L232)).
> The functional geometry is taken from `example_func` (`.img`/`.nii`/`.nii.gz`).

> [!gotcha] The subject identity comes from the registration file
> There is no `--subject` flag; the FreeSurfer subject is whatever is named
> inside the register file. Point `--reg`/`--standard` at a file for the wrong
> subject and the wrong segmentation is resampled silently.

## Outputs

### Files Created

For each FEAT directory:

| File / pattern | Where (mode-dependent) | Contents |
|----------------|------------------------|----------|
| `<segvol><fslext>` (e.g. `aseg.nii.gz`, `aparc+aseg.nii.gz`) | **default:** `featdir/reg/freesurfer/` | The segmentation resampled into the FEAT grid; each voxel value is a structure label index. |
| `<segvol><fslext>` | **`--svstats` (native):** `featdir/stats/` | Same, placed where FEAT keeps its stat volumes so [[feat2segstats]] can find it. |
| `<segvol><fslext>` | **`--standard`:** `featdir/reg_standard/stats/` | Same, but resampled into FSL standard (MNI) space via `anat2std.register.dat`. |
| `<segvol>2feat.log` | `featdir/reg/freesurfer/` | Full command, environment, and the `mri_label2vol` call/output. A pre-existing log is rotated to `.log.bak` ([`scripts/aseg2feat:68-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L68-L69)). |

The output extension `<fslext>` matches `example_func`
([`scripts/aseg2feat:97-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L97-L99));
the output base name is the segmentation name (`aseg`, `aparc+aseg`, …).

### Output Specifications

The output volume has the **same geometry as `example_func`** (native mode) — or
the FEAT standard-space grid (standard mode) — and is in voxel-for-voxel
registration with the corresponding FEAT data. Each voxel holds a structure
index; for `aseg`/`aparc+aseg` the index→name correspondence is
`$FREESURFER_HOME/FreeSurferColorLUT.txt` (and the legacy `tkmeditColorsCMA`),
e.g. left putamen = 12, as noted in the script's help
([`scripts/aseg2feat:345-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L345-L352)).
Data type and fill value are determined by [[mri_label2vol]].

## Mathematical Foundations

`aseg2feat` does no arithmetic itself. It composes the anatomical→functional (or
anatomical→standard) registration and rasterises the labelled segmentation into
the target grid using [[mri_label2vol]].

> [!internal] The resampling math lives in mri_label2vol
> The fixed invocation is
> [`mri_label2vol --seg <aseg.mgz> --temp example_func --reg <register.dat> --o <out>`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L101-L113).
> Note that — unlike [[aparc2feat]] — there is **no** surface projection
> (`--proj`): a volume segmentation is resampled directly through the
> registration with nearest-neighbour label assignment. See [[mri_label2vol]]
> for the interpolation/voxelisation details.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/aseg2feat:140-203`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L140-L203)).
Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--feat` | string (repeatable) | *(required)* | A FEAT output directory; repeatable. Each must contain the relevant register file under `reg/freesurfer/`. |
| `--featdirfile` | string (filename) | — | ASCII file listing FEAT directories; contents appended to the directory list. Combinable with `--feat` and repeatable. |
| `--seg`<br>`--aseg` *(as flag taking an arg)* | string | `aseg` | Segmentation volume basename to resample, i.e. `$SUBJECTS_DIR/<subj>/mri/<segvol>.mgz` ([`scripts/aseg2feat:148-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L148-L152)). |
| `--aparc+aseg` | bool | off | Shorthand: set `segvol = aparc+aseg` (cortical + subcortical combined segmentation). |
| `--reg` | string (filename) | `anat2exf.register.dat` | Register-file basename to use in **native** mode (looked up under `reg/freesurfer/`). Ignored in `--standard` mode. |
| `--svstats` | bool | off | Write the output into `featdir/stats/` (native) instead of `reg/freesurfer/`, so [[feat2segstats]] finds it. |
| `--standard` | bool | off | Resample into FSL **standard (MNI) space** using `anat2std.register.dat`, writing to `featdir/reg_standard/stats/`. **Implies `--svstats`** ([`scripts/aseg2feat:182-185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L182-L185)). |
| `--usedev` | bool | off | Use the development build `$DEV/mri_label2vol/mri_label2vol` ([`scripts/aseg2feat:92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L92)). Developer-only. |
| `--debug` | bool | off | Enable `set echo`/`verbose` command tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--standard` forces `--svstats` and ignores `--reg`
> `--standard` sets `space=standard` and `svstats=1`
> ([`scripts/aseg2feat:182-185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L182-L185)).
> In standard mode the register file is **hard-coded** to
> `anat2std.register.dat` regardless of any `--reg` you pass
> ([`scripts/aseg2feat:84-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L84-L86)),
> and the output goes to `reg_standard/stats/` rather than the location `--reg`
> would imply. `--reg` therefore only matters in native mode.

> [!gotcha] `--svstats` vs default output location
> Without `--svstats` the labelled volume is written to `reg/freesurfer/`
> (handy for masking but **not** where [[feat2segstats]] looks). With `--svstats`
> it goes to `stats/`. If you intend to run [[feat2segstats]] next, note that
> *it* reads the segmentation from `reg/freesurfer/`, not `stats/` — see that
> page's gotchas.

- `--seg`/`--aseg` (with an argument) and `--aparc+aseg` both set the same
  `segvol` variable; the **last one wins**.
- `--feat` and `--featdirfile` are additive and repeatable.
- The pre-flight loop requires every chosen register file and segmentation to
  exist before any resampling ([`scripts/aseg2feat:227-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L227-L245)).

## Typical Use Cases

### 1. Import the subcortical segmentation into a FEAT analysis

```bash
# Registration must already exist (reg-feat2anat).
aseg2feat --feat fbert.feat
# → fbert.feat/reg/freesurfer/aseg.nii.gz
```

### 2. Use the combined cortical+subcortical segmentation, saved for segstats

```bash
aseg2feat --feat fbert.feat --aparc+aseg --svstats
# → fbert.feat/stats/aparc+aseg.nii.gz
```

### 3. Build a subcortical ROI mask in the functional space

```bash
aseg2feat --feat fbert.feat
# Left putamen = label 12 (FreeSurferColorLUT.txt)
fslmaths fbert.feat/reg/freesurfer/aseg.nii.gz \
         -thr 12 -uthr 12 \
         fbert.feat/reg/freesurfer/lh.putamen.nii.gz
```

(The help shows the equivalent legacy `avwmaths` form,
[`scripts/aseg2feat:354-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L354-L358).)

### 4. Map the segmentation into FSL standard space

```bash
aseg2feat --feat fbert.feat --standard
# → fbert.feat/reg_standard/stats/aseg.nii.gz (uses anat2std.register.dat)
```

### 5. Inspect the result in tkmedit

```bash
tkmedit -f fbert.feat/example_func.nii.gz \
   -segmentation fbert.feat/reg/freesurfer/aseg.nii.gz
```

## Pipeline Context

`aseg2feat` is a stand-alone FreeSurfer↔FSL bridge tool; it is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (produces `aseg.mgz` /
`aparc+aseg.mgz`) **and** `reg-feat2anat` (produces `anat2exf.register.dat` and,
for standard mode, `anat2std.register.dat`) → **aseg2feat** → **Successors:**
[[feat2segstats]] (per-structure statistics), `fslmaths`/[[tkmedit]] ROI
masking. Its cortical counterpart is [[aparc2feat]]; the reverse-direction tool
is [[feat2surf]].

## Gotchas and Caveats

> [!gotcha] Soldiers on past a failed resampling
> If `mri_label2vol` fails for one FEAT directory, the script prints the error
> and `continue`s to the next directory rather than aborting
> ([`scripts/aseg2feat:119-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L119-L124)).
> This differs from [[aparc2feat]], which exits on the first error. Check the per-
> directory `<segvol>2feat.log` to confirm each one actually succeeded.

> [!gotcha] `--seg` argument may include or omit `.mgz`
> The help says `--aparc+aseg` is "Same as `--seg aparc+aseg.mgz`", but the code
> builds the path as `mri/<segvol>.mgz` (default) or `mri/<segvol>`
> ([`scripts/aseg2feat:94-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L94-L95)).
> Passing `--seg aseg` is the reliable form; the script tries `<segvol>.mgz`
> first, then a bare `<segvol>` (legacy COR directory).

> [!gotcha] Output base name and log name follow the segmentation
> Both the output file (`<segvol><ext>`) and the log (`<segvol>2feat.log`) are
> named after the segmentation, so running with `--aseg` then `--aparc+aseg`
> produces distinct outputs and logs that do not clobber each other.

## Error Compensation and Guard Rails

- **Pre-flight existence checks** for `$SUBJECTS_DIR`, the subject, every
  register file, and the segmentation volume
  ([`scripts/aseg2feat:209-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L209-L245)),
  failing fast with specific messages — except the per-directory resampling
  itself, which only warns and continues (see gotcha above).
- **Format auto-detection** of the FEAT output type from `example_func`, reused
  for the labelled output ([`scripts/aseg2feat:97-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L97-L99)).
- **Legacy COR fallback.** If `<segvol>.mgz` is absent the script will accept a
  classic `<segvol>/COR-.info` directory ([`scripts/aseg2feat:239-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L239-L243)).
- **No silent modification** of your functional data — it only adds a labelled
  volume.

## Related Tools

- [[mri_label2vol]] — the engine that resamples the segmentation into the
  functional/standard grid.
- [[aparc2feat]] — companion script for the **cortical surface** parcellation.
- [[reg2subject]] — reads the subject name from the register file.
- [[feat2segstats]] — typical downstream consumer; per-structure statistics on
  FEAT volumes using this segmentation.
- [[feat2surf]] — the reverse mapping: FEAT statistics → FreeSurfer surface.
- [[mri_segstats]] — the per-segment statistics engine [[feat2segstats]] calls.
- [[tkmedit]] — used to view the resampled segmentation overlaid on
  `example_func`.
- `reg-feat2anat` *(no wiki page yet)* — the prerequisite that creates the
  register file(s).
- [[wiki/tools/mri_glmfit|mri_glmfit]] — FreeSurfer's native GLM; the in-house
  alternative to FSL FEAT.

## Confidence and Gaps

**High confidence:** the complete flag set, the native/`--svstats`/`--standard`
output locations, the `--standard`-forces-`--svstats`-and-hard-codes-`anat2std`
behaviour, the direct (non-projected) `mri_label2vol --seg` invocation, the
`continue`-on-error semantics, and the segmentation/log naming — all read
directly from [`scripts/aseg2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat).

> [!gap] Standard-space register file provenance
> `--standard` requires `anat2std.register.dat`. This page documents that the
> script consumes it but does not verify which upstream step writes it
> (presumably `reg-feat2anat` when FEAT registration to standard space is
> configured); confirm with `reg-feat2anat` if the file is missing.

## References

- FreeSurfer source: [`scripts/aseg2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat) (v8.2.0).
- Built-in help: `aseg2feat --help` (the `BEGINHELP` block,
  [`scripts/aseg2feat:286-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aseg2feat#L286-L362)).
- Companion: `reg-feat2anat --help` and [[aparc2feat]].
