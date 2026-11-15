# The index

What Ockham tells an agent about the project it is working in, how each part was measured, and what was built and left switched off.

## What ships

An index of the project, and three hooks that read it.

| When | What the session is told | As shipped |
|---|---|---|
| The session starts | The helpers the project's files share: name, parameters, file, and the first sentence of the comment above each | on; `OCKHAM_LIST=map` leaves the sentences out, `=off` the whole list |
| | Where the tests are, what runs them, and how one of them begins | on; `OCKHAM_FACTS=off` |
| A request arrives | What the project already has for the words of the request | off; `OCKHAM_HINTS=on` |
| Source is about to be written | That the change defines something another file already exports | on |
| | That what the change replaces is in another file too: the file, the line, and the line itself | on |

Nothing here stops a change: a note goes with the edit and the edit goes through ([D13](decisions.md)). `OCKHAM_INDEX=off` switches all of it off.

What a session is told when it starts in the benchmark's project, with thirteen of its seventeen helpers cut out:

```
Ockham: what this project already has, so that you do not have to look for it. These are the helpers its files share:
- parseAmount(text) in src/lib/amount.js - Read an amount typed by a person, such as "12.50", "12,50" or " 7 ", as a number.
- slugify(text) in src/lib/text.js - Turn any text into a lowercase, dash-separated, ASCII-only identifier for URLs.
- isEmail(text) in src/validation/email.js - Is this something we can send mail to?
- withRetry(fn, { tries = 3, delayMs = 100 } = {}) in src/net/retry.js - Call fn until it succeeds, at most `tries` times, waiting a little longer each time.

Ockham: this project's tests are in test/ (2 of them), written with node:test; `npm test` runs `node --test test/`. If you add a test, it goes with them, in their style. So that you do not have to open one to see that style, this is how test/checkout.test.js begins:
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkoutTotal } from '../src/checkout/total.js';

test('adds 21% VAT to the net prices', () => {
  assert.equal(checkoutTotal([{ price: 10, quantity: 2 }]), 24.2);
});
```

And the note that goes with an edit which turns a `>` into a `>=` in one file, when another file has the same comparison:

```
Ockham: what this change replaces is also in src/emails/points.js:5:
    const within = REWARDS.filter((reward) => customer.points > reward.cost).map((reward) => reward.name);
If this is a fix, it belongs there too.
```

**The index itself.** JavaScript and TypeScript, read with regular expressions: for each source file, what it defines at the left margin, what it imports, and the names it uses. It is kept in the user's cache folder, never in the project, and holds names and not code ([D14](decisions.md)). Every hook brings it up to date first, reading again only the files whose date or size changed, inside a time budget: a second and a half when a session starts, a fifth of a second before an edit. The benchmark's project, 42 files, is indexed in 10 milliseconds the first time. Each hook is a process of its own: on the benchmark's largest project, 67 source files, one takes 60 to 75 milliseconds on the machine this was measured on, 35 of them Node starting. The hook for requests, which is off, leaves before it reads anything.

**By hand.** `ockham index` shows what a session would be told about the project in a folder; `ockham find <words>` asks what it already has for a request.

**That it arrives** is not assumed. `npm run hook:live` makes a small project with a helper of a random name and asks real sessions for what only the index could have told them: the name of that helper, the file that already has it when a second one is written, and the file with the other copy when a copied line is replaced. Each with the plugin and without. All ten cases passed on 15 November 2026.

## How a part gets in

1. **Without a model first.** `npm run bench:index` asks what the index would say on every task of the benchmark: whether the helper a task should reuse is in the list, what the request would bring up, and whether a reference solution that fixes one place of two is told where the other is. With `--runs` it puts the same question to what real sessions left behind. A mistake here costs nothing, and three were made here.
2. **Then a pilot, then the whole set** of tuning tasks, each part as an arm of its own.
3. **Each part has its own switch** and is on only when a measurement says that it helps ([D16](decisions.md)).
4. **Held-out tasks are written before a part is run on them**, with what is expected of each written down first.

Every number below comes from a folder of `bench/runs/`, named by its stamp. Model alias `sonnet`, which Claude Code 2.1.270 resolves to `claude-sonnet-5`; three sessions per task and arm on tuning tasks, five on held-out ones; no session failed to run. Rules version 1, `8f5ea32c6c`, in every arm that has rules; the arm without the rule about tests has that text less rule 7, `36bd010840`.

## The list at the start

The functions and classes that files of the project import from one another, and those of the folders where helpers are kept (`lib`, `utils`, `shared` and the like). Most shared first, 24 at the most.

Without a model: on the six tasks where the good solution reuses a helper, that helper is in the list six times of six.

With a model, the list and the notes without any rules (arm `ockham-index`, run `20261115T114102Z`, 22 tuning tasks):

| Measure | No tool* | Index alone |
|---|--:|--:|
| Reused what the project had | 16/25 | 15/15 |
| Reached every place | 14/25 | 15/15 |
| Held on input the ticket left out | 103/110 | 63/66 |
| Passed every hidden check | 87/110 | 63/66 |
| Left a test where the logic needs one | 0/70 | 0/42 |
| Cost per session | 0.030 $ | 0.033 $ |
| Turns (median) | 5 | 4.5 |

\* Stored runs `20261115T014434Z`, `20261115T014758Z` and `20261115T031305Z`, five sessions a task.

Told what exists, the agent uses it: with no tool it writes its own version in nine sessions of twenty-five, and with the list in none. That is the whole of what the plan asked of this phase, and it comes at a tenth more than no tool at all. What the list does not do is make an agent handle real input: the three sessions that failed are one task, a reader of a hand-made CSV, which needs rule 3.

With the rules there is nothing left for the list to add on reuse: rule 1 already makes the agent search, and the rules alone reuse in fifteen sessions of fifteen. What the list changes there is how the helper is found: named at the start, not searched for.

## What a request brings up: built, measured, off

When a request arrives, the words it shares with the names and comments of the project's symbols bring up to four of them. Checked without a model on the 31 tasks: 69 symbols brought up, 22 of them where the good solution works. Two in three would be noise in the agent's context, on every request. It stays off.

## A second version of a helper: on, and nearly never needed

When a change defines an exported name that another file already exports, or a function about the same thing, the note says where the other one is.

It has not fired once in 417 sessions with the index, and it had no reason to: none of them failed the check for reuse. Put without a model to every session saved since the benchmark began, 1,268 of them, it would have fired in two of the ten that wrote their own version of something the project had, and in none of the others. A careless second version is not a function with the same name: it is a regular expression or a `toLowerCase().replace(...)` written in the middle of other code, and nothing gives it away by name.

So this part is nearly free and nearly idle. It is on because it has never been wrong; what stops second versions in practice is the list.

## Where the tests are: what it saved, and what it broke

An agent that is going to write a test first finds out where the tests are and how they are written. Telling it saves those steps.

The pilot (run `20261115T112441Z`, eight tuning tasks, three sessions each):

| Measure | Rules alone | Rules and list | Rules, list and where the tests are |
|---|--:|--:|--:|
| Cost per session | 0.057 $ | 0.051 $ | 0.049 $ |
| Turns (median) | 10 | 9 | 7 |
| Reached every place | 6/6 | 5/6 | 3/6 |

A seventh off the cost, and half the bug fixes left half done. In `reach-vat` a rounding bug lives in two files. With the rules alone the agent fixed both in three sessions of three; told where the tests were, it fixed one in three of three. A traced session showed why: it went straight to the file the ticket names, fixed it, wrote the test where it had been told to, and finished in five turns. It had never searched, and searching was how it used to come across the second file.

That is a property of every shortcut, not of this one: told where things are, an agent looks around less, and looking around was doing a job nobody had named. The decision that came out of it ([D15](decisions.md)): nothing that saves a search goes in without something that does that search for the agent.

## The copy of a replaced line

### What it does

When an edit replaces lines, the hook works out what each replaced line lost: its tokens that none of the new lines gives back. A `>` that became `>=` lost a `>`; a `Math.floor` that became `Math.round` lost a `floor`. A line that was only split over several, or only added to, lost nothing, and nothing is said. A change that takes lines away and brings none in is a deletion, and is left alone.

For a line that lost something, the hook looks in the other source files that use the same names for a line with at least 60 % of its tokens in the same order, all of its names but one, and the token it lost. Declarations, imports, comments and tests are not looked at. It names up to two places an edit, twice a session at the most, and never the same place twice.

### Three mistakes, all found without a model

| What it did | What that got wrong | Now |
|---|---|---|
| Asked for a run of tokens in a row | Missed `customer.points > reward.cost` against `points > reward.cost` | The longest common subsequence |
| Did not ask whether the change took anything out of the line | 60 false pointers: an edit that adds a line next to a common one is not a fix of that line | The line must have lost a token, and the copy must have that token |
| Compared a line with the one new line most like it | 14 false pointers when a line was only split over several | What the line lost is what none of the new lines gives back |

### Without a model

Put to the 1,022 sessions of the fourteen runs saved before the held-out tasks below were run:

- of the 50 that fixed one place of a bug and left another, it would have pointed 49 to the place they left;
- of the 972 others, it would have pointed none anywhere.

These are the sessions it was built against, so this says that it was built right, not that it works.

### With a model, on the tasks it was built on

Run `20261115T114102Z`, three arms with the index, 66 sessions each. A note went to nine sessions of each arm: the three sessions of `hold-reach-points`, of `hold-reach-sort` and of `reach-vat`, the three tuning tasks where a bug has a copy. All 27 then fixed every place. No other task got a note.

`hold-reach-points` is the task that no wording of rule 4 moved in [phase 2](rules.md): one comparison in two files, fixed in both by no session of five with no tool, one of five with ponytail, and one of three here with the rules alone. With the note: nine of nine, and three of three again with the plugin as it ships (run `20261115T123030Z`).

### On tasks written to test it

Three bug fixes whose logic is copied in another module, written before the finder was run on them, with what it was expected to do written in the script that made them. Run `20261115T121441Z`, five sessions a cell.

| Task | The copy | Expected | No tool | ponytail | Rules alone | Rules and index | Notes given |
|---|---|---|--:|--:|--:|--:|--:|
| `hold-copy-age` | the same lines | a note | 0/5 | 0/5 | 4/5 | 5/5 | 5/5 |
| `hold-copy-percent` | the same sum, other names for its variables | silence | 0/5 | 0/5 | 5/5 | 4/5 | 0/5 |
| `hold-copy-coupon` | the same comparison; the fix only adds to the line | silence | 5/5 | 0/5 | 5/5 | 4/5 | 0/5 |

It did what was expected of it on all three. Where it speaks, the sessions that heard it fixed both places every time: five of five here, and five of five more in the arm without the rule about tests.

Two things in this table are not good news, and both are small numbers:

- **These tasks do not need the finder.** The rules alone reached every place in 14 sessions of 15. The copies here share words that a search finds, which was not so in `hold-reach-points`. So on tasks nobody tuned on, the finder shows as five of five against four of five, on one task. That is all the proof there is that it helps outside the tasks it was built on.
- **Where it is silent, sessions with the index did a little worse than the rules alone**: two misses in ten, and one in ten more without the rule about tests, against none in ten. Two of those three sessions said in their report that the fix matched the rounding in `applyDiscount`, a helper the list had named and the task has nothing to do with; one of them added that "no other file duplicated this truncation bug", in a project where one does. Three in twenty against none in ten is not a difference a careful reader would bet on. It is the direction D15 warns about, so it is written down.

Two of the ten sessions that got the note got a second one they did not need. They had fixed the second file by making it call the first, and the lines that edit took out are, rightly, still in the first file.

Without a model, on the 75 sessions of this run: 29 fixed one place and left another, most of them with no tool or with ponytail. The finder would have pointed 11 of them to the place they left, which is every one of `hold-copy-age`, and none of the other 18. Two misses in five are of the shape it sees.

## All of it together

### The tuning tasks

Run `20261115T114102Z`: 22 tasks, three sessions each, 264 sessions. The copy finder in this run is one fix older than the one that ships. With the one that ships, the notes went to the same three tasks and to no other (runs `20261115T122639Z` and `20261115T123030Z`).

| Measure | No tool* | ponytail* | Index alone | Rules alone | Rules and list | Rules, list and tests' place |
|---|--:|--:|--:|--:|--:|--:|
| Sessions | 110 | 110 | 66 | 66 | 66 | 66 |
| Passed every hidden check | 87/110 | 86/110 | 63/66 | 64/66 | 66/66 | 66/66 |
| Held on input the ticket left out | 103/110 | 100/110 | 63/66 | 66/66 | 66/66 | 66/66 |
| Reached every place | 14/25 | 11/25 | 15/15 | 13/15 | 15/15 | 15/15 |
| Reused what the project had | 16/25 | 25/25 | 15/15 | 15/15 | 15/15 | 15/15 |
| Within the size budget | 23/25 | 25/25 | 15/15 | 13/15 | 12/15 | 12/15 |
| Left a test where the logic needs one | 0/70 | 7/70 | 0/42 | 30/42 | 34/42 | 37/42 |
| Wrote a test where none was needed | 0/40 | 0/40 | 0/24 | 15/24 | 9/24 | 8/24 |
| Source lines added, mean (median) | 5.8 (3) | 3.8 (3) | 5.3 (3) | 6.4 (3) | 6.8 (4) | 6.4 (3) |
| Cost per session | 0.030 $ | 0.036 $ | 0.033 $ | 0.059 $ | 0.055 $ | 0.049 $ |
| Time per session | 16 s | 17 s | 16 s | 32 s | 28 s | 24 s |
| Turns (median) | 5 | 5 | 4.5 | 10 | 9 | 7 |

\* Stored runs, five sessions a task.

Task by task, the list took 7 % off the cost of a session with the rules (cheaper in 14 tasks of 22; not a difference to rely on), and the tests' place another 10 % (cheaper in 17 of 22). Together 16.5 %, cheaper in 15 of 22. Nothing was lost on the way: 66 of 66. That is why the tests' place is on.

The size budget is missed by one task in every arm that has rules: `hold-cut-suppliers`, whose budget was set too tight by mistake and has not been moved ([rules.md](rules.md)).

### Tasks nothing was tuned on

The six held-out tasks of round 2 and the three of round 4. Runs `20261115T122041Z` and `20261115T121441Z`, five sessions a cell, with the plugin as it ships.

| Measure | No tool* | ponytail* | Rules alone | Rules and index | The same, without the rule about tests |
|---|--:|--:|--:|--:|--:|
| Sessions | 45 | 45 | 45 | 45 | 45 |
| Passed every hidden check | 35/45 | 30/45 | 44/45 | 43/45 | 44/45 |
| Reached every place | 15/25 | 10/25 | 24/25 | 23/25 | 24/25 |
| Reused what the project had | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Within the size budget | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| Left a test where the logic needs one | 4/30 | 6/30 | 25/30 | 28/30 | 0/30 |
| Wrote a test where none was needed | 0/15 | 0/15 | 3/15 | 2/15 | 0/15 |
| Source lines added, mean (median) | 3.2 (2) | 2.9 (2) | 3.6 (2) | 3.6 (2) | 3.8 (3) |
| Cost per session | 0.031 $ | 0.037 $ | 0.052 $ | 0.053 $ | 0.040 $ |
| Time per session | 16 s | 16 s | 26 s | 24 s | 17 s |
| Turns (median) | 6 | 5 | 8 | 7 | 6 |

\* On the six tasks of round 2, the stored run `20261115T023408Z`.

The saving did not carry over. On tasks the index was not developed on, a session with it costs what a session with the rules alone costs: 3 % more, cheaper in four tasks and dearer in five. It takes a sixth of the turns away (fewer in seven tasks of nine) and that does not show in the bill.

## What a session costs

Claude Code sends everything a session has seen with every call it makes, so a session's cost is the number of calls times the size of what they carry. One session taken apart on the round 4 project:

| What the session carries on every call | Tokens, about |
|---|--:|
| Claude Code's own instructions and tools, with these five tools | 8,400 |
| The ticket and where the session is | 650 |
| Ockham's rules | 540 |
| The list of 24 helpers | 1,100 |
| Where the tests are | 180 |

The list is a tenth of what a call carries when a session starts, and it is carried on every call, whether the task needs a helper or not. By the prices Claude Code reports, it pays for itself when it saves about two calls in a session. On the tuning tasks it did; on the held-out ones it broke even. The tests' place is cheap, and it is the part that saved.

The plan asked that a session with the index cost no more than one with the rules alone. On the tuning tasks it costs a sixth less. On tasks nothing was tuned on it costs the same.

## Without the rule about tests

Asked in [phase 2](rules.md) why Ockham costs more, the answer was the tests. `OCKHAM_TESTS=off` leaves rule 7 out of the ruleset, and with it the tests' place, and nothing else. It is off unless asked for: rule 7 is in the ruleset that was approved.

On the nine held-out tasks it is the last column above: the same hidden checks as the rules alone, 44 of 45, at 0.040 $ a session against 0.053 $. A quarter less, and cheaper in nine tasks of nine.

On the 22 tuning tasks (run `20261115T122639Z`, next to the stored arms of `20261115T114102Z`) it passed every hidden check in 66 sessions of 66 and reached every place in 15 of 15, at 0.036 $ a session against 0.049 $ with the rule: 27 % less, cheaper in 20 tasks of 22, in 16 seconds against 24. With no tool those tasks cost 0.030 $ a session, and 87 sessions of 110 pass.

What a session that passes every hidden check costs, on the held-out tasks: the cost of all the sessions of an arm divided by the ones that passed.

| | No tool | ponytail | Rules alone | Rules and index | Without the rule about tests |
|---|--:|--:|--:|--:|--:|
| Passed every hidden check | 78 % | 67 % | 98 % | 96 % | 98 % |
| Cost per session | 0.031 $ | 0.037 $ | 0.052 $ | 0.053 $ | 0.040 $ |
| Cost per session that passed | 0.040 $ | 0.055 $ | 0.053 $ | 0.056 $ | 0.041 $ |

So Ockham does not make a session cheaper than using no tool, in any form. Without the rule about tests, a change that works costs what it costs with no tool, and nearly every session produces one where one in five did not. With the rule, it costs 40 % more and leaves a test behind in nine sessions of ten that need one.

The owner chose the tests: the rule ships on ([D17](decisions.md)).

## The second round

The owner kept the rule about tests on ([D17](decisions.md)) and asked for one more round on the list before going on. This is that round, with what the first one had left open.

The nine held-out tasks above had shown that the index did not pay, and that is what this round worked from. So they are tuning tasks from here on, and six new ones were written to prove what came out of it.

### The list, shorter, and without it

`OCKHAM_LIST=map` gives the list as files with the names and parameters of their helpers, and nothing about what each one does: for the project of round 4, 1,181 characters where the whole list is 2,846. `OCKHAM_LIST=off` gives none. The three forms on the nine tasks, three sessions each (run `20261115T130519Z`), with the rules in all of them:

| Measure | Whole list | Short list | No list | Rules alone* |
|---|--:|--:|--:|--:|
| Passed every hidden check | 27/27 | 27/27 | 26/27 | 44/45 |
| Cost per session | 0.052 $ | 0.052 $ | 0.054 $ | 0.052 $ |
| Time per session | 24 s | 25 s | 27 s | 26 s |
| Turns (median) | 7 | 8 | 9 | 8 |
| Tokens a session carried in all | 77,000 | 79,000 | 84,000 | |
| Wrote a test where none was needed | 1/9 | 4/9 | 7/9 | 3/15 |

\* The first validation, five sessions a task, without the index.

The form of the list does not change what a session costs. The short one takes 1 % off, cheaper in five tasks and dearer in four; none at all adds 3 %. What the shorter text saves on every call, the agent spends on more calls: not told what a helper does, it opens the file to find out. Turns go up a tenth with the short list, in seven tasks of nine, and a fifth with none, and so does everything the session carries.

Without any rules the short list still does the list's job: the helper was reused in 18 sessions of 18 (run `20261115T131202Z`).

So the list ships whole ([D18](decisions.md)). It is not what makes a session dear, and no cheaper form of it was found.

Two things came out of this round that nobody was looking for:

- **The helper that sent sessions the wrong way was not the list's doing.** In `hold-copy-percent` two sessions had taken a helper about discounts for the place the rounding had to match, and the list had named it. A session with no list did the same: it found that helper by searching.
- **Where the tests are is read as an order.** With no rules at all, a session told where the tests are and how one begins wrote a test 18 times of 18, fifteen of them on tasks that do not ask for one, and cost 0.044 $ where the index alone had cost 0.024 $ on the same tasks before that text was on. The list was the short one this time, which the run above says costs the same; the tests are the difference. With the rules it does not show: they already say when a test is due. The sentence says "a new test goes with them", and it should say where a test goes if one is written.

### The finder: other names, and no pointing back

Two changes, both tried first on every saved session without a model.

**A copy with other names for its own things.** When nothing with the same names is found, the line is compared by its shape: its tokens with the names it gives to its own things blanked, and the words of the library and of the project kept. A line is a copy when it has 85 % of the shorter shape of the two in the same order, two of the things the line is anchored by (a word of the library or the project, or a number), and the part the change took out. `cents - Math.floor(cents * percent / 100)` and `unitCents - Math.floor(unitCents * agreedPercent / 100)` are that. Two lines that only loop over a list are not: nothing in them says what they are about.

**No pointing at the file the change now calls.** Sessions that fixed a copy by making it call the first function were told that the lines they had just taken out were "also in" the file they now called. A change that brings in a name another file exports is not pointed at that file.

Put to the 1,367 sessions saved before the new tasks were run: of the 80 that fixed one place and left another, it points 73 to the place they left, where it pointed 60; of the 1,287 others, none anywhere, as before. Moving the 85 % down to 70 % changes neither number.

### Six tasks written for this round

Written before any of this was run on them, with what was expected of each (`node bench/index-check.mjs` says the same without a model). Run `20261115T133134Z`, five sessions a cell, with the plugin as it ships.

| Task | What it has | Expected of the index | No tool | Rules alone | Rules and index | Notes given |
|---|---|---|--:|--:|--:|--:|
| `hold-reach-lockout` | the same line in two files | a note | 1/5 | 5/5 | 5/5 | 5/5 |
| `hold-reach-stock` | the same condition, in a line that is otherwise another | no note from the file the ticket names | 5/5 | 5/5 | 5/5 | 1/5 |
| `hold-reach-delivery` | the same call with the same number and another argument | no note | 3/5 | 4/5 | 5/5 | 0/5 |
| `hold-reuse-duration` | a helper that is in the list | | 5/5 | 5/5 | 5/5 | |
| `hold-reuse-initials` | a helper the list leaves out, cut at 24 | | 5/5 | 5/5 | 5/5 | |
| `hold-safe-next` | nothing for the index to say | | 2/5 | 2/5 | 2/5 | |

| Measure | No tool | Rules alone | Rules and index |
|---|--:|--:|--:|
| Passed every hidden check | 21/30 | 26/30 | 27/30 |
| Reached every place | 9/15 | 14/15 | 15/15 |
| Reused what the project had | 10/10 | 10/10 | 10/10 |
| Held on input the ticket left out | 27/30 | 27/30 | 27/30 |
| Left a test where the logic needs one | 0/15 | 14/15 | 15/15 |
| Cost per session | 0.030 $ | 0.050 $ | 0.047 $ |
| Time per session | 16 s | 25 s | 21 s |
| Turns (median) | 6 | 10 | 8 |

- **The notes came where they were expected, and one more.** In `hold-reach-stock` one session began with the other file, from where the copy is found, and was pointed to the one the ticket names. It was right. Six sessions got a note, six fixed every place, and none was pointed back.
- **A session with the index costs no more.** 5 % less than with the rules alone, cheaper in four tasks of six, which is not a difference to rely on. It is quicker, and that one is: a sixth less time and a quarter fewer turns, in six tasks of six.
- **Reuse cannot show here either.** With no tool at all, the helper is reused in ten sessions of ten: both tickets say whose way of doing it to follow.
- **One task nothing helps on.** `hold-safe-next` sends a person back to the page they were on, and three sessions of five leave it open to a link that starts with `/\`, which a browser reads as another site. With the rules or without. Rule 3 says "hostile input" and that was not enough to bring this one to mind.
- **A report that says what was not done, again.** The one miss of the rules alone closed with: *No other file referenced the "3 days" value.* One does.

## Where this leaves phase 3

The bar in the [plan](plan.md): "Reuse goes up on the reuse tasks, with almost no false warnings", and, added when phase 2 closed, "a session with the index costs no more than one with the rules alone".

| | |
|---|---|
| Reuse | With the index and no rules, 15 sessions of 15 against 16 of 25 with no tool, and 18 of 18 with the short list. On top of the rules there was nothing to gain: they already reuse every time |
| False warnings | None in 546 sessions with the index. The second-version warning never fired. The note about a copy went to 70 sessions, every one in a task where the bug has a copy, and all 70 fixed every place. Four of them got a second note they did not need, pointing back at the file they had fixed first; none has since the finder was taught not to |
| Cost | A sixth less than the rules alone on the tasks it was developed on. The same on the nine tasks of the first validation. A twentieth less on the six of the second, and a sixth less time. No form of the list moves it |
| Not in the plan | The copy of a fixed bug, which no wording of a rule could make an agent look for, is found by a program at the moment of the edit: a copy of the same shape, with the same names or with others |

Reuse was already solved by the rules when this phase began, so the phase could not show much on its own bar. What it leaves is a reuse that no longer depends on the agent searching, a finder of copies, sessions that are a sixth quicker, and a cost that is no higher. The owner closed the phase on 15 November 2026 with that on record.

## Limits

- **JavaScript and TypeScript only**, read with regular expressions. A declaration that does not start at the left margin is not seen.
- **Small projects.** The benchmark's has 42 source files in its first round and 67 in its last. Nothing here says how a list of 24 helpers serves a project with two thousand, or what the index costs to build there.
- **The finder sees a line that is written twice.** With the same names or with others, and a fix that takes something out of it. A fix that only adds to the line, or the same condition or the same number in a line that is otherwise another, and it is silent. Of the 87 saved sessions that left a place unfixed, it would point 77.
- **One model, one host, no shell.** Claude Sonnet 5 in Claude Code, writing files and running nothing.
- **Five sessions a cell at the most.** The differences relied on here are five in five, or hold across many tasks. The ones that are not are said to be small.
- **The saving in cost was measured on the tasks the index was developed on,** and on the others it is a session that costs the same and ends sooner. It is reported as it came.
- **The held-out tasks were written by the person who wrote the finder.** They were written first and their expectations with them, and that is all that can be said for them.

## Open

- **Where the tests are, said as a fact and not as an order.** "A new test goes with them" made a session with no rules write one every time. Done in phase 4: the sentence now starts "If you add a test", and with the index alone no session of 18 wrote one, where 18 of 18 had ([checks.md](checks.md)).
- **An open redirect that gets through three times in five.** `hold-safe-next`, with the rules or without. For a rule, or for the checks of phase 4.
- **The copies the finder still does not see.** A fix that only adds to the line; the same number in another call. Ten of the 87 saved misses.
- **Reports of checks that were not made.** Still there with the rules alone. Phase 4.
- **The budget of `hold-cut-suppliers`,** still the one that was set too tight.
