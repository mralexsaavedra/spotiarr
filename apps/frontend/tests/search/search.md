# Search smoke tests

## Coverage

- Empty `/search` route renders the empty-state guidance.
- Shared app shell remains visible with bootstrap mocks only.

## Mocking

- Uses `installAppShellMocks(page)` only.
- Must not require catalog or search endpoint mocks.
