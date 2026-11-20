import React, { useState, useMemo } from 'react';
import { Package, Shield, Shirt, ChevronDown, ChevronRight, Layers, Filter } from 'lucide-react';
import type { CambioItemDiff } from '../lib/fusionarLoadouts';

export interface VisorDiffProps {
  cambios?: CambioItemDiff[];
  className?: string;
  defaultAbierto?: boolean;
}

type FiltroContenedor = 'todos' | 'Uniforme' | 'Chaleco' | 'Mochila';

export const VisorDiff: React.FC<VisorDiffProps> = ({
  cambios = [],
  className = '',
  defaultAbierto = true,
}) => {
  const [abierto, setAbierto] = useState<boolean>(defaultAbierto);
  const [filtro, setFiltro] = useState<FiltroContenedor>('todos');

  const totalCambios = cambios.length;

  const gruposPorContenedor = useMemo(() => {
    const mapa: Record<'Uniforme' | 'Chaleco' | 'Mochila', CambioItemDiff[]> = {
      Uniforme: [],
      Chaleco: [],
      Mochila: [],
    };
    for (const c of cambios) {
      if (mapa[c.contenedor]) {
        mapa[c.contenedor].push(c);
      }
    }
    return mapa;
  }, [cambios]);

  const contenedoresFiltrados = useMemo(() => {
    const lista: Array<{ nombre: 'Uniforme' | 'Chaleco' | 'Mochila'; items: CambioItemDiff[] }> = [];
    if (filtro === 'todos' || filtro === 'Uniforme') {
      if (gruposPorContenedor.Uniforme.length > 0) {
        lista.push({ nombre: 'Uniforme', items: gruposPorContenedor.Uniforme });
      }
    }
    if (filtro === 'todos' || filtro === 'Chaleco') {
      if (gruposPorContenedor.Chaleco.length > 0) {
        lista.push({ nombre: 'Chaleco', items: gruposPorContenedor.Chaleco });
      }
    }
    if (filtro === 'todos' || filtro === 'Mochila') {
      if (gruposPorContenedor.Mochila.length > 0) {
        lista.push({ nombre: 'Mochila', items: gruposPorContenedor.Mochila });
      }
    }
    return lista;
  }, [filtro, gruposPorContenedor]);

  const renderIconoContenedor = (nombre: 'Uniforme' | 'Chaleco' | 'Mochila') => {
    switch (nombre) {
      case 'Uniforme':
        return <Shirt className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />;
      case 'Chaleco':
        return <Shield className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />;
      case 'Mochila':
        return <Package className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />;
    }
  };

  const renderBadge = (cambio: CambioItemDiff) => {
    if (cambio.tipo === 'añadido') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/30 whitespace-nowrap"
          title={`Añadido: +${cambio.cantidadNueva} unidad(es)`}
        >
          Añadido (+{cambio.cantidadNueva})
        </span>
      );
    }
    if (cambio.tipo === 'sumado') {
      const de = cambio.cantidadAnterior ?? 0;
      const a = cambio.cantidadNueva;
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30 whitespace-nowrap"
          title={`Cantidad sumada de ${de} a ${a}`}
        >
          Sumado (de {de} a {a})
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#8A9A5B]/20 text-[#8A9A5B] border border-[#8A9A5B]/40 whitespace-nowrap"
        title="Contenedor reemplazado"
      >
        Reemplazado
      </span>
    );
  };

  return (
    <div
      className={`border border-[#2E333B] bg-[#1C1F25] rounded-[8px] overflow-hidden ${className}`}
      data-testid="visor-diff"
    >
      {/* Encabezado colapsable */}
      <div className="flex items-center justify-between p-3.5 sm:px-4 bg-[#14161A]/40 border-b border-[#2E333B]">
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          aria-controls="diff-content"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#E6E8EB] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9A5B] rounded-[4px] cursor-pointer"
        >
          {abierto ? (
            <ChevronDown className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />
          )}
          <Layers className="w-4 h-4 text-[#8A9A5B] shrink-0" aria-hidden="true" />
          <span>Diferencial de ítems (Diff visual)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#14161A] border border-[#2E333B] text-[#9AA3AE] tabular-nums font-mono">
            {totalCambios} {totalCambios === 1 ? 'cambio' : 'cambios'}
          </span>
        </button>

        {abierto && totalCambios > 0 && (
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#9AA3AE] hidden sm:inline-block" aria-hidden="true" />
            <div
              role="group"
              aria-label="Filtrar por contenedor"
              className="inline-flex bg-[#14161A] border border-[#2E333B] rounded-[6px] p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => setFiltro('todos')}
                className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                  filtro === 'todos'
                    ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                    : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
                }`}
              >
                Todos ({totalCambios})
              </button>
              {gruposPorContenedor.Uniforme.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltro('Uniforme')}
                  className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filtro === 'Uniforme'
                      ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                      : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
                  }`}
                >
                  Uniforme ({gruposPorContenedor.Uniforme.length})
                </button>
              )}
              {gruposPorContenedor.Chaleco.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltro('Chaleco')}
                  className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filtro === 'Chaleco'
                      ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                      : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
                  }`}
                >
                  Chaleco ({gruposPorContenedor.Chaleco.length})
                </button>
              )}
              {gruposPorContenedor.Mochila.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltro('Mochila')}
                  className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filtro === 'Mochila'
                      ? 'bg-[#8A9A5B] text-[#14161A] font-semibold'
                      : 'text-[#9AA3AE] hover:text-[#E6E8EB]'
                  }`}
                >
                  Mochila ({gruposPorContenedor.Mochila.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenido expandible */}
      {abierto && (
        <div id="diff-content" className="p-4 flex flex-col gap-4">
          {totalCambios === 0 ? (
            <p className="text-xs text-[#9AA3AE] italic py-2">
              No se han detectado modificaciones o diferencias en los contenedores fusionados.
            </p>
          ) : contenedoresFiltrados.length === 0 ? (
            <p className="text-xs text-[#9AA3AE] italic py-2">
              No hay cambios que coincidan con el filtro seleccionado.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {contenedoresFiltrados.map(({ nombre, items }) => (
                <div
                  key={nombre}
                  className="bg-[#14161A] border border-[#2E333B] rounded-[6px] overflow-hidden"
                >
                  {/* Encabezado del contenedor */}
                  <div className="px-3 py-2 bg-[#1C1F25]/80 border-b border-[#2E333B] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderIconoContenedor(nombre)}
                      <span className="text-xs font-semibold text-[#E6E8EB] tracking-wide">
                        {nombre}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#9AA3AE]">
                      {items.length} {items.length === 1 ? 'ítem modificado' : 'ítems modificados'}
                    </span>
                  </div>

                  {/* Lista de cambios */}
                  <ul className="divide-y divide-[#2E333B]/60">
                    {items.map((item, idx) => (
                      <li
                        key={`${item.clave}-${idx}`}
                        className="p-2.5 sm:px-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-[#1C1F25]/40 transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-xs sm:text-sm text-[#E6E8EB] font-medium break-all select-all">
                            {item.classname}
                          </span>
                          {item.detalles && (
                            <span className="text-[11px] text-[#9AA3AE] font-mono mt-0.5">
                              {item.detalles}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 self-start sm:self-center">
                          {renderBadge(item)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
