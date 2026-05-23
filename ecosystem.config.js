module.exports = {
  apps: [
    {
      name: 'fondomarino-pos',
      script: 'server-production.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
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
      node_args: '--max-old-space-size=12288',
      error_file: 'logs/pm2/pos-err.log',
      out_file: 'logs/pm2/pos-out.log',
      log_file: 'logs/pm2/pos-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json'
    },
    {
      name: 'fondomarino-ai',
      script: 'ai_engine/main.py',
      cwd: __dirname,
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
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
      log_type: 'json'
    }
  ]
}