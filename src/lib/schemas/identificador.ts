/** Dígito verificador por módulo 11. El RUT y el ROL USM usan el mismo algoritmo. */
export function calcularDigitoVerificador(numero: string): string {
	let suma = 0;
	let multiplicador = 2;

	for (let indice = numero.length - 1; indice >= 0; indice -= 1) {
		suma += Number(numero[indice]) * multiplicador;
		multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
	}

	const resto = suma % 11;

	if (resto === 0) {
		return '0';
	}

	if (resto === 1) {
		return 'K';
	}

	return String(11 - resto);
}

/** Largo máximo (dígitos + verificador, sin guion) de cada identificador. */
export const LARGO_RUT = 9;
export const LARGO_ROL = 10;

/**
 * Formato mientras se escribe: solo dígitos y `K` final, con el guion antes del verificador
 * (`12345678-9`). Quita puntos, espacios y cualquier otro carácter.
 */
export function formatearIdentificador(valor: string, largoMaximo?: number): string {
	let limpio = valor.toUpperCase().replace(/[^0-9K]/g, '');

	if (largoMaximo !== undefined) {
		limpio = limpio.slice(0, largoMaximo);
	}

	if (limpio.length <= 1) {
		return limpio;
	}

	const digitoVerificador = limpio.at(-1)!;
	const numero = limpio.slice(0, -1).replaceAll('K', '');

	return `${numero}-${digitoVerificador}`;
}

const formatoRol = /^(\d{9})-?([\dk])$/i;

/** Mensaje de error del ROL (9 dígitos + verificador válido), o `null` si es correcto. */
export function errorRol(entrada: string): string | null {
	const coincidencia = formatoRol.exec(entrada.trim());

	if (!coincidencia) {
		return 'Formato inválido. Usa el formato 202012345-4.';
	}

	return calcularDigitoVerificador(coincidencia[1]) === coincidencia[2].toUpperCase()
		? null
		: 'El dígito verificador del ROL no es válido.';
}

/**
 * ROL USM: 9 dígitos + dígito verificador válido, con o sin guion (`202012345-4` o `2020123454`).
 * Devuelve el rol sin verificador, que es lo que guarda `Sansano.rolSansano`.
 */
export function parsearRol(entrada: string): number | null {
	if (errorRol(entrada) !== null) {
		return null;
	}

	return Number(formatoRol.exec(entrada.trim())![1]);
}

/** El teléfono se guarda sin el prefijo `+56 9`: solo los 8 dígitos restantes. */
export const TELEFONO_DIGITOS = 8;
export const TELEFONO_PREFIJO = '+56 9';

/**
 * Deja solo dígitos y corta a los 8 del teléfono. Si se pega el número completo
 * (`+56 9 1234 5678`) se descarta el prefijo; el caso se limita a 11 dígitos para no tocar lo que
 * se escribe a mano.
 */
export function normalizarTelefono(valor: string): string {
	let digitos = valor.replace(/\D/g, '');

	if (digitos.length === 11 && digitos.startsWith('569')) {
		digitos = digitos.slice(3);
	}

	return digitos.slice(0, TELEFONO_DIGITOS);
}

/** `12345678` → `+56 9 1234 5678`. */
export function formatearTelefono(telefono: number): string {
	const digitos = String(telefono).padStart(TELEFONO_DIGITOS, '0');

	return `${TELEFONO_PREFIJO} ${digitos.slice(0, 4)} ${digitos.slice(4)}`;
}
