module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'), // ¡Deben estar definidas en Render!
  },
  url: env('PUBLIC_URL', 'https://eav-malharro.onrender.com'), // ¡Con https://!
  proxy: true, // Necesario para Render/Heroku/etc.
  settings: {
    allowedHosts: ['eav-malharro.onrender.com'],
    trustProxy: true, // Clave para proxies como Render
  },
});