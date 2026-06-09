---
title: "vno_match_check"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/vno_match_check"
families:
  - "scripts"
recon_all_stage: "autorecon3"
related:
  - "[[mris_info]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mris_fix_topology]]"
  - "[[mris_place_surface]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - QA
  - surface
  - vertices
  - recon-all
  - validation
---

# vno_match_check

## Summary

`vno_match_check` is a small tcsh quality-assurance script that verifies that **all** of a subject's per-hemisphere surface geometry files and per-vertex data files share the **same vertex count** ("vno" = vertex number). For each hemisphere it reads the vertex count of `?h.orig` with [[mris_info]] and confirms that the white, pial, inflated, smoothwm, sphere, and sphere.reg surfaces all report that same number; it then asks [[mris_info]] to validate that the curvature/morphometry overlays (`curv`, `sulc`, `area`, `area.mid`, `area.pial`, `thickness`, `volume`) and the standard annotations (`aparc`, `aparc.a2009s`, `BA_exvivo`, `BA_exvivo.thresh`) have the correct length for that surface. It exits 0 if everything matches and exits 1 with an error message at the first mismatch or missing file. It is run near the end of [[wiki/pipelines/recon-all|recon-all]] as a self-consistency check.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vno_match_check`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check)
- **Binary/script location:** `$FREESURFER_HOME/bin/vno_match_check`
- **Key helper invoked:** [`mris_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L43) (the only FreeSurfer tool it calls; used both to read `num vertices:` and to validate overlay/annotation length)

## Purpose and Context

A complete FreeSurfer surface reconstruction produces, per hemisphere, a family of triangle meshes that must all be **vertex-aligned**: the *i*-th vertex of `lh.white`, `lh.pial`, `lh.inflated`, `lh.sphere`, … must be the same anatomical point, and every per-vertex overlay (thickness, curvature, an annotation, …) must have exactly one value per vertex. This invariant is what makes it possible to, e.g., colour the pial surface by thickness measured on the white surface, or to resample a label through the registered sphere. If a topology fix, a manual edit, or a partial re-run left one surface with a different vertex count, downstream group analysis (`mris_preproc`, `mri_glmfit`, surface-based smoothing) would silently misalign data.

`vno_match_check` is the cheap guard that catches this. It performs **no computation and modifies nothing** — it only reads headers and compares counts. It is invoked by [[wiki/pipelines/recon-all|recon-all]] (once per hemisphere) so that a broken stream fails loudly at recon time rather than producing subtly wrong statistics later.

## Inputs

### Required Inputs

- **A subject ID** — the first positional argument (`$1`). The subject must exist under `$SUBJECTS_DIR`, and `$SUBJECTS_DIR/<subj>/surf` must exist ([`scripts/vno_match_check:24-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L24-L27)). The script `cd`s into that `surf` directory and reads files relative to it.
- **`$SUBJECTS_DIR`** must be set in the environment ([`scripts/vno_match_check:18-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L18-L21)).

The surfaces, overlays, and annotations listed in [Outputs/checks](#what-is-checked) must already exist; a missing file is treated as an error.

### Input Assumptions

> [!assumption] A finished (or nearly finished) recon
> The script assumes a normally-completed surface reconstruction: it requires `?h.orig`, `?h.white`, `?h.pial`, `?h.inflated`, `?h.smoothwm`, `?h.sphere`, `?h.sphere.reg`, the seven morphometry overlays, and the four standard annotations to all be present. Run before those exist (e.g. mid-recon), it will exit 1 on the first missing file. The annotation check looks in `../label/` relative to `surf` (i.e. `$SUBJECTS_DIR/<subj>/label`).

## Outputs

### Files Created

`vno_match_check` writes **no** output volumes, surfaces, or data files. Its only side effects are a transient log file created with `fs_temp_file --suffix .log` ([`scripts/vno_match_check:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L74)), used to capture [[mris_info]] stderr during the overlay/annotation checks and deleted at the end ([`scripts/vno_match_check:113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L113)).

The meaningful output is the **exit status** plus messages on stdout/stderr.

### What Is Checked

For each hemisphere (`rh` then `lh`, unless narrowed):

| Class | Items checked | How |
|-------|---------------|-----|
| Reference | `?h.orig` | vertex count read with `mris_info … \| grep "num vertices:"` ([`scripts/vno_match_check:43-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L43-L45)) |
| Surfaces | `white`, `pial`, `inflated`, `smoothwm`, `sphere`, `sphere.reg` | each must report the **same** `num vertices` as `?h.orig` ([`scripts/vno_match_check:52-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L52-L72)) |
| Overlays | `curv`, `sulc`, `area`, `area.mid`, `area.pial`, `thickness`, `volume` | `mris_info $hemi.orig --c $hemi.<curv>` must succeed (length validated by [[mris_info]] against `?h.orig`) ([`scripts/vno_match_check:78-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L78-L91)) |
| Annotations | `aparc.annot`, `aparc.a2009s.annot`, `BA_exvivo.annot`, `BA_exvivo.thresh.annot` (+ `aparc_edited.annot` if the second arg is `aparc_edited`) | `mris_info $hemi.orig --a ../label/$hemi.<annot>` must succeed ([`scripts/vno_match_check:95-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L95-L110)) |

### Output Specifications

- **Exit 0** — every surface has the same vertex count and every overlay/annotation passed [[mris_info]] validation.
- **Exit 1** — the first detected problem: a missing file, a surface with a different vertex count (with a message naming the file and both counts, [`scripts/vno_match_check:67-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L67-L70)), a failed `mris_info` run, or an overlay/annotation length error (the `ERROR` line from [[mris_info]] is grepped out of the temp log and printed).

## Mathematical Foundations

None — this is a string/integer comparison utility. The "math" is a single equality test, `vno_orig == vno` for each surface, plus delegation of overlay/annotation length validation to [[mris_info]] (which compares the overlay's value count against the reference surface's vertex count). No geometry is read or transformed.

## Configuration Options

### Complete Flag Reference

The argument handling is intentionally minimal: a positional subject ID plus an optional **single** second token ([`scripts/vno_match_check:23,31-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L23-L33)). There are no `-`-prefixed options other than help.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<subjid>` | positional (required) | — | Subject ID under `$SUBJECTS_DIR`; the script `cd`s to `$SUBJECTS_DIR/<subjid>/surf`. |
| `<option>` (2nd arg) | one of `lh`, `rh`, `debug`, `aparc_edited` | both hemis, quiet | See below. Only **one** value is honoured (it is read from `$2`). |
| `-help`<br>`--help`<br>*(no args)* | flag | — | Print usage and exit 1. |

Second-argument values:

| Value | Effect |
|-------|--------|
| `rh` | Check the right hemisphere only ([`scripts/vno_match_check:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L32)). |
| `lh` | Check the left hemisphere only ([`scripts/vno_match_check:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L33)). |
| `debug` (or any non-empty value) | Print "Checking …" progress lines and a final "Pass:" message. The check is **verbose whenever `$2` is non-empty** ([`scripts/vno_match_check:38,54,80,99,115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L38)). |
| `aparc_edited` | Adds `aparc_edited.annot` to the annotation list ([`scripts/vno_match_check:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L96)). |

### Configuration Interactions

> [!gotcha] The second argument is overloaded — hemisphere, verbosity, and the edited-aparc check are not orthogonal
> `$2` is a single slot used for four different purposes. Because the verbose path triggers on *any* non-empty `$2`, passing `lh`/`rh`/`aparc_edited` also turns on the progress messages. Conversely there is **no way** to, for example, check only `lh` *and* add `aparc_edited.annot` in one call — you get whichever you put in `$2`. The usage text states "(only one is accepted)" for exactly this reason ([`scripts/vno_match_check:11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L11)).

## Typical Use Cases

### Check a finished subject (both hemispheres, quiet)

```bash
# Exit status 0 = all surfaces/overlays/annots are vertex-aligned.
vno_match_check bert
echo $status   # 0 = pass
```

### Check one hemisphere with progress output

```bash
vno_match_check bert lh
```

### Include the manually-edited aparc

```bash
# Also validates label/lh.aparc_edited.annot and label/rh.aparc_edited.annot.
vno_match_check bert aparc_edited
```

## Pipeline Context

`vno_match_check` is invoked **inside [[wiki/pipelines/recon-all|recon-all]]**, once per hemisphere, when the `DoVnoMatchCheck` flag is set — enabled with the recon-all option `-vno_match_check` (aliases `-vno_check`, `-vno-check`, [`scripts/recon-all:8019-8023`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8019-L8023)). recon-all calls it as `vno_match_check $subjid $hemi` ([`scripts/recon-all:5864`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5864)), so the per-hemisphere form is the one exercised in the pipeline; an error makes recon-all `goto error_exit`. It runs as a late **autorecon3-stage** QA step, after the white/pial surfaces, sphere registration, parcellation, and morphometry overlays have all been produced — i.e. after the tools whose outputs it audits.

**Predecessor:** [[mris_fix_topology]] / [[mris_place_surface]] / [[mris_register]] / parcellation (produce the surfaces, overlays, and annotations) → **vno_match_check** (audits them) → **Successor:** group/statistics tools (`mris_preproc`, `mri_glmfit`) that rely on the vertex alignment it confirms.

## Gotchas and Caveats

> [!gotcha] Stops at the first failure
> The script exits immediately on the first missing or mismatched file, so it reports **one** problem per run, not a complete list. Fix and re-run to find the next.

> [!gotcha] sphere.reg and BA_exvivo annotations are required
> The fixed surface list includes `sphere.reg`, and the annotation list includes `BA_exvivo.annot`/`BA_exvivo.thresh.annot`. If you ran a reduced recon that skipped surface registration or Brodmann-area mapping, those files will be absent and the check exits 1 — even though the white/pial surfaces themselves are fine.

> [!gotcha] Hard-coded hemisphere order affects the final message
> The loop runs `rh` then `lh`; the closing "Pass:" line interpolates `$hemi`, which is therefore `lh` (the last iteration) regardless of which hemispheres were actually checked ([`scripts/vno_match_check:115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check#L115)).

## Error Compensation and Guard Rails

`vno_match_check` is itself a guard rail rather than a tool that compensates for errors. It does **not** repair anything: it surfaces the problem and leaves remediation (re-running the relevant recon-all stage, redoing a topology fix, or restoring a file) to the user. Its only defensive behaviour is to validate the environment (`$SUBJECTS_DIR` set, `surf/` present) and each input file's existence before use, and to detect a failed [[mris_info]] invocation (empty vertex count → "Error running mris_info", non-zero status → grep the `ERROR` line).

## Related Tools

- [[mris_info]] — the sole engine; supplies the vertex count and (via `--c`/`--a`) the overlay and annotation length validation.
- [[wiki/pipelines/recon-all|recon-all]] — the pipeline that calls this script as a late QA step (`-vno_match_check`).
- [[mris_fix_topology]] — the stage most likely to change a surface's vertex count (and thus the usual culprit when this check fails).
- [[mris_place_surface]] — produces the white/pial surfaces whose vertex counts are compared.
- [[mris_register]] — produces `?h.sphere.reg`, one of the audited surfaces.

## Confidence and Gaps

**High confidence.** The script is 115 lines and was read end to end; the surface list, overlay list, annotation list, the `$2` overloading, the verbose trigger, the temp-log mechanism, and the recon-all invocation were all confirmed directly from source.

## References

- FreeSurfer source: [`scripts/vno_match_check`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vno_match_check) (v8.2.0).
- recon-all call site: [`scripts/recon-all:5864`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5864) and option parsing at [`scripts/recon-all:8019-8023`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8019-L8023).
