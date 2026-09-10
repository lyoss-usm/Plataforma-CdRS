<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Faq from '$lib/components/Faq.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Nosotros from '$lib/components/Nosotros.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SiteHeader />

<main>
	<Hero />
	<Catalog paginaInicial={data.catalogoInicial} errorInicial={data.errorCatalogo} />
	<Nosotros />
	<Faq />
</main>

<SiteFooter />
