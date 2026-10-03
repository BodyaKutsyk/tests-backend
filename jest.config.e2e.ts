import { createDefaultEsmPreset } from 'ts-jest';

const preset = createDefaultEsmPreset();

export default {
  ...preset,
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testMatch: ['**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
