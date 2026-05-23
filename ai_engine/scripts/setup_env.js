const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Códigos de colores ANSI para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const printBanner = () => {
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}          FONDO MARINO - SETUP AUTOMATIZADO DE PYTHON           ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}\n`);
};

// Helper para ejecutar comandos de forma segura y retornar salida
const runCommand = (cmd, options = {}) => {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    return null;
  }
};

const checkUV = () => {
  const uvVersion = runCommand('uv --version');
  if (uvVersion) {
    console.log(`${colors.green}✔ Detectado: ${uvVersion} (Recomendado)${colors.reset}`);
    return true;
  }
  return false;
};

const checkPythonVersion = (pythonCmd) => {
  const versionOutput = runCommand(`${pythonCmd} --version`);
  if (!versionOutput) return null;
  
  // Buscar números de versión (ej: Python 3.10.11 o 3.10)
  const match = versionOutput.match(/Python\s+([0-9.]+)/i);
  if (match) {
    return match[1];
  }
  return null;
};

const checkPythonLauncher = () => {
  const version = checkPythonVersion('py -3.10');
  if (version && version.startsWith('3.10')) {
    return true;
  }
  return false;
};

const showHelpAndExit = (detectedVersion) => {
  console.log(`${colors.red}${colors.bright}❌ ERROR: Entorno de Python incompatible o no encontrado.${colors.reset}`);
  if (detectedVersion) {
    console.log(`Se detectó Python versión: ${colors.yellow}${detectedVersion}${colors.reset} (Se requiere estrictamente la rama ${colors.green}3.10.x${colors.reset}).`);
  } else {
    console.log('No se pudo encontrar ninguna instalación de Python en tu sistema.');
  }

  console.log(`\n${colors.yellow}${colors.bright}💡 ¿CÓMO SOLUCIONARLO? ELIGE UNA DE ESTAS OPCIONES:${colors.reset}`);
  console.log(`----------------------------------------------------------------`);
  
  console.log(`\n${colors.cyan}${colors.bright}Opción A (La más fácil y recomendada - Cero instalaciones manuales) ⚡:${colors.reset}`);
  console.log(`Instala ${colors.bright}uv${colors.reset} (de Astral) en tu máquina.`);
  console.log(`${colors.bright}uv${colors.reset} descargará automáticamente una versión portable de Python 3.10.x e instalará el entorno en 2 segundos.`);
  console.log(`\nEjecuta esta línea en PowerShell con permisos de administrador:`);
  console.log(`${colors.green}powershell -c "irm https://astral.sh/uv/install.ps1 | iex"${colors.reset}`);
  console.log(`Luego de la instalación, reinicia tu terminal y corre de nuevo: ${colors.bright}pnpm ai:setup${colors.reset}`);
  
  console.log(`\n${colors.magenta}${colors.bright}Opción B (Gestor de Versiones Tradicional):${colors.reset}`);
  console.log(`Si prefieres gestionar múltiples versiones de Python locales, instala ${colors.bright}pyenv-win${colors.reset}:`);
  console.log(`${colors.green}pyenv install 3.10.11${colors.reset}`);
  console.log(`${colors.green}pyenv local 3.10.11${colors.reset}`);
  
  console.log(`\n${colors.yellow}${colors.bright}Opción C (Manual Clásica):${colors.reset}`);
  console.log(`Descarga e instala ${colors.bright}Python 3.10.x${colors.reset} desde la web oficial:`);
  console.log(`${colors.cyan}https://www.python.org/downloads/release/python-31011/${colors.reset}`);
  console.log(`⚠️  ${colors.bright}IMPORTANTE:${colors.reset} Asegúrate de marcar la casilla ${colors.bright}"Add Python 3.10 to PATH"${colors.reset} durante la instalación.`);
  console.log(`----------------------------------------------------------------\n`);
  
  process.exit(1);
};

const setupWithUV = () => {
  console.log(`${colors.cyan}⏳ Configurando entorno virtual con uv...${colors.reset}`);
  
  const venvPath = path.join('ai_engine', 'venv');
  const requirementsPath = path.join('ai_engine', 'requirements.txt');
  
  try {
    // 1. Crear Venv forzando la versión 3.10 (uv la descarga portable si no está)
    console.log(`   -> Creando venv en ${colors.cyan}${colors.bright}${venvPath}${colors.reset} usando Python 3.10...`);
    // Agregamos la flag '--clear' para limpiar el venv viejo si uv lo requiere
    execSync(`uv venv "${venvPath}" --python 3.10 --clear`, { stdio: 'inherit' });
    
    // 2. Instalar dependencias con uv pip
    console.log(`\n   -> Instalando dependencias desde ${colors.cyan}${colors.bright}${requirementsPath}${colors.reset}...`);
    // En Windows se usa el ejecutable de uv dentro del venv o se llama a uv pip apuntando al venv
    execSync(`uv pip install -r "${requirementsPath}" --python "${path.join(venvPath, 'Scripts', 'python.exe')}"`, { stdio: 'inherit' });
    
    console.log(`\n${colors.green}${colors.bright}✔ ¡Entorno virtual creado exitosamente con uv (Python 3.10)!${colors.reset}\n`);
  } catch (error) {
    const errorMsg = error.message || '';
    const isLocked = errorMsg.includes('acceso al archivo') || 
                      errorMsg.includes('used by another process') || 
                      errorMsg.includes('EBUSY') || 
                      errorMsg.includes('os error 32');
                      
    if (isLocked) {
      console.log(`\n${colors.red}${colors.bright}⚠️  ¡ATENCIÓN! El entorno virtual actual en "${venvPath}" está bloqueado.${colors.reset}`);
      console.log(`Esto sucede porque algún editor (como VS Code) o terminal tiene el venv abierto o indexado.`);
      console.log(`${colors.yellow}Solución: Cierra VS Code o cualquier terminal activa que use este venv y corre de nuevo: pnpm ai:setup${colors.reset}\n`);
    } else {
      console.error(`\n${colors.red}❌ Error durante el setup con uv: ${errorMsg}${colors.reset}`);
    }
    process.exit(1);
  }
};

const setupNativo = (pythonCmd) => {
  console.log(`${colors.cyan}⏳ Configurando entorno virtual de manera clásica con ${pythonCmd}...${colors.reset}`);
  
  const venvPath = path.join('ai_engine', 'venv');
  const requirementsPath = path.join('ai_engine', 'requirements.txt');
  
  try {
    // 1. Crear Venv
    console.log(`   -> Creando venv en ${colors.cyan}${colors.bright}${venvPath}${colors.reset}...`);
    execSync(`${pythonCmd} -m venv "${venvPath}"`, { stdio: 'inherit' });
    
    // 2. Instalar dependencias con pip local del venv
    console.log(`\n   -> Instalando dependencias con pip...`);
    const pipPath = path.join(venvPath, 'Scripts', 'pip.exe');
    execSync(`"${pipPath}" install -r "${requirementsPath}"`, { stdio: 'inherit' });
    
    console.log(`\n${colors.green}${colors.bright}✔ ¡Entorno virtual creado exitosamente de forma nativa (Python 3.10)!${colors.reset}\n`);
  } catch (error) {
    console.error(`\n${colors.red}❌ Error durante el setup nativo: ${error.message}${colors.reset}`);
    process.exit(1);
  }
};

const main = () => {
  printBanner();
  
  // Camino A: Usar 'uv' (Recomendado y a prueba de fallos)
  if (checkUV()) {
    setupWithUV();
    return;
  }
  
  // Camino B: Validar si el Python del sistema es compatible (3.10.x)
  console.log(`${colors.yellow}⚠ No se encontró 'uv'. Evaluando entorno de Python nativo...${colors.reset}`);
  const nativePythonVersion = checkPythonVersion('python');
  
  if (nativePythonVersion && nativePythonVersion.startsWith('3.10')) {
    console.log(`${colors.green}✔ Detectado Python del sistema compatible: v${nativePythonVersion}${colors.reset}`);
    setupNativo('python');
    return;
  }
  
  // Camino C: Probar si se puede lanzar con el launcher de Windows (py -3.10)
  if (checkPythonLauncher()) {
    console.log(`${colors.green}✔ Detectado Python Launcher compatible: py -3.10${colors.reset}`);
    setupNativo('py -3.10');
    return;
  }
  
  // Fallo: Ninguna versión compatible encontrada
  showHelpAndExit(nativePythonVersion);
};

main();
