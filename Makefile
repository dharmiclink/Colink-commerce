# CoLink Commerce Platform Makefile
# A comprehensive set of commands for development, testing, and deployment

# Set shell to bash
SHELL := /bin/bash

# Variables
PNPM := pnpm
NODE := node
DOCKER := docker
DOCKER_COMPOSE := docker compose
PRISMA := npx prisma
TURBO := npx turbo

# Colors for pretty output
BLUE := \033[1;34m
GREEN := \033[1;32m
YELLOW := \033[1;33m
RED := \033[1;31m
RESET := \033[0m

# Default target
.PHONY: help
help:
	@echo -e "$(BLUE)CoLink Commerce Platform$(RESET) - Development Commands"
	@echo -e "$(YELLOW)Usage:$(RESET) make [command]"
	@echo ""
	@echo -e "$(GREEN)Setup & Installation:$(RESET)"
	@echo "  setup              - Initial project setup (install deps, setup env, etc.)"
	@echo "  install            - Install all dependencies"
	@echo "  postinstall        - Run post-install steps (generate Prisma client, etc.)"
	@echo ""
	@echo -e "$(GREEN)Development:$(RESET)"
	@echo "  dev                - Start all development servers (web + api)"
	@echo "  dev-web            - Start only the web development server"
	@echo "  dev-api            - Start only the API development server"
	@echo ""
	@echo -e "$(GREEN)Database:$(RESET)"
	@echo "  db-migrate         - Run database migrations"
	@echo "  db-seed            - Seed the database with sample data"
	@echo "  db-reset           - Reset the database (drop all tables and re-run migrations)"
	@echo "  db-studio          - Open Prisma Studio to browse the database"
	@echo "  db-generate        - Generate Prisma client"
	@echo ""
	@echo -e "$(GREEN)Docker:$(RESET)"
	@echo "  docker-up          - Start all Docker containers"
	@echo "  docker-down        - Stop all Docker containers"
	@echo "  docker-build       - Build all Docker images"
	@echo "  docker-logs        - View Docker container logs"
	@echo "  docker-clean       - Clean Docker resources (volumes, networks, etc.)"
	@echo ""
	@echo -e "$(GREEN)Testing:$(RESET)"
	@echo "  test               - Run all tests"
	@echo "  test-unit          - Run unit tests"
	@echo "  test-integration   - Run integration tests"
	@echo "  test-e2e           - Run end-to-end tests"
	@echo "  test-coverage      - Generate test coverage report"
	@echo ""
	@echo -e "$(GREEN)Building & Deployment:$(RESET)"
	@echo "  build              - Build all packages and applications"
	@echo "  build-web          - Build only the web application"
	@echo "  build-api          - Build only the API application"
	@echo "  deploy-web         - Deploy web application to Vercel"
	@echo "  deploy-api         - Deploy API application to Fly.io"
	@echo ""
	@echo -e "$(GREEN)Cleaning & Maintenance:$(RESET)"
	@echo "  clean              - Clean all build artifacts"
	@echo "  clean-deps         - Clean dependencies (node_modules)"
	@echo "  lint               - Run linters on all code"
	@echo "  format             - Format all code"
	@echo "  update-deps        - Update dependencies to latest versions"

# Setup & Installation
.PHONY: setup
setup: install db-migrate db-seed
	@echo -e "$(GREEN)Setup completed!$(RESET)"
	@echo -e "Run $(BLUE)make dev$(RESET) to start the development servers"

.PHONY: install
install:
	@echo -e "$(BLUE)Installing dependencies...$(RESET)"
	$(PNPM) install
	@echo -e "$(GREEN)Dependencies installed!$(RESET)"

.PHONY: postinstall
postinstall:
	@echo -e "$(BLUE)Running post-install steps...$(RESET)"
	$(PRISMA) generate
	@echo -e "$(GREEN)Post-install steps completed!$(RESET)"

# Development
.PHONY: dev
dev:
	@echo -e "$(BLUE)Starting development servers...$(RESET)"
	$(PNPM) dev

.PHONY: dev-web
dev-web:
	@echo -e "$(BLUE)Starting web development server...$(RESET)"
	$(PNPM) --filter @colink-commerce/web dev

.PHONY: dev-api
dev-api:
	@echo -e "$(BLUE)Starting API development server...$(RESET)"
	$(PNPM) --filter @colink-commerce/api dev

# Database
.PHONY: db-migrate
db-migrate:
	@echo -e "$(BLUE)Running database migrations...$(RESET)"
	$(PRISMA) migrate dev
	@echo -e "$(GREEN)Migrations completed!$(RESET)"

.PHONY: db-seed
db-seed:
	@echo -e "$(BLUE)Seeding the database...$(RESET)"
	$(PRISMA) db seed
	@echo -e "$(GREEN)Database seeded!$(RESET)"

.PHONY: db-reset
db-reset:
	@echo -e "$(YELLOW)Resetting the database...$(RESET)"
	$(PRISMA) migrate reset --force
	@echo -e "$(GREEN)Database reset completed!$(RESET)"

.PHONY: db-studio
db-studio:
	@echo -e "$(BLUE)Opening Prisma Studio...$(RESET)"
	$(PRISMA) studio

.PHONY: db-generate
db-generate:
	@echo -e "$(BLUE)Generating Prisma client...$(RESET)"
	$(PRISMA) generate
	@echo -e "$(GREEN)Prisma client generated!$(RESET)"

# Docker
.PHONY: docker-up
docker-up:
	@echo -e "$(BLUE)Starting Docker containers...$(RESET)"
	$(DOCKER_COMPOSE) up -d
	@echo -e "$(GREEN)Docker containers started!$(RESET)"

.PHONY: docker-down
docker-down:
	@echo -e "$(BLUE)Stopping Docker containers...$(RESET)"
	$(DOCKER_COMPOSE) down
	@echo -e "$(GREEN)Docker containers stopped!$(RESET)"

.PHONY: docker-build
docker-build:
	@echo -e "$(BLUE)Building Docker images...$(RESET)"
	$(DOCKER_COMPOSE) build
	@echo -e "$(GREEN)Docker images built!$(RESET)"

.PHONY: docker-logs
docker-logs:
	@echo -e "$(BLUE)Viewing Docker logs...$(RESET)"
	$(DOCKER_COMPOSE) logs -f

.PHONY: docker-clean
docker-clean:
	@echo -e "$(YELLOW)Cleaning Docker resources...$(RESET)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo -e "$(GREEN)Docker resources cleaned!$(RESET)"

# Testing
.PHONY: test
test:
	@echo -e "$(BLUE)Running all tests...$(RESET)"
	$(PNPM) test
	@echo -e "$(GREEN)Tests completed!$(RESET)"

.PHONY: test-unit
test-unit:
	@echo -e "$(BLUE)Running unit tests...$(RESET)"
	$(PNPM) test -- --testPathIgnorePatterns=integration e2e
	@echo -e "$(GREEN)Unit tests completed!$(RESET)"

.PHONY: test-integration
test-integration:
	@echo -e "$(BLUE)Running integration tests...$(RESET)"
	$(PNPM) --filter @colink-commerce/api test:integration
	@echo -e "$(GREEN)Integration tests completed!$(RESET)"

.PHONY: test-e2e
test-e2e:
	@echo -e "$(BLUE)Running end-to-end tests...$(RESET)"
	$(PNPM) --filter @colink-commerce/web e2e
	@echo -e "$(GREEN)End-to-end tests completed!$(RESET)"

.PHONY: test-coverage
test-coverage:
	@echo -e "$(BLUE)Generating test coverage report...$(RESET)"
	$(PNPM) test:coverage
	@echo -e "$(GREEN)Coverage report generated!$(RESET)"

# Building & Deployment
.PHONY: build
build:
	@echo -e "$(BLUE)Building all packages and applications...$(RESET)"
	$(PNPM) build
	@echo -e "$(GREEN)Build completed!$(RESET)"

.PHONY: build-web
build-web:
	@echo -e "$(BLUE)Building web application...$(RESET)"
	$(PNPM) --filter @colink-commerce/web build
	@echo -e "$(GREEN)Web application built!$(RESET)"

.PHONY: build-api
build-api:
	@echo -e "$(BLUE)Building API application...$(RESET)"
	$(PNPM) --filter @colink-commerce/api build
	@echo -e "$(GREEN)API application built!$(RESET)"

.PHONY: deploy-web
deploy-web: build-web
	@echo -e "$(BLUE)Deploying web application to Vercel...$(RESET)"
	@if command -v vercel >/dev/null 2>&1; then \
		cd apps/web && npx vercel --prod; \
	else \
		echo -e "$(RED)Vercel CLI not found. Install with: npm i -g vercel$(RESET)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)Web application deployed!$(RESET)"

.PHONY: deploy-api
deploy-api: build-api
	@echo -e "$(BLUE)Deploying API application to Fly.io...$(RESET)"
	@if command -v fly >/dev/null 2>&1; then \
		cd apps/api && fly deploy; \
	else \
		echo -e "$(RED)Fly CLI not found. Install with: curl -L https://fly.io/install.sh | sh$(RESET)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)API application deployed!$(RESET)"

# Cleaning & Maintenance
.PHONY: clean
clean:
	@echo -e "$(BLUE)Cleaning build artifacts...$(RESET)"
	$(PNPM) clean
	@echo -e "$(GREEN)Build artifacts cleaned!$(RESET)"

.PHONY: clean-deps
clean-deps:
	@echo -e "$(YELLOW)Cleaning dependencies...$(RESET)"
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	@echo -e "$(GREEN)Dependencies cleaned!$(RESET)"

.PHONY: lint
lint:
	@echo -e "$(BLUE)Running linters...$(RESET)"
	$(PNPM) lint
	@echo -e "$(GREEN)Linting completed!$(RESET)"

.PHONY: format
format:
	@echo -e "$(BLUE)Formatting code...$(RESET)"
	$(PNPM) format
	@echo -e "$(GREEN)Formatting completed!$(RESET)"

.PHONY: update-deps
update-deps:
	@echo -e "$(YELLOW)Updating dependencies...$(RESET)"
	$(PNPM) update -r --latest
	@echo -e "$(GREEN)Dependencies updated!$(RESET)"

# Generate mock webhook events for testing
.PHONY: mock-order
mock-order:
	@echo -e "$(BLUE)Generating mock order webhook event...$(RESET)"
	$(NODE) scripts/mock-order.js
	@echo -e "$(GREEN)Mock order generated!$(RESET)"

# Check system requirements
.PHONY: check-requirements
check-requirements:
	@echo -e "$(BLUE)Checking system requirements...$(RESET)"
	@echo -n "Node.js: "
	@if command -v node >/dev/null 2>&1; then \
		echo -e "$(GREEN)✓ Installed$(RESET) ($(shell node -v))"; \
	else \
		echo -e "$(RED)✗ Not installed$(RESET)"; \
	fi
	@echo -n "PNPM: "
	@if command -v pnpm >/dev/null 2>&1; then \
		echo -e "$(GREEN)✓ Installed$(RESET) ($(shell pnpm -v))"; \
	else \
		echo -e "$(RED)✗ Not installed$(RESET)"; \
	fi
	@echo -n "Docker: "
	@if command -v docker >/dev/null 2>&1; then \
		echo -e "$(GREEN)✓ Installed$(RESET) ($(shell docker --version | cut -d ' ' -f3 | tr -d ','))"; \
	else \
		echo -e "$(RED)✗ Not installed$(RESET)"; \
	fi
	@echo -n "Docker Compose: "
	@if command -v docker compose >/dev/null 2>&1; then \
		echo -e "$(GREEN)✓ Installed$(RESET)"; \
	else \
		echo -e "$(RED)✗ Not installed$(RESET)"; \
	fi
	@echo -e "$(GREEN)System requirements check completed!$(RESET)"
