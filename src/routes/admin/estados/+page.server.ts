import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { dev } from '$app/environment';

export function load() {
	if (!dev) {
		throw redirect(307, resolve('/admin'));
	}
}
