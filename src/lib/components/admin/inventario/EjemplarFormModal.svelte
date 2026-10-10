<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import QrEjemplar from './QrEjemplar.svelte';
	import { meson } from '$lib/data/junta.svelte';
	import { imprimirQr } from '$lib/qr/imprimirQr';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import {
		createEjemplarSchema,
		updateEjemplarSchema,
		type Ejemplar,
		type Juego
	} from '$lib/schemas';

	interface Props {
		juego: Juego;
		ejemplar: Ejemplar | null;
		onclose: () => void;
	}

	type CampoValidable = 'estado' | 'completitud' | 'comentarios';

	let { juego, ejemplar, onclose }: Props = $props();

	const esEdicion = ejemplar !== null;

	const itemsEstado = [
		{ value: 'En bodega', label: 'En bodega' },
		{ value: 'Para revisar', label: 'Para revisar' },
		{ value: 'Perdido', label: 'Perdido' },
		{ value: 'Con su dueño', label: 'Con su dueño' }
	];
	const itemsCompletitud = [
		{ value: 'Completo', label: 'Completo' },
		{ value: 'Incompleto', label: 'Incompleto' }
	];

	let estado = $state<string>(ejemplar?.estadoEjemplar ?? '');
	let completitud = $state<string>(ejemplar?.estadoCompletitud ?? 'Completo');
	let esExterno = $state(ejemplar?.esExterno ?? false);
	let situacion = $state(ejemplar?.situacion ?? '');
	let comentarios = $state(ejemplar?.comentarios ?? '');
	let componentes = $state(ejemplar?.componentes ?? '');

	let tocado = $state<Record<CampoValidable, boolean>>({
		estado: false,
		completitud: false,
		comentarios: false
	});
	let intentoEnvio = $state(false);
	let error = $state<string | null>(null);
	let creado = $state<Ejemplar | null>(null);

	const claseInput =
		'w-full rounded-base border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/70 focus:border-primary/50';
	const claseInputValido = `${claseInput} border-glass-border`;
	const claseInputInvalido = `${claseInput} border-error`;
	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonPrimario =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary transition hover:bg-primary/20 hover:ice-glow';

	function marcarTocado(campo: CampoValidable) {
		tocado[campo] = true;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'estado':
				return estado === '' ? 'Selecciona el estado del ejemplar.' : null;
			case 'completitud':
				return completitud === '' ? 'Selecciona la completitud.' : null;
			case 'comentarios':
				if (!esExterno) return null;
				return comentarios.trim() === ''
					? 'Indica el dueño en los comentarios (campo temporal).'
					: null;
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		estado: mostrarError('estado', validarCampo('estado')),
		completitud: mostrarError('completitud', validarCampo('completitud')),
		comentarios: mostrarError('comentarios', validarCampo('comentarios'))
	});
	const hayErrores = $derived(Object.values(errores).some(Boolean));

	function textoONulo(valor: string): string | null {
		return valor.trim() === '' ? null : valor.trim();
	}

	function imprimirCreado() {
		if (!creado) return;

		const ok = imprimirQr(creado.idEjemplar, juego.nombreJuego);

		if (!ok) {
			error =
				'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.';
		}
	}

	function guardar() {
		intentoEnvio = true;
		error = null;

		if (hayErrores) return;

		if (!esEdicion) {
			const validado = createEjemplarSchema.omit({ idEjemplar: true, idJuego: true }).safeParse({
				esExterno,
				estadoCompletitud: completitud,
				situacion: textoONulo(situacion),
				comentarios: textoONulo(comentarios),
				componentes: textoONulo(componentes),
				estadoEjemplar: estado
			});

			if (!validado.success) {
				error = validado.error.issues[0]?.message ?? 'Revisa los datos del ejemplar.';
				return;
			}

			const resultado = meson.crearEjemplar(juego.idJuego, validado.data);

			if (!resultado.ok || !resultado.ejemplar) {
				error = resultado.motivo;
				return;
			}

			creado = resultado.ejemplar;

			notificaciones.mostrar(
				'success',
				'Ejemplar creado',
				`${resultado.ejemplar.idEjemplar} quedó con el estado elegido. Imprime su QR y pégalo en la caja.`
			);
			return;
		}

		if (!ejemplar) return;

		const validado = updateEjemplarSchema.safeParse({
			esExterno,
			estadoCompletitud: completitud,
			situacion: textoONulo(situacion),
			comentarios: textoONulo(comentarios),
			componentes: textoONulo(componentes),
			estadoEjemplar: estado
		});

		if (!validado.success) {
			error = validado.error.issues[0]?.message ?? 'Revisa los datos del ejemplar.';
			return;
		}

		const resultado = meson.actualizarEjemplar(ejemplar.idEjemplar, validado.data);

		if (!resultado.ok) {
			error = resultado.motivo;
			return;
		}

		notificaciones.mostrar(
			'success',
			'Ejemplar actualizado',
			`${ejemplar.idEjemplar} refleja el nuevo estado y procedencia.`
		);
		onclose();
	}
</script>

<Modal
	title={creado
		? `Ejemplar ${creado.idEjemplar}`
		: esEdicion
			? `Editar ${ejemplar?.idEjemplar}`
			: `Nuevo ejemplar · ${juego.nombreJuego}`}
	size="lg"
	{onclose}
>
	{#if creado}
		<div class="flex flex-col items-center gap-4 py-2 text-center">
			<p class="max-w-md text-body-md text-on-surface-variant">
				El QR codifica
				<span class="font-mono font-semibold text-on-surface">{creado.idEjemplar}</span>. Adherir a la caja del juego.
			</p>
			<QrEjemplar texto={creado.idEjemplar} tamano={192} />
			{#if error}
				<p
					class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>{error}</span>
				</p>
			{/if}
			<div class="flex flex-wrap items-center justify-center gap-3">
				<button type="button" onclick={imprimirCreado} class={claseBotonPrimario}>
					<Icon name="qr-code" class="h-4 w-4" strokeWidth={2} />
					Imprimir QR
				</button>
				<button type="button" onclick={onclose} class={claseBotonSecundario}>Cerrar</button>
			</div>
		</div>
	{:else}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				guardar();
			}}
			class="flex flex-col gap-4"
			novalidate
		>
			{#if !esEdicion}
				<p class="text-body-md text-on-surface-variant">
					El identificador y el QR los genera el sistema al guardar (wiki §2.1); no se ingresan a
					mano.
				</p>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FormField label="Estado" htmlFor="ejemplar-estado" error={errores.estado}>
					<div class="[&>div]:w-full">
						<Dropdown
							items={itemsEstado}
							value={estado === '' ? null : estado}
							onchange={(valor) => {
								estado = valor;
								marcarTocado('estado');
							}}
							placeholder="Seleccionar estado"
						/>
					</div>
				</FormField>

				<FormField label="Completitud" htmlFor="ejemplar-completitud" error={errores.completitud}>
					<div class="[&>div]:w-full">
						<Dropdown
							items={itemsCompletitud}
							value={completitud === '' ? null : completitud}
							onchange={(valor) => {
								completitud = valor;
								marcarTocado('completitud');
							}}
							placeholder="Seleccionar"
						/>
					</div>
				</FormField>
			</div>

			<p class="text-body-sm text-on-surface-variant/70">
				El estado Prestado solo aplicable mediante Préstamos (wiki §1.2/§1.3).
			</p>

			<div class="rounded-base border border-glass-border p-4">
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						bind:checked={esExterno}
						onchange={() => marcarTocado('comentarios')}
						class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
					/>
					<span class="flex flex-col gap-1">
						<span
							class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase select-none"
						>
							Juego externo (de un tercero)
						</span>
						<span class="text-body-sm text-on-surface-variant/70">
							Si se activa, indica el dueño en los comentarios (campo temporal hasta definir el
							definitivo, wiki §2.3). El ejemplar sigue prestándose igual.
						</span>
					</span>
				</label>
			</div>

			<FormField label="Situación" htmlFor="ejemplar-situacion">
				<input
					id="ejemplar-situacion"
					type="text"
					bind:value={situacion}
					placeholder="Estado general de la caja…"
					class={claseInputValido}
				/>
			</FormField>

			<FormField label="Componentes" htmlFor="ejemplar-componentes">
				<textarea
					id="ejemplar-componentes"
					rows="2"
					bind:value={componentes}
					placeholder="Detalle de componentes…"
					class="{claseInputValido} resize-none"
				></textarea>
			</FormField>

			<FormField
				label="Comentarios"
				htmlFor="ejemplar-comentarios"
				error={errores.comentarios}
				hint="Temporalmente incluye al dueño si el ejemplar es externo (p. ej. «Dueño: …»)."
			>
				<textarea
					id="ejemplar-comentarios"
					rows="2"
					bind:value={comentarios}
					onblur={() => marcarTocado('comentarios')}
					placeholder="Piezas faltantes, daños…"
					aria-invalid={errores.comentarios !== null}
					aria-describedby={errores.comentarios ? 'ejemplar-comentarios-error' : undefined}
					class="{errores.comentarios ? claseInputInvalido : claseInputValido} resize-none"
				></textarea>
			</FormField>

			{#if error}
				<p
					class="text-body-sm flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
					role="alert"
				>
					<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
					<span>{error}</span>
				</p>
			{/if}

			<div class="mt-2 flex flex-wrap items-center justify-end gap-3">
				<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
				<button type="submit" class={claseBotonPrimario}>
					<Icon name="check" class="h-4 w-4" strokeWidth={2} />
					{esEdicion ? 'Guardar cambios' : 'Crear ejemplar'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
