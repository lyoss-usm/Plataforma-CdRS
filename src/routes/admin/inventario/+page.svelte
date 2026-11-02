<script lang="ts">
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import SectionPlaceholder from '$lib/components/admin/SectionPlaceholder.svelte';
	import BuscadorBgg from '$lib/components/admin/bgg/BuscadorBgg.svelte';
</script>

<SectionPage title="Inventario" description="Catálogo físico y juegos externos con dueño">
	<SectionPlaceholder
		description="CRUD de juegos con estados de ciclo de vida, enriquecido con datos de BoardGameGeek. Esta vista aún no tiene maqueta."
	/>

	<!-- Demo del proxy BGG (#8) para probarlo con BGG_MOCK=1; #19 lo integra en el formulario real. -->
	{#if import.meta.env.DEV}
		<section class="mt-8 flex max-w-xl flex-col gap-3" aria-labelledby="demo-bgg">
			<h2
				id="demo-bgg"
				class="font-mono text-label-md tracking-wider text-on-surface-variant uppercase"
			>
				Demo · auto-completado BGG (solo dev)
			</h2>
			<BuscadorBgg onElegir={(r) => console.info('[demo-bgg] ficha elegida', r)} />
		</section>
	{/if}
</SectionPage>
