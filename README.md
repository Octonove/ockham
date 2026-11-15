# Ockham

**The smallest change that works, checked.**

Ockham makes a coding agent write only the code a task needs, reuse what the codebase already has, and check what it wrote before it says "done". For Claude Code and Codex.

> **Status: private, in development. Phases 0 to 2 of 9 are done: the foundations, the benchmark and the rules ([docs/rules.md](docs/rules.md)). Phase 3, the index, is built and measured ([docs/index.md](docs/index.md)).**
> Installed as a Claude Code plugin, Ockham today gives a session its rules when it starts, with a list of what the project already has; tells it where the other copy is when it replaces a line that another file has too; and gives every subagent a compact copy of the rules. The checks at the end of a task do not exist yet. The rule of the project is that no rule or mechanism ships before a measurement says it helps, so the benchmark came first.

![One ticket given to a coding agent without Ockham and with it](docs/demo/points.svg)

*One ticket of the benchmark, without Ockham and with it. Nothing in the picture is staged: it is drawn from two recorded sessions ([docs/demo](docs/demo)), and a test fails if it stops matching them. They are typical ones: in the benchmark, with no tool the second copy of this bug was fixed in no session of five, and with Ockham's note in fifteen of fifteen.*

## Why

A prompt can ask an agent to keep things small. It cannot tell whether the agent did, it cannot show the agent what already exists at the moment it is about to write, and it forgets everything when the session ends.

Ockham keeps the prompt and adds what a prompt cannot do:

| Layer | What it does |
|---|---|
| **Rules** | A short ruleset, written from scratch and tuned one change at a time against the benchmark. |
| **Context** | Before the agent creates a function or a file, Ockham looks it up in an index of the project and says: this already exists, here. Between sessions it remembers the project's conventions, decisions and deferred shortcuts. |
| **Checks** | When the task ends, Ockham looks at what was actually written: a new dependency, a copy of an existing helper, risky logic left without a test, validation that disappeared. If something is wrong, the agent fixes it before it answers. |

## How it works

Four moments in every task:

1. **The session starts.** Ockham loads its rules and what it remembers about the project.
2. **Before code is written.** It warns if something similar already exists.
3. **The task ends.** It checks what was written.
4. **Afterwards.** It records cost, shortcuts and what was learned.

Steps 2 and 3 are what a prompt alone cannot do.

The picture at the top is step 2, replayed from recorded sessions. The other steps will be recorded from the working tool as their phases land. Nothing shown here will be a mock-up.

## What exists today

| Piece | State |
|---|---|
| Repository, tests on Linux, Windows and macOS | Done |
| Plugin skeleton for Claude Code; its session hook is proven on a live session | Done |
| Benchmark harness: isolated headless sessions, hidden checks, self-test of every instrument | Done |
| Benchmark tasks | 31: 22 to tune on, 9 held out to prove what was tuned |
| Baseline (no tool, and ponytail as the reference arm) | Measured: [docs/baseline.md](docs/baseline.md) |
| Rules: seven of them, in two sizes, in English and Spanish | Version 1, measured: [docs/rules.md](docs/rules.md) |
| The rules reach the session and its subagents | Proven on live sessions, with a word only each hook knows |
| Index of the project: what its files share, told when a session starts, and a note when a change replaces a line that another file has too | Built, measured: [docs/index.md](docs/index.md) |
| The index reaches the session, at its start and when it writes | Proven on live sessions, on a project whose names cannot be guessed |
| End-of-task checks, review, memory, band | Phases 4 to 7 |

The plan, with what each phase delivers and how it is checked, is in [docs/plan.md](docs/plan.md). The decisions behind it are in [docs/decisions.md](docs/decisions.md).

## What the baseline shows

180 sessions on the benchmark, before Ockham changes anything ([docs/baseline.md](docs/baseline.md)):

| Measure | No tool | ponytail |
|---|--:|--:|
| Correct | 90/90 | 90/90 |
| Reused what the project already had | 16/25 | 25/25 |
| Reached every place the bug was in | 14/15 | 10/15 |
| Held on input the ticket left out | 86/90 | 85/90 |
| Left a test where the logic needs one | 0/50 | 4/50 |

With no tool the agent rewrites what the project already has. With a rule to do less it reuses everything, and then leaves out part of the job and reports the omission as a saving: a CSV export with no quoting, five times out of five. Ockham has to do the first without the second.

## What the rules do

Seven rules, 314 words. The first thing they say is which half wins: "the smallest change that does the whole job. If they pull apart, the whole job wins."

On the 22 tasks they were tuned on, five sessions a task ([docs/rules.md](docs/rules.md)):

| Measure | No tool | ponytail | Ockham |
|---|--:|--:|--:|
| Passed every hidden check | 87/110 | 86/110 | 105/110 |
| Held on input the ticket left out | 103/110 | 100/110 | 110/110 |
| Reached every place the bug was in | 14/25 | 11/25 | 20/25 |
| Reused what the project already had | 16/25 | 25/25 | 25/25 |
| Left a test where the logic needs one | 0/70 | 7/70 | 60/70 |
| Source lines added per session, mean (median) | 5.8 (3) | 3.8 (3) | 6.3 (3) |
| Cost per session | 0.030 $ | 0.036 $ | 0.054 $ |

On six tasks the rules never saw, they lose nothing; those tasks are too easy to show more. On four others, written after the first version was frozen and shaped like ponytail's two failures, that version held on real input in 20 sessions of 20 against ponytail's 15.

What the rules do not do:

- **Find the copy of a bug in another module.** In one task, no wording made the agent look for it, and one wording made it say that it had: four sessions of five closed with a search or a check that the project contradicts, and three of those had run nothing. That check is a job for a program, not for a prompt. The index now does part of it, at the moment of the edit; the rest is what phase 4 is for.
- **Come free.** Ockham costs half as much again as ponytail and takes two thirds longer. Most of that is the tests it leaves behind, which has been measured since: see below.
- **Write as little as ponytail.** The same at the median, 1.2 lines a session more on the tasks both solve.

## What the index adds

A program that knows what the project has, which is what a prompt cannot be. When a session starts it is told which helpers the project's files share and where its tests are. When an edit replaces a line that another file has too, it is told the file and the line.

On nine tasks nothing was tuned on, five sessions a task ([docs/index.md](docs/index.md)):

| Measure | No tool | ponytail | Rules alone | Rules and index | The same, without the rule about tests |
|---|--:|--:|--:|--:|--:|
| Passed every hidden check | 35/45 | 30/45 | 44/45 | 43/45 | 44/45 |
| Reached every place the bug was in | 15/25 | 10/25 | 24/25 | 23/25 | 24/25 |
| Left a test where the logic needs one | 4/30 | 6/30 | 25/30 | 28/30 | 0/30 |
| Cost per session | 0.031 $ | 0.037 $ | 0.052 $ | 0.053 $ | 0.040 $ |
| Cost per session that passed every check | 0.040 $ | 0.055 $ | 0.053 $ | 0.056 $ | 0.041 $ |
| Time per session | 16 s | 16 s | 26 s | 24 s | 17 s |

What that says:

- **The note about a copy works where a program can see the copy.** In every run so far it went to 55 sessions, on the four tasks where a bug has a copy of the same shape, and all 55 fixed both places. One of those tasks is the one no wording of a rule could move.
- **It does not see every copy.** Written with other names for its variables, or fixed by adding to the line, a copy gets no note. Two of the held-out tasks were made that way on purpose, and it said nothing on either, as expected. And on tasks nobody tuned on, the rules alone already reach nearly every place, so there the note shows as five sessions of five against four of five, on one task.
- **The index does not make a session cheaper.** It takes steps away and adds a list to every call, and the two cancel out: 0.053 $ against 0.052 $. On the tasks it was developed on it had saved a sixth. That did not carry over.
- **What costs is the tests.** Without the rule that asks for one, a session costs a quarter less and passes the same hidden checks: a change that works then costs what it costs with no tool, and nearly every session produces one, where one in five did not. `OCKHAM_TESTS=off` leaves that rule out. It is in unless asked.
- **No false warning so far**, in 417 sessions with the index.

## The benchmark

Every cell is one headless agent session on a fresh copy of a project of some forty source files. The agent gets a ticket and nothing else. What it leaves behind is scored by a check it never saw.

```bash
npm run bench:selftest                                             # prove the instruments, no model called
npm run bench:index                                                # what the index would say on every task, no model called
npm run hook:live                                                  # prove on real sessions that the hooks reach the model and its subagents
node bench/run.mjs --arms baseline --runs 1 --model sonnet         # one pass without any tool
OCKHAM_BENCH_PONYTAIL_DIR=/path/to/ponytail node bench/run.mjs --arms baseline,ponytail,ockham --runs 5
node bench/run.mjs --held-out --arms ockham --runs 5               # the tasks no rule was tuned on
node bench/trace.mjs hold-reach-points                             # one session, every call it makes
```

Each of the first 18 tasks probes one thing a careless change gets wrong. Ten more came with the rules: six held out, and four shaped like the reference tool's failures. Three more came with the index, held out: bug fixes whose logic is copied in another module.

| Probes | Tasks | A careless change |
|---|--:|---|
| reuse | 4 | writes its own version next to the one the project has, and misses a case the original handles |
| dependency | 3 | installs a library for what the project or the runtime already does |
| reach | 3 | fixes the place the ticket names and leaves the other one wrong |
| safety | 4 | trusts text that comes from a stranger |
| guard | 1 | makes a function shorter by dropping the checks that looked like clutter |
| size | 3 | builds a framework for a change of three lines |

Every task ships a good reference solution and at least one bad one, and the self-test fails unless each check passes the good one and catches the bad ones. More in [bench/README.md](bench/README.md).

## Development

Node.js 20 or later. No runtime dependencies.

```bash
npm ci
npm test            # unit tests
npm run typecheck   # the JavaScript is type-checked, not compiled
```

## Credit

The idea of a ruleset that makes an agent write less was made popular by [ponytail](https://github.com/DietrichGebert/ponytail) (MIT). Ockham is written from scratch, and uses ponytail as the reference arm of its benchmark.
