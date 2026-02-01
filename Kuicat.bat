@echo off
chcp 65001 >nul
title Kuicat - Iniciando...

:: Configuración
set BACKEND_PORT=8741
set FRONTEND_PORT=4287
set BROWSER_URL=http://localhost:%FRONTEND_PORT%

:: Colores
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║    ██╗  ██╗██╗   ██╗██╗ ██████╗ █████╗ ████████╗             ║
echo ║    ██║ ██╔╝██║   ██║██║██╔════╝██╔══██╗╚══██╔══╝             ║
echo ║    █████╔╝ ██║   ██║██║██║     ███████║   ██║                ║
echo ║    ██╔═██╗ ██║   ██║██║██║     ██╔══██║   ██║                ║
echo ║    ██║  ██╗╚██████╔╝██║╚██████╗██║  ██║   ██║                ║
echo ║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝                ║
echo ║                                                              ║
echo ║              Reproductor de Música con IA                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Verificar que estamos en el directorio correcto
if not exist "app\pom.xml" (
    echo [ERROR] No se encontró app\pom.xml
    echo         Ejecuta este script desde la carpeta raíz de Kuicat
    pause
    exit /b 1
)

if not exist "web\package.json" (
    echo [ERROR] No se encontró web\package.json
    echo         Ejecuta este script desde la carpeta raíz de Kuicat
    pause
    exit /b 1
)

:: Verificar Java
where java >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java no encontrado. Instala Java 21+
    pause
    exit /b 1
)

:: Verificar Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instala Node.js 18+
    pause
    exit /b 1
)

:: Iniciar Backend
echo [1/3] Iniciando Backend (Spring Boot)...
cd app
start "Kuicat Backend" /min cmd /c "mvnw.cmd spring-boot:run"
cd ..

:: Esperar a que el backend esté listo
echo [2/3] Esperando Backend en puerto %BACKEND_PORT%...
:wait_backend
timeout /t 2 /nobreak >nul
powershell -Command "(New-Object Net.Sockets.TcpClient).Connect('localhost', %BACKEND_PORT%)" 2>nul
if errorlevel 1 goto wait_backend
echo       Backend listo!

:: Iniciar Frontend
echo [3/3] Iniciando Frontend (Angular)...
cd web
start "Kuicat Frontend" /min cmd /c "npm start"
cd ..

:: Esperar a que el frontend esté listo
echo       Esperando Frontend en puerto %FRONTEND_PORT%...
:wait_frontend
timeout /t 2 /nobreak >nul
powershell -Command "(New-Object Net.Sockets.TcpClient).Connect('localhost', %FRONTEND_PORT%)" 2>nul
if errorlevel 1 goto wait_frontend
echo       Frontend listo!

:: Abrir navegador
echo.
echo ════════════════════════════════════════════════════════════════
echo   ¡Kuicat está corriendo!
echo   Abriendo navegador: %BROWSER_URL%
echo ════════════════════════════════════════════════════════════════
echo.
echo   Para cerrar: Cierra las ventanas "Kuicat Backend" y "Kuicat Frontend"
echo                o presiona Ctrl+C en ellas.
echo.

start "" "%BROWSER_URL%"

:: Mantener esta ventana abierta
pause
