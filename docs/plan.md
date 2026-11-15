# Plan

Every phase ends with something that can be seen and with a check. The next phase does not start until the check is green.

| Phase | What is done | Counts as done when | State |
|---|---|---|---|
| **0. Foundations** | Private repository, structure, tests on three systems, plugin skeleton | A test hook reaches the model in Claude Code and in Codex on the owner's machine | Repository and tests done. The live hook test waits for a Claude Code login in the terminal; Codex has no command-line program on this machine yet |
| **1. Benchmark** | 15 to 20 own tasks with hidden checks. Arms: nothing, ponytail (reference), Ockham. The baseline measured | Each check catches a deliberately bad solution, and every session runs isolated from the user's rules and memory | Harness and 5 tasks done. Baseline run pending |
| **2. Rules** | Main and compact ruleset, English and Spanish. One change at a time against the benchmark. Passed on to subagents | Equals or beats ponytail on code size and tests without losing hidden checks | |
| **3. "This already exists"** | Project index and a warning before writing | Reuse goes up on the reuse tasks, with almost no false warnings | |
| **4. Checks at the end** | Checks on what was written: new dependencies, duplicates, risky logic without a test, removed validation, tests not run | Catches the planted problems and rarely interrupts a clean task | |
| **5. Review and audit** | Commands to review a change, audit a repository and list shortcuts | Finds the planted problems, including code that should not be there; reports in the user's language | |
| **6. Memory** | Conventions, decisions and shortcuts stored and recalled | A task in a second session applies a convention learned in the first | |
| **7. Accounts, band and board** | Cost, time, reuse and tests per task; a band in Claude Code; a local page | Every hook stays inside its time budget, on Windows too | |
| **8. Real use** | Installer with backups and uninstall, diagnostics, documentation. Two weeks on real projects | Two weeks without having to switch it off | |

## Demos

The README will show each step working. Those recordings are made from the real tool at the end of phases 2, 4 and 7, in English. Until a step exists there is nothing true to record.

## Risks

| Risk | Cover |
|---|---|
| The warnings annoy and it gets switched off | Everything fails silent. At most one interruption per task. The false-warning rate is a measure that blocks its phase |
| Hooks make the agent slow | A time budget per hook, measured in tests. The index is built apart and read ready-made |
| A host changes and a hook breaks | Two hosts only, a contract test per hook, a diagnostics command |
| It clashes with the user's own rules and memory | An extra benchmark arm with the full real setup |
| The measures only hold on our own tasks | Held-out tasks never used for tuning, and tasks taken from real repositories |
| "Less code" turns into worse code | Correctness is measured first. What must never be cut has hidden checks of its own |
