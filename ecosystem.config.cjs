module.exports = {
  apps: [
    {
      name: 'admin-dashboard',
      script: 'npm',
      args: 'run dev -- -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
