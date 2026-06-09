---
title: "rca-talairach"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-talairach"
families: ["rca-*"]
recon_all_stage: autorecon1
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[fs-synthmorph-reg]]"
  - "[[mri_synthstrip]]"
  - "[[lta_convert]]"
  - "[[talairach_avi]]"
  - "[[xhemireg]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The legacy --o/--i flags are parsed but explicitly ignored; the script always derives its input and output paths from -s. The historical intent of these flags is not recorded in the code."
  - "rca-talairach is the SynthMorph replacement for the classic talairach_avi/mritotal Talairach stage; the precise version cutover and which $FS_TALAIRACH_TYPE selects it is set in recon-all, not here."
tags:
  - recon-all
  - registration
  - talairach
  - synthmorph
  - mni305
  - autorecon1
---

# rca-talairach

## Summary

`rca-talairach` is a modern internal **component script** of
[[wiki/pipelines/recon-all|recon-all]] that computes the subject's affine
Talairach transform (`talairach.xfm`) using **SynthMorph** rather than the
classic intensity-based `talairach_avi`/`mritotal` registration. Given a
skull-stripped brain volume it runs [[fs-synthmorph-reg]] in affine-only mode to
register the brain to the FreeSurfer `mni305.cor.stripped` template, then
converts the resulting affine LTA into the MNI-style `talairach.xfm` file (and a
`talairach.xfm.lta`) that the rest of FreeSurfer expects. It does no image math
itself — it orchestrates SynthMorph and [[lta_convert]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-talairach`
- **Key helpers invoked:** [`fs-synthmorph-reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L87-L88) (the actual affine registration), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L103-L106) (LTA → vox2vox → MNI `.xfm` conversion), `UpdateNeeded` (timestamp guard), and the expert-options checker `fsr-checkxopts`/`getfullpath`.

## Purpose and Context

Almost every downstream FreeSurfer step needs an estimate of the affine mapping
from the subject's native anatomy into a standardised "Talairach" space — the
EM atlas registration, the subcortical segmentation, the cerebellum/brainstem
priors, and a host of surface-stage atlases are all initialised through
`talairach.xfm`. Historically this transform was produced inside
[[wiki/pipelines/recon-all|recon-all]] by `talairach_avi` (the
`mri_robust_template`/`avi2talxfm` path) or MINC `mritotal`.

`rca-talairach` is the **SynthMorph-era replacement** for that stage. SynthMorph
is a learning-based, contrast-agnostic registration network; using it for the
Talairach step removes the intensity-model fragility of `talairach_avi` (which
can fail on strong bias fields or unusual contrast). recon-all selects this path
when its internal `UseSynthMorph` flag is set, and calls `rca-talairach` to do
the work. The script is normally run **only from within recon-all** (and from
[[xhemireg]] for the cross-hemisphere "xhemi" subject), but it is a standalone
tcsh script and can be run by hand on a subject that already has
`mri/synthstrip.mgz`.

> [!gotcha] The `--i` and `--o` flags are accepted but ignored
> The argument parser accepts `--i invol` and `--o outdir`, but both handlers are
> immediately commented `# Not used`
> ([`scripts/rca-talairach:203-213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L203-L213)).
> `check_params` then **overwrites** `invol` with
> `$SUBJECTS_DIR/$subject/mri/synthstrip.mgz`
> ([`scripts/rca-talairach:259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L259))
> and derives the output directory from `-s`. In practice the **only** input that
> matters is `-s subject`; you cannot redirect the input volume or output
> directory with `--i`/`--o`.

## Inputs

### Required Inputs

- **`-s subject`** — a subject inside `$SUBJECTS_DIR`. The subject directory must
  exist ([`scripts/rca-talairach:254-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L254-L257)).
- **`mri/synthstrip.mgz`** — the skull-stripped brain produced earlier in
  recon-all by [[mri_synthstrip]]. This is hard-coded as the registration moving
  image ([`scripts/rca-talairach:259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L259)); the script does not create
  it.

The fixed target is the FreeSurfer atlas
`$FREESURFER/average/mni305.cor.stripped.mgz`
([`scripts/rca-talairach:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L85)) — the skull-stripped MNI305
average brain.

### Input Assumptions

> [!assumption] A skull-stripped brain already exists
> `rca-talairach` assumes `mri/synthstrip.mgz` is present and is a clean brain
> extraction (SynthMorph registers brain-to-brain, both images skull-stripped).
> Run inside recon-all this is guaranteed by the preceding
> [[mri_synthstrip]] call ([`scripts/recon-all:1611-1616`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1611-L1616)). If
> the file is missing, `fs-synthmorph-reg` fails and the script exits with an
> error.

## Outputs

### Files Created

Output locations depend on whether a subject was given (it always is in
practice). With `-s subject` and no `--o`, the SynthMorph working directory is
`$SUBJECTS_DIR/$subject/mri/transforms/synthmorph.mni305`
([`scripts/rca-talairach:262-263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L262-L263)):

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `aff.lta` | `mri/transforms/synthmorph.mni305/` | the SynthMorph affine subject→mni305 transform (RAS2RAS LTA), written by [[fs-synthmorph-reg]] |
| other `fs-synthmorph-reg` outputs | `mri/transforms/synthmorph.mni305/` | SynthMorph intermediate/output files |
| `talairach.xfm.lta` | `mri/transforms/` | the affine Talairach transform as a **vox2vox** LTA (`lta_convert --ltavox2vox`) |
| `talairach.xfm` | `mri/transforms/` | the classic MNI-style Talairach transform (`lta_convert --outmni`) — the canonical [[talairach.xfm]] file the rest of FreeSurfer reads |
| `rca-talairach.Y…M…D…H…M….log` | `$outdir/log/` (i.e. the SynthMorph dir's `log/`) | per-run log |

> [!gotcha] `talairach.xfm` path differs between the subject and no-subject branches
> When `-s` is given (the normal case) the `.xfm` is written to
> `mri/transforms/talairach.xfm`. In the (unused) no-subject branch the code
> writes `talairach.xfm.lta` to `$outdir` but `talairach.xfm` to
> `$outdir/transforms/` ([`scripts/rca-talairach:94-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L94-L100)) — an
> inconsistency that only surfaces if you (incorrectly) try to run it without
> `-s`, which `check_params` forbids anyway.

### Output Specifications

The final `talairach.xfm` is a 4×4 affine in MNI Talairach convention (the same
format `talairach_avi`/`mritotal` produced), so it is a drop-in replacement for
the legacy stage. The intermediate `talairach.xfm.lta` is explicitly a
**vox2vox** LTA (note the `# convert to VOX2VOX` comment at
[`scripts/rca-talairach:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L103)), whereas the SynthMorph
`aff.lta` is RAS2RAS — the two `lta_convert` calls do the type changes.

## Mathematical Foundations

`rca-talairach` performs **no numerical computation of its own**; it is a thin
orchestration wrapper. The registration math is entirely inside SynthMorph (a
deep-learning registration network) reached via [[fs-synthmorph-reg]], and the
coordinate-frame algebra is inside [[lta_convert]].

> [!internal] The registration and transform algebra live elsewhere
> The affine alignment of the subject brain to `mni305.cor.stripped` is computed
> by the SynthMorph model in [[fs-synthmorph-reg]]
> ([`scripts/rca-talairach:87-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L87-L88), `--affine-only`). The two
> [[lta_convert]] calls then (1) re-express the affine as a voxel-to-voxel LTA
> (`--ltavox2vox`) and (2) emit it in MNI `.xfm` form (`--outmni`)
> ([`scripts/rca-talairach:103-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L103-L106)). The only arithmetic the
> script does directly is run-time bookkeeping (seconds → minutes/hours via
> `bc`/`printf`).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-talairach:144-242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L144-L242)). Boolean flags take no
argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`-s` | string | *(required)* | Subject ID inside `$SUBJECTS_DIR`. Drives both the input (`mri/synthstrip.mgz`) and the output (`mri/transforms/`) paths. |
| `--sd`<br>`-sd`<br>`--sdir` | string | `$SUBJECTS_DIR` | Override the subjects directory (`setenv SUBJECTS_DIR`). |
| `--threads`<br>`-threads` | integer | `1` | Number of OpenMP threads; also exported as `OMP_NUM_THREADS` / `FS_OMP_NUM_THREADS` and passed to `fs-synthmorph-reg --threads`. |
| `--force` | bool | off | Force recomputation: adds `--force` to `fs-synthmorph-reg` and forces the `lta_convert` re-derivation even if `talairach.xfm.lta` is newer than `aff.lta`. |
| `--no-force` | bool | (default) | Do not force; rely on the `UpdateNeeded` timestamp check. |
| `--expert` | string (file) | — | Expert-options file; validated with `fsr-checkxopts` and canonicalised with `getfullpath`. (Parsed but not otherwise consumed downstream within this script.) |
| `--dontrun`<br>`-dontrun` | bool | off (runs) | Echo the commands to the log but do **not** execute them (dry run; sets `RunIt=0`). |
| `--o` | string | — | **Ignored** (parsed then commented "Not used"). Output dir is derived from `-s`. |
| `--i` | string | — | **Ignored** (parsed then commented "Not used"). Input is forced to `mri/synthstrip.mgz`. |
| `--log` | string | auto (`$outdir/log/rca-talairach.*.log`) | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). Note the temp dir is set but `mkdir`/cleanup are commented out, so it is effectively inert. |
| `--nocleanup` | bool | — | Do not remove the temp dir (cleanup is already disabled in code). |
| `--cleanup` | bool | (default) | Remove the temp dir (the `rm -rf` is commented out, so this is a no-op). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print usage + help and exit. |
| `-version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `-s` is the only input that matters; `--i`/`--o` are dead flags
> Because `check_params` hard-codes the moving image to
> `mri/synthstrip.mgz` and derives the output directory from the subject,
> supplying `--i` or `--o` has **no effect** and will not error. Do not rely on
> them. (See [`scripts/rca-talairach:203-213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L203-L213) and
> [`:259-268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L259-L268).)

> [!gotcha] `--force` is needed to redo the `.xfm` after editing
> Even with `--force`, the second-stage `lta_convert` re-run is gated by
> `if($ud || $ForceUpdate)` ([`scripts/rca-talairach:101-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L101-L102)).
> Without `--force`, an existing `talairach.xfm.lta` newer than the SynthMorph
> `aff.lta` is left untouched and the `.xfm` is **not** regenerated — so if you
> hand-edit the SynthMorph output you must pass `--force` (or delete the
> downstream files) to propagate the change.

- `--threads N` sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS` and forwards to
  SynthMorph; it is the only performance knob.
- The `--tmp*`/`--cleanup`/`--nocleanup` family is effectively inert because the
  `mkdir`/`rm -rf` of the temp dir are commented out
  ([`scripts/rca-talairach:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L60),
  [`:115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L115)).

## Typical Use Cases

### 1. As recon-all calls it (the normal path)

```bash
# Exactly what recon-all runs when UseSynthMorph is set (recon-all:2024):
rca-talairach --s subjID --threads 4
```

Produces `$SUBJECTS_DIR/subjID/mri/transforms/talairach.xfm` (and
`talairach.xfm.lta`) from `mri/synthstrip.mgz`.

### 2. Recompute the Talairach transform by hand

```bash
# Re-run after, e.g., regenerating synthstrip.mgz; force the conversion.
setenv SUBJECTS_DIR /data/subjects
rca-talairach --s subjID --threads 8 --force
```

### 3. Dry run to inspect the commands

```bash
rca-talairach --s subjID --dontrun
# echoes the fs-synthmorph-reg and lta_convert command lines into the log,
# without executing anything.
```

## Pipeline Context

`rca-talairach` runs inside **AUTORECON 1** of
[[wiki/pipelines/recon-all|recon-all]], as the SynthMorph variant of the
**Talairach** stage (the `talairach:` label at
[`scripts/recon-all:1738`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1738), `#@# Talairach`). recon-all
invokes it only when its internal `UseSynthMorph` flag is set, at
[`scripts/recon-all:2021-2030`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2021-L2030):

```tcsh
set synthmorphdir = ()
if($UseSynthMorph) then
  # Affine registration to the mni305 to create talairach.xfm
  set cmd = (rca-talairach --s $subjid --threads $OMP_NUM_THREADS)
  if($ForceUpdate) set cmd = ($cmd --force)
  ...
endif
```

Immediately afterwards recon-all runs the **nonlinear** SynthMorph registration
to MNI152 (`fs-synthmorph-reg --s … --test`,
[`scripts/recon-all:2034-2035`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2034-L2035)); `rca-talairach` supplies the
affine part that the rest of the stream consumes as `talairach.xfm`.

It is also called by [[xhemireg]] to build the Talairach transform for the
mirror-symmetric "xhemi" subject ([`scripts/xhemireg:194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L194):
`rca-talairach --s $subject/xhemi`).

**Predecessor:** [[mri_synthstrip]] (creates `mri/synthstrip.mgz`) →
**rca-talairach** → **Successor:** `fs-synthmorph-reg --test` (nonlinear MNI152),
then EM/CA segmentation and all stages that read `talairach.xfm`.

This is the SynthMorph alternative to the classic
[[talairach_avi]]/`mri_nu_correct.mni`-based Talairach path that occupies the
same stage when `UseSynthMorph` is off.

## Gotchas and Caveats

> [!gotcha] Runs brain-to-brain; needs a good skull strip
> SynthMorph here registers the skull-stripped subject brain to the
> skull-stripped MNI305. A poor [[mri_synthstrip]] result (e.g. residual skull or
> over-stripped cerebellum) propagates directly into a poor Talairach transform.

> [!gotcha] Output directory is the transforms folder, not a scratch dir
> With `-s` the SynthMorph working directory **is**
> `mri/transforms/synthmorph.mni305` — SynthMorph writes `aff.lta` and its
> intermediates straight into the subject's `transforms/` tree, alongside the
> final `talairach.xfm`.

> [!contradiction] Help text understates the flag set
> `rca-talairach -help` lists only `--s`, `--threads`, `--sdir`, `--force`, and
> `--dontrun` ([`scripts/rca-talairach:285-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L285-L292)), but the parser
> also accepts `--no-force`, `--expert`, `--log`, `--nolog`, `--tmp`,
> `--cleanup`/`--nocleanup`, `--debug`, and the (ignored) `--i`/`--o`. The flag
> table above is from the code, which is authoritative.

## Error Compensation and Guard Rails

- **Timestamp guard.** The `talairach.xfm.lta`/`talairach.xfm` conversion is
  skipped if the LTA is already newer than the SynthMorph `aff.lta`
  (`UpdateNeeded`, [`scripts/rca-talairach:101-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L101-L102)) unless
  `--force` is given — re-runs are cheap, but stale outputs can persist (see the
  `--force` gotcha above).
- **Hard exit on subject errors.** Missing `-s`, or a subject directory that does
  not exist, aborts with an explicit error
  ([`scripts/rca-talairach:250-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach#L250-L257)).
- **Propagates SynthMorph/lta_convert failures.** Any non-zero status from
  `fs-synthmorph-reg` or either `lta_convert` jumps to `error_exit` and returns
  1, so recon-all stops rather than continuing with a bad transform.
- **Input is forced**, not user-supplied — there is no way to accidentally point
  it at a non-skull-stripped volume via `--i` (it is ignored).

## Related Tools

- [[fs-synthmorph-reg]] — performs the actual SynthMorph affine registration to MNI305; `rca-talairach` is essentially a wrapper around it plus the `.xfm` conversion.
- [[mri_synthstrip]] — produces the `mri/synthstrip.mgz` brain that is the registration input.
- [[lta_convert]] — converts the SynthMorph affine LTA into vox2vox and then MNI `.xfm` form.
- [[talairach_avi]] — the classic intensity-based Talairach stage that `rca-talairach` replaces when SynthMorph is enabled.
- [[wiki/pipelines/recon-all|recon-all]] — the pipeline that calls this script in its autorecon1 Talairach stage.
- [[xhemireg]] — also calls `rca-talairach` to build the xhemi subject's Talairach transform.
- [[talairach.xfm]] — the canonical output file this script writes.

## Confidence and Gaps

**High confidence:** the complete flag set (incl. the ignored `--i`/`--o` and the
inert temp/cleanup flags), the hard-coded `synthstrip.mgz` input and
`mni305.cor.stripped.mgz` target, the two-step LTA→vox2vox→MNI conversion, the
`UpdateNeeded`/`--force` guard, and the exact recon-all and xhemireg call sites —
all read directly from [`scripts/rca-talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach)
and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] Intent of the dead `--i`/`--o` flags
> These flags are parsed and explicitly marked "Not used"; the no-subject output
> branch that would have consumed `--o` is unreachable under `check_params`. The
> historical intent (likely a standalone mode) is not documented in the code.

> [!gap] Version-gating of the SynthMorph Talairach path
> Whether this path is taken is decided by recon-all's `UseSynthMorph`
> flag (set from `$FS_TALAIRACH_TYPE`/version logic in recon-all), not by this
> script. The exact condition is documented on the
> [[wiki/pipelines/recon-all|recon-all]] page, not here.

## References

- FreeSurfer source: [`scripts/rca-talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-talairach) (v8.2.0).
- Call site: [`scripts/recon-all:2021-2041`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2021-L2041) (SynthMorph Talairach branch); [`scripts/xhemireg:194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L194).
- SynthMorph: Hoffmann et al., *SynthMorph: learning contrast-invariant registration without acquired images*, IEEE TMI 2022.
