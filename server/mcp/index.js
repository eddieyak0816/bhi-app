/**
 * NHL App — Claude Code MCP Server
 *
 * Exposes project context as queryable tools so Claude doesn't need to
 * read large files or run DB queries manually each session.
 *
 * Tools:
 *   get_implementation_status  — what's built, partial, not built (from IMPLEMENTATION_TRACKER.html)
 *   get_migration_history       — list of all DB migrations with status
 *   get_db_schema               — live Supabase table/column listing
 *   get_marker_list             — all lab markers from lab_markers table
 *   get_bhas_scoring_rules      — logic_rules + tags + scoring tiers
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { z } from 'zod'

// Load env from .env.server (two levels up from server/mcp/)
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../')
config({ path: resolve(projectRoot, '.env.server') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.stderr.write('ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env.server\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const server = new McpServer({
  name: 'nhl-app',
  version: '1.0.0',
})

// ─── Tool: get_implementation_status ─────────────────────────────────────────

server.tool(
  'get_implementation_status',
  'Returns the current build status of all NHL App features — what is built, partial, or not yet built. Use this instead of reading IMPLEMENTATION_TRACKER.html.',
  {},
  async () => {
    try {
      const html = readFileSync(resolve(projectRoot, 'IMPLEMENTATION_TRACKER.html'), 'utf8')

      // Extract done/partial/todo counts from stats bar
      const doneMatch = html.match(/id="cnt-done">(\d+)/)
      const partialMatch = html.match(/id="cnt-partial">(\d+)/)
      const todoMatch = html.match(/id="cnt-todo">(\d+)/)
      const totalMatch = html.match(/id="cnt-total">(\d+)/)

      // Extract last-updated note
      const updatedMatch = html.match(/class="last-updated">([\s\S]*?)<\/p>/)

      // Extract all items with their status
      const items = []
      const itemRegex = /data-status="(\w+)"[\s\S]*?<div class="item-num">(\d+)<\/div>[\s\S]*?<div class="item-title">(.*?)<\/div>[\s\S]*?<span class="item-status[^"]*">(.*?)<\/span>/g
      let match
      while ((match = itemRegex.exec(html)) !== null) {
        items.push({
          status: match[1],
          num: match[2],
          title: match[3].trim(),
          label: match[4].replace(/<[^>]+>/g, '').trim(),
        })
      }

      const done = items.filter(i => i.status === 'done')
      const partial = items.filter(i => i.status === 'partial')
      const todo = items.filter(i => i.status === 'todo')

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            summary: {
              built: doneMatch?.[1] ?? done.length,
              partial: partialMatch?.[1] ?? partial.length,
              not_built: todoMatch?.[1] ?? todo.length,
              total: totalMatch?.[1] ?? items.length,
              last_updated: updatedMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? 'unknown',
            },
            built: done.map(i => ({ num: i.num, title: i.title })),
            partial: partial.map(i => ({ num: i.num, title: i.title, label: i.label })),
            not_built: todo.map(i => ({ num: i.num, title: i.title })),
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error reading tracker: ${err.message}` }] }
    }
  }
)

// ─── Tool: get_migration_history ─────────────────────────────────────────────

server.tool(
  'get_migration_history',
  'Returns all DB migration files in db/migrations/ with their filenames and first-line description. Use this to know which migrations exist and their run status.',
  {},
  async () => {
    try {
      const migrationsDir = resolve(projectRoot, 'db/migrations')
      const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

      const migrations = files.map(filename => {
        const content = readFileSync(resolve(migrationsDir, filename), 'utf8')
        // Grab the first non-empty comment line as description
        const descMatch = content.match(/--\s+(.+)/)
        return {
          filename,
          description: descMatch?.[1]?.trim() ?? '(no description)',
        }
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: migrations.length, migrations }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error reading migrations: ${err.message}` }] }
    }
  }
)

// ─── Tool: get_db_schema ──────────────────────────────────────────────────────

server.tool(
  'get_db_schema',
  'Returns the live Supabase database schema — all tables with their columns and data types. Use this instead of guessing column names.',
  {},
  async () => {
    try {
      const { data, error } = await supabase.rpc('get_schema_info').maybeSingle()

      // Fallback: query information_schema directly
      const { data: cols, error: colErr } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .order('table_name')
        .order('ordinal_position')

      if (colErr) throw new Error(colErr.message)

      // Group by table
      const tables = {}
      for (const col of cols ?? []) {
        if (!tables[col.table_name]) tables[col.table_name] = []
        tables[col.table_name].push({
          column: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
        })
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ table_count: Object.keys(tables).length, tables }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error fetching schema: ${err.message}` }] }
    }
  }
)

// ─── Tool: get_marker_list ────────────────────────────────────────────────────

server.tool(
  'get_marker_list',
  'Returns all lab markers from the lab_markers table including their IDs and names. Use this to get exact marker names before writing logic rules or benchmarks.',
  {},
  async () => {
    try {
      const { data, error } = await supabase
        .from('lab_markers')
        .select('id, name, unit, category')
        .order('name')

      if (error) throw new Error(error.message)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: data.length, markers: data }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error fetching markers: ${err.message}` }] }
    }
  }
)

// ─── Tool: get_bhas_scoring_rules ────────────────────────────────────────────

server.tool(
  'get_bhas_scoring_rules',
  'Returns all BHAS scoring logic: logic_rules joined with their tags and scoring tiers. Use this to understand how markers map to scores without reading evaluateRules.ts.',
  {},
  async () => {
    try {
      const { data: rules, error: rulesErr } = await supabase
        .from('logic_rules')
        .select(`
          id,
          marker_id,
          min_value,
          max_value,
          operator,
          tag_to_apply,
          lab_markers ( name )
        `)
        .order('marker_id')

      if (rulesErr) throw new Error(rulesErr.message)

      const { data: tags, error: tagsErr } = await supabase
        .from('tags')
        .select('name, scoring_tier, category')
        .order('name')

      if (tagsErr) throw new Error(tagsErr.message)

      const tagMap = Object.fromEntries(tags.map(t => [t.name, { tier: t.scoring_tier, category: t.category }]))

      const enriched = rules.map(r => ({
        marker: r.lab_markers?.name ?? r.marker_id,
        operator: r.operator,
        min: r.min_value,
        max: r.max_value,
        tag: r.tag_to_apply,
        tier: tagMap[r.tag_to_apply]?.tier ?? 'unknown',
        category: tagMap[r.tag_to_apply]?.category ?? null,
      }))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            rule_count: enriched.length,
            tag_count: tags.length,
            rules: enriched,
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error fetching scoring rules: ${err.message}` }] }
    }
  }
)

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
