/**
 * Ejemplo realista de loadouts de Arma 3 (kit médico + munición táctica como Base,
 * y operador de fusilero como Objetivo) para demostrar la fusión de contenedores,
 * suma de cargadores con la misma munición y armas almacenadas.
 */
export const EJEMPLO_LOADOUT_BASE = JSON.stringify([
  [
    'arifle_MX_F',
    '',
    'acc_pointer_IR',
    'optic_Hamr',
    ['30Rnd_65x39_caseless_mag', 30],
    [],
    '',
  ],
  [],
  ['hgun_P07_F', '', '', '', ['16Rnd_9x21_Mag', 16], [], ''],
  [
    'U_B_CombatUniform_mcam',
    [
      ['FirstAidKit', 2],
      ['ACE_morphine', 2],
      ['Chemlight_green', 1, 1],
    ],
  ],
  [
    'V_PlateCarrier1_rgr',
    [
      ['30Rnd_65x39_caseless_mag', 1, 30],
      ['HandGrenade', 1, 1],
      ['SmokeShellGreen', 1, 1],
    ],
  ],
  [
    'B_AssaultPack_mcamo',
    [
      ['ToolKit', 1],
      ['30Rnd_65x39_caseless_mag', 2, 30],
      [['hgun_Pistol_heavy_01_F', '', 'acc_flashlight_pistol', 'optic_MRD', ['11Rnd_45ACP_Mag', 11], [], ''], 1],
    ],
  ],
  'H_HelmetB_grass',
  'G_Combat',
  ['Rangefinder', '', '', '', [], [], ''],
  ['ItemMap', 'ItemGPS', 'ItemRadio', 'ItemCompass', 'ItemWatch', 'NVGoggles'],
]);

export const EJEMPLO_LOADOUT_OBJETIVO = JSON.stringify([
  [
    'arifle_SPAR_01_blk_F',
    '',
    'acc_pointer_IR',
    'optic_Holosight_blk_F',
    ['30Rnd_556x45_Stanag', 30],
    [],
    'bipod_01_F_blk',
  ],
  ['launch_NLAW_F', '', '', '', [], [], ''],
  ['hgun_P07_khk_F', '', '', '', ['16Rnd_9x21_Mag', 16], [], ''],
  [
    'U_B_CTRG_Soldier_F',
    [
      ['FirstAidKit', 1],
      ['ACE_epinephrine', 1],
    ],
  ],
  [
    'V_PlateCarrier2_rgr_noflag_F',
    [
      ['30Rnd_65x39_caseless_mag', 4, 30],
      ['16Rnd_9x21_Mag', 2, 16],
    ],
  ],
  [
    'B_Kitbag_rgr',
    [
      ['30Rnd_65x39_caseless_mag', 2, 30],
      ['DemoCharge_Remote_Mag', 1, 1],
    ],
  ],
  'H_HelmetSpecB_paint2',
  'G_Tactical_Clear',
  ['Binocular', '', '', '', [], [], ''],
  ['ItemMap', 'B_UavTerminal', 'ItemRadio', 'ItemCompass', 'ItemWatch', 'NVGoggles_OPFOR'],
]);
