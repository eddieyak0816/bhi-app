# validate_supabase.ps1
# PowerShell helper to run the SQL validation against your Supabase DB.
# Option A (recommended): paste the SQL file into the Supabase SQL editor and run.
# Option B: run locally with psql if you have a DATABASE_URL.

param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
  Write-Host "No DATABASE_URL detected in environment.\n- Recommended: open 'scripts/validate_supabase_schema.sql' and paste into the Supabase SQL editor (app.supabase.io)." -ForegroundColor Yellow
  exit 0
}

# Check for psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Host "psql not found on PATH. Install PostgreSQL client or run the SQL in the Supabase SQL editor." -ForegroundColor Yellow
  exit 0
}

# Run the SQL file using psql (will print results to console)
Write-Host "Running validation script via psql..." -ForegroundColor Green
psql $DatabaseUrl -f "${PSScriptRoot}\validate_supabase_schema.sql" | Out-Host

# Tips:
# - To set DATABASE_URL for the session:
#   $env:DATABASE_URL = 'postgres://user:password@db.host:5432/database'
# - You can also use the Supabase UI SQL editor: open your project → SQL Editor → New query → paste the SQL file contents → Run
