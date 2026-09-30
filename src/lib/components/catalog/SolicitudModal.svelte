<script lang="ts">
	import { Check, X } from '@lucide/svelte';
	import { dominiosCorreoInstitucional } from '$lib/schemas/sansano';
	import type { CatalogGame } from '$lib/schemas';

	interface Props {
		juego: CatalogGame;
		onclose?: () => void;
	}

	type ResultadoEnvio = 'normal' | 'baneo';
	type CampoValidable = 'nombre' | 'rut' | 'correo' | 'telefono' | 'fecha';

	let { juego, onclose }: Props = $props();

	const formatoRut = /^\d{1,8}-[0-9kK]$/;
	const formatoTelefono = /^[0-9 +-]{8,20}$/;
	const fechaHoy = new Date().toISOString().slice(0, 10);
	const correoBaneo = 'baneo@usm.cl';

	let nombre = $state('');
	let rut = $state('');
	let correo = $state('');
	let telefono = $state('');
	let fecha = $state('');
	let comentario = $state('');
	let terminosAceptados = $state(false);
	let tocado = $state<Record<CampoValidable, boolean>>({
		nombre: false,
		rut: false,
		correo: false,
		telefono: false,
		fecha: false
	});
	let intentoEnvio = $state(false);
	let enviando = $state(false);
	let enviado = $state(false);

	function enfocarModal(nodo: HTMLElement) {
		nodo.focus();
	}

	function cerrar() {
		onclose?.();
	}

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'nombre':
				return nombre.trim() === '' ? 'Ingresa tu nombre.' : null;
			case 'rut':
				if (rut.trim() === '') {
					return 'Ingresa tu RUT.';
				}

				if (!formatoRut.test(rut.trim())) {
					return 'Formato inválido. Usa el formato 12345678-9.';
				}

				return null;
			case 'correo': {
				if (correo.trim() === '') {
					return 'Ingresa tu correo institucional.';
				}

				const dominio = correo.split('@').at(-1)?.toLowerCase();

				if (!dominio || !dominiosCorreoInstitucional.some((permitido) => permitido === dominio)) {
					return 'Usa un correo institucional USM (…@usm.cl).';
				}

				return null;
			}
			case 'telefono':
				if (telefono.trim() === '') {
					return 'Ingresa tu teléfono.';
				}

				if (!formatoTelefono.test(telefono.trim())) {
					return 'Ingresa un teléfono válido.';
				}

				return null;
			case 'fecha':
				return fecha === '' ? 'Selecciona una fecha de retiro.' : null;
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		nombre: mostrarError('nombre', validarCampo('nombre')),
		rut: mostrarError('rut', validarCampo('rut')),
		correo: mostrarError('correo', validarCampo('correo')),
		telefono: mostrarError('telefono', validarCampo('telefono')),
		fecha: mostrarError('fecha', validarCampo('fecha'))
	});

	const hayErrores = $derived(Object.values(errores).some(Boolean));

	const resultado = $derived<ResultadoEnvio>(
		correo.trim().toLowerCase() === correoBaneo ? 'baneo' : 'normal'
	);

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';

	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;

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

		return partes.join(' · ');
	}

	function enviar() {
		if (enviando) {
			return;
		}

		intentoEnvio = true;

		if (hayErrores || !terminosAceptados) {
			return;
		}

		enviando = true;

		window.setTimeout(() => {
			enviando = false;
			enviado = true;
		}, 700);
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') cerrar();
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
			{#if resultado === 'baneo'}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-full border border-error/50 bg-error/15"
					>
						<X class="h-7 w-7 text-error" strokeWidth={2} aria-hidden="true" />
					</div>

					<h3 class="font-display text-headline-md font-semibold text-on-surface">
						Solicitud rechazada
					</h3>

					<p class="text-body-md text-on-surface-variant">
						No pudimos registrar la solicitud de
						<span class="font-semibold text-on-surface">{juego.nombreJuego}</span> porque el RUT tiene
						una suspensión activa del servicio de préstamos. Si crees que es un error, escríbenos.
					</p>

					<button
						type="button"
						onclick={cerrar}
						class="mt-4 cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
					>
						Entendido
					</button>
				</div>
			{:else}
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
						quedó registrado. Te contactaremos para coordinar la entrega.
					</p>

					<button
						type="button"
						onclick={cerrar}
						class="mt-4 cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-6 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow"
					>
						Listo
					</button>
				</div>
			{/if}
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

			<form
				onsubmit={(e) => {
					e.preventDefault();
					enviar();
				}}
				class="flex flex-col gap-4"
				novalidate
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label
							for="solicitud-nombre"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							Nombre
						</label>

						<input
							id="solicitud-nombre"
							name="nombre"
							type="text"
							bind:value={nombre}
							onblur={() => marcarTocado('nombre')}
							placeholder="Tu nombre completo"
							aria-invalid={errores.nombre !== null}
							aria-describedby={errores.nombre ? 'solicitud-nombre-error' : undefined}
							class={errores.nombre ? claseInputInvalido : claseInputValido}
						/>

						{#if errores.nombre}
							<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-nombre-error">
								{errores.nombre}
							</p>
						{/if}
					</div>

					<div class="flex flex-col gap-1.5">
						<label
							for="solicitud-rut"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							RUT
						</label>

						<input
							id="solicitud-rut"
							name="rut"
							type="text"
							inputmode="numeric"
							bind:value={rut}
							onblur={() => marcarTocado('rut')}
							placeholder="12345678-9"
							aria-invalid={errores.rut !== null}
							aria-describedby={errores.rut ? 'solicitud-rut-error' : undefined}
							class={errores.rut ? claseInputInvalido : claseInputValido}
						/>

						{#if errores.rut}
							<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-rut-error">
								{errores.rut}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-correo"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
					>
						Correo institucional
					</label>

					<input
						id="solicitud-correo"
						name="correo"
						type="email"
						bind:value={correo}
						onblur={() => marcarTocado('correo')}
						placeholder="correo@usm.cl"
						aria-invalid={errores.correo !== null}
						aria-describedby={errores.correo ? 'solicitud-correo-error' : undefined}
						class={errores.correo ? claseInputInvalido : claseInputValido}
					/>

					{#if errores.correo}
						<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-correo-error">
							{errores.correo}
						</p>
					{/if}

					{#if import.meta.env.DEV}
						<p
							class="font-mono text-xs tracking-wider text-on-surface-variant/70 uppercase select-none"
						>
							Maqueta: usa <span class="text-primary">{correoBaneo}</span> para ver el estado de baneo.
						</p>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label
							for="solicitud-telefono"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							Teléfono
						</label>

						<input
							id="solicitud-telefono"
							name="telefono"
							type="tel"
							bind:value={telefono}
							onblur={() => marcarTocado('telefono')}
							placeholder="9 1234 5678"
							aria-invalid={errores.telefono !== null}
							aria-describedby={errores.telefono ? 'solicitud-telefono-error' : undefined}
							class={errores.telefono ? claseInputInvalido : claseInputValido}
						/>

						{#if errores.telefono}
							<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-telefono-error">
								{errores.telefono}
							</p>
						{/if}
					</div>

					<div class="flex flex-col gap-1.5">
						<label
							for="solicitud-fecha"
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
						>
							Fecha de retiro
						</label>

						<input
							id="solicitud-fecha"
							name="fechaSeleccionada"
							type="date"
							min={fechaHoy}
							bind:value={fecha}
							onblur={() => marcarTocado('fecha')}
							aria-invalid={errores.fecha !== null}
							aria-describedby={errores.fecha ? 'solicitud-fecha-error' : undefined}
							class={errores.fecha ? claseInputInvalido : claseInputValido}
						/>

						{#if errores.fecha}
							<p class="text-body-sm mt-0.5 font-medium text-error" id="solicitud-fecha-error">
								{errores.fecha}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="solicitud-comentario"
						class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
					>
						Comentario <span class="normal-case opacity-60">(opcional)</span>
					</label>

					<textarea
						id="solicitud-comentario"
						name="comentario"
						rows="2"
						bind:value={comentario}
						placeholder="Algo que debamos saber…"
						class="w-full resize-none rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50"
					></textarea>
				</div>

				<details class="rounded-base border border-glass-border bg-surface-container-lowest px-4">
					<summary
						class="cursor-pointer py-3 font-mono text-label-md tracking-wider text-on-surface-variant uppercase select-none hover:text-on-surface"
					>
						Términos y Condiciones
					</summary>

					<div class="text-body-sm flex flex-col gap-2 pb-4 text-on-surface-variant">
						<p>
							Los préstamos son gratuitos y exclusivos para estudiantes USM. Al retirar un juego te
							haces responsable de la caja y su contenido.
						</p>

						<p>
							Devuelve la caja completa y en el mismo estado, dentro del plazo acordado con el club.
						</p>

						<p>
							El club se reserva el derecho de suspender el préstamo en caso de atrasos o daños
							recurrentes.
						</p>
					</div>
				</details>

				<label class="text-body-sm flex cursor-pointer items-start gap-3 text-on-surface-variant">
					<input
						type="checkbox"
						bind:checked={terminosAceptados}
						class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
					/>
					<span>He leído y acepto los términos y condiciones del préstamo.</span>
				</label>

				<button
					type="submit"
					disabled={!terminosAceptados || enviando}
					aria-busy={enviando}
					class="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-6 py-2.5 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/10"
				>
					{enviando ? 'Enviando…' : 'Enviar solicitud'}
				</button>

				<p class="text-body-sm text-center text-on-surface-variant">
					No necesitas una cuenta: el préstamo es gratuito para estudiantes USM.
				</p>
			</form>
		{/if}
	</div>
</div>
