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
