const path = require('path')
const fs = require('fs')

const isWin = process.platform === 'win32'
const venvPython = path.join(__dirname, 'ai_engine', 'venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python')
const pythonExec = fs.existsSync(venvPython) ? venvPython : 'python'

// Asegurar existencia de directorio de logs de PM2
const logsDir = path.join(__dirname, 'logs', 'pm2')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

module.exports = {
  apps: [
    {
      name: 'siger-pos',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        UV_THREADPOOL_SIZE: 32,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        UV_THREADPOOL_SIZE: 32,
      },
      node_args: '--max-old-space-size=4096',
      error_file: 'logs/pm2/pos-err.log',
      out_file: 'logs/pm2/pos-out.log',
      log_file: 'logs/pm2/pos-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
    },
    {
      name: 'siger-ai',
      script: 'ai_engine/main.py',
      cwd: __dirname,
      interpreter: pythonExec,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      env: {
        PYTHONPATH: __dirname,
        PORT: 8000,
        ENVIRONMENT: 'production',
      },
      error_file: 'logs/pm2/ai-err.log',
      out_file: 'logs/pm2/ai-out.log',
      log_file: 'logs/pm2/ai-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
    },
  ],
}
