.PHONY: install dev build lint format typecheck run stop clean

install:
	@npm ci

dev:
	@npm run dev

build:
	@npm run build

lint:
	@npm run lint

format:
	@npm run format

typecheck:
	@npm run typecheck

run:
	@docker compose up --build

stop:
	@docker compose down

clean:
	@rm -rf out/ .next/
