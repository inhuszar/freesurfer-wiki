---
title: "talairach_avi"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "talairach_avi/talairach_avi"
  - "talairach_avi/mpr2mni305"
  - "talairach_avi/talairach_avi.help.xml"
  - "talairach_avi/imgreg_4dfp.c"
  - "talairach_avi/compute_vox2vox.c"
  - "talairach_avi/analyzeto4dfp.c"
  - "talairach_avi/gauss_4dfp.c"
  - "talairach_avi/avi2talxfm"
families:
  - "talairach_*"
recon_all_stage: "autorecon1"
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_em_register]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_nu_correct.mni]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact mode-number semantics of imgreg_4dfp (modes[1..6]) not documented here; they are magic-number parameters to Avi Snyder's Fortran/C registration code"
  - "What 'orientation 2' means in a .4dfp.ifh header is not derived here — the script errors out if it sees anything else"
  - "Behaviour of the -schwartzya3t-atlas variant vs. 711-2C default has not been benchmarked"
tags:
  - registration
  - talairach
  - mni305
  - 4dfp
  - wrapper
---

# talairach_avi

## Summary

`talairach_avi` is a tcsh wrapper around Avi Snyder's `4dfp` image
registration toolchain (`mpr2mni305`, `imgreg_4dfp`, `compute_vox2vox`,
`avi2talxfm`). Given a T1-weighted structural MRI volume, it
computes a 12-parameter affine transform that aligns the subject to
an MNI-average-305 reference atlas and writes it as a FreeSurfer
`.xfm` file, together with an equivalent `.lta` for convenience.
This is the tool [[wiki/pipelines/recon-all|recon-all]] uses by default to produce
`transforms/talairach.auto.xfm` (and, after copying,
`transforms/talairach.xfm`), which serves as the coarse Talairach
alignment for the rest of the pipeline — in particular, it is the
xform consumed by `mri_make_uchar` (via [[mri_nu_correct.mni]] `--uchar`)
to centre the white-matter intensity histogram at 110.

Despite the name, `talairach_avi` does **not** produce "Talairach
coordinates" in the Talairach-and-Tournoux sense. The output is an
affine to **MNI305** (FreeSurfer's historical "Talairach" reference
volume); to obtain true Talairach coordinates a non-linear Brett
transform is applied afterwards by downstream tools. See the
[[coordinate-systems]] concept page for the full disentangling.

## Source Information

- **Language:** tcsh script (wrapper) + C + Fortran (the `4dfp`
  registration engine).
- **Source file(s):**
  - `talairach_avi/talairach_avi` (253 lines) — the user-facing
    wrapper. Parses the `--i`, `--xfm`, `--atlas`, `--log`,
    `--debug` flags; converts the input to ANALYZE with
    [[wiki/tools/mri_convert|mri_convert]]; invokes `mpr2mni305`; converts the resulting
    `4dfp` t4 file to an xfm via `avi2talxfm`; and writes the LTA
    via `lta_convert`.
  - `talairach_avi/mpr2mni305` (216 lines) — the second-level
    wrapper that actually runs the `4dfp` registration pipeline:
    `analyzeto4dfp -O0 -y` → `gauss_4dfp 1.1` → six passes of
    `imgreg_4dfp` with pre-set mode numbers → `compute_vox2vox`.
  - `talairach_avi/talairach_avi.help.xml` — XML help.
  - `talairach_avi/imgreg_4dfp.c`, `compute_vox2vox.c`,
    `analyzeto4dfp.c`, `gauss_4dfp.c`, `t4imgs_4dfp.c`, `t4_sub.f`,
    `ft4imgn.f`, `to_711-2B.f`, `imgvalm.f`, `imgvalx.f`,
    `spline3dvgh.f`, `eigen.f`, `fimgreg.f`, `polfit.f`,
    `param6opr.f` — the Fortran/C registration engine.
  - `talairach_avi/avi2talxfm` — shell script that converts the
    `4dfp` t4 (voxel-to-voxel) file into a FreeSurfer `.xfm`.
  - `talairach_avi/711-2C_as_mni_average_305.4dfp.*` — the default
    target atlas.
  - `talairach_avi/3T18yoSchwartzReactN32_as_orig.4dfp.*` — the
    young-adult 3 T atlas (`--atlas 3T18yoSchwartzReactN32_as_orig`).
- **Binary/script location:** `$FREESURFER_HOME/bin/talairach_avi`
- **External reference data:** expects `$REFDIR` (set to
  `$FREESURFER_HOME/average`) to contain the target
  `${MPR2MNI305_TARGET}.4dfp.*` files and the mask
  `711-2B_as_mni_average_305_mask.4dfp.*`.

## Purpose and Context

Early in autorecon1, [[wiki/pipelines/recon-all|recon-all]] needs a coarse linear transform
from the subject to an MNI-average-305 reference for two reasons:

1. **NU histogram centring**: the second call to
   [[mri_nu_correct.mni]] uses the `--uchar <talxfm>` flag to run
   `mri_make_uchar`, which uses the Talairach transform to locate a
   "ball of mostly-brain voxels" and rescale the WM peak of the
   intensity histogram to ~110.
2. **Downstream seeding**: several later tools (`mri_fill`,
   [[mri_em_register]], `mri_ca_register`) use the coarse
   Talairach as an initial condition or as a bounding-box prior.

`talairach_avi` is the default way to compute this coarse alignment.
It is fast (~1 minute on a typical 1 mm T1), robust, and requires
only the bias-field-corrected `orig_nu.mgz`. Alternatives are
`talairach` (MINC's `mritotal`, enabled by `-use-mritotal`) and
`run_samseg --reg-only` (enabled by `-samseg-reg`), but these are
fallbacks rather than defaults.

Within `recon-all`, it is called from the `talairach:` block:

```bash
talairach_avi --i orig_nu.mgz --xfm transforms/talairach.auto.xfm
```

with optional `--atlas 3T18yoSchwartzReactN32_as_orig` (from
`-schwartzya3t-atlas`) or `--atlas <user_name>` (from
`-custom-tal-atlas`). See `scripts/recon-all:1811–1821`.

## Inputs

### Required Inputs

| Flag | Description |
|------|-------------|
| `--i <invol>` | Input MRI volume in any format readable by [[wiki/tools/mri_convert|mri_convert]]. Must be approximately T1-weighted for the registration engine to lock onto the correct contrast gradient. |
| `--xfm <outxfm>` | Output `.xfm` file path. The output directory is created if necessary. A companion `.xfm.lta` is also written. |

### Optional Inputs

| Flag | Default | Description |
|------|---------|-------------|
| `--atlas <name>` | `711-2C_as_mni_average_305` | Alternate target atlas file stem inside `$FREESURFER_HOME/average/`. Must be a `4dfp`-format atlas. Known alternatives: `3T18yoSchwartzReactN32_as_orig` (young-adult 3T, recommended by Avi Snyder since 2012) and various `SVIP_*` age/population-specific atlases. |
| `--log <logfile>` | `<outdir>/talairach_avi.log` | Log file. |
| `--debug` | off | Enable verbose tcsh (`set echo`) and turn on the `debug` pass in `mpr2mni305`, which writes a resampled `mpr_on_<target>.hdr` for visual QA. |
| `-h`<br>`-u`<br>`-usage`<br>`--usage`<br>`-help`<br>`--help` | — | Print help (via `fsPrintHelp`) and exit. |
| `--version` | — | Print the version and exit (also runs `mri_convert --version`). Detected before the main parser, so it works at any position. |

### Input Assumptions

- **T1 contrast**: the `imgreg_4dfp` modes are tuned for T1 data;
  T2 or FLAIR inputs will find degenerate optima.
- **Bias-corrected**: strong intensity non-uniformity confuses the
  gradient-based registration. `recon-all` always feeds
  `orig_nu.mgz` (from [[mri_nu_correct.mni]] `--no-rescale`) rather
  than `orig.mgz`.
- **ANALYZE-round-trippable**: the wrapper converts the input to
  ANALYZE via `mri_convert` ([line 76](https://github.com/freesurfer/freesurfer/blob/v8.2.0/talairach_avi/t4imgs_4dfp.c#L76)). ANALYZE cannot represent
  arbitrary direction cosines — the wrapper relies on the
  orientation being correctly re-interpreted by `analyzeto4dfp -O0
  -y` (which flips y to compensate for the ANALYZE↔4dfp
  convention mismatch).
- **4dfp orientation 2**: after `analyzeto4dfp`, the wrapper reads
  the `.4dfp.ifh` header and errors out with "wrong
  $mpr.4dfp.ifh orientation" unless the orientation flag is
  exactly `2` (transverse). Non-transverse volumes must be
  reoriented first with `mri_convert --in_orientation` /
  `--out_orientation`.

> [!assumption] The 4dfp toolchain wants transverse ANALYZE
> The two-step `mri_convert` → `analyzeto4dfp -O0 -y` conversion
> assumes the input is stored such that the resulting ANALYZE file
> is in transverse (axial) orientation. Anything else fails
> immediately at `mpr2mni305:112–115`.

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<outxfm>` | MNI `.xfm` (text, 4×4 RAS-to-RAS) | The affine transform from subject RAS to MNI305 RAS. The top of the file is an MNI XFM header (`MNI Transform File`, `Linear_Transform =`). |
| `<outxfm>.lta` | FreeSurfer `.lta` | Companion LTA produced via `lta_convert --src <invol> --trg $FREESURFER_HOME/average/mni305.cor.mgz --inxfm <outxfm> --outlta <outxfm>.lta --subject fsaverage`. |
| `<outdir>/talairach_avi.log` | text | Full log of the run. |
| `<outdir>/talsrcimg_to_<target>_t4_vox2vox.txt` | text (`4dfp` `t4` vox2vox) | The raw `4dfp` voxel-to-voxel registration matrix, moved to the output directory after `mpr2mni305`. Used by `avi2talxfm`. |

Intermediate files (`talsrcimg.img`/`.hdr`, `talsrcimg.4dfp.*`,
`talsrcimg_g11.4dfp.*`, `talsrcimg_to_<target>_t4`) are written to
the current working directory during the run and removed with
`rm -f talsrcimg*` at the end.

### Output Specifications

The `.xfm` output is in the standard MNI format:

```
MNI Transform File
% talairach_avi ...
Transform_Type = Linear;
Linear_Transform =
  <R11> <R12> <R13> <T1>
  <R21> <R22> <R23> <T2>
  <R31> <R32> <R33> <T3> ;
```

It is a **RAS-to-RAS** transform: given a point $(R,A,S)$ in the
subject's Scanner RAS, left-multiplying by the 3×4 matrix gives
the corresponding point in MNI305 RAS. This is the convention
FreeSurfer uses internally for `talairach.xfm`.

## Mathematical Foundations

### The `4dfp` affine registration engine

`imgreg_4dfp` is Avi Snyder's maximum-likelihood-ish affine
registration tool. It iteratively optimises a weighted sum-of-
squared-intensity-differences objective over a parametric affine
transform, using the Fortran subroutine `fimgreg` internally. The
exact objective is not documented here (see the MGH-archived
`RLB700_preprocessing_statistics.pdf` in the same directory), but
the high-level flow is:

1. Downsample the source volume by Gaussian smoothing
   (`gauss_4dfp $mpr 1.1` with σ = 1.1 mm).
2. For each of six registration modes (`modes[1..6]`), run
   `imgreg_4dfp` once. Each mode is a packed integer that encodes
   resolution level, degrees of freedom, optimisation weighting,
   and whether to use the target mask. The default modes are:
   ```
   modes[1] = 4096 + 256 + 3  # low-res  + mask + 3-DOF
   modes[2] = 4096 + 256 + 3
   modes[3] = 1024 + 256 + 3
   modes[4] = 3072 + 256 + 7  # mid-res  + mask + 7-DOF
   modes[5] = 2048 + 256 + 7
   modes[6] = 2048 + 256 + 7
   ```
   (from `mpr2mni305:44–49`). The `+256` bit enables mask usage;
   `crossmodal` subtracts 256 from every mode to disable it. The
   low bits (`3` or `7`) set the degrees of freedom.
3. After the six passes, `compute_vox2vox` turns the final
   per-pass `t4` matrix into a full `t4_vox2vox.txt` linear
   transform in voxel indices.
4. `avi2talxfm <input> <mni305.cor.mgz> <t4_vox2vox.txt> <outxfm>`
   converts the voxel-to-voxel transform to a RAS-to-RAS `.xfm`,
   accounting for the subject's and atlas's vox2ras matrices:
   $\mathbf{M}_\text{xfm} = \mathbf{S}_\text{atlas}\,\mathbf{M}_\text{vox2vox}\,\mathbf{S}_\text{subject}^{-1}$.

> [!math] Why the six-pass schedule?
> The modes implement a coarse-to-fine schedule: the first three
> passes use 3-DOF (translation only) at progressively higher
> resolutions, and the last three use 7-DOF (rigid + isotropic
> scale) refining the translation from the previous step. The
> final affine is produced by `compute_vox2vox` which
> recomposes the per-pass matrices and extends them to 9 or 12
> degrees of freedom depending on the atlas definition.
>
> The explicit mode numbers are hand-tuned and have been stable
> for over a decade; they should not be changed without
> benchmarking.

### Output conversion (`avi2talxfm`)

`avi2talxfm` is a short tcsh script that runs a compiled helper
to compose

$$
\mathbf{M}_\text{xfm}^{\text{RAS}\to\text{RAS}} = \mathbf{S}_\text{mni305}\,\mathbf{M}_{t4}^{\text{vox}\to\text{vox}}\,\mathbf{S}_\text{subject}^{-1},
$$

where $\mathbf{S}$ denotes the vox2ras matrix. The resulting
matrix is written in MNI `.xfm` text format.

### LTA conversion

At the end, the wrapper writes an LTA companion file:

```bash
lta_convert --src <invol> \
            --trg $FREESURFER_HOME/average/mni305.cor.mgz \
            --inxfm <outxfm> \
            --outlta <outxfm>.lta \
            --subject fsaverage
```

The `--subject fsaverage` field embeds the target subject name in
the LTA so that downstream tools (e.g. `mri_vol2vol --reg`) can
resolve it without an explicit `--targ`.

## Configuration Options

### Complete Flag Reference (wrapper)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <invol>` | path (one arg) | required | Input MRI volume in any format readable by [[wiki/tools/mri_convert|mri_convert]]. The script verifies the file exists in `check_params` and aborts otherwise. |
| `--xfm <outxfm>` | path (one arg) | required | Output `.xfm` path. The parent directory is created on demand by `mkdir -p`. The companion `<outxfm>.lta` is written to the same directory. |
| `--x <outxfm>` | path (one arg) | required | Undocumented short alias for `--xfm` (same case branch in the parser at `talairach_avi:163–167`). |
| `--atlas <name>` | string (one arg) | `711-2C_as_mni_average_305` | Target atlas stem (no extension). Sets `MPR2MNI305_TARGET`. Must exist as `$FREESURFER_HOME/average/<name>.4dfp.{img,ifh,hdr}`. |
| `--log <logfile>` | path (one arg) | `<outdir>/talairach_avi.log` | Path to the log file. If the file already exists, it is renamed to `<logfile>.bak` before the new run begins (`talairach_avi:65`). |
| `--debug` | switch (no arg) | off | Sets `verbose = 1`, `echo = 1` (tcsh `set echo` — every expanded command is printed to stderr) and `debug = 1`. The `debug = 1` flag in turn appends the literal word `debug` to the `mpr2mni305` invocation, which writes a resampled `mpr_on_<target>.4dfp.*` volume for visual QA. |
| `-h`<br>`-u`<br>`-usage`<br>`--usage`<br>`-help`<br>`--help` | switch | — | All six spellings are handled by the same case branch and call `fsPrintHelp talairach_avi` (the XML help renderer), then `exit 1`. |
| `--version` | switch | — | Detected by an `egrep --version` over `argv` *before* the parse loop runs (`talairach_avi:41–47`), so it works at any position and short-circuits even invalid command lines. Prints `talairach_avi @FS_VERSION@` plus `mri_convert --version` output and exits `0`. |

Any other flag triggers the parser's `default:` branch, which prints `ERROR: flag <flag> not recognized` and exits `1` (`talairach_avi:185–188`). Required-argument flags (`--i`, `--xfm`/`--x`, `--atlas`, `--log`) print `ERROR: flag <flag> requires one argument` and exit `1` if no value follows.

### `mpr2mni305` hidden modes

`mpr2mni305` accepts positional "mode words" that slightly alter
its behaviour, but `talairach_avi` never passes them — only
`--debug` maps to the mode word `debug`. The recognised mode
words (`mpr2mni305:58–68`) are:

| Word | Effect |
|------|--------|
| `setecho` | `set echo` for the inner script (equivalent to `--debug`). |
| `crossmodal` | Subtract 256 from every mode, disabling the use of the target mask. For cross-modal (e.g. T2→T1) registrations. |
| `debug` | Write a resampled source volume in target space. |
| `useold` | Reuse an existing `t4file` from a previous run. |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `REFDIR` | Directory containing the `.4dfp.*` atlas files. Set to `${FREESURFER_HOME}/average` by `talairach_avi:84`. |
| `MPR2MNI305_TARGET` | Atlas stem to register against. Set to the `--atlas` argument or the default `711-2C_as_mni_average_305` by `talairach_avi:85`. |

## Configuration Interactions

The wrapper has very few flags and almost no internal interactions:

- `--xfm` and `--x` are the **same** flag (sibling case labels). Only the last `--xfm`/`--x` value on the command line wins.
- `--atlas` is independent of every other flag — it merely sets `MPR2MNI305_TARGET`. There is no validation that the named atlas exists; the failure surfaces inside `mpr2mni305`.
- `--debug` is purely additive: it does not change the registration result, only what is printed and what extra files are produced. It can be combined with any other flag.
- `--log` only affects logging destination; it has no effect on the registration. If `--log` is omitted the default `<outdir>/talairach_avi.log` is used (computed *after* `--xfm` is resolved, so `--log` need not be specified after `--xfm`).
- `--version` is parsed *before* the regular parser and exits immediately, so it overrides every other flag and bypasses argument validation entirely.
- The help flags (`-h`, `-u`, `-usage`, `--usage`, `-help`, `--help`) all exit with status `1` after printing help, regardless of the rest of the command line.

> [!gotcha] The `--xfm` argument is an **output** path, not an
> existing file
> This trips people up because elsewhere in FreeSurfer `--xfm` is
> often the name of an input transform. Here it is the output
> file path.

> [!gotcha] Input orientation must resolve to 4dfp orientation 2
> (transverse)
> The wrapper errors out with
> `"ERROR: wrong $mpr.4dfp.ifh orientation"` if `analyzeto4dfp
> -O0 -y` does not produce an axial layout. For data whose
> orientation string is not `RAS`/`LAS`/etc. but is still valid,
> run `mri_convert --out_orientation LIA` (or the appropriate
> conformed orientation) before calling `talairach_avi`.

> [!gotcha] The atlas must be 4dfp, not MGZ
> The `--atlas` argument is a stem that must resolve to
> `$FREESURFER_HOME/average/<stem>.4dfp.img`. Passing an MGZ or
> NIfTI path will silently fail at `mpr2mni305:75–77`.

> [!gotcha] The script depends on `$FREESURFER_HOME/sources.csh`
> Line 49 sources `$FREESURFER_HOME/sources.csh`. Without a
> sourced FreeSurfer environment, tools like `analyzeto4dfp`,
> `imgreg_4dfp`, `compute_vox2vox`, `gauss_4dfp`, `avi2talxfm`
> will not be on `PATH` and the wrapper exits with a `command
> not found` error.

> [!gotcha] The CWD is polluted with intermediate files
> `mpr2mni305` writes `talsrcimg*` files to the current working
> directory, *not* `tmpdir`. The wrapper then `mv`s the
> `t4_vox2vox.txt` file into the output directory at the end
> ([line 110](https://github.com/freesurfer/freesurfer/blob/v8.2.0/talairach_avi/t4imgs_4dfp.c#L110)) and `rm -f talsrcimg*` at line 127. If the run
> crashes, these files remain in the CWD. Ensure you run
> `talairach_avi` from a disposable working directory, not from
> a shared one.

> [!gotcha] The `.xfm.lta` companion is written even if the
> `.xfm` fails to be written
> If `avi2talxfm` fails, the wrapper errors out without
> writing the LTA. But if the `.xfm` is successfully written
> and the `lta_convert` call fails (e.g. because `mni305.cor.mgz`
> is missing), the tool exits non-zero even though the `.xfm`
> is valid. Check the log to diagnose.

## Typical Use Cases

### Use Case 1: recon-all's default call

```bash
cd $SUBJECTS_DIR/<subj>/mri
talairach_avi --i orig_nu.mgz --xfm transforms/talairach.auto.xfm
```

Runs the default 711-2C atlas registration in ~1 min. `recon-all`
then `cp`s `talairach.auto.xfm` to `talairach.xfm`.

### Use Case 2: Young-adult 3 T atlas

```bash
talairach_avi --i orig_nu.mgz --xfm transforms/talairach.auto.xfm \
    --atlas 3T18yoSchwartzReactN32_as_orig
```

Enabled by `recon-all -schwartzya3t-atlas` (per Avi Snyder's
recommendation for 3 T data since 2012; see `mpr2mni305:15`).

### Use Case 3: Debug a bad alignment

```bash
talairach_avi --i orig_nu.mgz --xfm transforms/talairach.auto.xfm --debug
```

`--debug` enables `set echo` in both wrappers and triggers the
`mpr2mni305 debug` branch, which writes a resampled
`talsrcimg_on_<target>.hdr` that can be overlaid on the atlas
with `freeview` or `fsleyes`.

### Use Case 4: Align a second contrast (cross-modal)

```bash
# NOT in recon-all, but supported by the underlying mpr2mni305
talairach_avi --i t2.mgz --xfm transforms/t2_to_mni305.xfm \
    --atlas 711-2C_as_mni_average_305
```

Works — the 4dfp engine is intensity-agnostic — but the result
is generally inferior to a T1-based alignment because the tuned
mode numbers assume T1 contrast. For cross-modal alignments,
prefer `mri_coreg` or [[mri_em_register]] with `-t` initialisation
from a T1 Talairach.

## Pipeline Context

**Predecessor (in recon-all):** [[mri_nu_correct.mni]]
(`--no-rescale`, producing `orig_nu.mgz`).

**This tool** produces `transforms/talairach.auto.xfm` and
`transforms/talairach.auto.xfm.lta`.

**Successors (in recon-all):**
- `transforms/talairach.xfm` (a copy of `talairach.auto.xfm`)
  → [[mri_nu_correct.mni]] `--uchar`-mode (second pass,
  producing `nu.mgz`).
- `transforms/talairach.xfm.lta` (the LTA conversion) →
  [[mri_em_register]] as an optional `-t` initialisation.
- `talairach.xfm` → stamped into the header of `orig.mgz` (by
  `mri_add_xform_to_header`) and `nu.mgz` for downstream
  provenance.
- `talairach_afd` (the Atlas Fit Detector QA check invoked by
  `-tal-check`).

**Not a successor**: `mri_ca_normalize`, `mri_ca_register`,
`mri_ca_label` do *not* directly consume `talairach.xfm`. They
use `transforms/talairach.lta` produced by
[[mri_em_register]], which in turn is computed starting from
`nu.mgz` (which was centred using `talairach.xfm` from this
tool). The dependency is indirect.

## Error Compensation and Guard Rails

- **Missing atlas**: errors out with an explicit `.4dfp.img`-not-
  found message before trying to run anything.
- **Wrong orientation**: errors out at the orientation check in
  `mpr2mni305:112–115`.
- **Missing FreeSurfer environment**: `sources.csh` is sourced
  unconditionally; if `FREESURFER_HOME` is not set, the script
  will either fail to source or produce a cascade of
  command-not-found errors.
- **QA retry loop** (delegated to `recon-all`): `talairach_afd`
  computes a z-score against Buckner-40 reference transforms and
  triggers an automatic retry with the 3T atlas or a fallback to
  MINC `mritotal` if the z-score is below the threshold. See
  `scripts/recon-all:1892–2016`.

## Related Tools

- [[rca-talairach]] — the SynthMorph-based recon-all Talairach
  component script that **replaces** `talairach_avi` when
  FreeSurfer's SynthMorph path is enabled; it produces the same
  `talairach.xfm`/`talairach.xfm.lta` outputs by a learned affine
  registration instead of the 4dfp engine.
- [[avi2talxfm]] — the helper script invoked at the end of the
  `4dfp` pipeline to convert the `t4` vox2vox matrix into the
  MNI-style RAS-to-RAS `.xfm`.
- [[mri_em_register]] — the GCA-based successor affine
  registration, which consumes (optionally) `talairach.xfm.lta`
  as its initial condition.
- [[mri_nu_correct.mni]] — both the predecessor (produces
  `orig_nu.mgz`) and the successor (uses `talairach.xfm` via
  `mri_make_uchar`).
- `talairach_afd` — runs the Atlas Fit Detector QA check on
  `talairach.xfm`.
- `lta_convert` — the tool invoked at the end of
  `talairach_avi` to write the companion `.xfm.lta`.
- [[wiki/tools/mri_convert|mri_convert]] — called internally to convert MGZ to ANALYZE
  (via `analyzeto4dfp`).
- `mri_coreg` — modern FreeSurfer native affine registration
  tool, a potential replacement for `talairach_avi` but not the
  default in [[wiki/pipelines/recon-all|recon-all]].
- `run_samseg --reg-only` — SAMSEG-based Talairach alignment
  fallback, enabled by `recon-all -samseg-reg`.
- [[coordinate-systems]] — explains why FreeSurfer's "Talairach"
  is actually MNI305 plus an optional Brett transform.

## Confidence and Gaps

- **High confidence**: the wrapper scripts (`talairach_avi` and
  `mpr2mni305`), the ANALYZE conversion, the six-pass schedule,
  the atlas file layout, the error paths, and the role in
  `recon-all`.
- **Medium confidence**: the meaning of the individual mode
  numbers and their degrees-of-freedom bits. The `+256` bit is
  clearly the "use mask" flag; the `+4096`, `+3072`, `+2048`,
  `+1024` bits are resolution-level flags; `+3` and `+7` are
  DOF flags. Exact semantics come from `imgreg_4dfp.c` and the
  Fortran `fimgreg`/`t4_sub.f` routines and have not been traced.
- **Low confidence**: the exact numerical objective used by
  `imgreg_4dfp`. It is a sum-of-squared-intensity-differences
  variant, but whether it uses normalised cross-correlation or a
  plain SSD is not obvious from the source layout.

> [!gap] Mode-number semantics
> A dedicated internal page documenting the exact bit-flags of
> `imgreg_4dfp` modes and their effects would make it possible to
> reason about custom mode numbers. Until then, treat the default
> schedule as a black box.

> [!gap] Behaviour on 3 T vs. 1.5 T data
> Avi Snyder's 2012 recommendation (see comment at
> `talairach_avi:35`) is to use the `3T18yoSchwartz` atlas for 3 T
> scans, but `recon-all`'s default remains `711-2C`. The practical
> difference (success rate, failure modes) has not been
> benchmarked on recent data.

## References

- Source: `$FREESURFER_SOURCE/talairach_avi/*` (FreeSurfer 8.2.0)
- Original author: Avi Snyder, Washington University. The 4dfp
  suite is described at
  <https://4dfp.readthedocs.io/> (accessed 2026-04-14)
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/talairach_avi>
  (accessed 2026-04-14)
- Preprocessing statistics and atlas construction notes live in
  `talairach_avi/RLB700_preprocessing_statistics.pdf` inside the
  FreeSurfer source tree.
