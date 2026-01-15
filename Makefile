.PHONY: help backend frontend dev migrate build-mac build-backend build-frontend \
        test test-backend test-frontend up down logs install clean

# Default target
help:
	@echo "Second Brain Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make backend        Start backend (dotnet watch run)"
	@echo "  make frontend       Start frontend (bun dev)"
	@echo "  make dev            Start both backend and frontend"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        Run migrate.sh (use: make migrate ARGS='status')"
	@echo "  make migrate-status Show migration status"
	@echo "  make migrate-run    Run pending migrations"
	@echo ""
	@echo "Build:"
	@echo "  make build-mac      Build macOS app (use: make build-mac ARGS='universal')"
	@echo "  make build-backend  Build backend (dotnet build)"
	@echo "  make build-frontend Build frontend (bun run build)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           Run all tests"
	@echo "  make test-backend   Run backend tests"
	@echo "  make test-frontend  Run frontend tests"
	@echo ""
	@echo "Docker:"
	@echo "  make up             Start docker-compose services"
	@echo "  make down           Stop docker-compose services"
	@echo "  make logs           Tail docker-compose logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make install        Install all dependencies"
	@echo "  make clean          Clean build artifacts"

# Development servers
backend:
	cd backend/src/SecondBrain.API && dotnet watch run

frontend:
	cd frontend && bun dev

dev:
	@echo "Starting backend and frontend..."
	@trap 'kill 0' INT; \
	(cd backend/src/SecondBrain.API && dotnet watch run) & \
	(cd frontend && bun dev) & \
	wait

# Database migrations
ARGS ?=
migrate:
	cd database && ./migrate.sh $(ARGS)

migrate-status:
	cd database && ./migrate.sh status

migrate-run:
	cd database && ./migrate.sh run

# Build
build-mac:
	./scripts/build-mac.sh $(ARGS)

build-backend:
	cd backend && dotnet build

build-frontend:
	cd frontend && bun run build

# Testing
test: test-backend test-frontend

test-backend:
	cd backend && dotnet test

test-frontend:
	cd frontend && bun test

# Docker
up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

# Utilities
install:
	cd backend && dotnet restore
	cd frontend && bun install

clean:
	cd backend && dotnet clean
	cd frontend && rm -rf dist node_modules/.vite
