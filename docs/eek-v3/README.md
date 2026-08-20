# Engineering Execution Kernel v3.0

EEK v1.0 is the project’s error diagnosis and repair pipeline. It is implemented as executable modules, not as instructions asking a model to pretend that commands were run.

## Purpose

Given a bug report and a real reproduction command, EEK:

1. Classifies the problem as trivial, standard, or complex.
2. Runs the reproduction command and captures stdout, stderr, exit code, and timeout state.
3. Collects readable project files plus current Git status and diff when available.
4. Requests one to three independent repair candidates from the language model.
5. Applies each candidate as an exact, bounded text replacement.
6. Runs the real validation command after each candidate, then rolls the files back.
7. Arbitrates only among candidates that actually passed validation.
8. Retries up to three rounds using the real validation failures as feedback.
9. Escalates instead of claiming success when evidence or validation is missing.

Every run also returns an in-memory `phaseLog` containing phase transitions, command results, validation output, retry feedback, and escalation reasons.

## Code map

| Responsibility | Module |
|---|---|
| Orchestration and retry loop | `src/eek/orchestrator.mjs` |
| Complexity classification | `src/eek/triage.mjs` |
| Real subprocess execution | `src/eek/command-runner.mjs` |
| Reproduction and project evidence | `src/eek/evidence.mjs` |
| Responses API client | `src/eek/llm-client.mjs` |
| Independent candidate generation | `src/eek/specialists.mjs` |
| Grounded candidate validation | `src/eek/validator.mjs` |
| Passing-candidate selection | `src/eek/arbiter.mjs` |
| Output contract | `src/eek/reporter.mjs` |
| User entry point | `src/eek-cli.mjs` |

## Safety rules

- The reproduction and validation commands come from the user or the command line.
- Commands suggested by a model are recorded as suggestions but are not executed automatically.
- Candidate edits must target a relative path inside the project.
- Candidate edits must match exactly one existing piece of text.
- Validation changes are rolled back unless `--apply` is explicitly requested.
- `--apply` performs a second validation before keeping the selected change.
- No candidate is called verified from model confidence alone.
- A command timeout or missing evidence produces an escalation result.

## Output contract

Reports include diagnosis, root cause, fix summary, real validation command and output, confidence, and open risks or unverified areas. Escalated reports explicitly state that no verified fix is being claimed.

## Current scope

The first implementation targets error diagnosis and repair. It intentionally does not yet generalize the pipeline to feature work, refactoring, or multi-repository changes. That expansion should follow a set of real bug runs, as required by the v3.0 build specification.
