.PHONY: install dev build lint type-check up down clean

install:
	@npm ci

dev:
	@npm run dev

build:
	@npm run build

lint:
	@npm run lint

type-check:
	@npm run type-check

up:
	@docker compose up --build

down:
	@docker compose down

clean:
	@rm -rf out/ .next/
