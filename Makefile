SHELL := /bin/bash
NVM_RUN = source ~/.nvm/nvm.sh && nvm use

.PHONY: all dev build preview deploy storybook build-storybook lint format check test clean help

all: help

help:
	@echo "photo.emre.xyz - Development & Deployment Tasks"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  dev             Start Astro development server"
	@echo "  build           Build Astro project for Cloudflare Pages"
	@echo "  preview         Preview Cloudflare Pages build locally with Wrangler"
	@echo "  deploy          Deploy to Cloudflare Pages via Wrangler"
	@echo "  storybook       Launch Storybook component workbench"
	@echo "  build-storybook Build static Storybook site"
	@echo "  lint            Run ESLint and Prettier check"
	@echo "  format          Run Prettier formatting"
	@echo "  check           Run Astro type check"
	@echo "  test            Run unit tests"
	@echo "  clean           Clean build artifacts and cache"

dev:
	$(NVM_RUN) && npm run dev

build:
	$(NVM_RUN) && npm run build

preview:
	$(NVM_RUN) && npx wrangler pages dev ./dist

deploy: build
	$(NVM_RUN) && npx wrangler pages deploy ./dist --project-name=photo-emre-xyz

storybook:
	mkdir -p .cache/home && $(NVM_RUN) && HOME=$$PWD/.cache/home npm run storybook

build-storybook:
	mkdir -p .cache/home && $(NVM_RUN) && HOME=$$PWD/.cache/home npm run build-storybook

lint:
	$(NVM_RUN) && npm run lint

format:
	$(NVM_RUN) && npm run format

check:
	$(NVM_RUN) && npx astro check

test:
	$(NVM_RUN) && npm test

clean:
	rm -rf dist .astro node_modules/.cache storybook-static

