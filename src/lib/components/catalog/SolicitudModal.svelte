<script lang="ts">
	import { Check, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import {
		BLOQUES_RETIRO,
		crearSolicitudWebSchema,
		digitosVerificadoresCoinciden,
		formatearIdentificador,
		MENSAJE_DIGITO_VERIFICADOR_DISTINTO,
		opcionesSolicitudWebSchema,
		respuestaErrorSolicitudWebSchema,
		solicitudWebCreadaSchema,
		type BloqueRetiro,
		type CatalogGame,
		type OpcionesSolicitudWeb
	} from '$lib/schemas';

	interface Props {
		juego: CatalogGame;
		onclose?: () => void;
	}

	type CampoValidable =
		| 'nombreSansano'
		| 'rut'
		| 'rol'
		| 'correoInstitucional'
		| 'telefono'
		| 'idJuegoExpansion'
		| 'bloqueRetiro'
		| 'aceptaTerminos';

	const camposValidables = new Set<CampoValidable>([
		'nombreSansano',
		'rut',
		'rol',
		'correoInstitucional',
		'telefono',
		'idJuegoExpansion',
		'bloqueRetiro',
		'aceptaTerminos'
	]);

	let { juego, onclose }: Props = $props();

	let nombreSansano = $state('');
	let rut = $state('');
	let rol = $state('');
	let correoInstitucional = $state('');
	let telefono = $state('');
	let idJuegoExpansion = $state('');
	let bloqueRetiro = $state<BloqueRetiro | ''>('');
	let aceptaTerminos = $state(false);

	let opciones = $state<OpcionesSolicitudWeb | null>(null);
	let cargandoOpciones = $state(true);
	let errorOpciones = $state<string | null>(null);
	let erroresServidor = $state<Partial<Record<CampoValidable, string>>>({});
	let errorGeneral = $state<string | null>(null);
	let intentoEnvio = $state(false);
	let enviando = $state(false);
	let enviado = $state(false);
	let identificadorEnEdicion = $state<'rut' | 'rol' | null>(null);
	let controladorOpciones: AbortController | null = null;

	let tocado = $state<Record<CampoValidable, boolean>>({
		nombreSansano: false,
		rut: false,
		rol: false,
		correoInstitucional: false,
		telefono: false,
		idJuegoExpansion: false,
		bloqueRetiro: false,
		aceptaTerminos: false
	});

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60';
	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;

	function datosFormulario() {
		return {
			idJuego: juego.idJuego,
			idJuegoExpansion,
			nombreSansano,
			rut,
			rol,
			telefono,
			correoInstitucional,
			bloqueRetiro,
			aceptaTerminos: aceptaTerminos ? 'on' : undefined
		};
	}

	const validacionFormulario = $derived.by(() =>
		crearSolicitudWebSchema().safeParse(datosFormulario())
	);

	const erroresLocales = $derived.by(() => {
		const mensajes: Partial<Record<CampoValidable, string>> = {};

		if (!validacionFormulario.success) {
			for (const issue of validacionFormulario.error.issues) {
				const campo = issue.path[0];

				if (typeof campo === 'string' && esCampoValidable(campo) && !mensajes[campo]) {
					mensajes[campo] = issue.message;
				}
			}
		}

		return mensajes;
	});

	const errores = $derived.by(() => {
		const visibles: Partial<Record<CampoValidable, string>> = {};

		for (const campo of camposValidables) {
			if (tocado[campo] || intentoEnvio) {
				const errorLocal = erroresLocales[campo];
				const esErrorConjunto =
					campo === 'rol' && errorLocal === MENSAJE_DIGITO_VERIFICADOR_DISTINTO;

				visibles[campo] = erroresServidor[campo] ?? (esErrorConjunto ? undefined : errorLocal);
			}
		}

		return visibles;
	});

	const errorDigitoVerificador = $derived(
		digitosVerificadoresCoinciden(rut, rol) === false &&
			identificadorEnEdicion === null &&
			(intentoEnvio || (tocado.rut && tocado.rol))
			? MENSAJE_DIGITO_VERIFICADOR_DISTINTO
			: undefined
	);

	onMount(() => {
		void cargarOpciones();

		return () => controladorOpciones?.abort();
	});

	function esCampoValidable(valor: string): valor is CampoValidable {
		return camposValidables.has(valor as CampoValidable);
	}

	function enfocarModal(nodo: HTMLElement) {
		nodo.focus();
	}

	function cerrar() {
		onclose?.();
	}

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function comenzarEdicionIdentificador(campo: 'rut' | 'rol') {
		identificadorEnEdicion = campo;
	}

	function terminarEdicionIdentificador(campo: 'rut' | 'rol') {
		marcarTocado(campo);
		identificadorEnEdicion = null;
	}

	function limpiarError(campo: CampoValidable) {
		if (erroresServidor[campo]) {
			const restantes = { ...erroresServidor };
			delete restantes[campo];
			erroresServidor = restantes;
		}
	}

	function actualizarIdentificador(campo: 'rut' | 'rol', valor: string) {
		const valorFormateado = formatearIdentificador(valor);

		if (campo === 'rut') {
			rut = valorFormateado;
		} else {
			rol = valorFormateado;
		}

		limpiarError(campo);
	}

	function actualizarTelefono(valor: string) {
		telefono = valor.replace(/\D/g, '').slice(0, 8);
		limpiarError('telefono');
	}

	async function leerRespuesta(response: Response): Promise<unknown> {
		try {
			return await response.json();
		} catch {
			return null;
		}
	}

	async function cargarOpciones() {
		controladorOpciones?.abort();
		const controlador = new AbortController();
		controladorOpciones = controlador;
		cargandoOpciones = true;
		errorOpciones = null;

		try {
			const response = await fetch(`/api/solicitudes/opciones?idJuego=${juego.idJuego}`, {
				signal: controlador.signal
			});
			const cuerpo = await leerRespuesta(response);

			if (!response.ok) {
				throw new Error('El servidor rechazó la consulta de opciones.');
			}

			opciones = opcionesSolicitudWebSchema.parse(cuerpo);
		} catch (error) {
			if (controlador.signal.aborted) {
				return;
			}

			console.error('No se pudieron cargar las opciones de solicitud:', error);
			opciones = null;
			errorOpciones = 'No pudimos cargar las fechas y expansiones disponibles.';
		} finally {
			if (controladorOpciones === controlador) {
				controladorOpciones = null;
				cargandoOpciones = false;
			}
		}
	}

	function aplicarErroresServidor(cuerpo: unknown) {
		const validacion = respuestaErrorSolicitudWebSchema.safeParse(cuerpo);

		if (!validacion.success) {
			errorGeneral = 'No pudimos registrar la solicitud. Inténtalo nuevamente.';
			return;
		}

		errorGeneral = validacion.data.message;

		if (validacion.data.field && esCampoValidable(validacion.data.field)) {
			erroresServidor[validacion.data.field] = validacion.data.message;
		}

		for (const issue of validacion.data.issues ?? []) {
			const campo = issue.path[0];

			if (typeof campo === 'string' && esCampoValidable(campo) && !erroresServidor[campo]) {
				erroresServidor[campo] = issue.message;
			}
		}
	}

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();

		if (enviando || !(evento.currentTarget instanceof HTMLFormElement)) {
			return;
		}

		intentoEnvio = true;
		identificadorEnEdicion = null;
		erroresServidor = {};
		errorGeneral = null;

		if (!validacionFormulario.success) {
			return;
		}

		enviando = true;

		try {
			const response = await fetch('/api/solicitudes', {
				method: 'POST',
				body: new FormData(evento.currentTarget)
			});
			const cuerpo = await leerRespuesta(response);

			if (!response.ok) {
				aplicarErroresServidor(cuerpo);
				return;
			}

			const solicitudCreada = solicitudWebCreadaSchema.safeParse(cuerpo);

			if (!solicitudCreada.success) {
				throw new Error('La respuesta de creación no tiene el formato esperado.');
			}

			enviado = true;
		} catch (error) {
			console.error('No se pudo enviar la solicitud:', error);
			errorGeneral = 'No pudimos registrar la solicitud. Inténtalo nuevamente.';
		} finally {
			enviando = false;
		}
	}

	function detalleJuego(): string {
		const partes: string[] = [];

		if (juego.jugadoresMin === null && juego.jugadoresMax === null) {
			partes.push('Jug. sin informar');
		} else if (juego.jugadoresMin === null) {
			partes.push(`Hasta ${juego.jugadoresMax} jug.`);
		} else if (juego.jugadoresMax === null) {
			partes.push(`Desde ${juego.jugadoresMin} jug.`);
		} else if (juego.jugadoresMin === juego.jugadoresMax) {
			partes.push(`${juego.jugadoresMin} jug.`);
		} else {
			partes.push(`${juego.jugadoresMin}–${juego.jugadoresMax} jug.`);
		}

		partes.push(juego.duracion === null ? 'Duración sin informar' : `${juego.duracion} min`);
		partes.push(juego.edadMinima === null ? 'Edad sin informar' : `${juego.edadMinima}+`);

		return partes.join(' · ');
	}
</script>

<svelte:window
	onkeydown={(evento) => {
		if (evento.key === 'Escape') cerrar();
	}}
/>

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="solicitud-titulo"
>
	<button
		type="button"
		class="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
		aria-label="Cerrar formulario"
		onclick={cerrar}
	></button>

	<div
		class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-base surface-level-3 p-6 sm:p-8"
		tabindex="-1"
		use:enfocarModal
	>
		<button
			type="button"
			onclick={cerrar}
			aria-label="Cerrar formulario"
			class="absolute top-3 right-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-base border border-glass-border bg-black/30 text-on-surface-variant transition hover:bg-black/50 hover:text-on-surface"
		>
			<X class="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
		</button>

		{#if enviado}
			<div class="flex flex-col items-center gap-3 py-6 text-center">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary/15"
				>
					<Check class="h-7 w-7 text-primary" strokeWidth={2.2} aria-hidden="true" />
				</div>

				<h3 class="font-display text-headline-md font-semibold text-on-surface">
					Solicitud enviada
				</h3>

				<p class="text-body-md text-on-surface-variant">
					El pedido de
					<span class="font-semibold text-on-surface">{juego.nombreJuego}</span>
					quedó registrado. La administración revisará la disponibilidad y te contactará.
				</p>

				<button
					type="button"
					onclick={cerrar}
					class="mt-4 cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
				>
					Listo
				</button>
			</div>
		{:else}
			<div class="mb-6 flex gap-4">
				{#if juego.pathImagen}
					<img
						src={juego.pathImagen}
						alt={`Caja de ${juego.nombreJuego}`}
						class="h-24 w-20 shrink-0 rounded-base border border-glass-border bg-surface-container-lowest object-cover"
						width="80"
						height="96"
					/>
				{:else}
					<div
						class="flex h-24 w-20 shrink-0 items-center justify-center rounded-base border border-glass-border bg-surface-container-lowest px-2 text-center font-mono text-xs text-on-surface-variant"
						role="img"
						aria-label={`No hay imagen disponible para ${juego.nombreJuego}`}
					>
						Sin imagen
					</div>
				{/if}

				<div class="flex flex-col justify-center gap-1">
					<span class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase">
						Pedir juego
					</span>
					<h3
						id="solicitud-titulo"
						class="font-display text-headline-md leading-tight font-semibold text-on-surface"
					>
						{juego.nombreJuego}
					</h3>
					<p class="font-mono text-sm text-on-surface-variant">{detalleJuego()}</p>
				</div>
			</div>

			{#if errorOpciones}
				<div
					class="mb-4 rounded-base border border-error/40 bg-error-container/20 p-4"
					role="alert"
				>
					<p class="text-body-sm text-on-surface">{errorOpciones}</p>
					<button
						type="button"
						onclick={cargarOpciones}
						class="mt-2 cursor-pointer font-semibold text-primary hover:underline"
					>
						Reintentar
					</button>
				</div>
			{/if}

			<form onsubmit={enviar} class="flex flex-col gap-4" novalidate>
				<input type="hidden" name="idJuego" value={juego.idJuego} />

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-nombre"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>Nombre</label
					>
					<input
						id="solicitud-nombre"
						name="nombreSansano"
						type="text"
						autocomplete="name"
						maxlength="120"
						bind:value={nombreSansano}
						oninput={() => limpiarError('nombreSansano')}
						onblur={() => marcarTocado('nombreSansano')}
						placeholder="Tu nombre completo"
						aria-invalid={errores.nombreSansano !== undefined}
						aria-describedby={errores.nombreSansano ? 'solicitud-nombre-error' : undefined}
						class={errores.nombreSansano ? claseInputInvalido : claseInputValido}
					/>
					{#if errores.nombreSansano}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-nombre-error">
							{errores.nombreSansano}
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label
								for="solicitud-rut"
								class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
								>RUT</label
							>
							<input
								id="solicitud-rut"
								name="rut"
								type="text"
								value={rut}
								onfocus={() => comenzarEdicionIdentificador('rut')}
								oninput={(evento) => actualizarIdentificador('rut', evento.currentTarget.value)}
								onblur={() => terminarEdicionIdentificador('rut')}
								placeholder="12345678-9"
								aria-invalid={errores.rut !== undefined || errorDigitoVerificador !== undefined}
								aria-describedby={errores.rut
									? `solicitud-rut-error${errorDigitoVerificador ? ' solicitud-dv-error' : ''}`
									: errorDigitoVerificador
										? 'solicitud-dv-error'
										: undefined}
								class={errores.rut || errorDigitoVerificador
									? claseInputInvalido
									: claseInputValido}
							/>
							{#if errores.rut}
								<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-rut-error">
									{errores.rut}
								</p>
							{/if}
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								for="solicitud-rol"
								class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
								>ROL</label
							>
							<input
								id="solicitud-rol"
								name="rol"
								type="text"
								value={rol}
								onfocus={() => comenzarEdicionIdentificador('rol')}
								oninput={(evento) => actualizarIdentificador('rol', evento.currentTarget.value)}
								onblur={() => terminarEdicionIdentificador('rol')}
								placeholder="202612345-9"
								aria-invalid={errores.rol !== undefined || errorDigitoVerificador !== undefined}
								aria-describedby={errores.rol
									? `solicitud-rol-error${errorDigitoVerificador ? ' solicitud-dv-error' : ''}`
									: errorDigitoVerificador
										? 'solicitud-dv-error'
										: undefined}
								class={errores.rol || errorDigitoVerificador
									? claseInputInvalido
									: claseInputValido}
							/>
							{#if errores.rol}
								<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-rol-error">
									{errores.rol}
								</p>
							{/if}
						</div>
					</div>

					{#if errorDigitoVerificador}
						<p
							id="solicitud-dv-error"
							class="text-body-sm mt-0.5 font-medium text-error"
							role="alert"
						>
							{errorDigitoVerificador}
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-correo"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>Correo institucional</label
					>
					<input
						id="solicitud-correo"
						name="correoInstitucional"
						type="email"
						autocomplete="email"
						bind:value={correoInstitucional}
						oninput={() => limpiarError('correoInstitucional')}
						onblur={() => marcarTocado('correoInstitucional')}
						placeholder="correo@usm.cl"
						aria-invalid={errores.correoInstitucional !== undefined}
						aria-describedby={errores.correoInstitucional ? 'solicitud-correo-error' : undefined}
						class={errores.correoInstitucional ? claseInputInvalido : claseInputValido}
					/>
					{#if errores.correoInstitucional}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-correo-error">
							{errores.correoInstitucional}
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-telefono"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>Teléfono</label
					>
					<div class="flex">
						<span
							class="flex items-center rounded-l-base border border-r-0 border-glass-border bg-surface-container px-3 text-body-md text-on-surface-variant"
							>+569</span
						>
						<input
							id="solicitud-telefono"
							name="telefono"
							type="tel"
							inputmode="numeric"
							autocomplete="tel-national"
							value={telefono}
							oninput={(evento) => actualizarTelefono(evento.currentTarget.value)}
							onblur={() => marcarTocado('telefono')}
							placeholder="12345678"
							aria-label="Ocho dígitos posteriores a más cinco seis nueve"
							aria-invalid={errores.telefono !== undefined}
							aria-describedby={errores.telefono ? 'solicitud-telefono-error' : undefined}
							class={`${errores.telefono ? claseInputInvalido : claseInputValido} rounded-l-none`}
						/>
					</div>
					{#if errores.telefono}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-telefono-error">
							{errores.telefono}
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-expansion"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>Expansión <span class="normal-case opacity-60">(opcional)</span></label
					>
					<select
						id="solicitud-expansion"
						name="idJuegoExpansion"
						bind:value={idJuegoExpansion}
						onchange={() => {
							marcarTocado('idJuegoExpansion');
							limpiarError('idJuegoExpansion');
						}}
						disabled={cargandoOpciones || opciones === null || opciones.expansiones.length === 0}
						aria-invalid={errores.idJuegoExpansion !== undefined}
						aria-describedby={errores.idJuegoExpansion ? 'solicitud-expansion-error' : undefined}
						class={errores.idJuegoExpansion ? claseInputInvalido : claseInputValido}
					>
						<option value=""
							>{cargandoOpciones
								? 'Cargando expansiones…'
								: opciones?.expansiones.length
									? 'Sin expansión'
									: 'No hay expansiones disponibles'}</option
						>
						{#each opciones?.expansiones ?? [] as expansion (expansion.idJuego)}
							<option value={expansion.idJuego}>{expansion.nombreJuego}</option>
						{/each}
					</select>
					{#if errores.idJuegoExpansion}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-expansion-error">
							{errores.idJuegoExpansion}
						</p>
					{/if}
				</div>

				<fieldset class="flex flex-col gap-1.5">
					<legend
						id="solicitud-bloque-leyenda"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
					>
						Bloque de retiro
					</legend>

					<div
						class="grid grid-cols-1 gap-2 sm:grid-cols-2"
						role="radiogroup"
						aria-labelledby="solicitud-bloque-leyenda"
						aria-invalid={errores.bloqueRetiro !== undefined}
						aria-describedby={errores.bloqueRetiro ? 'solicitud-bloque-error' : undefined}
					>
						{#each BLOQUES_RETIRO as bloque (bloque.valor)}
							<label
								class={`text-body-sm flex cursor-pointer items-start gap-3 rounded-base border px-4 py-3 transition ${
									bloqueRetiro === bloque.valor
										? 'border-primary/60 bg-primary/10 text-on-surface'
										: 'border-glass-border bg-surface-container-lowest text-on-surface-variant hover:border-primary/40'
								}`}
							>
								<input
									type="radio"
									name="bloqueRetiro"
									value={bloque.valor}
									bind:group={bloqueRetiro}
									onchange={() => {
										marcarTocado('bloqueRetiro');
										limpiarError('bloqueRetiro');
									}}
									disabled={cargandoOpciones || opciones === null}
									class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
								/>
								<span>{bloque.etiqueta}</span>
							</label>
						{/each}
					</div>

					{#if errores.bloqueRetiro}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-bloque-error">
							{errores.bloqueRetiro}
						</p>
					{/if}
				</fieldset>

				<details class="rounded-base border border-glass-border bg-surface-container-lowest px-4">
					<summary
						class="cursor-pointer py-3 font-mono text-label-md tracking-wider text-on-surface-variant uppercase select-none hover:text-on-surface"
						>Términos y Condiciones</summary
					>
					<p class="text-body-sm pb-4 text-on-surface-variant">Términos y condiciones</p>
				</details>

				<div>
					<label class="text-body-sm flex cursor-pointer items-start gap-3 text-on-surface-variant">
						<input
							name="aceptaTerminos"
							type="checkbox"
							bind:checked={aceptaTerminos}
							onchange={() => {
								marcarTocado('aceptaTerminos');
								limpiarError('aceptaTerminos');
							}}
							aria-invalid={errores.aceptaTerminos !== undefined}
							aria-describedby={errores.aceptaTerminos ? 'solicitud-terminos-error' : undefined}
							class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
						/>
						<span>He leído y acepto los términos y condiciones del préstamo.</span>
					</label>
					{#if errores.aceptaTerminos}
						<p class="text-body-sm mt-1 font-medium text-error" id="solicitud-terminos-error">
							{errores.aceptaTerminos}
						</p>
					{/if}
				</div>

				{#if errorGeneral}
					<p
						class="text-body-sm rounded-base border border-error/40 bg-error-container/20 p-3 text-error"
						role="alert"
					>
						{errorGeneral}
					</p>
				{/if}

				<button
					type="submit"
					disabled={cargandoOpciones || opciones === null || enviando}
					aria-busy={enviando}
					class="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/10"
				>
					{enviando ? 'Enviando…' : 'Enviar solicitud'}
				</button>
			</form>
		{/if}
	</div>
</div>
