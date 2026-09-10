import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { WordConversionJobData, WordConversionJobResult } from './types';
import { validatePdfOutput } from './validator';
import { cleanupJobWorkDir, deleteFileSafe } from './cleanup';

const execFileAsync = promisify(execFile);

const CONVERSION_TIMEOUT_MS = Number(process.env.WORD_CONVERT_TIMEOUT_MS) || 90000;

let cachedLibreOfficePath: string | null = null;
let cachedWordComAvailable: boolean | null = null;

/**
 * Locate the LibreOffice/soffice executable across environment variables, standard OS paths, and PATH.
 */
export async function resolveLibreOfficePath(): Promise<string | null> {
  if (cachedLibreOfficePath && existsSync(cachedLibreOfficePath)) {
    return cachedLibreOfficePath;
  }

  // 1. Check custom environment variable overrides
  const envPath = process.env.LIBREOFFICE_PATH || process.env.SOFFICE_PATH;
  if (envPath && existsSync(envPath)) {
    cachedLibreOfficePath = envPath;
    return envPath;
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  const candidates: string[] = [];

  if (isWindows) {
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    candidates.push(
      path.join(progFiles, 'LibreOffice', 'program', 'soffice.exe'),
      path.join(progFilesX86, 'LibreOffice', 'program', 'soffice.exe'),
      path.join(localAppData, 'Programs', 'LibreOffice', 'program', 'soffice.exe')
    );
  } else if (isMac) {
    candidates.push(
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      '/usr/local/bin/soffice',
      '/opt/homebrew/bin/soffice'
    );
  } else {
    // Linux / Container
    candidates.push(
      '/usr/bin/libreoffice',
      '/usr/bin/soffice',
      '/usr/lib/libreoffice/program/soffice.bin',
      '/usr/local/bin/libreoffice',
      '/usr/local/bin/soffice'
    );
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedLibreOfficePath = candidate;
      return candidate;
    }
  }

  // 2. Lookup in PATH using which / where.exe
  try {
    const lookupCmd = isWindows ? 'where.exe' : 'which';
    const binaryName = isWindows ? 'soffice.exe' : 'libreoffice';
    const { stdout } = await execFileAsync(lookupCmd, [binaryName], { timeout: 5000 });
    const resolved = stdout.trim().split(/\r?\n/)[0];
    if (resolved && existsSync(resolved)) {
      cachedLibreOfficePath = resolved;
      return resolved;
    }
  } catch {
    if (isWindows) {
      try {
        const { stdout } = await execFileAsync('where.exe', ['libreoffice.exe'], { timeout: 5000 });
        const resolved = stdout.trim().split(/\r?\n/)[0];
        if (resolved && existsSync(resolved)) {
          cachedLibreOfficePath = resolved;
          return resolved;
        }
      } catch {
        // Not in PATH
      }
    }
  }

  return null;
}

/**
 * Check if Microsoft Word COM automation is available on Windows
 */
export async function isWordComAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  if (cachedWordComAvailable !== null) return cachedWordComAvailable;

  const probeScript = `
$w = $null
try {
  $w = New-Object -ComObject Word.Application
  $w.Visible = $false
  Write-Output "AVAILABLE"
} catch {
  exit 1
} finally {
  if ($w) {
    $w.Quit([ref]$false)
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
  }
}
`;

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      probeScript,
    ], { timeout: 8000 });

    const ok = stdout.includes('AVAILABLE');
    cachedWordComAvailable = ok;
    return ok;
  } catch {
    cachedWordComAvailable = false;
    return false;
  }
}

/**
 * Check which Office conversion engine is currently available
 */
export async function isOfficeEngineAvailable(): Promise<{
  available: boolean;
  engine: 'libreoffice' | 'word-com' | 'none';
  binaryPath?: string;
  error?: string;
}> {
  const loPath = await resolveLibreOfficePath();
  if (loPath) {
    return { available: true, engine: 'libreoffice', binaryPath: loPath };
  }

  const wordCom = await isWordComAvailable();
  if (wordCom) {
    return { available: true, engine: 'word-com' };
  }

  return {
    available: false,
    engine: 'none',
    error: 'No Office conversion engine found. Please install LibreOffice or ensure Microsoft Office is present.',
  };
}

/**
 * Perform conversion via LibreOffice headless with dedicated sandbox profile
 */
async function convertWithLibreOffice(
  sofficeBinary: string,
  workDir: string,
  safeInputPath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const profileDir = path.join(workDir, 'lo_profile');
  await fs.mkdir(profileDir, { recursive: true });

  let userProfileUri = profileDir.replace(/\\/g, '/');
  if (!userProfileUri.startsWith('/')) {
    userProfileUri = `/${userProfileUri}`;
  }
  const userInstallArg = `-env:UserInstallation=file://${encodeURI(userProfileUri)}`;

  onProgress?.(45, 'Rendering document layout with LibreOffice headless...');

  const loArgs = [
    userInstallArg,
    '--headless',
    '--invisible',
    '--nocrashreport',
    '--nodefault',
    '--nofirststartwizard',
    '--nolockcheck',
    '--nologo',
    '--norestore',
    '--convert-to',
    'pdf:writer_pdf_Export',
    '--outdir',
    workDir,
    safeInputPath,
  ];

  try {
    const { stdout, stderr } = await execFileAsync(sofficeBinary, loArgs, {
      timeout: CONVERSION_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        SAL_USE_VCLPLUGIN: 'gen',
      },
    });

    if (stdout.trim()) console.log(`[WordConverter:LibreOffice] stdout: ${stdout.trim()}`);
    if (stderr.trim()) console.warn(`[WordConverter:LibreOffice] stderr: ${stderr.trim()}`);
  } catch (err: any) {
    if (err.killed || err.signal === 'SIGTERM') {
      throw new Error(`Conversion timed out after ${(CONVERSION_TIMEOUT_MS / 1000).toFixed(0)}s.`);
    }
    throw new Error(`LibreOffice conversion failed: ${err.message || 'Unknown error'}`);
  }

  const generatedPdfPath = path.join(workDir, 'source.pdf');
  return generatedPdfPath;
}

/**
 * Perform conversion via native Microsoft Word COM automation (Windows)
 */
async function convertWithWordCom(
  workDir: string,
  safeInputPath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(45, 'Rendering document layout with Microsoft Word engine...');

  const generatedPdfPath = path.join(workDir, 'source.pdf');
  const psScriptPath = path.join(workDir, 'convert_word_com.ps1');

  const safeInputEscaped = safeInputPath.replace(/'/g, "''");
  const safeOutputEscaped = generatedPdfPath.replace(/'/g, "''");

  const psScript = `
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open('${safeInputEscaped}', $false, $true)
  # 17 = wdExportFormatPDF
  $doc.ExportAsFixedFormat('${safeOutputEscaped}', 17)
  Write-Output "PDF_EXPORT_OK"
} finally {
  if ($doc) {
    $doc.Close([ref]$false)
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
  }
  if ($word) {
    $word.Quit([ref]$false)
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
`;

  await fs.writeFile(psScriptPath, psScript, 'utf8');

  try {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      psScriptPath,
    ], {
      timeout: CONVERSION_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    });

    if (stdout.trim()) console.log(`[WordConverter:WordCOM] stdout: ${stdout.trim()}`);
    if (stderr.trim()) console.warn(`[WordConverter:WordCOM] stderr: ${stderr.trim()}`);
  } catch (err: any) {
    if (err.killed || err.signal === 'SIGTERM') {
      throw new Error(`Conversion timed out after ${(CONVERSION_TIMEOUT_MS / 1000).toFixed(0)}s.`);
    }
    throw new Error(`Microsoft Word conversion engine failed: ${err.message || 'Unknown error'}`);
  }

  return generatedPdfPath;
}

/**
 * Execute an isolated Word -> PDF conversion outside the browser
 */
export async function convertWordDocumentToPdf(
  jobData: WordConversionJobData,
  onProgress?: (progress: number, message: string) => void
): Promise<WordConversionJobResult> {
  const startTime = Date.now();
  onProgress?.(25, 'Preparing isolated conversion sandbox...');

  const workDir = jobData.workDir;
  await fs.mkdir(workDir, { recursive: true });

  // Copy uploaded input file into work directory with sanitized base name
  const safeInputPath = path.join(workDir, `source.${jobData.inputExtension}`);
  await fs.copyFile(jobData.inputFilePath, safeInputPath);

  const engineInfo = await isOfficeEngineAvailable();
  if (!engineInfo.available) {
    throw new Error(
      'Word conversion service unavailable. No Office rendering engine (LibreOffice or Word) is available on the server.'
    );
  }

  console.log(
    `[WordConverter] Starting job ${jobData.jobId} using engine [${engineInfo.engine}] for "${jobData.originalFileName}" (${(jobData.originalSize / 1024).toFixed(1)} KB)`
  );

  let generatedPdfPath: string;

  if (engineInfo.engine === 'libreoffice' && engineInfo.binaryPath) {
    generatedPdfPath = await convertWithLibreOffice(engineInfo.binaryPath, workDir, safeInputPath, onProgress);
  } else if (engineInfo.engine === 'word-com') {
    generatedPdfPath = await convertWithWordCom(workDir, safeInputPath, onProgress);
  } else {
    throw new Error('Unsupported conversion engine state.');
  }

  onProgress?.(75, 'Validating converted PDF document structure...');

  // Perform rigorous PDF validation
  const validation = await validatePdfOutput(generatedPdfPath);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Generated PDF document failed validation.');
  }

  onProgress?.(90, 'Finalizing output PDF...');

  // Ensure output storage directory exists
  await fs.mkdir(path.dirname(jobData.outputFilePath), { recursive: true });

  // Move validated PDF to final storage location
  await fs.copyFile(generatedPdfPath, jobData.outputFilePath);

  // Clean up the temporary workspace
  await cleanupJobWorkDir(workDir);
  await deleteFileSafe(jobData.inputFilePath);

  const durationMs = Date.now() - startTime;
  const originalBase = path.basename(jobData.originalFileName, path.extname(jobData.originalFileName));
  const outputFileName = `${originalBase}.pdf`;

  console.log(
    `[WordConverter] Successfully completed job ${jobData.jobId} via [${engineInfo.engine}] in ${durationMs}ms - Generated ${validation.pageCount} page(s), ${(validation.sizeBytes / 1024).toFixed(1)} KB`
  );

  return {
    jobId: jobData.jobId,
    originalFileName: jobData.originalFileName,
    originalSize: jobData.originalSize,
    outputFileName,
    outputFilePath: jobData.outputFilePath,
    outputSize: validation.sizeBytes,
    pageCount: validation.pageCount,
    durationMs,
    downloadUrl: `/api/convert/download/${jobData.jobId}`,
    createdAt: Date.now(),
  };
}
