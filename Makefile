.PHONY: all init start stop clean help

all: init start

help:
	@echo "Makefile para gestionar el entorno de desarrollo local con Supabase."
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  init   - Instala dependencias y configura el entorno."
	@echo "  start  - Inicia el entorno Supabase local y el servidor de desarrollo."
	@echo "  stop   - Detiene el entorno Supabase local sin hacer backup."
	@echo "  clean  - Limpia todos los contenedores, imágenes y volúmenes de Docker."

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

clean:
	@sudo docker system prune -a --volumes -f
