---
title: "mris_preproc"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mris_preproc"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_concat]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_register]]"
  - "[[surface-representations]]"
  - "[[coordinate-systems]]"
  - "[[curv-format]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "mri_surf2surf resampling algorithm (nnfr) not documented"
  - "FS-FAST ses/df workflow details not traced"
tags:
  - group-analysis
  - surface
  - preprocessing
  - glm
---

# mris_preproc

## Summary

`mris_preproc` is the standard FreeSurfer tool for preparing surface-based
data for group-level analysis. Given a list of subjects, it resamples each
subject's per-vertex surface measure (or volume-projected surface measure) onto
a common-space surface (usually `fsaverage`) using spherical registration, then
concatenates all resampled maps into a single multi-frame output file. This
output is the direct input to `mri_glmfit` for surface-based general linear
model analysis.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mris_preproc` (1506 lines, author: Doug Greve)
- **Binary location:** `$FREESURFER_HOME/bin/mris_preproc`

## Purpose and Context

`mris_preproc` is the entry point for group-level cortical surface analysis in
FreeSurfer. It bridges per-subject surface measures (from [[mris_anatomical_stats]],
[[mri_vol2surf]], or custom surface overlays) and the multi-subject GLM
framework. The tool:

1. Iterates over all subjects
2. For each subject, optionally resamples a volume to the subject's surface
   (via [[mri_vol2surf]]) if the input is volumetric
3. Resamples the per-subject surface data to the target subject's surface
   (via `mri_surf2surf` using `?h.sphere.reg`)
4. Concatenates all resampled maps (via [[mri_concat]]) into a single
   `[Nvertices × 1 × 1 × Nsubjects]` output file

Not called by `recon-all`.

## Inputs

### Per-Subject Surface Measures

Multiple source modes (choose one):

| Mode | Flag | Description |
|------|------|-------------|
| Curvature/overlay file | `--meas <name>` | Reads `$SUBJECTS_DIR/$subj/surf/$hemi.<name>` |
| Full path | `--is <path>` | Explicit per-subject surface file path (repeatable, one per subject) |
| Volume + registration | `--iv <vol> <reg>` | Sample volume to surface first |
| From cache | `--cache-in <file>` | Read pre-resampled data from `$surfdir/$hemi.$file` |
| FSFAST analysis | `--sf / --df / --a / --c` | Extract from FS-FAST session/contrast directory |

### Subject Lists

Choose one:

| Flag | Description |
|------|-------------|
| `--s <subjid>` | Single subject; repeat for multiple |
| `--f <file>` | Text file, whitespace-separated subject IDs |
| `--fsgd <file>` | FSGDF file; subjects from "Input" lines |
| `--qdec <table>` | QDEC table; subjects from first column |
| `--qdec-long <table>` | Longitudinal: builds `<fsid>.long.<fsid-base>` IDs from columns 1+2 |

### Input Assumptions

> [!assumption] All subjects must have `$hemi.sphere.reg` in their `surf/` directory
> The default resampling uses `sphere.reg` as the registration surface. Every
> subject must have completed `mris_register` (part of `autorecon3`) before
> `mris_preproc` can resample to a common space.

> [!assumption] Default target is `fsaverage`
> Unless `--target <subject>` is specified, resampling is to `fsaverage`. The
> `fsaverage` subject must be in `$SUBJECTS_DIR`.

## Outputs

- `--o / --out <file>` — multi-frame output volume:
  `[Nvertices × 1 × 1 × Nsubjects]` in [[mgz]] or other format. This is the
  primary input to `mri_glmfit`.
- Per-subject cache files (if `--cache-out <name>`) written to
  `$SUBJECTS_DIR/$subj/surf/$hemi.<name>.<fmt>`
- Log file written alongside the output unless `--nolog`

## Mathematical Foundations

`mris_preproc` is a wrapper; the core mathematics are in the tools it calls:

**Spherical resampling** (via `mri_surf2surf`): maps surface data between subjects
by aligning `?h.sphere.reg` surfaces. The registration was established by
[[mris_register]]. Nearest-neighbour with Jacobian correction is the default
for smooth data; nearest-neighbour without Jacobian (`--mapmethod nnf`) is used
for labels.

**Jacobian correction** for area/volume measures: when `--meas area`, `area.mid`,
`area.pial`, or `volume` is specified, `--jac` is automatically enabled. The
Jacobian of the spherical registration deformation corrects for areal distortion,
ensuring that total area is preserved across subjects after resampling.

**Volume-to-surface projection**: if the input is a volume (`--iv`), [[mri_vol2surf]]
is called with the specified `--projfrac` or `--projfrac-max` before resampling.

**Concatenation**: [[mri_concat]] assembles the per-subject resampled files into
a single 4D output. Optional `--prune` (default for paired operations) zeros any
vertex that is zero in any subject.

## Configuration Options

### Complete Flag Reference

All flags below are taken from the `parse_args` switch block of the tcsh
source (`scripts/mris_preproc`, FS 8.2.0). Default values are the variable
initialisations at the top of the script.

#### Subject specification

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--s` / `--subject` | `subjid` (string) | empty | Append `subjid` to the subject list. Repeatable. |
| `--f` | `file` (path) | — | Read whitespace-separated subject IDs from `file` and append to the subject list. Errors out if `file` does not exist. Can be combined with other subject-specifying flags. |
| `--fsgd` | `file` (path) | — | Parse an FSGDF design file; subjects are taken from the second token of every line whose first token equals `Input`. Errors out if `file` does not exist. |
| `--qdec` | `table` (path) | — | Parse a QDEC table; subjects are taken from column 1 of every non-empty, non-comment, non-`fsid`-header row. CR/LF tolerant. |
| `--qdec-long` | `table` (path) | — | Like `--qdec` but builds longitudinal IDs of the form `<col1>.long.<col2>` from columns 1 and 2. |

#### Surface input (choose one source mode)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--meas` | `surfmeasure` (string) | — | Per-subject curvature/overlay file at `$SUBJECTS_DIR/$subj/$measdir/$hemi.$surfmeasure`. Sets `srcfmt=curv`, marks the run as surface-source (`srcsurf=1`) and as a measure-input (`MeasIn=1`). If the un-suffixed file is missing, the script silently falls back to `$hemi.$surfmeasure.mgz`. |
| `--label` | `annotname` (string) | — | Per-subject label/annotation file at `$SUBJECTS_DIR/$subj/label/$hemi.$annotname`. Forces `measdir=label`, `mapmethod="--mapmethod nnf"`, `jac=0`, `srcsurf=1`, and clears `srcfmt`. Use for categorical/label data. |
| `--is` / `--isp` | `path` (file) | — | Explicit per-subject input surface file; one `--is` per subject, in the same order as the subject list. Errors out if the file does not exist. Marks `srcsurf=1`. Repeatable. |
| `--area` | `surfname` (string) | — | Compute per-vertex surface area from `$hemi.$surfname` (e.g., `white`, `pial`). Sets `sval=area`, `svalsurf=$surfname`, `srcsurf=1`, and **forces `jac=1`** (Jacobian correction). |
| `--tal-xyz` | `surfname` (string) | — | Emit MNI305 (Talairach) `xyz` coordinates of vertices from `$hemi.$surfname` as a 3-frame per-subject map. Sets `sval=tal-xyz`, `svalsurf=$surfname`, `srcsurf=1`. |
| `--cache-in` | `name` (string) | — | Read previously cached resampled data from `$subj/$measdir/$hemi.$name.$format` instead of running `mri_surf2surf`. Sets `srcsurf=1`, `CacheIn=1`. |
| `--srcfmt` | `fmt` (string) | empty (auto) | Pass `--src_type $fmt` to `mri_surf2surf`. Common values: `curv`, `paint`, `w`. Set automatically by `--meas`. |
| `--surfdir` | `dirname` (string) | `surf` | Subdirectory of `$SUBJECTS_DIR/$subj` searched for surface files (alternative is e.g. `dtrans`). |
| `--measdir` | `dirname` (string) | value of `--surfdir` | Subdirectory searched for `--meas`/`--cache-in` files. Independently overridable from `--surfdir`; if not set, **defaults to whatever `--surfdir` is** (line 957 of the script). `--label` forces `measdir=label`. |

#### Volume input (alternative source mode)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--iv` / `--ivp` | `vol reg` (2 paths) | — | Per-subject input volume `vol` and tkregister-style registration `reg`. Both must exist. The subject ID is **derived from the registration file** via `reg2subject --r $reg` and appended to the subject list automatically. Sets `srcvol=1`. Repeatable; one `--iv` per subject. |
| `--projfrac` | `frac` (float) | empty | Single-sample projection fraction along the surface normal (0=white, 1=pial). Passed to [[mri_vol2surf]] as `--projfrac`. |
| `--projfrac-max` | `min max delta` (3 floats) | empty | Sample volume at multiple depths and take the **maximum**. Three positional arguments passed verbatim to [[mri_vol2surf]] `--projfrac-max`. |
| `--projfrac-avg` | `min max delta` (3 floats) | empty | Sample at multiple depths and take the **average**. Three positional arguments. |
| `--no-mask-non-cortex` | none | masking on (`V2SMaskNonCtx=1`) | Do not zero out non-cortical vertices during volume-to-surface projection (i.e., do not pass the cortex-only mask to [[mri_vol2surf]]). |

#### Target surface / hemisphere

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--target` | `subject` (string) | `fsaverage` | Common-space target subject. **Side effect:** if `subject` does **not** start with the literal string `fsaverage` (first 9 chars), `SrcSurfReg` is silently overridden to `<target>.sphere.reg`. |
| `--hemi` | `lh\|rh` | — | Sets both `srchemi` and `trghemi`. |
| `--srchemi` | `lh\|rh` | — | Source hemisphere only. |
| `--trghemi` | `lh\|rh` | — | Target hemisphere only. |
| `--surfreg` | `name` (string) | `sphere.reg` | Registration surface name; sets **both** `SrcSurfReg` and `TrgSurfReg`. |
| `--srcsurfreg` | `name` (string) | `sphere.reg` | Source registration surface only. |
| `--trgsurfreg` | `name` (string) | `sphere.reg` | Target registration surface only. |

#### Smoothing

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--fwhm` / `--fwhm-targ` | `mm` (float) | empty (no smoothing) | Gaussian FWHM in millimetres applied to the resampled data on the **target** surface. |
| `--fwhm-src` | `mm` (float) | empty | FWHM applied on the **source** surface, before resampling. |
| `--niters` / `--niters-targ` | `n` (int) | empty | Number of nearest-neighbour smoothing iterations on the target surface. Alternative to `--fwhm-targ`. |
| `--niters-src` | `n` (int) | empty | Number of NN iterations on the source surface. |
| `--cortex-only` / `--smooth-cortex-only` | none | on (`CortexOnly=1`) | Restrict smoothing to vertices inside the `cortex` label (i.e., do not smooth into the medial wall). |
| `--no-cortex-only` / `--no-smooth-cortex-only` | none | — | Disable cortex-only smoothing; allow smoothing across the medial-wall boundary. |

#### Aggregation / paired operations

These operate on the concatenated per-subject stack just before writing the
output. They are passed through to [[mri_concat]].

| Flag | Default | Description |
|------|---------|-------------|
| `--paired-diff` | off | Output Input1−Input2, Input3−Input4, … (requires even N). |
| `--paired-diff-norm` | off | Per-pair `(In1−In2)/((In1+In2)/2)`. |
| `--paired-diff-norm1` | off | Per-pair `(In1−In2)/In1`. |
| `--paired-diff-norm2` | off | Per-pair `(In1−In2)/In2`. |
| `--mean` | off | Replace the stack with its per-vertex mean across subjects. |
| `--std` | off | Replace the stack with its per-vertex standard deviation across subjects. |
| `--no-prune` | pruning on (`DoPrune=1`) | Disable [[mri_concat]] `--prune`; keep vertices that are zero in any subject. |

#### Caching

`--cache-in` is documented under "Surface input" because it is itself a
source-mode flag.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--cache-out` | `name` (string) | — | Save each per-subject resampled file to `$SUBJECTS_DIR/$subj/$measdir/$hemi.$name.$format` so a later run can pick it up via `--cache-in $name`. |
| `--cache-out-only` | `tmpdir` (path) | — | Run only the per-subject resampling+caching step and skip the concatenation/output. **Requires** an explicit `tmpdir` argument despite looking like a Boolean. Sets `CacheOutOnly=1`. |
| `--cache-out-update` | `tmpdir` (path) | — | Like `--cache-out-only` but tags the run as an update (`CacheOutUpdate=1`); the script appends `tmp.mris_preproc.
$$
` to the supplied path and re-uses an existing cache where possible. |

#### Jacobian correction

| Flag | Default | Description |
|------|---------|-------------|
| `--jac` | off (`jac=0`) | Enable Jacobian (areal-distortion) correction; passed to `mri_surf2surf`. Auto-enabled by `--area`. |
| `--no-jac` | — | Force `jac=0` and set `NoJac=1`, which suppresses the auto-enable that would otherwise be applied for area/volume measures. |

#### Cross-hemispheric

| Flag | Default | Description |
|------|---------|-------------|
| `--dual-hemi` | off (`DualHemi=0`) | Enable dual-hemisphere processing (treat both hemispheres jointly). |
| `--xhemi` | off (`DoXHemi=0`) | For each subject `subj`, also include its mirror-flipped `subj/xhemi` copy in the input list. Doubles the effective subject count. |
| `--xhemi-only` | off | Sets both `DoXHemi=1` and `DoXHemiOnly=1`: include **only** the xhemi version, not the original. |

#### ETIV normalization

| Flag | Default | Description |
|------|---------|-------------|
| `--etiv` | off (`DoETIV=0`) | Divide each subject's per-vertex values by that subject's estimated total intracranial volume (eTIV) read from `$subj/stats/aseg.stats`. |

#### FS-FAST integration

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--sf` | `file` (path) | — | FS-FAST session file (list of session directories). Triggers FS-FAST mode in `handle_fsfast`. Requires `--analysis`. |
| `--df` / `--sd` | `file` (path) | — | FS-FAST session-directory file. Errors out if it does not exist. |
| `--analysis` / `--a` | `analysis` (string) | — | FS-FAST analysis name (subdirectory under each session). |
| `--contrast` / `--c` | `contrast` (string) | — | FS-FAST contrast name (subdirectory under the analysis). Mutually exclusive with `--offset`. |
| `--map` | `mapname` (string) | `ces` | Map filename stem within the contrast directory. |
| `--cvar` | none | off (`DoFSFCVar=0`) | Sets `FSFMap=cesvar` (contrast-effect-size variance) instead of `ces`. |
| `--offset` | none | off (`DoFSFOffset=0`) | Sets `FSFMap=h-offset`; uses the analysis offset rather than a contrast. Cannot be combined with `--contrast`. |

#### Output / misc

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--o` / `--out` | `path` | — | Output file path. Format is inferred via `fname2stem`; the script aborts if the extension is not recognized. Required unless `--cache-out-only` / `--cache-out-update`. |
| `--mgz` | none | `format=mgh` | Use `.mgz` (compressed) as the per-subject intermediate format. |
| `--mgh` | none | default | Use `.mgh` (uncompressed) as the per-subject intermediate format. |
| `--reshape` | none | `reshape=0` | Pass `--reshape` to `mri_concat` to force a 4-D shape reshape on the output. Auto-enabled when the output format is detected as ANALYZE/NIfTI. |
| `--no-hash` | none | `hash=1` | Disable hashing in `mri_surf2surf` calls (passes `--no-hash`). |
| `--SUBJECTS_DIR` | `dir` (path) | env `$SUBJECTS_DIR` | Set/override the `SUBJECTS_DIR` environment variable for the run. |
| `--tmpdir` | `dir` (path) | auto-generated under `/tmp` | Use a specified working/temp directory. Implies `--nocleanup` should be considered (the directory is not removed if user-supplied via `--cache-out*`). |
| `--cleanup` | none | on (`cleanup=1`) | Re-enable removal of the temp directory at exit (the default). |
| `--nocleanup` | none | — | Keep the temp directory after the run finishes. (The case appears twice in the source as a benign duplicate.) |
| `--log` | `file` (path) | auto (next to output) | Write the log to a user-specified path. |
| `--nolog` | none | logging on (`nolog=0`) | Suppress log file creation. |
| `--dontrun` | none | run on (`RunIt=1`) | Parse arguments, build commands and check inputs, but do not execute the external programs. Useful for dry-run debugging. |
| `--debug` | none | off | Verbose mode: enables `verbose=1`, `echo=1` (terminal echoing of every command), and `debug=1`. |
| `--synth` | none | off (`synth=0`) | Synthesize random per-subject input for testing instead of reading real data. |
| `--help` | none | — | Print the long help text and exit (intercepted before `parse_args`). |
| `--version` | none | — | Print the version string (`mris_preproc @FS_VERSION@`) and exit. |

### Configuration Interactions

**Source-mode flags are mutually exclusive.** Exactly one of the following
should be supplied per run; combining them produces undefined behaviour because
they share the `meas` / `sval` / `srcsurf` / `srcvol` / `MeasIn` / `CacheIn`
state variables:

- `--meas <name>` (curvature/overlay)
- `--label <annot>` (label/annotation; forces `--mapmethod nnf`, `jac=0`, `measdir=label`)
- `--is`/`--isp <path>` (explicit per-subject file, repeated)
- `--iv`/`--ivp <vol> <reg>` (per-subject volume; repeated; subject IDs derived from `reg`)
- `--area <surfname>` (area; auto `--jac`)
- `--tal-xyz <surfname>` (3-frame xyz output)
- `--cache-in <name>` (read pre-resampled cache)
- FS-FAST mode: `--sf` + `--analysis` + (`--contrast` xor `--offset`)

**Subject-list flags can be combined** (`--s`, `--f`, `--fsgd`, `--qdec`,
`--qdec-long` all *append* to `subjlist`), but `--iv` also appends to
`subjlist` automatically, so mixing `--iv` with explicit subject flags will
duplicate or misalign the list.

**Hemisphere flags:** `--hemi` is shorthand for `--srchemi` + `--trghemi`; the
last one wins.

**Registration-surface flags:** `--surfreg` sets both `SrcSurfReg` and
`TrgSurfReg`; `--srcsurfreg`/`--trgsurfreg` then override one side. **However**,
`--target` with a non-`fsaverage*` argument silently re-assigns
`SrcSurfReg = <target>.sphere.reg`, which can override an earlier
`--srcsurfreg`/`--surfreg` if `--target` is parsed later on the command line.

**FS-FAST internal exclusivity:** `--offset` and `--contrast` cannot both be
given; the script errors out in `handle_fsfast`.

> [!gotcha] Jacobian correction auto-enabled for area and volume measures
> When `--meas area`, `area.mid`, `area.pial`, or `volume` is specified, `--jac`
> is automatically turned on unless `--no-jac` was explicitly set. This is
> silent and easy to miss. For non-area measures (thickness, curvature), Jacobian
> correction is inappropriate.

> [!gotcha] `--label` forces nearest-neighbour mapping
> `--label` silently sets `mapmethod = "--mapmethod nnf"` in `mri_surf2surf`.
> This is correct for categorical/label data but may surprise users expecting
> the default nnfr (nearest-neighbour forward-reverse) mapping.

> [!gotcha] Output format determines reshape behaviour
> If the output file extension is detected as ANALYZE or NIfTI, `reshape` is
> automatically set to 1 and an INFO message is printed. For [[mgz]] / MGH
> output, reshaping is off by default.

> [!gotcha] Non-fsaverage `--target` changes `SrcSurfReg`
> If `--target` does not start with `fsaverage`, the source registration
> surface is overridden to `$target.sphere.reg` from the default `sphere.reg`.
> The target subject must have a file named `$hemi.<target>.sphere.reg` in each
> subject's `surf/` directory.

> [!gotcha] Internal format default is `.mgh`, not `.mgz`
> Per-subject intermediate files use `.mgh` format (no compression) unless
> `--mgz` is specified. For large datasets, `--mgz` saves disk space.

> [!gotcha] `--measdir` defaults to `--surfdir` value
> If `--measdir` is not set, it defaults to `--surfdir` (which defaults to
> `surf`). This means `--surfdir dtrans` also changes where `--meas` looks for
> files.

> [!gotcha] `.mgz` extension fallback for `--meas`
> If `$subj/surf/$hemi.$meas` is not found, the script looks for
> `$hemi.$meas.mgz` (MGZ extension). No warning is printed when the fallback is
> used. This can mask missing files.

> [!gotcha] Pruning enabled by default for aggregation operations
> `--paired-diff*`, `--mean`, and `--std` all automatically pass `--prune` to
> [[mri_concat]]. Vertices that are zero in any subject are zeroed in the output.
> Use `--no-prune` to disable if zeros are meaningful data.

## Typical Use Cases

### Group analysis of cortical thickness

```bash
mris_preproc \
  --f subjects.txt \
  --hemi lh \
  --meas thickness \
  --fwhm 10 \
  --target fsaverage \
  --o lh.thickness.10B.mgh
```

### Group analysis of fMRI contrast

```bash
mris_preproc \
  --f subjects.txt \
  --hemi lh \
  --iv /path/to/subject1/stat.mgz /path/to/subject1/register.dat \
  --iv /path/to/subject2/stat.mgz /path/to/subject2/register.dat \
  --projfrac-max 0 1 0.1 \
  --fwhm 5 \
  --target fsaverage \
  --o lh.fmri.mgh
```

### Cache to speed up repeated runs

```bash
# First pass: cache the resampled data
mris_preproc \
  --f subjects.txt \
  --hemi lh --meas thickness \
  --target fsaverage \
  --cache-out thickness.fsaverage \
  --cache-out-only /tmp/preproc_cache

# Subsequent runs: read from cache (skip mri_surf2surf calls)
mris_preproc \
  --f subjects.txt \
  --hemi lh \
  --cache-in thickness.fsaverage \
  --fwhm 10 \
  --o lh.thickness.10B.mgh
```

### Paired longitudinal difference

```bash
mris_preproc \
  --s subj1_tp1 --s subj1_tp2 \
  --s subj2_tp1 --s subj2_tp2 \
  --hemi lh --meas thickness \
  --target fsaverage \
  --paired-diff \
  --o lh.thickness.paired-diff.mgh
```

## Pipeline Context

Not called by `recon-all`. Called as the first step of group-level surface
analysis, after all subjects have completed `autorecon3`.

**Predecessor:** [[mris_anatomical_stats]] / [[mri_vol2surf]] (per-subject) →
**This tool** → `mri_glmfit` (group GLM)

## Gotchas and Caveats

> [!gotcha] `--nocleanup` case duplicated in source (minor bug)
> The `case "--nocleanup"` appears twice in `parse_args` with identical content.
> This is a benign code defect with no functional consequence.

> [!gotcha] `--cache-out-update` requires a tmpdir argument
> Despite looking like a simple flag, `--cache-out-update` requires a tmpdir
> path as its argument. This is not obvious from the flag name.

> [!gotcha] `--xhemi` subject ordering affects paired-diff
> `--xhemi` expands each subject into `[subj, subj/xhemi]` (lh) or
> `[subj/xhemi, subj]` (rh). The ordering affects which is "Input1" and
> which is "Input2" in paired-difference operations.

## Related Tools

- [[mri_vol2surf]] — called internally for volume-input subjects
- [[mri_surf2vol]] — the surface-to-volume inverse (not used by mris_preproc)
- [[mri_concat]] — called internally to concatenate resampled files
- `mri_surf2surf` — resampling between subject and target surfaces
- `mri_glmfit` — group GLM; consumes the output of mris_preproc
- [[mris_anatomical_stats]] — produces the per-subject `.stats` files;
  surface measures (thickness, area) come from the curvature/overlay files
  written during autorecon3

## Confidence and Gaps

High confidence on all flags, per-subject loop logic, and external program
calls — derived from the full tcsh script.

> [!gap] `mri_surf2surf` nnfr/nnf resampling internals
> The actual algorithm used by `mri_surf2surf` for resampling between subject
> and atlas surfaces (nearest-neighbour forward-reverse = nnfr, or forward-only
> = nnf) is not documented here.

> [!gap] FS-FAST integration
> The `--sf`, `--df`, `--analysis`, `--contrast`, `--map` flags integrate with
> the FS-FAST analysis pipeline. The session file format and the stem-based
> contrast directory structure are not documented here.
