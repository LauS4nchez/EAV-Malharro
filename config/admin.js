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
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
