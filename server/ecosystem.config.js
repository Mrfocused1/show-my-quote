/**
 * PM2 process config for Show My Quote transcription server.
 * Run: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'smq-ws',
      script: 'index.js',
      cwd: '/opt/smq-transcription',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        WHISPER_URL: 'http://localhost:8001',
      },
      // PM2 reads additional env vars from .env in cwd automatically when
      // started with: pm2 start ecosystem.config.js --env production
    },
    {
      name: 'smq-whisper',
      script: '/opt/smq-transcription/venv/bin/python',
      args: '/opt/smq-transcription/whisper_service.py',
      cwd: '/opt/smq-transcription',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        WHISPER_MODEL: 'base.en',
        WHISPER_PORT: 8001,
      },
    },
  ],
};
