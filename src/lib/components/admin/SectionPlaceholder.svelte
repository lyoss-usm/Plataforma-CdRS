<script lang="ts">
	let { description = 'Sección en construcción. Esta vista aún no tiene maqueta.' } = $props();
</script>

<div class="flex items-center justify-center px-4 py-10">
	<div
		class="flex w-full max-w-2xl flex-col items-center gap-4 rounded-base border border-glass-border surface-level-1 px-8 py-14 text-center"
	>
		<img
			src="/rolo/rolo_corriendo_apurado_fix.png"
			alt="Rolo corriendo con una sección en construcción"
			class="w-32 select-none"
			width="128"
			height="128"
		/>
		<p class="max-w-md text-body-md text-on-surface-variant">{description}</p>
	</div>
</div>
