<script lang="ts">
	import Catalog from '$lib/components/catalog/Catalog.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SiteHeader />
<ThemeToggle />

<main>
	<Catalog paginaInicial={data.catalogoInicial} errorInicial={data.errorCatalogo} />
</main>

<SiteFooter />
