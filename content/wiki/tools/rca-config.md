---
title: "rca-config"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/rca-config"
families: ["rca-*"]
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[rca-config2csh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The set of parameters and flags is defined entirely by $FREESURFER_HOME/etc/recon-config.yaml (37 parameters in 8.2.0); rca-config itself hard-codes none of them, so the exact flag list is data-driven and lives in that YAML, not the script."
tags:
  - recon-all
  - configuration
  - yaml
  - argument-parsing
---

# rca-config

## Summary

`rca-config` is the configuration front end of
[[wiki/pipelines/recon-all|recon-all]]. It reads a **source YAML config**
(`$FREESURFER_HOME/etc/recon-config.yaml`) in which each recon-all parameter
declares its default value and the command-line flag(s) that set it, builds an
`argparse` parser from those declarations, parses recon-all's command line, and
writes an **updated YAML** with the parsed values filled in. Every command-line
argument it does **not** recognise is relayed verbatim to a separate
"unknown-args" file so recon-all can parse the rest itself. It is the mechanism
that lets recon-all keep its large parameter set in a declarative YAML file
rather than in hand-written tcsh argument-parsing code.

## Source Information

- **Language:** Python 3 (uses `pyyaml` and `argparse`)
- **Source file:** [`scripts/rca-config`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-config`
- **Config it reads:** `$FREESURFER_HOME/etc/recon-config.yaml` (the source config; 37 parameters in 8.2.0)
- **Companion:** [[rca-config2csh]] turns the YAML this script writes into csh `set` statements.

## Purpose and Context

recon-all has on the order of a hundred command-line options. Rather than parse
them all in tcsh, v7+/v8 recon-all delegates the recognised subset to a
**declarative YAML** (`recon-config.yaml`) and a small Python parser,
`rca-config`. Each YAML block names a parameter, its default `value`, the
`flags` that change it, and (for booleans) an `action` or (for multi-value
options) `nargs`. `rca-config` turns that data into an `argparse` parser, applies
it to the user's recon-all command line, and emits an updated YAML where each
parameter's `value` reflects the user's choices.

recon-all then sources those values into the shell via
[[rca-config2csh]] (`eval \`rca-config2csh …\``), and parses whatever
`rca-config` did **not** recognise using its own tcsh `parse_args`. So the two
scripts form recon-all's option-handling layer:

```
recon-all argv → rca-config (recognised flags → updated YAML; rest → unknown file)
              → rca-config2csh (YAML → csh `set …`)   → recon-all variables
              → recon-all tcsh parse_args (unknown file)
```

`rca-config` is invoked once, very early, **before** any processing stage (hence
`recon_all_stage: null`). It performs no neuroimaging — it is pure
configuration plumbing.

## Inputs

### Required Inputs

`rca-config` is positional-only — there are no option flags of its own. Usage
([`scripts/rca-config:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L48)):

```
rca-config  source-config  updated-config  unknown-args-file  args...
```

| Position | Meaning |
|----------|---------|
| `source-config` | input YAML defining parameters, defaults, and flags (recon-all passes `$FREESURFER_HOME/etc/recon-config.yaml`) |
| `updated-config` | output path for the YAML with parsed values written in |
| `unknown-args-file` | output path; every unrecognised CLI token is written here, one per line |
| `args...` | the command line to parse (recon-all forwards its own `$argv`) |

It exits with usage if fewer than 3 arguments are given
([`scripts/rca-config:47-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L47-L49)).

### Source-config YAML schema

The accepted YAML grammar is documented in the script's own header
([`scripts/rca-config:5-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L5-L35)). Each top-level key is a parameter:

```yaml
# value-taking flag (expects one argument):
Parameter:
    value: default
    flags: --flag-name

# boolean flag (no argument); action enable→store_true, disable→store_false:
Parameter:
    value: False
    flags: --flag-name
    action: enable        # or: disable

# multi-argument flag:
Parameter:
    value: [ a, b, c, d ]
    flags: --flag-name
    nargs: 4              # or '+' for a variable number
```

`flags` may be a single flag or a YAML list of equivalent flags. A real example
from the shipped config ([`$FREESURFER_HOME/etc/recon-config.yaml`]):

```yaml
GCA:
    value: RB_all_2020-01-02.gca
    flags: -gca
    descr: Gaussian Classifier Array atlas used for segmentation
SkipNuIntensityCor:
    value: False
    flags: -skip-nu-intensity-cor
    action: enable
    descr: Turns off -nuintensitycor and forces nu.mgz to be a link to orig.mgz
```

> [!assumption] The source config is well-formed and complete
> Every parameter must declare `flags` and a `value`; otherwise `rca-config`
> aborts with `error()` ([`scripts/rca-config:72-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L72-L74),
> [`:94-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L94-L95)). It also assumes a `descr` key exists for every
> parameter, because it is written back unconditionally
> ([`scripts/rca-config:137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L137)) — a parameter lacking `descr` raises a
> `KeyError` (see gotcha).

## Outputs

### Files Created

| File | Contents |
|------|----------|
| `updated-config` (arg 2) | a regenerated YAML: a `# auto-generated config file` header, an optional `# recon-all version:` line, then every parameter with its (possibly updated) `value`, its `flags`, its `action`/`nargs`, and its `descr` ([`scripts/rca-config:110-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L110-L138)). |
| `unknown-args-file` (arg 3) | every CLI token `argparse` did not consume, one per line ([`scripts/rca-config:141-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L141-L143)). |

### Output Specifications

The updated YAML preserves the schema of the input so it can be re-read by
[[rca-config2csh]]. List values are re-serialised as `[a, b, c]`
([`scripts/rca-config:123-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L123-L125)); list-valued `flags` likewise
([`scripts/rca-config:127-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L127-L130)). If the environment variable
`FS_RECON_VERSION` is set, its value is recorded as a comment for provenance
([`scripts/rca-config:114-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L114-L117)).

## Mathematical Foundations

None — `rca-config` is a YAML-driven argument parser and serialiser. There is no
numerical computation.

## Configuration Options

### Complete Flag Reference

`rca-config` takes **no flags of its own**; its entire interface is the three
positional file arguments plus the forwarded `args...`. The *recognised* flags
are whatever the source-config YAML declares (37 parameters in the 8.2.0
`recon-config.yaml`), so the effective flag set is data-driven and version-specific.

| "Flag" | Type | Default | Description |
|--------|------|---------|-------------|
| `source-config` (positional 1) | path | — | YAML defining parameters/flags/defaults. |
| `updated-config` (positional 2) | path | — | Output YAML with parsed values. |
| `unknown-args-file` (positional 3) | path | — | Output file of unrecognised tokens. |
| `args...` (positional 4+) | tokens | — | The command line to parse against the config's flags. |

One implementation detail worth noting: the parser is built with
`add_help=False` and `allow_abbrev=False`, and additionally subclasses
`ArgumentParser` to **override `_get_option_tuples` to return `[]`**
([`scripts/rca-config:51-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L51-L68)). This defeats argparse's prefix-matching
(which in Python > 3.6 still abbreviates single-character options even with
`allow_abbrev=False`), so e.g. `-s` is **not** silently expanded to a
longer flag — important when forwarding recon-all's many short flags.

### Configuration Interactions

> [!gotcha] Boolean parameters must use `action`, not `nargs: 0`
> A parameter with `nargs: 0` is rejected — *"if nargs is 0, use action specifier
> instead"* ([`scripts/rca-config:89-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L89-L90)). Booleans must declare
> `action: enable` (→ `store_true`) or `action: disable` (→ `store_false`); any
> other action string is an error ([`scripts/rca-config:84-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L84-L86)).

> [!gotcha] `action` and `nargs` are alternatives, and `action` wins
> The code checks `action` first; only if `action is None` does it honour `nargs`
> ([`scripts/rca-config:83-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L83-L91)). A YAML block specifying both would
> apply the action and ignore `nargs`.

> [!gotcha] Multiple flags for one parameter share a default and a destination
> When `flags` is a list, the loop adds one argparse argument per flag, all with
> the same `dest=var_name` and the same `default`
> ([`scripts/rca-config:99-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L99-L100)). So any of the equivalent flags
> sets the same parameter; the last one parsed wins if several are given.

> [!gotcha] A parameter missing `descr` crashes the writer
> The output loop reads `var_config['descr']` directly with no `.get()`
> ([`scripts/rca-config:137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L137)). A config block without a `descr` key
> raises an uncaught `KeyError`. Every block in the shipped YAML has one.

## Typical Use Cases

### 1. As recon-all calls it (the only real use)

```bash
# recon-all:455 — parse the user's recon-all command line against the config
rca-config $FREESURFER_HOME/etc/recon-config.yaml \
           $tmp_config $tmp_unknown_args $argv:q
```

`$tmp_config` and `$tmp_unknown_args` are `mktemp` files; `$argv:q` is the
user's quoted recon-all command line.

### 2. Inspect what a command line resolves to

```bash
# See which recon-config parameters a set of flags would change,
# and which flags are NOT handled by the config layer.
rca-config $FREESURFER_HOME/etc/recon-config.yaml /tmp/out.yaml /tmp/unknown.txt \
  -gca myatlas.gca -skip-nu-intensity-cor -i foo.mgz -s subj
cat /tmp/out.yaml      # GCA.value=myatlas.gca, SkipNuIntensityCor.value=True, ...
cat /tmp/unknown.txt   # -i, foo.mgz, -s, subj  (relayed for recon-all to parse)
```

## Pipeline Context

`rca-config` runs at the very top of [[wiki/pipelines/recon-all|recon-all]],
before stage processing, at [`scripts/recon-all:449-459`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L449-L459):

```tcsh
set tmp_config = `mktemp`
set tmp_unknown_args = `mktemp`
rca-config $FREESURFER_HOME/etc/recon-config.yaml $tmp_config $tmp_unknown_args $argv:q
if($status) then
  echo "ERROR: could not configure recon-all parameters"
  exit 1;
endif
```

Its updated YAML is consumed two lines later by [[rca-config2csh]]
([`scripts/recon-all:465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L465)), and recon-all then overwrites `argv`
with the contents of the unknown-args file
([`scripts/recon-all:468-471`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L468-L471)) before running its own tcsh
`parse_args`.

**Predecessor:** recon-all command line (after expert-option injection) →
**rca-config** → **Successor:** [[rca-config2csh]] (eval into shell vars) →
recon-all's tcsh `parse_args` (handles the relayed unknown args).

## Gotchas and Caveats

> [!gotcha] Recognised flags are removed from recon-all's argv
> Anything `rca-config` matches is consumed and written only into the YAML; it
> does **not** reach recon-all's tcsh `parse_args`. Conversely, a flag absent
> from `recon-config.yaml` is relayed unchanged and must be handled by recon-all
> directly. To add a new recon-all option you either extend the YAML (config
> layer) or the tcsh parser (relay layer), not both.

> [!gotcha] No defaulting safety net on the source path
> If `source-config` is missing or unreadable, the bare `open(...)`
> ([`scripts/rca-config:63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L63)) raises and the process exits non-zero;
> recon-all turns that into "ERROR: could not configure recon-all parameters".

## Error Compensation and Guard Rails

- **Explicit schema validation.** Missing `flags`, missing `value`, unknown
  `action`, or `nargs: 0` each abort with a clear `error:` message and exit 1
  ([`scripts/rca-config:43-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L43-L45),
  [`:72-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L72-L95)).
- **Prefix-matching defeated** by the `_get_option_tuples` override so short
  flags are not accidentally abbreviated/expanded
  ([`scripts/rca-config:51-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L51-L55)).
- **Unknown args are preserved, not dropped** — `parse_known_args` returns them
  and they are written out for recon-all
  ([`scripts/rca-config:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L103),
  [`:141-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config#L141-L143)).

## Related Tools

- [[rca-config2csh]] — the companion that converts the YAML `rca-config` writes into csh `set` statements recon-all can eval.
- [[wiki/pipelines/recon-all|recon-all]] — the sole caller; `rca-config` is its declarative option-parsing front end.

## Confidence and Gaps

**High confidence:** the positional interface, the YAML grammar
(`value`/`flags`/`action`/`nargs`/`descr`), the `enable`/`disable` →
`store_true`/`store_false` mapping, the prefix-match override, the unknown-args
relay, the output format, and the exact recon-all call site — all read directly
from [`scripts/rca-config`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config) and
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] The concrete flag set is in the YAML, not the script
> Which recon-all flags are "recognised" depends entirely on
> `$FREESURFER_HOME/etc/recon-config.yaml` (37 parameters in 8.2.0). That file is
> the authoritative list; `rca-config` is generic over it.

## References

- FreeSurfer source: [`scripts/rca-config`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-config) (v8.2.0).
- Config data: `$FREESURFER_HOME/etc/recon-config.yaml`.
- Call site: [`scripts/recon-all:449-471`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L449-L471).
