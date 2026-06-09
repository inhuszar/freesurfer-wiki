---
title: "xsanatreg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/xsanatreg"
families: []                     # standalone registration helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_motion_correct]]"
  - "[[talairach]]"
  - "[[lta_convert]]"
  - "[[registration-overview]]"
  - "[[coordinate-systems]]"
  - "[[mri_transform_to_COR]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "minctracc is an external MNI MINC-toolkit binary and is not shipped in the v8.2.0 install; the default linear/non-linear behaviour of the registration depends entirely on which minctracc options are passed through, which this script does not constrain."
  - "The default output transform is a MINC .xfm; no conversion to FreeSurfer LTA/register.dat is performed here, and the exact .xfm flavour (linear vs. non-linear grid) is whatever minctracc writes."
tags:
  - registration
  - talairach
  - minc
  - cross-session
  - legacy
---

# xsanatreg

## Summary

`xsanatreg` ("cross-session anatomical registration") is a thin tcsh front end
for the MNI **`minctracc`** registration program. Given two FreeSurfer
anatomical volumes — a *source* and a *target* (historically COR directories,
but any volume [[wiki/tools/mri_convert|mri_convert]] can read) — it converts
each to the MINC `.mnc` format, runs `minctracc` to estimate the transform that
aligns the source to the target, and writes the resulting MINC transform
(`.xfm`) to a user-named file. Any unrecognised command-line arguments are
passed straight through to `minctracc`, so the actual registration model (rigid,
affine, or non-linear) is whatever the caller asks `minctracc` to compute. It is
the tool you would use to register two scans of the *same* subject acquired in
different sessions.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/xsanatreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg)
- **Binary/script location:** `$FREESURFER_HOME/bin/xsanatreg`
- **Helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L64) (volume → MINC conversion), [`minctracc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L82) (the actual registration — an **external** MNI MINC-toolkit program), and the FreeSurfer shell utility `fs_temp_dir` (temporary-directory allocation).

> [!gotcha] `minctracc` is not part of FreeSurfer
> `minctracc` belongs to the MNI **MINC autoregistration** toolkit, not to
> FreeSurfer, and it is **not installed** under `$FREESURFER_HOME/bin` in the
> v8.2.0 distribution checked here. `xsanatreg` is therefore only usable on a
> machine where `minctracc` (and the MINC `.mnc` I/O it needs) is independently
> available on `$PATH`. Historical FreeSurfer trees obtained `minctracc` from the
> bundled MNI tools; the upstream documentation is at
> `www.bic.mni.mcgill.ca/users/louis/tracc/tracc_doc/section3_1.html`
> (referenced from [`scripts/talairach:231-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talairach#L231-L232)).

## Purpose and Context

When a subject is scanned in two separate sessions (e.g. a baseline and a
follow-up), the two anatomical volumes occupy different physical positions in the
scanner. To compare them voxel-for-voxel you must first estimate the spatial
transform that maps one onto the other. `xsanatreg` automates exactly this
"cross-session" alignment by delegating the numerical work to `minctracc`, the
same MNI registration engine FreeSurfer historically used for Talairach
estimation (`mritotal`) and for the MINC-based motion correction in
[[mri_motion_correct]].

It exists because `minctracc` operates only on MINC volumes, whereas FreeSurfer
stores anatomy as COR directories or `.mgz`. `xsanatreg` therefore (1) converts
both inputs to `.mnc` with [[wiki/tools/mri_convert|mri_convert]], (2) calls
`minctracc`, and (3) cleans up the temporary MINC files — a small but tedious
piece of glue. The output is a MINC `.xfm` transform file, not a FreeSurfer
register.dat or `.lta`; converting it for use with other FreeSurfer tools is a
separate step (see [[lta_convert]]).

This is a **legacy / standalone** utility. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all` (a tree-wide grep finds no
invocation), and on modern installs the same job is more commonly done with
[[mri_robust_register]], [[mri_coreg]], or the longitudinal stream.

## Inputs

### Required Inputs

- **Source volume** (`-src`) — the volume to be moved. Historically a **COR
  directory** (see [[mri_transform_to_COR]] and [[subject-directory]]), but any
  path [[wiki/tools/mri_convert|mri_convert]] can read works. The path must be
  readable ([`scripts/xsanatreg:178-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L178-L181)).
- **Target volume** (`-targ`) — the fixed/reference volume the source is aligned
  to. Same format rules; must be readable
  ([`scripts/xsanatreg:188-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L188-L191)).
- **Output transform path** (`-xfm`) — the file the estimated `minctracc`
  transform is written to. Its parent directory is created with `mkdir -p` and
  must be writable ([`scripts/xsanatreg:193-202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L193-L202)).

> [!assumption] Inputs are co-modality anatomical volumes readable by mri_convert
> The name and design assume two **anatomical** scans of the *same* subject (the
> "cross-session" use case). Nothing in the script enforces this; it converts
> whatever you give it to MINC and hands it to `minctracc`. Registration quality
> then depends entirely on the `minctracc` options you pass through (objective
> function, step sizes, degrees of freedom) — the script supplies **none** by
> default, so a bare invocation relies on `minctracc`'s own defaults.

> [!gotcha] `.mgz` is preferred over a bare COR path when both exist
> For each input the script tests for a file named `<arg>.mgz`. If `<arg>.mgz`
> exists it converts that; otherwise it converts `<arg>` directly
> ([`scripts/xsanatreg:62-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L62-L69) for the source,
> [`scripts/xsanatreg:73-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L73-L79) for the target). Note the asymmetry:
> the source conversion checks `mri_convert`'s exit status and aborts on failure
> ([`scripts/xsanatreg:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L68)), but the **target** conversion does
> **not**, so a failed target conversion is not caught here.

### Input Assumptions

- The temporary directory must be writable
  ([`scripts/xsanatreg:204-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L204-L207)). By default it is allocated by
  `fs_temp_dir`; override with `-tmpdir`.
- `minctracc` and MINC `.mnc` I/O must be available on `$PATH` (see the gotcha
  above).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<xfm>` | the `-xfm` path | The MINC transform estimated by `minctracc` that aligns *source* to *target*. Format and flavour (linear `.xfm` vs. non-linear grid transform) are whatever `minctracc` writes for the options given. |
| `src-<PID>.mnc` | `$tmpdir` | Source volume converted to MINC (intermediate; deleted unless `-nocleanup`). |
| `targ-<PID>.mnc` | `$tmpdir` | Target volume converted to MINC (intermediate; deleted unless `-nocleanup`). |

`<PID>` is the shell process ID (`$$`). The MINC intermediates can be redirected
to explicit, persistent paths with `-srcminc` / `-targminc`, in which case they
are **not** auto-named in `$tmpdir`.

### Output Specifications

The output is a **MINC `.xfm` transform**, expressed in MINC/world coordinates,
not a FreeSurfer register.dat or `.lta`. To use the result with FreeSurfer
resampling tools it must be interpreted in the MINC convention or converted; see
[[coordinate-systems]] and [[lta_convert]]. `xsanatreg` performs **no** resampling
of the volumes itself — it only estimates and stores the transform.

## Mathematical Foundations

None in this script — `xsanatreg` is pure glue. All of the registration
mathematics (the objective function, the optimisation over transform parameters,
any multi-resolution scheme) lives inside the external `minctracc` program.

> [!internal] The registration math is entirely external
> The cost-function minimisation that produces the transform is implemented in
> MNI `minctracc`, not in FreeSurfer. `xsanatreg` neither sets nor defaults any
> registration parameter; everything after the volume arguments on the command
> line is forwarded verbatim. Consult the MINC autoregistration documentation
> (`tracc_doc/section3_1.html`) for the model and its options.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/xsanatreg:99-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L99-L167)). Boolean flags take no argument.
Any token **not** matching one of these is appended to `MTArgs` and forwarded to
`minctracc` — but see the gotcha below about the pass-through.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src` | string | *(required)* | Source volume directory/path (the volume to be aligned to the target). |
| `-targ` | string | *(required)* | Target/reference volume directory/path. |
| `-xfm` | string | *(required)* | Output file for the estimated `minctracc` transform. Parent directory is created if needed. |
| `-tmpdir` | string | `fs_temp_dir` | Directory for the temporary `.mnc` intermediates. Created with `mkdir -p` if given. |
| `-srcminc` | string | `<tmpdir>/src-<PID>.mnc` | Explicit path for the source MINC volume (overrides the auto-name; not deleted by cleanup if you point it outside `$tmpdir`). |
| `-targminc` | string | `<tmpdir>/targ-<PID>.mnc` | Explicit path for the target MINC volume. |
| `-nocleanup` | bool | off (cleanup **on**) | Keep the temporary `.mnc` files instead of deleting them after registration. |
| `-umask` | octal mask | — | Run `umask <mask>` to set the file-creation mask for outputs. |
| `-verbose` | bool | off | Set the shell `verbose` variable. |
| `-echo` | bool | off | Set the shell `echo` variable (trace each command). |
| `-debug` | bool | off | Shorthand for `-verbose -echo`. |
| `-version` | bool | — | Print the version string and exit (handled before argument parsing). |
| *(any other token)* | — | — | **Intended** to be forwarded to `minctracc` as an extra option — see the gotcha. |

### Configuration Interactions

> [!gotcha] The minctracc pass-through is broken by an `exit 1` in the parser
> The usage text advertises that you can append "minctracc options", and the
> `default:` branch of the parser does collect unknown tokens into `MTArgs`
> ([`scripts/xsanatreg:160-163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L160-L163)). **However, that same branch
> executes `exit 1` immediately after appending the first unknown token**, so the
> script aborts before it ever reaches the `minctracc` call. In practice this
> means passing any extra `minctracc` option causes a silent non-zero exit. Only
> invocations that use *exclusively* the recognised `-src/-targ/-xfm/...` flags
> reach the registration step (where `MTArgs` is empty and `minctracc` runs with
> its own defaults). Treat the documented pass-through as **non-functional in
> v8.2.0**.

> [!gotcha] `-srcminc` / `-targminc` change what cleanup deletes
> If you redirect the MINC intermediates to explicit paths, cleanup still runs
> `rm -f` on exactly those paths ([`scripts/xsanatreg:86-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L86-L90)), so a
> persistent location you intended to keep will be deleted unless you also pass
> `-nocleanup`.

- `-src`, `-targ`, and `-xfm` are all mandatory; omitting any one is a hard error
  in `check_params` ([`scripts/xsanatreg:171-202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L171-L202)).
- `-tmpdir` only matters when `-srcminc`/`-targminc` are *not* given, since those
  override the auto-named temporaries.

## Typical Use Cases

### 1. Register a follow-up anatomical to a baseline (intended use)

```bash
# Align session-2 anatomy (source) onto session-1 anatomy (target),
# storing the MINC transform. Relies on minctracc's default model.
xsanatreg \
  -src  /data/sub01/sess2/mri/orig \
  -targ /data/sub01/sess1/mri/orig \
  -xfm  /data/sub01/sess2-to-sess1.xfm
```

### 2. Keep the intermediate MINC volumes for inspection

```bash
xsanatreg \
  -src  /data/sub01/sess2/mri/orig \
  -targ /data/sub01/sess1/mri/orig \
  -xfm  /data/sub01/sess2-to-sess1.xfm \
  -srcminc  /data/sub01/sess2.mnc \
  -targminc /data/sub01/sess1.mnc \
  -nocleanup
```

> [!gotcha] No working way to choose the registration model from xsanatreg
> Because the `minctracc` option pass-through aborts the script (see
> Configuration Interactions), there is no functioning command line in v8.2.0
> that both runs `xsanatreg` *and* selects, say, `-lsq6` (rigid) vs. `-lsq12`
> (affine). If you need to control the `minctracc` model, call `minctracc`
> directly on the `.mnc` volumes (as [[mri_motion_correct]] does with
> `minctracc -lsq6`).

## Pipeline Context

`xsanatreg` is a **standalone** cross-session registration helper. It is not
part of any FreeSurfer pipeline: a tree-wide grep of
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)
and `scripts/trac-all` finds no call to it.

**Predecessor:** two anatomical volumes (e.g. COR directories from
[[mri_transform_to_COR]], or `orig.mgz` from
[[wiki/pipelines/recon-all|recon-all]]) → **xsanatreg** → **Successor:** the MINC
`.xfm` transform, optionally converted with [[lta_convert]] for downstream
FreeSurfer resampling.

It is the cross-session sibling of FreeSurfer's other `minctracc` users: the
within-run motion correction in [[mri_motion_correct]] (`minctracc -lsq6`) and
the legacy MNI Talairach estimation reached through [[talairach]] (`mritotal`).

## Gotchas and Caveats

> [!gotcha] Asymmetric error checking between source and target conversion
> The source `mri_convert` is checked for failure (`if($status) exit 1`,
> [`scripts/xsanatreg:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L68)); the target conversion is not. A
> target whose conversion fails will not stop the script at that point.

> [!gotcha] The output `.xfm` is MINC, not FreeSurfer
> Do not feed the result directly to FreeSurfer tools that expect a register.dat
> or `.lta` — it is a MINC world-coordinate transform. See [[lta-format]] and
> [[coordinate-systems]].

## Error Compensation and Guard Rails

- **Existence/writability checks.** `check_params`
  ([`scripts/xsanatreg:171-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L171-L209)) verifies the source and target are
  readable, requires `-xfm`, and creates/validates the output and temporary
  directories before running.
- **Automatic format conversion.** Inputs are converted to MINC on the fly, and
  a sibling `<arg>.mgz` is preferred when present, so you can pass either a COR
  directory or an `.mgz` stem.
- **Temporary-file cleanup.** Intermediates are removed by default; `minctracc`'s
  exit status is captured and propagated as the script's exit code
  ([`scripts/xsanatreg:82-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L82-L94)).

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — converts the input volumes to MINC; the only FreeSurfer binary `xsanatreg` actually runs (besides the external `minctracc`).
- [[mri_motion_correct]] — the other in-tree `minctracc` user; registers a series of runs to the first with `minctracc -lsq6`, a good model for how to drive `minctracc` directly.
- [[talairach]] — legacy MNI-based Talairach estimation (`mritotal`); same MNI toolkit lineage.
- [[lta_convert]] — convert the resulting transform into FreeSurfer `.lta`/register.dat conventions.
- [[mri_transform_to_COR]] — produces the COR directories that were the historical inputs to `xsanatreg`.
- [[registration-overview]], [[coordinate-systems]] — background on registration and the coordinate frames the `.xfm` lives in.

## Confidence and Gaps

**High confidence:** the complete flag set, the conversion-then-`minctracc`
control flow, the `.mgz`-preferred input logic, the asymmetric error checking,
the cleanup behaviour, and — critically — the broken `minctracc` option
pass-through (the `exit 1` in the `default:` parser branch) are all read directly
from [`scripts/xsanatreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg).

> [!gap] minctracc availability and default model
> `minctracc` is an external MNI program and is not present in the v8.2.0
> `$FREESURFER_HOME/bin`. Whether and how a given install resolves it, and what
> default registration model it applies when called with no options (as a bare
> `xsanatreg` invocation does), depend on that external binary and were not
> exercised here.

> [!gap] Output transform flavour and downstream conversion
> The exact `.xfm` variant produced (linear vs. non-linear grid) is determined by
> `minctracc`, and the precise recipe to convert it to a FreeSurfer transform was
> not verified.

## References

- FreeSurfer source: [`scripts/xsanatreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg) (v8.2.0).
- Built-in usage: `xsanatreg` with no arguments ([`scripts/xsanatreg:219-231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xsanatreg#L219-L231)).
- MNI `minctracc` documentation (external): `www.bic.mni.mcgill.ca/users/louis/tracc/tracc_doc/section3_1.html`, cited from [`scripts/talairach:231-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talairach#L231-L232).
