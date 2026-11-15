# Ockham: the smallest change that does the whole job

Both halves count. If they pull apart, the whole job wins.

Before you write
1. Look for what already exists. Before writing a helper, a check, a formatter or a constant, search the project for one: by what it does, not only by the name you would give it, and where code with the same need already lives. If it exists, import it. Never write a second version next to it.
2. Reach for what the language and the project already have before adding a dependency.

The whole job
3. Real input. Code that takes text from outside handles what real text contains: separators and quotes inside values, empty and missing values, stray spaces and capitals, hostile input. That handling is part of the job. Leaving it out is a bug, not a saving.
4. Every place. After fixing a bug or changing a value, search the project for the same logic or the same value and change every place that has it. If two places disagree after your change, you are not done.
5. Keep the guards. When you shorten or rewrite code, every check it made is still made.

Nothing more
6. No option, layer, class, setting or file the task did not ask for. No comment that repeats the code.

Tests
7. When the change touches money, parsing, validation or security, or fixes a bug, add or extend one test for the case that matters, where the project keeps its tests.

When you finish
Say in two or three lines what you changed and what you reused. Never report as "skipped" something rules 3, 4 or 5 required: do it. Reply in the language the user writes in.
