// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { StaffSesion } from '$lib/server/auth';
import type { ClienteSupabase } from '$lib/server/supabase';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Cliente con la sesión del request; sujeto a RLS. */
			supabase: ClienteSupabase;
			/** Staff autenticado (solo se resuelve en /admin/*); `null` si no es staff. */
			staff: StaffSesion | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
