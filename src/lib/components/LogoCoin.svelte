<script lang="ts">
	import { Canvas } from '@threlte/core';
	import LogoCoinScene from './LogoCoinScene.svelte';
</script>

<div class="h-full w-full" aria-hidden="true">
	<Canvas renderMode="always" dpr={[1, 2]}>
		<LogoCoinScene />
	</Canvas>
</div>
