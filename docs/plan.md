# Plan

Every phase ends with something that can be seen and with a check. The next phase does not start until the check is green.

| Phase | What is done | Counts as done when | State |
|---|---|---|---|
| **0. Foundations** | Private repository, structure, tests on three systems, plugin skeleton | A test hook reaches the model in Claude Code and in Codex on the owner's machine | Done for Claude Code: `npm run hook:live` passes on a real session. Codex is open: this machine has its app but no command-line program to run the test with |
| **1. Benchmark** | 15 to 20 own tasks with hidden checks. Arms: nothing, ponytail (reference), Ockham. The baseline measured | Each check catches a deliberately bad solution, and every session runs isolated from the user's rules and memory | Done: 18 tasks that run inside one project, 39 reference solutions told apart by the self-test, sessions shown to be isolated, and the baseline in [baseline.md](baseline.md). Open: the tasks are small, see the limits in that file |
| **2. Rules** | Main and compact ruleset, English and Spanish. One change at a time against the benchmark. Passed on to subagents | Equals or beats ponytail on code size and tests without losing hidden checks | Done, closed by the owner on 15 November 2026. Version 1 is written, in both sizes and both languages, and reaches sessions and subagents on a live test. Measured in [rules.md](rules.md): it passes every hidden check in 105 sessions of 110 against ponytail's 86, and leaves a test in 60 of 70 against 7. On code size it equals ponytail at the median and not on average (6.3 lines against 3.8; 5.3 against 4.0 on the tasks both solve): the bar was met on hidden checks and tests and missed by that much on size, and the phase was closed with that on record. Carried forward: the copy of a fixed bug in another module, which no wording fixed (phase 4), and what a session costs, which the plan had no bar for and has one from phase 3 on |
| **3. "This already exists"** | Project index and a warning before writing | Reuse goes up on the reuse tasks, with almost no false warnings. Added when phase 2 closed: a session with the index costs no more than one with the rules alone | Done, closed by the owner on 15 November 2026. Built and measured in [index.md](index.md), in two rounds. With the index and no rules, reuse goes from 16 sessions of 25 to 15 of 15; on top of the rules it had nothing left to add, because they already reuse every time. No false warning in 546 sessions. On cost: a sixth less than the rules alone on the tasks it was developed on, the same on the nine tasks of the first validation, and on the six of the second a twentieth less with a sixth less time. A shorter list and no list were tried and cost the same, so it ships whole. Not in the plan: when an edit replaces a line that another file has too, with the same names or with others, a note names that file, which is what no wording of rule 4 achieved in phase 2. The rule about tests stays on, by the owner's decision. Carried forward to phase 4: a session that reports a check it did not make, an open redirect that gets through with the rules or without, and the sentence about where the tests are, which a session with no rules reads as an order |
| **4. Checks at the end** | Checks on what was written: new dependencies, duplicates, risky logic without a test, removed validation, tests not run | Catches the planted problems and rarely interrupts a clean task | |
| **5. Review and audit** | Commands to review a change, audit a repository and list shortcuts | Finds the planted problems, including code that should not be there; reports in the user's language | |
| **6. Memory** | Conventions, decisions and shortcuts stored and recalled | A task in a second session applies a convention learned in the first | |
| **7. Accounts, band and board** | Cost, time, reuse and tests per task; a band in Claude Code; a local page | Every hook stays inside its time budget, on Windows too | |
| **8. Real use** | Installer with backups and uninstall, diagnostics, documentation. Two weeks on real projects | Two weeks without having to switch it off | |

## Demos

The README shows each step working, as its phase lands. The first has been there since phase 3: one ticket without Ockham and with it, drawn by `docs/demo/build.mjs` from two recorded sessions, with a test that fails if the picture stops matching the recordings. The others are made from the real tool at the end of phases 4 and 7, in English. Until a step exists there is nothing true to record.

## Risks

| Risk | Cover |
|---|---|
| The warnings annoy and it gets switched off | Everything fails silent. At most one interruption per task. The false-warning rate is a measure that blocks its phase |
| Hooks make the agent slow | A time budget per hook, measured in tests. The index is built apart and read ready-made |
| A host changes and a hook breaks | Two hosts only, a contract test per hook, a diagnostics command |
| It clashes with the user's own rules and memory | An extra benchmark arm with the full real setup |
| The measures only hold on our own tasks | Held-out tasks never used for tuning, and tasks taken from real repositories |
| "Less code" turns into worse code | Correctness is measured first. What must never be cut has hidden checks of its own |
| Doing the whole job costs more than doing part of it | What a session costs is measured in every run and, from phase 3 on, is a bar: a mechanism that adds steps has to pay for them |
