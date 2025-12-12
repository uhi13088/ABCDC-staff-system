module.exports = {
  apps: [
    {
      name: 'admin-dashboard',
      script: 'npm',
      args: 'run dev -- -p 3005',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3005
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
