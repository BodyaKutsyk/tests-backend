import { createDefaultEsmPreset } from 'ts-jest';
import type { Config } from 'jest';

const preset = createDefaultEsmPreset();

const sharedConfig: Config = {
  ...preset,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFiles: ['<rootDir>/test-setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
};

const config: Config = {
  reporters: ['default'],
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/**/*.spec.ts'],
    },
    {
      ...sharedConfig,
      displayName: 'integration',
      testMatch: ['<rootDir>/**/*.integration-spec.ts'],
    },
    {
      ...sharedConfig,
      displayName: 'e2e',
      testMatch: ['<rootDir>/**/*.e2e-spec.ts'],
    },
  ],
};

export default config;
