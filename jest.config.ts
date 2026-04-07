import type { Config } from 'jest';

export default {
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^karabo-ts$': '<rootDir>/test/__mocks__/karabo-ts.ts',
    '\\?worker$': '<rootDir>/test/__mocks__/WorkerMock.ts',
    '^react-plotly.js$': '<rootDir>/test/__mocks__/plotlyMock.js',
    '^uuid$': '<rootDir>/test/__mocks__/uuidMock.ts',
  },

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.app.json',
        babelConfig: true,
        useESM: true,
      },
    ],
  },
} satisfies Config;
