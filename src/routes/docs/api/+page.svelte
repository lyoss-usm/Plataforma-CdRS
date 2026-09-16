<script lang="ts">
	import { onMount } from 'svelte';
	import 'swagger-ui/dist/swagger-ui.css';

	let loadError = $state('');

	onMount(() => {
		let active = true;

		void import('swagger-ui')
			.then(({ default: SwaggerUI }) => {
				if (!active) return;

				SwaggerUI({
					dom_id: '#swagger-ui',
					url: '/openapi.yaml',
					deepLinking: true,
					displayRequestDuration: true,
					validatorUrl: 'none'
				});
			})
			.catch((error: unknown) => {
				console.error('No se pudo iniciar Swagger UI:', error);

				if (active) {
					loadError = 'No se pudo cargar la documentación de la API.';
				}
			});

		return () => {
			active = false;
		};
	});
</script>

<svelte:head>
	<title>API | Club de Rol Sansano</title>
	<meta
		name="description"
		content="Documentación interactiva de la API de la Plataforma Club de Rol Sansano"
	/>
</svelte:head>

<div class="swagger-page">
	{#if loadError}
		<p class="load-error" role="alert">{loadError}</p>
	{/if}

	<div id="swagger-ui"></div>
</div>

<style>
	.swagger-page {
		min-height: 100vh;
		background: white;
	}

	.load-error {
		margin: 0;
		padding: 2rem;
		color: #b91c1c;
		font-family: system-ui, sans-serif;
	}
</style>