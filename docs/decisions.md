# Decisions

Each one says what was chosen, what was left out, what it costs and when it would be reopened.

## D1. Three layers, not only a prompt

Rules, context and checks. Left out: a prompt and nothing else. It costs more work and the risk of nagging. Reopened if the measures of phases 3 and 4 do not beat the prompt alone: then Ockham stays a prompt.

## D2. Measure before writing rules

The benchmark is built first. No rule and no mechanism goes in unless it moves a measure. Left out: writing the ruleset by feel. It costs a slower start. Not reopened: it is the rule of the project.

## D3. Claude Code and Codex first

They are the two agents used every day and both run hooks. Left out: adapters for dozens of agents, which break whenever a host changes. For the rest, a compact rules file is generated to be copied by hand. Reopened when another agent is in daily use, or if Ockham is published.

## D4. A command-line program with hooks; no MCP server

Hooks act on their own, so the agent does not have to remember to call anything. Left out: an MCP server with tools, one more piece to keep alive. Reopened if an agent without hooks needs it.

## D5. JavaScript without a build step and without runtime dependencies

Node.js 20 or later. Hooks run straight from the installed folder. Left out: compiled TypeScript (one more step) and Python (another runtime). It costs editor help, made up for by type-checking the JavaScript in CI.

## D6. A project index built with regular expressions and a cache

Fast, nothing to install. Left out for now: a full parser. Reopened if the hit rate of the "this already exists" warning is not good enough.

## D7. One level to begin with

On or off. Left out: intensity levels, which multiply what has to be measured. Added only if a measure shows they are needed.

## D8. Shortcuts marked in a comment and kept in memory

A deliberate shortcut is marked in the code with its limit and when to revisit it, and also stored with its trigger. In projects that forbid comments, only in memory.

## D9. A new private repository; own text and own code

ponytail is MIT and can be studied, but its text is not pasted here: Ockham's is written from its own measurements. The licence is decided if it is ever published.

## D10. No rule asks the agent to report its own checks

The ruleset says what to do, and never asks the agent to state that it searched, verified or checked something. Left out: a line in the closing report such as "say what you searched for and what you found". It was tried for rule 4 and it produced the statement more often than the search: of five sessions four missed the second place, and all four closed with a search or a check that the project contradicts ([rules.md](rules.md)). A rule like that turns a silent omission into a false claim, which is worse than no rule. What has to be verified is verified by a hook that runs the check and shows the result. It costs waiting: until the checks of phase 4 exist, a copy of a fixed bug in another module is found only when the agent's first search happens to show it. Reopened if a model is measured reporting only what it did.

## D11. Subagents get a compact ruleset of their own

What a session is told when it starts does not reach the agents it hands work to. A SubagentStart hook gives each of them the same seven rules in half the words. Left out: giving them the full text (their tasks are narrower and their context is their budget) and giving them nothing (which is what happens by default). It costs a second text to keep in step with the first; a test fails if their rule numbers differ. Reopened if the benchmark's compact arm falls behind the full one.

## D12. Tasks have rounds, and a held-out task that is looked at stops being proof

A task's project is built from the tasks of its own round and the earlier ones, so adding tasks never changes what an older measurement ran on. Rules are tuned on tuning tasks and proved on held-out ones; once the failures of a held-out task are used to change a rule, it becomes a tuning task and new ones are written. Left out: one growing pool of tasks, where every addition would quietly change the baseline, and reusing the same held-out tasks after tuning on them. It costs writing new tasks for every version of the rules.

## D13. The index speaks at fixed moments and never stops a change

It tells a session what the project shares when the session starts, and adds a note when source is written: that the change defines what another file already exports, or that what it replaces is somewhere else too. The note goes with the edit; the edit goes through. Left out: refusing the write until the agent reuses or fixes, which is what "a warning before writing" first meant. A refusal is right only when the warning is, and it throws away code already paid for. Also left out: a tool the agent would have to remember to call (D4). It costs trusting the agent to act on a note; the benchmark counts when it does not. Reopened if notes are measured being ignored.

## D14. The index lives in the user's cache folder and keeps names, not contents

Outside the project, so nothing appears in the repository and nothing has to be added to `.gitignore`; `OCKHAM_CACHE_DIR` moves it. For every source file it keeps what the file defines (name, kind, line, parameters, the first sentences of the comment above), what it imports, and the names it uses. Of values it keeps only the arithmetic of a constant, such as `0.21`, and not even that when the constant's name smells of a secret. It never keeps a text. Left out: a copy of the code, which a search over lines would want; the lines are read from the files when an edit asks. It costs reading a few files at each edit. Reopened if the index has to answer without reading the project.

## D15. A shortcut comes with the lookup it makes unnecessary

Told where things are, an agent searches less. Searching was how it came across the second copy of a bug: with the tests' location given to it, the session that used to fix both places of a rounding bug fixed one, three times out of three (the pilot, run `20261115T112441Z`, in [index.md](index.md)). So nothing that saves a search goes in without something that does that search for the agent: when a line is replaced, the hook looks for its copies and names them. Left out: giving the shortcut and hoping. It costs building two things for every one. Not reopened: it is what the measurement showed.

## D16. A part of the index is on only when a measurement says so

Each part has its own switch and starts off. What a request brings up (`OCKHAM_HINTS`) stays off: checked without a model, 22 of the 69 symbols it would have brought up were where the good solution works. Where the tests are (`OCKHAM_FACTS`) started off and was switched on when it had been measured: on the tuning tasks it took a tenth off the cost of a session that already had the list, and lost nothing ([index.md](index.md)). Left out: shipping every part that sounds useful. It costs features that exist and are off.

## D17. The rule about tests ships on

Without rule 7 a session costs a quarter less and passes the same hidden checks; with it, nine sessions in ten that need a test leave one ([index.md](index.md)). The owner chose the tests on 15 November 2026: "checked" is what the tool promises. `OCKHAM_TESTS=off` is there for whoever would rather have the cheaper session. Left out: shipping it off and letting people ask for tests. It costs a session a third dearer than it could be. Reopened if a test can be had for fewer steps: the steps are what it costs, not the rule. Reversed on 17 November 2026 by the owner: see D23.

## D18. The list stays whole

A list that says only where each helper is and how it is called is less than half the size and costs the same: not told what a helper does, the agent opens the file to find out, and the steps cost what the text had saved. No list at all costs the same again. So the list ships with its sentence about each helper, the form that was measured most ([index.md](index.md)). `OCKHAM_LIST=map` and `=off` are there. Left out: the short form as the default because it looks cheaper. It costs about a thousand tokens on every call of a session. Reopened on a project where 24 helpers are a small part of what is shared.

## D19. One look when the task ends, and one interruption

Until now nothing of Ockham's stopped an agent: the rules are text, and what the index says goes with the edit (D13). The checks are the one place where it does. When the agent means to stop, the files the task changed are compared with what they were, and if something is found the agent is told and goes on. It is told once: the second time it stops, whatever is left, and it is never kept if another hook has already kept it. The checks read files and commands; only the one about a summary that says the tests pass reads what the agent says. Left out: refusing the edit when it is made, which D13 already left out; a second round, which is how a tool that helps turns into one that is switched off; and judging whether the code is good, which is a review and belongs to phase 5. It costs a turn each time it speaks, and that is measured ([checks.md](checks.md)). Reopened if agents are measured ignoring what they are told at the end.

## D20. A ledger keeps what a task's files were, until the task ends

The index keeps names and never code (D14). The checks need more than that: what a file was before the task wrote it. So the first time a task writes a file, the file is put aside as it is, in the cache folder under the session's name, next to the request and the names of the dependencies `package.json` had. All of it is removed when the task ends, and what a session left without ending goes after two days. A file over 300 kB is not kept and not checked. A task is one request: the host numbers them, and a new number starts a new ledger. Left out: git, which is not always there and whose difference is the user's work in progress as much as the task's; the session's transcript, which is the host's private format; and what the host's own event says the file was, which no contract promises. It costs code and a request sitting in the cache folder for as long as a task lasts. Reopened if a host gives a task's difference itself.

## D21. A check is on when the saved sessions say it finds what it looks for and leaves a clean task alone

The rule D16 set for the parts of the index, applied to the checks. Each has its name in `OCKHAM_CHECKS`, and each was counted on the sessions that are kept, before a model was paid to try it: in how many what it looks for was there and was found, and in how many it spoke where there was nothing. On 1,457 of them a new dependency, a check dropped and a copy left behind were never reported where there was none; a missing test was found in nine sessions of ten and asked for in 47 that the benchmark marks as needing none, on three tasks where sessions with rule 7 write one anyway ([checks.md](checks.md)). All seven ship on. Two of them on less than that: the check for tests that were not run cannot be counted at all, because no session of the benchmark has a shell, and it is on for its contract test and because it errs towards silence; and the check about a missing test costs what a test costs, 15 in a hundred on the held-out tasks against a bar of a tenth, which is the owner's to weigh as D17 was. Left out: one switch for all of it and nothing else. It costs seven names to keep true. Reopened for any check that real use shows stopping sessions for nothing.

## D22. Codex runs the same hooks, through one translation

Codex calls hooks with nearly the input Claude Code sends: the same events, `session_id` and `cwd`, `Bash` with `tool_input.command` for a command, `stop_hook_active` and `last_assistant_message` at the end; and it reads `hookSpecificOutput.additionalContext` and `decision: "block"` the same way. Two things differ, and `src/host.mjs` turns them into Claude Code's shape before anything else reads them: a request is named by `turn_id`, not `prompt_id`; and files are written by `apply_patch`, one patch for any number of files, which is read file by file as a `Write`, a `MultiEdit` with one edit for each hunk, or a file that goes. So it is one plugin in one repository: `.codex-plugin/plugin.json` points Codex at `hooks/codex.json`, which runs the same scripts as `hooks/hooks.json`, and `.agents/plugins/marketplace.json` makes the repository a marketplace for Codex as `.claude-plugin/marketplace.json` does for Claude Code. Checked on Codex 0.167 on Windows: a probe recorded what each hook is given, and `bench/hook-live-codex.mjs` proves on live sessions that each hook reaches the model. What it does not see is a file written by a shell command, in Codex as in Claude Code; Codex does it more often: in the live test, asked to create a file, it wrote it with PowerShell instead of `apply_patch` (seen in the trace of the session), so the requests of that test ask for `apply_patch` by name. On the owner's machine, whose Codex has hooks and global instructions of its own, the case about tests not run passed three times of five: the two times it failed, the session did first what those instructions asked. Left out: a second set of scripts for Codex, the rules written into `AGENTS.md` instead of the hooks, and watching the files a command changes. It costs one module, and the review Codex asks for before it runs the hooks of a plugin. Reopened if Codex changes what it sends: the probe and the live test are how to tell.

## D23. Writing tests ships off, and the user is told once

This reverses D17, by the owner's decision of 17 November 2026: rule 7, where the tests are, and the check that asks for a missing test go in only with `OCKHAM_TESTS=on`. What the tests cost and give has not changed: without them a session costs a quarter less and passes the same hidden checks; with them nine sessions in ten that need a test leave one. What changed is who chooses: the cheaper session as shipped, the tests for whoever asks for them. The check that asks to run the tests a project already has stays on: it asks for no new test. So that nobody misses that the choice exists, every session tells the user what turning the tests on gives, what it costs and how, until they choose: `OCKHAM_TESTS=on` or `=off`. It is a notice of the session hook, which the model never sees. It was first said once on each machine; on a machine that runs scheduled tasks, that one time can go to a session nobody reads. Left out: an option in the settings screen of each host. It costs whoever wants the tests one line of settings. Reopened as D17 would have been: if a test can be had for fewer steps.
