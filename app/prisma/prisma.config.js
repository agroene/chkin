module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  migrations: {
    seed: "./prisma/seed.ts",
  },
};
