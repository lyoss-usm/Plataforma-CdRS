<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';
	import Dropdown from '$lib/components/admin/primitives/Dropdown.svelte';
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import { meson } from '$lib/data/junta.svelte';
	import { buscarBggSimulado, type BggSugerencia } from '$lib/data/bggMock';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
	import { createJuegoSchema, updateJuegoSchema, type Juego } from '$lib/schemas';

	interface Props {
		juego: Juego | null;
		onclose: () => void;
	}

	type CampoValidable =
		| 'nombre'
		| 'tipo'
		| 'base'
		| 'edad'
		| 'jugadoresMin'
		| 'jugadoresMax'
		| 'duracion'
		| 'calificacion'
		| 'manual'
		| 'video';

	let { juego, onclose }: Props = $props();

	const esEdicion = juego !== null;

	const itemsTipo = [
		{ value: 'Juego base', label: 'Juego base' },
		{ value: 'Expansión', label: 'Expansión' }
	];
	const itemsDificultad = [
		{ value: '', label: 'Sin informar' },
		{ value: 'Fácil', label: 'Fácil' },
		{ value: 'Intermedio', label: 'Intermedio' },
		{ value: 'Difícil', label: 'Difícil' }
	];
	const itemsBase = $derived(
		meson.juegos
			.filter((j) => j.tipo === 'Juego base' && (juego === null || j.idJuego !== juego.idJuego))
			.map((j) => ({ value: String(j.idJuego), label: `#${j.idJuego} · ${j.nombreJuego}` }))
	);

	let nombre = $state(juego?.nombreJuego ?? '');
	let tipo = $state(juego?.tipo ?? '');
	let baseSeleccion = $state(
		juego?.tipo === 'Expansión' && juego.idJuegoBase !== null ? String(juego.idJuegoBase) : ''
	);
	let edad = $state(juego?.edadMinima?.toString() ?? '');
	let jugadoresMin = $state(juego?.jugadoresMin?.toString() ?? '');
	let jugadoresMax = $state(juego?.jugadoresMax?.toString() ?? '');
	let duracion = $state(juego?.duracion?.toString() ?? '');
	let calificacion = $state(juego?.calificacion?.toString() ?? '');
	let dificultad = $state(juego?.dificultad ?? '');
	let pathImagen = $state(juego?.pathImagen ?? '');
	let manual = $state(juego?.manual ?? '');
	let video = $state(juego?.video ?? '');

	let busquedaBgg = $state('');
	let resultadosBgg = $state<BggSugerencia[]>([]);

	let tocado = $state<Record<CampoValidable, boolean>>({
		nombre: false,
		tipo: false,
		base: false,
		edad: false,
		jugadoresMin: false,
		jugadoresMax: false,
		duracion: false,
		calificacion: false,
		manual: false,
		video: false
	});
	let intentoEnvio = $state(false);
	let error = $state<string | null>(null);

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

	function enteroPositivoO(errorVacio: string, valor: string): string | null {
		if (valor.trim() === '') return null;
		if (!/^\d+$/.test(valor.trim()) || Number(valor.trim()) < 1) return errorVacio;
		return null;
	}

	function validarCampo(campo: CampoValidable): string | null {
		switch (campo) {
			case 'nombre':
				return nombre.trim() === '' ? 'Ingresa el nombre del juego.' : null;
			case 'tipo':
				return tipo === '' ? 'Selecciona el tipo.' : null;
			case 'base':
				if (tipo !== 'Expansión') return null;
				return baseSeleccion === '' ? 'Selecciona el juego base.' : null;
			case 'edad':
				return enteroPositivoO('Edad mínima inválida.', edad);
			case 'jugadoresMin':
				return enteroPositivoO('Cantidad inválida.', jugadoresMin);
			case 'jugadoresMax': {
				const base = enteroPositivoO('Cantidad inválida.', jugadoresMax);
				if (base) return base;
				if (jugadoresMin.trim() !== '' && jugadoresMax.trim() !== '') {
					if (Number(jugadoresMax.trim()) < Number(jugadoresMin.trim())) {
						return 'Debe ser mayor o igual al mínimo.';
					}
				}
				return null;
			}
			case 'duracion':
				return enteroPositivoO('Duración inválida (minutos).', duracion);
			case 'calificacion': {
				if (calificacion.trim() === '') return null;
				const n = Number(calificacion.trim());
				if (!Number.isFinite(n) || n < 0 || n > 10) return 'Calificación entre 0 y 10.';
				return null;
			}
			case 'manual':
				if (manual.trim() === '') return null;
				return /^https?:\/\/.+/.test(manual.trim()) ? null : 'URL inválida (https://…).';
			case 'video':
				if (video.trim() === '') return null;
				return /^https?:\/\/.+/.test(video.trim()) ? null : 'URL inválida (https://…).';
		}
	}

	function mostrarError(campo: CampoValidable, mensaje: string | null): string | null {
		return tocado[campo] || intentoEnvio ? mensaje : null;
	}

	const errores = $derived({
		nombre: mostrarError('nombre', validarCampo('nombre')),
		tipo: mostrarError('tipo', validarCampo('tipo')),
		base: mostrarError('base', validarCampo('base')),
		edad: mostrarError('edad', validarCampo('edad')),
		jugadoresMin: mostrarError('jugadoresMin', validarCampo('jugadoresMin')),
		jugadoresMax: mostrarError('jugadoresMax', validarCampo('jugadoresMax')),
		duracion: mostrarError('duracion', validarCampo('duracion')),
		calificacion: mostrarError('calificacion', validarCampo('calificacion')),
		manual: mostrarError('manual', validarCampo('manual')),
		video: mostrarError('video', validarCampo('video'))
	});
	const hayErrores = $derived(Object.values(errores).some(Boolean));

	function numeroONulo(valor: string): number | null {
		return valor.trim() === '' ? null : Number(valor.trim());
	}

	function textoONulo(valor: string): string | null {
		return valor.trim() === '' ? null : valor.trim();
	}

	function buscarEnBgg() {
		resultadosBgg = buscarBggSimulado(busquedaBgg);
	}

	function usarSugerencia(s: BggSugerencia) {
		nombre = s.nombre;
		edad = s.edadMinima?.toString() ?? '';
		jugadoresMin = s.jugadoresMin?.toString() ?? '';
		jugadoresMax = s.jugadoresMax?.toString() ?? '';
		duracion = s.duracion?.toString() ?? '';
		calificacion = s.calificacion?.toString() ?? '';
		dificultad = s.dificultad ?? '';
		pathImagen = s.imagen ?? '';
		error = null;
	}

	function guardar() {
		intentoEnvio = true;
		error = null;

		if (hayErrores) return;

		const detalles = {
			nombreJuego: nombre.trim(),
			edadMinima: numeroONulo(edad),
			jugadoresMin: numeroONulo(jugadoresMin),
			jugadoresMax: numeroONulo(jugadoresMax),
			duracion: numeroONulo(duracion),
			calificacion: calificacion.trim() === '' ? null : Number(calificacion.trim()),
			dificultad: dificultad === '' ? null : dificultad,
			pathImagen: textoONulo(pathImagen),
			manual: textoONulo(manual),
			video: textoONulo(video)
		} as const;

		if (!esEdicion) {
			const borrador =
				tipo === 'Expansión'
					? { ...detalles, tipo: 'Expansión' as const, idJuegoBase: Number(baseSeleccion) }
					: { ...detalles, tipo: 'Juego base' as const, idJuegoBase: null };

			const validado = createJuegoSchema.safeParse(borrador);

			if (!validado.success) {
				error = validado.error.issues[0]?.message ?? 'Revisa los datos del juego.';
				return;
			}

			const resultado = meson.crearJuego(validado.data);

			if (!resultado.ok) {
				error = resultado.motivo;
				return;
			}

			notificaciones.mostrar(
				'success',
				'Juego creado',
				`«${resultado.juego?.nombreJuego}» ya aparece en el catálogo como no disponible hasta agregar ejemplares.`
			);
			onclose();
			return;
		}

		if (!juego) return;

		const borrador =
			tipo === 'Expansión'
				? { ...detalles, tipo: 'Expansión' as const, idJuegoBase: Number(baseSeleccion) }
				: tipo === 'Juego base'
					? { ...detalles, tipo: 'Juego base' as const, idJuegoBase: null }
					: { ...detalles };

		const validado = updateJuegoSchema.safeParse(borrador);

		if (!validado.success) {
			error = validado.error.issues[0]?.message ?? 'Revisa los datos del juego.';
			return;
		}

		const resultado = meson.actualizarJuego(juego.idJuego, validado.data);

		if (!resultado.ok) {
			error = resultado.motivo;
			return;
		}

		notificaciones.mostrar(
			'success',
			'Juego actualizado',
			`«${resultado.juego?.nombreJuego}» conserva los datos corregidos (incluidos los de BGG).`
		);
		onclose();
	}
</script>

<Modal title={esEdicion ? `Editar juego #${juego?.idJuego}` : 'Nuevo juego'} size="lg" {onclose}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			guardar();
		}}
		class="flex flex-col gap-4"
		novalidate
	>
		{#if import.meta.env.DEV}
			<fieldset class="rounded-base border border-glass-border p-4">
				<legend
					class="px-1 font-mono text-[10px] tracking-wider text-on-surface-variant/70 uppercase"
				>
					Autocompletado BGG (simulado · DEV)
				</legend>
				<p class="text-body-sm mb-3 text-on-surface-variant">
					Maqueta: el proxy real (/api/bgg) se trabaja en paralelo (#8). Los datos pegados quedan
					editables en la ficha.
				</p>
				<div class="flex flex-col gap-2.5 sm:flex-row">
					<label class="sr-only" for="juego-bgg">Buscar en BGG simulado</label>
					<input
						id="juego-bgg"
						type="search"
						bind:value={busquedaBgg}
						placeholder="Buscar en BGG, p. ej. catan…"
						class={claseInputValido}
					/>
					<button type="button" onclick={buscarEnBgg} class={claseBotonSecundario}>
						<span class="inline-flex items-center gap-2">
							<Icon name="search" class="h-4 w-4" strokeWidth={2} />
							Buscar
						</span>
					</button>
				</div>
				{#if resultadosBgg.length > 0}
					<ul class="mt-3 flex flex-col gap-2">
						{#each resultadosBgg as s (s.idBgg)}
							<li
								class="flex flex-wrap items-center justify-between gap-2 rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2"
							>
								<span class="text-body-md text-on-surface">
									{s.nombre}
									<span class="font-mono text-xs text-on-surface-variant/70">
										· {s.anio} · BGG #{s.idBgg}
									</span>
								</span>
								<button
									type="button"
									onclick={() => usarSugerencia(s)}
									class="cursor-pointer rounded-base border border-primary/50 bg-primary/10 px-3 py-1.5 font-mono text-xs tracking-wider text-primary uppercase transition hover:bg-primary/20"
								>
									Usar
								</button>
							</li>
						{/each}
					</ul>
				{:else if busquedaBgg.trim() !== ''}
					<p class="text-body-sm mt-2 text-on-surface-variant/70">
						Sin coincidencias simuladas para «{busquedaBgg.trim()}».
					</p>
				{/if}
			</fieldset>
		{/if}

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<FormField label="Nombre del juego" htmlFor="juego-nombre" error={errores.nombre}>
				<input
					id="juego-nombre"
					type="text"
					bind:value={nombre}
					onblur={() => marcarTocado('nombre')}
					placeholder="Catan"
					aria-invalid={errores.nombre !== null}
					aria-describedby={errores.nombre ? 'juego-nombre-error' : undefined}
					class={errores.nombre ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Tipo" htmlFor="juego-tipo" error={errores.tipo}>
				<div class="[&>div]:w-full">
					<Dropdown
						items={itemsTipo}
						value={tipo === '' ? null : tipo}
						onchange={(valor) => {
							tipo = valor;
							marcarTocado('tipo');
						}}
						placeholder="Seleccionar tipo"
					/>
				</div>
			</FormField>
		</div>

		{#if tipo === 'Expansión'}
			<FormField label="Juego base" htmlFor="juego-base" error={errores.base}>
				<div class="[&>div]:w-full">
					<Dropdown
						items={itemsBase}
						value={baseSeleccion === '' ? null : baseSeleccion}
						onchange={(valor) => {
							baseSeleccion = valor;
							marcarTocado('base');
						}}
						placeholder="Seleccionar juego base"
					/>
				</div>
			</FormField>
		{/if}

		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<FormField label="Edad mín." htmlFor="juego-edad" error={errores.edad}>
				<input
					id="juego-edad"
					type="text"
					inputmode="numeric"
					bind:value={edad}
					onblur={() => marcarTocado('edad')}
					placeholder="—"
					aria-invalid={errores.edad !== null}
					aria-describedby={errores.edad ? 'juego-edad-error' : undefined}
					class={errores.edad ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Jug. mín." htmlFor="juego-jmin" error={errores.jugadoresMin}>
				<input
					id="juego-jmin"
					type="text"
					inputmode="numeric"
					bind:value={jugadoresMin}
					onblur={() => marcarTocado('jugadoresMin')}
					placeholder="—"
					aria-invalid={errores.jugadoresMin !== null}
					aria-describedby={errores.jugadoresMin ? 'juego-jmin-error' : undefined}
					class={errores.jugadoresMin ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Jug. máx." htmlFor="juego-jmax" error={errores.jugadoresMax}>
				<input
					id="juego-jmax"
					type="text"
					inputmode="numeric"
					bind:value={jugadoresMax}
					onblur={() => marcarTocado('jugadoresMax')}
					placeholder="—"
					aria-invalid={errores.jugadoresMax !== null}
					aria-describedby={errores.jugadoresMax ? 'juego-jmax-error' : undefined}
					class={errores.jugadoresMax ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Duración (min)" htmlFor="juego-duracion" error={errores.duracion}>
				<input
					id="juego-duracion"
					type="text"
					inputmode="numeric"
					bind:value={duracion}
					onblur={() => marcarTocado('duracion')}
					placeholder="—"
					aria-invalid={errores.duracion !== null}
					aria-describedby={errores.duracion ? 'juego-duracion-error' : undefined}
					class={errores.duracion ? claseInputInvalido : claseInputValido}
				/>
			</FormField>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<FormField label="Calificación (0–10)" htmlFor="juego-calif" error={errores.calificacion}>
				<input
					id="juego-calif"
					type="text"
					inputmode="decimal"
					bind:value={calificacion}
					onblur={() => marcarTocado('calificacion')}
					placeholder="—"
					aria-invalid={errores.calificacion !== null}
					aria-describedby={errores.calificacion ? 'juego-calif-error' : undefined}
					class={errores.calificacion ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Dificultad" htmlFor="juego-dificultad">
				<div class="[&>div]:w-full">
					<Dropdown
						items={itemsDificultad}
						value={dificultad === '' ? null : dificultad}
						onchange={(valor) => {
							dificultad = valor;
						}}
						placeholder="Sin informar"
					/>
				</div>
			</FormField>
		</div>

		<FormField label="Imagen (ruta o URL)" htmlFor="juego-imagen">
			<input
				id="juego-imagen"
				type="text"
				bind:value={pathImagen}
				placeholder="/ludoteca/catan.jpg"
				class={claseInputValido}
			/>
		</FormField>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<FormField label="Manual (URL)" htmlFor="juego-manual" error={errores.manual}>
				<input
					id="juego-manual"
					type="url"
					bind:value={manual}
					onblur={() => marcarTocado('manual')}
					placeholder="https://…"
					aria-invalid={errores.manual !== null}
					aria-describedby={errores.manual ? 'juego-manual-error' : undefined}
					class={errores.manual ? claseInputInvalido : claseInputValido}
				/>
			</FormField>

			<FormField label="Video (URL)" htmlFor="juego-video" error={errores.video}>
				<input
					id="juego-video"
					type="url"
					bind:value={video}
					onblur={() => marcarTocado('video')}
					placeholder="https://…"
					aria-invalid={errores.video !== null}
					aria-describedby={errores.video ? 'juego-video-error' : undefined}
					class={errores.video ? claseInputInvalido : claseInputValido}
				/>
			</FormField>
		</div>

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
				{esEdicion ? 'Guardar cambios' : 'Crear juego'}
			</button>
		</div>
	</form>
</Modal>
