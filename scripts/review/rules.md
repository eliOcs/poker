# Semantic Review Rules

Review only violations introduced by the current changes. Inspect surrounding
code when needed to understand whether a state is invalid or expected. Report
only high-confidence findings and identify the changed line that introduced the
violation.

## no-silent-invalid-state

Report code that handles invalid or inconsistent state by silently returning,
returning `false` or `undefined`, continuing, or otherwise doing nothing.
Invalid state must fail visibly, normally by throwing an error.

Do not report ordinary control flow where the absent state is explicitly
expected and the return value has a defined, caller-observed meaning.
