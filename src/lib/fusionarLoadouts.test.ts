import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fusionarLoadouts,
  LoadoutValidationError,
  calcularClaveItem,
  extraerClassnameItem,
  normalizarCadenaLoadout,
  generarSalidaFormateada,
} from './fusionarLoadouts';

function crearLoadoutBasePrueba(): unknown[] {
  return [
    ['arifle_MX_F', '', 'acc_pointer_IR', 'optic_Aco', ['30Rnd_65x39_caseless_mag', 30], [], ''],
    [],
    ['hgun_P07_F', '', '', '', ['16Rnd_9x21_Mag', 16], [], ''],
    [
      'U_B_CombatUniform_mcam',
      [
        ['FirstAidKit', 2],
        ['Chemlight_green', 1, 1],
      ],
    ],
    [
      'V_PlateCarrier1_rgr',
      [
        ['30Rnd_65x39_caseless_mag', 1, 30],
        ['HandGrenade', 1, 1],
        ['SmokeShell', 1, 1],
      ],
    ],
    [
      'B_AssaultPack_mcamo',
      [
        [['hgun_P07_F', '', '', '', ['16Rnd_9x21_Mag', 16], [], ''], 1],
        ['30Rnd_65x39_caseless_mag', 2, 20], // cargador parcial (20 balas)
      ],
    ],
    'H_HelmetB',
    'G_Combat',
    ['Binocular', '', '', '', [], [], ''],
    ['ItemMap', 'ItemGPS', 'ItemRadio', 'ItemCompass', 'ItemWatch', 'NVGoggles'],
  ];
}

function crearLoadoutObjetivoPrueba(): unknown[] {
  return [
    ['arifle_SPAR_01_blk_F', '', '', '', ['30Rnd_556x45_Stanag', 30], [], ''],
    [],
    [],
    [
      'U_B_CTRG_1',
      [
        ['FirstAidKit', 1],
      ],
    ],
    [
      'V_PlateCarrier2_rgr',
      [
        ['30Rnd_65x39_caseless_mag', 2, 30],
      ],
    ],
    [
      'B_Kitbag_rgr',
      [
        ['30Rnd_65x39_caseless_mag', 1, 30],
      ],
    ],
    'H_HelmetSpecB',
    'G_Tactical_Clear',
    [],
    ['ItemMap', '', 'ItemRadio', 'ItemCompass', 'ItemWatch', ''],
  ];
}

test('modo AÑADIR conserva classname del objetivo, suma claves iguales y añade nuevas al final', () => {
  const base = crearLoadoutBasePrueba();
  const objetivo = crearLoadoutObjetivoPrueba();

  const { resultado, resumen, avisos, cambios } = fusionarLoadouts(base, objetivo);

  assert.equal(avisos.length, 0);

  // Uniforme (3): conserva 'U_B_CTRG_1', FirstAidKit pasa de 1 a 3, Chemlight_green se añade al final
  assert.deepEqual(resultado[3], [
    'U_B_CTRG_1',
    [
      ['FirstAidKit', 3],
      ['Chemlight_green', 1, 1],
    ],
  ]);

  // Chaleco (4): conserva 'V_PlateCarrier2_rgr', suma 30Rnd_65x39_caseless_mag (2+1=3), añade HandGrenade y SmokeShell
  assert.deepEqual(resultado[4], [
    'V_PlateCarrier2_rgr',
    [
      ['30Rnd_65x39_caseless_mag', 3, 30],
      ['HandGrenade', 1, 1],
      ['SmokeShell', 1, 1],
    ],
  ]);

  assert.ok(
    resumen.includes('Chaleco: 3 unidades añadidas (1 entrada sumada, 2 nuevas)')
  );

  // Mochila (5): el cargador de 20 balas NO se suma al de 30 balas porque difiere munición en la clave
  assert.deepEqual(resultado[5], [
    'B_Kitbag_rgr',
    [
      ['30Rnd_65x39_caseless_mag', 1, 30],
      [['hgun_P07_F', '', '', '', ['16Rnd_9x21_Mag', 16], [], ''], 1],
      ['30Rnd_65x39_caseless_mag', 2, 20],
    ],
  ]);

  // Verificar que el array de cambios diff se pobló detalladamente
  assert.ok(cambios.length > 0);

  const cambioFak = cambios.find(
    (c) => c.contenedor === 'Uniforme' && c.classname === 'FirstAidKit'
  );
  assert.ok(cambioFak);
  assert.equal(cambioFak.tipo, 'sumado');
  assert.equal(cambioFak.cantidadAnterior, 1);
  assert.equal(cambioFak.cantidadNueva, 3);

  const cambioChemlight = cambios.find(
    (c) => c.contenedor === 'Uniforme' && c.classname === 'Chemlight_green'
  );
  assert.ok(cambioChemlight);
  assert.equal(cambioChemlight.tipo, 'añadido');
  assert.equal(cambioChemlight.cantidadAnterior, 0);
  assert.equal(cambioChemlight.cantidadNueva, 1);

  // No muta las entradas originales
  assert.equal((objetivo[4] as [string, [string, number, number][]
  ])[1].length, 1);
  assert.equal((objetivo[4] as [string, [string, number, number][]
  ])[1][0][1], 2);
});

test('detecta loadouts envueltos [loadout, identidad] y conserva envoltorio e identidad del OBJETIVO', () => {
  const base = [crearLoadoutBasePrueba(), [['FaceBase', 'SpeakerBase']]];
  const identidadObjetivo = ['Barklem', 'Male01ENG', ''];
  const objetivoEnvuelto = [crearLoadoutObjetivoPrueba(), identidadObjetivo];

  const { resultado } = fusionarLoadouts(base, objetivoEnvuelto);

  assert.equal(resultado.length, 2);
  assert.ok(Array.isArray(resultado[0]));
  assert.equal((resultado[0] as unknown[]).length, 10);
  assert.deepEqual(resultado[1], identidadObjetivo);
});

test('parseo tolerante acepta private _x =, punto y coma final y comillas simples', () => {
  const baseStr = `  private _miLoadout = [['arifle_MX_F','','','',[], [], ''],[],[],['U_B_CombatUniform_mcam',[['FirstAidKit',2]]],[],[],'H_HelmetB','',[],['ItemMap','','','','','']];  `;
  const objStr = JSON.stringify(crearLoadoutObjetivoPrueba());

  const { resultado, avisos, informativos } = fusionarLoadouts(baseStr, objStr, {
    uniforme: true,
    chaleco: true,
    mochila: false,
  });

  // Uniforme se fusionó (1 + 2 = 3 FirstAidKit)
  assert.deepEqual(resultado[3], ['U_B_CTRG_1', [['FirstAidKit', 3]]]);
  // Chaleco del base era [] -> debe haber un mensaje en informativos y 0 en avisos
  assert.equal(avisos.length, 0);
  assert.equal(informativos.length, 1);
  assert.match(informativos[0], /Chaleco/i);
});

test('modo REEMPLAZAR sustituye lista de ítems conservando classname del contenedor objetivo y registra diff reemplazado', () => {
  const base = crearLoadoutBasePrueba();
  const objetivo = crearLoadoutObjetivoPrueba();

  const { resultado, cambios } = fusionarLoadouts(base, objetivo, {
    modo: 'reemplazar',
    uniforme: false,
    chaleco: true,
    mochila: false,
  });

  assert.deepEqual(resultado[4], [
    'V_PlateCarrier2_rgr',
    [
      ['30Rnd_65x39_caseless_mag', 1, 30],
      ['HandGrenade', 1, 1],
      ['SmokeShell', 1, 1],
    ],
  ]);

  const cambiosChaleco = cambios.filter((c) => c.contenedor === 'Chaleco');
  assert.equal(cambiosChaleco.length, 3);
  assert.ok(cambiosChaleco.every((c) => c.tipo === 'reemplazado'));

  const magCambio = cambiosChaleco.find(
    (c) => c.classname === '30Rnd_65x39_caseless_mag'
  );
  assert.ok(magCambio);
  assert.equal(magCambio.cantidadAnterior, 2);
  assert.equal(magCambio.cantidadNueva, 1);
});

test('omite contenedor cuando el objetivo es [] y agrega aviso', () => {
  const base = crearLoadoutBasePrueba();
  const objetivo = crearLoadoutObjetivoPrueba();
  objetivo[5] = []; // sin mochila en objetivo

  const { resultado, avisos } = fusionarLoadouts(base, objetivo, {
    uniforme: false,
    chaleco: false,
    mochila: true,
  });

  assert.deepEqual(resultado[5], []);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /Mochila.*objetivo/i);
});

test('copiar casco (6) y copiar otros (0,1,2,7,8,9) sustituyen índices completos del objetivo', () => {
  const base = crearLoadoutBasePrueba();
  const objetivo = crearLoadoutObjetivoPrueba();

  const { resultado } = fusionarLoadouts(base, objetivo, {
    uniforme: false,
    chaleco: false,
    mochila: false,
    copiarCasco: true,
    copiarOtros: true,
  });

  assert.equal(resultado[6], 'H_HelmetB');
  assert.deepEqual(resultado[0], base[0]);
  assert.deepEqual(resultado[2], base[2]);
  assert.equal(resultado[7], 'G_Combat');
  assert.deepEqual(resultado[8], base[8]);
  assert.deepEqual(resultado[9], base[9]);
});

test('lanza LoadoutValidationError indicando cuál textarea falló (base u objetivo)', () => {
  const valido = JSON.stringify(crearLoadoutObjetivoPrueba());

  assert.throws(
    () => fusionarLoadouts('[1, 2, 3]', valido),
    (err: unknown) => {
      assert.ok(err instanceof LoadoutValidationError);
      assert.equal(err.campo, 'base');
      assert.match(err.message, /Loadout Base/);
      assert.match(err.message, /10 índices/);
      return true;
    }
  );

  assert.throws(
    () => fusionarLoadouts(valido, 'private _bad = [1, 2;'),
    (err: unknown) => {
      assert.ok(err instanceof LoadoutValidationError);
      assert.equal(err.campo, 'objetivo');
      assert.match(err.message, /Loadout Objetivo/);
      return true;
    }
  );
});

test('calcularClaveItem distingue cargadores con distinta munición y armas almacenadas', () => {
  const magLleno = ['30Rnd_65x39_caseless_mag', 2, 30];
  const magLlenoOtraCant = ['30Rnd_65x39_caseless_mag', 5, 30];
  const magParcial = ['30Rnd_65x39_caseless_mag', 2, 18];

  assert.equal(calcularClaveItem(magLleno), calcularClaveItem(magLlenoOtraCant));
  assert.notEqual(calcularClaveItem(magLleno), calcularClaveItem(magParcial));
});

test('extraerClassnameItem obtiene nombre de clase tanto de ítems planos como de armas anidadas', () => {
  assert.equal(extraerClassnameItem(['FirstAidKit', 2]), 'FirstAidKit');
  assert.equal(
    extraerClassnameItem([['arifle_MX_F', '', '', '', [], [], ''], 1]),
    'arifle_MX_F'
  );
  assert.equal(extraerClassnameItem('H_HelmetB'), 'H_HelmetB');
});

test('normalizarCadenaLoadout soporta comentarios de línea (//) y bloque (/* */)', () => {
  const sqfConComentarios = `
    // Comentario inicial
    /* Bloque
       multilínea de autoría */
    private _loadout = [
      ["arifle_MX_F", "", "", "", ["30Rnd_65x39_caseless_mag", 30], [], ""], // Arma primaria
      [],
      [],
      /* Comentario previo a contenedor */
      ["U_B_CombatUniform_mcam", [["FirstAidKit", 2]]],
      [],
      [],
      "H_HelmetB",
      "",
      [],
      ["ItemMap", "", "", "", "", ""]
    ]; // Fin de array
  `;

  const normalizado = normalizarCadenaLoadout(sqfConComentarios);
  const parsed = JSON.parse(normalizado);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 10);
  assert.equal(parsed[6], 'H_HelmetB');
  assert.deepEqual(parsed[3], ['U_B_CombatUniform_mcam', [['FirstAidKit', 2]]]);
});

test('normalizarCadenaLoadout preserva secuencias parecidas a comentarios dentro de strings', () => {
  const sqfConComentarioEnString = `
    [
      ["arifle_MX_F", "//no_comentario", "/*tampoco*/", "", [], [], ""],
      [], [], [], [], [], "", "", [], []
    ]
  `;
  const normalizado = normalizarCadenaLoadout(sqfConComentarioEnString);
  const parsed = JSON.parse(normalizado);
  assert.equal(parsed[0][1], '//no_comentario');
  assert.equal(parsed[0][2], '/*tampoco*/');
});

test('normalizarCadenaLoadout traduce palabras clave SQF (nil, objNull, ...) y booleanos a JSON válido', () => {
  const sqfConKeywords = `
    [
      ["arifle_MX_F", nil, objNull, grpNull, ["30Rnd_65x39_caseless_mag", 30], controlNull, displayNull],
      locationNull,
      taskNull,
      ["U_B_CombatUniform_mcam", [["ItemWatch", 1, TRUE], ["ItemCompass", 1, FALSE]]],
      [], [], "", "", [], []
    ]
  `;

  const normalizado = normalizarCadenaLoadout(sqfConKeywords);
  const parsed = JSON.parse(normalizado);

  assert.equal(parsed[0][1], null);
  assert.equal(parsed[0][2], null);
  assert.equal(parsed[0][3], null);
  assert.equal(parsed[0][5], null);
  assert.equal(parsed[0][6], null);
  assert.equal(parsed[1], null);
  assert.equal(parsed[2], null);
  assert.equal(parsed[3][1][0][2], true);
  assert.equal(parsed[3][1][1][2], false);
});

test('normalizarCadenaLoadout maneja mayúsculas/minúsculas en palabras clave y no altera substrings', () => {
  const sqfKeywordsMixtas = `
    [
      ["arifle_nil_test", NIL, ObjNull, True, False],
      [], [], [], [], [], "", "", [], []
    ]
  `;
  const normalizado = normalizarCadenaLoadout(sqfKeywordsMixtas);
  const parsed = JSON.parse(normalizado);
  assert.equal(parsed[0][0], 'arifle_nil_test');
  assert.equal(parsed[0][1], null);
  assert.equal(parsed[0][2], null);
  assert.equal(parsed[0][3], true);
  assert.equal(parsed[0][4], false);
});

test('generarSalidaFormateada produce formato compacto, formateado y SQF', () => {
  const loadout = crearLoadoutObjetivoPrueba();

  const compacto = generarSalidaFormateada(loadout, 'compacto');
  assert.equal(compacto, JSON.stringify(loadout));

  const formateado = generarSalidaFormateada(loadout, 'formateado');
  assert.equal(formateado, JSON.stringify(loadout, null, 2));

  const sqf = generarSalidaFormateada(loadout, 'sqf');
  assert.equal(sqf, `[player, ${JSON.stringify(loadout)}] call BIS_fnc_setUnitLoadout;`);
});

test('generarSalidaFormateada produce CfgRespawnInventory válido para description.ext', () => {
  const loadout = crearLoadoutBasePrueba();

  const cfg = generarSalidaFormateada(loadout, 'cfgRespawn', 'Escuadra Alpha');

  assert.match(cfg, /class CfgRespawnInventory/);
  assert.match(cfg, /class Escuadra_Alpha/);
  assert.match(cfg, /displayName = "Escuadra Alpha";/);
  assert.match(cfg, /weapons\[\] = \{[\s\S]*"arifle_MX_F"[\s\S]*"hgun_P07_F"/);
  assert.match(cfg, /linkedItems\[\] = \{[\s\S]*"V_PlateCarrier1_rgr"[\s\S]*"H_HelmetB"[\s\S]*"ItemMap"/);
  assert.match(cfg, /uniformClass = "U_B_CombatUniform_mcam";/);
  assert.match(cfg, /backpack = "B_AssaultPack_mcamo";/);
  assert.match(cfg, /items\[\] = \{[\s\S]*"FirstAidKit"/);
});

test('generarSalidaFormateada soporta loadout envuelto [loadout, identidad] en cfgRespawn', () => {
  const base = crearLoadoutBasePrueba();
  const envuelto = [base, ['Face1', 'Voice1']];

  const cfg = generarSalidaFormateada(envuelto, 'cfgRespawn', 'Tirador');
  assert.match(cfg, /class Tirador/);
  assert.match(cfg, /uniformClass = "U_B_CombatUniform_mcam";/);
  assert.match(cfg, /weapons\[\]/);
});
