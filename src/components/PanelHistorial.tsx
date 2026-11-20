import React, { useRef, useState, useMemo } from 'react';
import {
  Save,
  Download,
  Upload,
  FolderOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { OpcionesFusion } from '../lib/fusionarLoadouts';
import {
  ConfiguracionGuardada,
  MAX_HISTORIAL,
  guardarEnHistorial,
  escribirHistorialLocal,
  fusionarHistorialImportado,
  filtrarHistorial,
} from '../lib/historialStorage';

interface PanelHistorialProps {
  historial: ConfiguracionGuardada[];
  onActualizarHistorial: (nuevaLista: ConfiguracionGuardada[]) => void;
  onCargarConfiguracion: (cfg: ConfiguracionGuardada) => void;
  baseActual: string;
  objetivoActual: string;
  opcionesActuales: Required<OpcionesFusion>;
}

export const PanelHistorial: React.FC<PanelHistorialProps> = ({
  historial,
  onActualizarHistorial,
  onCargarConfiguracion,
  baseActual,
  objetivoActual,
  opcionesActuales,
}) => {
  const [nombreConfig, setNombreConfig] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [feedbackHistorial, setFeedbackHistorial] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const mostrarFeedback = (tipo: 'ok' | 'error', texto: string) => {
    setFeedbackHistorial({ tipo, texto });
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackHistorial(null);
    }, 4000);
  };

  // Filtrado de historial reactivo en tiempo real
  const historialFiltrado = useMemo(() => {
    if (!busqueda.trim()) return historial;
    if (typeof filtrarHistorial === 'function') {
      return filtrarHistorial(historial, busqueda);
    }
    const q = busqueda.trim().toLowerCase();
    return historial.filter((item) => item.nombre.toLowerCase().includes(q));
  }, [historial, busqueda]);

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = nombreConfig.trim();
    if (!limpio) {
      mostrarFeedback(
        'error',
        'Escribe un nombre para guardar la configuración.'
      );
      return;
    }

    const { lista, estado } = guardarEnHistorial(historial, {
      nombre: limpio,
      base: baseActual,
      objetivo: objetivoActual,
      opciones: opcionesActuales,
    });

    onActualizarHistorial(lista);
    if (estado === 'actualizada') {
      mostrarFeedback('ok', `Actualizada: "${limpio}"`);
    } else {
      mostrarFeedback('ok', `Configuración "${limpio}" guardada`);
    }
  };

  const manejarClickEliminar = (id: string) => {
    if (confirmandoId === id) {
      const nuevaLista = historial.filter((item) => item.id !== id);
      escribirHistorialLocal(nuevaLista);
      onActualizarHistorial(nuevaLista);
      setConfirmandoId(null);
      mostrarFeedback('ok', 'Configuración eliminada del historial.');
    } else {
      setConfirmandoId(id);
    }
  };

  const manejarExportar = () => {
    const contenido = JSON.stringify(historial, null, 2);
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'arma3_loadout_fusion_history.json';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    mostrarFeedback('ok', 'Historial exportado correctamente.');
  };

  const manejarArchivoImportado = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    try {
      const texto = await archivo.text();
      const resultado = fusionarHistorialImportado(historial, texto);
      if (!resultado.ok) {
        mostrarFeedback('error', resultado.error);
      } else {
        onActualizarHistorial(resultado.lista);
        mostrarFeedback(
          'ok',
          `Historial importado y fusionado (${resultado.importadas} entradas procesadas).`
        );
      }
    } catch {
      mostrarFeedback(
        'error',
        'No se pudo leer el archivo seleccionado. El historial existente no fue modificado.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatearFechaLocal = (iso: string): string => {
    try {
      const fecha = new Date(iso);
      if (Number.isNaN(fecha.getTime())) return iso;
      return fecha.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section
      aria-labelledby="titulo-historial"
      className="bg-[#1C1F25] border border-[#2E333B] rounded-[8px] p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2
            id="titulo-historial"
            className="text-base font-semibold text-[#E6E8EB]"
          >
            Historial de configuraciones
          </h2>
          <p className="text-xs text-[#9AA3AE] mt-0.5 tabular-nums">
            Guarda ambos loadouts, opciones y modo en tu navegador ({historial.length}/{MAX_HISTORIAL} guardadas)
          </p>
        </div>

        {/* Botones Exportar e Importar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={manejarExportar}
            className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#14161A] border border-[#2E333B] text-sm font-medium text-[#E6E8EB] hover:border-[#8A9A5B] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
          >
            <Download className="w-4 h-4 text-[#9AA3AE]" aria-hidden="true" />
            <span>Exportar historial</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[#14161A] border border-[#2E333B] text-sm font-medium text-[#E6E8EB] hover:border-[#8A9A5B] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
          >
            <Upload className="w-4 h-4 text-[#9AA3AE]" aria-hidden="true" />
            <span>Importar historial</span>
          </button>
          <label htmlFor="input-importar-historial" className="sr-only">
            Archivo JSON de historial para importar
          </label>
          <input
            ref={fileInputRef}
            id="input-importar-historial"
            type="file"
            accept="application/json,.json"
            onChange={manejarArchivoImportado}
            className="hidden"
          />
        </div>
      </div>

      {/* Formulario para guardar configuración */}
      <form
        onSubmit={manejarGuardar}
        className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
      >
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            htmlFor="historial-nombre"
            className="text-sm font-medium text-[#E6E8EB]"
          >
            Nombre de la configuración
          </label>
          <input
            id="historial-nombre"
            type="text"
            value={nombreConfig}
            onChange={(e) => setNombreConfig(e.target.value)}
            placeholder="Ej. Kit médico de escuadra + fusilero CTRG"
            className="min-h-[44px] w-full bg-[#14161A] border border-[#2E333B] rounded-[8px] px-3.5 py-2 text-sm text-[#E6E8EB] placeholder:text-[#9AA3AE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
          />
        </div>

        <button
          type="submit"
          className="min-h-[44px] px-5 py-2 rounded-[8px] bg-[#8A9A5B] text-[#14161A] text-sm font-semibold hover:brightness-110 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
        >
          <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Guardar configuración</span>
        </button>
      </form>

      {/* Buscador y filtro en tiempo real con contador de coincidencias */}
      {historial.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#9AA3AE] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar configuración por nombre..."
              aria-label="Buscar configuración por nombre"
              className="w-full bg-[#14161A] border border-[#2E333B] rounded-[8px] pl-9 pr-9 py-2 text-sm text-[#E6E8EB] placeholder:text-[#9AA3AE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9AA3AE] hover:text-[#E6E8EB] focus:outline-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="text-xs text-[#9AA3AE] tabular-nums shrink-0">
            {busqueda.trim() ? (
              <span>
                Mostrando <strong className="text-[#86EFAC] font-semibold">{historialFiltrado.length}</strong> de {historial.length} configuraciones
              </span>
            ) : (
              <span>{historial.length} configuraciones registradas</span>
            )}
          </div>
        </div>
      )}

      {/* Mensaje de estado / feedback en UI */}
      {feedbackHistorial && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-[8px] px-3.5 py-2.5 text-sm flex items-center gap-2 border ${
            feedbackHistorial.tipo === 'error'
              ? 'bg-[#14161A] border-[#F87171] text-[#F87171]'
              : 'bg-[#14161A] border-[#86EFAC]/50 text-[#86EFAC]'
          }`}
        >
          {feedbackHistorial.tipo === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedbackHistorial.texto}</span>
        </div>
      )}

      {/* Lista de configuraciones filtradas */}
      {historial.length === 0 ? (
        <div className="bg-[#14161A] border border-[#2E333B] rounded-[8px] p-6 text-center text-sm text-[#9AA3AE]">
          Aún no hay configuraciones guardadas
        </div>
      ) : historialFiltrado.length === 0 ? (
        <div className="bg-[#14161A] border border-[#2E333B] rounded-[8px] p-6 text-center text-sm text-[#9AA3AE] flex flex-col items-center gap-2">
          <span>No se encontraron configuraciones que coincidan con &quot;{busqueda}&quot;</span>
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="text-xs text-[#8A9A5B] hover:underline cursor-pointer"
          >
            Limpiar filtro de búsqueda
          </button>
        </div>
      ) : (
        <ul
          aria-label="Lista de configuraciones guardadas"
          className="max-h-[560px] overflow-y-auto divide-y divide-[#2E333B] border border-[#2E333B] rounded-[8px] bg-[#14161A]"
        >
          {historialFiltrado.map((item) => {
            const pidiendoConfirmacion = confirmandoId === item.id;
            return (
              <li
                key={item.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#1C1F25]/60 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[#E6E8EB] truncate">
                    {item.nombre}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA3AE] tabular-nums">
                    <span>{formatearFechaLocal(item.fechaIso)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Modo: {item.modo === 'reemplazar' ? 'Reemplazar' : 'Añadir'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNombreConfig(item.nombre);
                      onCargarConfiguracion(item);
                      mostrarFeedback('ok', `Configuración "${item.nombre}" cargada.`);
                    }}
                    aria-label={`Cargar ${item.nombre}`}
                    className="min-h-[44px] px-3.5 py-2 rounded-[8px] bg-[#1C1F25] border border-[#2E333B] text-sm font-medium text-[#E6E8EB] hover:border-[#8A9A5B] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B]"
                  >
                    <FolderOpen className="w-4 h-4 text-[#8A9A5B]" aria-hidden="true" />
                    <span>Cargar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => manejarClickEliminar(item.id)}
                    onBlur={() => {
                      if (pidiendoConfirmacion) {
                        setConfirmandoId(null);
                      }
                    }}
                    aria-label={
                      pidiendoConfirmacion
                        ? `Confirmar eliminar ${item.nombre}`
                        : `Eliminar ${item.nombre}`
                    }
                    className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] ${
                      pidiendoConfirmacion
                        ? 'bg-[#F87171] border-[#F87171] text-[#14161A] font-semibold'
                        : 'bg-[#1C1F25] border-[#2E333B] text-[#F87171] hover:border-[#F87171]'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {pidiendoConfirmacion ? '¿Confirmar?' : 'Eliminar'}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
