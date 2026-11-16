# Loadout Fusion Tool — Arma 3

Herramienta web para **pasar los ítems de los contenedores de un loadout (base) a los contenedores de otro loadout (objetivo)** en Arma 3, sin tocar el uniforme, chaleco o mochila del objetivo. Pegas dos loadouts, eliges qué contenedores fusionar y copias el loadout resultante.

Es una herramienta **"ciega"**: no comprueba si los ítems caben en el contenedor de destino.

## Qué hace

- Toma los ítems de **Uniforme (3), Chaleco (4) y Mochila (5)** del loadout base y los lleva al mismo contenedor del loadout objetivo.
- **Conserva el classname** del contenedor objetivo (por ejemplo, el chaleco sigue siendo el mismo); solo cambia su contenido.
- Calcula el resultado **en vivo** mientras escribes, sin botón de "generar".
- Muestra un **resumen por contenedor** y mensajes de aviso o informativos.
- Guarda un **historial de configuraciones** con nombre en tu navegador.

## Uso rápido

1. Pega el **Loadout Base** (origen de ítems) y el **Loadout Objetivo** (destino) en los dos cuadros de texto. El botón **Cargar ejemplo** rellena ambos con datos de prueba.
2. Elige el **modo** y los **contenedores** a fusionar.
3. Revisa el resultado y el resumen.
4. Pulsa **Copiar** y pega el resultado donde importes loadouts en Arma 3 (por ejemplo, la importación desde el portapapeles del Arsenal).

## Modos de operación

| Modo | Qué hace |
|---|---|
| **Añadir** (por defecto) | Suma los ítems del base a los que ya tiene el objetivo. |
| **Reemplazar** | Sustituye la lista de ítems del objetivo por la del base. |

### Reglas del modo Añadir

- Los ítems del objetivo se conservan en su orden; los nuevos se añaden **al final**, en el orden del base.
- Un ítem se considera "el mismo" si coincide su **classname** y, en el caso de cargadores o granadas, también su **munición**. Si coincide, se **suman las cantidades**.
- Cargadores con distinta munición (por ejemplo, 20 y 30 balas) **no se suman**: quedan como entradas separadas.
- Las armas almacenadas idénticas se suman; las distintas se añaden como entrada nueva.

Ejemplo (chaleco):

| | Ítems |
|---|---|
| Base | `["FirstAidKit",2]`, `["30Rnd_65x39_caseless_mag",1,30]` |
| Objetivo | `["FirstAidKit",1]`, `["30Rnd_65x39_caseless_mag",1,20]` |
| Resultado | `["FirstAidKit",3]`, `["30Rnd_65x39_caseless_mag",1,20]`, `["30Rnd_65x39_caseless_mag",1,30]` |

## Opciones

- **Uniforme / Chaleco / Mochila:** marcados por defecto; puedes fusionar solo los que quieras.
- **Sustitución directa de índices (opcional):**
  - *Casco (6):* reemplaza el casco del objetivo por el del base.
  - *Otros (0, 1, 2, 7, 8, 9):* reemplaza armas, gafas, binoculares e ítems asignados por los del base.
- **Formato de salida:** *Compacto* (una línea, por defecto) o *Formateado* (con sangría, para leer).

## Entradas aceptadas

- Un loadout de **10 índices**, tal como lo exporta Arma 3.
- El formato **envuelto** `[loadout, identidad]`. La salida conserva la **identidad del objetivo**.
- Texto copiado de un script: se acepta un prefijo `private _x =`, un `;` final y comillas simples.

El loadout de Arma 3 tiene esta estructura de índices:

| Índice | Contenido |
|---|---|
| 0 / 1 / 2 | Arma primaria / lanzador / arma corta |
| 3 / 4 / 5 | Uniforme / chaleco / mochila (`["classname", [ítems]]`) |
| 6 / 7 | Casco / gafas |
| 8 | Binoculares |
| 9 | Ítems asignados |

## Avisos y mensajes

- **Avisos (amarillo):** un contenedor se **omitió** porque el loadout objetivo no lo tiene (por ejemplo, no lleva mochila).
- **Sin cambios (gris, informativo):** el loadout base no tiene ese contenedor o no tiene ítems en él. Es normal si sueles vaciar los contenedores.
- **Errores:** aparecen bajo el cuadro de texto que los causó, indicando si el problema está en el loadout base o en el objetivo.

## Historial de configuraciones

- Guarda ambos loadouts, las opciones y el modo bajo un **nombre**.
- Si guardas con un nombre que ya existe (sin distinguir mayúsculas), se **actualiza** esa entrada.
- Máximo **30** configuraciones; al llegar al límite se descartan las más antiguas.
- Se guarda en el `localStorage` del navegador (clave `arma3_loadout_fusion_history`): **no se comparte entre dispositivos ni navegadores** y se pierde si limpias los datos del sitio.
- Usa **Exportar historial** para descargar un JSON de respaldo e **Importar historial** para recuperarlo. Al importar, las entradas con el mismo `id` se actualizan y el resto se combina; si el archivo es inválido, el historial actual no se modifica.

## Limitaciones

- **No valida capacidad:** si el contenedor de destino no tiene espacio para todos los ítems, el resultado puede no cargarse completo en el juego. Verifícalo al importar.
- **No valida classnames** ni comprueba que los mods necesarios estén cargados.
- El parser no admite comentarios (`//`) ni valores como `nil`.

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm ci          # instalar dependencias
npm run dev     # servidor de desarrollo en http://localhost:3000
npm run build   # compilar para producción (carpeta dist/)
npm run lint    # comprobar tipos con TypeScript
```

Pruebas de la lógica (usan el ejecutor de pruebas integrado de Node):

```bash
npx tsx --test src/lib/*.test.ts
```

### Estructura

```
src/
├── App.tsx                        # Pantalla principal y cálculo en vivo
├── components/
│   ├── PanelOpciones.tsx          # Modo, contenedores y sustitución de índices
│   ├── PanelResultado.tsx         # Salida, copiar, resumen y avisos
│   └── PanelHistorial.tsx         # Guardar, cargar, eliminar, exportar e importar
└── lib/
    ├── fusionarLoadouts.ts        # Lógica de fusión (función pura)
    ├── historialStorage.ts        # Persistencia en localStorage
    ├── ejemploLoadouts.ts         # Datos del botón "Cargar ejemplo"
    └── *.test.ts                  # Pruebas
```

**Stack:** React 19, TypeScript, Tailwind CSS 4, Vite.

La lógica de fusión está separada de la interfaz en `fusionarLoadouts(base, objetivo, opciones)`, que devuelve `{ resultado, resumen, avisos, informativos }` y no modifica sus entradas.

## Origen del proyecto

Generado con Google AI Studio (modo *Build*) y refinado con revisiones de código y pruebas. Los archivos `metadata.json` y `.env.example` son de la plantilla de AI Studio; esta app **no usa la API de Gemini** ni necesita claves.

## Licencia

Apache-2.0 (indicada en el encabezado de `src/App.tsx`). Si vas a distribuir el proyecto, añade un archivo `LICENSE` con el texto completo.
