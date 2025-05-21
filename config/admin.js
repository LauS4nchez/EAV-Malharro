module.exports = ({ env }) => ({
  auth: {
    secret: 'owUdYZSWC3K,=%q',
  },
  apiToken: {
    salt: '8OD3sr99qlfdOXxpj0etIlLHOUVzfzcJ',
  },
  transfer: {
    token: {
      salt: 'DtY7TOZweR',
    },
  },
  features: {
    enable: true, // Habilita el builder
    disableNoProductionWarning: true, // Ignora la advertencia de producción
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
