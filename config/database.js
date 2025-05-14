module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DB_HOST'),
      port: env.int('DB_PORT', 5432), // Neon usa 5432 por defecto
      database: env('DB_NAME'),
      user: env('DB_USER'),
      password: env('DB_PASSWORD'),
      ssl: { 
        require: true,
        rejectUnauthorized: false 
      },
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000
    }
  },
});