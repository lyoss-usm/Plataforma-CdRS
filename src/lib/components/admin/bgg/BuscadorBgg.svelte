<script lang="ts">
	import FormField from '$lib/components/admin/primitives/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { ConsultaBgg } from '$lib/bgg/consultaBgg.svelte';
	import type { BggFichaRespuesta, BggSugerencia } from '$lib/schemas/bgg';
	import ProgresoBgg from './ProgresoBgg.svelte';

	interface Props {
		/** Se llama con la ficha elegida (el formulario de #19 la usa para autocompletar). */
		onElegir: (respuesta: BggFichaRespuesta) => void;
	}

	let { onElegir }: Props = $props();

	const consulta = new ConsultaBgg();
	let elegido = $state<number | null>(null);

	async function elegir(sugerencia: BggSugerencia) {
		elegido = sugerencia.idBgg;
		const respuesta = await consulta.seleccionar(sugerencia);
		if (respuesta) onElegir(respuesta);
	}

	const sugerenciaAyuda = $derived(
		`Escribe al menos ${consulta.largoMinimo} caracteres. Con "Buscar directo en BGG" se omite la base local.`
	);
</script>

<div class="flex flex-col gap-4">
	<FormField label="Buscar juego" htmlFor="bgg-busqueda" hint={sugerenciaAyuda}>
		<input
			id="bgg-busqueda"
			type="search"
			bind:value={consulta.consulta}
			oninput={() => consulta.programarBusqueda()}
			placeholder="p. ej. Catan"
			autocomplete="off"
			spellcheck="false"
			enterkeyhint="search"
			class="w-full rounded-base border border-glass-border bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface transition outline-none placeholder:text-on-surface-variant/60 focus:border-primary/50"
		/>
	</FormField>

	<label class="text-body-sm flex cursor-pointer items-center gap-2 text-on-surface-variant">
		<input
			type="checkbox"
			bind:checked={consulta.soloBgg}
			onchange={() => consulta.programarBusqueda()}
			class="h-4 w-4 accent-primary"
		/>
		Buscar directo en BGG
	</label>

	<ProgresoBgg
		fase={consulta.fase}
		soloBgg={consulta.soloBgg}
		origenBusqueda={consulta.origenBusqueda}
		origenFicha={consulta.respuesta?.origen ?? null}
		caratulaFallida={consulta.caratulaFallida}
		error={consulta.error}
		onReintentar={() => consulta.reintentar()}
	/>

	{#if consulta.resultados.length > 0}
		<ul
			class="flex flex-col divide-y divide-outline-variant/40 rounded-base glass-border surface-level-1"
		>
			{#each consulta.resultados as r (r.idBgg)}
				<li>
					<button
						type="button"
						onclick={() => elegir(r)}
						disabled={consulta.ocupado}
						aria-pressed={elegido === r.idBgg}
						class="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-primary/10"
					>
						<span class="flex flex-col">
							<span class="text-body-md text-on-surface">{r.nombre}</span>
							<span class="text-body-sm text-on-surface-variant">
								{r.tipo ?? 'Tipo desconocido'}{r.anio ? ` · ${r.anio}` : ''}
							</span>
						</span>
						<span class="flex shrink-0 items-center gap-2 text-label-md text-on-surface-variant">
							{#if r.idJuego}
								<Icon name="check" class="h-4 w-4 text-primary" />
								En el catálogo
							{:else if r.enCache}
								Consultado antes
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if consulta.fase === 'listo' && consulta.origenBusqueda && consulta.origenBusqueda !== 'local-sin-bgg' && !consulta.respuesta}
		<p class="text-body-sm text-on-surface-variant">
			Sin resultados para «{consulta.consulta.trim()}».
		</p>
	{/if}

	{#if consulta.respuesta}
		{@const f = consulta.respuesta.ficha}
		<dl
			class="text-body-sm grid grid-cols-2 gap-x-4 gap-y-2 rounded-base surface-level-2 glass-border p-3 sm:grid-cols-3"
			aria-label="Ficha de {f.nombreJuego}"
		>
			<div class="col-span-full">
				<dt class="sr-only">Nombre</dt>
				<dd class="text-body-md font-medium text-on-surface">{f.nombreJuego} · {f.tipo}</dd>
			</div>
			{#each [['Jugadores', f.jugadoresMin && f.jugadoresMax ? `${f.jugadoresMin}–${f.jugadoresMax}` : null], ['Duración', f.duracion ? `${f.duracion} min` : null], ['Edad mínima', f.edadMinima ? `${f.edadMinima}+` : null], ['Calificación', f.calificacion?.toString() ?? null], ['Dificultad', f.dificultad]] as [etiqueta, valor] (etiqueta)}
				<div>
					<dt class="text-label-md text-on-surface-variant">{etiqueta}</dt>
					<dd class="text-on-surface">{valor ?? '—'}</dd>
				</div>
			{/each}
			{#if consulta.respuesta.caratula.urlPublica}
				<div class="col-span-full">
					<img
						src={consulta.respuesta.caratula.urlPublica}
						alt="Carátula de {f.nombreJuego}"
						class="h-32 w-auto rounded-base"
					/>
				</div>
			{/if}
		</dl>
	{/if}
</div>
