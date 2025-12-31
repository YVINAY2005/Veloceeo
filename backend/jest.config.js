
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^../../lib/prisma$': '<rootDir>/src/lib/prisma.ts',
  },
};
