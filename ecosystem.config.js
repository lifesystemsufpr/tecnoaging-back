module.exports = {
  apps: [{
    name: 'TecnoAging-api',
    script: 'dist/main.js',
    cwd: '/opt/tecnoaging/back',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3333,
    },            
    error_file: '/var/log/pm2/tecnoaging-api.err.log',
    out_file: '/var/log/pm2/tecnoaging-api.out.log',
    time: true,
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }, {
    name: 'TecnoAging-python',
    script: 'main.py',
    interpreter: './python-service/venv/bin/python',
    cwd: './python-service',
    instances: 1,
    exec_mode: 'fork',
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