import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConfiguracionGuardada,
  MAX_HISTORIAL,
  STORAGE_KEY,
  guardarEnHistorial,
  fusionarHistorialImportado,
  leerHistorialLocal,
  filtrarHistorial,
} from './historialStorage';
import { OpcionesFusion } from './fusionarLoadouts';

const OPCIONES_PRUEBA: Required<OpcionesFusion> = {
  modo: 'añadir',
  uniforme: true,
  chaleco: true,
  mochila: true,
  copiarCasco: false,
  copiarOtros: false,
};

// Mock de window.localStorage para entorno Node
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
  clear: (): void => {
    store.clear();
  },
};

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: mockLocalStorage },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  store.clear();
});

test('respeta el límite máximo de 30 entradas en el historial', () => {
  let lista: ConfiguracionGuardada[] = [];

  for (let i = 1; i <= 35; i++) {
    const res = guardarEnHistorial(lista, {
      nombre: `Configuración ${i}`,
      base: `base_${i}`,
      objetivo: `obj_${i}`,
      opciones: OPCIONES_PRUEBA,
    });
    lista = res.lista;
  }

  assert.equal(lista.length, MAX_HISTORIAL);
  assert.equal(MAX_HISTORIAL, 30);
  // La más reciente (35) debe estar al principio y las 5 primeras (1..5) descartadas
  assert.equal(lista[0].nombre, 'Configuración 35');
  assert.equal(lista[29].nombre, 'Configuración 6');

  const desdeStorage = leerHistorialLocal();
  assert.equal(desdeStorage.length, 30);
  assert.equal(desdeStorage[0].nombre, 'Configuración 35');
});

test('sobrescribe configuración existente por nombre sin distinguir mayúsculas/minúsculas', () => {
  const inicial = guardarEnHistorial([], {
    nombre: 'Escuadra Alfa',
    base: 'base_original',
    objetivo: 'objetivo_original',
    opciones: OPCIONES_PRUEBA,
  });

  assert.equal(inicial.estado, 'creada');
  assert.equal(inicial.lista.length, 1);
  const idOriginal = inicial.lista[0].id;

  const sobrescrita = guardarEnHistorial(inicial.lista, {
    nombre: 'escuadra ALFA',
    base: 'base_nueva',
    objetivo: 'objetivo_nuevo',
    opciones: { ...OPCIONES_PRUEBA, modo: 'reemplazar' },
  });

  assert.equal(sobrescrita.estado, 'actualizada');
  assert.equal(sobrescrita.lista.length, 1);
  assert.equal(sobrescrita.lista[0].id, idOriginal);
  assert.equal(sobrescrita.lista[0].nombre, 'escuadra ALFA');
  assert.equal(sobrescrita.lista[0].base, 'base_nueva');
  assert.equal(sobrescrita.lista[0].modo, 'reemplazar');
});

test('importación rechaza JSON inválido o estructura incorrecta sin modificar el historial existente', () => {
  const { lista: historialInicial } = guardarEnHistorial([], {
    nombre: 'Kit Médico Base',
    base: '[[],[],[],[],[],[],"","",[],[]]',
    objetivo: '[[],[],[],[],[],[],"","",[],[]]',
    opciones: OPCIONES_PRUEBA,
  });

  const snapshotStorageAntes = store.get(STORAGE_KEY);

  // Caso 1: Sintaxis JSON rota
  const resSintaxisInvalida = fusionarHistorialImportado(
    historialInicial,
    '{ json_invalido: [1, 2'
  );
  assert.equal(resSintaxisInvalida.ok, false);
  assert.equal(store.get(STORAGE_KEY), snapshotStorageAntes);
  assert.deepEqual(leerHistorialLocal(), historialInicial);

  // Caso 2: JSON válido pero no es un array
  const resNoArray = fusionarHistorialImportado(
    historialInicial,
    JSON.stringify({ id: '1', nombre: 'Test' })
  );
  assert.equal(resNoArray.ok, false);
  assert.equal(store.get(STORAGE_KEY), snapshotStorageAntes);

  // Caso 3: Array con objetos que no cumplen el esquema (faltan campos requeridos)
  const resEsquemaInvalido = fusionarHistorialImportado(
    historialInicial,
    JSON.stringify([{ id: '123', nombre: '' }])
  );
  assert.equal(resEsquemaInvalido.ok, false);
  assert.equal(store.get(STORAGE_KEY), snapshotStorageAntes);
  assert.deepEqual(leerHistorialLocal(), historialInicial);
});

test('filtrarHistorial devuelve la lista completa cuando el query está vacío o solo contiene espacios', () => {
  const lista: ConfiguracionGuardada[] = [
    {
      id: '1',
      nombre: 'Alpha',
      fechaIso: new Date().toISOString(),
      base: 'base1',
      objetivo: 'obj1',
      modo: 'añadir',
      opciones: OPCIONES_PRUEBA,
    },
    {
      id: '2',
      nombre: 'Bravo',
      fechaIso: new Date().toISOString(),
      base: 'base2',
      objetivo: 'obj2',
      modo: 'reemplazar',
      opciones: { ...OPCIONES_PRUEBA, modo: 'reemplazar' },
    },
  ];

  assert.equal(filtrarHistorial(lista, '').length, 2);
  assert.equal(filtrarHistorial(lista, '   ').length, 2);
});

test('filtrarHistorial busca por nombre, modo, o contenido de loadout de forma insensible a mayúsculas', () => {
  const lista: ConfiguracionGuardada[] = [
    {
      id: 'cfg-medic',
      nombre: 'Médico de Combate CTRG',
      fechaIso: new Date().toISOString(),
      base: 'arifle_MX_F FirstAidKit',
      objetivo: 'U_B_CTRG_1',
      modo: 'añadir',
      opciones: OPCIONES_PRUEBA,
    },
    {
      id: 'cfg-sniper',
      nombre: 'Francotirador M320',
      fechaIso: new Date().toISOString(),
      base: 'srifle_LRR_F',
      objetivo: 'U_B_GhillieSuit',
      modo: 'reemplazar',
      opciones: { ...OPCIONES_PRUEBA, modo: 'reemplazar' },
    },
  ];

  // Buscar por nombre
  const porNombre = filtrarHistorial(lista, 'médico');
  assert.equal(porNombre.length, 1);
  assert.equal(porNombre[0].id, 'cfg-medic');

  // Buscar por contenido en base/objetivo
  const porArma = filtrarHistorial(lista, 'LRR_F');
  assert.equal(porArma.length, 1);
  assert.equal(porArma[0].id, 'cfg-sniper');

  // Buscar por modo
  const porModo = filtrarHistorial(lista, 'reemplazar');
  assert.equal(porModo.length, 1);
  assert.equal(porModo[0].id, 'cfg-sniper');

  // Buscar por id
  const porId = filtrarHistorial(lista, 'cfg-medic');
  assert.equal(porId.length, 1);

  // Sin coincidencias
  const sinResultados = filtrarHistorial(lista, 'inexistente');
  assert.equal(sinResultados.length, 0);
});
