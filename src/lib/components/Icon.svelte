<script lang="ts">
	import {
		Ban,
		Box,
		Boxes,
		Camera,
		Check,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		CircleAlert,
		Download,
		FileDown,
		Filter,
		Globe,
		House,
		Info,
		Pencil,
		Plus,
		QrCode,
		RefreshCw,
		ScanLine,
		Search,
		Shapes,
		ShieldCheck,
		Trash2,
		UserPlus,
		Users,
		X
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { IconName } from '$lib/icons';

	const icons: Record<IconName, Component> = {
		ban: Ban,
		box: Box,
		boxes: Boxes,
		camera: Camera,
		check: Check,
		'chevron-down': ChevronDown,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,
		'circle-alert': CircleAlert,
		download: Download,
		'file-down': FileDown,
		filter: Filter,
		globe: Globe,
		home: House,
		info: Info,
		pencil: Pencil,
		plus: Plus,
		'qr-code': QrCode,
		'refresh-cw': RefreshCw,
		'scan-line': ScanLine,
		search: Search,
		shapes: Shapes,
		'shield-check': ShieldCheck,
		'trash-2': Trash2,
		'user-plus': UserPlus,
		users: Users,
		x: X
	};

	let {
		name,
		strokeWidth = 1.8,
		class: className = ''
	}: { name: IconName; strokeWidth?: number; class?: string } = $props();

	const IconComponent = $derived(icons[name]);
</script>

<IconComponent class={className} {strokeWidth} aria-hidden="true" />
