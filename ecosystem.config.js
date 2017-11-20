module.exports = {
    apps: [{
        name: "zip2zim",
        script: "./build/index.js",
        instances: 1,
        env_production: {
            NODE_ENV: "production"
        }
    }]
};