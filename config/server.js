module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  url: env('PUBLIC_URL', 'https://eav-malharro.onrender.com'),
  proxy: true,
  // Configuración correcta de allowedHosts:
  server: {
    allowedHosts: ['eav-malharro.onrender.com'],
  },
  admin: {
    url: '/admin',
    serveAdminPanel: true,
  },
});