---
title: "reg-feat2anat"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/reg-feat2anat"
families: []                       # standalone FSFAST/FSL-Feat bridge script
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[fslregister]]"
  - "[[spmregister]]"
  - "[[tkregister2]]"
  - "[[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]]"
  - "[[feat2surf]]"
  - "[[aseg2feat]]"
  - "[[aparc2feat]]"
  - "[[lta_convert]]"
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --fslmat and --fsreg flags are parsed into variables ($fslmat/$fsreg) that are never read in the body — their intended effect is unclear (likely vestigial)."
  - "The --inorm/--no-inorm flags set a misspelled variable ($Inorm) while the body reads $INorm, so they have no effect (documented as a bug-like gotcha)."
tags:
  - registration
  - fsl
  - feat
  - fmri
  - fsfast
  - coordinate-systems
---

# reg-feat2anat

## Summary

`reg-feat2anat` computes the registration between an **FSL FEAT** functional
analysis and a subject's **FreeSurfer anatomical**. Given a completed `.feat`
directory and a FreeSurfer subject, it registers the FEAT `example_func` volume
(the representative functional EPI, "exf") to the subject's `brainmask` using
[[fslregister]] (FLIRT) followed by boundary-based refinement with
[[bbregister]], and writes a tkregister2-style registration file
`reg/freesurfer/anat2exf.register.dat`. That file is the bridge that lets
downstream FreeSurfer/FSFAST tools ([[feat2surf]], [[aseg2feat]],
[[aparc2feat]]) move FEAT statistical maps onto the surface or pull anatomical
segmentations into the functional space. It also rebuilds the
functional-to-standard and anatomical-to-standard transforms so that results can
equivalently be viewed in FSL standard (MNI152) space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/reg-feat2anat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat)
- **Binary/script location:** `$FREESURFER_HOME/bin/reg-feat2anat`
- **Original author:** Doug Greve
- **External tools invoked:** [`fslregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L260) (FLIRT wrapper), [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L273) (boundary-based refinement), [`spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L283) (with `--spm`), `tkregister2_cmdl` ([the command-line tkregister2](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L73), aliased `$TKR`), [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L77) (`$MM`), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L212) (`--ras_good`), and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L585).

## Purpose and Context

FSL's FEAT analyses live in their own `.feat` directory and produce statistics
(z-maps, COPEs) in the space of the functional run, with FSL-style `.mat`
transforms relating `example_func` → FSL standard space. FreeSurfer's
surface-based and anatomy-based analysis tools instead need a **tkregister2-style
register.dat** mapping the subject's anatomical to the functional volume.
`reg-feat2anat` is the bridge between these two worlds: it produces
`anat2exf.register.dat`, the one file the rest of the FreeSurfer FEAT toolchain
keys on.

It is run **by hand** after FEAT, once per FEAT directory. It is not part of
[[wiki/pipelines/recon-all|recon-all]]; rather it presupposes that recon-all has
already produced the subject's `brainmask.mgz` and surfaces, and that FEAT has
already registered the functional to standard space.

The registration is built in two halves and saved in both conventions:

1. **example_func → anatomical** (the primary goal), via an FSL FLIRT
   registration (`fslregister`) initialised from the headers, then refined with
   boundary-based registration ([[bbregister]]).
2. **anatomical ↔ standard** and **example_func ↔ standard**, reconstructed by
   composing the FEAT-supplied `example_func2standard.mat` with the new
   registrations so that the same data can be visualised in MNI152 standard
   space.

> [!gotcha] FEAT registration to standard must already exist
> The script aborts immediately if `reg/example_func2standard.mat` is missing
> ([`scripts/reg-feat2anat:84-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L84-L87)): "You must register to standard
> space first." FEAT normally writes this when registration is enabled in the
> FEAT GUI.

## Inputs

### Required Inputs

- **`--feat <dir>`** — a completed FSL FEAT directory. It must contain
  `example_func.{nii.gz,nii,img}` (the representative functional volume, format
  auto-detected) and `reg/example_func2standard.mat` (FEAT's
  functional→standard FSL transform). The FEAT `reg/standard.<ext>` is used as
  the standard-space reference.
- **`--subject <id>`** — a FreeSurfer subject in `$SUBJECTS_DIR` whose
  `mri/brainmask.mgz` (or a `--`-overridable anatomical) and surfaces exist.
  Not required in `--manual` mode, where the subject is recovered from the
  existing registration via [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L585).

### Input Assumptions

> [!assumption] EPI header geometry drives the initialisation
> The script first asks [`mri_info --ras_good`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L211-L216)
> whether `example_func` has a trustworthy vox→RAS geometry. NIfTI is assumed to
> always be "good"; ANALYZE is "good" only if a SPM-style `example_func.mat`
> sidecar exists. When the geometry is good, the initial anat↔exf matrix is
> built directly from the two headers with `--regheader` and the result is
> robust to radiological-vs-neurological convention (negative vs positive
> determinant). When it is **not** good, the script falls back to deriving a
> *crude* initial alignment by composing the FEAT exf→standard and a header-based
> standard→anat transform — this only guarantees the two volumes start in the
> same orientation, not that they are well aligned.

- The subject's anatomical defaults to `brainmask` (`mri/brainmask.mgz`), with a
  legacy fallback to a COR-format `mri/brainmask/` directory
  ([`scripts/reg-feat2anat:120-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L120-L127)).
- `$SUBJECTS_DIR` must be set and contain the subject.

## Outputs

### Files Created

All outputs are written under **`<featdir>/reg/freesurfer/`**
([directory created at](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L81)):

| File | Format | Contents |
|------|--------|----------|
| `anat2exf.register.dat` | tkregister2 `.dat` | **Primary product** — FreeSurfer registration from the anatomical to example_func. What all downstream FS tools read. |
| `register.dat` | tkregister2 `.dat` | Copy of `anat2exf.register.dat` ([`scripts/reg-feat2anat:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L309)). |
| `anat2exf.register.dat.init` | tkregister2 `.dat` | Header-based initial anat↔exf registration (good-geometry path). |
| `anat2exf.register.dat.bbr.init` | tkregister2 `.dat` | Copy of the pre-BBR registration, saved before [[bbregister]] refines it. |
| `exf2anat.init.fsl.mat` | FSL `.mat` | Initial FSL exf→anat matrix. |
| `exf2anat.fsl.mat` | FSL `.mat` | Final FSL exf→anat matrix (from `fslregister`). |
| `anat2std.register.dat` | tkregister2 `.dat` | FS registration anat→FSL-standard. |
| `std2anat.fsl.mat` | FSL `.mat` | FSL registration standard→anat. |
| `std2anat.fsl.mat.init` | FSL `.mat` | Crude initial std→anat (bad-geometry path only). |
| `exf2std.register.dat` | tkregister2 `.dat` | FS registration exf→standard. |
| `std2exf.register.dat` | tkregister2 `.dat` | FS registration standard→exf. |
| `example_func2standard.mat` | FSL `.mat` | FS-recomputed exf→standard (concatenation of exf→anat and anat→standard); can replace FEAT's own with `--overwrite-exf2std`. |
| `reg-feat2anat.log` | text | Full command log (previous log moved to `.bak`). |
| `tmp/exf-in-anat.<ext>` | NIfTI/ANALYZE | `fslregister` resampling of the EPI into anatomical space (deleted unless `--nocleanup`). |

With `--nocleanup`, an identity registration `tmp/exf-in-anat.fsreg.dat` is also
written so the resampled `exf-in-anat` volume can be inspected against the
surfaces.

> [!gotcha] `--overwrite-exf2std` edits the FEAT directory
> When `--overwrite-exf2std` is given, the script backs up FEAT's own
> `reg/example_func2standard.mat` to `…mat.bak` and **replaces** it with the
> FreeSurfer-recomputed version ([`scripts/reg-feat2anat:335-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L335-L338)). This is
> recommended when higher-level FEAT analyses will be done in surface space, but
> it does mutate FSL's registration.

### Output Specifications

The two registration conventions differ and are not interchangeable:

- **tkregister2 `.dat`** files encode a tkras→tkras (anatomical "tkreg/surface"
  RAS to functional tkreg RAS) 4×4 matrix plus the subject id and the in-plane
  resolution / slice thickness header. These are read by FreeSurfer tools.
- **FSL `.mat`** files encode FLIRT's voxel-scaled FSL coordinate transform.
  These are read by FSL tools.

Conversions between the two are performed throughout by `tkregister2_cmdl`
(`--fslregout`/`--fslreg`) and `mri_matrix_multiply -fsl`. See
[[coordinate-systems]] for the distinction between scanner RAS, tkreg RAS, and
FSL coordinates.

## Mathematical Foundations

The script itself does no fitting — all optimisation lives in the external
registration tools. Its arithmetic is pure 4×4 matrix composition, performed by
[[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]], whose convention is
`-im A -im B -iim C → A·B·C⁻¹` (an `-iim` operand is inverted before
multiplication).

> [!math] How the transforms are composed
> Writing $E_{\text{std}}$ for the FEAT `example_func2standard` matrix and
> $S_{\text{anat}}$ for standard→anat, the bad-geometry initialisation forms
> $$E_{\text{anat}}^{\text{init}} = E_{\text{std}} \cdot S_{\text{anat}}$$
> in FSL space ([`scripts/reg-feat2anat:249-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L249-L251), with `-bin` to
> binarise — see gotcha). The exf→standard register is later rebuilt by
> composing the new anat↔exf and anat↔standard registers
> ([`scripts/reg-feat2anat:323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L323), [`:340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L340)).

> [!gotcha] Why the initial composed matrix is binarised (`-bin`)
> The crude initial exf→anat matrix is built with `mri_matrix_multiply -fsl
> -bin`. The script comment explains: the standard registration is 12-DOF, which
> can introduce a stretch; binarising the rotation block prevents that stretch
> from leaking into what is supposed to be a 6-DOF (rigid) initialisation
> ([`scripts/reg-feat2anat:246-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L246-L251)).

> [!internal] The real registration math is in the helpers
> FLIRT's cost optimisation, [[bbregister]]'s boundary-based cost, and the
> tkras↔FSL coordinate algebra are implemented in those tools, not here. See
> [[fslregister]], [[bbregister]], and [[tkregister2]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/reg-feat2anat:416-543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L416-L543)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--feat`<br>`--featdir` | string | *(required)* | FSL FEAT directory containing `example_func` and `reg/example_func2standard.mat`. |
| `--subject`<br>`--s` | string | *(required, except `--manual`)* | FreeSurfer subject id in `$SUBJECTS_DIR`. |
| `--dof` | int | `6` | Degrees of freedom passed to FLIRT via `fslregister`. The functional→anatomical registration is rigid (6) by default. |
| `--bins` | int | `256` | Number of histogram bins passed to FLIRT. |
| `--cost` | string | `corratio` | FLIRT cost function (e.g. `corratio`, `mutualinfo`, `normmi`). |
| `--maxangle` | float (deg) | `90` | FLIRT maximum search angle; passed as the max for `-searchrx/-searchry/-searchrz`. |
| `--bbr`<br>`--segreg` | bool | **on** | Refine the FLIRT registration with boundary-based registration ([[bbregister]]). On by default. |
| `--no-bbr` | bool | — | Disable the [[bbregister]] refinement step (results "might not be as accurate"). |
| `--spm` | bool | off | Use [[spmregister]] (SPM) for the EPI→anat registration instead of FLIRT; 6-DOF only. |
| `--bet` | bool | off | Run `betfunc` brain extraction on `example_func` inside `fslregister`. Help warns: not with FSL 4.0. |
| `--no-bet` | bool | **on (no BET)** | Do not run `betfunc` (the default). |
| `--overwrite-exf2std` | bool | off | Replace FEAT's `reg/example_func2standard.mat` with the FS-recomputed one (originals backed up to `.bak`). Recommended for surface-space higher-level analysis. |
| `--manual` | bool | off | Interactively view/edit an existing registration in tkregister2 (equivalent to `--manxfm func2anat`). Requires a prior non-manual run. |
| `--manxfm` | `func2anat`\|`std2anat`\|`func2std` | `func2anat` | Which registration to view/edit interactively; implies `--manual`. |
| `--manual-no-surf` | bool | off | In manual mode, do not load the `orig` surface overlay in tkregister2. |
| `--fmov` | float | — | `--fmov` brightness value passed to tkregister2 in manual `func2anat` mode. |
| `--title` | string | — | Window title for the tkregister2 GUI (manual mode). |
| `--inorm` | bool | (see gotcha) | Intended to enable intensity normalisation in tkregister2; **no effect** (sets `$Inorm`, body reads `$INorm`). |
| `--no-inorm` | bool | (see gotcha) | Intended to disable intensity normalisation; **no effect** (same misspelling). |
| `--fslmat` | string | — | Parsed into `$fslmat` but never used in the body (likely vestigial). |
| `--fsreg` | string | — | Parsed into `$fsreg` but never used in the body (likely vestigial). |
| `--usedev` | bool | off | Use `$DEV/...` development builds of `tkregister2_cmdl`/`mri_matrix_multiply` instead of the ones on `$PATH`. |
| `--nocleanup` | bool | off (cleanup on) | Keep `reg/freesurfer/tmp/` and write an identity `exf-in-anat.fsreg.dat` for inspection. |
| `--debug` | bool | off | `set echo`/verbose; also keeps tkregister2 interactive (omits `--noedit`). |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `--manual` / `--manxfm` short-circuit the whole computation
> In any manual mode the script only **views/edits** an existing registration and
> then `exit 0`s ([`scripts/reg-feat2anat:130-178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L130-L178)). It never (re)computes a
> registration. You must therefore run **without** `--manual` first to create
> `anat2exf.register.dat`; otherwise manual mode errors with "you must run
> without --manual … to create registration first." `--manxfm` implies
> `--manual`.

> [!gotcha] `--spm` replaces FLIRT but BBR still runs
> `--spm` swaps the EPI→anat registration engine from `fslregister`/FLIRT to
> [[spmregister]], but the boundary-based refinement ([[bbregister]]) still runs
> afterwards if `--bbr` is on (the default), and an FSL `exf2anat.fsl.mat` is
> then synthesised from the result via `tkregister2_cmdl --fslregout`
> ([`scripts/reg-feat2anat:280-307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L280-L307)). The help notes the SPM path is
> 6-DOF only and "will probably only work on x32 machines."

> [!gotcha] `--bbr` requires `bbregister` on the PATH
> Because BBR is **on by default**, `check_params` verifies `bbregister` is on
> `$PATH` and aborts with installation guidance if not
> ([`scripts/reg-feat2anat:551-563`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L551-L563)). Pass `--no-bbr` to proceed without it
> (less accurate).

> [!gotcha] `--manxfm` value is validated
> `--manxfm` must be exactly `func2anat`, `std2anat`, or `func2std`; anything
> else is a hard error ([`scripts/reg-feat2anat:599-602`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L599-L602)).

> [!gotcha] `--inorm`/`--no-inorm` are no-ops (variable-name bug)
> The parser sets `$Inorm`, but the only consumer in the script is the variable
> `$INorm` (capital N), initialised to 1 at the top and never re-read. The flags
> therefore do nothing in this version. (See Confidence and Gaps.)

The default invocation (`--feat … --subject …` with nothing else) runs the full
auto pipeline: header/std init → `fslregister` (FLIRT, 6-DOF, corratio) →
`bbregister` refine → rebuild exf↔std and anat↔std → emit a copy-paste
tkregister2 check command.

## Typical Use Cases

### 1. Register a FEAT analysis to a FreeSurfer subject

```bash
# Standard case: FLIRT init + BBR refine, overwrite FEAT's exf2std too.
reg-feat2anat --feat fbert.feat --subject bert --overwrite-exf2std
```

Produces `fbert.feat/reg/freesurfer/anat2exf.register.dat`, the registration
that [[feat2surf]], [[aseg2feat]], and [[aparc2feat]] then consume.

### 2. Visually check the functional-to-anatomical registration

```bash
reg-feat2anat --feat fbert.feat --subject bert --manual
```

Opens tkregister2 with the `orig` surface overlaid on `example_func` so you can
inspect (and, if needed, edit) the alignment. Requires a prior non-manual run.

### 3. Diagnose a catastrophic failure

```bash
# If func2anat looks wrong, check whether FEAT's func->standard reg failed:
reg-feat2anat --feat fbert.feat --subject bert --manxfm func2std
```

### 4. Resample FEAT stats to the surface (downstream)

```bash
reg-feat2anat --feat fbert.feat --subject bert   # create the registration
feat2surf     --feat fbert.feat                  # then push stats to the surface
```

## Pipeline Context

`reg-feat2anat` is a stand-alone **FSFAST/FSL bridge**, not part of
[[wiki/pipelines/recon-all|recon-all]].

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (subject anatomy +
surfaces) and FSL **FEAT** (functional analysis with registration to standard) →
**reg-feat2anat** → **Successors:** [[feat2surf]] (FEAT stats onto the surface),
[[aseg2feat]] / [[aparc2feat]] (FreeSurfer segmentations into FEAT space), and
visualisation with `tkmedit`/`freeview` using `anat2exf.register.dat`. The
results can also feed [[mris_preproc]] / [[wiki/tools/mri_glmfit|mri_glmfit]] for
group surface analysis.

Internally it orchestrates [[fslregister]] (or [[spmregister]]), [[bbregister]],
`tkregister2_cmdl`, and [[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]].

**Predecessor:** FSL FEAT + [[wiki/pipelines/recon-all|recon-all]] →
**reg-feat2anat** → **Successor:** [[feat2surf]]

## Gotchas and Caveats

> [!gotcha] The product is `anat2exf`, not `exf2anat`
> Despite registering example_func *to* the anatomical, the canonical output is
> `anat2exf.register.dat` (anatomical→exf), which is the direction FreeSurfer
> overlay tools expect. The FSL-direction matrices (`exf2anat.fsl.mat`) are the
> inverse convention. The help spells out the full file inventory and notes
> "anat2exf.register.dat is the final product."

> [!gotcha] `register.dat` is just a copy
> `reg/freesurfer/register.dat` is byte-identical to `anat2exf.register.dat`
> ([`scripts/reg-feat2anat:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L309)); it exists for tools that look for a file
> literally named `register.dat`.

> [!gotcha] Standard-space reconstruction can reuse a precomputed anat→MNI152
> When rebuilding the anat→standard registration, the script first looks for
> `mri/transforms/reg.mni152.2mm.dat`; if present it is copied rather than
> recomputed, otherwise a fresh 12-DOF `fslregister` to standard is run
> ([`scripts/reg-feat2anat:312-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L312-L318)).

> [!gotcha] `--debug` leaves tkregister2 interactive
> Several internal `tkregister2_cmdl` calls add `--noedit` only when **not** in
> debug mode; `--debug` therefore pops up interactive windows mid-pipeline
> instead of running headless.

## Error Compensation and Guard Rails

- **Header-trust gate.** `mri_info --ras_good` decides whether to trust the EPI
  geometry; an untrustworthy header triggers the crude standard-space
  initialisation rather than failing
  ([`scripts/reg-feat2anat:203-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L203-L255)).
- **Radiological/neurological agnostic.** With good geometry, the header-based
  init works regardless of determinant sign (the help calls this out
  explicitly).
- **Stretch suppression.** The `-bin` binarisation prevents a 12-DOF stretch
  from contaminating the 6-DOF rigid initialisation.
- **Anatomical fallback.** If `brainmask.mgz` is absent, a legacy COR-format
  `brainmask/` directory is accepted
  ([`scripts/reg-feat2anat:120-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L120-L127)).
- **Hard prerequisites.** Missing FEAT exf→standard, missing FEAT dir, missing
  subject, or (with default BBR) missing `bbregister` each abort with a specific
  message.
- **Log rotation.** An existing `reg-feat2anat.log` is moved to `.bak` so each
  run keeps the previous log.

## Known Bugs

- [[00165]] — `--inorm`/`--no-inorm` set `$Inorm` but the body reads/declares `$INorm` (and hard-codes `--inorm`), so the flag is a no-op; `--fslmat`/`--fsreg` are parsed but never used.

## Related Tools

- [[fslregister]] — FLIRT wrapper that does the actual EPI→anatomical registration; `reg-feat2anat`'s main engine.
- [[bbregister]] — boundary-based registration; refines the FLIRT result (default on).
- [[spmregister]] — SPM-based alternative to `fslregister` selected with `--spm`.
- [[tkregister2]] — the `tkregister2_cmdl` engine used for all header inits, FSL↔tkras conversions, and manual inspection.
- [[wiki/tools/mri_matrix_multiply|mri_matrix_multiply]] — composes the 4×4 FSL/tkras matrices (`-im`/`-iim`/`-fsl`/`-bin`).
- [[feat2surf]] — primary downstream consumer; resamples FEAT stats to the surface using `anat2exf.register.dat`.
- [[aseg2feat]], [[aparc2feat]] — pull FreeSurfer `aseg`/`aparc` segmentations into FEAT space using the same registration.
- [[lta_convert]] — converts between registration/transform formats (`.dat`, `.lta`, FSL `.mat`, `.xfm`); useful for interoperating with the files this script emits.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the two-half computation
(exf→anat then anat/exf↔std), the good-vs-bad geometry branch, the default-on
BBR with its PATH check, the manual-mode short-circuit, the output file
inventory, and the `mri_matrix_multiply` composition convention — all read
directly from [`scripts/reg-feat2anat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat).

> [!gap] `--inorm`/`--no-inorm` appear to be dead flags
> The parser writes `$Inorm` while the body initialises and (nowhere) reads
> `$INorm`. As written these flags have no effect in v8.2.0. Whether this is an
> intentional deprecation or a typo bug needs developer confirmation.

> [!gap] `--fslmat` / `--fsreg` are parsed but unused
> Both flags store into variables (`$fslmat`, `$fsreg`) that the script body
> never references. They look vestigial; their original intent is unclear.

## References

- FreeSurfer source: [`scripts/reg-feat2anat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat) (v8.2.0).
- Built-in help: `reg-feat2anat --help` (the `BEGINHELP` block, [`scripts/reg-feat2anat:654-772`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L654-L772)).
- FSL FEAT and FLIRT documentation (external) for the meaning of `example_func`, `example_func2standard.mat`, and the FSL `.mat` coordinate convention.
