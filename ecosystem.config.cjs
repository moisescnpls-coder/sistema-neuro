module.exports = {
    apps: [{
        name: "sistema-neuro",
        script: "./backend/index.js",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: "production",
            PORT: 3001
        },
        node_args: "--env-file=backend/.env"
    }]
}
