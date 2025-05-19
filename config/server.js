module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),  // Necesario para Render
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),  // Debe estar definido en Render
  },
  url: env('PUBLIC_URL', 'localhost:1337'),
  proxy: true,  // Necesario para Render/Heroku
  settings: {
    allowedHosts: ['eav-malharro.onrender.com'],
    trustProxy: true,  // Clave para proxies como Render
  },
    admin: {
    url: '/admin',  // Ruta base del panel admin
    serveAdminPanel: true,  // Asegúrate de que Strapi sirva el panel
  },
});