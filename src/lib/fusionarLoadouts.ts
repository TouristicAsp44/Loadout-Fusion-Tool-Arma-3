export type ModoFusion = 'añadir' | 'reemplazar';
export type CampoLoadout = 'base' | 'objetivo';

export interface OpcionesFusion {
  modo?: ModoFusion;
  uniforme?: boolean;
  chaleco?: boolean;
  mochila?: boolean;
  copiarCasco?: boolean;
  copiarOtros?: boolean;
}

export interface CambioItemDiff {
  contenedor: 'Uniforme' | 'Chaleco' | 'Mochila';
  tipo: 'añadido' | 'sumado' | 'reemplazado';
  clave: string;
  classname: string;
  cantidadAnterior?: number;
  cantidadNueva: number;
  detalles?: string;
}

export interface ResultadoFusion {
  resultado: unknown[];
  resumen: string[];
  avisos: string[];
  informativos: string[];
  cambios: CambioItemDiff[];
}

export class LoadoutValidationError extends Error {
  public readonly campo: CampoLoadout;

  constructor(campo: CampoLoadout, detalle: string) {
    const etiqueta = campo === 'base' ? 'Loadout Base' : 'Loadout Objetivo';
    super(`Error en ${etiqueta}: ${detalle}`);
    this.name = 'LoadoutValidationError';
    this.campo = campo;
  }
}

export type Arma3ArmaItem =
  | [
      classname?: string,
      muzzle?: string,
      pointer?: string,
      optic?: string,
      primaryMag?: [string, number] | [],
      secondaryMag?: [string, number] | [],
      bipod?: string,
    ]
  | [];

export type Arma3ItemSimple = [string, number];
export type Arma3ItemMunicion = [string, number, number];
export type Arma3ArmaAlmacenada = [Arma3ArmaItem, number];

export type Arma3ContenedorItem =
  | [classname: string, count: number, ...extra: unknown[]]
  | [weaponTuple: unknown[], count: number, ...extra: unknown[]]
  | unknown[];

export type Arma3Contenedor = [string, Arma3ContenedorItem[]] | [];

export type Arma3Asignados =
  | [string, string, string, string, string, string]
  | string[];

export type Arma3Loadout = [
  Arma3ArmaItem | unknown[], // 0: Primaria
  Arma3ArmaItem | unknown[], // 1: Lanzador / secundaria
  Arma3ArmaItem | unknown[], // 2: Pistola
  Arma3Contenedor,          // 3: Uniforme
  Arma3Contenedor,          // 4: Chaleco
  Arma3Contenedor,          // 5: Mochila
  string,                   // 6: Casco
  string,                   // 7: Gafas / Facewear
  Arma3ArmaItem | unknown[], // 8: Prismáticos
  Arma3Asignados | unknown[], // 9: Ítems asignados
];

export type Arma3LoadoutEnvuelto = [Arma3Loadout, unknown];

export interface LoadoutDesenvuelto {
  loadoutInterno: unknown[];
  envuelto: boolean;
  identidad: unknown;
}

/**
 * Elimina comentarios SQF (de línea `//` y de bloque `/* ... *\/`)
 * garantizando que los textos entre comillas dobles o simples no sean alterados.
 */
function eliminarComentariosSQF(codigo: string): string {
  let res = '';
  let i = 0;
  const n = codigo.length;
  let estado: 'fuera' | 'doble' | 'simple' = 'fuera';

  while (i < n) {
    const ch = codigo[i];
    const next = i + 1 < n ? codigo[i + 1] : '';

    if (estado === 'fuera') {
      if (ch === '/' && next === '/') {
        i += 2;
        while (i < n && codigo[i] !== '\n' && codigo[i] !== '\r') {
          i++;
        }
        res += ' ';
      } else if (ch === '/' && next === '*') {
        i += 2;
        while (i < n && !(codigo[i] === '*' && i + 1 < n && codigo[i + 1] === '/')) {
          i++;
        }
        if (i < n) {
          i += 2;
        }
        res += ' ';
      } else if (ch === '"') {
        estado = 'doble';
        res += ch;
        i++;
      } else if (ch === "'") {
        estado = 'simple';
        res += ch;
        i++;
      } else {
        res += ch;
        i++;
      }
    } else if (estado === 'doble') {
      if (ch === '\\' && next) {
        res += ch + next;
        i += 2;
      } else if (ch === '"' && next === '"') {
        res += '""';
        i += 2;
      } else if (ch === '"') {
        estado = 'fuera';
        res += ch;
        i++;
      } else {
        res += ch;
        i++;
      }
    } else {
      // simple
      if (ch === '\\' && next) {
        res += ch + next;
        i += 2;
      } else if (ch === "'" && next === "'") {
        res += "''";
        i += 2;
      } else if (ch === "'") {
        estado = 'fuera';
        res += ch;
        i++;
      } else {
        res += ch;
        i++;
      }
    }
  }

  return res;
}

/**
 * Normaliza una cadena SQF / JSON de Arma 3:
 * - Elimina comentarios SQF (// y /* ... *\/) fuera de cadenas.
 * - Quita prefijos tipo `private _x =`, `params [...];`, o `_loadout =`.
 * - Quita punto y coma final y espacios sobrantes.
 * - Convierte constantes SQF (nil, objNull, grpNull, controlNull, displayNull, locationNull, taskNull) a null.
 * - Convierte booleanos SQF (TRUE, FALSE) a true/false.
 * - Convierte comillas simples a comillas dobles válidas en JSON respetando secuencias de escape SQF.
 */
export function normalizarCadenaLoadout(raw: string): string {
  // 1. Eliminar comentarios SQF preservando el interior de strings
  let texto = eliminarComentariosSQF(raw).trim();

  // 2. Quitar prefijos tipo "params [...];", "private _x =", o "_loadout ="
  texto = texto
    .replace(/^(?:params\s*\[.*?\]\s*;\s*)?(?:private\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*/is, '')
    .trim();

  // 3. Quitar ";" final (uno o varios) junto con espacios
  texto = texto.replace(/;+\s*$/, '').trim();

  // 4. Tokenizar para convertir comillas simples a dobles y reemplazar palabras clave
  const SQF_NULL_KEYWORDS = new Set([
    'nil',
    'objnull',
    'grpnull',
    'controlnull',
    'displaynull',
    'locationnull',
    'tasknull',
  ]);

  let resultado = '';
  let i = 0;
  const n = texto.length;
  let estado: 'fuera' | 'doble' | 'simple' = 'fuera';

  while (i < n) {
    const ch = texto[i];

    if (estado === 'fuera') {
      if (ch === '"') {
        estado = 'doble';
        resultado += '"';
        i++;
      } else if (ch === "'") {
        estado = 'simple';
        resultado += '"';
        i++;
      } else if (/[a-zA-Z_]/.test(ch)) {
        let palabra = '';
        while (i < n && /[a-zA-Z0-9_]/.test(texto[i])) {
          palabra += texto[i];
          i++;
        }
        const palabraLower = palabra.toLowerCase();
        if (SQF_NULL_KEYWORDS.has(palabraLower)) {
          resultado += 'null';
        } else if (palabraLower === 'true') {
          resultado += 'true';
        } else if (palabraLower === 'false') {
          resultado += 'false';
        } else {
          resultado += palabra;
        }
      } else {
        resultado += ch;
        i++;
      }
    } else if (estado === 'doble') {
      if (ch === '\\' && i + 1 < n) {
        resultado += ch + texto[i + 1];
        i += 2;
      } else if (ch === '"' && i + 1 < n && texto[i + 1] === '"') {
        // En SQF "" dentro de "..." representa una comilla doble escapada
        resultado += '\\"';
        i += 2;
      } else if (ch === '"') {
        estado = 'fuera';
        resultado += '"';
        i++;
      } else {
        resultado += ch;
        i++;
      }
    } else {
      // estado === 'simple'
      if (ch === '\\' && i + 1 < n) {
        const next = texto[i + 1];
        if (next === "'") {
          resultado += "'";
        } else {
          resultado += '\\' + next;
        }
        i += 2;
      } else if (ch === "'" && i + 1 < n && texto[i + 1] === "'") {
        // En SQF '' dentro de '...' representa una comilla simple literal
        resultado += "'";
        i += 2;
      } else if (ch === '"') {
        resultado += '\\"';
        i++;
      } else if (ch === "'") {
        estado = 'fuera';
        resultado += '"';
        i++;
      } else {
        resultado += ch;
        i++;
      }
    }
  }

  return resultado.trim();
}

/**
 * Extrae y valida los 10 índices de un loadout (envuelto o sin envolver) sin mutar la entrada.
 */
export function desenvolverLoadout(
  entrada: unknown,
  campo: CampoLoadout
): LoadoutDesenvuelto {
  let valor: unknown = entrada;

  if (typeof entrada === 'string') {
    const normalizado = normalizarCadenaLoadout(entrada);
    if (!normalizado) {
      throw new LoadoutValidationError(campo, 'el contenido está vacío.');
    }
    try {
      valor = JSON.parse(normalizado);
    } catch {
      throw new LoadoutValidationError(
        campo,
        'formato inválido. Asegúrate de pegar un array de Arma 3 válido (corchetes y comillas).'
      );
    }
  } else {
    valor = structuredClone(entrada);
  }

  if (!Array.isArray(valor)) {
    throw new LoadoutValidationError(
      campo,
      'el formato debe ser un array de Arma 3.'
    );
  }

  // Detectar si viene envuelto como [loadout, identidad]:
  // si length === 2 y el elemento 0 es un array de 10 elementos, está envuelto.
  if (valor.length === 2 && Array.isArray(valor[0])) {
    if (valor[0].length === 10) {
      return {
        loadoutInterno: structuredClone(valor[0]),
        envuelto: true,
        identidad: structuredClone(valor[1]),
      };
    }
    throw new LoadoutValidationError(
      campo,
      `el loadout envuelto tiene ${valor[0].length} índices en lugar de los 10 requeridos.`
    );
  }

  if (valor.length !== 10) {
    throw new LoadoutValidationError(
      campo,
      `se encontraron ${valor.length} índices; un loadout de Arma 3 debe tener exactamente 10 índices.`
    );
  }

  return {
    loadoutInterno: structuredClone(valor),
    envuelto: false,
    identidad: undefined,
  };
}

/**
 * Determina si un contenedor de Arma 3 (índice 3, 4 o 5) existe y tiene classname válido.
 * Un contenedor existente es ["classname", [ítems]]. Un contenedor inexistente es [].
 */
function esContenedorExistente(contenedor: unknown): contenedor is [string, unknown[]] {
  return (
    Array.isArray(contenedor) &&
    contenedor.length >= 1 &&
    typeof contenedor[0] === 'string' &&
    contenedor[0].trim().length > 0
  );
}

/**
 * Calcula la clave única de agrupación de un ítem de contenedor:
 * JSON.stringify([item[0], ...item.slice(2)])
 */
export function calcularClaveItem(item: unknown[]): string {
  return JSON.stringify([item[0], ...item.slice(2)]);
}

/**
 * Extrae el nombre de clase legible de un ítem o arma almacenada dentro de un contenedor.
 */
export function extraerClassnameItem(item: unknown): string {
  if (Array.isArray(item) && item.length > 0) {
    const primer = item[0];
    if (typeof primer === 'string') return primer;
    if (Array.isArray(primer) && primer.length > 0 && typeof primer[0] === 'string') {
      return primer[0];
    }
    return JSON.stringify(primer);
  }
  if (typeof item === 'string') return item;
  return '';
}

const DEFINICION_CONTENEDORES: ReadonlyArray<{
  indice: 3 | 4 | 5;
  nombre: 'Uniforme' | 'Chaleco' | 'Mochila';
  prop: 'uniforme' | 'chaleco' | 'mochila';
}> = [
  { indice: 3, nombre: 'Uniforme', prop: 'uniforme' },
  { indice: 4, nombre: 'Chaleco', prop: 'chaleco' },
  { indice: 5, nombre: 'Mochila', prop: 'mochila' },
];

/**
 * Función pura que fusiona los ítems de los contenedores de un loadout base
 * en los contenedores de un loadout objetivo según las opciones indicadas.
 */
export function fusionarLoadouts(
  base: string | unknown[],
  objetivo: string | unknown[],
  opciones: OpcionesFusion = {}
): ResultadoFusion {
  const modo: ModoFusion = opciones.modo === 'reemplazar' ? 'reemplazar' : 'añadir';
  const usarUniforme = opciones.uniforme ?? true;
  const usarChaleco = opciones.chaleco ?? true;
  const usarMochila = opciones.mochila ?? true;
  const copiarCasco = opciones.copiarCasco ?? false;
  const copiarOtros = opciones.copiarOtros ?? false;

  const baseInfo = desenvolverLoadout(base, 'base');
  const objetivoInfo = desenvolverLoadout(objetivo, 'objetivo');

  const baseArr = baseInfo.loadoutInterno;
  const resultadoInterno = structuredClone(objetivoInfo.loadoutInterno);

  const resumen: string[] = [];
  const avisos: string[] = [];
  const informativos: string[] = [];
  const cambios: CambioItemDiff[] = [];

  const flagsContenedor: Record<'uniforme' | 'chaleco' | 'mochila', boolean> = {
    uniforme: usarUniforme,
    chaleco: usarChaleco,
    mochila: usarMochila,
  };

  for (const { indice, nombre, prop } of DEFINICION_CONTENEDORES) {
    if (!flagsContenedor[prop]) {
      continue;
    }

    const contBase = baseArr[indice];
    const contObjetivo = resultadoInterno[indice];

    // Regla: Si el contenedor objetivo es [] (no existe): se omite ese contenedor y se agrega un aviso.
    if (!esContenedorExistente(contObjetivo)) {
      avisos.push(
        `${nombre} (${indice}): omitido porque el loadout objetivo no tiene este contenedor ([]).`
      );
      resumen.push(`${nombre}: omitido (sin contenedor en objetivo)`);
      continue;
    }

    // Regla: Si el contenedor base es [] o no tiene ítems: no cambia nada y agrega un aviso informativo.
    if (!esContenedorExistente(contBase)) {
      informativos.push(
        `${nombre} (${indice}): sin cambios porque el loadout base no tiene este contenedor ([]).`
      );
      resumen.push(`${nombre}: sin cambios (contenedor base vacío)`);
      continue;
    }

    const itemsBaseRaw = Array.isArray(contBase[1]) ? contBase[1] : [];
    if (itemsBaseRaw.length === 0) {
      informativos.push(
        `${nombre} (${indice}): sin cambios porque el contenedor base no tiene ítems.`
      );
      resumen.push(`${nombre}: sin cambios (0 ítems en base)`);
      continue;
    }

    const classnameObjetivo = contObjetivo[0];
    const itemsObjetivoActuales = Array.isArray(contObjetivo[1])
      ? (structuredClone(contObjetivo[1]) as unknown[])
      : [];
    const itemsBaseClonados = structuredClone(itemsBaseRaw) as unknown[];

    if (modo === 'reemplazar') {
      let totalUnidades = 0;
      for (const item of itemsBaseClonados) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const clave = calcularClaveItem(item);
        const classname = extraerClassnameItem(item);
        const cantidadNueva = typeof item[1] === 'number' ? item[1] : Number(item[1]) || 0;
        totalUnidades += cantidadNueva;

        // Comprobar si existía antes para reflejar cantidad anterior en el diff
        const itemPrevio = itemsObjetivoActuales.find(
          (it) => Array.isArray(it) && it.length >= 2 && calcularClaveItem(it) === clave
        );
        const cantidadAnterior = itemPrevio && Array.isArray(itemPrevio)
          ? (typeof itemPrevio[1] === 'number' ? itemPrevio[1] : Number(itemPrevio[1]) || 0)
          : undefined;

        cambios.push({
          contenedor: nombre,
          tipo: 'reemplazado',
          clave,
          classname,
          cantidadAnterior,
          cantidadNueva,
          detalles:
            cantidadAnterior !== undefined
              ? `Reemplazado (${cantidadAnterior} -> ${cantidadNueva})`
              : `Reemplazado (${cantidadNueva} ${cantidadNueva === 1 ? 'unidad' : 'unidades'})`,
        });
      }

      resultadoInterno[indice] = [classnameObjetivo, itemsBaseClonados];

      const txtUnidades =
        totalUnidades === 1
          ? '1 unidad establecida'
          : `${totalUnidades} unidades establecidas`;
      const txtEntradas =
        itemsBaseClonados.length === 1
          ? '1 entrada reemplazada'
          : `${itemsBaseClonados.length} entradas reemplazadas`;
      resumen.push(`${nombre}: ${txtUnidades} (${txtEntradas})`);
    } else {
      // Modo AÑADIR
      let unidadesAnadidas = 0;
      let entradasSumadas = 0;
      let entradasNuevas = 0;

      for (const itemBase of itemsBaseClonados) {
        if (!Array.isArray(itemBase) || itemBase.length < 2) {
          continue;
        }

        const clave = calcularClaveItem(itemBase);
        const classname = extraerClassnameItem(itemBase);
        const cantidadBase =
          typeof itemBase[1] === 'number' ? itemBase[1] : Number(itemBase[1]) || 0;

        const indiceExistente = itemsObjetivoActuales.findIndex(
          (itemObj) =>
            Array.isArray(itemObj) &&
            itemObj.length >= 2 &&
            calcularClaveItem(itemObj) === clave
        );

        if (indiceExistente !== -1) {
          const entradaExistente = itemsObjetivoActuales[indiceExistente] as unknown[];
          const cantidadActual =
            typeof entradaExistente[1] === 'number'
              ? entradaExistente[1]
              : Number(entradaExistente[1]) || 0;
          const cantidadNueva = cantidadActual + cantidadBase;
          entradaExistente[1] = cantidadNueva;
          entradasSumadas += 1;
          unidadesAnadidas += cantidadBase;

          cambios.push({
            contenedor: nombre,
            tipo: 'sumado',
            clave,
            classname,
            cantidadAnterior: cantidadActual,
            cantidadNueva,
            detalles: `+${cantidadBase} (anterior: ${cantidadActual})`,
          });
        } else {
          itemsObjetivoActuales.push(structuredClone(itemBase));
          entradasNuevas += 1;
          unidadesAnadidas += cantidadBase;

          cambios.push({
            contenedor: nombre,
            tipo: 'añadido',
            clave,
            classname,
            cantidadAnterior: 0,
            cantidadNueva: cantidadBase,
            detalles: `Nuevo ítem (+${cantidadBase})`,
          });
        }
      }

      resultadoInterno[indice] = [classnameObjetivo, itemsObjetivoActuales];

      const txtUnidades =
        unidadesAnadidas === 1
          ? '1 unidad añadida'
          : `${unidadesAnadidas} unidades añadidas`;
      const txtSumadas =
        entradasSumadas === 1
          ? '1 entrada sumada'
          : `${entradasSumadas} entradas sumadas`;
      const txtNuevas =
        entradasNuevas === 1 ? '1 nueva' : `${entradasNuevas} nuevas`;

      resumen.push(`${nombre}: ${txtUnidades} (${txtSumadas}, ${txtNuevas})`);
    }
  }

  // Opciones extra: "Copiar casco (6)" y "Copiar otros (0,1,2,7,8,9)"
  if (copiarCasco) {
    resultadoInterno[6] = structuredClone(baseArr[6]);
    resumen.push('Casco (6): sustituido por el del loadout base');
  }

  if (copiarOtros) {
    const otrosIndices = [0, 1, 2, 7, 8, 9] as const;
    for (const idx of otrosIndices) {
      resultadoInterno[idx] = structuredClone(baseArr[idx]);
    }
    resumen.push('Otros (0, 1, 2, 7, 8, 9): sustituidos por los del loadout base');
  }

  const resultadoFinal = objetivoInfo.envuelto
    ? [resultadoInterno, structuredClone(objetivoInfo.identidad)]
    : resultadoInterno;

  return {
    resultado: resultadoFinal,
    resumen,
    avisos,
    informativos,
    cambios,
  };
}

export type FormatoSalida = 'compacto' | 'formateado' | 'sqf' | 'cfgRespawn';

/**
 * Genera la representación en texto de un loadout según el formato solicitado:
 * - 'compacto': JSON en una sola línea.
 * - 'formateado': JSON indentado a 2 espacios.
 * - 'sqf': Comando `[player, ...] call BIS_fnc_setUnitLoadout;`.
 * - 'cfgRespawn': Definición de clase para `CfgRespawnInventory` en description.ext.
 */
export function generarSalidaFormateada(
  resultado: unknown[],
  formato: FormatoSalida,
  nombreLoadout?: string
): string {
  if (formato === 'compacto') {
    return JSON.stringify(resultado);
  }

  if (formato === 'formateado') {
    return JSON.stringify(resultado, null, 2);
  }

  if (formato === 'sqf') {
    return `[player, ${JSON.stringify(resultado)}] call BIS_fnc_setUnitLoadout;`;
  }

  if (formato === 'cfgRespawn') {
    return generarCfgRespawn(resultado, nombreLoadout);
  }

  return JSON.stringify(resultado);
}

function generarCfgRespawn(resultado: unknown[], nombreLoadout?: string): string {
  let loadout: unknown[] = resultado;
  if (
    Array.isArray(resultado) &&
    resultado.length === 2 &&
    Array.isArray(resultado[0]) &&
    resultado[0].length === 10
  ) {
    loadout = resultado[0] as unknown[];
  }

  const rawNombre = (nombreLoadout || 'CustomLoadout').trim();
  const className = rawNombre.replace(/[^a-zA-Z0-9_]/g, '_') || 'CustomLoadout';
  const displayName = rawNombre || 'Custom Loadout';

  if (!Array.isArray(loadout) || loadout.length < 10) {
    return [
      'class CfgRespawnInventory',
      '{',
      `    class ${className}`,
      '    {',
      `        displayName = "${displayName}";`,
      '        role = "Default";',
      '    };',
      '};',
    ].join('\n');
  }

  const weapons: string[] = [];
  const magazines: string[] = [];
  const items: string[] = [];
  const linkedItems: string[] = [];
  let uniformClass = '';
  let backpackClass = '';

  const procesarArma = (armaData: unknown) => {
    if (!Array.isArray(armaData) || armaData.length === 0) return;
    const [wClass, muzzle, laser, optic, primaryMag, secondaryMag, bipod] = armaData;

    if (typeof wClass === 'string' && wClass.trim()) {
      weapons.push(wClass.trim());
    }
    if (typeof muzzle === 'string' && muzzle.trim()) {
      linkedItems.push(muzzle.trim());
    }
    if (typeof laser === 'string' && laser.trim()) {
      linkedItems.push(laser.trim());
    }
    if (typeof optic === 'string' && optic.trim()) {
      linkedItems.push(optic.trim());
    }
    if (typeof bipod === 'string' && bipod.trim()) {
      linkedItems.push(bipod.trim());
    }
    if (
      Array.isArray(primaryMag) &&
      primaryMag.length >= 1 &&
      typeof primaryMag[0] === 'string' &&
      primaryMag[0].trim()
    ) {
      magazines.push(primaryMag[0].trim());
    }
    if (
      Array.isArray(secondaryMag) &&
      secondaryMag.length >= 1 &&
      typeof secondaryMag[0] === 'string' &&
      secondaryMag[0].trim()
    ) {
      magazines.push(secondaryMag[0].trim());
    }
  };

  // 0: Arma primaria
  procesarArma(loadout[0]);
  // 1: Arma secundaria (lanzador)
  procesarArma(loadout[1]);
  // 2: Pistola
  procesarArma(loadout[2]);
  // 8: Binoculares / herramienta
  procesarArma(loadout[8]);

  // 3: Uniforme
  const contUniforme = loadout[3];
  if (
    Array.isArray(contUniforme) &&
    contUniforme.length >= 1 &&
    typeof contUniforme[0] === 'string'
  ) {
    uniformClass = contUniforme[0].trim();
  }

  // 4: Chaleco
  const contChaleco = loadout[4];
  if (
    Array.isArray(contChaleco) &&
    contChaleco.length >= 1 &&
    typeof contChaleco[0] === 'string' &&
    contChaleco[0].trim()
  ) {
    linkedItems.push(contChaleco[0].trim());
  }

  // 5: Mochila
  const contMochila = loadout[5];
  if (
    Array.isArray(contMochila) &&
    contMochila.length >= 1 &&
    typeof contMochila[0] === 'string'
  ) {
    backpackClass = contMochila[0].trim();
  }

  // 6: Casco
  if (typeof loadout[6] === 'string' && loadout[6].trim()) {
    linkedItems.push(loadout[6].trim());
  }

  // 7: Gafas / Facewear
  if (typeof loadout[7] === 'string' && loadout[7].trim()) {
    linkedItems.push(loadout[7].trim());
  }

  // 9: Items asignados
  if (Array.isArray(loadout[9])) {
    for (const item of loadout[9]) {
      if (typeof item === 'string' && item.trim()) {
        linkedItems.push(item.trim());
      }
    }
  }

  // Contenido de los contenedores (Uniforme 3, Chaleco 4, Mochila 5)
  const procesarContenedorItems = (contData: unknown) => {
    if (!Array.isArray(contData) || contData.length < 2 || !Array.isArray(contData[1])) return;
    for (const entrada of contData[1]) {
      if (!Array.isArray(entrada) || entrada.length === 0) continue;
      const [itemRaw, countRaw, ammo] = entrada;
      const count =
        typeof countRaw === 'number' && countRaw > 0 ? Math.floor(countRaw) : 1;

      if (typeof itemRaw === 'string' && itemRaw.trim()) {
        const itemNombre = itemRaw.trim();
        // Si tiene 3er argumento de munición o coincide con nomenclatura de cargadores -> magazines
        const esMag = ammo !== undefined || /_mag(?:azine)?$/i.test(itemNombre);
        for (let c = 0; c < count; c++) {
          if (esMag) {
            magazines.push(itemNombre);
          } else {
            items.push(itemNombre);
          }
        }
      } else if (Array.isArray(itemRaw)) {
        // Arma almacenada en contenedor
        procesarArma(itemRaw);
      }
    }
  };

  procesarContenedorItems(loadout[3]);
  procesarContenedorItems(loadout[4]);
  procesarContenedorItems(loadout[5]);

  const formatearArrayConfig = (nombre: string, lista: string[]): string => {
    if (lista.length === 0) {
      return `        ${nombre}[] = {};`;
    }
    const elementos = lista.map((elem) => `            "${elem}"`).join(',\n');
    return `        ${nombre}[] = {\n${elementos}\n        };`;
  };

  const lineas: string[] = [
    'class CfgRespawnInventory',
    '{',
    `    class ${className}`,
    '    {',
    `        displayName = "${displayName}";`,
    '        role = "Default";',
    formatearArrayConfig('weapons', weapons),
    formatearArrayConfig('magazines', magazines),
    formatearArrayConfig('items', items),
    formatearArrayConfig('linkedItems', linkedItems),
    `        uniformClass = "${uniformClass}";`,
    `        backpack = "${backpackClass}";`,
    '    };',
    '};',
  ];

  return lineas.join('\n');
}
