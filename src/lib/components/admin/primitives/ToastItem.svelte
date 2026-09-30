<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import {
		notificaciones,
		type Notificacion,
		type TipoNotificacion
	} from '$lib/stores/notificaciones.svelte';
	import type { IconName } from '$lib/icons';

	let { n }: { n: Notificacion } = $props();

	const estilosTipo: Record<TipoNotificacion, string> = {
		success: 'border-primary/50 text-primary',
		info: 'border-secondary/50 text-secondary',
		error: 'border-error/60 text-error',
		neutral: 'border-glass-border text-on-surface-variant'
	};

	const iconosTipo: Record<TipoNotificacion, IconName> = {
		success: 'check',
		info: 'info',
		error: 'circle-alert',
		neutral: 'info'
	};

	let timer: ReturnType<typeof setTimeout> | undefined;
	let restante = 0;
	let inicio = Date.now();

	function arrancar() {
		if (timer) {
			clearTimeout(timer);
		}
		inicio = Date.now();
		timer = setTimeout(() => notificaciones.descartar(n.id), restante);
	}

	function pausar() {
		if (!timer) {
			return;
		}
		restante -= Date.now() - inicio;
		clearTimeout(timer);
		timer = undefined;
	}

	$effect(() => {
		restante = n.duracion;
		arrancar();
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	});
</script>

<div
	class="pointer-events-auto flex items-start gap-2.5 rounded-base border bg-black/45 p-4 shadow-2xl backdrop-blur-2xl {estilosTipo[
		n.tipo
	]}"
	role={n.tipo === 'error' ? 'alert' : 'status'}
	transition:fly={{ y: 12, duration: 180 }}
	onpointerenter={pausar}
	onpointerleave={arrancar}
	onfocusin={pausar}
	onfocusout={arrancar}
>
	<Icon name={iconosTipo[n.tipo]} class="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
	<div class="min-w-0 flex-1">
		<p class="text-body-md font-semibold">{n.titulo}</p>
		{#if n.mensaje}
			<p class="text-body-sm mt-0.5 opacity-85">{n.mensaje}</p>
		{/if}
	</div>
	<button
		type="button"
		onclick={() => notificaciones.descartar(n.id)}
		aria-label="Cerrar notificación"
		class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-base bg-black/25 text-current opacity-70 transition hover:bg-black/40 hover:opacity-100"
	>
		<Icon name="x" class="h-4 w-4" strokeWidth={1.8} />
	</button>
</div>
