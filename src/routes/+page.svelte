<script lang="ts">
	import Faq from '$lib/components/Faq.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Nosotros from '$lib/components/Nosotros.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
</script>

<SiteHeader />

<main>
	<Hero />
	<Nosotros />
	<Faq />
</main>

<SiteFooter />
