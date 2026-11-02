<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/icons';
	import type { FaseBgg } from '$lib/bgg/consultaBgg.svelte';
	import type { BggBusquedaRespuesta, BggFichaRespuesta } from '$lib/schemas/bgg';

	interface Props {
		fase: FaseBgg;
		/** Con "Buscar directo en BGG" no hay paso local. */
		soloBgg?: boolean;
		origenBusqueda?: BggBusquedaRespuesta['origen'] | null;
		origenFicha?: BggFichaRespuesta['origen'] | null;
		caratulaFallida?: boolean;
		error?: string | null;
		onReintentar?: () => void;
	}

	let {
		fase,
		soloBgg = false,
		origenBusqueda = null,
		origenFicha = null,
		caratulaFallida = false,
		error = null,
		onReintentar
	}: Props = $props();

	type Paso = { fase: FaseBgg; etiqueta: string };
	const pasos = $derived<Paso[]>([
		...(soloBgg
			? []
			: [{ fase: 'buscando-local' as const, etiqueta: 'Buscando en la base local' }]),
		{ fase: 'consultando-bgg', etiqueta: 'Consultando BoardGameGeek' },
		{ fase: 'procesando-caratula', etiqueta: 'Procesando la carátula' }
	]);

	const orden: FaseBgg[] = ['buscando-local', 'consultando-bgg', 'procesando-caratula', 'listo'];

	type Estado = 'pendiente' | 'en-curso' | 'hecho' | 'error';
	function estadoDe(paso: Paso): Estado {
		if (fase === 'inactivo') return 'pendiente';
		if (fase === 'error') return paso.fase === 'consultando-bgg' ? 'error' : 'pendiente';
		const actual = orden.indexOf(fase);
		const propio = orden.indexOf(paso.fase);
		if (fase === 'listo' || propio < actual) return 'hecho';
		return propio === actual ? 'en-curso' : 'pendiente';
	}

	const icono: Record<Estado, IconName> = {
		pendiente: 'info',
		'en-curso': 'loader-circle',
		hecho: 'check',
		error: 'circle-alert'
	};
	const color: Record<Estado, string> = {
		pendiente: 'text-on-surface-variant/50',
		'en-curso': 'text-primary',
		hecho: 'text-primary',
		error: 'text-error'
	};

	const aviso = $derived.by(() => {
		if (origenFicha === 'cache-desactualizada') {
			return 'BGG no respondió: se muestran datos guardados que podrían estar desactualizados.';
		}
		if (origenBusqueda === 'local-sin-bgg') {
			return 'No hay resultados locales y BGG no respondió. Reintenta en unos segundos.';
		}
		if (caratulaFallida) {
			return 'No se pudo procesar la carátula. Puedes continuar con la ficha y reintentar después.';
		}
		return null;
	});
</script>

{#if fase !== 'inactivo'}
	<div class="flex flex-col gap-3" aria-live="polite" aria-atomic="false">
		<ol class="flex flex-col gap-1.5">
			{#each pasos as paso (paso.fase)}
				{@const estado = estadoDe(paso)}
				<li class="text-body-sm flex items-center gap-2 {color[estado]}">
					<Icon
						name={icono[estado]}
						class="h-4 w-4 shrink-0 {estado === 'en-curso' ? 'animate-spin' : ''}"
					/>
					<span>{paso.etiqueta}</span>
					<span class="sr-only">
						{estado === 'hecho'
							? '(listo)'
							: estado === 'en-curso'
								? '(en curso)'
								: estado === 'error'
									? '(falló)'
									: '(pendiente)'}
					</span>
				</li>
			{/each}
		</ol>

		{#if error}
			<div
				class="text-body-sm flex items-start justify-between gap-3 rounded-base border border-error/40 bg-error/10 px-3 py-2 text-error"
				role="alert"
			>
				<span>{error}</span>
				{#if onReintentar}
					<button
						type="button"
						onclick={onReintentar}
						class="flex shrink-0 cursor-pointer items-center gap-1 font-medium underline-offset-2 hover:underline"
					>
						<Icon name="refresh-cw" class="h-4 w-4" />
						Reintentar
					</button>
				{/if}
			</div>
		{:else if aviso}
			<div
				class="text-body-sm flex items-start justify-between gap-3 rounded-base border border-tertiary-container/40 bg-tertiary-container/10 px-3 py-2 text-tertiary"
				role="status"
			>
				<span>{aviso}</span>
				{#if onReintentar}
					<button
						type="button"
						onclick={onReintentar}
						class="flex shrink-0 cursor-pointer items-center gap-1 font-medium underline-offset-2 hover:underline"
					>
						<Icon name="refresh-cw" class="h-4 w-4" />
						Reintentar
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
