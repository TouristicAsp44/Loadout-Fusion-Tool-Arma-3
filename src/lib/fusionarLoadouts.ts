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

export interface ResultadoFusion {
  resultado: unknown[];
  resumen: string[];
  avisos: string[];
  informativos: string[];
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

interface LoadoutDesenvuelto {
  loadoutInterno: unknown[];
  envuelto: boolean;
  identidad: unknown;
}

/**
 * Normaliza una cadena SQF / JSON de Arma 3 eliminando prefijos como `private _x =`,
 * punto y coma final y convirtiendo comillas simples a comillas dobles válidas en JSON.
 */
export function normalizarCadenaLoadout(raw: string): string {
  let texto = raw.trim();

  // Quitar comentarios de bloque o línea iniciales si existieran y prefijos tipo "private _x =" o "_loadout ="
  texto = texto.replace(/^(?:private\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*/i, '');

  // Quitar ";" final (uno o varios) junto con espacios
  texto = texto.replace(/;+\s*$/, '').trim();

  // Convertir cadenas con comillas simples '...' a comillas dobles "..."
  // respetando comillas dobles ya existentes y secuencias escapadas
  let resultado = '';
  let i = 0;
  let estado: 'fuera' | 'doble' | 'simple' = 'fuera';

  while (i < texto.length) {
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
      } else {
        resultado += ch;
        i++;
      }
    } else if (estado === 'doble') {
      if (ch === '\\' && i + 1 < texto.length) {
        resultado += ch + texto[i + 1];
        i += 2;
      } else if (ch === '"' && texto[i + 1] === '"') {
        // En SQF "" dentro de "..." representa una comilla escapada
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
      if (ch === '\\' && i + 1 < texto.length) {
        const next = texto[i + 1];
        if (next === "'") {
          resultado += "'";
        } else {
          resultado += '\\' + next;
        }
        i += 2;
      } else if (ch === "'" && texto[i + 1] === "'") {
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

    // Regla: Si el contenedor base es [] o no tiene ítems: no cambia nada y agrega un aviso.
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
        if (Array.isArray(item) && typeof item[1] === 'number') {
          totalUnidades += item[1];
        } else if (Array.isArray(item)) {
          totalUnidades += Number(item[1]) || 0;
        }
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
          entradaExistente[1] = cantidadActual + cantidadBase;
          entradasSumadas += 1;
          unidadesAnadidas += cantidadBase;
        } else {
          itemsObjetivoActuales.push(structuredClone(itemBase));
          entradasNuevas += 1;
          unidadesAnadidas += cantidadBase;
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
  };
}
