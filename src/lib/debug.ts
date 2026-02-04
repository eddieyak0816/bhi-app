/**
 * Debug utility for tracking data issues and schema mismatches
 * Helps identify problems like missing fields, type mismatches, or slow queries
 */

export interface DebugLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  module: string
  message: string
  data?: Record<string, any>
  duration?: number
  stackTrace?: string
}

class DebugLogger {
  private logs: DebugLog[] = []
  private isDevMode = import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true'
  private maxLogs = 100

  /**
   * Log an info message with optional data
   */
  info(module: string, message: string, data?: Record<string, any>) {
    this.log('info', module, message, data)
  }

  /**
   * Log a warning - something unexpected but not critical
   */
  warn(module: string, message: string, data?: Record<string, any>) {
    this.log('warn', module, message, data)
  }

  /**
   * Log an error with stack trace
   */
  error(module: string, message: string, error?: Error | unknown, data?: Record<string, any>) {
    const stackTrace = error instanceof Error ? error.stack : undefined
    this.log('error', module, message, data, stackTrace)
  }

  /**
   * Log debug info (only in dev mode)
   */
  debug(module: string, message: string, data?: Record<string, any>) {
    if (this.isDevMode) {
      this.log('debug', module, message, data)
    }
  }

  /**
   * Track timing of async operations
   */
  async trackAsync<T>(
    module: string,
    operation: string,
    fn: () => Promise<T>,
    timeoutMs: number = 15000
  ): Promise<{ data: T; duration: number }> {
    const startTime = performance.now()
    const timeoutPromise = new Promise<{ data: T; duration: number }>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Operation "${operation}" timed out after ${timeoutMs}ms. ` +
              `This usually indicates a slow network, Supabase connectivity issue, or schema problem. ` +
              `Check browser DevTools → Application → Local Storage → 'DEBUG_MODE' logs.`
            )
          ),
        timeoutMs
      )
    )

    try {
      const data = await Promise.race([fn(), timeoutPromise])
      const duration = performance.now() - startTime

      // Warn if slow (>5 seconds)
      if (duration > 5000) {
        this.warn(module, `Slow operation: "${operation}" took ${duration.toFixed(0)}ms`, {
          operation,
          duration,
          threshold: 5000
        })
      }

      this.debug(module, `Operation "${operation}" completed in ${duration.toFixed(0)}ms`)

      return { data, duration }
    } catch (error) {
      const duration = performance.now() - startTime
      this.error(module, `Operation "${operation}" failed after ${duration.toFixed(0)}ms`, error as Error, {
        operation,
        duration,
        timeoutMs
      })
      throw error
    }
  }

  /**
   * Validate data schema - check if expected fields exist
   */
  validateSchema<T>(
    module: string,
    data: T[],
    expectedFields: string[],
    dataName: string = 'data'
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    if (!Array.isArray(data)) {
      issues.push(`${dataName} is not an array`)
      this.error(module, `Schema validation failed for ${dataName}`, undefined, {
        dataName,
        expectedFields,
        issues,
        receivedType: typeof data
      })
      return { valid: false, issues }
    }

    if (data.length === 0) {
      this.warn(module, `${dataName} is empty - no records to validate`, {
        dataName,
        expectedFields
      })
      return { valid: true, issues: [] }
    }

    const firstRecord = data[0] as Record<string, any>
    const actualFields = Object.keys(firstRecord)
    const missingFields = expectedFields.filter(f => !(f in firstRecord))
    const unexpectedFields = actualFields.filter(f => !expectedFields.includes(f))

    if (missingFields.length > 0) {
      issues.push(`Missing fields: ${missingFields.join(', ')}`)
    }

    if (unexpectedFields.length > 0) {
      this.debug(module, `Unexpected fields in ${dataName}`, {
        dataName,
        unexpectedFields,
        expectedFields
      })
    }

    if (issues.length > 0) {
      this.error(module, `Schema mismatch in ${dataName}`, undefined, {
        dataName,
        expectedFields,
        actualFields,
        issues,
        sampleRecord: firstRecord
      })
      return { valid: false, issues }
    }

    this.debug(module, `Schema validation passed for ${dataName}`, {
      dataName,
      recordCount: data.length,
      fields: actualFields
    })

    return { valid: true, issues: [] }
  }

  /**
   * Check data integrity - look for null/undefined values, type mismatches
   */
  checkDataIntegrity<T>(
    module: string,
    data: T[],
    requiredFields: string[],
    dataName: string = 'data'
  ): { healthy: boolean; issues: string[] } {
    const issues: string[] = []

    data.forEach((record, index) => {
      const r = record as Record<string, any>
      requiredFields.forEach(field => {
        if (r[field] === null || r[field] === undefined) {
          issues.push(`Record ${index}: field "${field}" is ${r[field]}`)
        }
      })
    })

    if (issues.length > 0) {
      this.warn(module, `Data integrity issues in ${dataName}`, {
        dataName,
        issueCount: issues.length,
        issues: issues.slice(0, 10) // Show first 10
      })
      return { healthy: false, issues }
    }

    this.debug(module, `Data integrity check passed for ${dataName}`, {
      dataName,
      recordCount: data.length,
      requiredFields
    })

    return { healthy: true, issues: [] }
  }

  /**
   * Internal logging function
   */
  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    module: string,
    message: string,
    data?: Record<string, any>,
    stackTrace?: string
  ) {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      stackTrace
    }

    this.logs.push(log)

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    const prefix = `[${module}]`
    const style = this.getConsoleStyle(level)

    if (level === 'debug' && !this.isDevMode) {
      return // Don't log debug in non-dev mode
    }

    // eslint-disable-next-line no-console
    console[consoleMethod as keyof Console](`%c${prefix} ${message}`, style, data)
  }

  /**
   * Get console styling for different log levels
   */
  private getConsoleStyle(level: string): string {
    const styles: Record<string, string> = {
      info: 'color: #3b82f6; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      debug: 'color: #8b5cf6; font-weight: bold;'
    }
    return styles[level] || ''
  }

  /**
   * Get all logs (for debugging/export)
   */
  getLogs(): DebugLog[] {
    return [...this.logs]
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean) {
    this.isDevMode = enabled
    localStorage.setItem('DEBUG_MODE', enabled ? 'true' : 'false')
    this.info('debugger', `Debug mode ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Print summary of issues found
   */
  printSummary() {
    const byLevel = this.logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // eslint-disable-next-line no-console
    console.group('%c📊 Debug Summary', 'color: #10b981; font-weight: bold; font-size: 14px;')
    // eslint-disable-next-line no-console
    console.table(byLevel)
    if (byLevel.error > 0 || byLevel.warn > 0) {
      // eslint-disable-next-line no-console
      console.log('%c⚠️ Issues detected. Run debug.exportLogs() to export full logs', 'color: #f59e0b;')
    }
    // eslint-disable-next-line no-console
    console.groupEnd()
  }
}

// Export singleton instance
export const debug = new DebugLogger()

// Make it globally accessible in dev mode
if (typeof window !== 'undefined') {
  (window as any).debug = debug
}
