/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { FileText, RotateCcw, AlertCircle } from 'lucide-react';
import {
  fusionarLoadouts,
  desenvolverLoadout,
  LoadoutValidationError,
  OpcionesFusion,
  ResultadoFusion,
} from './lib/fusionarLoadouts';
import {
  EJEMPLO_LOADOUT_BASE,
  EJEMPLO_LOADOUT_OBJETIVO,
} from './lib/ejemploLoadouts';
import {
  ConfiguracionGuardada,
  leerHistorialLocal,
} from './lib/historialStorage';
import { PanelOpciones } from './components/PanelOpciones';
import { PanelResultado } from './components/PanelResultado';
import { PanelHistorial } from './components/PanelHistorial';

const OPCIONES_INICIALES: Required<OpcionesFusion> = {
  modo: 'añadir',
  uniforme: true,
  chaleco: true,
  mochila: true,
  copiarCasco: false,
  copiarOtros: false,
};

export default function App() {
  const [baseInput, setBaseInput] = useState<string>('');
  const [objetivoInput, setObjetivoInput] = useState<string>('');
  const [opciones, setOpciones] =
    useState<Required<OpcionesFusion>>(OPCIONES_INICIALES);

  const [errorBase, setErrorBase] = useState<string | null>(null);
  const [errorObjetivo, setErrorObjetivo] = useState<string | null>(null);
  const [resultadoFusion, setResultadoFusion] =
    useState<ResultadoFusion | null>(null);

  const [historial, setHistorial] = useState<ConfiguracionGuardada[]>(() =>
    leerHistorialLocal()
  );

  // Recalcular automáticamente con debounce de 300 ms al escribir o cambiar opciones
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const baseTrim = baseInput.trim();
      const objTrim = objetivoInput.trim();

      // Estado vacío: sin entradas no se muestra error
      if (!baseTrim && !objTrim) {
        setErrorBase(null);
        setErrorObjetivo(null);
        setResultadoFusion(null);
        return;
      }

      let baseValido = false;
      let objValido = false;

      if (baseTrim) {
        try {
          desenvolverLoadout(baseTrim, 'base');
          setErrorBase(null);
          baseValido = true;
        } catch (err) {
          if (err instanceof LoadoutValidationError) {
            setErrorBase(err.message);
          } else {
            setErrorBase('Error en Loadout Base: formato inválido.');
          }
        }
      } else {
        setErrorBase(null);
      }

      if (objTrim) {
        try {
          desenvolverLoadout(objTrim, 'objetivo');
          setErrorObjetivo(null);
          objValido = true;
        } catch (err) {
          if (err instanceof LoadoutValidationError) {
            setErrorObjetivo(err.message);
          } else {
            setErrorObjetivo('Error en Loadout Objetivo: formato inválido.');
          }
        }
      } else {
        setErrorObjetivo(null);
      }

      if (baseValido && objValido) {
        try {
          const res = fusionarLoadouts(baseTrim, objTrim, opciones);
          setResultadoFusion(res);
        } catch (err) {
          if (err instanceof LoadoutValidationError) {
            if (err.campo === 'base') setErrorBase(err.message);
            if (err.campo === 'objetivo') setErrorObjetivo(err.message);
          }
          setResultadoFusion(null);
        }
      } else {
        setResultadoFusion(null);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [baseInput, objetivoInput, opciones]);

  const manejarCargarEjemplo = () => {
    setBaseInput(EJEMPLO_LOADOUT_BASE);
    setObjetivoInput(EJEMPLO_LOADOUT_OBJETIVO);
  };

  const manejarLimpiarCampos = () => {
    setBaseInput('');
    setObjetivoInput('');
    setOpciones(OPCIONES_INICIALES);
  };

  const manejarCargarDesdeHistorial = (cfg: ConfiguracionGuardada) => {
    setBaseInput(cfg.base);
    setObjetivoInput(cfg.objetivo);
    setOpciones({
      ...cfg.opciones,
      modo: cfg.modo,
    });
  };

  return (
    <div className="min-h-screen bg-[#14161A] text-[#E6E8EB] flex flex-col">
      {/* Encabezado */}
      <header className="border-b border-[#2E333B] bg-[#1C1F25]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#E6E8EB]">
              Loadout Fusion Tool
            </h1>
            <p className="text-sm text-[#9AA3AE] mt-1">
              Añade los ítems de un loadout base a los contenedores de un loadout objetivo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={manejarCargarEjemplo}
              className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#14161A] border border-[#2E333B] text-sm font-medium text-[#E6E8EB] hover:border-[#8A9A5B] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
            >
              <FileText className="w-4 h-4 text-[#8A9A5B]" aria-hidden="true" />
              <span>Cargar ejemplo</span>
            </button>

            {(baseInput || objetivoInput) && (
              <button
                type="button"
                onClick={manejarLimpiarCampos}
                className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#14161A] border border-[#2E333B] text-sm font-medium text-[#9AA3AE] hover:text-[#E6E8EB] hover:border-[#2E333B] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Dos textareas monoespaciados (6 filas): 2 columnas desde 768px (md), 1 debajo */}
        <section
          aria-label="Entradas de Loadouts"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Loadout Base */}
          <div className="bg-[#1C1F25] border border-[#2E333B] rounded-[8px] p-5 flex flex-col gap-2">
            <label
              htmlFor="loadout-base"
              className="text-sm font-semibold text-[#E6E8EB]"
            >
              Loadout Base (origen de ítems)
            </label>
            <textarea
              id="loadout-base"
              rows={6}
              value={baseInput}
              onChange={(e) => setBaseInput(e.target.value)}
              placeholder='Pega aquí el array de 10 índices o [loadout, identidad] (acepta "private _x = ...;")'
              aria-invalid={Boolean(errorBase)}
              aria-describedby={errorBase ? 'error-loadout-base' : undefined}
              className={`w-full bg-[#14161A] rounded-[8px] p-3.5 font-mono text-sm text-[#E6E8EB] placeholder:text-[#9AA3AE]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] resize-y border ${
                errorBase ? 'border-[#F87171]' : 'border-[#2E333B]'
              }`}
            />
            <div aria-live="polite" className="min-h-[20px]">
              {errorBase && (
                <p
                  id="error-loadout-base"
                  className="text-xs font-medium text-[#F87171] flex items-center gap-1.5 mt-1"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{errorBase}</span>
                </p>
              )}
            </div>
          </div>

          {/* Loadout Objetivo */}
          <div className="bg-[#1C1F25] border border-[#2E333B] rounded-[8px] p-5 flex flex-col gap-2">
            <label
              htmlFor="loadout-objetivo"
              className="text-sm font-semibold text-[#E6E8EB]"
            >
              Loadout Objetivo (destino)
            </label>
            <textarea
              id="loadout-objetivo"
              rows={6}
              value={objetivoInput}
              onChange={(e) => setObjetivoInput(e.target.value)}
              placeholder='Pega aquí el loadout de destino cuyos contenedores recibirán los ítems'
              aria-invalid={Boolean(errorObjetivo)}
              aria-describedby={
                errorObjetivo ? 'error-loadout-objetivo' : undefined
              }
              className={`w-full bg-[#14161A] rounded-[8px] p-3.5 font-mono text-sm text-[#E6E8EB] placeholder:text-[#9AA3AE]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] resize-y border ${
                errorObjetivo ? 'border-[#F87171]' : 'border-[#2E333B]'
              }`}
            />
            <div aria-live="polite" className="min-h-[20px]">
              {errorObjetivo && (
                <p
                  id="error-loadout-objetivo"
                  className="text-xs font-medium text-[#F87171] flex items-center gap-1.5 mt-1"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{errorObjetivo}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Panel de Opciones */}
        <PanelOpciones opciones={opciones} onChange={setOpciones} />

        {/* Panel de Resultado y Resumen */}
        <PanelResultado fusion={resultadoFusion} />

        {/* Panel de Historial */}
        <PanelHistorial
          historial={historial}
          onActualizarHistorial={setHistorial}
          onCargarConfiguracion={manejarCargarDesdeHistorial}
          baseActual={baseInput}
          objetivoActual={objetivoInput}
          opcionesActuales={opciones}
        />
      </main>
    </div>
  );
}
