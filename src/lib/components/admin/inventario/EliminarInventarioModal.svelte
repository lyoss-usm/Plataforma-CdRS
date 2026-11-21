<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/admin/primitives/Modal.svelte';

	interface Props {
		titulo: string;
		mensaje: string;
		onclose: () => void;
		onConfirmar: () => { ok: boolean; motivo: string };
	}

	let { titulo, mensaje, onclose, onConfirmar }: Props = $props();

	let error = $state<string | null>(null);

	const claseBotonSecundario =
		'cursor-pointer rounded-base border border-glass-border px-4 py-2 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface';
	const claseBotonEliminar =
		'inline-flex cursor-pointer items-center gap-2 rounded-base border border-error/50 bg-error/15 px-4 py-2 font-semibold text-error transition hover:bg-error/25';

	function confirmar() {
		const resultado = onConfirmar();

		if (!resultado.ok) {
			error = resultado.motivo;
			return;
		}

		onclose();
	}
</script>

<Modal title={titulo} size="sm" {onclose}>
	<div class="flex items-start gap-3">
		<span
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-error/50 bg-error/15"
		>
			<Icon name="trash-2" class="h-4 w-4 text-error" strokeWidth={2} />
		</span>
		<p class="text-body-md text-on-surface-variant">{mensaje}</p>
	</div>

	{#if error}
		<p
			class="text-body-sm mt-4 flex items-start gap-2 rounded-base border border-error/40 bg-error/15 p-3 text-error"
			role="alert"
		>
			<Icon name="circle-alert" class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
			<span>{error}</span>
		</p>
	{/if}

	{#snippet footer()}
		<button type="button" onclick={onclose} class={claseBotonSecundario}>Cancelar</button>
		<button type="button" onclick={confirmar} class={claseBotonEliminar}>
			<Icon name="trash-2" class="h-4 w-4" strokeWidth={2} />
			Eliminar
		</button>
	{/snippet}
</Modal>
