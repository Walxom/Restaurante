module.exports = {
  apps: [{
    name: 'mrfrit-system',
    script: 'server-production.js',
    cwd: 'C:\\Users\\JOSE\\Desktop\\Universidad\\Restaurante',
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
    error_file: 'logs\\pm2\\err.log',
    out_file: 'logs\\pm2\\out.log',
    log_file: 'logs\\pm2\\combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_type: 'json'
  }]
}