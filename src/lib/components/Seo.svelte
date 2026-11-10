<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { landing } from '$lib/data/landing';

	interface Props {
		titulo?: string;
		descripcion?: string;
		/** Ruta de la página, para la URL canónica (p. ej. `/catalogo`). */
		ruta?: string;
	}

	const { meta } = landing;
	let { titulo = meta.titulo, descripcion = meta.descripcion, ruta = '/' }: Props = $props();

	// Discord y WhatsApp exigen URLs absolutas: sin `PUBLIC_SITE_URL` solo se emiten los textos.
	const sitio = (env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
	const url = $derived(sitio ? `${sitio}${ruta}` : '');
	const imagen = sitio ? `${sitio}${meta.imagenOg}` : '';
</script>

<svelte:head>
	<title>{titulo}</title>
	<meta name="description" content={descripcion} />
	{#if url}
		<link rel="canonical" href={url} />
		<meta property="og:url" content={url} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={meta.titulo} />
	<meta property="og:locale" content="es_CL" />
	<meta property="og:title" content={titulo} />
	<meta property="og:description" content={descripcion} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={titulo} />
	<meta name="twitter:description" content={descripcion} />
	{#if imagen}
		<meta property="og:image" content={imagen} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content={meta.imagenOgAlt} />
		<meta name="twitter:image" content={imagen} />
	{/if}
</svelte:head>
