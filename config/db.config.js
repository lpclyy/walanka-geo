module.exports = {
  dbConfig: {
    host: 'localhost',
    user: 'walanka',
    password: '123456',
    database: 'walanka_geo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  redisConfig: {
    url: 'redis://localhost:6379'
  },
  jwtSecret: 'your_jwt_secret',
  jwtExpiresIn: '7d'
};