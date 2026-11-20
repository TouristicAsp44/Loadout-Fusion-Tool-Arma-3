# Bitácora de Versiones - Loadout Fusion Tool

## Versión 1.1.0

### Novedades
- Visor interactivo de diferencias para comparar las variaciones ítem por ítem en cada contenedor.
- Carga de archivos por arrastre (drag and drop) de ficheros con extensión sqf o txt sobre los cuadros de texto.
- Nuevos formatos de exportación en el panel de resultados:
  - Formato compacto de una sola línea.
  - Formato legible indentado.
  - Comando SQF ejecutable con setUnitLoadout.
  - Bloque CfgRespawnInventory para description.ext.
- Campo de filtrado por texto dentro del historial guardado.
- Normalizador mejorado que procesa comentarios SQF, referencias nulas y booleanos.
- Definiciones formales en TypeScript para las estructuras del juego.
- Comando de pruebas configurado en el gestor de paquetes.
- Automatizaciones de integración y publicación en repositorio.

### Ajustes
- Cambio de términos de uso y licencia del proyecto a MIT.
- Mensajes accesibles para lectores de pantalla al copiar texto.
- Rutas relativas en la configuración de empaquetado.

---

## Versión 1.0.0
- Lanzamiento inicial con fusión de uniforme, chaleco y mochila.
- Almacenamiento de hasta 30 configuraciones en memoria del navegador.
- Exportación y restauración de datos en JSON.
