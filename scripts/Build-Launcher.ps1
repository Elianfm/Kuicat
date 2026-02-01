# Build-Launcher.ps1
# Convierte el script de PowerShell a un .exe

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Verificar/instalar ps2exe
if (-not (Get-Command ps2exe -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando ps2exe..." -ForegroundColor Yellow
    Install-Module -Name ps2exe -Scope CurrentUser -Force
}

# Rutas
$SourceScript = Join-Path $ScriptDir "Start-Kuicat.ps1"
$OutputExe = Join-Path $RootDir "Kuicat.exe"
$IconPath = Join-Path $RootDir "web\public\favicon.ico"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Creando Kuicat.exe" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el script fuente
if (-not (Test-Path $SourceScript)) {
    Write-Host "[ERROR] No se encontró: $SourceScript" -ForegroundColor Red
    exit 1
}

# Parámetros de ps2exe
$params = @{
    InputFile = $SourceScript
    OutputFile = $OutputExe
    Title = "Kuicat"
    Description = "Reproductor de Música con IA"
    Company = "Kuicat"
    Product = "Kuicat"
    Version = "0.1.0"
    Copyright = "MIT License"
    NoConsole = $false  # Mostrar consola para ver el progreso
    RequireAdmin = $false
}

# Agregar icono si existe
if (Test-Path $IconPath) {
    $params.IconFile = $IconPath
    Write-Host "[INFO] Usando icono: $IconPath" -ForegroundColor Gray
} else {
    Write-Host "[WARN] No se encontró favicon.ico, usando icono por defecto" -ForegroundColor Yellow
}

Write-Host "[1/2] Compilando PowerShell a EXE..." -ForegroundColor Cyan

try {
    ps2exe @params
    
    if (Test-Path $OutputExe) {
        $fileInfo = Get-Item $OutputExe
        Write-Host ""
        Write-Host "[2/2] ¡Éxito!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Archivo creado: $OutputExe" -ForegroundColor White
        Write-Host "  Tamaño: $([math]::Round($fileInfo.Length / 1KB, 1)) KB" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Ahora puedes ejecutar Kuicat.exe para iniciar la aplicación." -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] El archivo no se creó correctamente" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Error al compilar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
