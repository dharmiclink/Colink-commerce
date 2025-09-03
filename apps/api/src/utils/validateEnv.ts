/**
 * Environment Variable Validation Utility
 * Validates required environment variables at startup
 */

import { logger } from "./logger"

interface EnvConfig {
  // Database
  DATABASE_URL: string

  // Redis
  REDIS_URL: string

  // Server Configuration
  NODE_ENV: string
  API_PORT: string
  LOG_LEVEL: string

  // Security
  ENCRYPTION_KEY?: string

  // CORS and Rate Limiting
  CORS_ALLOWED_ORIGINS?: string
  RATE_LIMIT_WINDOW_MS?: string
  RATE_LIMIT_MAX?: string

  // Features
  ENABLE_SWAGGER?: string
  FEATURE_USE_MOCK_CONNECTORS?: string
}

const requiredEnvVars: (keyof EnvConfig)[] = ["DATABASE_URL", "REDIS_URL", "NODE_ENV", "API_PORT", "LOG_LEVEL"]

const optionalEnvVars: (keyof EnvConfig)[] = [
  "ENCRYPTION_KEY",
  "CORS_ALLOWED_ORIGINS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
  "ENABLE_SWAGGER",
  "FEATURE_USE_MOCK_CONNECTORS",
]

export function validateEnv(): EnvConfig {
  const missingVars: string[] = []
  const config: Partial<EnvConfig> = {}

  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (!value) {
      missingVars.push(envVar)
    } else {
      config[envVar] = value
    }
  }

  // Check optional variables
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar]
    if (value) {
      config[envVar] = value
    }
  }

  // Report missing variables
  if (missingVars.length > 0) {
    logger.error("Missing required environment variables:", missingVars)
    console.error("\x1b[31m%s\x1b[0m", "Error: Missing required environment variables:")
    missingVars.forEach((envVar) => {
      console.error(`  - ${envVar}`)
    })
    console.error("Please check your .env file and ensure all required variables are set.")
    process.exit(1)
  }

  // Validate specific formats
  validateDatabaseUrl(config.DATABASE_URL!)
  validateRedisUrl(config.REDIS_URL!)
  validatePort(config.API_PORT!)

  logger.info("Environment validation completed successfully")
  return config as EnvConfig
}

function validateDatabaseUrl(url: string): void {
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    logger.error("DATABASE_URL must be a valid PostgreSQL connection string")
    process.exit(1)
  }
}

function validateRedisUrl(url: string): void {
  if (!url.startsWith("redis://") && !url.startsWith("rediss://")) {
    logger.error("REDIS_URL must be a valid Redis connection string")
    process.exit(1)
  }
}

function validatePort(port: string): void {
  const portNum = Number.parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    logger.error("API_PORT must be a valid port number (1-65535)")
    process.exit(1)
  }
}
