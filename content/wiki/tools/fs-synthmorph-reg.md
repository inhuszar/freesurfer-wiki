---
title: "fs-synthmorph-reg"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "mri_synthmorph/fs-synthmorph-reg"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[mri_synthmorph]]"
  - "[[mri_synthstrip]]"
  - "[[mri_warp_convert]]"
  - "[[lta_convert]]"
  - "[[mri_concatenate_lta]]"
  - "[[mri_vol2vol]]"
  - "[[mri_ca_register]]"
  - "[[mris_apply_reg]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The ANTs (--ants) path and its --cbig variant reference shell variables ($fixed, $moving) that are not set in this script, so that branch as written looks incomplete; documented as present but its correctness is uncertain. The default (SynthMorph) path is the supported one."
tags:
  - registration
  - synthmorph
  - mni152
  - warp
  - deep-learning
---

# fs-synthmorph-reg

## Summary

`fs-synthmorph-reg` is a tcsh front-end around [[mri_synthmorph]] for
producing a **nonlinear deformation (warp) that registers an input volume to a
target**, most commonly the **MNI152** template. It orchestrates the whole
chain — optional skull-stripping, cropping for speed, affine then deformable
SynthMorph registration, conversion of the result into a FreeSurfer warp
(`.m3z`/`.nii.gz`), and computation of the inverse warp — and manages all the
intermediate transforms so the user only ever deals with the original
(uncropped) spaces. An alternative ANTs back-end is selectable with `--ants`.

## Source Information

- **Language:** tcsh
- **Source file(s):** [`mri_synthmorph/fs-synthmorph-reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs-synthmorph-reg`
- **Memory note (from usage):** typical usage < 15 GB; affine-only < 7 GB; the
  banner labels it "(24GB)"
  ([`mri_synthmorph/fs-synthmorph-reg:874`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L874), [`:907-909`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L907-L909)).

## Purpose and Context

[[mri_synthmorph]] is a contrast-agnostic, learning-based registration tool.
Running it well for a standard task (e.g. "warp this brain to MNI152") requires
several supporting steps: getting a skull-stripped, cropped pair of volumes,
running affine and then deformable registration, and turning SynthMorph's
output into a warp that FreeSurfer tools (`mri_convert -at`, `mri_vol2vol
--gcam`, `mris_apply_reg --warp`) can apply — including keeping track of the
cropping so every transform refers back to the full field of view.
`fs-synthmorph-reg` wraps all of that into one command and ships the MNI152
target (and its skull-stripped, cropped, pre-registered variants) so MNI
registration needs no target volume at all.

## Inputs

### Required Inputs

You must give the input volume (directly or via a FreeSurfer subject) and an
output location; the target defaults to MNI152.

| Input | Flag | Notes |
|------|------|------|
| Input volume | `--i invol` | any volume SynthMorph can read; resolved to an absolute path and checked for existence ([`:520-528`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L520-L528)) |
| **or** FreeSurfer subject | `--s subject` | uses `mri/norm.mgz` (already skull-stripped) as the input and a default output dir under the subject's `transforms/` ([`:770-787`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L770-L787)) |
| Output dir | `--o outdir` | required if not derivable from `--s`/`--warp` ([`:799-802`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L799-L802)) |
| Target | `--t targetvol` | optional; **omit to register to MNI152** (the default `MNITarget=1`) ([`:530-540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L530-L540)) |

### Input Assumptions

> [!assumption] MNI target is built in
> When no `--t` is given, the script registers to MNI152, using a
> pre-stripped, pre-cropped target shipped at
> `$FSMNI152DIR/reg-targets/` (default
> `$FREESURFER/average/mni_icbm152_nlin_asym_09c`,
> [`:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L7)).
> Supplying **both** `--t` and an MNI target is an error
> ([`:833-836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L833-L836)).

> [!assumption] Stripping recommended, automatic for MNI / subjects
> SynthMorph is robust to skull presence, but the BEGINHELP recommends
> stripping. The MNI target is already stripped; a FreeSurfer subject's
> `norm.mgz` is already stripped; otherwise add `--strip`
> ([`:933-941`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L933-L941)).

> [!gotcha] Warping surfaces requires a conformed/subject input
> To apply the resulting warp to surfaces (`mris_apply_reg --warp` with the
> `.inv` warp), the warp must have been built from a FreeSurfer-conformed space
> — i.e. via `--s` or by passing a conformed volume
> ([`:924-927`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L924-L927)).

## Outputs

Default output filenames depend on whether the target is MNI152 (set in
`check_params`,
[`:816-825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L816-L825)):

| File (under `outdir/`) | Created when | Contents |
|---|---|---|
| `warp.to.mni152.<targres>.<outres>.nii.gz` | MNI target | nonlinear warp input→MNI152 |
| `warp.to.mni152.<targres>.<outres>.inv.nii.gz` | MNI + `--inv` (default) | inverse warp (MNI152→input) |
| `warp.nii.gz` / `warp.inv.nii.gz` | arbitrary `--t` target | warp / inverse warp |
| `aff.lta` | SynthMorph path | affine input(crop)→target(crop) ([`:311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L311)) |
| `reg.invol_to_targ.lta`, `reg.targ_to_invol.lta` | always | affine registration in full-FoV spaces ([`:322-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L322-L323)) |
| `reg.invol_to_targ.xfm` | MNI target | MNI-style affine usable as a `talairach.xfm` ([`:378-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L378-L389)) |
| `log/fs-synthmorph-reg.*.log` | always | run log |
| `test.nii.gz` | `--test` | input resampled into output space for QA ([`:847-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L847-L848)) |

When `--s` is used and no `--o`/`--warp` is given, the default output directory
is `mri/transforms/synthmorph.<targres>.<outres>` (or `ants.warp.…` for ANTs)
([`:777-782`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L777-L782)).

### Output Specifications

The warp is a FreeSurfer GCAM-style deformation field (written by
[[mri_warp_convert]] `--outfswarp`); apply it with `mri_convert -at warp …`
(warp only) or `mri_vol2vol --gcam` (warp + LTA). The affine LTAs follow
FreeSurfer's [[lta-format|.lta]] conventions; see [[coordinate-systems]].

## Mathematical Foundations

The script is plumbing; the registration math is in [[mri_synthmorph]]. The
two-stage scheme is explicit in the SynthMorph branch
([`:307-432`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L307-L432)):

1. **Affine:** `mri_synthmorph -m affine` → `aff.lta` mapping cropped input to
   cropped target ([`:315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L315)).
2. **Deformable:** `mri_synthmorph -m deform -i aff.lta` initialised by the
   affine ([`:406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L406)).
3. **Compose to a full-FoV warp** with [[mri_warp_convert]], folding in the
   crop-to-uncropped and (for non-default output res) target-resolution LTAs
   ([`:414-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L414-L430)).
4. **Inverse** via `mri_ca_register -invert-and-save`
   ([`:434-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L434-L442)).

> [!math] Why 1 mm target resolution is "free"
> A source comment notes SynthMorph samples to $256^3$ at 1 mm internally, so
> choosing a 1 mm target resolution does not slow it down or cost memory and
> probably yields a slightly better registration; ANTs, by contrast, is
> sensitive to resolution ([`:32-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L32-L37), [`:953-967`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L953-L967)).

> [!internal] Transform bookkeeping
> Cropping, stripping, and resolution changes are handled with [[mri_mask]],
> [[mri_synthstrip]], [[lta_convert]], [[mri_concatenate_lta]],
> [[mri_warp_convert]] and [[mri_vol2vol]]; the script's value is in chaining
> these so that the user is "completely insulated from the cropping process"
> ([`:943-951`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L943-L951)).

## Configuration Options

### Complete Flag Reference

Parsed in `parse_args`
([`mri_synthmorph/fs-synthmorph-reg:512-753`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L512-L753)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | file | — | input volume ([`:520`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L520)) |
| `--t` | file | (MNI152) | target volume; setting it disables the MNI target and forces cropping ([`:530`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L530)) |
| `--warp`<br>`--m3z` | file | auto | output warp file (`.m3z`/`.mgz`/`.nii.gz`) ([`:542-546`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L542-L546)) |
| `--o` | dir | — | output directory ([`:552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L552)) |
| `--s` | subject | — | FreeSurfer subject; input=`norm.mgz`, default outdir under `transforms/` ([`:557`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L557)) |
| `--sd` | dir | `$SUBJECTS_DIR` | set the subjects directory ([`:562`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L562)) |
| `--threads` | int | 1 | OMP/ITK threads ([`:567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L567)) |
| `--affine-only` | flag | off | stop after the affine registration ([`:548`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L548)) |
| `--synthmorph` | flag | (default) | use SynthMorph back-end ([`:577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L577)) |
| `--ants` | flag | off | use ANTs registration instead ([`:580`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L580)) |
| `--strip` | flag | off | skull-strip both input and target (via [[mri_synthstrip]]) ([`:615`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L615)) |
| `--strip-input` | flag | off | skull-strip input only ([`:623`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L623)) |
| `--strip-target` | flag | off | skull-strip target only ([`:629`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L629)) |
| `--no-strip`<br>`--no-strip-input`<br>`--no-strip-target` | flag | (off) | disable the corresponding stripping ([`:619-634`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L619-L634)) |
| `--crop`<br>`--no-crop` | flag | on (off if not MNI) | crop input/target to a non-zero bounding box for speed ([`:606-613`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L606-L613)) |
| `--inv`<br>`--no-inv` | flag | on | compute the inverse warp / skip it ([`:636-641`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L636-L641)) |
| `--mni`<br>`--no-nmni` | flag | on | register to MNI152 / disable MNI target ([`:643-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L643-L648)) |
| `--mni-targ-res`<br>`--mni-res`<br>`--mni-int-res` | enum | `1.0mm` | warp-field sampling resolution: `1.0mm`/`1.5mm`/`2.0mm` ([`:650-660`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L650-L660)) |
| `--mni-out-res`<br>`--mni-output-res` | enum | `1.0mm` | output resolution: `1.0mm`/`1.5mm`/`2.0mm`/`conformed` ([`:662-671`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L662-L671)) |
| `--mni-1`<br>`--mni-1.5`<br>`--mni-2`<br>`--mni-conformed` | flag | — | shortcuts for output resolution ([`:673-691`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L673-L691)) |
| `--pituitary` | flag | off | use the MNI target variant that does **not** mask out the pituitary ([`:693-695`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L693-L695)) |
| `--quick` | flag | off (ANTs) | use `antsRegistrationSyNQuick.sh` ([`:596`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L596)) |
| `--no-quick`<br>`--syn` | flag | — | use full `antsRegistrationSyN.sh` ([`:600-604`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L600-L604)) |
| `--cbig`<br>`--no-cbig` | flag | off | use the explicit CBIG-style ANTs `antsRegistration` command ([`:697-702`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L697-L702)) |
| `--2d` | flag | 3D | 2-D registration (disables `--test`) ([`:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L591)) |
| `--vg-thresh` | float | 1e-4 | volume-geometry equality tolerance for warp conversion ([`:572`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L572)) |
| `--test`<br>`--no-test` | flag | off | resample input into the output space and diff against the registration's own output ([`:584-589`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L584-L589)) |
| `--force` | flag | off | regenerate all outputs regardless of timestamps ([`:704`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L704)) |
| `--rerun` | flag | off | debugging: don't bail on the up-to-date check ([`:707-712`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L707-L712)) |
| `--log`<br>`--nolog`<br>`--no-log` | file/flag | auto | set/disable the log file ([`:714-722`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L714-L722)) |
| `--tmp`<br>`--tmpdir` | dir | `outdir/tmp` | set temp dir (also disables cleanup) ([`:724-729`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L724-L729)) |
| `--nocleanup`<br>`--cleanup` | flag | cleanup on | keep/remove the temp dir ([`:731-737`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L731-L737)) |
| `--debug` | flag | off | tcsh verbose/echo ([`:739`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L739)) |
| `-help` | flag | — | print usage + BEGINHELP ([`:53-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L53-L57)) |
| `-version` | flag | — | print version and exit ([`:58-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L58-L62)) |

> [!gotcha] `--mni-targ-res` only really matters for ANTs
> SynthMorph always samples at 1 mm internally, so changing the target
> (warp-field) resolution has little effect on it; the resolution flags are
> most meaningful for the ANTs back-end
> ([`:953-967`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L953-L967)).

### Configuration Interactions

> [!gotcha] `--t` (custom target) implies "not MNI" and reshapes cropping
> Passing `--t` sets `MNITarget=0` and forces cropping
> ([`:537-539`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L537-L539)).
> Conversely, if the MNI target is **not** in use, `check_params` turns
> cropping **off** for both input and target
> ([`:793-797`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L793-L797)).
> Specifying both `--t` and an MNI target is a hard error
> ([`:833-836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L833-L836)).

- **`--s` vs `--i`/`--o`:** with `--s`, the input defaults to `norm.mgz` and
  the output dir defaults under `transforms/`; explicit `--i`/`--o` override
  ([`:770-787`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L770-L787)).
- **`--affine-only`** short-circuits before the deformable step, so no warp is
  produced — only the affine LTAs ([`:396-399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L396-L399)).
- **Up-to-date check:** by default the script exits early ("update not
  needed") if the warp(s) are newer than the inputs; `--force` or `--rerun`
  override this ([`:850-856`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L850-L856)).
- **`--quick`/`--no-quick`/`--cbig`** only affect the ANTs path.

## Typical Use Cases

### Use Case 1: Register a volume to MNI152 (simplest)

```bash
fs-synthmorph-reg --i inputvol.nii.gz --o synthmorphdir
# warp = synthmorphdir/warp.to.mni152.1.0mm.1.0mm.nii.gz
mri_convert inputvol.nii.gz -at synthmorphdir/warp.to.mni152.1.0mm.1.0mm.nii.gz inputvol.mni152.nii.gz
```

### Use Case 2: From a FreeSurfer subject, then warp surfaces

```bash
fs-synthmorph-reg --s bert --threads 8
# default warp under bert/mri/transforms/synthmorph.1.0mm.1.0mm/
mris_apply_reg --warp lh.white .../warp.to.mni152.1.0mm.1.0mm.inv.nii.gz lh.warp.mni152
```

### Use Case 3: Register to an arbitrary target with stripping

```bash
fs-synthmorph-reg --i moving.nii.gz --t fixed.nii.gz --strip --o regdir
```

### Use Case 4: Affine only

```bash
fs-synthmorph-reg --i moving.nii.gz --o regdir --affine-only
# produces regdir/reg.invol_to_targ.lta (no warp)
```

## Pipeline Context

A standalone registration utility, not part of recon-all
(`recon_all_stage: null`). It can consume a recon-all subject (`--s`,
`norm.mgz`) and produce an MNI-style `.xfm` usable as `talairach.xfm`
([`:378-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L378-L389)),
so it can slot into spatial-normalisation workflows alongside the standard
talairach machinery.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (optional, via `--s`)
→ **This tool** → **Successor:** warp application
([[mri_vol2vol]], [[mris_apply_reg]])

## Gotchas and Caveats

> [!gotcha] Inverse warp is computed by default
> Unless `--no-inv` is given, the inverse warp is created with
> `mri_ca_register -invert-and-save`
> ([`:434-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L434-L442)).
> The `.inv` warp is what you apply to push surfaces/labels from input to
> target.

> [!gotcha] ANTs back-end as written looks incomplete
> The `--cbig` ANTs `antsRegistration` command references `$fixed`/`$moving`
> shell variables that are never set in the script
> ([`:210-225`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L210-L225)).
> The default (non-CBIG) ANTs call uses `$antsreg -d … -m $involcrop -f
> $targvolcrop` which is well-formed; the SynthMorph default path is the
> supported route.

> [!gotcha] `--no-nmni` spelling
> The flag that disables the MNI target is spelled `--no-nmni` (with the extra
> "n"), not `--no-mni`
> ([`:646-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L646-L648)).
> Using `--t` is the normal way to switch to a custom target.

## Error Compensation and Guard Rails

- Resolves `--i`/`--t` to absolute paths and aborts if they do not exist
  ([`:520-540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L520-L540), [`:807-812`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L807-L812)).
- Enforces the valid resolution enums for `--mni-targ-res`/`--mni-out-res`
  ([`:655-669`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L655-L669)).
- Manages all crop/strip transforms so outputs always reference the uncropped
  spaces, insulating the user from cropping
  ([`:943-951`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_synthmorph/fs-synthmorph-reg#L943-L951)).
- Timestamp-based `UpdateNeeded` checks skip steps whose outputs are already
  current (overridable with `--force`).

## Related Tools

- [[mri_synthmorph]] — the registration engine this script drives
- [[mri_synthstrip]] — skull-stripping used by `--strip*`
- [[mri_warp_convert]] — converts SynthMorph/ANTs output into a FreeSurfer warp
- [[lta_convert]], [[mri_concatenate_lta]] — affine-transform conversion and
  composition for the crop/space bookkeeping
- [[mri_vol2vol]] — applies the warp (`--gcam`) and resamples between spaces
- [[mri_ca_register]] — used (`-invert-and-save`) to compute the inverse warp
- [[mris_apply_reg]] — applies the inverse warp to surfaces
- [[coordinate-systems]] — background on the RAS/LTA conventions involved

## Confidence and Gaps

The SynthMorph (default) path, the full flag set, the output filenames, and the
crop/strip/inverse logic are read directly from the source with high
confidence.

> [!gap] ANTs path correctness
> The ANTs branch (`--ants`, `--cbig`) references unset variables in its
> explicit `antsRegistration` form and was not exercised; its correctness is
> uncertain. Treat SynthMorph as the supported back-end.

## References

- Hoffmann, M., Hoopes, A., Fischl, B.\*, Dalca, A.V.\* (2023).
  *Anatomy-specific acquisition-agnostic affine registration learned from
  fictitious images.* SPIE Medical Imaging 12464, 1246402.
  <https://doi.org/10.1117/12.2653251>
- Hoffmann, M., Billot, B., Greve, D.N., Iglesias, J.E., Fischl, B., Dalca,
  A.V. (2022). *SynthMorph: learning contrast-invariant registration without
  acquired images.* IEEE TMI 41(3), 543–558.
  <https://doi.org/10.1109/TMI.2021.3116879>
- Hoopes, A., Mora, J.S., Dalca, A.V., Fischl, B., Hoffmann, M. (2022).
  *SynthStrip: Skull-Stripping for Any Brain Image.* NeuroImage 206, 119474.
  <https://doi.org/10.1016/j.neuroimage.2022.119474>
