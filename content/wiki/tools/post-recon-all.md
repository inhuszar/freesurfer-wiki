---
title: "post-recon-all"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/post-recon-all"
families: []                     # standalone post-processing driver
recon_all_stage: null            # runs after recon-all; can be hooked via -termscript
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_segstats]]"
  - "[[mri_synthstrip]]"
  - "[[mri_synthseg]]"
  - "[[gtmseg]]"
  - "[[surfreg]]"
  - "[[segment_subregions]]"
  - "[[mri_cvs_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Container paths (/cluster/batch/IMAGES/*run) and the default-on cos7/--no-vm behaviour are Martinos-Center-specific; exact runtime semantics of the 'vmrun' wrapper outside Martinos are inferred, not observed."
  - "UpdateNeeded dependency lists for several modules are annotated 'may not be exactly right' in the source; staleness detection for those modules is approximate."
tags:
  - recon-all
  - post-processing
  - segmentation
  - batch
  - qa
---

# post-recon-all

## Summary

`post-recon-all` is a tcsh driver that runs a battery of **optional, mostly
independent** FreeSurfer modules on a subject *after* [[wiki/pipelines/recon-all|recon-all]]
has finished. For one subject it can run QA statistics, the hippocampal/amygdala,
thalamic and brainstem subfield/subregion segmentations, [[wiki/tools/samseg|samseg]],
GTM segmentation, cross-hemisphere (xhemi) surface registration, qcache surface
smoothing, [[mri_synthseg]], [[mri_synthstrip]], SC-limbic, hypothalamic-subunit,
MCA/dura and venous-sinus segmentations, SynthMorph registration, and (opt-in)
CVS registration. Each module is gated by its own `--<name>`/`--no-<name>` flag,
is skipped when its output is already newer than its inputs (unless `--force`),
and — by default — does **not** abort the whole run on failure: instead it drops
a `post-recon-all.<module>.hardfailure.txt` marker, keeps going, and exits with a
non-zero status equal to the number of failed modules. It was written originally
to *test* these add-on modules but is usable for production.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/post-recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all)
- **Binary/script location:** `$FREESURFER_HOME/bin/post-recon-all`
- **Tools it orchestrates:** [`mri_segstats --qa-stats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L126), `segmentHA_T1.sh` / `segmentThalamicNuclei.sh` / `segmentBS.sh` (legacy MATLAB subfields), [`segment_subregions`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L176) (Python subregions), [`mri_synthstrip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L196), [`mri_synthseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L215), [`mri_sclimbic_seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L235), [`mri_segment_hypothalamic_subunits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L255), [`mri_mcadura_seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L276), [`mri_vsinus_seg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L291), [`samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L310), [`gtmseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L330), [`surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L350) (xhemi), `recon-all -qcache`, [`mri_cvs_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L407), [`fs-synthmorph-reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L425), plus the FreeSurfer utilities `UpdateNeeded`, `fs_time`, `fs-check-version`, `fs_temp_file`, and `mri_convert`.

## Purpose and Context

A standard [[wiki/pipelines/recon-all|recon-all]] run produces the core
anatomical reconstruction (volumes, surfaces, `aseg`, `aparc`, `wmparc`). Many
research uses then want additional derived outputs — subfield volumes, alternate
whole-brain segmentations, registrations to templates, etc. — which are shipped
as separate FreeSurfer modules. `post-recon-all` bundles those modules behind a
single command so they can be run uniformly, idempotently, and on a cluster.

There are two ways to run it:

1. **Standalone, after recon-all finishes**: `post-recon-all <subject>` (the
   common case; you can toggle individual modules).
2. **Hooked onto the end of recon-all** via
   `recon-all … -termscript post-recon-all`. recon-all's termination-script
   mechanism runs each `-termscript` with only the subject id as argument
   ([`scripts/recon-all:5898-5905`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5898-L5905)), so **no post-recon-all flags
   can be passed** in this mode — you get the defaults.

> [!gotcha] Inside recon-all you cannot pass post-recon-all options
> recon-all invokes a termination script as `$TermScript $subjid` — just the
> subject id ([`scripts/recon-all:5898-5905`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5898-L5905)). There is no way to add
> `--no-cvs`, `--no-vm`, threads, etc. when running via `-termscript`. The
> script's own help calls this out ([`scripts/post-recon-all:787-790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L787-L790)). If
> you need non-default behaviour, run it standalone instead.

> [!gotcha] It waits for `recon-all.done` before doing anything
> After parsing, the script blocks in a `sleep 600` loop until
> `$SUBJECTS_DIR/$subject/scripts/recon-all.done` appears
> ([`scripts/post-recon-all:115-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L115-L120)). This lets it be launched
> concurrently with a still-running recon-all (e.g. as a queued cluster job);
> it will simply wait, polling every 10 minutes, until recon-all signals
> completion.

`post-recon-all` is **not** itself a recon-all stage. It is a downstream driver
of optional add-ons.

## Inputs

### Required Inputs

- **Subject id** — a single positional argument naming a subject directory under
  `$SUBJECTS_DIR` ([`scripts/post-recon-all:659-666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L659-L666)). The directory
  must already contain a completed recon-all (its presence and a
  `recon-all.done` file are required; a `recon-all.error` file is fatal).
- **`$SUBJECTS_DIR`** — the subjects root, taken from the environment or
  overridden with `--sd`.

The individual modules consume the standard recon-all outputs under
`$SUBJECTS_DIR/$subject/`: `mri/orig.mgz`, `mri/nu.mgz`, `mri/norm.mgz`,
`mri/aseg.mgz`, `mri/wmparc.mgz`, `mri/aparc+aseg.mgz`, and the `surf/lh.sphere`
etc., as wired up in [`scripts/post-recon-all:105-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L105-L113).

### Input Assumptions

> [!assumption] A complete, error-free recon-all must already exist
> The subject must exist under `$SUBJECTS_DIR` and have a `recon-all.done` and
> **no** `recon-all.error` ([`scripts/post-recon-all:663-673`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L663-L673)). A
> version check (`fs-check-version`) must also pass
> ([`scripts/post-recon-all:676-688`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L676-L688)) — i.e. the subject must have been
> processed with a compatible FreeSurfer version. The add-on modules assume the
> conformed `orig.mgz`/`nu.mgz`/`norm.mgz` and the cortical surfaces produced by
> a normal v8 reconstruction.

> [!gotcha] `fsaverage_sym` is auto-linked into `$SUBJECTS_DIR`
> If `$SUBJECTS_DIR/fsaverage_sym` is missing, the script symlinks it from
> `$FREESURFER_HOME/subjects/fsaverage_sym`
> ([`scripts/post-recon-all:96-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L96-L101)) because the xhemi step registers to
> that symmetric template. This writes into your `$SUBJECTS_DIR`.

## Outputs

### Files Created

Each enabled module writes its own canonical outputs into the subject tree. The
most important are:

| Module (flag) | Representative output | Location |
|---------------|-----------------------|----------|
| QA stats (`--qa-stats`) | `qa.stats` | `stats/` ([`:123-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L123-L124)) |
| subfields (`--subfields`) | `*.amygNucVolumes-T1.v22.txt`, `ThalamicNuclei.v13.T1.volumes.txt`, `brainstemSsVolumes.v13.txt` | `mri/` ([`:146-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L146-L148)) |
| subregions (`--subregions`) | `*.segsub.*` volume tables (thalamus, hippo-amygdala, brainstem) | `mri/` ([`:171-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L171-L173)) |
| synthstrip (`--synthstrip`) | `synthstrip.mgz` | `mri/` ([`:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L193)) |
| synthseg (`--synthseg`) | `synthseg.mgz` | `mri/` ([`:212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L212)) |
| sclimbic (`--sclimbic`) | `sclimbic.mgz` (+ QA stats) | `mri/` ([`:232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L232)) |
| hypothalamic subunits (`--hthsu`) | `hypothalamic_subunits_seg.v1.mgz` (color table embedded) | `mri/` ([`:252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L252), [`:267-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L267-L271)) |
| MCA/dura (`--mcadura`) | MCA/dura segmentation | `mri/` (via `mri_mcadura_seg`, [`:276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L276)) |
| venous sinus (`--vsinus`) | venous-sinus segmentation | `mri/` (via `mri_vsinus_seg`, [`:291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L291)) |
| samseg (`--samseg`) | `seg.mgz` (+ samseg outputs) | `mri/samseg/` ([`:307-310`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L307-L310)) |
| gtmseg (`--gtmseg`) | `gtmseg.mgz` | `mri/` ([`:327-330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L327-L330)) |
| xhemi (`--xhemi`) | `lh.fsaverage_sym.sphere.reg` (normal + `xhemi/`) | `surf/`, `xhemi/surf/` ([`:346-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L346-L368)) |
| qcache (`--qcache`) | smoothed surface maps on fsaverage | `surf/` (via `recon-all -qcache`, [`:389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L389)) |
| CVS (`--cvs`) | CVS registration to MNI | `cvs/` (via `mri_cvs_register`, [`:407`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L407)) |
| SynthMorph (`--synthmorph`) | SynthMorph registration | (via `fs-synthmorph-reg`, [`:425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L425)) |

Always written by the driver itself:

| File | Location | Contents |
|------|----------|----------|
| `post-recon-all.log` | `scripts/` | full log; a pre-existing one is moved to `.bak` first ([`scripts/post-recon-all:74-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L74-L75)) |
| `post-recon-all.<module>.hardfailure.txt` | `scripts/` | created (containing the failing command) when a module fails in the default non-abort mode; **stale ones are deleted at startup** ([`scripts/post-recon-all:70-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L70-L72)) |

### Output Specifications

`post-recon-all` produces no outputs of its own beyond the log and the
hardfailure markers; every volume/surface/stats artefact is produced by the
underlying module with that module's data type, geometry, and color table.
Notably, the hypothalamic-subunit output has the `FreeSurferColorLUT.txt` color
table embedded into it afterward via
`mri_convert --ctab` ([`scripts/post-recon-all:267-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L267-L271)).

## Mathematical Foundations

None in the driver itself — `post-recon-all` is a **scheduler/guard wrapper**.
All segmentation, registration, and statistics math lives in the modules it
calls.

> [!internal] The science is in the called modules
> Deep-learning segmentations come from [[mri_synthseg]], [[mri_synthstrip]],
> `mri_sclimbic_seg`, `mri_segment_hypothalamic_subunits`, `mri_mcadura_seg`,
> `mri_vsinus_seg`; Bayesian whole-brain segmentation from
> [[wiki/tools/samseg|samseg]]; subfield Bayesian models from
> `segmentHA_T1.sh`/`segmentThalamicNuclei.sh`/`segmentBS.sh` and their Python
> successor [[segment_subregions]]; surface registration from [[surfreg]] and
> [[mri_cvs_register]]; QA morphometrics from [[mri_segstats]] `--qa-stats`. See
> those pages for the actual algorithms.

The only quantitative logic in the driver is the staleness test: for each module
it calls `UpdateNeeded <output> <input(s)>` and runs the module only if the
output is missing/older than its inputs, or `--force` is set (e.g.
[`scripts/post-recon-all:124-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L124-L125)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/post-recon-all:467-651`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L467-L651)). All module toggles are boolean
pairs `--x` / `--no-x`; the "Default" column gives the value set at the top of the
script ([`scripts/post-recon-all:31-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L31-L46)).

#### Subject, threads, target

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<subject>` | string (positional) | *(required)* | Subject id under `$SUBJECTS_DIR`; the lone non-flag argument ([`scripts/post-recon-all:640-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L640-L648)). |
| `--sd` | string (dir) | `$SUBJECTS_DIR` | Override the subjects directory ([`scripts/post-recon-all:475-478`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L475-L478)). |
| `--threads` | int | `$FS_OMP_NUM_THREADS` (→1 if unset) | Threads for the modules; also sets `OMP_NUM_THREADS` ([`scripts/post-recon-all:480-484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L480-L484), [`:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L20), [`:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L66)). |

#### Module toggles (each is `--x` / `--no-x`)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subfields`<br>`--no-subfields` | bool | **on** | Legacy MATLAB subfield segs: hippo/amygdala, thalamic nuclei, brainstem (`segmentHA_T1.sh`, `segmentThalamicNuclei.sh`, `segmentBS.sh`) ([`:142-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L142-L165)). |
| `--subregions`<br>`--no-subregions` | bool | **on** | Python `segment_subregions` for thalamus, hippo-amygdala, brainstem (`.segsub` suffix) ([`:167-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L167-L190)). |
| `--synthseg`<br>`--no-synthseg` | bool | **on** | [[mri_synthseg]] whole-brain segmentation of `orig.mgz` ([`:211-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L211-L229)). |
| `--synthstrip`<br>`--no-synthstrip` | bool | **on** | [[mri_synthstrip]] skull-strip of `orig.mgz` → `synthstrip.mgz` ([`:192-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L192-L209)). |
| `--sclimbic`<br>`--no-sclimbic` | bool | **on** | `mri_sclimbic_seg` (subcortical limbic) on `nu.mgz` ([`:231-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L231-L249)). |
| `--hthsu`<br>`--no-hthsu` | bool | **on** | `mri_segment_hypothalamic_subunits` on `nu.mgz` ([`:251-273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L251-L273)). |
| `--mcadura`<br>`--no-mcadura` | bool | **on** | `mri_mcadura_seg` (MCA / dura) ([`:275-288`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L275-L288)). |
| `--vsinus`<br>`--no-vsinus` | bool | **on** | `mri_vsinus_seg` (venous sinuses) ([`:290-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L290-L303)). |
| `--samseg`<br>`--no-samseg` | bool | **on** | [[wiki/tools/samseg|samseg]] on `orig.mgz` → `mri/samseg/seg.mgz` ([`:305-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L305-L323)). |
| `--gtmseg`<br>`--no-gtmseg` | bool | **on** | [[gtmseg]] (PET geometric-transfer-matrix seg) with `--xcerseg --samseg` ([`:325-343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L325-L343)). |
| `--xhemi`<br>`--no-xhemi` | bool | **on** | Cross-hemisphere [[surfreg]] to `fsaverage_sym` (normal + xhemi) ([`:345-382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L345-L382)). |
| `--synthmorph`<br>`--no-synthmorph` | bool | **on** | `fs-synthmorph-reg` registration ([`:421-437`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L421-L437)). |
| `--qa-stats`<br>`--no-qa-stats`<br>`--no-qastats` | bool | **on** | [[mri_segstats]] `--qa-stats` → `stats/qa.stats` ([`:122-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L122-L139)). See gotcha — `--no-qa-stats` does **not** turn it off. |
| `--qcache`<br>`--no-qcache` | bool | **off** | `recon-all -s <subj> -qcache` surface smoothing onto fsaverage ([`:384-401`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L384-L401)). |
| `--cvs`<br>`--no-cvs` | bool | **off** | [[mri_cvs_register]] to MNI; off by default because it is very expensive ([`:403-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L403-L419)). |

#### Behaviour, execution environment, misc.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--no-v8+` | bool | off | Convenience switch for v8+ subjects: turns **off** `synthseg`, `synthstrip`, `mcadura`, `vsinus`, and `synthmorph` because recon-all v8 already runs them ([`scripts/post-recon-all:592-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L592-L599)). |
| `--force`<br>`--no-force` | bool | off | Re-run every enabled module even if its output is newer than its inputs (override `UpdateNeeded`) ([`:621-626`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L621-L626)). |
| `--exit-on-error`<br>`--no-exit-on-error` | bool | off (continue) | Abort immediately on the first module failure instead of recording a hardfailure and continuing ([`:628-633`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L628-L633)). |
| `--cos7` | bool | off | Run every module inside the CentOS7 container `/cluster/batch/IMAGES/centos7run` ([`:601-603`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L601-L603)). Martinos-specific. |
| `--rocky8` | bool | off | Use the Rocky 8 container ([`:604-606`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L604-L606)). Martinos-specific. |
| `--rocky9` | bool | off | Use the Rocky 9 container ([`:607-609`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L607-L609)). Martinos-specific. |
| `--vm` | string (path) | — | Run modules through an explicit container/wrapper path ([`:610-613`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L610-L613)). |
| `--no-vm`<br>`--no-cos7`<br>`--no-rocky8`<br>`--no-rocky9` | bool | — | Clear the container wrapper and run on the native OS ([`:614-619`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L614-L619)). Required off-cluster. |
| `--debug` | bool | off | tcsh `set echo`/`verbose` tracing ([`:635-638`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L635-L638)). |
| `--help` | bool | — | Print usage + the `BEGINHELP` block and exit ([`:51-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L51-L55)). |
| `--version` | bool | — | Print the version string and exit ([`:56-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L56-L60)). |

### Configuration Interactions

> [!gotcha] `--no-qa-stats` / `--no-qastats` do NOT disable QA stats
> Both the `--no-qa-stats` and `--no-qastats` cases set `DoQAStats = 1` — the
> same as `--qa-stats` ([`scripts/post-recon-all:580-583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L580-L583)). This looks like a
> copy-paste slip (every other `--no-x` sets the flag to 0), so there is
> currently **no command-line way to skip the qa.stats step**; it always runs.
> Treat this as a defect, not intended behaviour.

> [!gotcha] `--no-v8+` overrides the individual module defaults
> `--no-v8+` force-sets `DoSynthSeg`, `DoSynthStrip`, `DoMCADura`, `DoVSinus`,
> and `DoSynthMorph` to 0 ([`scripts/post-recon-all:592-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L592-L599)). Because flags
> are processed left to right, a later `--synthseg` would re-enable that one;
> ordering matters. Use `--no-v8+` for v8 subjects to avoid redoing work
> recon-all already did.

> [!gotcha] Container is **off by default in the code**, but the help says CentOS7 is default
> The variable `vmrun` initialises to empty ([`scripts/post-recon-all:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L22)),
> so unless you pass `--cos7`/`--rocky8`/`--rocky9`/`--vm` the modules run on the
> native OS. The usage/help text, however, states that commands run from a
> CentOS7 container by default ([`scripts/post-recon-all:782-785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L782-L785)). Code is
> authoritative: **no container is used unless requested.** (The help text reflects
> the Martinos production wrapper that sets it externally.)

> [!gotcha] Container selection flags are mutually exclusive in effect
> `--cos7`, `--rocky8`, `--rocky9`, and `--vm` each overwrite `vmrun`; the last
> one on the command line wins. `--no-vm` (and its aliases) clears it back to
> native ([`scripts/post-recon-all:601-619`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L601-L619)).

Other interactions:

- `--qcache` always runs the qcache step when set, but qcache itself still
  skips up-to-date outputs; the help notes qcache fails for longitudinal subjects
  ([`scripts/post-recon-all:719-720`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L719-L720)).
- `--exit-on-error` changes the failure model globally (see
  [Error Compensation](#error-compensation-and-guard-rails)).
- `--force` defeats every module's `UpdateNeeded` skip at once.

## Typical Use Cases

### Use Case 1: Run all default add-ons on a finished subject

```bash
post-recon-all bert --threads 4
# Runs qa-stats, subfields, subregions, synthseg/strip, sclimbic, hthsu,
# mcadura, vsinus, samseg, gtmseg, xhemi, synthmorph (qcache & CVS stay off).
```

### Use Case 2: v8 subject — skip what recon-all already did

```bash
post-recon-all bert --no-v8+ --threads 8
# Adds subfields/subregions/samseg/gtmseg/xhemi/qastats/sclimbic/hthsu but
# does NOT redo synthseg, synthstrip, mcadura, vsinus, synthmorph.
```

### Use Case 3: Only the subfield/subregion segmentations

```bash
post-recon-all bert \
  --no-synthseg --no-synthstrip --no-sclimbic --no-hthsu \
  --no-mcadura --no-vsinus --no-samseg --no-gtmseg \
  --no-xhemi --no-synthmorph --threads 4
# (qa-stats still runs — see the --no-qa-stats gotcha.)
```

### Use Case 4: Hook it onto the end of recon-all

```bash
recon-all -s bert -i bert_T1.mgz -all -termscript post-recon-all
# recon-all runs the full reconstruction, then calls 'post-recon-all bert'
# at termination — with default options only.
```

### Use Case 5: Add the expensive CVS registration

```bash
post-recon-all bert --cvs --threads 8     # CVS to MNI; off by default
```

## Pipeline Context

`post-recon-all` runs **after** [[wiki/pipelines/recon-all|recon-all]]. It is not
a recon-all stage; rather it is either launched manually once a subject is done,
or attached to recon-all via `-termscript post-recon-all`. In the termscript
case, recon-all calls it last, after its own subfield/termination handling
([`scripts/recon-all:5898-5910`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5898-L5910)), passing only the subject id.

Internally it then dispatches to many leaf tools (see
[Source Information](#source-information)). One module, `--qcache`, even
re-enters recon-all (`recon-all -s <subj> -qcache`).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] `-all` (must write
`recon-all.done`, no `recon-all.error`) → **post-recon-all** → **Successors:**
group/statistical analysis consuming the new subfield tables, `qa.stats`, samseg
segmentation, xhemi registration, etc.

## Gotchas and Caveats

> [!gotcha] Failures are recorded but tolerated by default
> By default a failing module does **not** stop the run. The script prints
> "`<cmd>` failed, but continuing", writes the command into
> `scripts/post-recon-all.<module>.hardfailure.txt`, increments an
> `ExitStatus` counter, and proceeds (e.g.
> [`scripts/post-recon-all:129-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L129-L137)). At the end it exits with the
> **count of failed modules** ([`scripts/post-recon-all:439-457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L439-L457)). A
> zero exit means every enabled module succeeded (or was up-to-date).

> [!gotcha] Stale hardfailure markers are cleared on each run
> At startup the script deletes any existing
> `post-recon-all.*.hardfailure.txt` files
> ([`scripts/post-recon-all:70-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L70-L72)), so the markers always reflect the
> *latest* run, not historical failures.

> [!gotcha] MCA/dura and venous-sinus modules ignore `UpdateNeeded`
> Unlike most modules, `--mcadura` and `--vsinus` have **no** `UpdateNeeded`
> guard — they run every time they are enabled
> ([`scripts/post-recon-all:275-288`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L275-L288), [`:290-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L290-L303)). Disable them
> explicitly (or via `--no-v8+`) if you do not want them rerun.

> [!gotcha] `FS_OMP_NUM_THREADS` defaults to 1 — subfields can OOM at 1 thread
> If `FS_OMP_NUM_THREADS` is unset it is forced to 1
> ([`scripts/post-recon-all:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L20)). A source comment warns the author hit
> memory errors running subfields with `nthreads=1`. Set `--threads`
> appropriately.

> [!gotcha] qcache is not valid for longitudinal subjects
> The help explicitly warns "qcache will fail for longitudinal"
> ([`scripts/post-recon-all:719-720`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L719-L720)). Leave `--qcache` off (the default)
> for longitudinal runs.

> [!gotcha] Subfields vs. subregions overlap
> `--subfields` (legacy MATLAB) and `--subregions` (Python `segment_subregions`)
> *both* segment thalamus, hippo/amygdala, and brainstem
> ([`scripts/post-recon-all:758-760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L758-L760)). Both are on by default, so you get two
> parallel sets of subfield outputs unless you disable one.

## Error Compensation and Guard Rails

- **Pre-flight checks.** Aborts up front if the subject is missing, has a
  `recon-all.error`, or fails `fs-check-version`
  ([`scripts/post-recon-all:663-688`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L663-L688)); and, if a container is requested,
  if that container path does not exist
  ([`scripts/post-recon-all:690-696`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L690-L696)).
- **Wait-for-done.** Blocks until `recon-all.done` exists
  ([`scripts/post-recon-all:115-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L115-L120)) so it can be queued alongside a
  running recon-all.
- **Idempotent skipping.** Most modules use `UpdateNeeded` so re-runs only redo
  out-of-date work; `--force` overrides this.
- **Soft-fail with markers + counted exit status.** Default behaviour records a
  hardfailure file per failed module and reports the total at the end rather than
  stopping; `--exit-on-error` switches to fail-fast.
- **Auto-provisioning.** Symlinks `fsaverage_sym` into `$SUBJECTS_DIR` if absent
  ([`scripts/post-recon-all:96-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L96-L101)).

## Known Bugs

- [[00154]] — `--no-qa-stats` and `--no-qastats` both set `DoQAStats=1` (the enabling value); since the default is already 1, QA-stats cannot be disabled from the command line.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the upstream pipeline; can also invoke
  this script via `-termscript post-recon-all`.
- [[mri_segstats]] — runs the `--qa-stats` QA morphometrics step.
- [[wiki/tools/samseg|samseg]] — whole-brain Bayesian segmentation module.
- [[gtmseg]] — PET partial-volume geometric-transfer-matrix segmentation.
- [[segment_subregions]] — Python subregion segmentation (the `--subregions` path).
- [[surfreg]] — drives the xhemi cross-hemisphere registration.
- [[mri_synthseg]], [[mri_synthstrip]] — deep-learning segmentation/skull-strip
  modules.
- [[mri_cvs_register]] — the optional CVS-to-MNI registration (`--cvs`).
- [[reconbatchjobs]] — unrelated mechanism, but the other recon-all batch helper.

## Confidence and Gaps

**High confidence:** the complete module list, every flag and its default,
the wait-for-done loop, the version/error pre-flight checks, the
`UpdateNeeded`-based skipping, the soft-fail / hardfailure-marker model and the
counted exit status, and the `--no-qa-stats` and "container off by default"
discrepancies — all read directly from
[`scripts/post-recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all)
and corroborated against the recon-all `-termscript` machinery
([`scripts/recon-all:5898-5910`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5898-L5910)).

> [!gap] Container ("vmrun") runtime semantics outside Martinos
> The `--cos7`/`--rocky8`/`--rocky9`/`--vm` wrappers prepend a Martinos-Center
> container-run path to each command. Their exact behaviour (and whether they are
> usable at all) outside the Martinos cluster was not exercised; off-cluster users
> should rely on `--no-vm` (native execution).

> [!gap] Several `UpdateNeeded` dependency lists are admittedly approximate
> Source comments mark the dependency lists for gtmseg, xhemi, and others as
> "may not be exactly right" (e.g.
> [`scripts/post-recon-all:328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L328), [`:348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L348)). Staleness
> detection for those modules may not catch every changed input.

## References

- FreeSurfer source: [`scripts/post-recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all) (v8.2.0).
- Built-in help: `post-recon-all --help` (usage block plus `BEGINHELP`,
  [`scripts/post-recon-all:712-790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/post-recon-all#L712-L790)).
- Termination-script hook: recon-all `-termscript`
  ([`scripts/recon-all:7639-7647`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7639-L7647), [`:5898-5910`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5898-L5910)).
