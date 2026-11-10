<script lang="ts">
	import SectionPage from '$lib/components/admin/SectionPage.svelte';
	import CajeroPos from '$lib/components/admin/cajero/CajeroPos.svelte';
</script>

<SectionPage
	title="Préstamos"
	description="Préstamos presenciales en Juntas Masivas: se retiene un documento del solicitante (usa «Otro» si no deja ninguno)."
>
	<CajeroPos />
</SectionPage>
