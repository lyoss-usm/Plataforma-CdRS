<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { formatearIdentificador } from '$lib/schemas';

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'oninput'> {
		value: string;
		/** Dígitos + verificador, sin contar el guion (`LARGO_RUT` o `LARGO_ROL`). */
		largoMaximo: number;
		oninput?: () => void;
	}

	let { value = $bindable(''), largoMaximo, oninput, ...resto }: Props = $props();

	// Escribe solo dígitos (y `K` final) y pone el guion antes del verificador.
	function alEscribir(evento: Event & { currentTarget: HTMLInputElement }) {
		value = formatearIdentificador(evento.currentTarget.value, largoMaximo);
		evento.currentTarget.value = value;
		oninput?.();
	}
</script>

<input
	type="text"
	inputmode="numeric"
	autocomplete="off"
	spellcheck="false"
	{...resto}
	{value}
	oninput={alEscribir}
/>
