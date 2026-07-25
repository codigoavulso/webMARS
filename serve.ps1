param(
  [int]$Port = 8080
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "MARS web server running at $prefix"
Write-Host "Serving: $root"
Write-Host "Press Ctrl+C to stop."

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".asm"  = "text/plain; charset=utf-8"
  ".s"    = "text/plain; charset=utf-8"
  ".c"    = "text/plain; charset=utf-8"
  ".c0"   = "text/plain; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".ico"  = "image/x-icon"
  ".svg"  = "image/svg+xml"
  ".txt"  = "text/plain; charset=utf-8"
  ".md"   = "text/plain; charset=utf-8"
  ".pdf"  = "application/pdf"
}

function Get-ContentType([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($mimeTypes.ContainsKey($ext)) { return $mimeTypes[$ext] }
  return "application/octet-stream"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $response.AddHeader("Cache-Control", "no-store")
    $response.AddHeader("Referrer-Policy", "no-referrer")
    $response.AddHeader("X-Content-Type-Options", "nosniff")

    if ($request.HttpMethod -ne "GET" -and $request.HttpMethod -ne "HEAD") {
      $response.StatusCode = 405
      $response.AddHeader("Allow", "GET, HEAD")
      $buffer = [System.Text.Encoding]::UTF8.GetBytes("405 Method Not Allowed")
      $response.ContentLength64 = $buffer.Length
      $response.OutputStream.Write($buffer, 0, $buffer.Length)
      $response.Close()
      continue
    }

    $requestPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $safePath = $requestPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $safePath))

    if (
      $fullPath -ne $root
      -and -not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
    ) {
      $response.StatusCode = 403
      $buffer = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
      $response.OutputStream.Write($buffer, 0, $buffer.Length)
      $response.Close()
      continue
    }

    if (Test-Path $fullPath -PathType Container) {
      $fullPath = Join-Path $fullPath "index.html"
    }

    if (-not (Test-Path $fullPath -PathType Leaf)) {
      $response.StatusCode = 404
      $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $response.OutputStream.Write($buffer, 0, $buffer.Length)
      $response.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $response.StatusCode = 200
    $response.ContentType = Get-ContentType $fullPath
    if ($ext -eq ".pdf") {
      $response.AddHeader("Content-Disposition", "inline")
    }
    $response.ContentLength64 = $bytes.Length
    if ($request.HttpMethod -ne "HEAD") {
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.Close()
  }
}
finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
