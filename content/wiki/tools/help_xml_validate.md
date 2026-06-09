---
title: "help_xml_validate"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/help_xml_validate"
families: []                     # developer/CI help-XML validator (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mkxmldoc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether help_xml_validate is wired into an automated `make check` target in v8.2.0 (vs. run manually) was not confirmed from the build files; only its install in scripts/CMakeLists.txt was verified."
tags:
  - developer
  - documentation
  - xml
  - validation
  - testing
---

# help_xml_validate

## Summary

`help_xml_validate` is a developer/CI utility that validates every FreeSurfer
tool's `--help` XML document (`*.help.xml`) against the FreeSurfer help-document
schema. It iterates over all `*.help.xml` files in a source directory and runs
`xmllint` on each with post-DTD validation, so a malformed or schema-violating
help document fails the check. It exists to keep the structured help/manpage
sources well-formed; it is not a user-facing imaging tool.

## Source Information

- **Language:** tcsh shell script (shebang `#!/bin/tcsh -ef` — note `-e`, exit on
  first error)
- **Source file:** [`scripts/help_xml_validate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate)
- **Binary/script location:** `$FREESURFER_HOME/bin/help_xml_validate`
- **External dependency:** `xmllint` (from libxml2). The script is a thin loop
  around it.

## Purpose and Context

Many FreeSurfer binaries embed (or ship alongside) a `<tool>.help.xml` file that
encodes the tool's synopsis, arguments, outputs, examples, and references in a
fixed XML vocabulary (`help`, `name`, `synopsis`, `description`, `arguments`,
`required-flagged`, `optional-flagged`, `outputs`, `example`, …). That vocabulary
is declared as an **internal DTD** at the top of each help file (a
`<!DOCTYPE help [ … ]>` block). `help_xml_validate` is the gate that checks every
such file still conforms to that DTD — the kind of check run during the build /
`make check` so a developer who edits a help document and breaks its structure
finds out immediately rather than shipping a help file that tools (or the wiki
generator) cannot parse. It is a **build-time documentation QA** tool and has no
role in the recon-all processing stream.

## Inputs

### Required Inputs

- **A directory containing `*.help.xml` files.** The directory is chosen as
  follows ([`scripts/help_xml_validate:4-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate#L4-L7)):
  1. defaults to the current working directory (`$PWD`);
  2. if the environment variable `srcdir` is set (as it is in the `make check`
     runtime environment), that path is used instead.

### Input Assumptions

> [!assumption] At least one `*.help.xml` in the target directory
> The script globs `${SRCDIR}/*.help.xml` ([`scripts/help_xml_validate:8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate#L8)).
> If the directory contains none, the `ls` glob fails to match and (under tcsh)
> prints "No match." — as seen when the tool is run from an empty directory. Each
> matched file is assumed to carry its own internal DTD (`<!DOCTYPE help [ … ]>`),
> which is what `--postvalid` validates against.

## Outputs

### Files Created

None. `xmllint` writes validation results to stderr/stdout; the script's value is
its **exit status** (non-zero if any file fails to validate, because `-e` makes
tcsh abort on the first failing command).

### Output Specifications

For each file, `xmllint --timing` prints parse/validation timing to stderr, and
any DTD violation is reported as an `xmllint` validity error. `--noout`
suppresses echoing the document itself, so a clean run produces only timing
lines.

## Mathematical Foundations

None — this is a documentation-validation wrapper; it performs no numerical
computation.

## Configuration Options

### Complete Flag Reference

`help_xml_validate` itself takes **no** command-line flags; its only input is the
directory, selected via the `srcdir` environment variable (or `$PWD`). The flags
below are the fixed `xmllint` options it always applies to each file
([`scripts/help_xml_validate:9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate#L9)):

| Flag (passed to `xmllint`) | Type | Default | Description |
|----------------------------|------|---------|-------------|
| `--noout` | bool | on | Do not print the re-serialised document; report only errors/timing. |
| `--postvalid` | bool | on | Validate against the (internal) DTD **after** parsing, so entity-defined content is validated too. |
| `--walker` | bool | on | Use the streaming reader (xmlTextReader) API to walk the tree rather than building a full DOM. |
| `--timing` | bool | on | Print parse/validation timing for each file. |

| Environment variable | Type | Default | Description |
|----------------------|------|---------|-------------|
| `srcdir` | string (path) | `$PWD` | Directory whose `*.help.xml` files are validated. Set automatically by the `make check` harness. |

### Configuration Interactions

There are no script-level options to conflict. The only control is whether
`srcdir` is set: if it is, it overrides the working-directory default
([`scripts/help_xml_validate:4-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate#L4-L7)).

## Typical Use Cases

### Use Case 1: Validate the help XML in a source directory

```bash
# From a directory that contains <tool>.help.xml files:
help_xml_validate
```

Runs `xmllint --noout --postvalid --walker --timing` on every `*.help.xml` in the
directory and exits non-zero on the first invalid file.

### Use Case 2: Validate a specific source subtree (as in `make check`)

```bash
setenv srcdir /path/to/freesurfer/mri_glmfit
help_xml_validate
```

## Pipeline Context

A build/CI documentation-validation step, not part of any imaging pipeline. It is
not called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Its natural
counterpart is the tooling that **generates** help XML / manpages from the
binaries (e.g. `mkxmldoc`/`mkmanpages`): help XML is produced there and validated
here.

**Predecessor:** authoring/generating `*.help.xml` → **help_xml_validate**
(schema check) → **Successor:** packaging the validated help/manpages.

## Gotchas and Caveats

> [!gotcha] Validates against each file's internal DTD, not an external schema
> FreeSurfer help files embed their grammar as an internal DTD
> (`<!DOCTYPE help [ <!ELEMENT help (name, synopsis, description, arguments+, …)> … ]>`).
> `--postvalid` checks each document against **its own** embedded DTD; there is no
> separate `help.dtd`/`.xsd` file. A file with no `DOCTYPE` would parse as
> well-formed but effectively skip structural validation.

> [!gotcha] `-ef` makes it abort on the first bad file
> The shebang is `#!/bin/tcsh -ef`: `-e` aborts the loop as soon as `xmllint`
> returns non-zero. So the run stops at the **first** invalid help file rather
> than reporting all failures; fix and re-run to find the next.

> [!gotcha] Empty directory prints "No match."
> With no `*.help.xml` present, the tcsh glob in the `foreach` fails to expand and
> prints `ls: No match.` ([`scripts/help_xml_validate:8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate#L8)). This is the
> expected behaviour when run outside a source tree, not a tool error.

## Error Compensation and Guard Rails

Minimal by design. The `-e` flag turns any `xmllint` failure into an immediate
non-zero exit (the intended gate behaviour). There is no input sanitisation
beyond the `srcdir`/`$PWD` selection; the tool delegates all validation to
`xmllint`.

## Related Tools

- [[mkxmldoc]] — generates the structured XML help documentation that
  `help_xml_validate` checks (counterpart producer; link may not exist yet).

## Confidence and Gaps

**High confidence:** the entire script is 10 lines; the directory-selection logic,
the glob, and the exact `xmllint` invocation were read directly from
[`scripts/help_xml_validate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate). The help-XML DTD model was confirmed by
inspecting the `<!DOCTYPE help [ … ]>` block embedded in the shipped
`*.help.xml` files.

> [!gap] Automated `make check` wiring
> `help_xml_validate` is installed via
> [`scripts/CMakeLists.txt:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L108), and its `srcdir` handling matches a
> `make check` environment, but a concrete `add_test`/CTest target invoking it in
> v8.2.0 was not located. Whether it runs automatically in current CI or only on
> demand is unconfirmed.

## References

- FreeSurfer source: [`scripts/help_xml_validate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/help_xml_validate) (v8.2.0).
- `xmllint` (libxml2) options: `--postvalid`, `--walker`, `--noout`, `--timing`.
- Help-XML grammar: the internal `<!DOCTYPE help [ … ]>` DTD embedded in each
  shipped `*.help.xml` (e.g. `mris_sphere/mris_sphere.help.xml`).
