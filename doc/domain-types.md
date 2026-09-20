# Domain Types

Make illegal states unrepresentable: encode domain rules in types so the checker
prevents invalid combinations. Inspired by Scott Wlaschin’s
[Domain Modeling Made Functional](https://store.pragprog.com/titles/swdddf/domain-modeling-made-functional/).

- **Use domain vocabulary.** Reuse `Rank`, `Suit`, `Card`, `HandClass`, and `Cents`
  where applicable. Use literal unions for finite choices; keep `string` for free text.
- **Model valid alternatives.** Use unions when states require different data.
  Make fields and map entries optional only when absence is valid.
- **Preserve guarantees.** Type function inputs, outputs, API contracts, and UI
  state. A workflow should accept the state it requires and return the state it produces.
- **Validate at boundaries.** Narrow untrusted `unknown` values into domain types.
  Prefer narrowing internally; assertions require an established guarantee.
  Never silence type errors with casts or defaults that hide invalid state.

For example, an observed open requires an opponent:

```javascript
/**
 * @typedef {import('../src/backend/learn-types.js').Position} Position
 * @typedef {{kind: 'first-in'} | {kind: 'facing-open', opponent: Position}} Decision
 */
```

Keep it pragmatic: numeric aliases such as `Cents` document units but do not
check them. Rules such as frequency totals and card uniqueness still need runtime
validation and behavior tests.

Run `npm run typecheck` after contract changes. Since `noImplicitAny` is disabled,
also check that untyped helpers have not erased the domain types.
