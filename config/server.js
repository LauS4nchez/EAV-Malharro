module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  url: env('PUBLIC_URL', 'http://localhost:1337'), // Asegúrate de que esto esté configurado
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  // Agrega esto:
  settings: {
    allowedHosts: [
      'eav-malharro.onrender.com',
      // Otros hosts si es necesario, como 'localhost'
    ],
  },
});