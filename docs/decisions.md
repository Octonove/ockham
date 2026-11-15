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
