---
title: "fs_time"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fs_time"
families: []                     # standalone runtime/profiling utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[fs_run_from_mcr]]"
  - "[[fs-check-os]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - infrastructure
  - profiling
  - resource-usage
  - logging
  - recon-all
---

# fs_time

## Summary

`fs_time` is a thin front end for the Unix `/usr/bin/time` program that runs an
arbitrary command and prints a single, machine-parseable line of resource-usage
statistics for it: elapsed wall-clock time, user/kernel CPU seconds, peak
resident memory, page faults, context switches, and file-system I/O counts.
Each line is prefixed with a fixed key (`@#@FSTIME` by default) so that the
numbers can be `grep`-ed out of an otherwise noisy log. It is the mechanism by
which [[wiki/pipelines/recon-all|recon-all]] records how long every internal
step took and how much memory it used. If the GNU `time` binary is missing or
behaves unexpectedly, `fs_time` transparently falls back to running the command
unwrapped, so wrapping a command in `fs_time` is always safe.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fs_time`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_time`
- **External program wrapped:** `/usr/bin/time` (must be the **GNU** version that
  supports `-f`/`--format`; the script verifies this at runtime)
- **Also calls:** `uptime`, `date`, `sed` (for the optional load-average report)

## Purpose and Context

FreeSurfer pipelines run hundreds of individual commands and can take many hours.
To diagnose slow runs, memory blow-ups, and to plan cluster resource requests,
the developers needed a uniform, low-overhead way to capture per-command
resource usage and fold it into the normal text log. `fs_time` provides that:
it standardises the output format of GNU `time`, tags every line with a
greppable key, and — critically — degrades gracefully to a no-op wrapper on
systems where GNU `time` is absent (e.g. some macOS installs, where
`/usr/bin/time` has a different, incompatible interface).

The dominant consumer is [[wiki/pipelines/recon-all|recon-all]], which prepends
`$fs_time` to essentially every binary it launches (≈150 call sites). Many other
FreeSurfer scripts (`trac-all`, `trac-preproc`, `samseg2recon`, `gca-apply`,
`mideface`, `topofit`, `make_average_volume`, and others) do the same. The
post-hoc tooling then scans logs for the `@#@FSTIME` and `@#@FSLOADPOST` keys to
build per-stage timing/memory tables (see
[`scripts/recon-all:5935`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5935)).

## Inputs

### Required Inputs

- **A command line to execute.** Everything after the recognised `fs_time`
  options is treated as the command and its arguments. The first non-option
  token is taken to be the start of the command
  ([`scripts/fs_time:130-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L130-L135)). At least one such token is required;
  with no arguments at all the script prints usage and exits non-zero
  ([`scripts/fs_time:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L20), [`scripts/fs_time:146-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L146-L148)).

### Input Assumptions

> [!assumption] GNU `/usr/bin/time` is the back end
> `fs_time` assumes the system `/usr/bin/time` understands the GNU `-f`/`-o`
> formatting flags and the `%e %S %U %P %M %F %R %W %c %w %I %O` format
> directives. It does **not** use the tcsh built-in `time`. Before timing your
> command it first runs `time -f "$fmt" echo testing` as a probe
> ([`scripts/fs_time:63-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L63-L67)); if that probe fails (non-GNU `time`),
> it abandons timing and just runs your command.

- The command and its arguments must be directly executable by tcsh as
  `$argv` — `fs_time` does not spawn a login shell, so shell built-ins,
  aliases, and complex pipelines are not handled (wrap those in a script).
- `uptime` must be on `PATH` for the load-average feature; if it is not, the
  post-run load report is silently skipped
  ([`scripts/fs_time:74-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L74-L76)).

## Outputs

### Files Created

`fs_time` creates no files of its own unless you ask it to. With `-o outfile`,
the GNU `time` resource line is written to `outfile` (and then echoed to stdout
as well, [`scripts/fs_time:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L71)). Without `-o`, the line goes to
`/dev/stdout` — chosen deliberately because GNU `time` otherwise writes to
stderr, which the author found "annoying"
([`scripts/fs_time:59-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L59-L60)).

| File / stream | When | Contents |
|---------------|------|----------|
| `/dev/stdout` (or `-o` file) | always | one `@#@FSTIME …` resource line per run |
| stdout (`@#@FSLOADPOST …`) | when `FSTIME_LOAD=1` **and** `uptime` is on PATH | post-run 1/5/15-minute load averages |

The wrapped command's own stdout/stderr pass through untouched.

### Output Specifications — the `@#@FSTIME` line

The format string assembled at [`scripts/fs_time:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L48) is:

```
<key> <timestamp> <cmd> N <nargs> e %e S %S U %U P %P M %M F %F R %R W %W c %c w %w I %I O %O [L l1 l5 l15]
```

| Field | Source | Meaning |
|-------|--------|---------|
| key | `-k` (default `@#@FSTIME`) | greppable tag |
| timestamp | `date '+%Y:%m:%d:%H:%M:%S'` | time at onset of execution |
| cmd | `$argv[1]` | the command name (first token only) |
| `N` | computed | number of arguments passed to the command (`$#argv - 1`, [`scripts/fs_time:35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L35)) |
| `e` | GNU `%e` | elapsed real (wall-clock) seconds |
| `S` | GNU `%S` | CPU-seconds in kernel mode |
| `U` | GNU `%U` | CPU-seconds in user mode |
| `P` | GNU `%P` | percent CPU used, `(U+S)/e` |
| `M` | GNU `%M` | maximum resident set size, **Kbytes** |
| `F` | GNU `%F` | major page faults (read from disk) |
| `R` | GNU `%R` | minor (reclaimable) page faults |
| `W` | GNU `%W` | times swapped out of main memory |
| `c` | GNU `%c` | involuntary context switches |
| `w` | GNU `%w` | voluntary context switches (e.g. waiting on I/O) |
| `I` | GNU `%I` | file-system inputs |
| `O` | GNU `%O` | file-system outputs |
| `L l1 l5 l15` | `uptime` | 1/5/15-min load averages (only if `FSTIME_LOAD`) |

Example (from the built-in help, [`scripts/fs_time:228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L228)):

```
@#@FSTIME 2016:01:21:18:27:08 mri_convert N 2 e 2.20 S 0.05 U 1.64 P 77% M 23628 F 0 R 5504 W 0 c 7 w 3 I 0 O 20408
```

> [!gotcha] `N` counts the command's own args, not the count you might expect
> `N` is `$#argv - 1` evaluated **after** option parsing, i.e. the number of
> tokens following the command name. For `fs_time mri_convert a.mgz b.mgz`,
> `N = 2`. The command name itself is not counted.

## Mathematical Foundations

None — `fs_time` performs no numerical computation. All statistics come from the
kernel via GNU `/usr/bin/time` (which reads `getrusage(2)` / `wait4(2)` fields).
The only arithmetic the script does is `@ nargs = $#argv - 1` to count arguments
([`scripts/fs_time:35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L35)) and the `$#upt - 1`/`$#upt - 2` index math used to
pull the three load-average numbers out of the `uptime` output
([`scripts/fs_time:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L38-L42)). The percent-CPU field `P` is computed by GNU `time`
itself as $(U+S)/e$, not by this script.

## Configuration Options

### Complete Flag Reference

All options are parsed in the loop at
[`scripts/fs_time:91-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L91-L138). Option parsing stops at the **first
unrecognised token**, which is treated as the start of the command to run; so
options must precede the command.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-o` | string (path) | stdout | Write the resource line to this file (also echoed to stdout). Without it, the line goes to `/dev/stdout` instead of GNU `time`'s usual stderr. [`scripts/fs_time:107-110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L107-L110) |
| `-k` | string | `@#@FSTIME ` | Override the line-prefix key used for grepping. [`scripts/fs_time:112-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L112-L115) |
| `-l`<br>`-load` | bool | on (via `FSTIME_LOAD`) | Turn on the `uptime` load-average report (`@#@FSLOADPOST` line). [`scripts/fs_time:117-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L117-L120) |
| `-no-load` | bool | — | Turn off the load-average report (`setenv FSTIME_LOAD 0`). [`scripts/fs_time:121-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L121-L123) |
| `-debug` | bool | off | Enable tcsh `set echo`/`verbose` tracing of the script. [`scripts/fs_time:125-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L125-L128) |
| `-help` | bool | — | Print usage plus the full `BEGINHELP` block and exit non-zero. [`scripts/fs_time:97-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L97-L100) |
| `-version` | bool | — | Print the version string (`fs_time 8.2.0`) and exit 0. [`scripts/fs_time:102-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L102-L105) |

### Environment Variables

These are read at runtime and change behaviour without a flag:

| Variable | Default | Effect |
|----------|---------|--------|
| `FS_TIME_ALLOW` | unset → treated as 1 | If **0**, `fs_time` skips all timing, runs the command directly, and returns its status ([`scripts/fs_time:5-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L5-L7), [`scripts/fs_time:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L30-L33)). The master off-switch. |
| `FSTIME_LOAD` | unset → set to 1 | If **1**, run `uptime` after the command and emit the `@#@FSLOADPOST` load line ([`scripts/fs_time:13-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L13-L16), [`scripts/fs_time:76-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L76-L82)). Toggled by `-l`/`-no-load`. |

### Configuration Interactions

> [!gotcha] Options must come *before* the command
> Parsing stops at the first token `fs_time` does not recognise, which it then
> treats as the command name ([`scripts/fs_time:130-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L130-L135)). Anything that
> looks like an `fs_time` option but is meant for *your* command will be
> swallowed if it appears before the command name. Put all `fs_time` options
> first, e.g. `fs_time -o t.dat -k MYKEY mri_convert a b`. A leading `-o` etc.
> belonging to the wrapped program would be misinterpreted.

> [!gotcha] `FS_TIME_ALLOW=0` overrides everything else
> When `FS_TIME_ALLOW=0`, the script bypasses option handling of timing
> entirely: it just runs `$argv` and exits with that status
> ([`scripts/fs_time:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L30-L33)). `-o`, `-k`, `-l` are still parsed (parsing
> runs first) but have no observable effect because no resource line is emitted.

- `-l`/`-load` and `-no-load` simply set `FSTIME_LOAD`; the last one on the
  command line (or the environment default) wins.
- `-k` changes both the `@#@FSTIME` prefix and is independent of the
  `@#@FSLOADPRE`/`@#@FSLOADPOST` keys, which are hard-coded and **not** affected
  by `-k` ([`scripts/fs_time:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L81)). If you re-key the timing line for a custom
  parser, the load line still carries the default key.

## Typical Use Cases

### 1. Time a single command, print to screen

```bash
fs_time mri_convert orig.mgz out.mgz
# ... mri_convert's normal output ...
# @#@FSTIME 2026:06:09:14:02:11 mri_convert N 2 e 2.20 S 0.05 U 1.64 P 77% M 23628 F 0 R 5504 W 0 c 7 w 3 I 0 O 20408
```

### 2. Save the resource line to a file

```bash
fs_time -o resource.dat mris_inflate lh.smoothwm lh.inflated
cat resource.dat   # the same @#@FSTIME line, now persisted
```

### 3. Collect timing across a whole log and total it

```bash
# recon-all already prefixes every step with fs_time; harvest the result:
grep '@#@FSTIME' $SUBJECTS_DIR/bert/scripts/recon-all.log \
  | awk '{for(i=1;i<=NF;i++) if($i=="e") s+=$(i+1)} END{print s" CPU-wall-seconds total"}'
```

### 4. Disable timing globally (e.g. on a host without GNU time)

```bash
setenv FS_TIME_ALLOW 0      # tcsh
# or:  export FS_TIME_ALLOW=0   # bash
# Now every `fs_time <cmd>` just runs <cmd> with no overhead and no FSTIME line.
```

## Pipeline Context

`fs_time` is an infrastructure wrapper, not a processing step. It does not appear
as a stage in the recon-all stream; instead it sits *around* every other stage.

In [[wiki/pipelines/recon-all|recon-all]], timing is **on by default**
(`set DoTime = 1`, [`scripts/recon-all:38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L38)). Early in the run,
recon-all probes for the wrapper with `fs_time ls` and only enables it if that
succeeds, storing the program name in a variable
([`scripts/recon-all:536-539`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L536-L539)):

```tcsh
if ($DoTime) then
  fs_time ls >& /dev/null
  if ( ! $status) set fs_time=(fs_time)
endif
```

Thereafter each command is launched as `$fs_time $cmd` (e.g.
[`scripts/recon-all:1246`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1246)); when timing is disabled `$fs_time` is empty and
the command runs bare. The `-notime` flag to recon-all sets `DoTime = 0`
([`scripts/recon-all:8037-8038`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8037-L8038)); `-time` forces it on
([`scripts/recon-all:8033-8035`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8033-L8035)). `trac-all` uses the same `$fs_time`
variable but defaults it **off** (`set DoTime = 0`,
[`scripts/trac-all:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L52-L53)).

**Predecessor:** *(none — wraps an arbitrary command)* → **fs_time** →
**Successor:** the wrapped command (e.g. [[wiki/tools/mri_convert|mri_convert]],
`mris_inflate`, …) inside [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] Silent fall-through to "just run it" in three cases
> `fs_time` runs your command **without** producing a timing line, returning the
> command's own status, when any of these hold: `FS_TIME_ALLOW=0`
> ([`scripts/fs_time:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L30-L33)); `/usr/bin/time` does not exist
> ([`scripts/fs_time:54-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L54-L57)); or the GNU-format probe fails
> ([`scripts/fs_time:63-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L63-L67)). This is by design (portability), but it means
> "no `@#@FSTIME` line appeared" does not imply "the command failed" — check the
> command's own output.

> [!gotcha] Memory `M` is RSS in **Kbytes**, not bytes or MB
> The `M` field is GNU `time`'s maximum resident set size in kilobytes. Divide by
> 1024 for MB. On some older Linux kernels GNU `time` over-reports `%M` by a
> factor of 4 — a known GNU `time` quirk, not a FreeSurfer one.

> [!gotcha] Only the first command token is recorded as the name
> The `cmd` field is `$argv[1]` only. If you wrap a one-liner like
> `fs_time sh -c 'foo | bar'`, the recorded command name is `sh`, and `N` counts
> `-c` and the script string, not the pipeline's internals.

> [!gotcha] The `-debug` flag sets `verbose` before it is declared
> `-debug` does `set verbose = 1; set echo = 1` ([`scripts/fs_time:125-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L125-L128)).
> This is the idiomatic tcsh debug switch and is harmless, but note it only
> traces the *script*, not the wrapped command.

## Error Compensation and Guard Rails

- **Portability fallback.** The three guard checks above (allow-flag, binary
  existence, GNU-format probe) make `fs_time` a no-op wrapper rather than a hard
  failure on systems lacking GNU `time`. This is the whole reason recon-all can
  safely prefix `$fs_time` everywhere.
- **Status preservation.** In every path the exit status returned is the wrapped
  command's status, captured as `set st = $status` immediately after the timed
  run ([`scripts/fs_time:69-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L69-L70)) and used for the final `exit $st`
  ([`scripts/fs_time:84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L84)). The load-average post-step does not clobber it.
- **`uptime` guard.** The post-run load report runs only if `which uptime`
  succeeds ([`scripts/fs_time:74-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L74-L76)), so a missing `uptime` does not break
  anything.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the principal user; wraps ≈150 internal commands in `$fs_time` and harvests the `@#@FSTIME` lines for per-stage timing/memory.
- [[fs-check-os]] — sibling runtime-environment utility (checks OS compatibility) called by recon-all in the same start-up region.
- [[fs_run_from_mcr]] — sibling runtime wrapper that, like `fs_time`, prefixes another command to alter its execution environment (library path rather than timing).
- `/usr/bin/time` (GNU) — the external program `fs_time` is a front end to; consult its man page for the `%`-directive semantics.

## Confidence and Gaps

**High confidence:** the complete option set, the two controlling environment
variables, the exact format string and field meanings, the three fall-through
conditions, and the recon-all/trac-all integration were all read directly from
[`scripts/fs_time`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time) and confirmed against the installed `fs_time -help`
output (which matches the source verbatim).

> [!gap] `@#@FSLOADPRE` line is dead code
> The pre-run load line is present only as a commented-out `echo` at
> [`scripts/fs_time:41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L41); only the **post**-run `@#@FSLOADPOST` line is
> actually emitted. The variable `upt` is computed before the run
> ([`scripts/fs_time:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L38-L42)) but, in the load-on case, is appended to the
> format string as the trailing `L l1 l5 l15` of the `@#@FSTIME` line, capturing
> the *pre*-run averages there. Parsers that key on `@#@FSLOADPRE` will find
> nothing.

## References

- FreeSurfer source: [`scripts/fs_time`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time) (v8.2.0).
- Built-in help: `fs_time -help` (the `BEGINHELP` block, [`scripts/fs_time:173-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_time#L173-L259)).
- GNU `time` manual — for the `%e %S %U %P %M %F %R %W %c %w %I %O` format directives reproduced in the format string.
