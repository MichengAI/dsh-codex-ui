import { spawn } from 'node:child_process'
import type { SpawnOptionsWithoutStdio } from 'node:child_process'
import { isAbsolute } from 'node:path'

export const WINDOWS_EXPLORER_TIMEOUT_MS = 8_000

const WINDOWS_FOREGROUND_EXPLORER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class DcuWindowFocus {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool attach);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

$shell = New-Object -ComObject Shell.Application

function Find-ExplorerWindow([string]$path) {
  foreach ($item in @($shell.Windows())) {
    try {
      $candidate = [IO.Path]::GetFullPath([string]$item.Document.Folder.Self.Path).TrimEnd('\')
      if ($candidate -ieq $path) { return $item }
    } catch {}
  }
  return $null
}

function Open-ExplorerInForeground([string]$target) {
  $target = [IO.Path]::GetFullPath($target).TrimEnd('\')
  $window = Find-ExplorerWindow $target
  if ($null -eq $window) {
    $shell.Explore($target)
    for ($attempt = 0; $attempt -lt 120 -and $null -eq $window; $attempt += 1) {
      Start-Sleep -Milliseconds 25
      $window = Find-ExplorerWindow $target
    }
  }
  if ($null -eq $window) { throw 'Explorer window was not found.' }

  $handle = [IntPtr]([long]$window.HWND)
  $foreground = [DcuWindowFocus]::GetForegroundWindow()
  $foregroundProcessId = 0
  $foregroundThread = [DcuWindowFocus]::GetWindowThreadProcessId($foreground, [ref]$foregroundProcessId)
  $currentThread = [DcuWindowFocus]::GetCurrentThreadId()
  $attached = $foregroundThread -ne 0 -and [DcuWindowFocus]::AttachThreadInput($currentThread, $foregroundThread, $true)
  try {
    [void][DcuWindowFocus]::ShowWindowAsync($handle, 3)
    [void][DcuWindowFocus]::BringWindowToTop($handle)
    if (-not [DcuWindowFocus]::SetForegroundWindow($handle)) { throw 'Explorer could not be activated.' }
  } finally {
    if ($attached) { [void][DcuWindowFocus]::AttachThreadInput($currentThread, $foregroundThread, $false) }
  }
}

[Console]::Out.WriteLine('READY')
[Console]::Out.Flush()
while (($line = [Console]::In.ReadLine()) -ne $null) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $parts = $line.Split([char]9, 2)
  $requestId = $parts[0]
  try {
    if ($parts.Count -ne 2) { throw 'Invalid request.' }
    $target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[1]))
    Open-ExplorerInForeground $target
    [Console]::Out.WriteLine(('OK' + [char]9 + $requestId))
  } catch {
    $message = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$_.Exception.Message))
    [Console]::Out.WriteLine(('ERR' + [char]9 + $requestId + [char]9 + $message))
  }
  [Console]::Out.Flush()
}
`

export type ExplorerHelperProcess = {
  stdin: { write: (chunk: string, callback: (error?: Error | null) => void) => unknown }
  stdout: { on: (event: 'data', listener: (chunk: unknown) => void) => unknown }
  once: (event: 'error' | 'exit', listener: (value?: any) => void) => unknown
  kill: () => unknown
}
export type ExplorerSpawn = (file: string, args: string[], options: SpawnOptionsWithoutStdio) => ExplorerHelperProcess

type PendingRequest = {
  resolve: () => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

/**
 * 常驻的 Windows Explorer 前台激活助手。
 * PowerShell 与窗口 API 只在 Host 启动时初始化一次，点击时仅发送一行路径请求。
 */
export class ForegroundExplorer {
  private child: ExplorerHelperProcess | undefined
  private startupChild: ExplorerHelperProcess | undefined
  private starting: Promise<ExplorerHelperProcess> | undefined
  private stdout = ''
  private sequence = 0
  private readonly pending = new Map<string, PendingRequest>()
  private disposed = false

  constructor(
    private readonly run: ExplorerSpawn = spawn as ExplorerSpawn,
    private readonly platform: NodeJS.Platform = process.platform,
  ) {}

  /** 在用户点击前完成 PowerShell 与窗口 API 初始化。 */
  warmup(): Promise<void> {
    if (this.platform !== 'win32') return Promise.resolve()
    return this.ensureStarted().then(() => undefined)
  }

  async open(path: string): Promise<void> {
    if (this.platform !== 'win32') throw new Error('foreground Explorer is only available on Windows')
    if (!isAbsolute(path)) throw new Error('Explorer path must be absolute')
    if (this.disposed) throw new Error('Explorer helper has been disposed')

    const child = await this.ensureStarted()
    const requestId = String(++this.sequence)
    const encodedPath = Buffer.from(path, 'utf8').toString('base64')
    return await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error('Explorer activation timed out'))
      }, WINDOWS_EXPLORER_TIMEOUT_MS)
      timeout.unref?.()
      this.pending.set(requestId, { resolve, reject, timeout })
      child.stdin.write(`${requestId}\t${encodedPath}\n`, error => {
        if (error === null || error === undefined) return
        const request = this.pending.get(requestId)
        if (request === undefined) return
        clearTimeout(request.timeout)
        this.pending.delete(requestId)
        request.reject(error)
      })
    })
  }

  dispose(): void {
    this.disposed = true
    this.failAll(new Error('Explorer helper has been disposed'))
    this.startupChild?.kill()
    this.child?.kill()
    this.startupChild = undefined
    this.child = undefined
    this.starting = undefined
  }

  private ensureStarted(): Promise<ExplorerHelperProcess> {
    if (this.disposed) return Promise.reject(new Error('Explorer helper has been disposed'))
    if (this.child !== undefined) return Promise.resolve(this.child)
    if (this.starting !== undefined) return this.starting

    const encoded = Buffer.from(WINDOWS_FOREGROUND_EXPLORER_SCRIPT, 'utf16le').toString('base64')
    this.starting = new Promise<ExplorerHelperProcess>((resolve, reject) => {
      const child = this.run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        windowsHide: true,
      })
      this.startupChild = child
      let settled = false
      const finishStart = (error?: Error): void => {
        if (settled) return
        settled = true
        clearTimeout(startupTimeout)
        if (error !== undefined) {
          this.starting = undefined
          if (this.startupChild === child) this.startupChild = undefined
          child.kill()
          reject(error)
          return
        }
        if (this.disposed) {
          this.starting = undefined
          if (this.startupChild === child) this.startupChild = undefined
          child.kill()
          reject(new Error('Explorer helper has been disposed'))
          return
        }
        if (this.startupChild === child) this.startupChild = undefined
        this.child = child
        this.starting = undefined
        resolve(child)
      }
      const startupTimeout = setTimeout(() => finishStart(new Error('Explorer helper startup timed out')), WINDOWS_EXPLORER_TIMEOUT_MS)
      startupTimeout.unref?.()

      child.stdout.on('data', chunk => {
        this.stdout += String(chunk)
        let newline = this.stdout.indexOf('\n')
        while (newline >= 0) {
          const line = this.stdout.slice(0, newline).trimEnd()
          this.stdout = this.stdout.slice(newline + 1)
          if (line === 'READY') finishStart()
          else this.handleResponse(line)
          newline = this.stdout.indexOf('\n')
        }
      })
      child.once('error', error => finishStart(error))
      child.once('exit', () => {
        if (!settled) finishStart(new Error('Explorer helper exited during startup'))
        if (this.child === child) this.child = undefined
        this.failAll(new Error('Explorer helper exited'))
      })
    })
    return this.starting
  }

  private handleResponse(line: string): void {
    const [status, requestId, encodedMessage] = line.split('\t')
    const request = requestId === undefined ? undefined : this.pending.get(requestId)
    if (request === undefined) return
    clearTimeout(request.timeout)
    this.pending.delete(requestId)
    if (status === 'OK') {
      request.resolve()
      return
    }
    const message = encodedMessage === undefined ? 'Explorer activation failed' : Buffer.from(encodedMessage, 'base64').toString('utf8')
    request.reject(new Error(message))
  }

  private failAll(error: Error): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout)
      request.reject(error)
    }
    this.pending.clear()
  }
}
