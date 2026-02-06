<#
.SYNOPSIS
    Script de Respaldo Automático para Sistema Neuro
    Creado para facilitar la migración a Windows 11
#>

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "RESPALDO_SISTEMA_NEURO_$timestamp"
$backupZip = "$scriptPath\$backupName.zip"
$tempDir = "$scriptPath\temp_backup_$timestamp"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA NEURO - ASISTENTE DE RESPALDO" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Detener procesos conocidos (Node, PM2) para liberar archivos
Write-Host "[1/5] Deteniendo servicios para liberar archivos..." -ForegroundColor Yellow
try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "    Procesos Node detenidos." -ForegroundColor Green
} catch {
    Write-Host "    No se encontraron procesos Node activos."
}

# 2. Crear carpeta temporal
Write-Host "[2/5] Preparando archivos..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# 3. Copiar archivos críticos
Write-Host "    Copiando configuraciones y código fuente..."
$exclude = @("node_modules", ".git", "dist", "temp_backup_*", "*.zip", "*.log", "backups")

# Copiar todo excepto exclusiones
Get-ChildItem -Path $scriptPath -Exclude $exclude | ForEach-Object {
    $target = Join-Path $tempDir $_.Name
    if ($_.PSIsContainer) {
        # Copiar directorio recursivamente, excluyendo node_modules internos si existen
        Copy-Item $_.FullName -Destination $tempDir -Recurse -Force
    } else {
        Copy-Item $_.FullName -Destination $tempDir -Force
    }
}

# Limpieza especifica dentro de la copia temporal (por si acaso se coló algún node_modules)
if (Test-Path "$tempDir\node_modules") { Remove-Item "$tempDir\node_modules" -Recurse -Force }
if (Test-Path "$tempDir\backend\node_modules") { Remove-Item "$tempDir\backend\node_modules" -Recurse -Force }

# Verificar archivos críticos
if (-not (Test-Path "$tempDir\backend\sistema_neuro.db")) {
    Write-Warning "ATENCION: No se encontró la base de datos 'backend\sistema_neuro.db'. El respaldo podría estar incompleto."
} else {
    Write-Host "    Base de datos verificada." -ForegroundColor Green
}

if (-not (Test-Path "$tempDir\backend\uploads")) {
    Write-Warning "ATENCION: No se encontró la carpeta de archivos 'backend\uploads'."
} else {
    Write-Host "    Archivos adjuntos (uploads) verificados." -ForegroundColor Green
}

# 4. Comprimir
Write-Host "[3/5] Comprimiendo archivos (esto puede tardar unos segundos)..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $backupZip -CompressionLevel Optimal

# 5. Limpieza y Finalización
Write-Host "[4/5] Limpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "   RESPALDO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Archivo creado: $backupZip" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Copie este archivo .zip a un USB o Google Drive AHORA MISMO." -ForegroundColor Red -BackgroundColor Yellow
Write-Host ""
Pause
