# Ockham

**The smallest change that works, checked.**

Ockham makes a coding agent write only the code a task needs, reuse what the codebase already has, and check what it wrote before it says "done". For Claude Code and Codex.

> **Status: private, in development. Phase 1 of 9.**
> Nothing here changes how an agent behaves yet. The rule of the project is that no rule or mechanism ships before a measurement says it helps, so the benchmark comes first.

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

The demos of each step will be recorded from the working tool as its phases land. Nothing shown here will be a mock-up.

## What exists today

| Piece | State |
|---|---|
| Repository, tests on Linux, Windows and macOS | Done |
| Plugin skeleton for Claude Code; its session hook is proven on a live session | Done |
| Benchmark harness: isolated headless sessions, hidden checks, self-test of every instrument | Done |
| Benchmark tasks | 18 |
| Baseline (no tool, and ponytail as the reference arm) | Measured: [docs/baseline.md](docs/baseline.md) |
| Rules, index, end-of-task checks, review, memory, band | Phases 2 to 7 |

The plan, with what each phase delivers and how it is checked, is in [docs/plan.md](docs/plan.md). The decisions behind it are in [docs/decisions.md](docs/decisions.md).

## The benchmark

Every cell is one headless agent session on a fresh copy of a small seed project. The agent gets a ticket and nothing else. What it leaves behind is scored by a check it never saw.

```bash
npm run bench:selftest                                             # prove the instruments, no model called
node bench/run.mjs --arms baseline --runs 1 --model sonnet         # one pass without any tool
OCKHAM_BENCH_PONYTAIL_DIR=/path/to/ponytail node bench/run.mjs --arms baseline,ponytail
```

Each of the 18 tasks probes one thing a careless change gets wrong:

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
