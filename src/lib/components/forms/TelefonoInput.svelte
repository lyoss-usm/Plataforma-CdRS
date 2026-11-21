<script lang="ts">
	import { normalizarTelefono, TELEFONO_PREFIJO } from '$lib/schemas';

	interface Props {
		id: string;
		name?: string;
		value: string;
		/** Clases del `<input>` (las mismas que el resto de inputs del formulario). */
		inputClass: string;
		invalid?: boolean;
		describedby?: string;
		oninput?: () => void;
		onblur?: () => void;
	}

	let {
		id,
		name = 'telefono',
		value = $bindable(''),
		inputClass,
		invalid = false,
		describedby,
		oninput,
		onblur
	}: Props = $props();

	function alEscribir(evento: Event & { currentTarget: HTMLInputElement }) {
		value = normalizarTelefono(evento.currentTarget.value);
		evento.currentTarget.value = value;
		oninput?.();
	}
</script>

<div class="flex">
	<span
		class="flex items-center rounded-l-base border border-r-0 border-glass-border bg-surface-container px-3 font-mono text-body-md whitespace-nowrap text-on-surface-variant"
		>{TELEFONO_PREFIJO}</span
	>
	<input
		{id}
		{name}
		type="tel"
		inputmode="numeric"
		autocomplete="tel-national"
		{value}
		oninput={alEscribir}
		{onblur}
		placeholder="1234 5678"
		aria-label={`Teléfono: ocho dígitos después de ${TELEFONO_PREFIJO}`}
		aria-invalid={invalid}
		aria-describedby={describedby}
		class={`${inputClass} min-w-0 rounded-l-none`}
	/>
</div>
