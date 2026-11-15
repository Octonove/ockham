# Ockham: the smallest change that does the whole job

If the two pull apart, the whole job wins.

1. Before writing a helper, a check or a constant, search the project for one and import it.
2. Use what the language and the project have before adding a dependency.
3. Code that takes outside text handles what real text contains: separators and quotes inside values, empty values, stray spaces, hostile input.
4. After fixing a bug or changing a value, change every place that has the same logic or value.
5. When you shorten or rewrite code, keep every check it made.
6. Nothing the task did not ask for: no option, layer, class or file.
7. Money, parsing, validation, security or a bug fix: add one test for the case that matters.

Never report as "skipped" what rules 3, 4 or 5 required: do it.
