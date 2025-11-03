.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)MED-AID SAARTHI - Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

##@ Development

.PHONY: install
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	cd server && npm install
	cd mobile && npm install

.PHONY: dev
dev: ## Start development servers (web + server)
	@echo "$(BLUE)Starting development servers...$(NC)"
	docker-compose up web server

.PHONY: dev-web
dev-web: ## Start web dev server only
	@echo "$(BLUE)Starting web dev server...$(NC)"
	npm run dev

.PHONY: dev-server
dev-server: ## Start backend server only
	@echo "$(BLUE)Starting backend server...$(NC)"
	cd server && npm run dev

.PHONY: dev-all
dev-all: ## Start all services with Docker
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose up

##@ Building

.PHONY: build
build: ## Build web and server
	@echo "$(BLUE)Building web app...$(NC)"
	npm run build
	@echo "$(BLUE)Building server...$(NC)"
	cd server && npm run build

.PHONY: build-web
build-web: ## Build web app only
	@echo "$(BLUE)Building web app...$(NC)"
	npm run build

.PHONY: build-server
build-server: ## Build server only
	@echo "$(BLUE)Building server...$(NC)"
	cd server && npm run build

.PHONY: build-mobile
build-mobile: ## Build and sync mobile apps
	@echo "$(BLUE)Building for mobile...$(NC)"
	npm run build
	cd mobile && npm run sync

##@ Testing

.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm test
	cd server && npm test

.PHONY: test-web
test-web: ## Run web tests only
	@echo "$(BLUE)Running web tests...$(NC)"
	npm test

.PHONY: test-server
test-server: ## Run server tests only
	@echo "$(BLUE)Running server tests...$(NC)"
	cd server && npm test

.PHONY: test-e2e
test-e2e: ## Run E2E tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	npx playwright test

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

##@ Linting & Formatting

.PHONY: lint
lint: ## Run linters
	@echo "$(BLUE)Running linters...$(NC)"
	npm run lint
	cd server && npm run lint

.PHONY: lint-fix
lint-fix: ## Fix linting errors
	@echo "$(BLUE)Fixing linting errors...$(NC)"
	npm run lint -- --fix
	cd server && npm run lint -- --fix

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	npm run typecheck
	cd server && npm run typecheck

##@ Database

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	supabase db push

.PHONY: db-reset
db-reset: ## Reset database (CAUTION: Deletes all data)
	@echo "$(RED)Resetting database...$(NC)"
	supabase db reset

.PHONY: db-seed
db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	# TODO: Add seed script

##@ Mobile

.PHONY: mobile-sync
mobile-sync: build-web ## Sync web build to mobile platforms
	@echo "$(BLUE)Syncing to mobile...$(NC)"
	cd mobile && npm run sync

.PHONY: mobile-android
mobile-android: ## Open Android project
	@echo "$(BLUE)Opening Android Studio...$(NC)"
	cd mobile && npm run open:android

.PHONY: mobile-ios
mobile-ios: ## Open iOS project (macOS only)
	@echo "$(BLUE)Opening Xcode...$(NC)"
	cd mobile && npm run open:ios

##@ Docker

.PHONY: docker-up
docker-up: ## Start Docker containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	docker-compose up -d

.PHONY: docker-down
docker-down: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	docker-compose down

.PHONY: docker-logs
docker-logs: ## View Docker logs
	docker-compose logs -f

.PHONY: docker-clean
docker-clean: ## Remove Docker containers and volumes
	@echo "$(RED)Cleaning Docker resources...$(NC)"
	docker-compose down -v

##@ Utilities

.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist
	rm -rf server/dist
	rm -rf node_modules
	rm -rf server/node_modules
	rm -rf mobile/node_modules

.PHONY: secrets
secrets: ## Generate secure secrets
	@echo "$(BLUE)Generating secure secrets...$(NC)"
	@echo "HMAC_SECRET (128 chars):"
	@node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
	@echo ""
	@echo "ENCRYPTION_KEY (64 chars):"
	@node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	@echo ""
	@echo "JWT_SECRET (64 chars):"
	@node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

.PHONY: audit
audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	npm audit
	cd server && npm audit

.PHONY: update-deps
update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	npm update
	cd server && npm update
