import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

// `pnpm dev:red` (DEV_HTTPS=1): HTTPS con certificado autofirmado para probar desde el celular en la
// misma red; la cámara del cajero solo funciona en HTTPS o localhost (README § Probar en el celular).
const https = process.env.DEV_HTTPS === '1';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), ...(https ? [basicSsl({ name: 'cdrs-dev' })] : [])]
});
