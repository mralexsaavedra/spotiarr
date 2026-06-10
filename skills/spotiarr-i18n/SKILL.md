---
name: spotiarr-i18n
description: "Trigger: i18n, translation, i18next, language, locale, new language, translate. spotiarr frontend i18n: key conventions, useLanguageSync override, adding languages."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when adding/modifying translations, working with i18n keys, or adding a new frontend language.

## Hard Rules

- Language is controlled by `UI_LANGUAGE` backend setting via `useLanguageSync` — it overrides browser detection. Never call `i18n.changeLanguage()` manually elsewhere.
- `escapeValue: false` is configured — HTML in translation strings is NOT escaped. Never put untrusted content in translation values.
- Add new keys to ALL language files simultaneously — missing keys silently fall back to key name.

## Key Conventions

- Nested dot-notation: `common.loading`, `common.errors.pageNotFound`, `common.trackStatus.error`
- Interpolation keys: `common.dates.todayAt` → `t("common.dates.todayAt", { time: "14:30" })`
- camelCase key names: `downloadAll`, `clearAll`, `openInSpotify`
- Top-level groups beyond `common` exist (e.g. `instanceAuth`, `player`, `settings`) — check `src/locales/en.json` for the current group list before adding a new top-level key.

## Decision Gates

| Action           | Steps                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Add keys         | Edit `src/locales/en.json` + `src/locales/es.json` simultaneously                                 |
| Add new language | Copy `en.json` → `{lang}.json` · import in `i18n.ts` · add to `resources` · update `i18next.d.ts` |
| Use in component | `const { t } = useTranslation()` → `t("key.path")`                                                |

## References

- Config: `apps/frontend/src/i18n.ts`
- Locales: `apps/frontend/src/locales/`
- Type declarations: `apps/frontend/src/types/i18next.d.ts`
- Language sync hook: `apps/frontend/src/hooks/useLanguageSync.ts`
