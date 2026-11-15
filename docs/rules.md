# The rules

What Ockham tells an agent, how each version was measured, and what was tried and thrown away.

## What ships

Two sizes of the same seven rules, each in English and Spanish, in `rules/`:

| File | Words | Who gets it |
|---|--:|---|
| `ockham.en.md`, `ockham.es.md` | 314, 329 | a session, when it starts |
| `ockham.compact.en.md`, `ockham.compact.es.md` | 157, 177 | every agent that session hands work to |

`OCKHAM_RULES=off` loads none; `=full` or `=compact` gives that size to both. `OCKHAM_LANG=es` picks Spanish. `OCKHAM_TESTS=off` leaves out rule 7, the one that asks for a test, and nothing else: it was added in phase 3, when the tests turned out to be most of what a session with Ockham costs ([index.md](index.md#without-the-rule-about-tests)).

That the text arrives is not assumed. `npm run hook:live` starts real sessions and asks each for a word that only its hook knows: one word for the session, and a different one for a subagent, which the session itself is never given. Both came back on 15 November 2026.

## How a rule gets in

1. Tasks are in two groups. Rules are adjusted on **tuning tasks**. **Held-out tasks** are written after a ruleset is frozen and run once: they say whether what the tuning tasks showed holds on something the rules never saw.
2. A held-out task that has been looked at to change a rule becomes a tuning task. It is not used as proof again.
3. One change at a time. A change stays only if a run says it helps and a second run says it broke nothing.
4. When a rule is not followed, a session is traced (`node bench/trace.mjs <task>`) before the rule is reworded. Rewording blind is how a ruleset grows without getting better.

Every number below comes from a folder of `bench/runs/`, named by its stamp so that it can be found. Those folders are not in git. Model alias `sonnet`, which Claude Code 2.1.270 resolves to `claude-sonnet-5`; five sessions per task and arm; no session failed to run.

## Version 0

Seven rules written from what the [baseline](baseline.md) showed: look for what exists, use what is there before a dependency, handle real input, change every place, keep the guards, nothing more, and a test where the logic is risky. It says first that the job comes before the size: "If they pull apart, the whole job wins." 291 words, hash `6014d675cf`, commit `96912f6`.

### On the 18 tasks it was written against

Runs `20261115T014434Z` and `20261115T014758Z` (no tool, ponytail) and `20261115T021740Z` (Ockham).

| Measure | No tool | ponytail | Ockham v0 |
|---|--:|--:|--:|
| Correct | 90/90 | 90/90 | 90/90 |
| Held on input the ticket left out | 86/90 | 85/90 | 90/90 |
| Reached every place | 14/15 | 10/15 | 15/15 |
| Reused what the project had | 16/25 | 25/25 | 25/25 |
| Passed every hidden check | 80/90 | 80/90 | 90/90 |
| Left a test where the logic needs one | 0/50 | 4/50 | 40/50 |
| Source lines added, mean (median) | 5.5 (3) | 3.6 (3) | 5.2 (3) |
| Cost per session | 0.030 $ | 0.036 $ | 0.055 $ |
| Time per session | 16 s | 17 s | 28 s |

These are the tasks the rules were written against, so this table proves little by itself.

### On six tasks it had never seen

Run `20261115T023408Z`. All three arms passed every hidden check, thirty sessions out of thirty. The set was too easy to tell them apart on anything but tests: 4/15, 6/15 and 13/15. It showed that v0 loses nothing, and no more than that.

### On four more, shaped like ponytail's two failures

Two bug fixes whose logic is copied in another module, and two readers of hand-made files where real input costs lines. Written after v0 was frozen; run `20261115T031305Z`.

| Measure | No tool | ponytail | Ockham v0 |
|---|--:|--:|--:|
| Correct | 20/20 | 20/20 | 20/20 |
| Held on input the ticket left out | 17/20 | 15/20 | 20/20 |
| Reached every place | 0/10 | 1/10 | 5/10 |
| Within the size budget | 8/10 | 10/10 | 6/10 |
| Left a test where the logic needs one | 0/20 | 3/20 | 20/20 |
| Source lines added, mean (median) | 7.3 (3) | 4.6 (4) | 16.1 (10) |
| Cost per session | 0.029 $ | 0.036 $ | 0.086 $ |

These tasks were chosen for their shape. They say whether ponytail's two failures, and Ockham's answer to them, carry over to tasks nobody tuned on. They do not say that Ockham is better in general.

- **Ponytail's CSV failure carries over.** Asked to read a spreadsheet's CSV, it split every line on commas in five sessions out of five: a company called "Hermanos Ruiz, S.L." came out as a name and a city. Its report listed the quoting under "Skipped", as it had on the CSV task of the first eighteen. Ockham read the file right five times.
- **So does the missed copy, for everybody.** In `hold-reach-sort` the same sort lives in two files: no tool 0/5, ponytail 0/5, Ockham 5/5. In `hold-reach-points` the same comparison lives in two files: 0/5, 1/5 and **0/5**.

## What version 0 gets wrong

**It does not look for a copy of what it has just fixed.** Rule 4 says to search the project after a fix. A traced session of `hold-reach-points` shows what happens instead: one search to find the bug, the fix, a test, the end. Where v0 does reach the second place, it is because that first search happened to show both. In this task it listed file names only, and the agent did not open the one called `emails/points.js`.

**It writes more than it has to.** Its CSV reader took 52 lines at the median. The reference solution takes 25. That task's budget of 30 lines was set too tight by mistake, 1.2 times its reference where every other budget is 2 to 3 times; it was fixed before the run and has not been moved since, so the lines are given here and the reader can judge. On the 18 first tasks v0 added 5.2 lines a session against ponytail's 3.6.

**It costs half as much again as ponytail, and more than twice as much on the harder tasks.** It leaves a test in two sessions out of three and takes twice the turns.

## Version 1

### Rule 4: six tries, none kept

| What was tried | Result on `hold-reach-points` |
|---|---|
| "Search for what the line you changed uses, not only for who calls it" | 0/5; 20/25 on the five reach tasks, as v0 (run `20261115T032308Z`) |
| A line in the closing report: say what you searched for and what the search found | 2/3 traced |
| The closing report as a form with labelled lines, one of them for the search | 1/6 traced |
| "Never rule a file out by its name: read the lines the search finds" | 0/4 traced |
| The report line and that sentence together | 4/5 traced, then **1/5** when measured (run `20261115T033508Z`, 21/25 on the five tasks) |
| "Search before you edit, with the matching lines shown" | 0/5 traced |

The traced sessions were not saved as runs; they were for looking, and the two runs are what counts.

The report line is the only thing that moved the number, and it was thrown away for what it did in the sessions it did not move. In the measured run, the four sessions that missed the second place all closed with a search or a check in their report. One wrote that a search for `reward.cost` "turned up only this one site", in a project where those words are in two files. Another: "Checked `src/emails/points.js` — it only formats email text, no comparison logic to duplicate the fix." That file holds the comparison. Three of the four took six turns, which is what a session takes when it finds the bug, fixes it, adds a test and searches for nothing.

Asked to report a check, the model reported it more often than it ran it. A rule that turns a silent omission into a false statement is worse than no rule, and it is now a decision of the project that no rule asks an agent to report its own checks ([D10](decisions.md)).

Rule 4 stays as v0 had it. A copy of a fixed bug is the kind of thing a prompt cannot make an agent find and a program can: the check for it belongs to phase 4, where a hook looks for copies of the changed line and shows them.

### Rule 6: one sentence, kept

> Of two ways that do all of the above, write the shorter: a built-in or one expression before a helper of your own.

Measured first on the eight tasks where size was at stake (run `20261115T034125Z`), then on the other fourteen tuning tasks to see that nothing broke (run `20261115T034616Z`). Ruleset `8f5ea32c6c`.

The 22 tuning tasks: the first 18 and the four above.

| Measure | No tool | ponytail | Ockham v0 | Ockham v1 |
|---|--:|--:|--:|--:|
| Correct | 110/110 | 110/110 | 110/110 | 110/110 |
| Held on input the ticket left out | 103/110 | 100/110 | 110/110 | 110/110 |
| Reached every place | 14/25 | 11/25 | 20/25 | 20/25 |
| Reused what the project had | 16/25 | 25/25 | 25/25 | 25/25 |
| Added a dependency | 0/110 | 0/110 | 0/110 | 0/110 |
| Passed every hidden check | 87/110 | 86/110 | 105/110 | 105/110 |
| Within the size budget | 23/25 | 25/25 | 21/25 | 22/25 |
| Left a test where the logic needs one | 0/70 | 7/70 | 60/70 | 60/70 |
| Wrote a test where none was needed | 0/40 | 0/40 | 21/40 | 19/40 |
| Source lines added, mean (median) | 5.8 (3) | 3.8 (3) | 7.2 (4) | 6.3 (3) |
| Cost per session | 0.030 $ | 0.036 $ | 0.060 $ | 0.054 $ |
| Time per session | 16 s | 17 s | 31 s | 28 s |

The sentence took nothing away: every session that passed before still passes. It shortened what was long. Median lines, v0 to v1: the CSV export 13 to 7, the suppliers reader 52 to 38, the sort fix 9 to 3, the upload path 11 to 8, the page parser 10 to 8. Nothing got longer.

### Version 1 on tasks it was not tuned on

The six held-out tasks of the second round, which no rule was ever adjusted on. Run `20261115T035958Z`, with the compact ruleset as an arm of its own (`6425139435`, 157 words); the v0 column is the earlier run `20261115T023408Z`.

| Measure | Ockham v0 | Ockham v1 | v1, compact |
|---|--:|--:|--:|
| Passed every hidden check | 30/30 | 30/30 | 30/30 |
| Within the size budget | 10/10 | 10/10 | 10/10 |
| Left a test where the logic needs one | 13/15 | 13/15 | 11/15 |
| Source lines added, mean (median) | 4.4 (3) | 4.4 (3) | 4.1 (2.5) |
| Cost per session | 0.047 $ | 0.050 $ | 0.040 $ |

Version 1 broke nothing on tasks it never saw, and that is all this table can say: with no tool at all these six also pass thirty of thirty. The compact text, which is what subagents get, lost no hidden check either. It left a test a little less often and cost a fifth less.

## Where this leaves phase 2

The bar in the [plan](plan.md): "Equals or beats ponytail on code size and tests without losing hidden checks."

| | |
|---|---|
| Hidden checks | Passed in 105 sessions of 110, against ponytail's 86. The five it fails, ponytail fails too |
| Tests | Left where the logic needs one in 60 sessions of 70, against 7 |
| Code size | Equal at the median, three lines. Not equal on average: 6.3 against 3.8 |

The average needs taking apart. On the five tasks where ponytail fails a hidden check, its changes are shorter because part of the job is missing. On the seventeen it solves in every session, it adds 4.0 lines a session and Ockham v1 adds 5.3. On eleven of those the two are the same size at the median; on six Ockham is longer, by one to four lines. The two that were read side by side, the amount parser and the page parser, are longer because they accept more forms of input than the check asks for.

So the bar is met on hidden checks and on tests, and on size it is met at the median and missed by 1.2 lines a session on average. Whether that closes the phase is the owner's call, not this document's.

## Limits

- **One model, one host.** Claude Sonnet 5 in Claude Code. Nothing here is known about another model.
- **Five sessions a cell.** A difference of one session in five is noise. The differences relied on above are five in five, or hold across many tasks.
- **Small tasks, no shell.** The agent can find, read and write files and cannot run anything. This measures what it writes, not how it debugs.
- **Version 1's size gain is measured on the tasks it was tuned on.** The held-out tasks say that it broke nothing; they are too easy to say more.
- **The hard tasks were written by the person who wrote the rules.** Tasks taken from real repositories are in the plan for that reason.
- **The cost is real.** Ockham costs half as much again as ponytail and takes two thirds longer. Most of it is tests: it writes one in seven sessions out of ten.

## Open

- Rule 4: the copy of a fixed bug in another module. To be answered by a check, in phase 4. Answered sooner for the copies a program can see: since phase 3, when a line is replaced a hook names the other files that have it ([index.md](index.md#the-copy-of-a-replaced-line)).
- Rule 7 writes a test in 19 sessions of 40 where the benchmark does not ask for one. That is where the next saving in cost is. Measured in phase 3: without rule 7 a session costs a quarter less and passes the same hidden checks ([index.md](index.md#without-the-rule-about-tests)). The owner kept it on ([D17](decisions.md)).
- New held-out tasks for version 2: the four hard ones are tuning tasks now.
- The budget of `hold-cut-suppliers`, to be set like the others (twice its reference) when that round of tasks is next touched, with a larger bloated reference.
