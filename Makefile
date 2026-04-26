.PHONY: install dev build lint type-check run stop clean

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

run:
	@docker compose up --build

stop:
	@docker compose down

clean:
	@rm -rf out/ .next/
