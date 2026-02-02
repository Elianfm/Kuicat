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

# Iniciar Backend y Frontend en paralelo
Write-Step "2/4" "Iniciando servicios..."

if (-not $backendAlreadyRunning) {
    $appDir = Join-Path $RootDir "app"
    $backendProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "cd /d `"$appDir`" && mvnw.cmd spring-boot:run" `
        -WindowStyle Hidden `
        -PassThru
    Write-Host "      Backend iniciando... (PID: $($backendProcess.Id))" -ForegroundColor Gray
}

if (-not $frontendAlreadyRunning) {
    $webDir = Join-Path $RootDir "web"
    $frontendProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "cd /d `"$webDir`" && npm start" `
        -WindowStyle Hidden `
        -PassThru
    Write-Host "      Frontend iniciando... (PID: $($frontendProcess.Id))" -ForegroundColor Gray
}

# Esperar ambos puertos
Write-Step "3/4" "Esperando servicios..."

$waitingForBackend = -not $backendAlreadyRunning
$waitingForFrontend = -not $frontendAlreadyRunning
$elapsed = 0
$timeout = 120

Write-Host "      " -NoNewline
while (($waitingForBackend -or $waitingForFrontend) -and $elapsed -lt $timeout) {
    if ($waitingForBackend -and (Test-Port $BackendPort)) {
        Write-Host "B" -NoNewline -ForegroundColor Green
        $waitingForBackend = $false
    }
    if ($waitingForFrontend -and (Test-Port $FrontendPort)) {
        Write-Host "F" -NoNewline -ForegroundColor Green
        $waitingForFrontend = $false
    }
    if ($waitingForBackend -or $waitingForFrontend) {
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
}
Write-Host ""

if ($waitingForBackend) {
    Write-Error "Backend no respondió después de $timeout segundos"
    exit 1
}
if ($waitingForFrontend) {
    Write-Error "Frontend no respondió después de $timeout segundos"
    exit 1
}

Write-Success "Todos los servicios listos!"

# Abrir navegador
if (-not $NoBrowser) {
    Write-Step "4/4" "Abriendo navegador..."
    Start-Process $BrowserUrl
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ¡Kuicat está corriendo!" -ForegroundColor Green
Write-Host "  URL: $BrowserUrl" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Presiona Enter para CERRAR Kuicat y detener todos los servicios." -ForegroundColor Yellow
Write-Host ""

Read-Host "Presiona Enter para cerrar Kuicat"

# Función para matar proceso y sus hijos
function Stop-ProcessTree {
    param([int]$ProcessId)
    try {
        # Obtener procesos hijos
        $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
        foreach ($child in $children) {
            Stop-ProcessTree -ProcessId $child.ProcessId
        }
        # Matar el proceso padre
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
        # Ignorar errores si el proceso ya no existe
    }
}

Write-Host ""
Write-Step "X" "Cerrando servicios..."

# Matar los procesos que iniciamos
if ($backendProcess -and -not $backendAlreadyRunning) {
    Write-Host "      Cerrando Backend (PID: $($backendProcess.Id))..." -ForegroundColor Gray
    Stop-ProcessTree -ProcessId $backendProcess.Id
}

if ($frontendProcess -and -not $frontendAlreadyRunning) {
    Write-Host "      Cerrando Frontend (PID: $($frontendProcess.Id))..." -ForegroundColor Gray
    Stop-ProcessTree -ProcessId $frontendProcess.Id
}

# También matar procesos Java/Node que estén usando los puertos
# (por si se escapó alguno)
try {
    # Buscar procesos en el puerto del backend
    $backendConn = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
    if ($backendConn) {
        $backendConn | ForEach-Object {
            $pid = $_.OwningProcess
            Write-Host "      Matando proceso en puerto $BackendPort (PID: $pid)..." -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Buscar procesos en el puerto del frontend
    $frontendConn = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
    if ($frontendConn) {
        $frontendConn | ForEach-Object {
            $pid = $_.OwningProcess
            Write-Host "      Matando proceso en puerto $FrontendPort (PID: $pid)..." -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    # Ignorar errores
}

Write-Success "¡Kuicat cerrado!"
Start-Sleep -Seconds 1
