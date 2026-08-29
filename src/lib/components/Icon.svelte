<script lang="ts">
	import { Box, Boxes, Download, Globe, House, Shapes, ShieldCheck, Users } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { IconName } from '$lib/icons';

	const icons: Record<IconName, Component> = {
		box: Box,
		boxes: Boxes,
		download: Download,
		globe: Globe,
		home: House,
		shapes: Shapes,
		'shield-check': ShieldCheck,
		users: Users
	};

	let {
		name,
		strokeWidth = 1.8,
		class: className = ''
	}: { name: IconName; strokeWidth?: number; class?: string } = $props();

	const IconComponent = $derived(icons[name]);
</script>

<IconComponent class={className} {strokeWidth} aria-hidden="true" />
