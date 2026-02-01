# Kuicat - Reproductor de Música Estilo Radio 🎵

## 🎯 Visión del Proyecto
Reproductor de música **código abierto**, sencillo y potente que funciona con la música local del usuario. Combina la simplicidad de un reproductor tradicional con inteligencia artificial para sugerencias musicales inteligentes.

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Backend**: Spring Boot (Java) - Puerto 8741
- **Frontend**: Angular 19+ (standalone components, SCSS)
- **Base de Datos**: SQLite (archivo local)
- **IA**: Spring AI (integración con LLM para sugerencias)
- **Distribución**: Aplicación local con launcher automático (.bat/.exe)

### Diseño Visual
- **Tema**: Negro (#0a0a0a) + Amarillo (#FFD700)
- **Fuentes**: VT323 (display), Space Mono (body)
- **Iconos**: Material Icons

### Modelo de Datos (Híbrido)
**Metadata Estándar** (leída de archivos):
- Título, artista, álbum, género (tags nativos del archivo)

**Datos Personalizados** (SQLite):
```
Tabla: songs
- id (PK, auto-increment)
- file_path (ruta completa del archivo)
- file_hash (hash del contenido para detectar duplicados/movimientos)
- title, artist, album, year, genre, duration (metadata del archivo)
- description (descripción del usuario)
- ranking (posición en ranking personal, null = sin rankear)
- play_count (contador de reproducciones)
- last_played (fecha última reproducción)
- notes (notas del usuario)
- lyrics (letra de la canción)
- created_at, updated_at (timestamps)

Tabla: playlists
- id (PK)
- name (nombre de la playlist)
- type (genre/artist/tags/custom)
- filter_criteria (JSON con criterios de filtrado)
- created_at

Tabla: playlist_songs
- playlist_id (FK)
- song_id (FK)
- order_index
```

---

## ✅ Completado

### Frontend - UI Base
- [x] Proyecto Angular creado (`web/`)
- [x] Estilos globales con tema retro (negro + amarillo)
- [x] Layout principal con sidebars
- [x] Player bar con controles básicos (play/pause, prev/next, volumen, progreso)
- [x] Main view con cover centrado
- [x] Componentes flotantes (hover):
  - [x] Botones sidebar izquierda (Lyrics/Info)
  - [x] Botones sidebar derecha (Playlist/Próximas)
  - [x] Card "Now Playing" (esquina inferior izquierda)
  - [x] Card "Next Song" (esquina inferior derecha)
- [x] Sidebars funcionales (Lyrics, Info, Playlist, Próximas)
- [x] Player bar y controles aparecen al hover
- [x] Cards aparecen con hover en cualquier parte de la app

### Frontend - Sistema de Playlists
- [x] Sidebar derecho muestra lista de playlists (no canciones)
- [x] Cada playlist muestra icono, nombre y contador de canciones
- [x] Indicador visual (borde + fondo amarillo) cuando la canción actual está en una playlist
- [x] Botón "+" para agregar canción actual a playlist
- [x] Botón "-" para quitar canción actual de playlist
- [x] Botón de reproducir playlist (aparece al hover)
- [x] Dropdown en card "Now Playing" para agregar/quitar de playlists
- [x] Dropdown se cierra al hacer clic fuera
- [x] Indicador visual en dropdown del card (igual que sidebar)

### Frontend - Gestión Avanzada de Playlists
- [x] Conexión real con backend (PlaylistService completo)
- [x] Modal de configuración de playlist (Nombre + Selector de Iconos)
- [x] Creación y eliminación de playlists
- [x] Modal selector de canciones con sistema de pestañas:
  - [x] Vista "En esta playlist": Reordenamiento visual (Drag & Drop)
  - [x] Vista "Agregar canciones": Búsqueda y adición desde biblioteca
- [x] Reproducción contextual (solo se resalta la playlist fuente activa)
- [x] Reproducción de "Todas las canciones" (Biblioteca virtual)

### Backend - Optimización
- [x] Configuración de HikariCP para concurrencia en SQLite (Pool size 10)

## 🚧 En Progreso / Pendiente
- [x] ToastService global (inyectable)
- [x] Notificaciones tipo success, info, error
- [x] Animación de entrada suave con bounce
- [x] Desaparición automática después de 3 segundos
- [x] Estilos con transparencia y glow

### Frontend - Sidebar de Info Editable
- [x] Campos editables inline (título, artista, álbum, género, año)
- [x] Clic para editar, Enter/Escape/blur para guardar/cancelar
- [x] Icono de edición aparece al hover
- [x] Posición en ranking con icono de trofeo 🏆
- [x] Estadísticas automáticas:
  - [x] Reproducciones
  - [x] Última reproducción
  - [x] Tiempo total escuchado (playCount × duration)
  - [x] Posición por reproducciones (#X de Y)
  - [x] Frecuencia de escucha (veces/día o veces/semana)
- [x] Campo de descripción editable (debajo de artista)
- [x] Campo de notas editable (textarea al final)
- [x] Toast de confirmación al guardar

### Frontend - Sidebar de Lyrics
- [x] Vista vacía con call-to-action para añadir letra
- [x] Editor de lyrics con textarea grande
- [x] Botones Guardar/Cancelar
- [x] Vista de lectura con formato pre-wrap
- [x] Botón de edición en el header
- [x] Scrollbar minimalista (aparece al hover)

### Frontend - Modal de Configuración
- [x] Componente Modal reutilizable con `<dialog>` nativo
- [x] Backdrop con blur y animación
- [x] Cierra con clic fuera o Escape
- [x] ConfigModal para configuración de la app
- [x] Input para ruta de carpeta de música
- [x] Botón de explorar (pendiente: conectar con API nativa)
- [x] Conectado al botón de settings en player bar
- [x] Botón de escanear biblioteca con estado de loading
- [x] Muestra resultados del escaneo (nuevas, actualizadas, errores)

### Backend - Escaneo de Biblioteca
- [x] `MusicScannerService` - Escanea carpetas recursivamente
- [x] Soporte: MP3, FLAC, OGG, M4A, WAV, WMA, AAC, OPUS
- [x] Librería JAudioTagger para leer metadata
- [x] Extrae: título, artista, álbum, año, género, compositor, duración, track#, disc#, lyrics
- [x] Detección de archivos movidos (por hash MD5)
- [x] Actualización incremental (solo archivos modificados)
- [x] `LibraryController` - Endpoints: POST /api/library/scan, POST /api/library/cleanup

### Frontend - Sistema de Ranking Personal
- [x] `RankingService` Angular (core/services)
- [x] Vista de ranking en sidebar derecho con drag & drop
- [x] Botón de ranking en controles del sidebar derecho
- [x] Now Playing Card con controles de ranking:
  - [x] Muestra posición actual (#1, #2, etc.)
  - [x] Botones ▲▼ para subir/bajar posición
  - [x] Tooltip rico con preview de canción a intercambiar
  - [x] Botón para añadir al ranking si no está rankeada
  - [x] Confirmación al quitar del ranking
- [x] Next Song Card con mismos controles de ranking
- [x] Componente ConfirmDialog reutilizable

### Frontend - Mejoras de UI
- [x] Control de volumen rediseñado:
  - [x] Solo icono visible normalmente
  - [x] Popup vertical al hacer hover
  - [x] Barra visual con relleno de color (sin thumb)
  - [x] Soporte para arrastrar (click + drag)

### Backend - Sistema de Ranking Personal
- [x] Campo `ranking` en entidad Song (null = sin rankear)
- [x] `RankingService` - Algoritmo con gaps de 1000 para O(1) inserciones
- [x] `RankingController` - Endpoints:
  - GET /api/ranking (lista ordenada con posición visual)
  - POST /api/ranking/{id} (añadir con posición)
  - PUT /api/ranking/{id} (mover a nueva posición)
  - DELETE /api/ranking/{id} (quitar del ranking)
- [x] Rebalanceo automático cuando no hay espacio
- [x] Frontend: `RankingService` Angular
- [x] Campo `rankPosition` calculado dinámicamente en API de songs
- [x] SQLite configurado con WAL mode para concurrencia

### Frontend - Sincronización de Ranking
- [x] `RankingService` centralizado con signals para estado reactivo
- [x] Método `refreshVisibleSongs()` en PlayerService para actualizar actual y siguiente
- [x] Tooltips ricos en ambas tarjetas (Now Playing y Next Song)
- [x] Cambios de ranking sincronizan ambas tarjetas automáticamente

### Frontend - Campos Info Sidebar (ampliado)
- [x] Campo Año editable (input type=number)
- [x] Campo Descripción editable (textarea)
- [x] Padding 24px para vista Info (separado de Lyrics)

### Sistema de Reproducción Multimedia
- [x] `MediaController` - Streaming de audio y video con Range requests
- [x] `PlayerService` Angular - Servicio central de reproducción
- [x] Soporte para formatos de video: MP4, WEBM
- [x] `MusicScannerService` actualizado para escanear videos
- [x] Integración PlayerBar con PlayerService
- [x] MainView con soporte de video HTML5
- [x] **MKV**: Conversión automática con FFmpeg (script PowerShell recursivo)

---

## ✨ Funcionalidades Pendientes

### 1. Gestión de Biblioteca Musical
- [x] Seleccionar carpeta de música del PC (input en config modal)
- [x] Escanear recursivamente archivos de audio y video
- [x] Soportar formatos audio: MP3, FLAC, OGG, M4A, WAV, WMA, AAC, OPUS
- [x] Soportar formatos video: MP4, WEBM
- [x] Cargar metadata estándar desde archivos (JAudioTagger)
- [x] Detección de archivos duplicados/movidos por hash
- [x] Actualización incremental de biblioteca

### 2. Sistema de Ranking Personal
- [x] Sistema de ranking personal con posiciones
- [x] Icono de trofeo 🏆 en Now Playing, Next Song e Info sidebar
- [x] API de ranking con inserciones eficientes O(1)
- [x] UI para gestionar ranking (drag & drop en sidebar, botones ▲▼ en cards)
- [x] Vista "Ranking" en sidebar derecho con lista ordenada
- [x] Eliminado campo rating (puntuación 1-10) - reemplazado por ranking

### 3. Playlists Dinámicas
- [x] **Playlist Rápida** - Reproducción instantánea por artista o género
  - [x] Backend: Endpoints `/api/songs/artists/count`, `/api/songs/genres/count`
  - [x] Backend: Endpoints `/api/songs/by-artist`, `/api/songs/by-genre`
  - [x] Frontend: Servicio `QuickPlaylistService`
  - [x] Frontend: UI integrada en sidebar derecho con buscador
  - [x] Secciones colapsables para Artistas y Géneros
  - [x] Contador de canciones por categoría
- [x] Playlists personalizadas (selección manual)
- [x] Guardar y cargar playlists

### 4. Modos de Reproducción
- [x] **Modo Secuencial**: reproducción en orden original
- [x] **Modo Aleatorio**: shuffle visual (Fisher-Yates reordena la cola)
- [x] **Filtros de Ranking**:
  - [x] Solo rankeadas (todas las que tienen ranking)
  - [x] Top 50, Top 100, Top 200, Top 300, Top 400, Top 500
  - [x] Solo no rankeadas (modo descubrir)
- [x] **Ordenar por**: Artista A-Z, Género A-Z
- [x] **Toggle Invertir orden**: Funciona con cualquier modo

### Optimizaciones
- [x] Thumbnail queue system: Máximo 2 generaciones concurrentes para evitar saturar el navegador
- [x] **Auto-fetch duración de videos**: 
  - [x] `DurationService` Angular con cola serializada
  - [x] Obtención de duración via HTML5 `preload="metadata"`
  - [x] Actualización automática en BD via PATCH endpoint
  - [x] Delay de 150ms entre operaciones para evitar SQLITE_BUSY
  - [x] Método `updateSongLocally()` en RankingService para actualizar UI sin recargar

### 5. Controles de Reproducción
- [x] Reproducción real de audio/video (HTML5)
- [x] Streaming con soporte de seeking (Range requests)
- [x] PlayerService centralizado en Angular
- [x] Carátulas/thumbnails extraídas de los archivos
- [x] Lectura de metadata de archivos
- [x] API REST para el frontend

---

## 🚀 Roadmap de Desarrollo

### Fase 1: MVP - Reproductor Básico ✅ (UI) / 🔄 (Backend)
- [x] Estructura del frontend Angular
- [x] UI de reproductor con controles
- [x] Layout con sidebars
- [x] Backend Spring Boot (estructura base)
- [x] Configuración de SQLite
- [x] Escaneo de carpeta y carga de archivos
- [x] Reproducción real de audio
- [x] API REST básica (songs, playlists, ranking, library)

### Fase 2: Gestión de Datos
- [x] Sistema de ranking personal (reemplaza puntuación 1-10)
- [x] Edición de metadata personalizada (año, descripción, notas, lyrics)
- [x] Estadísticas automáticas de escucha
- [x] Modelo de datos simplificado (eliminados campos no usados: format, bitrate, sampleRate, albumArtist, trackNumber, discNumber, composer, coverPath)

### Fase 3: Playlists y Modos
- [x] Creación de playlists
- [x] Modos de reproducción (aleatorio, en orden, ranking, por artista/género)
- [x] Interfaz de gestión de playlists
- [x] Filtros Top X para ranking

### Fase 4: IA y Sugerencias
- [x] Integración Spring AI (OpenAI gpt-4o-mini)
- [x] Configuración segura de API keys (AES-256-GCM, cifrado por PC)
- [x] Auto-fill de metadata con IA (título, artista, álbum, género, año, descripción)
- [x] **Modo Radio IA** - Locutor virtual entre canciones:
  - [x] Configuración de radio (nombre estación, personalidad, voz TTS)
  - [x] Modal de configuración con personalidades predefinidas (energetic, classic, casual, etc.)
  - [x] Generación de scripts con GPT-4o-mini
  - [x] Síntesis de voz con Kokoro TTS (via Replicate API)
  - [x] Voces múltiples: af_bella, af_sarah, am_adam, am_michael, bf_emma, bm_george, etc.
  - [x] Modo Dual Host (2 locutores con diálogo alternado)
  - [x] Pre-generación de anuncios durante reproducción
  - [x] Transiciones suaves: fadeout → anuncio → música de fondo → fadein
  - [x] Timing dinámico: música de fondo empieza 15s antes del final del anuncio
  - [x] Frecuencia configurable (cada X canciones)
  - [x] Proxy de audio para evitar CORS + amplificación 2.5x (Web Audio API)
  - [x] Botón anterior reproduce último anuncio (primeros 5s de canción)
  - [x] Nombre del oyente opcional para saludos personalizados
  - [x] Prompts mejorados para contenido más interesante (fun facts, trivia, etc.)
  - [x] **Memoria de sesión**: FIFO queue (~4000 chars) de scripts anteriores
  - [x] **Identidad de sesión**: Generada por LLM (tema, vibe, narrativa, estilo DJ)
  - [x] **Historial de canciones**: Últimas 10 reproducidas + próximas 10 en cola
  - [x] **userInstructions**: Textarea para guiar narrativa del DJ
  - [x] **Nombres de DJ configurables**: djName1/djName2 (default: nombre de voz)
  - [x] **Ranking en prompts**: Posición en ranking personal de cada canción
  - [ ] **BUG**: LLM a veces confunde canción anterior/siguiente en los anuncios (habla de la siguiente como si fuera la anterior)
- [x] **Persistencia de sesión**: Guardar estado al cerrar (canción actual, playlist, posición, config radio)
  - [x] Backend: PlayerState entity + service + controller
  - [x] Backend: Radio memory persisted in RadioConfig (scripts, identity, songs)
  - [x] Frontend: PlayerStateService con auto-save cada 60s
  - [x] Frontend: Restauración de estado al iniciar
  - [x] sendBeacon al cerrar pestaña para no perder estado

### Fase 5: Pulido y Distribución
- [x] Launcher automático (.bat/.exe) - Kuicat.exe con banner ASCII
- [ ] Documentación
- [ ] Preparar para código abierto (README, licencia, contribución)

---

## 🎨 Notas de Diseño
- Interfaz sencilla y limpia
- Tema oscuro (negro + amarillo)
- Componentes flotantes que aparecen al hover
- Tipografía retro (VT323)

---

## 📋 Decisiones Técnicas Pendientes
- [x] ¿Qué LLM usar para las sugerencias? → **OpenAI gpt-4o-mini** ($0.15/1M input, $0.60/1M output)
- [x] ¿Cada cuántas canciones hacer la llamada al LLM? → **Configurable en UI** (default: cada 3)
- [x] ¿Incluir soporte para video musical? → Sí (MP4, M4A ya soportados)

---

## 🔧 Requisitos del Sistema
- Java 17+ (para Spring Boot)
- Node.js (para Angular)
- Sistema operativo: Windows (inicialmente, expansión a Linux/Mac posible)
