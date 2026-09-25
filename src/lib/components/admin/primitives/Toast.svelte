<script lang="ts">
	import ToastItem from './ToastItem.svelte';
	import { notificaciones } from '$lib/stores/notificaciones.svelte';
</script>

<div class="pointer-events-none fixed top-20 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
	{#each notificaciones.items as n (n.id)}
		<ToastItem {n} />
	{/each}
</div>
