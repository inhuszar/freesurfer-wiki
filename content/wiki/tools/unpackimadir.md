---
title: "unpackimadir"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/unpackimadir"
families: []                     # standalone Siemens IMA import wrapper
recon_all_stage: null
related:
  - "[[unpackmincdir]]"
  - "[[unpackimadir2]]"
  - "[[mri_probe_ima]]"
  - "[[unpacksdcmdir]]"
  - "[[dcmunpack]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Depends on ima2mnc (IMA->MINC converter), which is NOT present in the inspected v8.2.0 source tree or $FREESURFER_HOME/bin; the tool appears legacy and may not run end-to-end."
tags:
  - ima
  - minc
  - conversion
  - import
  - legacy
---

# unpackimadir

## Summary

`unpackimadir` is a thin front-end wrapper that unpacks a Siemens **`.ima`**
directory by first converting it to MINC with `ima2mnc` and then delegating to
[[unpackmincdir]] to sort and convert the MINC volumes into an FS-FAST sessions
directory. The intermediate MINC files are deleted afterward unless `-keepminc`
is given. Any argument it does not itself recognise is passed straight through to
[[unpackmincdir]]. It is the older, MINC-routed counterpart of the self-contained
[[unpackimadir2]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/unpackimadir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir)
- **Binary/script location:** `$FREESURFER_HOME/bin/unpackimadir`
- **Original author:** Douglas N. Greve, MGH-NMR Center
- **Key helpers invoked:** [`ima2mnc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L117) (IMA→MINC conversion) and [`unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L147) (the actual unpack).

> [!gap] `ima2mnc` not present in this install
> The IMA→MINC converter `ima2mnc` was **not** found in the v8.2.0 source tree or
> in `$FREESURFER_HOME/bin`. Because `unpackimadir` does nothing but call
> `ima2mnc` and then [[unpackmincdir]] (which itself depends on a MINC toolchain
> that is also absent — see that page), this tool appears to be **legacy** and is
> unlikely to run end-to-end on a current FreeSurfer. It is documented here from
> the source. For unpacking `.ima` data without MINC, use [[unpackimadir2]].

## Purpose and Context

`unpackimadir` exists purely to bridge Siemens `.ima` data into the MINC-based
[[unpackmincdir]] pipeline. Its logic is short
([`scripts/unpackimadir:99-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L99-L162)):

1. Create an **empty** MINC working directory (so any new content is known to come
   from `ima2mnc`).
2. Run `ima2mnc <srcdir> <mincdir>`; `ima2mnc` writes its output into a single
   subdirectory of `mincdir`.
3. Discover that subdirectory and call
   `unpackmincdir -src <that subdir> -targ <targdir>`.
4. Remove the temporary MINC files unless `-keepminc` was given.

It is run **by hand**; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **A Siemens `.ima` source directory** — `-src srcdir`
  ([`scripts/unpackimadir:186-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L186-L189)). Must exist
  ([`:248-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L248-L251)).
- **A target directory** — `-targ targdir`
  ([`scripts/unpackimadir:191-194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L191-L194)).

### Input Assumptions

> [!assumption] Siemens `.ima` directory convertible by `ima2mnc`
> The source is assumed to be a directory of Siemens `.ima` files that `ima2mnc`
> can convert. The MINC working directory must be empty before conversion; if it
> is not, the script aborts ([`scripts/unpackimadir:108-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L108-L112)). Downstream
> filename and header assumptions are those of [[unpackmincdir]].

## Outputs

`unpackimadir` produces no volumes of its own — the output volumes, `session.info`,
`seq.info`, and registration files are all created by [[unpackmincdir]] in
`targdir`. `unpackimadir` adds:

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `mincfiles_<pid>/` (temp) | `targdir/` (or `-mincdir` path) | the intermediate MINC files from `ima2mnc`; deleted unless `-keepminc` ([`:104-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L104-L114), [`:159-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L159-L162)) |
| `unpackima.log` | `targdir/` | command, environment, and `ima2mnc` / `unpackmincdir` log ([`:82-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L82-L97)) |

## Mathematical Foundations

None — `unpackimadir` is a wrapper. All conversion math is in `ima2mnc` and the
MINC toolchain reached through [[unpackmincdir]].

## Configuration Options

### Complete Flag Reference

Recognised flags from the argument parser
([`scripts/unpackimadir:177-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L177-L237)). **Any unrecognised flag is
appended to the options passed to [[unpackmincdir]]** ([`:231-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L231-L233)),
so the full configurability is effectively the union of these flags and
[[unpackmincdir]]'s.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src` | string | *(required)* | Source directory of `.ima` files. |
| `-targ` | string | *(required)* | Target directory for the unpacked sessions tree. |
| `-mincdir` | string | `targdir/mincfiles_<pid>` | Directory for the intermediate MINC files (must be empty). |
| `-removeminc` | bool | **on** | Delete the intermediate MINC files after unpacking. |
| `-noremoveminc`<br>`-keepminc` | bool | off | Keep the intermediate MINC files. |
| `-umask` | string | inherited | Sets `MRI_UMASK` for file permissions. |
| `-verbose` | bool | off | tcsh `verbose`; also forwarded to [[unpackmincdir]]. |
| `-echo` | bool | off | tcsh `echo` tracing; also forwarded. |
| `-debug` | bool | off | `verbose` + `echo`; also forwarded. |
| `-version` | bool | — | Print version and exit. |
| *(any other flag)* | — | — | Forwarded verbatim to [[unpackmincdir]] (e.g. `-funcseq`, `-fsd`, `-minconly`, `-nocopy`, `-scanseqinfo`). |

### Configuration Interactions

> [!gotcha] Unknown flags silently flow to [[unpackmincdir]]
> There is no "unrecognized flag" error: the `default` case of the parser collects
> any unmatched argument into `unpackmincdiropts`
> ([`scripts/unpackimadir:231-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L231-L233)). A typo therefore does not fail
> here — it is handed to [[unpackmincdir]], which may itself reject it. To tune
> the MINC unpacking (functional sequence, subdir, format), pass
> [[unpackmincdir]]'s flags directly to `unpackimadir`.

> [!gotcha] `-mincdir` must point at an empty (or non-existent) directory
> The script enforces an empty MINC working directory so it can identify the
> subdirectory `ima2mnc` creates; a non-empty `-mincdir` aborts the run
> ([`scripts/unpackimadir:106-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L106-L112)).

## Typical Use Cases

> [!gotcha] Requires the legacy `ima2mnc` + MINC toolchain
> See the dependency gaps above and on the [[unpackmincdir]] page; on a stock
> v8.2.0 install these helpers may be missing.

### 1. Unpack an IMA directory via MINC

```bash
unpackimadir -src /space/imadir -targ /space/sessions/sub01
```

### 2. Keep the intermediate MINC files

```bash
unpackimadir -src /space/imadir -targ /space/sessions/sub01 -keepminc
```

### 3. Pass options through to unpackmincdir

```bash
# -funcseq/-fsd are not unpackimadir flags; they are forwarded to unpackmincdir.
unpackimadir -src /space/imadir -targ /space/sessions/sub01 \
  -funcseq ep2d_fid_ts_15b3125 -fsd bold
```

## Pipeline Context

`unpackimadir` is a stand-alone **import** wrapper, not called by
[[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** Siemens `.ima` session → **unpackimadir** (`ima2mnc` →
[[unpackmincdir]]) → **Successor:** FS-FAST functional analysis on the emitted
sessions directory.

The self-contained alternative that skips MINC is [[unpackimadir2]] (which converts
`.ima` directly with [[wiki/tools/mri_convert|mri_convert]]). For DICOM-era data
the whole IMA route is superseded by [[unpacksdcmdir]] / [[dcmunpack]].

## Gotchas and Caveats

> [!gotcha] Two layers of legacy dependencies
> `unpackimadir` needs `ima2mnc` **and** everything [[unpackmincdir]] needs
> (`minc_to_bshort`, `minc_to_cor`, `mincinfo`, …). If any are absent the run
> fails. None of `ima2mnc` and several MINC helpers were present in the inspected
> v8.2.0 install.

> [!gotcha] Overwrites an existing target without prompting
> An existing target directory triggers only a WARNING and is reused
> ([`scripts/unpackimadir:65-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L65-L67)).

## Error Compensation and Guard Rails

- **Empty-MINC-dir guard.** Aborts if the MINC working directory is not empty, and
  again if `ima2mnc` produced zero or more-than-one output subdirectory
  ([`scripts/unpackimadir:108-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L108-L112), [`:132-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L132-L140)).
- **Step-failure propagation.** A non-zero status from `ima2mnc` or
  [[unpackmincdir]] aborts the run with a specific error
  ([`:123-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L123-L126), [`:153-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L153-L156)).
- **`pawd` for automounted paths.** Uses `pawd` instead of `pwd` when available,
  to resolve real paths on automounted filesystems ([`:60-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L60-L62)).

## Related Tools

- [[unpackmincdir]] — the back end `unpackimadir` delegates to; pass-through flags target it.
- [[unpackimadir2]] — the MINC-free alternative that converts `.ima` directly with `mri_convert`; preferred when available.
- [[mri_probe_ima]] — inspects individual `.ima` files (used by [[unpackimadir2]], not directly by this wrapper).
- [[unpacksdcmdir]] / [[dcmunpack]] — the DICOM-era replacements for the IMA import route.

## Confidence and Gaps

**Medium confidence.** The wrapper logic, the recognised vs. pass-through flag
handling, the empty-MINC-dir requirement, and the cleanup behaviour are read
directly from
[`scripts/unpackimadir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir).
Confidence is medium because the required `ima2mnc` converter (and the downstream
MINC toolchain) are absent from the inspected install, so end-to-end behaviour
could not be verified.

> [!gap] `ima2mnc` availability
> `ima2mnc` is not in the v8.2.0 source tree or installed bin. Whether it ships in
> some configurations, or has been retired, needs developer confirmation.

## References

- FreeSurfer source: [`scripts/unpackimadir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir) (v8.2.0).
- Built-in usage: `unpackimadir` with no args (the `usage_exit` block, [`scripts/unpackimadir:268-270`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir#L268-L270)).
