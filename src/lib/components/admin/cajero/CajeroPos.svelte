<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import FormField from '../primitives/FormField.svelte';
	import Dropdown from '../primitives/Dropdown.svelte';
	import StatusBadge from '../primitives/StatusBadge.svelte';
	import FichaJuego from './FichaJuego.svelte';
	import QrEscaneoModal from './QrEscaneoModal.svelte';
	import AltaSansanoModal from './AltaSansanoModal.svelte';
	import IdentificadorInput from '$lib/components/forms/IdentificadorInput.svelte';
	import { LARGO_RUT } from '$lib/schemas';
	import { parsearRut, formatearRut, type DatosAltaSansano } from '$lib/data/junta.svelte';
	import type {
		AltaSansanoDto,
		BusquedaEjemplar,
		BusquedaSolicitante,
		DevolucionDto,
		Documento,
		FichaEjemplar,
		PrestamoEnCurso,
		PrestamoJuntaDto,
		Sansano,
		Suspension
	} from '$lib/schemas';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';

	const documentos: { value: Documento; label: string }[] = [
		{ value: 'Carnet', label: 'Carnet' },
		{ value: 'TNE', label: 'TNE' },
		{ value: 'TUI', label: 'TUI' },
		{ value: 'Otro', label: 'Otro' }
	];

	let busqueda = $state('');
	let ficha = $state<FichaEjemplar | null>(null);
	let prestamoFicha = $state<PrestamoEnCurso | null>(null);
	let errorBusqueda = $state<string | null>(null);
	let buscandoFicha = $state(false);
	let enviando = $state(false);

	let qrAbierto = $state(false);

	let documento = $state<Documento | null>(null);
	let rutEntrada = $state('');
	let sansano = $state<Sansano | null>(null);
	let suspension = $state<Suspension | null>(null);
	let prestamoPersona = $state<PrestamoEnCurso | null>(null);
	let errorRut = $state<string | null>(null);
	let buscandoSansano = $state(false);
	let noExiste = $state(false);
	let altaAbierta = $state(false);
	let errorAlta = $state<string | null>(null);
	let creandoSansano = $state(false);

	let errorIniciar = $state<string | null>(null);

	const prestable = $derived(ficha !== null && ficha.ejemplar.estadoEjemplar === 'En bodega');
	const prestamoAterminar = $derived(prestamoPersona ?? prestamoFicha);
	const listo = $derived(
		Boolean(ficha && prestable && sansano && documento && suspension === null)
	);

	type Respuesta<T> = { ok: true; datos: T } | { ok: false; status: number; error: string };

	/** Llama al API del cajero y normaliza errores de red, de sesión y de validación. */
	async function pedir<T>(url: string, init?: RequestInit): Promise<Respuesta<T>> {
		try {
			const res = await fetch(url, init);

			// Sin sesión, el hook de /admin redirige a /login y fetch sigue la redirección.
			if (res.redirected) {
				return { ok: false, status: 401, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
			}

			const cuerpo = await res.json().catch(() => null);

			if (!res.ok) {
				const error: string = cuerpo?.error ?? 'Error del servidor';
				const detalles = cuerpo?.detalles ? Object.values(cuerpo.detalles).flat().join(', ') : '';

				return { ok: false, status: res.status, error: detalles ? `${error}: ${detalles}` : error };
			}

			return { ok: true, datos: cuerpo as T };
		} catch {
			return { ok: false, status: 0, error: 'Error de red al comunicarse con el servidor.' };
		}
	}

	function conJson(method: 'POST' | 'PATCH', body: unknown): RequestInit {
		return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
	}

	async function usarFicha(id: string) {
		busqueda = id;
		buscandoFicha = true;
		const respuesta = await pedir<BusquedaEjemplar>(
			`/admin/prestamos/ejemplares/${encodeURIComponent(id)}`
		);
		buscandoFicha = false;

		if (!respuesta.ok) {
			ficha = null;
			prestamoFicha = null;
			errorBusqueda =
				respuesta.status === 404 ? `El código «${id}» no existe en el catálogo.` : respuesta.error;
			return;
		}

		ficha = respuesta.datos.ficha;
		prestamoFicha = respuesta.datos.prestamoActivo;
		errorBusqueda = null;
	}

	function buscar() {
		const id = busqueda.trim().toUpperCase();

		if (!id) {
			ficha = null;
			errorBusqueda = 'Ingresa el código del ejemplar (o escanéalo).';
			return;
		}

		errorIniciar = null;
		void usarFicha(id);
	}

	function alEscaneado(id: string) {
		qrAbierto = false;
		errorIniciar = null;
		void usarFicha(id);
	}

	function aplicarSolicitante(datos: BusquedaSolicitante) {
		sansano = datos.sansano;
		suspension = datos.suspension;
		prestamoPersona = datos.prestamoActivo;
		rutEntrada = formatearRut(datos.sansano.rutSansano, datos.sansano.digitoVerificador);
		noExiste = false;
		errorRut = null;
		errorIniciar = null;

		if (datos.prestamoActivo && documento === null) {
			documento = datos.prestamoActivo.prestamo.tipoDocumento;
		}
	}

	async function cargarSolicitante(rut: number) {
		buscandoSansano = true;
		const respuesta = await pedir<BusquedaSolicitante>(`/admin/prestamos/sansanos/${rut}`);
		buscandoSansano = false;

		if (respuesta.ok) {
			aplicarSolicitante(respuesta.datos);
			return;
		}

		sansano = null;
		suspension = null;
		prestamoPersona = null;
		noExiste = respuesta.status === 404;
		errorRut = noExiste ? null : respuesta.error;
	}

	function identificar() {
		const rut = parsearRut(rutEntrada);

		if (!rut) {
			errorRut = 'Formato inválido. Usa el formato 12345678-9.';
			return;
		}

		errorRut = null;
		errorIniciar = null;
		void cargarSolicitante(rut.rut);
	}

	async function crearSansano(datos: DatosAltaSansano) {
		const alta: AltaSansanoDto = {
			rutSansano: datos.rut,
			digitoVerificador: datos.digitoVerificador,
			rolSansano: datos.rol,
			nombreSansano: datos.nombre,
			telefono: datos.telefono,
			correoInstitucional: datos.correo
		};

		creandoSansano = true;
		errorAlta = null;
		const respuesta = await pedir<{ sansano: Sansano }>(
			'/admin/prestamos/sansanos',
			conJson('POST', alta)
		);
		creandoSansano = false;

		if (!respuesta.ok) {
			errorAlta = respuesta.error;
			return;
		}

		altaAbierta = false;
		aplicarSolicitante({
			sansano: respuesta.datos.sansano,
			suspension: null,
			prestamoActivo: null
		});
	}

	function cerrarAlta() {
		altaAbierta = false;
		errorAlta = null;
	}

	function limpiarSolicitante() {
		sansano = null;
		suspension = null;
		prestamoPersona = null;
		documento = null;
		rutEntrada = '';
		noExiste = false;
		errorRut = null;
		errorIniciar = null;
	}

	function limpiarFicha() {
		ficha = null;
		prestamoFicha = null;
		busqueda = '';
		errorBusqueda = null;
		errorIniciar = null;
	}

	function fechaCorta(iso: string): string {
		return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
	}

	function cargarSolicitanteDePrestamo() {
		if (!prestamoFicha) {
			return;
		}

		documento = prestamoFicha.prestamo.tipoDocumento;
		void cargarSolicitante(prestamoFicha.sansano.rutSansano);
	}

	async function terminarYCargar() {
		const activo = prestamoAterminar;

		if (!activo) {
			return;
		}

		const devolucion: DevolucionDto = {
			idPrestamo: activo.prestamo.idPrestamo,
			estadoFinal: 'Para revisar'
		};

		enviando = true;
		errorIniciar = null;
		const respuesta = await pedir('/admin/prestamos', conJson('PATCH', devolucion));
		enviando = false;

		if (!respuesta.ok) {
			errorIniciar = respuesta.error;
			return;
		}

		notificaciones.mostrar(
			'info',
			`Préstamo #${activo.prestamo.idPrestamo} terminado`,
			`${activo.ejemplar.idEjemplar} ${activo.juego.nombreJuego} terminó con ${activo.sansano.nombreSansano} y quedó «Para revisar». Escanea el juego nuevo para darle otro préstamo.`,
			{ duracion: 8000 }
		);

		if (prestamoPersona?.prestamo.idPrestamo === activo.prestamo.idPrestamo) {
			prestamoPersona = null;
		}

		if (ficha?.ejemplar.idEjemplar === activo.ejemplar.idEjemplar) {
			limpiarFicha();
		}
	}

	async function iniciar() {
		if (!ficha || !sansano || !documento) {
			return;
		}

		const fichaActual = ficha;
		const solicitante = sansano;
		const prestamo: PrestamoJuntaDto = {
			idEjemplar: fichaActual.ejemplar.idEjemplar,
			rutSansano: solicitante.rutSansano,
			tipoDocumento: documento
		};

		enviando = true;
		errorIniciar = null;
		const respuesta = await pedir<{ idPrestamo: number }>(
			'/admin/prestamos',
			conJson('POST', prestamo)
		);
		enviando = false;

		if (!respuesta.ok) {
			errorIniciar = respuesta.error;
			return;
		}

		notificaciones.mostrar(
			'success',
			`Préstamo #${respuesta.datos.idPrestamo} iniciado`,
			`${fichaActual.ejemplar.idEjemplar} ${fichaActual.juego.nombreJuego} con ${solicitante.nombreSansano}. El ejemplar quedó en «Prestado».`
		);

		limpiarFicha();
		limpiarSolicitante();
	}
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
	<section class="rounded-base border border-glass-border surface-level-1 p-4 sm:p-5">
		<div class="mb-3 flex items-center gap-2">
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary"
				aria-hidden="true"
			>
				1
			</span>
			<h2 class="font-display text-body-lg font-semibold text-on-surface">Juego</h2>
		</div>

		{#if ficha}
			<div class="relative">
				<FichaJuego {ficha} />

				<button
					type="button"
					onclick={limpiarFicha}
					aria-label="Quitar juego seleccionado"
					class="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-black/30 text-on-surface-variant transition hover:bg-black/50 hover:text-on-surface"
				>
					<Icon name="x" class="h-4 w-4" strokeWidth={1.8} />
				</button>
			</div>

			{#if prestamoFicha}
				<div
					class="text-body-sm mt-2.5 flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-2.5 text-on-surface-variant"
				>
					<Icon name="book-open" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p class="min-w-0">
						<span class="flex flex-wrap items-baseline gap-x-1">
							<span>Está prestado a:</span>
							<span class="font-semibold">{prestamoFicha.sansano.nombreSansano}</span>
							<span>·</span>
							<span class="font-mono">Préstamo #{prestamoFicha.prestamo.idPrestamo}</span>
							<span class="text-on-surface-variant/80">
								desde {fechaCorta(prestamoFicha.prestamo.fechaRetiro)}.
							</span>
						</span>
					</p>
				</div>
			{/if}
		{:else}
			<FormField
				label="Código del ejemplar"
				htmlFor="cajero-busqueda"
				hint="Escríbelo a mano o escanéalo con el botón de abajo."
				error={errorBusqueda}
			>
				<div class="flex gap-2">
					<input
						id="cajero-busqueda"
						type="text"
						bind:value={busqueda}
						oninput={() => {
							errorBusqueda = null;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') buscar();
						}}
						placeholder="p. ej. CAT-001"
						enterkeyhint="search"
						autocomplete="off"
						spellcheck="false"
						aria-invalid={errorBusqueda !== null}
						aria-describedby={errorBusqueda ? 'cajero-busqueda-error' : undefined}
						class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface uppercase transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
					/>

					<button
						type="button"
						onclick={buscar}
						disabled={buscandoFicha}
						aria-label="Buscar juego por código"
						class="flex w-12 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-base border border-primary/50 bg-primary/10 text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Icon
							name={buscandoFicha ? 'loader-circle' : 'search'}
							class="h-5 w-5 {buscandoFicha ? 'animate-spin' : ''}"
							strokeWidth={1.8}
						/>
					</button>
				</div>
			</FormField>

			<button
				type="button"
				onclick={() => (qrAbierto = true)}
				class="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-3 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
			>
				<Icon name="scan-line" class="h-5 w-5" strokeWidth={1.8} />
				Escanear QR
			</button>
		{/if}
	</section>

	<section class="rounded-base border border-glass-border surface-level-1 p-4 sm:p-5">
		<div class="mb-3 flex items-center gap-2">
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary"
				aria-hidden="true"
			>
				2
			</span>
			<h2 class="font-display text-body-lg font-semibold text-on-surface">Solicitante</h2>
		</div>

		{#if prestamoFicha}
			<button
				type="button"
				onclick={cargarSolicitanteDePrestamo}
				class="mb-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-3 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
			>
				<Icon name="user-plus" class="h-5 w-5" strokeWidth={1.8} />
				Cargar solicitante de este préstamo
			</button>
		{/if}

		{#if sansano}
			<div class="relative rounded-base border border-glass-border surface-level-1 p-3">
				<div class="flex flex-wrap items-center justify-between gap-2 pr-10 md:pr-0">
					<div class="min-w-0">
						<p class="font-display text-body-lg font-semibold text-on-surface">
							{sansano.nombreSansano}
						</p>
						<p class="font-mono text-xs text-on-surface-variant">
							{formatearRut(sansano.rutSansano, sansano.digitoVerificador)} · Rol
							{sansano.rolSansano}
						</p>
						<p class="text-body-sm text-on-surface-variant">{sansano.correoInstitucional}</p>
					</div>
					<div class="flex items-center gap-2">
						{#if suspension}
							<StatusBadge tone="error">
								<Icon name="ban" class="h-3 w-3" strokeWidth={2} /> Suspendido
							</StatusBadge>
						{:else}
							<StatusBadge tone="success">Sin suspensiones</StatusBadge>
						{/if}
						<button
							type="button"
							onclick={limpiarSolicitante}
							aria-label="Cambiar de solicitante"
							class="absolute top-2 right-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-surface-container-lowest text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface md:relative md:top-auto md:right-auto md:z-auto"
						>
							<Icon name="x" class="h-4 w-4" strokeWidth={1.8} />
						</button>
					</div>
				</div>
			</div>

			{#if prestamoPersona}
				<div
					class="text-body-sm mt-2.5 flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-2.5 text-on-surface-variant"
				>
					<Icon name="book-open" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p class="min-w-0">
						<span class="flex flex-wrap items-baseline gap-x-1">
							<span>Tiene el préstamo activo #{prestamoPersona.prestamo.idPrestamo}:</span>
							<span class="font-mono">{prestamoPersona.ejemplar.idEjemplar}</span>
							<span>{prestamoPersona.juego.nombreJuego}</span>
							<span class="text-on-surface-variant/80">
								desde {fechaCorta(prestamoPersona.prestamo.fechaRetiro)}.
							</span>
						</span>
					</p>
				</div>
			{/if}
		{:else}
			<FormField
				label="RUT del solicitante"
				htmlFor="cajero-rut"
				hint="Se crea el sansano al instante si no está registrado."
				error={errorRut}
			>
				<div class="flex gap-2">
					<IdentificadorInput
						id="cajero-rut"
						bind:value={rutEntrada}
						largoMaximo={LARGO_RUT}
						oninput={() => {
							errorRut = null;
							noExiste = false;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') identificar();
						}}
						placeholder="12345678-9"
						enterkeyhint="go"
						autocomplete="off"
						spellcheck="false"
						aria-invalid={errorRut !== null}
						aria-describedby={errorRut ? 'cajero-rut-error' : undefined}
						class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 font-mono text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
					/>

					<button
						type="button"
						onclick={identificar}
						disabled={buscandoSansano}
						aria-label="Identificar por RUT"
						class="flex w-12 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-base border border-primary/50 bg-primary/10 text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Icon
							name={buscandoSansano ? 'loader-circle' : 'search'}
							class="h-5 w-5 {buscandoSansano ? 'animate-spin' : ''}"
							strokeWidth={1.8}
						/>
					</button>
				</div>
			</FormField>

			{#if noExiste}
				<div class="mt-3 rounded-base border border-glass-border bg-black/20 p-3">
					<p class="text-body-sm text-on-surface-variant">
						El RUT no está registrado en el club. Créalo al instante para continuar con el préstamo.
					</p>
					<button
						type="button"
						onclick={() => (altaAbierta = true)}
						class="mt-2.5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
					>
						<Icon name="user-plus" class="h-4 w-4" strokeWidth={1.8} />
						Crear al instante
					</button>
				</div>
			{/if}
		{/if}

		<div class="mt-4">
			<Dropdown
				label="Documento retenido"
				items={documentos}
				value={documento}
				onchange={(valor) => {
					documento = valor as Documento;
					errorIniciar = null;
				}}
				placeholder="Carnet · TNE · TUI · Otro (si no deja ninguno)"
			/>
		</div>
	</section>

	{#if ficha}
		<section class="rounded-base border border-glass-border surface-level-1 p-4 sm:p-5">
			<div class="mb-3 flex items-center gap-2">
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary"
					aria-hidden="true"
				>
					3
				</span>
				<h2 class="font-display text-body-lg font-semibold text-on-surface">Confirmar</h2>
			</div>

			<ul class="text-body-sm flex flex-col gap-2 text-on-surface">
				<li class="flex items-center gap-2">
					{#if prestable}
						<Icon name="check" class="h-4 w-4 shrink-0" strokeWidth={2} />
					{:else}
						<Icon name="x" class="h-4 w-4 shrink-0 text-error" strokeWidth={2} />
					{/if}
					<span class="flex flex-wrap items-baseline gap-x-1">
						<span class="text-on-surface-variant">Juego:</span>
						<span class="font-mono">{ficha.ejemplar.idEjemplar}</span>
						<span class="text-on-surface-variant/70">·</span>
						<span>{ficha.juego.nombreJuego}</span>
						{#if !prestable}
							<span class="text-error">«{ficha.ejemplar.estadoEjemplar}»</span>
						{/if}
					</span>
				</li>
				<li class="flex items-center gap-2">
					{#if sansano && suspension === null}
						<Icon name="check" class="h-4 w-4 shrink-0" strokeWidth={2} />
					{:else if sansano}
						<Icon name="x" class="h-4 w-4 shrink-0 text-error" strokeWidth={2} />
					{:else}
						<Icon
							name="circle-alert"
							class="h-4 w-4 shrink-0 text-on-surface-variant"
							strokeWidth={2}
						/>
					{/if}
					<span class="flex flex-wrap items-baseline gap-x-1">
						<span class="text-on-surface-variant">Solicitante:</span>
						{#if sansano && suspension === null}
							<span>{sansano.nombreSansano}</span>
						{:else if sansano}
							<span class="text-error">Suspendido</span>
						{:else}
							<span>Pendiente</span>
						{/if}
					</span>
				</li>
				<li class="flex items-center gap-2">
					{#if documento}
						<Icon name="check" class="h-4 w-4 shrink-0" strokeWidth={2} />
					{:else}
						<Icon
							name="circle-alert"
							class="h-4 w-4 shrink-0 text-on-surface-variant"
							strokeWidth={2}
						/>
					{/if}
					<span class="flex flex-wrap items-baseline gap-x-1">
						<span class="text-on-surface-variant">Documento retenido:</span>
						<span>{documento ?? 'Pendiente'}</span>
					</span>
				</li>
			</ul>

			{#if !prestable && prestamoFicha === null}
				<div
					class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p>
						No se puede prestar: el ejemplar está «{ficha.ejemplar.estadoEjemplar}». Elige otra
						copia o escanea otro juego.
					</p>
				</div>
			{:else if suspension}
				<div
					class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="ban" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p>
						No se puede prestar: el solicitante está suspendido.
						<span class="text-on-surface/80">{suspension.razon}</span>
					</p>
				</div>
			{:else if !sansano}
				<div
					class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-3 text-on-surface-variant"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p>Falta identificar al solicitante para iniciar el préstamo.</p>
				</div>
			{:else if !documento}
				<div
					class="text-body-sm mt-3 flex items-start gap-2 rounded-base border border-glass-border bg-black/20 p-3 text-on-surface-variant"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<p>Falta indicar el documento retenido para iniciar el préstamo.</p>
				</div>
			{/if}

			{#if errorIniciar}
				<p
					class="text-body-sm mt-3 rounded-base border border-error/40 bg-error/15 p-2.5 text-error"
					role="alert"
				>
					{errorIniciar}
				</p>
			{/if}

			<button
				type="button"
				onclick={prestamoAterminar ? terminarYCargar : iniciar}
				disabled={(!prestamoAterminar && !listo) || enviando}
				class="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-3 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40"
			>
				{#if enviando}
					<Icon name="loader-circle" class="h-4 w-4 animate-spin" strokeWidth={2} />
					Registrando en la base de datos...
				{:else}
					<Icon
						name={prestamoAterminar ? 'arrow-left-right' : 'check'}
						class="h-4 w-4"
						strokeWidth={2}
					/>
					{prestamoAterminar ? 'Terminar préstamo y prestar otro juego' : 'Iniciar préstamo'}
				{/if}
			</button>
		</section>
	{/if}
</div>

{#if qrAbierto}
	<QrEscaneoModal oncerrar={() => (qrAbierto = false)} onresultado={alEscaneado} />
{/if}

{#if altaAbierta}
	<AltaSansanoModal
		rutInicial={rutEntrada}
		error={errorAlta}
		enviando={creandoSansano}
		oncerrar={cerrarAlta}
		oncrear={crearSansano}
	/>
{/if}
