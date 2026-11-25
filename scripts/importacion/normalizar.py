"""Normalización de Excel y Notion para la única carga inicial del inventario.

Las decisiones A/B/E/D ya aprobadas son constantes. Este módulo no consulta la
base ni descarga datos. Prepara DTOs, valida con Zod y exporta CSV e informe.
"""

from collections import Counter
from contextlib import closing
from datetime import date, datetime, time
from itertools import zip_longest
import json
from pathlib import Path
import re
import unicodedata
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

COLUMNAS = (
    "ID", "Código", "Título", "Estado", "Situación", "Comentario",
    "Componentes", "Expansion", "Jugadores", "Tiempo", "Dificultad",
)
ALIAS_COLUMNAS = {"Código del juego": "Código", "Expansión": "Expansion"}
ESTADOS = {
    "Bodega": "En bodega", "En bodega": "En bodega", "Prestado": "Prestado",
    "Perdido": "Perdido", "Para revisar": "Para revisar",
    "Con el propietario": "Con su dueño", "Con el propietario original": "Con su dueño",
    "Con su dueño": "Con su dueño",
}
AGRUPACIONES = (
    ("A1", "Catan", ("a093840c", "be820fe2", "75525926", "25eb24dc")),
    ("A2", "Carcassonne", ("e587cd5c", "8304f9fa")),
    ("A3", "Canvas", ("ef0fdf6e", "23021fac")),
    ("A4", "Ten", ("97b34fd7", "a1d8a539")),
    ("A5", "The Mind", ("187761f4", "16ba3ac5")),
)
SEPARACIONES = (
    ("B1", "Ciudadelas Clásico / Ciudadelas", ("115ad6b1", "484f0487")),
    ("B2", "Reinos de Papel / Paper Kingdom", ("4aff5d0f", "f710bb54")),
    ("B3", "Best of Hombres Lobo / Hombres lobo (Jubilado)", ("ff622930", "ce5add37")),
)
EXPANSIONES = (
    ("E1", "fdaf785f", "a093840c"), ("E2", "95fca3c4", "a093840c"),
    ("E3", "66619b48", "a093840c"), ("E4", "02f0be7f", "a093840c"),
    ("E5", "7d0b4b42", "20e14d29"), ("E6", "3fac865f", "20e14d29"),
    ("E7", "961bd93c", "49362c61"), ("E8", "cefdb842", "49362c61"),
    ("E9", "b177edad", "cc7da83c"), ("E10", "c398af8d", "cc7da83c"),
    ("E11", "7cb26c18", "949f29fd"), ("E12", "e2b4116b", "58f78c32"),
    ("E13", "c72b33d1", "4aff5d0f"),
)
CORRECCIONES = {
    "02d135d5": ("D2", {"jugadoresMin": 2, "jugadoresMax": 8}),
    "2dda69b5": ("D2", {"jugadoresMin": 2, "jugadoresMax": 20}),
    "3d752d48": ("D3", {"jugadoresMin": 3, "jugadoresMax": 6}),
    "a385f5b0": ("D6", {"dificultad": "Difícil"}),
    "fcfad99a": ("D8", {"jugadoresMin": 1, "jugadoresMax": None}),
    "603fa358": ("D8", {"jugadoresMin": 2, "jugadoresMax": None}),
}
CAMPOS_DESCRIPTIVOS = ("edadMinima", "jugadoresMin", "jugadoresMax", "duracion", "dificultad")
REGLAS = (
    ("qr_codigo", "Se asume que el QR contiene Código, todavía sin confirmarlo mediante escaneo. Se conserva con trim y mayúsculas; no se generan IDs ni se reconstruyen desde el título."),
    ("propiedad", "Estado Con el propietario original determina esExterno=true. En otro caso, la frase No pertenece al club en Situación determina esExterno=true, sin distinguir mayúsculas ni espacios repetidos. En todos los demás casos esExterno=false; Comentario no determina la propiedad."),
    ("completitud", "La etiqueta Completo o Incompleto en Situación determina la completitud, sin distinguir mayúsculas y con punto final opcional. Sin etiqueta se asume Completo para respetar NOT NULL; Comentario no determina la completitud. Etiquetas contradictorias bloquean la exportación."),
    ("estado", "Estado es autoritativo; comentarios, situación y componentes no cambian la disponibilidad."),
    ("alcance", "Solo se importa Inventario. No se crean personas, solicitudes ni préstamos históricos; se conserva Prestado."),
    ("agrupaciones", "A1-A5 agrupan copias; B1-B3 permanecen separados. Otros títulos no se fusionan por semejanza."),
    ("fuentes", "Excel y relaciones aprobadas definen el inventario. Notion completa descriptivos vacíos con coincidencia exacta de título, tolerante a caja y espacios."),
    ("D1", "Usar el máximo del rango de duración de Excel, con o sin min; conservar el rango original."),
    ("D2", "Código Secreto Imágenes: 2-8; Pictureka! Cartas: 2-20. Se resuelve el 2-8+ con Notion."),
    ("D3", "8 Bit box: 3-6 jugadores como capacidad global; conservar las modalidades originales."),
    ("D4", "Fácil → Fácil, Media → Intermedio, Difícil → Difícil. No inferir edades desde estas etiquetas."),
    ("D5", "Catan tiene dificultad Intermedio por resolución explícita de las copias contradictorias."),
    ("D6", "Sand: Extremo se reduce a Difícil, conservando el texto original."),
    ("D7", "Edad mínima solo desde el entero positivo explícito de Notion; sin dato válido queda null."),
    ("D8", "Ricochet robots: mínimo 1; Zombie Dice: mínimo 2. Ambos con máximo null; no importar el 99 de Notion."),
    ("limite_jugadores", "El filtro actual del catálogo excluye juegos con límites parciales de jugadores; afecta D8."),
    ("limite_expansiones", "Una sola base por expansión: los requisitos entre expansiones y las bases alternativas quedan en el informe."),
    ("sin_enriquecimiento", "Sin BGG, carátulas, calificación, manual ni video; los descriptivos adicionales proceden únicamente de Notion."),
)


def _texto(value):
    """Convierte un valor a texto y elimina espacios de sus extremos.

    Args:
        value (object): Valor de origen, incluido None.

    Returns:
        str | None: Texto recortado, o None si el valor es nulo o queda vacío.
    """
    if value is None:
        return None
    return str(value).strip() or None


def _titulo(value):
    """Obtiene una clave de título para comparar Excel con Notion.

    Args:
        value (str): Título que se normalizará a Unicode NFC, con espacios
            colapsados y sin distinguir mayúsculas.

    Returns:
        str: Clave normalizada; no elimina palabras, acentos ni puntuación.
    """
    return unicodedata.normalize("NFC", " ".join(value.split())).casefold()


def _incidencia(informe, codigo, mensaje, nivel="error", **contexto):
    """Agrega un diagnóstico al contexto de preparación en memoria.

    Args:
        informe (dict): Contexto cuya lista incidencias se modifica.
        codigo (str): Identificador del diagnóstico.
        mensaje (str): Explicación que se mostrará en consola.
        nivel (str): Severidad: error, advertencia o informacion.
        **contexto: Datos adicionales para ubicar el problema en las fuentes.
    """
    informe["incidencias"].append({"nivel": nivel, "codigo": codigo, "mensaje": mensaje, **contexto})


def _errores(informe):
    """Indica si los diagnósticos registrados impiden exportar los CSV.

    Args:
        informe (dict): Contexto con la lista incidencias.

    Returns:
        bool: True si existe al menos un diagnóstico de nivel error.
    """
    return any(item["nivel"] == "error" for item in informe["incidencias"])


def _booleano(value):
    """Interpreta los booleanos y las etiquetas booleanas usadas en Excel.

    Args:
        value (object): Booleano o texto TRUE, TRUE(), FALSE o FALSE().
            El texto admite espacios externos y variaciones de mayúsculas.

    Returns:
        bool | None: Booleano interpretado, o None si el formato no se reconoce.
            Los números no se convierten a booleanos.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().upper() in {"TRUE", "TRUE()", "FALSE", "FALSE()"}:
        return value.strip().upper().startswith("TRUE")
    return None


def _original(value):
    """Prepara las fechas y horas de Excel para su representación en JSON.

    Args:
        value (object): Valor original de una celda.

    Returns:
        object: Fecha u hora en texto ISO 8601; los demás valores se conservan.
    """
    return value.isoformat() if isinstance(value, (date, datetime, time)) else value


def _completitud(situacion):
    """Resuelve la completitud desde etiquetas explícitas de Situación.

    Las etiquetas deben iniciar el texto o una oración tras punto o salto de
    línea. Admiten mayúsculas y punto final opcional. Sin etiqueta se asume
    Completo para respetar NOT NULL; Comentario no interviene.

    Args:
        situacion (str | None): Texto de la columna Situación.

    Returns:
        str: Completo o Incompleto, según la etiqueta o el valor por defecto.

    Raises:
        ValueError: El texto contiene ambas etiquetas y resulta contradictorio.
    """
    etiquetas = {
        etiqueta.casefold()
        for etiqueta in re.findall(r"(?:^|[.\r\n])\s*(incompleto|completo)\s*(?=\.|$)", situacion or "", re.IGNORECASE)
    }
    if len(etiquetas) > 1:
        raise ValueError("Situación contiene etiquetas Completo e Incompleto contradictorias.")
    if etiquetas:
        return etiquetas.pop().capitalize()
    return "Completo"


def _es_externo(estado, situacion):
    """Determina la propiedad con la prioridad aprobada para la migración.

    Args:
        estado (str): Estado de Excel antes de convertirlo al enum de destino.
        situacion (str | None): Texto donde se busca No pertenece al club,
            sin distinguir mayúsculas ni espacios repetidos.

    Returns:
        bool: True si Estado es Con el propietario original o Situación contiene
            la frase indicada; False en cualquier otro caso.
    """
    if estado == "Con el propietario original":
        return True
    return "no pertenece al club" in " ".join((situacion or "").split()).casefold()


def _leer_excel(path, informe):
    """Lee Inventario y normaliza los datos de cada caja sin ejecutar fórmulas.

    Abre el libro en modo de lectura y consulta los valores calculados guardados
    en su caché. Registra errores de estructura, identidad y dominio en informe;
    las filas con errores se omiten y los errores impiden exportar el lote.

    Args:
        path (Path): Ruta del libro AppSheet.
        informe (dict): Contexto cuya lista incidencias recibe los diagnósticos.

    Returns:
        list[dict]: Filas con identidad de origen, datos originales y campos
            normalizados del ejemplar. No lee datos de otras hojas.

    Raises:
        OSError: No se puede acceder al libro.
        BadZipFile: El archivo no contiene un contenedor XLSX válido.
        InvalidFileException: Openpyxl no admite el formato del archivo.
    """
    rows, ids, codigos = [], set(), set()
    with closing(load_workbook(path, read_only=True, data_only=False)) as formulas, closing(load_workbook(path, read_only=True, data_only=True)) as cached:
        if "Inventario" not in formulas.sheetnames:
            _incidencia(informe, "hoja_ausente", "Falta la hoja Inventario.")
            return rows
        sheet, values_sheet = formulas["Inventario"], cached["Inventario"]
        headers = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), ())
        positions = {}
        for index, header in enumerate(headers):
            name = ALIAS_COLUMNAS.get(_texto(header), _texto(header))
            if name in COLUMNAS:
                if name in positions:
                    _incidencia(informe, "cabecera_duplicada", "Una columna aparece más de una vez.", columna=name)
                positions[name] = index
        for name in COLUMNAS:
            if name not in positions:
                _incidencia(informe, "cabecera_ausente", "Falta una columna de Inventario.", columna=name)
        if _errores(informe):
            return rows
        for number, (raw, cells) in enumerate(zip_longest(sheet.iter_rows(min_row=2), values_sheet.iter_rows(min_row=2), fillvalue=()), 2):
            if not any(_texto(cell.value) is not None for cell in raw):
                continue
            values = {name: cells[index].value if index < len(cells) else None for name, index in positions.items()}
            before = len(informe["incidencias"])
            for name, index in positions.items():
                if index < len(raw) and raw[index].data_type == "f" and values[name] is None:
                    _incidencia(informe, "formula_sin_cache", "Recalcula y guarda la fórmula en Excel antes de importar.", fila=number, columna=name)
                if index < len(cells) and cells[index].data_type == "e":
                    _incidencia(informe, "error_excel", "La celda contiene un error de Excel.", fila=number, columna=name)
            for name in ("ID", "Código"):
                if not isinstance(values[name], str) or _texto(values[name]) is None:
                    _incidencia(informe, "identificador_invalido", "ID y Código deben ser texto no vacío; no se generan identidades.", fila=number, columna=name)
            origin, code = _texto(values["ID"]), _texto(values["Código"])
            code = code.upper() if code else None
            for value, seen, column in ((origin, ids, "ID"), (code, codigos, "Código")):
                if value in seen:
                    _incidencia(informe, "identificador_duplicado", "El identificador está duplicado tras normalizar.", fila=number, columna=column, valor=value)
                seen.add(value)
            title, state = _texto(values["Título"]), _texto(values["Estado"])
            expansion = _booleano(values["Expansion"])
            if title is None:
                _incidencia(informe, "titulo_ausente", "Título es obligatorio.", fila=number)
            if state not in ESTADOS:
                _incidencia(informe, "estado_desconocido", "El estado no tiene equivalencia aprobada.", fila=number, original=state)
            if expansion is None:
                _incidencia(informe, "expansion_desconocida", "Expansion debe ser TRUE o FALSE, con caché si es fórmula.", fila=number)
            if any(item["nivel"] == "error" for item in informe["incidencias"][before:]):
                continue
            comment = _texto(values["Comentario"])
            situation = _texto(values["Situación"])
            try:
                completeness = _completitud(situation)
            except ValueError as error:
                _incidencia(informe, "completitud_contradictoria", str(error), fila=number, origenId=origin)
                continue
            rows.append({
                "origenId": origin, "codigo": code, "titulo": title, "fila": number,
                "tipo": "Expansión" if expansion else "Juego base",
                "original": {key: _original(value) for key, value in values.items()},
                "ejemplar": {
                    "idEjemplar": code, "esExterno": _es_externo(state, situation),
                    "estadoCompletitud": completeness,
                    "situacion": situation, "comentarios": comment,
                    "componentes": _texto(values["Componentes"]), "estadoEjemplar": ESTADOS[state],
                },
            })
            if state == "Prestado":
                _incidencia(informe, "prestado_sin_historial", "Se conserva Prestado sin fabricar solicitudes ni préstamos.", "advertencia", fila=number, origenId=origin)
    return rows


def _leer_notion(path, informe):
    """Carga e indexa la copia local de Notion por título normalizado.

    Registra estructuras inválidas y títulos duplicados como errores. También
    incorpora al informe los metadatos de la captura que estén presentes.

    Args:
        path (Path): Ruta del JSON con una lista filas.
        informe (dict): Contexto con incidencias y metadatos fuentes.notion.

    Returns:
        dict[str, dict]: Filas de Notion indexadas por la clave de _titulo.
            Una estructura principal inválida produce un diccionario vacío.

    Raises:
        OSError: No se puede leer el archivo.
        UnicodeError: El contenido no se puede decodificar como UTF-8.
        json.JSONDecodeError: El archivo no contiene JSON válido.
    """
    snapshot = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("filas"), list):
        _incidencia(informe, "notion_invalido", "La captura de Notion debe contener una lista filas.")
        return {}
    informe["fuentes"]["notion"].update({key: snapshot[key] for key in ("fuente", "fechaConsulta", "vigencia") if key in snapshot})
    indexed = {}
    for row in snapshot["filas"]:
        if not isinstance(row, dict) or any(not isinstance(row.get(field), str) for field in ("nombre", "jugadores", "duracion", "edadMinima")) or not row["nombre"].strip():
            _incidencia(informe, "notion_invalido", "Una ficha de Notion no tiene los cuatro campos de texto esperados.")
            continue
        key = _titulo(row["nombre"])
        if key in indexed:
            _incidencia(informe, "notion_ambiguo", "Notion contiene títulos duplicados.", nombre=row["nombre"])
        indexed[key] = row
    return indexed


def _agrupar(rows, informe):
    """Agrupa las copias aprobadas y resuelve las referencias entre juegos.

    Asigna IDs consecutivos desde 1, primero a bases y luego a expansiones,
    con orden estable por el menor ID de origen de cada grupo. Las asociaciones
    incompletas, ambiguas o incompatibles se registran como errores.

    Args:
        rows (list[dict]): Filas normalizadas de Inventario.
        informe (dict): Contexto que recibe incidencias y relacionesExpansiones.

    Returns:
        tuple[list[dict], dict[str, int]]: Grupos ordenados con nombre, filas y
            referencia aprobada, y correspondencia de ID de origen a idJuego.
    """
    by_id = {row["origenId"]: row for row in rows}
    groups, assigned = [], set()
    for ref, name, origins in AGRUPACIONES:
        present = set(origins) & by_id.keys()
        if not present:
            continue
        if present != set(origins):
            _incidencia(informe, "agrupacion_incompleta", "La agrupación aprobada aparece incompleta.", referencia=ref, faltantes=sorted(set(origins) - present))
            continue
        if any(by_id[origin]["tipo"] != "Juego base" for origin in origins):
            _incidencia(informe, "agrupacion_tipo", "Una copia agrupada figura como expansión.", referencia=ref)
        groups.append({"nombre": name, "rows": [by_id[origin] for origin in sorted(origins)], "referencia": ref})
        assigned.update(origins)
    groups += [{"nombre": row["titulo"], "rows": [row], "referencia": None} for row in rows if row["origenId"] not in assigned]
    groups.sort(key=lambda group: (group["rows"][0]["tipo"] == "Expansión", min(row["origenId"] for row in group["rows"])))
    names = [_titulo(group["nombre"]) for group in groups]
    if len(names) != len(set(names)):
        _incidencia(informe, "juego_ambiguo", "Hay títulos iguales sin agrupación aprobada; no se fusionan automáticamente.")
    ids = {row["origenId"]: number for number, group in enumerate(groups, 1) for row in group["rows"]}
    relations = {origin: (ref, base) for ref, origin, base in EXPANSIONES}
    for row in rows:
        origin = row["origenId"]
        if row["tipo"] == "Expansión":
            ref, base = relations.get(origin, (None, None))
            if base not in by_id or by_id[base]["tipo"] != "Juego base":
                _incidencia(informe, "expansion_sin_base", "La expansión no tiene una relación aprobada con una base presente.", origenId=origin)
                continue
            relation = {"referencia": ref, "origenId": origin, "juegoBaseOrigenId": base, "idJuego": ids[origin], "idJuegoBase": ids[base]}
            if ref == "E4":
                relation["requisitosAdicionalesOrigenIds"] = ["fdaf785f", "66619b48"]
            if ref in {"E5", "E6"}:
                relation["otrasBasesCompatibles"] = ["Ticket to Ride: Europe"]
            informe["relacionesExpansiones"].append(relation)
        elif origin in relations:
            _incidencia(informe, "clasificacion_distinta", "Una expansión verificada aparece marcada como juego base.", origenId=origin)
    return groups, ids


def _detalles_excel(row, overrides, informe):
    """Interpreta los descriptivos de Excel según los formatos aprobados.

    Usa el máximo de los rangos de duración y normaliza la dificultad. Los
    formatos no reconocidos no se tratan como campos vacíos: generan errores,
    salvo las excepciones de jugadores o dificultad con resolución aprobada.

    Args:
        row (dict): Fila normalizada que conserva las columnas originales.
        overrides (dict): Correcciones por campo; sus claves identifican las
            excepciones cuyo valor se resolverá en _detalles.
        informe (dict): Contexto que recibe errores de interpretación.

    Returns:
        tuple[dict, bool]: Descriptivos interpretados, con None en campos sin
            dato válido, e indicador de que la duración era un rango.
    """
    raw = row["original"]
    result = dict.fromkeys(CAMPOS_DESCRIPTIVOS)
    players = _texto(raw["Jugadores"])
    match = re.fullmatch(r"(\d+)(?:\s*[-–—a]\s*(\d+))?", players or "")
    if match:
        result["jugadoresMin"], result["jugadoresMax"] = int(match[1]), int(match[2] or match[1])
    elif players and not {"jugadoresMin", "jugadoresMax"} <= overrides.keys():
        _incidencia(informe, "jugadores_sin_resolver", "Un formato no interpretado de Excel no es un dato vacío.", origenId=row["origenId"], original=players)
    duration = _texto(raw["Tiempo"])
    match = re.fullmatch(r"(\d+)\s*(?:[-–—]\s*(\d+)\s*)?(?:min(?:utos?)?\.?)?", duration or "", re.IGNORECASE)
    ranged = bool(match and match[2])
    if match and 0 < int(match[1]) <= int(match[2] or match[1]):
        result["duracion"] = int(match[2] or match[1])
    elif duration:
        _incidencia(informe, "duracion_sin_resolver", "Duración de Excel inválida o con formato no aprobado.", origenId=row["origenId"], original=duration)
    difficulty = _texto(raw["Dificultad"])
    match = re.fullmatch(r"(fácil|facil|media|intermedio|difícil|dificil)(?:\s*\([^)]*\))?", difficulty or "", re.IGNORECASE)
    if match:
        result["dificultad"] = {"fácil": "Fácil", "facil": "Fácil", "media": "Intermedio", "intermedio": "Intermedio", "difícil": "Difícil", "dificil": "Difícil"}[match[1].casefold()]
    elif difficulty and "dificultad" not in overrides:
        _incidencia(informe, "dificultad_sin_resolver", "Dificultad de Excel sin resolución aprobada.", origenId=row["origenId"], original=difficulty)
    return result, ranged


def _detalles_notion(matches, informe, name):
    """Extrae candidatos descriptivos positivos de las fichas de Notion.

    Args:
        matches (list[dict]): Fichas vinculadas al título y sus copias.
        informe (dict): Contexto que recibe advertencias por datos descartados.
        name (str): Nombre del juego usado para ubicar los diagnósticos.

    Returns:
        dict[str, list]: Valores candidatos por campo descriptivo. Los vacíos
            se omiten y los formatos inválidos se descartan con advertencia.
    """
    values = {field: [] for field in CAMPOS_DESCRIPTIVOS}
    for row in matches:
        for field in ("jugadores", "duracion", "edadMinima"):
            text = row[field].strip()
            if not text:
                continue
            valid = False
            if field == "jugadores":
                match = re.fullmatch(r"(\d+)\s*(?:[-–—]\s*(\d+)\s*)?Jugadores", text)
                if match and 0 < int(match[1]) <= int(match[2] or match[1]):
                    values["jugadoresMin"].append(int(match[1]))
                    values["jugadoresMax"].append(int(match[2] or match[1]))
                    valid = True
            else:
                pattern = r"(\d+)\s*min" if field == "duracion" else r"\+?\s*(\d+)"
                match = re.fullmatch(pattern, text)
                if match and int(match[1]) > 0:
                    values[field].append(int(match[1]))
                    valid = True
            if not valid:
                _incidencia(informe, "notion_descartado", "Dato no positivo, invertido o con formato inválido; no reemplaza Excel.", "advertencia", nombreJuego=name, tituloNotion=row["nombre"], campo=field, original=text)
    return values


def _detalles(group, notion, informe):
    """Combina descriptivos con prioridad correcciones, Excel y después Notion.

    Las coincidencias de Notion usan únicamente el nombre canónico del grupo y
    los títulos de sus copias, normalizados por _titulo. Los conflictos sin
    resolución generan errores; los campos desconocidos y de BGG quedan en None.

    Args:
        group (dict): Grupo con nombre, rows y referencia aprobada opcional.
        notion (dict[str, dict]): Fichas de Notion indexadas por título.
        informe (dict): Contexto que recibe conflictos y discrepancias resueltas.

    Returns:
        tuple[dict, bool, int]: Descriptivos combinados, indicador de coincidencia
            con Notion y cantidad de filas de Excel con duración en rango.
    """
    rows, name = group["rows"], group["nombre"]
    names = {_titulo(name), *(_titulo(row["titulo"]) for row in rows)}
    matches = [notion[key] for key in sorted(names) if key in notion]
    overrides = {}
    if group["referencia"] == "A1":
        overrides["dificultad"] = ("D5", "Intermedio")
    for row in rows:
        ref, corrections = CORRECCIONES.get(row["origenId"], (None, {}))
        overrides.update({field: (ref, value) for field, value in corrections.items()})
    parsed = [_detalles_excel(row, overrides, informe) for row in rows]
    other = _detalles_notion(matches, informe, name)
    data = {}
    for field in CAMPOS_DESCRIPTIVOS:
        known = list(dict.fromkeys(values[field] for values, _ in parsed if values[field] is not None))
        candidates = list(dict.fromkeys(other[field]))
        if field in overrides:
            ref, data[field] = overrides[field]
            if len(known) > 1:
                _incidencia(informe, "conflicto_excel_resuelto", "Se aplica la resolución aprobada para las copias.", "informacion", nombreJuego=name, campo=field, valoresExcel=known, elegido=data[field], regla=ref)
        elif len(known) > 1:
            _incidencia(informe, "conflicto_excel", "Las copias tienen valores incompatibles sin resolución.", nombreJuego=name, campo=field, valores=known)
            data[field] = None
        elif known:
            data[field] = known[0]
        elif len(candidates) > 1:
            _incidencia(informe, "conflicto_notion", "Las fichas vinculadas de Notion discrepan para un campo desconocido.", nombreJuego=name, campo=field, valores=candidates)
            data[field] = None
        elif candidates:
            data[field] = candidates[0]
        else:
            data[field] = None
        if known and candidates and any(value != data[field] for value in candidates):
            _incidencia(informe, "discrepancia_notion_resuelta", "Se conserva Excel según la prioridad aprobada.", "informacion", nombreJuego=name, campo=field, valoresExcel=known, valoresNotion=candidates, elegido=data[field])
    for field in ("calificacion", "pathImagen", "idBgg", "manual", "video"):
        data[field] = None
    return data, bool(matches), sum(ranged for _, ranged in parsed)


def preparar(excel: Path, notion: Path) -> dict:
    """Normaliza las fuentes y valida el lote con Zod sin escribir archivos.

    Lee solo las fuentes locales, resuelve las relaciones aprobadas y genera el
    informe compacto. Si no hay errores previos, ejecuta una única validación
    del lote. Los errores de datos y del puente Zod quedan en incidencias;
    aptoParaImportar solo será True si el lote supera todas las validaciones.

    Args:
        excel: Ruta del libro AppSheet con la hoja Inventario.
        notion: Ruta de la copia local de Notion en JSON.

    Returns:
        dict: Juegos, ejemplares, informe e incidencias. El informe contiene
            supuestos, conteos y relaciones; los diagnósticos quedan separados
            en incidencias para la consola y el bloqueo de la exportación.

    Raises:
        OSError: No se puede leer alguna fuente.
        UnicodeError: El JSON no está codificado en UTF-8 válido.
        json.JSONDecodeError: La captura de Notion no contiene JSON válido.
        BadZipFile: El libro XLSX está dañado o no es un contenedor válido.
        InvalidFileException: El formato de Excel no es compatible.
    """
    excel, notion = Path(excel), Path(notion)
    informe = {
        "aptoParaImportar": False, "conteos": {}, "conteosOperativos": {},
        "supuestos": [{"codigo": code, "descripcion": description} for code, description in REGLAS],
        "relacionesExpansiones": [],
        "fuentes": {"excel": {"archivo": str(excel), "hoja": "Inventario"}, "notion": {"archivo": str(notion)}},
    }
    result = {"juegos": [], "ejemplares": [], "informe": informe, "incidencias": []}
    # Los diagnósticos quedan en memoria para validación y consola, fuera del informe.
    contexto = {**informe, "incidencias": result["incidencias"]}
    rows = _leer_excel(excel, contexto)
    indexed_notion = _leer_notion(notion, contexto)
    if not rows and not _errores(contexto):
        _incidencia(contexto, "inventario_vacio", "Inventario no contiene ejemplares para migrar.")
    if _errores(contexto):
        return result
    groups, ids = _agrupar(rows, contexto)
    relations = {relation["origenId"]: relation for relation in informe["relacionesExpansiones"]}
    ranged = notion_matches = 0
    for number, group in enumerate(groups, 1):
        data, matched, ranges = _detalles(group, indexed_notion, contexto)
        first = group["rows"][0]
        data.update({"idJuego": number, "nombreJuego": group["nombre"], "tipo": first["tipo"], "idJuegoBase": relations.get(first["origenId"], {}).get("idJuegoBase")})
        result["juegos"].append(data)
        ranged += ranges
        notion_matches += matched
    for row in sorted(rows, key=lambda row: row["origenId"]):
        game_id = ids[row["origenId"]]
        result["ejemplares"].append({**row["ejemplar"], "idJuego": game_id})
    games, copies = result["juegos"], result["ejemplares"]
    informe["conteos"] = {
        "juegosBase": sum(game["tipo"] == "Juego base" for game in games),
        "juegosExpansion": sum(game["tipo"] == "Expansión" for game in games), "juegosTotal": len(games),
        "ejemplaresBase": sum(row["tipo"] == "Juego base" for row in rows),
        "ejemplaresExpansion": sum(row["tipo"] == "Expansión" for row in rows), "ejemplaresTotal": len(copies),
    }
    informe["conteosOperativos"] = {
        "estados": dict(sorted(Counter(copy["estadoEjemplar"] for copy in copies).items())),
        "externos": sum(copy["esExterno"] for copy in copies), "internos": sum(not copy["esExterno"] for copy in copies),
        "completitud": dict(sorted(Counter(copy["estadoCompletitud"] for copy in copies).items())),
        "duracionesRango": ranged,
        "juegosConNotion": notion_matches,
        "descriptivosInformados": {field: sum(game[field] is not None for game in games) for field in CAMPOS_DESCRIPTIVOS},
    }
    if not _errores(contexto):
        try:
            validated = validate_payload({"juegos": games, "ejemplares": copies})
        except ZodBridgeError as error:
            _incidencia(contexto, "validacion_no_disponible", str(error))
            return result
        if validated["ok"]:
            result.update({"juegos": validated["juegos"], "ejemplares": validated["ejemplares"]})
            informe["aptoParaImportar"] = True
        else:
            for error in validated["errores"]:
                _incidencia(contexto, "validacion_zod", "Registro inválido según los schemas o el almacenamiento SQL.", detalle=error)
    return result


class ZodBridgeError(RuntimeError):
    """Fallo técnico del proceso o de su protocolo; no es un error de datos."""


def validate_payload(payload: dict) -> dict:
    """Valida un lote mediante Node y los schemas Zod del proyecto.

    Los arrays devueltos contienen solamente registros válidos, ya normalizados
    por Zod. Los errores usan índices base cero del lote original. El llamador
    debe impedir cualquier escritura si ok es False. Los mensajes de fallos
    técnicos no incluyen el contenido del lote.

    Args:
        payload: Diccionario con las listas juegos y ejemplares, serializable
            como JSON sin valores numéricos no finitos.

    Returns:
        dict: Respuesta con ok, juegos, ejemplares y errores. Los errores de
            validación de datos se devuelven en errores, sin lanzar excepciones.

    Raises:
        ZodBridgeError: Falla la serialización, Node no termina en 60 segundos,
            el proceso falla o su respuesta incumple el protocolo JSON.
    """
    import subprocess

    validator = Path(__file__).resolve().with_name("validar.ts")
    try:
        encoded = json.dumps(payload, ensure_ascii=False, allow_nan=False)
        result = subprocess.run(
            ["node", "--experimental-strip-types", str(validator)],
            input=encoded,
            capture_output=True,
            encoding="utf-8",
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired, TypeError, ValueError) as exc:
        raise ZodBridgeError(
            "No se pudo ejecutar la validación Zod; compruebe Node, las dependencias y el lote JSON."
        ) from exc
    if result.returncode != 0:
        raise ZodBridgeError(
            "El validador Zod falló; compruebe pnpm install y la estructura del lote."
        )
    try:
        validated = json.loads(result.stdout)
    except (ValueError, TypeError) as exc:
        raise ZodBridgeError("El validador Zod no devolvió JSON válido.") from exc
    if (
        not isinstance(validated, dict)
        or type(validated.get("ok")) is not bool
        or any(
            not isinstance(validated.get(key), list)
            for key in ("juegos", "ejemplares", "errores")
        )
    ):
        raise ZodBridgeError("La respuesta del validador Zod no cumple el contrato.")
    return validated


# Columnas de destino; los valores y sus tipos se validan con Zod antes de exportar.
JUEGO_COLUMNAS = (
    "idJuego", "nombreJuego", "tipo", "idJuegoBase", "edadMinima",
    "jugadoresMin", "jugadoresMax", "duracion", "calificacion", "dificultad",
    "pathImagen", "idBgg", "manual", "video",
)
EJEMPLAR_COLUMNAS = (
    "idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "situacion",
    "comentarios", "componentes", "estadoEjemplar",
)
CSV_ARCHIVOS = ("juegos_base.csv", "expansiones.csv", "ejemplares.csv")


def _validar_salida(salida: Path, entradas: tuple[Path, Path]) -> None:
    """Comprueba que la carpeta de exportación no ponga en riesgo las fuentes.

    Args:
        salida: Carpeta exclusiva, existente o por crear, para los tres CSV y el
            informe. No puede ser un enlace simbólico ni contener archivos ajenos.
        entradas: Rutas de Excel y Notion, que deben estar fuera de la salida.

    Raises:
        ValueError: La salida no es exclusiva, incluye una fuente o alguno de
            sus archivos coincide con una fuente mediante enlaces.
        OSError: No se pueden inspeccionar las rutas o sus archivos.
    """
    if salida.is_symlink() or (salida.exists() and not salida.is_dir()):
        raise ValueError("La salida debe ser una carpeta, sin enlaces simbólicos.")
    destino = salida.resolve()
    for entrada in entradas:
        if entrada.resolve() == destino or destino in entrada.resolve().parents:
            raise ValueError("Las fuentes deben estar fuera de la carpeta de salida.")
    for archivo in salida.iterdir() if salida.exists() else ():
        if archivo.name not in (*CSV_ARCHIVOS, "informe.json") or archivo.is_symlink() or not archivo.is_file():
            raise ValueError("La carpeta de salida contiene archivos ajenos; utiliza una carpeta exclusiva.")
        if any(entrada.exists() and archivo.samefile(entrada) for entrada in entradas):
            raise ValueError("La salida coincide con una fuente; utiliza otra carpeta.")


def _exportar(resultado: dict, salida: Path) -> None:
    """Escribe los archivos temporales y reemplaza cada archivo de destino.

    Actualiza aptoParaImportar y archivos en el informe del resultado. Si hay
    errores, publica solo el informe y elimina los CSV previos de esa carpeta
    para evitar que se utilicen como si correspondieran a la nueva preparación.

    Args:
        resultado: Resultado de preparar, incluidas las incidencias separadas
            del informe. Debe haberse validado antes de exportar.
        salida: Carpeta de destino comprobada previamente con _validar_salida.

    Raises:
        OSError: No se pueden crear, reemplazar o eliminar los archivos.
        TypeError: El informe contiene valores no serializables como JSON.
        ValueError: El informe contiene números no finitos, no admitidos en JSON.
    """
    import csv
    import tempfile

    informe = resultado["informe"]
    apto = not any(item["nivel"] == "error" for item in resultado["incidencias"])
    informe["aptoParaImportar"] = apto
    juegos = resultado["juegos"]
    tablas = (
        [juego for juego in juegos if juego["tipo"] == "Juego base"],
        [juego for juego in juegos if juego["tipo"] == "Expansión"],
        resultado["ejemplares"],
    )
    informe["archivos"] = dict(zip(CSV_ARCHIVOS, map(len, tablas))) if apto else {}
    salida.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=salida.parent) as temporal:
        carpeta = Path(temporal)
        if apto:
            for nombre, filas, columnas in zip(CSV_ARCHIVOS, tablas, (JUEGO_COLUMNAS, JUEGO_COLUMNAS, EJEMPLAR_COLUMNAS)):
                with (carpeta / nombre).open("w", encoding="utf-8", newline="") as archivo:
                    writer = csv.DictWriter(archivo, fieldnames=columnas, lineterminator="\n")
                    writer.writeheader()
                    for fila in filas:
                        writer.writerow({campo: str(valor).lower() if isinstance(valor, bool) else valor
                                         for campo, valor in fila.items()})
        (carpeta / "informe.json").write_text(
            json.dumps(informe, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8",
        )
        salida.mkdir(exist_ok=True)
        # Si una regeneración falla la validación, no se dejan CSV anteriores que parezcan vigentes.
        if not apto:
            for nombre in CSV_ARCHIVOS:
                (salida / nombre).unlink(missing_ok=True)
        for nombre in (*CSV_ARCHIVOS, "informe.json"):
            if (carpeta / nombre).exists():
                (carpeta / nombre).replace(salida / nombre)


def main(argv: list[str] | None = None) -> int:
    """Ejecuta la preparación desde la CLI y muestra los diagnósticos.

    Args:
        argv: Argumentos sin el nombre del programa. Si es None, argparse usa
            los argumentos del proceso.

    Returns:
        int: 0 si se generaron los CSV, 2 si los errores de preparación bloquearon
            la exportación, o 1 si falló la operación sobre la salida.

    Raises:
        SystemExit: Argparse recibe argumentos inválidos o una petición de ayuda.
    """
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Normaliza Inventario de Excel y Notion y prepara CSV para una carga inicial.")
    parser.add_argument("--excel", required=True, type=Path, help="Excel AppSheet; solo se lee Inventario.")
    parser.add_argument("--notion", type=Path, default=Path(__file__).resolve().with_name("notion.json"), help="Copia local JSON; por defecto notion.json junto al script.")
    parser.add_argument("--salida", type=Path, default=Path(".importacion/csv"), help="Carpeta exclusiva para los tres CSV y el informe.")
    args = parser.parse_args(argv)
    try:
        _validar_salida(args.salida, (args.excel, args.notion))
        try:
            resultado = preparar(args.excel, args.notion)
        except (OSError, ValueError, BadZipFile, InvalidFileException, ZodBridgeError) as error:
            resultado = {"juegos": [], "ejemplares": [], "incidencias": [
                {"nivel": "error", "codigo": "preparacion_fallida", "mensaje": str(error)},
            ], "informe": {
                "fuentes": {"excel": str(args.excel), "notion": str(args.notion)},
                "conteos": {}, "supuestos": [],
            }}
        _exportar(resultado, args.salida)
        errores = sum(item["nivel"] == "error" for item in resultado["incidencias"])
        advertencias = sum(item["nivel"] == "advertencia" for item in resultado["incidencias"])
        print(f"Informe: {args.salida / 'informe.json'}")
        print(f"Incidencias: {errores} errores, {advertencias} advertencias.")
        for item in resultado["incidencias"]:
            if item["nivel"] in {"error", "advertencia"}:
                contexto = {key: value for key, value in item.items() if key not in {"nivel", "codigo", "mensaje"}}
                detalle = f" {json.dumps(contexto, ensure_ascii=False)}" if contexto else ""
                print(f"{item['nivel']}: {item['codigo']}: {item['mensaje']}{detalle}", file=sys.stderr)
        if errores:
            print("No se generaron CSV; corrige los errores indicados arriba.", file=sys.stderr)
            return 2
        print(f"CSV preparados: {len(resultado['juegos'])} juegos y {len(resultado['ejemplares'])} ejemplares.")
        print("Los supuestos están documentados en el informe. No se modificó la base de datos.")
        return 0
    except (OSError, ValueError, ZodBridgeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
