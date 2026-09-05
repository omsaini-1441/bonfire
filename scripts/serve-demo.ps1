# Serve demo/ over HTTP so Chrome can inject Bonfire.
# Usage (from repo root):  powershell -File scripts\serve-demo.ps1

$ErrorActionPreference = "Stop"
$port = 8765
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\demo")).Path
$prefix = "http://127.0.0.1:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Error "Could not bind $prefix. Is something else using port $port?"
  exit 1
}

Write-Host "Bonfire demo: $($prefix)trap-page.html"
Write-Host "Serving $root"
Write-Host "Ctrl+C to stop."

function Get-SafePath([string]$urlPath) {
  $rel = [Uri]::UnescapeDataString($urlPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "trap-page.html" }
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  $rootFull = [System.IO.Path]::GetFullPath($root)
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $full
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $file = Get-SafePath $req.Url.AbsolutePath
    if (-not $file -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }
    $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
    $res.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $res.StatusCode = 200
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
