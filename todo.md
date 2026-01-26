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
- rating (puntuación del usuario, 1-10)
- user_tags (etiquetas personalizadas, separadas por comas)
- times_played (contador de reproducciones)
- last_played (fecha última reproducción)
- created_at (fecha de agregado)

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

### Frontend - Sistema de Notificaciones
- [x] Componente Toast para notificaciones
- [x] ToastService global (inyectable)
- [x] Notificaciones tipo success, info, error
- [x] Animación de entrada suave con bounce
- [x] Desaparición automática después de 3 segundos
- [x] Estilos con transparencia y glow

### Frontend - Sidebar de Info Editable
- [x] Campos editables inline (título, artista, álbum, género)
- [x] Clic para editar, Enter/Escape/blur para guardar/cancelar
- [x] Icono de edición aparece al hover
- [x] Puntuación interactiva 1-10 con estrellas
- [x] Estadísticas automáticas (reproducciones, última reproducción)
- [x] Campo de notas editable (textarea)
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

### Frontend - Campos Info Sidebar (ampliado)
- [x] Campo Año editable (input type=number)
- [x] Campo Descripción editable (textarea)
- [x] Padding 24px para vista Info (separado de Lyrics)

---

## ✨ Funcionalidades Pendientes

### 1. Gestión de Biblioteca Musical
- [x] Seleccionar carpeta de música del PC (input en config modal)
- [x] Escanear recursivamente archivos de audio
- [x] Soportar formatos: MP3, FLAC, OGG, M4A, WAV, WMA, AAC, OPUS
- [x] Cargar metadata estándar desde archivos (JAudioTagger)
- [x] Detección de archivos duplicados/movidos por hash
- [x] Actualización incremental de biblioteca
- [ ] Limpieza automática de archivos eliminados (cleanup)
- [ ] Progreso del escaneo en tiempo real (websockets)

### 2. Sistema de Puntuaciones y Ranking
- [x] Puntuaciones manuales del usuario (1-10 estrellas)
- [x] Sistema de ranking personal con posiciones
- [x] API de ranking con inserciones eficientes O(1)
- [x] UI para gestionar ranking (drag & drop en sidebar, botones ▲▼ en cards)
- [x] Vista "Ranking" en sidebar derecho con lista ordenada

### 3. Playlists Dinámicas
- [ ] Crear playlists por **género**
- [ ] Crear playlists por **artista**
- [ ] Crear playlists por **etiquetas**
- [ ] Playlists personalizadas (selección manual)
- [ ] Guardar y cargar playlists

### 4. Modos de Reproducción
- [ ] **Modo Aleatorio**: reproducción shuffle
- [ ] **Modo En Orden**: reproducción secuencial
- [ ] **Modo IA Sugerido**: 
  - Llamada a LLM cada X canciones
  - Contexto: últimas canciones, puntuaciones, etiquetas
  - Sugerencia inteligente de siguiente canción

### 5. Controles de Reproducción (Backend)
- [ ] Reproducción real de audio
- [ ] Control de archivos de audio
- [ ] Lectura de metadata de archivos
- [ ] API REST para el frontend

---

## 🚀 Roadmap de Desarrollo

### Fase 1: MVP - Reproductor Básico ✅ (UI) / 🔄 (Backend)
- [x] Estructura del frontend Angular
- [x] UI de reproductor con controles
- [x] Layout con sidebars
- [x] Backend Spring Boot (estructura base)
- [x] Configuración de SQLite
- [x] Escaneo de carpeta y carga de archivos
- [ ] Reproducción real de audio
- [x] API REST básica (songs, playlists, ranking, library)

### Fase 2: Gestión de Datos
- [x] Sistema de puntuaciones (1-10 estrellas)
- [x] Sistema de ranking personal
- [x] Edición de metadata personalizada (año, descripción, notas)
- [ ] Sistema de etiquetas personalizables
- [ ] Búsqueda y filtrado avanzado

### Fase 3: Playlists y Modos
- [ ] Creación de playlists
- [ ] Modos de reproducción (aleatorio, en orden)
- [ ] Interfaz de gestión de playlists

### Fase 4: IA y Sugerencias
- [ ] Integración Spring AI
- [ ] Modo de reproducción con sugerencias IA
- [ ] Algoritmo de contexto para el LLM

### Fase 5: Pulido y Distribución
- [ ] Launcher automático (.bat/.exe)
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
- [ ] ¿Qué LLM usar para las sugerencias? (OpenAI, Claude, Ollama local, etc.)
- [ ] ¿Cada cuántas canciones hacer la llamada al LLM?
- [ ] ¿Incluir soporte para video musical?

---

## 🔧 Requisitos del Sistema
- Java 17+ (para Spring Boot)
- Node.js (para Angular)
- Sistema operativo: Windows (inicialmente, expansión a Linux/Mac posible)
