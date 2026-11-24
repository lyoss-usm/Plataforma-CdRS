<script lang="ts">
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import InventarioPanel from '$lib/components/admin/inventario/InventarioPanel.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SectionPage title="Inventario" description="Catálogo físico y juegos externos con dueño">
	<InventarioPanel datos={data.inventario} />
</SectionPage>
