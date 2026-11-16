import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fusionarLoadouts,
  LoadoutValidationError,
  calcularClaveItem,
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

  const { resultado, resumen, avisos } = fusionarLoadouts(base, objetivo);

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

test('modo REEMPLAZAR sustituye lista de ítems conservando classname del contenedor objetivo', () => {
  const base = crearLoadoutBasePrueba();
  const objetivo = crearLoadoutObjetivoPrueba();

  const { resultado } = fusionarLoadouts(base, objetivo, {
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
