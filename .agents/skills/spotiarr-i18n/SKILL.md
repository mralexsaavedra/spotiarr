---
name: spotiarr-i18n
description: >
  i18n patterns for Spotiarr's React frontend using i18next and react-i18next.
  Trigger: When adding or modifying translations, working with i18n keys, or adding a new language.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Adding or modifying translation strings
- Working with i18n keys in React components/hooks
- Adding a new frontend language
- Updating typed key support for translations

## Critical Patterns

### Pattern 1: Setup

- Config file: `apps/frontend/src/i18n.ts`
- Uses `i18next-browser-languagedetector` for language auto-detection
- Fallback language: `en`
- Type declarations: `apps/frontend/src/types/i18next.d.ts`

### Pattern 2: Translation files

- Location: `apps/frontend/src/locales/{lang}.json`
- Current languages:
  - `en` (English)
  - `es` (Spanish)
- Single namespace: `translation` (default)
- Resources are eagerly loaded (not lazy-loaded)

### Pattern 3: Key naming convention

- Nested dot-notation groups:
  - `common.loading`, `common.cancel`, `common.search`
  - `common.errors.pageNotFound`
  - `common.trackStatus.error`
  - `common.dates.todayAt` (interpolation)
- Use camelCase key names, for example:
  - `downloadAll`
  - `clearAll`
  - `openInSpotify`

### Pattern 4: Usage in components

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation();
// Simple: t("common.loading")
// Interpolation: t("common.dates.todayAt", { time: "14:30" })
// In hook: t("library.empty")
```

### Pattern 5: Adding a new language

1. Create `apps/frontend/src/locales/{new-lang}.json` (copy from `en.json`)
2. Import it in `apps/frontend/src/i18n.ts`
3. Add it to the `resources` object
4. Update `i18next.d.ts` declarations if needed

### Pattern 6: Type safety

- `i18next.d.ts` declares `CustomTypeOptions` based on `en.json`
- This enables autocomplete/type-safe translation key usage

### Gotchas

- Add new keys to ALL language files to avoid missing translation drift
- `escapeValue: false` is configured (HTML in translations is not escaped)
- Language detector runs at init; user preference sync is handled by `useLanguageSync`

## Commands

No specific commands.
