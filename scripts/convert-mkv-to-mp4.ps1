# Script para convertir MKV a MP4
# Los archivos MKV originales se eliminan tras conversión exitosa

$ffmpeg = "D:\Musica\yt-dlp\ffmpeg-2025-06-23-git-e6298e0759-essentials_build\bin\ffmpeg.exe"
$musicDir = "D:\Musica\MyMusic"

# Obtener todos los MKV
$mkvFiles = Get-ChildItem -Path $musicDir -Filter "*.mkv" -Recurse

Write-Host "Encontrados $($mkvFiles.Count) archivos MKV para convertir" -ForegroundColor Cyan
Write-Host ""

$converted = 0
$failed = 0

foreach ($mkv in $mkvFiles) {
    $mp4Path = $mkv.FullName -replace '\.mkv$', '.mp4'
    
    # Si ya existe el MP4, saltar
    if (Test-Path $mp4Path) {
        Write-Host "[SKIP] Ya existe: $($mkv.Name)" -ForegroundColor Yellow
        # Opcional: eliminar el MKV duplicado
        # Remove-Item $mkv.FullName -Force
        continue
    }
    
    Write-Host "[CONV] $($mkv.Name)" -ForegroundColor White
    
    # Convertir con ffmpeg
    # -c:v copy = copiar video sin recodificar
    # -c:a aac = convertir audio a AAC (compatible con MP4)
    # -y = sobrescribir si existe
    $process = Start-Process -FilePath $ffmpeg -ArgumentList @(
        "-i", "`"$($mkv.FullName)`"",
        "-c:v", "copy",
        "-c:a", "aac",
        "-y",
        "`"$mp4Path`""
    ) -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0 -and (Test-Path $mp4Path)) {
        $converted++
        Write-Host "  -> OK: $($mkv.BaseName).mp4" -ForegroundColor Green
        
        # Eliminar MKV original
        Remove-Item $mkv.FullName -Force
        Write-Host "  -> MKV eliminado" -ForegroundColor DarkGray
    } else {
        $failed++
        Write-Host "  -> ERROR al convertir" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Convertidos: $converted" -ForegroundColor Green
Write-Host "Fallidos: $failed" -ForegroundColor Red
