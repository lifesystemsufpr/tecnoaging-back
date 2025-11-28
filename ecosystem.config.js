module.exports = {
  apps: [{
    name: 'TecnoAging-api',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      //PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }, {
    name: 'TecnoAging-python',
    script: './venv/bin/uvicorn', 
    args: 'main:app --host 0.0.0.0 --port 8001',
    cwd: './python-service',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '../logs/python_err.log',
    out_file: '../logs/python_out.log',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
