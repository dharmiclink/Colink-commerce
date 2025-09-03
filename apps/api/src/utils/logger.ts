/**
 * Centralized Logger Utility
 * Provides a consistent logging interface across the CoLink Commerce API
 */

import pino from "pino"

// Create and configure the logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  redact: ["req.headers.authorization", "req.headers.cookie", "body.password"],
})

// Export default for convenience
export default logger
