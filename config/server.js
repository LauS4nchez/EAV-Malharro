module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'), // Asegúrate de definir APP_KEYS en Render
  },
  url: env('PUBLIC_URL', 'https://eav-malharro.onrender.com'), // ¡Con https://!
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  settings: {
    allowedHosts: ['eav-malharro.onrender.com'],
    trustProxy: true, // 🔥 Clave para Render
  },
});