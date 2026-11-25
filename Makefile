.PHONY: all init start stop clean test-schemas seed-small seed-medium seed-large seed-clean reset-seed test-seed test-seed-integration test-db test-auth test-security migracion-init migracion-preparar migracion-importar test-importacion help

IMPORT_VENV ?= .venv-importacion
IMPORT_PYTHON ?= $(IMPORT_VENV)/bin/python
EXCEL ?=
NOTION ?= scripts/importacion/notion.json
CSV_DIR ?= .importacion/csv

all: init start

help:
	@echo "Makefile para gestionar el entorno de desarrollo local con Supabase."
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  init   - Instala dependencias y configura el entorno."
	@echo "  start  - Inicia el entorno Supabase local y el servidor de desarrollo."
	@echo "  stop   - Detiene el entorno Supabase local sin hacer backup."
	@echo "  test-schemas - Ejecuta validaciones rapidas de schemas Zod."
	@echo "  seed-small - Ejecuta el seed con el perfil small."
	@echo "  seed-medium - Ejecuta el seed con el perfil medium."
	@echo "  seed-large - Ejecuta el seed con el perfil large."
	@echo "  seed-clean - Elimina únicamente los datos generados por el seed."
	@echo "  reset-seed - Reinicia Supabase local y ejecuta el seed."
	@echo "  test-seed - Valida configuración y factories sin usar la base de datos."
	@echo "  test-seed-integration - Prueba el seed contra Supabase local."
	@echo "  test-db - Ejecuta las pruebas pgTAP de RLS (supabase/tests) contra Supabase local."
	@echo "  test-auth - Prueba la autorización por rol en la API de Supabase y en el servidor web (hace build)."
	@echo "  test-security - Ejecuta test-db y test-auth."
	@echo "  migracion-init - Prepara Python e instala las dependencias de migración."
	@echo "  migracion-preparar EXCEL=/ruta/app.xlsx - Genera los CSV y su informe."
	@echo "  migracion-importar - Importa los CSV en la base configurada con DATABASE_URL o Supabase local."
	@echo "  test-importacion - Valida la preparación e importación de CSV y los schemas Zod."
	@echo "  clean  - Limpia todos los contenedores, imágenes y volúmenes de Docker."
	@echo ""

	@echo "  help   - Muestra esta ayuda."

init:
	@echo "Instalando dependencias y configurando entorno..."
	@pnpm install
	@cp .env.example .env --no-clobber

start:
	@echo "Iniciando entorno supabase local..."
	@pnpm exec supabase start
	@echo "Iniciando servidor de desarrollo..."
	@pnpm run dev

stop:
	@echo "Deteniendo entorno supabase local..."
	@pnpm exec supabase stop --no-backup

test-schemas:
	@node --experimental-strip-types scripts/schemas/test.ts

seed-small:
	@pnpm db:seed --profile small

seed-medium:
	@pnpm db:seed --profile medium

seed-large:
	@pnpm db:seed --profile large

seed-clean:
	@pnpm db:seed:clean

reset-seed:
	@pnpm db:reset:seed

test-seed:
	@pnpm test:seed

test-seed-integration:
	@pnpm test:seed:integration

test-db:
	@pnpm exec supabase test db

test-auth:
	@pnpm build
	@pnpm test:auth:api
	@pnpm test:auth:web

test-security: test-db test-auth

migracion-init:
	@python3 -m venv "$(IMPORT_VENV)"
	@"$(IMPORT_PYTHON)" -m pip install -r scripts/importacion/requirements.txt
	@pnpm install

migracion-preparar:
	@test -n "$(EXCEL)" || { echo "Falta EXCEL. Uso: make migracion-preparar EXCEL=/ruta/app.xlsx" >&2; exit 1; }
	@"$(IMPORT_PYTHON)" scripts/importacion/normalizar.py --excel "$(EXCEL)" --notion "$(NOTION)" --salida "$(CSV_DIR)"

migracion-importar:
	@"$(IMPORT_PYTHON)" scripts/importacion/importar.py --csv "$(CSV_DIR)"

test-importacion:
	@"$(IMPORT_PYTHON)" -m unittest discover -s scripts/importacion/tests -v
	@node --experimental-strip-types scripts/importacion/tests/zod.ts
	@pnpm exec tsc --project scripts/importacion/tsconfig.json

clean:
	@sudo docker system prune -a --volumes -f
