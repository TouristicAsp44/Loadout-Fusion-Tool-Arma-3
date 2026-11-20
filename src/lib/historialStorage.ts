import { ModoFusion, OpcionesFusion } from './fusionarLoadouts';

export const STORAGE_KEY = 'arma3_loadout_fusion_history';
export const MAX_HISTORIAL = 30;

export interface ConfiguracionGuardada {
  id: string;
  nombre: string;
  fechaIso: string;
  base: string;
  objetivo: string;
  modo: ModoFusion;
  opciones: Required<OpcionesFusion>;
}

function esObjeto(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function validarEntradaHistorial(item: unknown): ConfiguracionGuardada | null {
  if (!esObjeto(item)) return null;
  if (typeof item.id !== 'string' || !item.id.trim()) return null;
  if (typeof item.nombre !== 'string' || !item.nombre.trim()) return null;
  if (typeof item.base !== 'string') return null;
  if (typeof item.objetivo !== 'string') return null;

  const rawOpciones = esObjeto(item.opciones) ? item.opciones : {};
  const modoRaw =
    item.modo === 'reemplazar' || rawOpciones.modo === 'reemplazar'
      ? 'reemplazar'
      : 'añadir';

  const opciones: Required<OpcionesFusion> = {
    modo: modoRaw,
    uniforme: typeof rawOpciones.uniforme === 'boolean' ? rawOpciones.uniforme : true,
    chaleco: typeof rawOpciones.chaleco === 'boolean' ? rawOpciones.chaleco : true,
    mochila: typeof rawOpciones.mochila === 'boolean' ? rawOpciones.mochila : true,
    copiarCasco:
      typeof rawOpciones.copiarCasco === 'boolean' ? rawOpciones.copiarCasco : false,
    copiarOtros:
      typeof rawOpciones.copiarOtros === 'boolean' ? rawOpciones.copiarOtros : false,
  };

  const fechaIso =
    typeof item.fechaIso === 'string' && !Number.isNaN(Date.parse(item.fechaIso))
      ? item.fechaIso
      : new Date().toISOString();

  return {
    id: item.id.trim(),
    nombre: item.nombre.trim(),
    fechaIso,
    base: item.base,
    objetivo: item.objetivo,
    modo: modoRaw,
    opciones,
  };
}

export function leerHistorialLocal(): ConfiguracionGuardada[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validos: ConfiguracionGuardada[] = [];
    for (const item of parsed) {
      const validado = validarEntradaHistorial(item);
      if (validado) validos.push(validado);
    }
    return validos.slice(0, MAX_HISTORIAL);
  } catch {
    return [];
  }
}

export function escribirHistorialLocal(lista: ConfiguracionGuardada[]): boolean {
  try {
    const recortada = lista.slice(0, MAX_HISTORIAL);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recortada));
    return true;
  } catch {
    return false;
  }
}

export function guardarEnHistorial(
  actual: ConfiguracionGuardada[],
  datos: {
    nombre: string;
    base: string;
    objetivo: string;
    opciones: Required<OpcionesFusion>;
  }
): {
  lista: ConfiguracionGuardada[];
  estado: 'creada' | 'actualizada';
  guardadoEnStorage: boolean;
} {
  const nombreLimpio = datos.nombre.trim();
  const ahora = new Date().toISOString();
  const idxExistente = actual.findIndex(
    (entry) => entry.nombre.toLowerCase() === nombreLimpio.toLowerCase()
  );

  let nuevaLista: ConfiguracionGuardada[];
  let estado: 'creada' | 'actualizada';

  if (idxExistente !== -1) {
    estado = 'actualizada';
    const existente = actual[idxExistente];
    const actualizada: ConfiguracionGuardada = {
      id: existente.id,
      nombre: nombreLimpio,
      fechaIso: ahora,
      base: datos.base,
      objetivo: datos.objetivo,
      modo: datos.opciones.modo,
      opciones: { ...datos.opciones },
    };
    nuevaLista = [
      actualizada,
      ...actual.filter((_, i) => i !== idxExistente),
    ].slice(0, MAX_HISTORIAL);
  } else {
    estado = 'creada';
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const nueva: ConfiguracionGuardada = {
      id,
      nombre: nombreLimpio,
      fechaIso: ahora,
      base: datos.base,
      objetivo: datos.objetivo,
      modo: datos.opciones.modo,
      opciones: { ...datos.opciones },
    };
    nuevaLista = [nueva, ...actual].slice(0, MAX_HISTORIAL);
  }

  const guardadoEnStorage = escribirHistorialLocal(nuevaLista);
  return { lista: nuevaLista, estado, guardadoEnStorage };
}

export function fusionarHistorialImportado(
  actual: ConfiguracionGuardada[],
  jsonTexto: string
):
  | { ok: true; lista: ConfiguracionGuardada[]; importadas: number }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonTexto);
  } catch {
    return {
      ok: false,
      error: 'El archivo seleccionado no contiene un JSON válido. El historial existente no fue modificado.',
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'El JSON importado debe ser una lista (array) de configuraciones. El historial existente no fue modificado.',
    };
  }

  const entradasImportadas: ConfiguracionGuardada[] = [];
  for (const rawItem of parsed) {
    const validada = validarEntradaHistorial(rawItem);
    if (!validada) {
      return {
        ok: false,
        error: 'El JSON contiene entradas con formato inválido o campos faltantes. El historial existente no fue modificado.',
      };
    }
    entradasImportadas.push(validada);
  }

  // Fusionar por id: las entradas importadas con el mismo id actualizan o se combinan con las actuales
  const mapaPorId = new Map<string, ConfiguracionGuardada>();
  for (const item of actual) {
    mapaPorId.set(item.id, item);
  }
  for (const item of entradasImportadas) {
    mapaPorId.set(item.id, item);
  }

  const combinadas = Array.from(mapaPorId.values())
    .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
    .slice(0, MAX_HISTORIAL);

  escribirHistorialLocal(combinadas);
  return {
    ok: true,
    lista: combinadas,
    importadas: entradasImportadas.length,
  };
}

/**
 * Filtra la lista de configuraciones guardadas por término de búsqueda (coincidencia
 * insensible a mayúsculas/minúsculas en nombre, base, objetivo, modo o id).
 * Si query está vacío, devuelve la lista original.
 */
export function filtrarHistorial(
  lista: ConfiguracionGuardada[],
  query: string
): ConfiguracionGuardada[] {
  if (!query || !query.trim()) {
    return lista;
  }

  const q = query.trim().toLowerCase();

  return lista.filter((item) => {
    if (item.nombre.toLowerCase().includes(q)) return true;
    if (item.id.toLowerCase().includes(q)) return true;
    if (item.modo.toLowerCase().includes(q)) return true;
    if (item.base.toLowerCase().includes(q)) return true;
    if (item.objetivo.toLowerCase().includes(q)) return true;
    return false;
  });
}
