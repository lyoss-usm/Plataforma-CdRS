<script lang="ts">
	import type { Action } from 'svelte/action';
	import Icon from '$lib/components/Icon.svelte';

	interface DropdownItem {
		value: string;
		label: string;
	}

	interface Props {
		items: DropdownItem[];
		value?: string | null;
		onchange: (value: string) => void;
		placeholder?: string;
		label?: string;
		class?: string;
	}

	let {
		items,
		value = null,
		onchange,
		placeholder = 'Seleccionar',
		label,
		class: className = ''
	}: Props = $props();

	let abierto = $state(false);
	let boton = $state<HTMLButtonElement | null>(null);
	let ancla = $state<{ top: number; left: number; width: number } | null>(null);

	const seleccion = $derived(items.find((item) => item.value === value) ?? null);

	const portal: Action<HTMLElement> = (nodo) => {
		document.body.appendChild(nodo);
	};

	const cerrarFuera: Action<HTMLElement> = (nodo) => {
		const alClic = (evento: MouseEvent) => {
			const objetivo = evento.target as Node;
			if (boton && (objetivo === boton || boton.contains(objetivo))) return;
			if (!nodo.contains(objetivo)) abierto = false;
		};
		const alRellenar = () => (abierto = false);

		document.addEventListener('click', alClic);
		window.addEventListener('scroll', alRellenar, { passive: true });
		window.addEventListener('resize', alRellenar);

		return {
			destroy() {
				document.removeEventListener('click', alClic);
				window.removeEventListener('scroll', alRellenar);
				window.removeEventListener('resize', alRellenar);
			}
		};
	};

	function alternar() {
		if (abierto) {
			abierto = false;
			return;
		}

		if (boton) {
			const rect = boton.getBoundingClientRect();
			ancla = { top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 208) };
		}
		abierto = true;
	}

	function elegir(valor: string) {
		onchange(valor);
		abierto = false;
	}
</script>

<div class="relative {className}">
	{#if label}
		<span
			class="mb-1 block font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
		>
			{label}
		</span>
	{/if}

	<button
		type="button"
		bind:this={boton}
		onclick={alternar}
		aria-haspopup="listbox"
		aria-expanded={abierto}
		class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-base border border-glass-border bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface transition outline-none focus:border-primary/50 {abierto
			? 'border-primary/50'
			: ''}"
	>
		<span class={seleccion ? 'text-on-surface' : 'text-on-surface-variant/70'}>
			{seleccion?.label ?? placeholder}
		</span>
		<Icon
			name="chevron-down"
			class="h-4 w-4 shrink-0 text-on-surface-variant transition {abierto ? 'rotate-180' : ''}"
		/>
	</button>
</div>

{#if abierto && ancla}
	<div
		use:portal
		use:cerrarFuera
		style="position: fixed; top: {ancla.top}px; left: {ancla.left}px; width: {ancla.width}px; z-index: 60;"
		class="overflow-hidden rounded-base border border-glass-border surface-level-1 p-1 shadow-lg"
		role="listbox"
	>
		{#each items as item (item.value)}
			<button
				type="button"
				role="option"
				aria-selected={item.value === value}
				onclick={() => elegir(item.value)}
				class="w-full cursor-pointer rounded-base px-3 py-2 text-left text-body-md transition {item.value ===
				value
					? 'bg-primary/10 text-primary'
					: 'text-on-surface hover:bg-white/5 hover:text-on-surface'}"
			>
				{item.label}
			</button>
		{/each}
	</div>
{/if}

<svelte:window
	onkeydown={(evento) => {
		if (evento.key === 'Escape') abierto = false;
	}}
/>
