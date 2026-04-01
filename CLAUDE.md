## HIPAA Compliance — Mandatory

Every feature must be HIPAA compliant. These rules are non-negotiable:

- **No PHI in employer/third-party views** — employer pages, reports, and exports must show only username, public_id (NHL-XXXX-XXXX), team, and aggregate BHAS %. Never real names, emails, or individual lab values.
- **No PHI in logs or URLs** — never log lab values or health data; never put PHI in query strings.
- **RLS required** — every new Supabase table with PHI must have Row Level Security enabled.
- **Exports are aggregate-only** — any CSV/PDF going to employers or insurers must be de-identified aggregate stats. No individual rows.
- **Consent before sharing** — public profile requires explicit `is_public = true`. Default is private.
- **No PHI to third-party services** — do not send health data to analytics, tracking, or advertising services.

Before completing any feature, verify the HIPAA checklist in `DEVELOPER_REQUIREMENTS.md` Section 0.

---

## Code Exploration
Always use jCodemunch MCP tools — never fall back to Read, Grep, Glob, or Bash for code exploration.
- Before reading a file: `get_file_outline` or `get_file_content`
- Before searching: `search_symbols` or `search_text`
- Before exploring structure: `get_file_tree` or `get_repo_outline`
- Call `list_repos` first; if not indexed, call `index_folder` with current directory.
