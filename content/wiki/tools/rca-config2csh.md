---
title: "rca-config2csh"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/rca-config2csh"
families: ["rca-*"]
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[rca-config]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - recon-all
  - configuration
  - yaml
  - csh
---

# rca-config2csh

## Summary

`rca-config2csh` is a tiny Python helper that converts a recon-all
configuration YAML (the file produced by [[rca-config]]) into a stream of
**csh `set` statements** printed to stdout. recon-all consumes it with
`eval \`rca-config2csh configfile | grep set\``, which is equivalent to setting
each config parameter as a shell variable directly. It is the second half of
recon-all's option-handling layer: [[rca-config]] writes the YAML, then
`rca-config2csh` injects those values into the running tcsh shell.

## Source Information

- **Language:** Python 3 (uses `pyyaml`)
- **Source file:** [`scripts/rca-config2csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-config2csh`
- **Companion:** [[rca-config]] (produces the YAML this script reads).

## Purpose and Context

recon-all keeps its recognised options in a YAML file ([[rca-config]] parses the
command line into it). Those values must then become shell variables that the
tcsh body of recon-all can use. Rather than re-parse YAML in tcsh, recon-all
runs `rca-config2csh`, which reads the YAML and emits one `set NAME = VALUE`
line per parameter; `eval` of that output sets the variables in place. The
script header states this explicitly: *"running this script with eval is the
same as directly setting parameters in the shell"*
([`scripts/rca-config2csh:3-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L3-L7)).

It does no neuroimaging and runs once, before any processing stage (hence
`recon_all_stage: null`).

## Inputs

### Required Inputs

A single positional argument — the path to a config YAML
([`scripts/rca-config2csh:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L19)):

```
rca-config2csh  configfile
```

`configfile` is normally the `updated-config` file written by [[rca-config]].
Each top-level key is a parameter and must contain a `value` key.

> [!assumption] The YAML has the rca-config schema
> Every parameter must have a `value`; a block without one aborts with
> `error('config parameter "%s" is missing value')`
> ([`scripts/rca-config2csh:26-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L26-L28)). The script reads `sys.argv[1]`
> with no argument-count guard, so running it with no file raises an
> `IndexError` (confirmed: `rca-config2csh` with no args tracebacks).

## Outputs

### Files Created

None. It writes only to **stdout**: one line per parameter, of the form
`set NAME = VALUE` ([`scripts/rca-config2csh:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L48)). The caller captures
this via command substitution + `eval`.

### Output Specifications — value formatting

The value conversion rules ([`scripts/rca-config2csh:31-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L31-L48)):

| YAML value | Emitted as | Notes |
|------------|-----------|-------|
| string | `"value"` (double-quoted) | switches to single quotes if the string already contains a `"` ([`:32-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L32-L34)) |
| `None` / empty | `()` | csh empty list ([`:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L37-L38)) |
| bool | `1` / `0` | `int(value)` ([`:41-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L41-L42)) |
| list | `( a b c )` | space-separated csh list ([`:45-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L45-L46)) |
| number | bare | as-is |

## Mathematical Foundations

None — this is a YAML-to-csh serialiser.

## Configuration Options

### Complete Flag Reference

`rca-config2csh` has **no option flags**; its entire interface is the single
positional `configfile`.

| "Flag" | Type | Default | Description |
|--------|------|---------|-------------|
| `configfile` (positional 1) | path | — | The recon-all config YAML to convert to csh `set` statements. |

### Configuration Interactions

None. The behaviour is fully determined by the YAML's value types (see the
formatting table above).

> [!gotcha] Boolean → 0/1, so test with the numeric value
> A YAML `value: True`/`False` becomes `set NAME = 1`/`0`, not a tcsh keyword.
> recon-all therefore tests these as integers (e.g. `if($NAME) …`), which matches
> the `int(bool)` conversion ([`scripts/rca-config2csh:41-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L41-L42)).

## Typical Use Cases

### 1. As recon-all calls it (the only real use)

```tcsh
# recon-all:465 — set every config parameter as a shell variable.
eval "`rca-config2csh $tmp_config | grep set`"
```

The `grep set` is a deliberate guard: recon-all's comment warns that the call
"assumes that there will be no superfluous terminal output, but this is not
necessarily the case", so it filters to only the `set …` lines
([`scripts/recon-all:461-465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L461-L465)).

### 2. Inspect the generated csh

```bash
rca-config2csh /tmp/out.yaml
# set GCA = "RB_all_2020-01-02.gca"
# set SkipNuIntensityCor = 0
# ...
```

## Pipeline Context

`rca-config2csh` runs immediately after [[rca-config]] at the top of
[[wiki/pipelines/recon-all|recon-all]], before any processing stage
([`scripts/recon-all:461-465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L461-L465)). It reads the YAML that
`rca-config` wrote ([`scripts/recon-all:455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L455)) and its `eval`-ed output
defines the recon-all variables used throughout the rest of the script.

**Predecessor:** [[rca-config]] (writes the updated YAML) → **rca-config2csh**
(YAML → csh `set`, eval'd) → **Successor:** the body of
[[wiki/pipelines/recon-all|recon-all]] (uses the now-set variables).

## Gotchas and Caveats

> [!gotcha] No argument-count check
> `configfile = sys.argv[1]` has no guard ([`scripts/rca-config2csh:19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L19)),
> so invoking the script with no argument (e.g. `rca-config2csh --help`) raises an
> `IndexError` rather than printing usage. It is meant to be called only by
> recon-all with a real config file.

> [!gotcha] Quote-switching can break on strings containing both quote types
> A string is double-quoted unless it contains a `"`, in which case it is
> single-quoted ([`scripts/rca-config2csh:32-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L32-L34)). A value containing
> **both** a single and a double quote is not escaped and would produce malformed
> csh — not a concern for the shipped config, whose values are plain filenames
> and flags.

## Error Compensation and Guard Rails

- **Missing `value` is caught** with a clear `error:` message and exit 1
  ([`scripts/rca-config2csh:26-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh#L26-L28)).
- **Caller-side guard:** recon-all pipes the output through `grep set` before
  `eval`, so any stray non-`set` output cannot corrupt the shell
  ([`scripts/recon-all:465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L465)).

## Related Tools

- [[rca-config]] — produces the YAML that this script converts; the two are always used together.
- [[wiki/pipelines/recon-all|recon-all]] — the sole caller; `rca-config2csh` injects the parsed config into its shell.

## Confidence and Gaps

**High confidence:** the single-positional interface, the value-formatting rules
(string quoting, `None`→`()`, bool→`0/1`, list→`( … )`), the stdout-only output,
the missing-value guard, and the exact `eval \`… | grep set\`` call site — all
read directly from [`scripts/rca-config2csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh)
and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all). No open questions.

## References

- FreeSurfer source: [`scripts/rca-config2csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config2csh) (v8.2.0).
- Call site: [`scripts/recon-all:461-465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L461-L465).
