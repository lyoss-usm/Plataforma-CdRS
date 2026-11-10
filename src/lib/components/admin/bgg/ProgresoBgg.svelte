<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/icons';
	import type { EstadoPaso, PasoProgreso } from '$lib/bgg/consultaBgg.svelte';
	import type { BggBusquedaRespuesta, BggFichaRespuesta } from '$lib/schemas/bgg';

	interface Props {
		pasos: PasoProgreso[];
		origenBusqueda?: BggBusquedaRespuesta['origen'] | null;
		origenFicha?: BggFichaRespuesta['origen'] | null;
		caratulaFallida?: boolean;
		error?: string | null;
		onReintentar?: () => void;
	}

	let {
		pasos,
		origenBusqueda = null,
		origenFicha = null,
		caratulaFallida = false,
		error = null,
		onReintentar
	}: Props = $props();

	const icono: Record<EstadoPaso, IconName> = {
		pendiente: 'chevron-right',
		'en-curso': 'loader-circle',
		hecho: 'check',
		omitido: 'info',
		error: 'circle-alert'
	};
	const color: Record<EstadoPaso, string> = {
		pendiente: 'text-on-surface-variant/50',
		'en-curso': 'text-primary',
		hecho: 'text-primary',
		omitido: 'text-on-surface-variant',
		error: 'text-error'
	};
	const lector: Record<EstadoPaso, string> = {
		pendiente: '(pendiente)',
		'en-curso': '(en curso)',
		hecho: '(listo)',
		omitido: '(omitido)',
		error: '(falló)'
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

{#if pasos.length > 0}
	<div class="flex flex-col gap-3" aria-live="polite" aria-atomic="false">
		<ol class="flex flex-col gap-1.5">
			{#each pasos as paso (paso.clave)}
				<li class="text-body-sm flex items-center gap-2 {color[paso.estado]}">
					<Icon
						name={icono[paso.estado]}
						class="h-4 w-4 shrink-0 {paso.estado === 'en-curso' ? 'animate-spin' : ''}"
					/>
					<span>{paso.etiqueta}</span>
					<span class="sr-only">{lector[paso.estado]}</span>
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
