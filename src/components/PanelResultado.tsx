import React, { useRef, useState } from 'react';
import { Copy, Check, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ResultadoFusion } from '../lib/fusionarLoadouts';

interface PanelResultadoProps {
  fusion: ResultadoFusion | null;
}

export const PanelResultado: React.FC<PanelResultadoProps> = ({ fusion }) => {
  const [formatoCompacto, setFormatoCompacto] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const textoResultado = fusion
    ? formatoCompacto
      ? JSON.stringify(fusion.resultado)
      : JSON.stringify(fusion.resultado, null, 2)
    : '';

  const manejarCopiar = async () => {
    if (!textoResultado) return;

    let exito = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(textoResultado);
        exito = true;
      }
    } catch {
      exito = false;
    }

    if (!exito && textareaRef.current) {
      try {
        textareaRef.current.focus();
        textareaRef.current.select();
        document.execCommand('copy');
        exito = true;
      } catch {
        exito = false;
      }
    }

    if (exito) {
      setCopiado(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopiado(false);
      }, 2000);
    }
  };

  return (
    <section
      aria-labelledby="label-loadout-resultado"
      className="bg-[#1C1F25] border border-[#2E333B] rounded-[8px] p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label
          id="label-loadout-resultado"
          htmlFor="loadout-resultado"
          className="text-base font-semibold text-[#E6E8EB]"
        >
          Loadout Resultante
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Compacto / Formateado */}
          <div
            role="group"
            aria-label="Formato del resultado"
            className="inline-flex bg-[#14161A] border border-[#2E333B] rounded-[8px] p-1 gap-1"
          >
            <button
              type="button"
              aria-pressed={formatoCompacto}
              onClick={() => setFormatoCompacto(true)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-[6px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
                formatoCompacto
                  ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                  : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              Compacto
            </button>
            <button
              type="button"
              aria-pressed={!formatoCompacto}
              onClick={() => setFormatoCompacto(false)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-[6px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
                !formatoCompacto
                  ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                  : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
              }`}
            >
              Formateado
            </button>
          </div>

          {/* Botón Copiar */}
          <button
            type="button"
            onClick={manejarCopiar}
            disabled={!textoResultado}
            className={`min-h-[44px] px-4 py-2 rounded-[8px] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
              !textoResultado
                ? 'bg-[#14161A] border border-[#2E333B] text-[#9AA3AE] opacity-50 cursor-not-allowed'
                : copiado
                  ? 'bg-[#86EFAC] text-[#14161A]'
                  : 'bg-[#8A9A5B] text-[#14161A] hover:brightness-110 cursor-pointer'
            }`}
          >
            {copiado ? (
              <>
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Textarea de solo lectura */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="loadout-resultado"
          readOnly
          rows={6}
          value={textoResultado}
          placeholder="El resultado aparecerá aquí"
          className="w-full bg-[#14161A] border border-[#2E333B] rounded-[8px] p-3.5 font-mono text-sm text-[#E6E8EB] placeholder:text-[#9AA3AE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] resize-y"
        />
        {!textoResultado && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none sr-only"
          >
            El resultado aparecerá aquí
          </div>
        )}
      </div>

      {/* Resumen por contenedor, Avisos e Informativos */}
      {fusion &&
        (fusion.resumen.length > 0 ||
          fusion.avisos.length > 0 ||
          fusion.informativos.length > 0) && (
          <div
            aria-live="polite"
            className="flex flex-col gap-3 pt-3 border-t border-[#2E333B]"
          >
            {fusion.resumen.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-[#9AA3AE] tracking-wide">
                  Resumen de fusión por contenedor
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                  {fusion.resumen.map((linea, idx) => (
                    <li
                      key={idx}
                      className="py-1 text-sm text-[#E6E8EB] flex items-start gap-2 tabular-nums"
                    >
                      <CheckCircle2
                        className="w-4 h-4 text-[#86EFAC] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{linea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fusion.avisos.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#2E333B]/60">
                <h3 className="text-xs font-semibold text-[#FBBF24] tracking-wide">
                  Avisos de omisión
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {fusion.avisos.map((aviso, idx) => (
                    <li
                      key={idx}
                      className="py-1 text-sm text-[#FBBF24] flex items-start gap-2"
                    >
                      <AlertTriangle
                        className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{aviso}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fusion.informativos.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#2E333B]/60">
                <h3 className="text-xs font-semibold text-[var(--muted)] tracking-wide">
                  Sin cambios
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {fusion.informativos.map((infoMsg, idx) => (
                    <li
                      key={idx}
                      className="py-1 text-sm text-[var(--muted)] flex items-start gap-2"
                    >
                      <Info
                        className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{infoMsg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
    </section>
  );
};
