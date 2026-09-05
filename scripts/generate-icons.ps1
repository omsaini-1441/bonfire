Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\icons"
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

function New-BonfireIcon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 18, 10, 6))
  $pad = [Math]::Max(1, [int]($size * 0.06))
  $g.FillEllipse($bg, $pad, $pad, $size - $pad * 2, $size - $pad * 2)

  $flame = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cx = $size / 2
  $top = $size * 0.18
  $bot = $size * 0.78
  $w = $size * 0.28
  $pts = @(
    (New-Object System.Drawing.PointF ($cx), $top),
    (New-Object System.Drawing.PointF ($cx + $w), ($size * 0.52)),
    (New-Object System.Drawing.PointF ($cx + $w * 0.45), $bot),
    (New-Object System.Drawing.PointF ($cx - $w * 0.55), $bot),
    (New-Object System.Drawing.PointF ($cx - $w), ($size * 0.5))
  )
  $flame.AddClosedCurve($pts)

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 0, $size),
    [System.Drawing.Color]::FromArgb(255, 255, 215, 161),
    [System.Drawing.Color]::FromArgb(255, 154, 36, 16)
  )
  $g.FillPath($brush, $flame)

  $core = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 255, 248, 230))
  $cw = [Math]::Max(2, $size * 0.12)
  $g.FillEllipse($core, $cx - $cw / 2, $size * 0.52, $cw, $cw * 1.15)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $brush.Dispose()
  $bg.Dispose()
  $core.Dispose()
  $flame.Dispose()
}

New-BonfireIcon 16 (Join-Path $outDir "icon16.png")
New-BonfireIcon 32 (Join-Path $outDir "icon32.png")
New-BonfireIcon 48 (Join-Path $outDir "icon48.png")
New-BonfireIcon 128 (Join-Path $outDir "icon128.png")
Write-Output "icons written to $outDir"
