.PHONY: all init start stop clean design help

all: init start

help:
	@echo "Makefile para gestionar el entorno de desarrollo local con Supabase."
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  init   - Instala dependencias y configura el entorno."
	@echo "  start  - Inicia el entorno Supabase local y el servidor de desarrollo."
	@echo "  stop   - Detiene el entorno Supabase local sin hacer backup."
	@echo "  clean  - Limpia todos los contenedores, imágenes y volúmenes de Docker."
	@echo "  design - Sirve la guía de diseño estática (design/) en http://localhost:8000."

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

design:
	@echo "Sirviendo guía de diseño en http://localhost:8000 (Ctrl+C para detener)..."
	@python3 -m http.server 8000 --directory design
