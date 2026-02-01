# Stop-Kuicat.ps1
# Detiene todos los procesos de Kuicat

$Host.UI.RawUI.WindowTitle = "Kuicat - Cerrando"

Write-Host ""
Write-Host "Cerrando Kuicat..." -ForegroundColor Yellow
Write-Host ""

$stopped = 0

# Cerrar procesos de Java (Spring Boot)
$javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*kuicat*" -or $_.MainWindowTitle -like "*Kuicat*" }

if ($javaProcesses) {
    foreach ($proc in $javaProcesses) {
        Write-Host "  Cerrando Backend (PID: $($proc.Id))..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        $stopped++
    }
}

# Cerrar procesos de Node (Angular)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*kuicat*" }

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "  Cerrando Frontend (PID: $($proc.Id))..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        $stopped++
    }
}

# Buscar por puertos
$BackendPort = 8741
$FrontendPort = 4287

# Backend por puerto
$backendPid = (Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($backendPid) {
    Write-Host "  Cerrando proceso en puerto $BackendPort (PID: $backendPid)..." -ForegroundColor Gray
    Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
    $stopped++
}

# Frontend por puerto
$frontendPid = (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($frontendPid) {
    Write-Host "  Cerrando proceso en puerto $FrontendPort (PID: $frontendPid)..." -ForegroundColor Gray
    Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
    $stopped++
}

Write-Host ""
if ($stopped -gt 0) {
    Write-Host "Kuicat cerrado. ($stopped procesos)" -ForegroundColor Green
} else {
    Write-Host "No se encontraron procesos de Kuicat corriendo." -ForegroundColor Gray
}
Write-Host ""
