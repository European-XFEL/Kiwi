export default {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    // This mock might not be needed
    '^karabo-ts$': '<rootDir>/test/__mocks__/karabo-ts.ts',
    // Keep this for actual Worker imports
    '\\?worker$': '<rootDir>/test/__mocks__/WorkerMock.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.app.json',
        babelConfig: true,
      },
    ],
  },
};
