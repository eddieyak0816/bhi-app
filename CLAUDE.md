## Code Exploration
Policy
Always use jCodemunch-MCP tools — never fall back to Read, Grep, Glob, or Bash
for code exploration.
- Before reading a file: use `get_file_outline` or `get_file_content`
- Before searching: use `search_symbols` or `search_text`
- Before exploring structure: use `get_file_tree` or `get_repo_outline`
- Call `list_repos` first; if the project is not indexed, call `index_folder` with the current directory.

---

How to add jCodeMunch MCP to your client (quick):

1) If you have the `claude` CLI available, run this in a terminal inside VS Code:

```powershell
claude mcp add jcodemunch uvx jcodemunch-mcp
```

2) If the client requires a JSON config (Claude Desktop or some MCP-capable clients), add this `mcpServers` entry and restart the client or VS Code:

```json
{
  "mcpServers": {
    "jcodemunch": {
      "command": "uvx",
      "args": ["jcodemunch-mcp"]
    }
  }
}
```

Notes:
- Use `uvx jcodemunch-mcp` in configs to avoid PATH/resolution issues.
- Install jCodeMunch locally first (recommended inside a venv):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install jcodemunch-mcp
```

- To enable AI summaries or watch features install extras, e.g. `pip install "jcodemunch-mcp[anthropic]"` or `pip install "jcodemunch-mcp[watch]"`.
- After adding the MCP server, index this repo (from CLI or ask the agent to "Index this project"):

```powershell
jcodemunch-mcp index_folder --path "${PWD}"
```

---

If you want, I can also add the `mcpServers` entry to the VS Code Claude Code extension settings for you — tell me whether you prefer a user-level or workspace-level change.
