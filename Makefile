.PHONY: all init start stop clean test-schemas seed-small seed-medium seed-large seed-clean reset-seed test-seed test-seed-integration help

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
	@echo "  clean  - Limpia todos los contenedores, imágenes y volúmenes de Docker."
	@echo ""

	@echo "  help   - Muestra esta ayuda."

init:
	@echo "Instalando dependencias y configurando entorno..."
	@pnpm install
	@cp .env.example .env --no-clobber

start:
	@echo "Iniciando entorno supabase local..."
	@pnpx supabase start
	@echo "Iniciando servidor de desarrollo..."
	@pnpm run dev

stop:
	@echo "Deteniendo entorno supabase local..."
	@pnpx supabase stop --no-backup

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

clean:
	@sudo docker system prune -a --volumes -f
