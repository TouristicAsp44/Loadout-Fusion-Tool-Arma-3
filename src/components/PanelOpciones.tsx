import React from 'react';
import { ModoFusion, OpcionesFusion } from '../lib/fusionarLoadouts';

interface PanelOpcionesProps {
  opciones: Required<OpcionesFusion>;
  onChange: (nuevasOpciones: Required<OpcionesFusion>) => void;
}

export const PanelOpciones: React.FC<PanelOpcionesProps> = ({
  opciones,
  onChange,
}) => {
  const cambiarModo = (modo: ModoFusion) => {
    onChange({ ...opciones, modo });
  };

  const toggleCampo = (
    campo: keyof Omit<Required<OpcionesFusion>, 'modo'>
  ) => {
    onChange({
      ...opciones,
      [campo]: !opciones[campo],
    });
  };

  return (
    <section
      aria-labelledby="titulo-opciones"
      className="bg-[#1C1F25] border border-[#2E333B] rounded-[8px] p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Selector de Modo: Añadir / Reemplazar */}
        <div className="flex flex-col gap-2">
          <span
            id="titulo-opciones"
            className="text-sm font-semibold text-[#E6E8EB]"
          >
            Modo de operación en contenedores
          </span>
          <div
            role="group"
            aria-labelledby="titulo-opciones"
            className="inline-flex bg-[#14161A] border border-[#2E333B] rounded-[8px] p-1 gap-1 self-start"
          >
            <button
              id="selector-modo-anadir"
              type="button"
              aria-pressed={opciones.modo === 'añadir'}
              onClick={() => cambiarModo('añadir')}
              className={`min-h-[44px] px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
                opciones.modo === 'añadir'
                  ? 'bg-[#8A9A5B] text-[#14161A]'
                  : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              Añadir
            </button>
            <button
              id="selector-modo-reemplazar"
              type="button"
              aria-pressed={opciones.modo === 'reemplazar'}
              onClick={() => cambiarModo('reemplazar')}
              className={`min-h-[44px] px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
                opciones.modo === 'reemplazar'
                  ? 'bg-[#8A9A5B] text-[#14161A]'
                  : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              Reemplazar
            </button>
          </div>
        </div>

        {/* Checkboxes de Contenedores (3, 4, 5) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[#E6E8EB]">
            Contenedores objetivo (conservan classname)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="chk-uniforme"
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium flex items-center gap-2.5 cursor-pointer select-none transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-[#8A9A5B] ${
                opciones.uniforme
                  ? 'bg-[#14161A] border-[#8A9A5B] text-[#E6E8EB]'
                  : 'bg-[#14161A]/60 border-[#2E333B] text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              <input
                id="chk-uniforme"
                type="checkbox"
                checked={opciones.uniforme}
                onChange={() => toggleCampo('uniforme')}
                className="w-4 h-4 accent-[#8A9A5B] rounded cursor-pointer focus:outline-none"
              />
              <span>Uniforme (3)</span>
            </label>

            <label
              htmlFor="chk-chaleco"
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium flex items-center gap-2.5 cursor-pointer select-none transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-[#8A9A5B] ${
                opciones.chaleco
                  ? 'bg-[#14161A] border-[#8A9A5B] text-[#E6E8EB]'
                  : 'bg-[#14161A]/60 border-[#2E333B] text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              <input
                id="chk-chaleco"
                type="checkbox"
                checked={opciones.chaleco}
                onChange={() => toggleCampo('chaleco')}
                className="w-4 h-4 accent-[#8A9A5B] rounded cursor-pointer focus:outline-none"
              />
              <span>Chaleco (4)</span>
            </label>

            <label
              htmlFor="chk-mochila"
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium flex items-center gap-2.5 cursor-pointer select-none transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-[#8A9A5B] ${
                opciones.mochila
                  ? 'bg-[#14161A] border-[#8A9A5B] text-[#E6E8EB]'
                  : 'bg-[#14161A]/60 border-[#2E333B] text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              <input
                id="chk-mochila"
                type="checkbox"
                checked={opciones.mochila}
                onChange={() => toggleCampo('mochila')}
                className="w-4 h-4 accent-[#8A9A5B] rounded cursor-pointer focus:outline-none"
              />
              <span>Mochila (5)</span>
            </label>
          </div>
        </div>

        {/* Opciones extra: Casco y Otros */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[#E6E8EB]">
            Sustitución directa de índices (opcional)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="chk-casco"
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium flex items-center gap-2.5 cursor-pointer select-none transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-[#8A9A5B] ${
                opciones.copiarCasco
                  ? 'bg-[#14161A] border-[#8A9A5B] text-[#E6E8EB]'
                  : 'bg-[#14161A]/60 border-[#2E333B] text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              <input
                id="chk-casco"
                type="checkbox"
                checked={opciones.copiarCasco}
                onChange={() => toggleCampo('copiarCasco')}
                className="w-4 h-4 accent-[#8A9A5B] rounded cursor-pointer focus:outline-none"
              />
              <span>Copiar casco (6)</span>
            </label>

            <label
              htmlFor="chk-otros"
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium flex items-center gap-2.5 cursor-pointer select-none transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-[#8A9A5B] ${
                opciones.copiarOtros
                  ? 'bg-[#14161A] border-[#8A9A5B] text-[#E6E8EB]'
                  : 'bg-[#14161A]/60 border-[#2E333B] text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              <input
                id="chk-otros"
                type="checkbox"
                checked={opciones.copiarOtros}
                onChange={() => toggleCampo('copiarOtros')}
                className="w-4 h-4 accent-[#8A9A5B] rounded cursor-pointer focus:outline-none"
              />
              <span>Copiar otros (0,1,2,7,8,9)</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};
