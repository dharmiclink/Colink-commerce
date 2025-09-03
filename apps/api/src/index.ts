/**
 * CoLink Commerce API Server
 * Main entry point for the Express API server
 */

import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import { rateLimit } from "express-rate-limit"
import { logger } from "./utils/logger"
import swaggerUi from "swagger-ui-express"
import { PrismaClient } from "@prisma/client"
import { Redis } from "ioredis"
import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import pinoHttp from "pino-http" // Import pinoHttp

// Import routes
import apiRoutes from "./routes"
import { errorHandler } from "./middlewares/errorHandler"
import { NotFoundError } from "./utils/errors"
import { initializeQueues } from "./workers/queues"
import { initializeWorkers } from "./workers"
import { validateEnv } from "./utils/validateEnv"

// Validate environment variables
validateEnv()

// Initialize database connection
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

// Initialize Redis connection
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
})

// Initialize job queues
const queues = initializeQueues(redis)

// Initialize Express app
const app = express()
const PORT = process.env.API_PORT || 4000

// Set up middleware
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
)

// Set up rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // default: 1 minute
  max: Number.parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // default: 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => req.path.startsWith("/api/webhooks"), // Skip rate limiting for webhooks
})

// Apply rate limiting to all routes
app.use(limiter)

// Set up request logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error"
      if (res.statusCode >= 400) return "warn"
      return "info"
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} completed with status ${res.statusCode}`
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err?.message || "Unknown error"}`
    },
    customAttributeKeys: {
      req: "request",
      res: "response",
      err: "error",
    },
  }),
)

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }))

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Set up Bull Board (queue dashboard)
if (process.env.NODE_ENV === "development") {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath("/admin/queues")

  const queueAdapters = Object.values(queues).map((queue) => new BullMQAdapter(queue))

  createBullBoard({
    queues: queueAdapters,
    serverAdapter,
  })

  app.use("/admin/queues", serverAdapter.getRouter())
  logger.info("Bull Board initialized at /admin/queues")
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  })
})

// API documentation
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
  try {
    const swaggerDocument = require("../swagger.json")
    app.use(
      "/api/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "CoLink Commerce API Documentation",
      }),
    )
    logger.info("Swagger UI initialized at /api/docs")
  } catch (error) {
    logger.warn("Could not load swagger.json file. API documentation will not be available.")
  }
}

// Register API routes
app.use("/api", apiRoutes)

// 404 handler
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.path}`))
})

// Global error handler
app.use(errorHandler)

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`CoLink Commerce API server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`)

  // Initialize background workers
  initializeWorkers(queues, logger)
  logger.info("Background workers initialized")
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`)

  // Close the HTTP server
  server.close(() => {
    logger.info("HTTP server closed")
  })

  try {
    // Close database connection
    await prisma.$disconnect()
    logger.info("Database connection closed")

    // Close Redis connection
    await redis.quit()
    logger.info("Redis connection closed")

    // Close all worker connections
    for (const queue of Object.values(queues)) {
      await queue.close()
    }
    logger.info("Worker queues closed")

    process.exit(0)
  } catch (error) {
    logger.error("Error during graceful shutdown:", error)
    process.exit(1)
  }
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception:", error)
  // Give the logger time to flush
  setTimeout(() => process.exit(1), 1000)
})

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal("Unhandled rejection at:", { promise, reason })
  // Give the logger time to flush
  setTimeout(() => process.exit(1), 1000)
})

export default app
