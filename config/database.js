module.exports = ({ env }) => ({
  connection: {
    client: 'postgres', // Fuerza a usar PostgreSQL
    connection: {
      connectionString: env('DATABASE_URL'), // Si usas la URL completa de Neon/Render
      host: env('DATABASE_HOST'), // Ej: dpg-12345678-a.oregon-postgres.render.com
      port: env.int('DATABASE_PORT', 1337),
      database: env('DATABASE_NAME'), // Nombre de tu DB en Render
      user: env('DATABASE_USERNAME'), // Usuario de la DB
      password: env('DATABASE_PASSWORD'), // Contraseña generada por Render
      ssl: {
        rejectUnauthorized: false, // ¡Obligatorio para Render y Neon!
      },
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
});