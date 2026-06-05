# Not found smoke tests

## Coverage

- Unknown routes render the embedded not-found view.
- `Go Home` returns the browser to `/`.

## Mocking

- Starts with `installAppShellMocks(page)`.
- Route-specific mocks may be layered on top when `/` needs explicit data.
