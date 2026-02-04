# BHI App - Debug Guide

**How to diagnose and fix issues like the schema mismatch we just had**

---

## Quick Start: Enable Debug Mode

### In Browser Console (F12):

```javascript
// Enable debug mode
window.debug.setDebugMode(true)

// View logs
window.debug.printSummary()

// Export full logs
const logs = window.debug.exportLogs()
console.log(logs)
// Copy the output and save to a file for analysis
```

### Via Local Storage (Permanent):
```javascript
localStorage.setItem('DEBUG_MODE', 'true')
// Reload page - debug mode stays enabled until you disable it
localStorage.setItem('DEBUG_MODE', 'false')
```

---

## What Gets Logged

### 1. **Data Loading Operations**
Every time the app loads data from Supabase, it logs:
- ✅ Success/failure status
- ⏱️ How long the request took
- 📊 Number of records returned
- ⚠️ Any schema mismatches
- 🔍 Data integrity issues

### 2. **Schema Validation**
The debug system automatically checks:
- ❌ Missing fields (fields the code expects but table doesn't have)
- ⚠️ Unexpected fields (fields in table that code doesn't use)
- 🔴 Required field validation (checks if critical fields exist)

**Example Output:**
```
Missing fields: categories
Unexpected fields: created_at, updated_at
```

### 3. **Data Integrity Checks**
Verifies that critical fields aren't null/undefined:
```
Record 5: field "tags" is undefined
Record 12: field "link_url" is null
```

### 4. **Performance Warnings**
Alerts if operations take longer than 5 seconds:
```
Slow operation: "load resources" took 8234ms
threshold: 5000
```

---

## Debug Commands Reference

### View Summary
```javascript
window.debug.printSummary()
```
Shows a table of:
- info: 15
- warn: 3
- error: 2
- debug: 42

### Get All Logs
```javascript
window.debug.getLogs()
```
Returns array of all log objects with timestamps

### Export Logs
```javascript
const logs = window.debug.exportLogs()
copy(logs)  // Chrome DevTools trick to copy to clipboard
```

### Clear Logs
```javascript
window.debug.clearLogs()
```

### Toggle Debug Mode
```javascript
window.debug.setDebugMode(true)   // Enable
window.debug.setDebugMode(false)  // Disable
```

---

## Common Issues & How to Debug Them

### Issue 1: "Request timed out"

**Debug Steps:**
1. Open DevTools → Console
2. Run `window.debug.printSummary()`
3. Look for "error" count > 0
4. Run `window.debug.exportLogs()` to see the actual error
5. Check for messages like:
   - `Missing fields: categories` → Schema mismatch
   - `Request timed out` → Network issue
   - `Supabase connectivity issue` → Database problem

**Example Fix:**
If you see `Missing fields: categories`, it means:
- Code expects a `categories` column
- Database doesn't have it
- Need to either:
  - Add the column to the table, OR
  - Remove the field from the code (like we just did)

---

### Issue 2: "Data integrity issues found"

**Debug Steps:**
1. Run `window.debug.getLogs()`
2. Look for logs with level: "warn"
3. Check the `data` property for issues
4. Example output:
   ```
   Record 0: field "tags" is undefined
   Record 5: field "link_url" is null
   ```
5. This means some records are missing required data

**Example Fix:**
- Null/undefined values → Database needs seed data or has missing records
- Run your migrations to populate default data

---

### Issue 3: Slow Operations (> 5 seconds)

**Debug Steps:**
1. Enable debug mode: `window.debug.setDebugMode(true)`
2. Reload page
3. Run `window.debug.getLogs()`
4. Look for logs with `duration > 5000`
5. Check what operations are slow

**Example Output:**
```javascript
{
  level: 'warn',
  module: 'ProfilePage',
  message: 'Slow operation: "load health goals" took 7234ms',
  data: { operation: 'load health goals', duration: 7234, threshold: 5000 }
}
```

**Possible Causes:**
- Cold Supabase startup (happens after inactivity)
- Slow network connection
- Large dataset being returned
- Database query needs optimization

**Fixes:**
- Wait a few seconds and refresh (warming up Supabase)
- Check internet speed
- Reduce data returned (add filters to select query)
- Add database indexes

---

## For Developers: Using Debug in New Code

### Log an Info Message
```javascript
import { debug } from '../lib/debug'

debug.info('MyComponent', 'User clicked button', { userId: 123 })
// Output: [MyComponent] User clicked button { userId: 123 }
```

### Log a Warning
```javascript
debug.warn('MyComponent', 'Unexpected field in data', { field: 'extra_field' })
```

### Log an Error
```javascript
try {
  // some code
} catch (error) {
  debug.error('MyComponent', 'Failed to save data', error, { userId: 123 })
}
```

### Validate Schema
```javascript
const data = await supabase.from('users').select('*')

const { valid, issues } = debug.validateSchema(
  'MyComponent',
  data,
  ['id', 'name', 'email'], // Expected fields
  'users'
)

if (!valid) {
  console.error('Schema problems:', issues)
}
```

### Check Data Integrity
```javascript
const { healthy, issues } = debug.checkDataIntegrity(
  'MyComponent',
  data,
  ['id', 'name'], // Required fields that shouldn't be null
  'users'
)

if (!healthy) {
  debug.warn('MyComponent', 'Some records are incomplete', { issues })
}
```

### Track Async Operations
```javascript
const { data, duration } = await debug.trackAsync(
  'MyComponent',
  'load users',
  () => supabase.from('users').select('*'),
  10000 // timeout in ms
)

console.log(`Loaded ${data.length} users in ${duration}ms`)
```

---

## When to Enable/Disable Debug Mode

### Enable Debug Mode When:
- 🐛 Something is broken and you need to investigate
- 🚀 Deploying to production to catch issues early
- 📊 Performance tuning (checking for slow operations)
- 🔍 Adding new features (validating data flows)

### Disable Debug Mode When:
- ✅ Everything is working fine
- 📱 On production (reduces noise in console)
- 💾 Concerned about performance (debug logs use memory)

---

## Example: Full Debug Workflow for Schema Issues

You see "Request timed out" error on Resources page. Here's how to diagnose:

```javascript
// Step 1: Enable debug mode
window.debug.setDebugMode(true)

// Step 2: Reload page to capture logs
// (page reloads)

// Step 3: Check summary
window.debug.printSummary()
// Output:
// error: 1
// warn: 2
// info: 8
// debug: 15

// Step 4: Export logs to see what went wrong
const logs = window.debug.exportLogs()

// Step 5: Look for error details
// Find logs with level: 'error'
// Example: "Schema mismatch: Missing fields: categories"

// Step 6: Fix the issue
// - Remove 'categories' from code, OR
// - Add 'categories' column to database

// Step 7: Verify fix
window.debug.clearLogs()
// Reload page
window.debug.printSummary()
// Should show no errors now!
```

---

## Troubleshooting the Debug System Itself

### Debug logs not showing?
```javascript
// Check if debug mode is enabled
localStorage.getItem('DEBUG_MODE')
// Should show 'true'

// Check if debug module imported
window.debug
// Should show the debug object
```

### Too many logs?
```javascript
// Clear logs to free up memory
window.debug.clearLogs()

// Or disable debug mode
window.debug.setDebugMode(false)
```

### Need to export logs for support?
```javascript
// Copy logs to clipboard
const logs = window.debug.exportLogs()
copy(logs)

// Include in bug report with:
// - Browser (Chrome, Firefox, etc)
// - URL
// - Steps to reproduce
// - The exported logs
```

---

## Summary

The debug system helps catch:
- ✅ Schema mismatches (missing/unexpected fields)
- ✅ Data integrity issues (null/undefined values)
- ✅ Performance problems (slow queries)
- ✅ Connection issues (timeouts, network problems)

**Key Commands:**
- `window.debug.setDebugMode(true)` → Enable debugging
- `window.debug.printSummary()` → See issue count
- `window.debug.exportLogs()` → Get full details
- `window.debug.getLogs()` → Array of all logs

**Next time you hit an issue, enable debug mode and the logs will tell you exactly what went wrong!** 🎯
