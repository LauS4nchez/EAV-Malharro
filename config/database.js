module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DB_HOST'),        // ← Ahora sí coincide
      port: env.int('DB_PORT', 1337),
      database: env('DB_NAME'),
      user: env('DB_USER'),
      password: env('DB_PASSWORD'),
      ssl: { rejectUnauthorized: false },
    },
  },
});