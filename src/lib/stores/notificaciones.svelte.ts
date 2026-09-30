export type TipoNotificacion = 'success' | 'info' | 'error' | 'neutral';

export interface Notificacion {
	id: number;
	tipo: TipoNotificacion;
	titulo: string;
	mensaje: string | null;
	duracion: number;
}

const DURACION_DEFAULT = 4000;

class Notificaciones {
	items = $state<Notificacion[]>([]);
	private contador = 0;

	mostrar(
		tipo: TipoNotificacion,
		titulo: string,
		mensaje: string | null = null,
		opciones: { duracion?: number } = {}
	) {
		this.contador += 1;
		this.items.push({
			id: this.contador,
			tipo,
			titulo,
			mensaje,
			duracion: opciones.duracion ?? DURACION_DEFAULT
		});
	}

	descartar(id: number) {
		this.items = this.items.filter((n) => n.id !== id);
	}
}

export const notificaciones = new Notificaciones();
