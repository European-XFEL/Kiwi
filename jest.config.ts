import type { Config } from 'jest';

export default {
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(gif|ttf|eot|svg|png)(\\?url)?$':
      '<rootDir>/test/__mocks__/fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^karabo-ts$': '<rootDir>/test/__mocks__/karabo-ts.ts',
    '\\?worker$': '<rootDir>/test/__mocks__/WorkerMock.ts',
    '^react-plotly.js$': '<rootDir>/test/__mocks__/plotlyMock.js',
    '^chart.js/auto$': '<rootDir>/test/__mocks__/chartJsMock.ts',
    '^uuid$': '<rootDir>/test/__mocks__/uuidMock.ts',
  },

  transform: {
    '^.+\\.m?js$': [
      'babel-jest',
      {
        babelrc: false,
        presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      },
    ],
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.app.json',
        babelConfig: true,
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-arborist|react-dnd|react-dnd-html5-backend|dnd-core|@react-dnd|react-resizable-panels)/)',
  ],
} satisfies Config;
