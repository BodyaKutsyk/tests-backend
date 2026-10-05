import { createDefaultEsmPreset } from 'ts-jest';

const preset = createDefaultEsmPreset();

export default {
  ...preset,
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test-setup.js'],
  reporters: ['default'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
