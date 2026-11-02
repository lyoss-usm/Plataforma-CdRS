<script lang="ts">
	import Catalog from '$lib/components/catalog/Catalog.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	titulo="Catálogo · Club de Rol Sansano"
	descripcion="Los juegos de mesa del club: revisa qué hay disponible y pide tu préstamo."
	ruta="/catalogo"
/>

<SiteHeader />
<ThemeToggle />

<main>
	<Catalog paginaInicial={data.catalogoInicial} errorInicial={data.errorCatalogo} />
</main>

<SiteFooter />
