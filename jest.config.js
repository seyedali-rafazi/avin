/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          strict: true,
          esModuleInterop: true,
          moduleResolution: 'node',
        },
      },
    ],
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
