# The checks at the end

What Ockham looks at when a task ends, how each check was shaped before any model was paid for, what real sessions did when they were stopped, and what no check sees.

## What ships

When the agent means to stop, the files the task changed are compared with what they were. If something is found, the agent is told and goes on. It is told once ([D19](decisions.md)).

| Check | What it finds | Read from | As shipped |
|---|---|---|---|
| `deps` | `package.json` names a dependency that it did not, and the request did not name it | `package.json` when the request arrived and now | on |
| `twin` | something is defined that another file already exports under that name, or a value is worked out in place and given the very name of a function the project exports | the files the task wrote, and the index | on |
| `copy` | what the task replaced in one file is still in another | the same, with the finder of [index.md](index.md) | on |
| `guard` | the files the task wrote make fewer checks than they made: a limit, a `throw`, a look at a type, a call that validates or cleans | the files the task wrote, before and now | on |
| `test` | a fix, or a change that touches money, parsing, validation or security, with no test added or changed | the request, the lines that changed, and whether the project has tests | on; `OCKHAM_TESTS=off` takes it out |
| `run` | source was written after the last time the tests ran, in a session that has run a command | the commands the session ran | on |
| `claim` | the agent's summary says the tests pass, and none ran after the last change | the last message | on |

`OCKHAM_CHECKS=off` switches all of it off, and a list such as `OCKHAM_CHECKS=deps,copy` keeps those. `OCKHAM_INDEX=off` leaves only what needs no index: `deps`, `guard` and `claim`.

What a session is told, when it has fixed a comparison in one of two modules, written no test and run none:

```
Ockham: before you finish, one look at what this task leaves behind.
- What this task replaced is still in src/vouchers/wallet.js:4: `if (today >= voucher.expires) return { code: voucher.code, state: 'expired' };`. If this was a fix, it belongs there too.
- This task fixes a bug in src/vouchers/redeem.js, and no test was added or changed. Add or extend one test for the case that matters, where the project keeps its tests.
- The tests have not been run since the last change to the source. Run them before you finish.
Deal with what applies and then finish. If something here is wrong, say so in a line. You will not be asked again.
```

**One interruption.** The host calls a hook when the agent means to stop, and the hook may answer that it should not, with a reason: the agent reads the reason and goes on. Ockham answers so at most once in a task. The second time the agent stops it is let go, whatever is left, and it is let go the first time if another hook has already kept it. A task is one request: the host numbers them.

**The ledger.** To know what a task changed, what its files were has to be kept. The first time a task writes a file, the file is put aside as it is, in the cache folder, with the request and the names of the dependencies `package.json` had. When the task ends, all of it is removed ([D20](decisions.md)).

**What it costs when it has nothing to say** is a process: on the benchmark's largest project, 92 source files, the hook at the end takes 62 milliseconds, the one that opens the ledger 49, and putting a file aside is part of the hook that already ran before every edit, 56. Nothing is sent to the model.

**That it arrives** is not assumed. `npm run hook:live` gives the checks a word of their own, which comes only with something they found, and asks two real sessions to answer with any stop word they are told: one leaves a copy unfixed, and one, which has run a command, leaves the tests not run. Each with the plugin and without. All fourteen cases of the live test passed on 15 November 2026.

## How a check gets in

The same way a part of the index did.

1. **Without a model first.** `npm run bench:checks` lays every reference solution of the benchmark over its seed and looks at it as the checks would: the planted problem must be found, and the good solution left alone. With `--runs all` it does the same to what real sessions left behind, which are kept, 1,457 of them when the checks were shaped: for each check, in how many sessions what it looks for was there and in how many it was found, and in how many it spoke where there was nothing.
2. **Each check has its name** in `OCKHAM_CHECKS`, and is on only when that count says it finds what it looks for and leaves a clean task alone ([D21](decisions.md)).
3. **Held-out tasks are written before a model sees them**, with what each check is expected to do on each written down first.
4. **What the live run has to show is set before it**: the bars are below, with the run.

The model was paid for 216 sessions in three runs, 8.66 $. Everything in the next two sections cost nothing.

## What there was to find

Before building anything, the saved sessions were counted for what a check at the end could have caught.

| What a session left | No tool (208) | ponytail (178) | Ockham, any arm with its rules (876) | Index alone (84) |
|---|--:|--:|--:|--:|
| A new dependency | 0 | 0 | 0 | 0 |
| Its own version of a helper, on the tasks that have one | 10 of 47 | 0 of 37 | 0 of 185 | 0 of 33 |
| A copy of the bug unfixed, on the tasks that have one | 27 of 69 | 29 of 54 | 30 of 333 | 0 of 15 |
| A check dropped in a rewrite, on the task that tempts it | 0 of 6 | 0 of 6 | 0 of 19 | 0 of 3 |
| No test where the logic needs one | 123 of 128 | 98 of 113 | 65 of 552 | 42 of 45 |
| A summary that says the tests pass, with no shell to run them in | 3 | 1 | 0 | 1 |

Two of the five problems the plan names for this phase, a new dependency and validation removed, do not happen in these sessions at all: this model does not add a package for what a loop does, and does not drop a limit when it shortens a function. They are in the benchmark as planted solutions, and that is where those two checks are proved. With Ockham's rules, what is left to find at the end is a missing test, in one session in eight of those that need one, and a copy left unfixed, which the note of phase 3 has ended wherever the finder sees the copy.

## Shaped without a model

Every number here is from `npm run bench:checks`, on 44 tasks and on the 1,457 sessions saved before this phase.

**On the references.** 44 good solutions: none is stopped by `deps`, `twin`, `copy` or `guard`. Of the planted problems that a check looks for:

| Planted | Found | Missed, and why |
|---|--:|---|
| A dependency for what the language does | 4 of 4 | |
| Validation dropped by a shorter version | 3 of 3 | |
| A fix in one of two places | 7 of 14 | the seven that the finder of phase 3 does not see: a fix that only adds to the line, the same number in another call |
| A second version of a helper | 1 of 7 | six are written in line, with no name: no program this cheap can tell that three lines do what `formatMoney` does |

Twenty-one more bad references are wrong in ways that leave nothing to compare: code that never handled what it should (text with quotes in it, a path that climbs out of its folder), code that is longer than it need be, code that is simply wrong. Nothing was removed and nothing was copied. That is the ground of rule 3 and of a review, not of a look at what changed.

**On the saved sessions.**

| Check | What it looks for was there | Found | It was not there | Spoke all the same |
|---|--:|--:|--:|--:|
| `deps` | 0 | | 1,457 | 0 |
| `twin` | 10 | 2 | 1,447 | 0 |
| `copy` | 87 | 77 | 1,370 | 0 |
| `guard` | 0 | | 1,457 | 0 |
| `test` | 400 | 363 | 1,057 | 47 |

`claim` spoke in five sessions, and was right in all five: no session of the benchmark has a shell, so a summary that says "the existing test still passes" says what nobody ran. How many such summaries it misses is not known. For the same reason `run` cannot be counted here at all.

The 47 are sessions asked for a test on three tasks that the benchmark marks as not needing one: a search term put into an address (26), the total of a cart (16) and a delivery promise the ticket calls a bug (5). On those three, sessions that have the rule about tests write one of their own accord in 23 of 34, 28 of 28 and 10 of 10. The check reads rule 7 the way the model does, and the benchmark's mark is the stricter of the two.

Arm by arm, the sessions that would have been stopped: 72 of the 627 of the arm that ships, 11 in a hundred. 65 of them had left something: a test the logic needed, or a copy. Seven had left nothing wrong, 1.3 in a hundred of the 544 that had.

**Seven mistakes, all found here.** Each would have stopped a good solution or missed a planted one, and each cost nothing to find.

1. A limit given a name was a limit lost: `size > 5 * 1024 * 1024` made `size > MAX_BYTES` stopped the good solution of an upload task. A limit is now a comparison, whatever it compares with.
2. A check moved into a helper that two files now share was lost by the file it left. Everything a task wrote is now counted together, new files too.
3. The order of a sort was a limit: `a.name < b.name` made `localeCompare`. Only a limit with a number in it can be lost.
4. `clamp(value, 0, 100)` held nothing: a saved session had written that helper, and would have been told that it had dropped the limits it kept.
5. A request wrapped in a retry was about the address it already built, and so about security. What a change touches is now what it adds, when it takes nothing away.
6. A template string was one word: the calls inside `${ }` were not seen, and a rewrite that kept every one of them would have been stopped. This one was found while writing a task to test it.
7. A fix that only changes a value was not a fix: `split('\n')` made `split('\r\n')` is new text in the same code. The request says it is a bug, and that is enough. This one was found by the bad reference of a task written for this phase, which is therefore a tuning task now.

## With a model, on tasks nothing was shaped on

Six tasks, written before any model saw them, with what the checks were expected to do on each written down first: two rewrites where a shorter version drops validation, a dependency for what one loop does, a fix whose line is copied in another module, and two plain changes about which nothing should be said. Run `20261115T175546Z`: five sessions a cell, 120 sessions, 4.23 $, none failed to run.

What the run had to show was set before it and is in the message of the commit that added the tasks:

- of the sessions that leave nothing wrong, one in twenty at the most is stopped;
- of the sessions stopped, two in three leave nothing of what they were told;
- with the checks the tool passes as many hidden checks as without, and costs a tenth more at the most.

| Measure | No tool | The checks alone | Ockham without the checks | Ockham |
|---|--:|--:|--:|--:|
| Passed every hidden check | 28/30 | 30/30 | 30/30 | 30/30 |
| Left a test where the logic needs one | 0/15 | 10/15 | 5/15 | 10/15 |
| Sessions stopped | | 11 | | 5 |
| Of them, left nothing of what they were told | | 10 | | 5 |
| Stopped with nothing wrong | | 1 | | 0 |
| Cost per session | 0.024 $ | 0.035 $ | 0.038 $ | 0.044 $ |
| Time per session | 14 s | 21 s | 18 s | 21 s |
| Turns per session | 4.0 | 6.2 | 4.9 | 6.1 |

"The checks alone" is the plugin with its rules off and nothing said when the session starts or while it writes: what the look at the end does on its own.

**The first bar is met.** With the tool as it ships, no session was stopped with nothing wrong. With the checks alone, one of thirty was.

**The second is met.** Fifteen of the sixteen sessions stopped left nothing of what they were told. The sixteenth is the false stop.

**The third is met on what the code does and missed on what it costs.** Thirty of thirty with the checks and thirty of thirty without. On cost the bar was a tenth and the measure is 15 in a hundred (0.0441 $ against 0.0383 $; paired by task, t = 1.55). Two thirds of the difference are on the one task where five sessions of five were stopped and wrote the test they were asked for: 0.050 $ a session against 0.027 $. That is the price of a test, the same one [D17](decisions.md) found. The other third is on a task where nothing was said, and four sessions wrote a test of their own accord where one had: the rule, not the check.

What happened, task by task:

- **Nobody dropped a check, and nobody added a package.** Forty rewrites and twenty batching loops, in the four arms: every one kept its limits, its `throw` and its cleaning, and none brought in a dependency. As in the saved sessions, this model does not make those two mistakes on tasks of this size. `deps` and `guard` are proved on the planted solutions, seven of seven, and live they had no occasion.
- **The copy was fixed before the end.** Two of five sessions with no tool left the wallet wrong. With Ockham the note of phase 3 named it and five of five fixed it. With the checks alone, five of five fixed both places unprompted, so the check for a copy had nothing left to say. What it does when there is something is in the next section.
- **The check about tests did what the rule had not.** It stopped fifteen sessions, and all fifteen wrote the test. On the rewrite of `renderNote`, which cleans what a visitor typed, the rule alone left a test in none of five: a rewrite is not a fix, and the model did not count it as security. Told at the end, five of five did.
- **And it missed a task.** On the rewrite of `bookSeats` no session of twenty left a test, with the checks or without, and the check asked none: the sessions kept the lines that validate as they were, so the lines that changed spoke of nothing risky. Making every line with a limit in it count as validation was tried without a model: it found nothing more in the 400 saved sessions that lacked a test, and asked 37 more that needed none. It was left out.
- **The two plain tasks were left alone**: twenty sessions with the checks, none stopped.

**The false stop.** One session with the checks alone wrote `Math.min(seats, MAX_SEATS_PER_BOOKING)` where the old code had `if (wanted > 8) wanted = 8`, and was told that the check on 8 was gone. It is the first mistake of the list above again, a limit given a name, in the one form that had not been met: inside `Math.min`. The session answered what the last line of the message asks for:

> That check is wrong — `Math.min(seats, MAX_SEATS_PER_BOOKING)` performs the exact same cap as the original `if (wanted > 8) { wanted = 8; }`, just expressed differently. The behavior is preserved; I'm not reintroducing the verbose `if` since that would undo the readability improvement the task asked for.

and stopped, 0.007 $ dearer than its neighbours. The check now counts what `min`, `max` or `clamp` holds a value to as a limit, with a number or with a name. That change was made because of a held-out task, so `hold-guard-seats` is a tuning task from here on, and the fix is proved only by a test and by the references: no task that nobody has seen has been run on it.

## The checks alone, on the tasks they were shaped on

The six tasks above gave the check for a copy nothing to do. To see it work, and to see what a session with no rules does when it is stopped, the checks alone were run on 26 tuning tasks, three sessions each: run `20261115T180447Z`, 78 sessions, 3.98 $. The column without a tool is every saved session of those tasks with no tool, 136 of them; one task is new and has none.

| Measure | No tool | The checks alone |
|---|--:|--:|
| Passed every hidden check | 100/136 | 70/75 |
| Reached every place the bug was in | 41/68 | 36/39 |
| Left a test where the logic needs one | 5/75 | 39/42 |
| Wrote a test on a task marked as needing none | 0/61 | 6/33 |
| Cost per session | 0.038 $ | 0.051 $ |
| Time per session | 17 s | 30 s |

Forty-eight of the 78 sessions were stopped, and all 48 left nothing of what they were told.

- **A copy.** Five of these tasks have a bug written twice in a form the finder sees at the end. With no tool, the second place was fixed in one session of 25. With the checks alone, in fifteen of fifteen: fourteen were stopped for it and fourteen fixed it, and one had fixed it unprompted. The check never spoke of a copy that was not there.
- **A test.** All 48 were asked for a test and all 48 wrote it. Six of them were on the two tasks the benchmark marks as needing none and the check reads as rule 7 does: the total of a cart, and the delivery promise that the ticket calls a bug.
- **What it does not reach.** The task whose copy is the same number in another call stayed wrong in three of three: the finder does not see it, and being asked for a test did not make the session look. The rules reach it by searching, and that is their half of the work.
- **A stop costs what it asks for.** On the fifteen tasks where every session was stopped, a session cost 0.023 $ more than one with no tool: the test, and the turns to write it. On the ten where none was stopped, the difference is 0.001 $.

By themselves the checks take a session with no rules most of the way to where the rules take it on what can be seen afterwards, a test and a second place, and nowhere on what cannot: real input, reuse, the smallest change. That is why they are the third layer and not the first ([D1](decisions.md)).

## The sentence about where the tests are

Phase 3 left this open: told where the project keeps its tests with the words "A new test goes with them, in their style", a session with no rules wrote a test every time, needed or not. The sentence now says "If you add a test, it goes with them, in their style."

With the index alone, on six tasks about reuse, run `20261115T181340Z`, 18 sessions, 0.45 $: a test in none of them, at 0.025 $ a session. The same arm with the old sentence, on five of those tasks and one other, had left a test in 18 of 18, at 0.044 $ a session (run `20261115T131202Z`). Every session reused the helper, as before. With the rules on, a fix still gets its test: five of five on the new task with a bug in it, by rule 7 and before any check.

## Where this leaves phase 4

The plan's bar: *catches the planted problems and rarely interrupts a clean task.*

| What the plan names | Planted problems found | In real sessions |
|---|---|---|
| New dependencies | 4 of 4 | never happened in 1,673 sessions, and the check never spoke |
| Removed validation | 3 of 3 | never happened; one false stop in 138 sessions with the checks, since fixed |
| Risky logic without a test | asked on 24 of the 27 tasks that need one | found in 363 of 400 saved sessions; 63 sessions stopped live, 63 wrote it |
| Duplicates | 1 of 7 second versions; 7 of 14 copies of a bug | 2 of 10 second versions; 77 of 87 copies; 14 stopped live for a copy, 14 fixed it |
| Tests not run | | one live session with a shell, stopped and told; no count of false stops is possible without a shell |

**Rarely interrupts a clean task**: no session of thirty with the tool as it ships, one of thirty with the checks alone, and without a model seven of the 544 saved sessions of that arm that had left nothing wrong.

Two things are short of where they were meant to be, and both are on record here rather than adjusted away:

- **A second version written in line is not seen.** Six of the seven planted ones have no name to go by. What stops them is upstream: with the rules, or with the list of what the project shares, the helper was reused in 238 saved sessions of 238.
- **The checks cost 15 in a hundred on the six held-out tasks, and the bar set for them was a tenth.** All of it is the tests they ask for. Over the mix of tasks of the saved sessions the same check would have stopped one session in nine, which at 0.023 $ a stop is about 5 in a hundred. `OCKHAM_CHECKS=deps,twin,copy,guard,run,claim` keeps every check but the one that costs.

The owner closes the phase, and with it decides whether the check about tests ships on. It is on as built: it asks for what rule 7 already asks, and [D17](decisions.md) chose the tests knowing their price.

## Limits

- **One model, small tasks, JavaScript.** As everywhere in this benchmark.
- **No shell.** A session of the benchmark cannot run a command, so `run` is proved by a contract test and by unit tests, and nothing here says how often it would stop a session that had run its tests in a way the check does not recognise. It errs towards silence: any command that speaks of tests and does more than look at files counts as running them.
- **Two of the seven checks had nothing to find in any real session.** `deps` and `guard` are proved on solutions written to be wrong. That they stay silent on 1,673 real sessions is measured; that they speak when a real session errs is not.
- **A stop is trusted, not checked.** The agent is told once and believed: if it answers that the check is wrong, it stops, right or not. In these runs it answered so once, and it was right.
- **The ledger sees what goes through the host's own tools for writing files.** A file changed by a command is not put aside, so it is not compared; `package.json` is the exception, read when the request arrives.
- **Five tasks are left that nothing was shaped on**, of the six: the one false stop came from the sixth, and changing the check for it made that task a tuning task. The fix has no held-out proof.

## Open

- **A rewrite of code that validates, with no test asked.** On `hold-guard-seats` no session of twenty left a test and the check asked none. The one widening tried made it ask 37 sessions that needed none.
- **A second version written in line.** Nothing cheap tells that three lines do what a helper does. It belongs to the review of phase 5, which reads the code and not only its difference.
- **`run` on real sessions.** Its false stops are the first thing to count when the tool is used with a shell, in phase 8; an arm of the benchmark with a shell would count them sooner, and needs the owner's word, because its sessions would run commands on his machine.
- **The open redirect of `hold-safe-next`**, carried from phase 3: three sessions of five leave it, with the rules or without, and a look at what changed has nothing to compare it with. Phase 5.
- **The copy the finder does not see**: the same number in another call. Carried from phase 3, unchanged.
