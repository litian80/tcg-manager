---
description: Where to place new files in the tcg-manager project
---

# File Placement Guide

When creating new files in this project, follow these conventions:

## Next.js App Code
| Type | Location | Example |
|---|---|---|
| Pages / Routes | `app/<feature>/` | `app/organizer/page.tsx` |
| Server Actions | `actions/` | `actions/roster-management.ts` |
| React Components | `components/<feature>/` | `components/tournament/match-card.tsx` |
| Shared UI (shadcn) | `components/ui/` | `components/ui/button.tsx` |
| Custom Hooks | `hooks/` | `hooks/use-debounce.ts` |
| Library / Utilities | `lib/` | `lib/rbac.ts`, `lib/types.ts` |
| Supabase Clients | `utils/supabase/` | `utils/supabase/client.ts` |
| Middleware | root | `middleware.ts` |
| Static Assets | `public/` | `public/logo.png` |

## Database
| Type | Location | Example |
|---|---|---|
| Schema definitions | `db/schema/` | `db/schema/supabase_schema.sql` |
| Hotfixes & patches | `db/fixes/` | `db/fixes/fix_standings_schema.sql` |
| RLS / RBAC / Security | `db/security/` | `db/security/rbac_setup.sql` |
| Feature-specific SQL | `db/features/` | `db/features/judge_system.sql` |
| Supabase migrations | `supabase/migrations/` | Managed by Supabase CLI |

## Tooling & Scripts
| Type | Location | Example |
|---|---|---|
| TDF analysis scripts | `tools/tdf/` | `tools/tdf/analyze_tdf.py` |
| Data scanning scripts | `tools/scanners/` | `tools/scanners/scan_cup_data.py` |
| Script output / reports | `tools/output/` | `tools/output/tdf_report.txt` (gitignored) |
| Verification scripts | `scripts/` | `scripts/verify_judge.js` |

## Documentation
| Type | Location | Example |
|---|---|---|
| User manuals | `docs/` | `docs/USER_MANUAL.md` |
| Reference PDFs | `docs/` | `docs/play-pokemon-*.pdf` |
| Sample data | `docs/` | `docs/sample-tournament.xml` |
| TDF test files | `TOMfiles/` | `TOMfiles/*.tdf` |

## Rules
1. **Never put SQL, Python, or report files in the project root.**
2. Script output files go in `tools/output/` and are gitignored.
3. New components should be grouped by feature domain under `components/`.
4. If a new category doesn't fit above, create a subfolder rather than polluting the root.
