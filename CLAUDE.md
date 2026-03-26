## Code Exploration
Always use jCodemunch MCP tools — never fall back to Read, Grep, Glob, or Bash for code exploration.
- Before reading a file: `get_file_outline` or `get_file_content`
- Before searching: `search_symbols` or `search_text`
- Before exploring structure: `get_file_tree` or `get_repo_outline`
- Call `list_repos` first; if not indexed, call `index_folder` with current directory.
