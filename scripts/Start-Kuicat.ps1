# Kuicat Launcher
# Inicia Backend + Frontend y abre el navegador

param(
    [switch]$NoBrowser,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Kuicat Launcher"

# Configuración
$BackendPort = 8741
$FrontendPort = 4287
$BrowserUrl = "http://localhost:$FrontendPort"

# Detectar directorio raíz (donde está el .exe o el .ps1)
if ($MyInvocation.MyCommand.Path) {
    $ScriptPath = $MyInvocation.MyCommand.Path
} else {
    # Cuando se ejecuta como .exe, usar el directorio actual del ejecutable
    $ScriptPath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
}

$ScriptDir = Split-Path -Parent $ScriptPath

# Si estamos en scripts/, subir un nivel
if ($ScriptDir -like "*scripts*" -or $ScriptDir -like "*scripts") {
    $RootDir = Split-Path -Parent $ScriptDir
} else {
    $RootDir = $ScriptDir
}

# Si el RootDir no tiene app/, buscar en el directorio actual
if (-not (Test-Path (Join-Path $RootDir "app"))) {
    $RootDir = Get-Location
}

# Colores
function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║                                                              ║" -ForegroundColor Yellow
    Write-Host "║    ██╗  ██╗██╗   ██╗██╗ ██████╗ █████╗ ████████╗             ║" -ForegroundColor Yellow
    Write-Host "║    ██║ ██╔╝██║   ██║██║██╔════╝██╔══██╗╚══██╔══╝             ║" -ForegroundColor Yellow
    Write-Host "║    █████╔╝ ██║   ██║██║██║     ███████║   ██║                ║" -ForegroundColor Yellow
    Write-Host "║    ██╔═██╗ ██║   ██║██║██║     ██╔══██║   ██║                ║" -ForegroundColor Yellow
    Write-Host "║    ██║  ██╗╚██████╔╝██║╚██████╗██║  ██║   ██║                ║" -ForegroundColor Yellow
    Write-Host "║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝                ║" -ForegroundColor Yellow
    Write-Host "║                                                              ║" -ForegroundColor Yellow
    Write-Host "║              Reproductor de Música con IA                    ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "[$Step] " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "      $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $connection)
    } catch {
        # Fallback a TcpClient
        try {
            $tcp = New-Object Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $result = $tcp.Connected
            $tcp.Close()
            return $result
        } catch {
            return $false
        }
    }
}

function Wait-ForPort {
    param([int]$Port, [string]$Name, [int]$TimeoutSeconds = 120)
    
    $elapsed = 0
    while (-not (Test-Port $Port)) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        if ($elapsed -ge $TimeoutSeconds) {
            Write-Host ""
            Write-Error "$Name no respondió después de $TimeoutSeconds segundos"
            return $false
        }
    }
    Write-Host ""
    return $true
}

# Banner
Write-Banner

# Cambiar al directorio raíz
Write-Host "  Directorio: $RootDir" -ForegroundColor DarkGray
Set-Location $RootDir

# Verificaciones
Write-Step "1/5" "Verificando requisitos..."

$appPath = Join-Path $RootDir "app\pom.xml"
$webPath = Join-Path $RootDir "web\package.json"

if (-not (Test-Path $appPath)) {
    Write-Error "No se encontró app\pom.xml en: $RootDir"
    Write-Host "  Asegúrate de ejecutar Kuicat.exe desde la carpeta del proyecto." -ForegroundColor Gray
    Read-Host "Presiona Enter para salir"
    exit 1
}

if (-not (Test-Path $webPath)) {
    Write-Error "No se encontró web\package.json en: $RootDir"
    Write-Host "  Asegúrate de ejecutar Kuicat.exe desde la carpeta del proyecto." -ForegroundColor Gray
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar Java
try {
    $javaVersion = java -version 2>&1 | Select-String -Pattern 'version'
    if ($Verbose) { Write-Success "Java: $javaVersion" }
} catch {
    Write-Error "Java no encontrado. Instala Java 21+"
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar Node.js
try {
    $nodeVersion = node --version
    if ($Verbose) { Write-Success "Node.js: $nodeVersion" }
} catch {
    Write-Error "Node.js no encontrado. Instala Node.js 18+"
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Success "Requisitos OK"

# Verificar si ya hay algo en los puertos
if (Test-Port $BackendPort) {
    Write-Step "!" "Backend ya está corriendo en puerto $BackendPort"
    $backendAlreadyRunning = $true
} else {
    $backendAlreadyRunning = $false
}

if (Test-Port $FrontendPort) {
    Write-Step "!" "Frontend ya está corriendo en puerto $FrontendPort"
    $frontendAlreadyRunning = $true
} else {
    $frontendAlreadyRunning = $false
}

# Iniciar Backend
if (-not $backendAlreadyRunning) {
    Write-Step "2/5" "Iniciando Backend (Spring Boot)..."
    
    $appDir = Join-Path $RootDir "app"
    $backendProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "cd /d `"$appDir`" && mvnw.cmd spring-boot:run" `
        -WindowStyle Minimized `
        -PassThru
    
    Write-Step "3/5" "Esperando Backend en puerto $BackendPort..."
    if (-not (Wait-ForPort $BackendPort "Backend")) {
        exit 1
    }
    Write-Success "Backend listo! (PID: $($backendProcess.Id))"
} else {
    Write-Step "2/5" "Backend ya corriendo - saltando"
    Write-Step "3/5" "Backend ya corriendo - saltando"
}

# Iniciar Frontend
if (-not $frontendAlreadyRunning) {
    Write-Step "4/5" "Iniciando Frontend (Angular)..."
    
    $webDir = Join-Path $RootDir "web"
    $frontendProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "cd /d `"$webDir`" && npm start" `
        -WindowStyle Minimized `
        -PassThru
    
    Write-Host "      Esperando Frontend en puerto $FrontendPort..." -NoNewline
    if (-not (Wait-ForPort $FrontendPort "Frontend")) {
        exit 1
    }
    Write-Host ""
    Write-Success "Frontend listo! (PID: $($frontendProcess.Id))"
} else {
    Write-Step "4/5" "Frontend ya corriendo - saltando"
}

# Abrir navegador
if (-not $NoBrowser) {
    Write-Step "5/5" "Abriendo navegador..."
    Start-Process $BrowserUrl
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ¡Kuicat está corriendo!" -ForegroundColor Green
Write-Host "  URL: $BrowserUrl" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Para cerrar: Cierra las ventanas minimizadas del backend/frontend" -ForegroundColor DarkGray
Write-Host "               o usa Ctrl+C en ellas." -ForegroundColor DarkGray
Write-Host ""

Read-Host "Presiona Enter para cerrar este launcher (los servicios seguirán corriendo)"
