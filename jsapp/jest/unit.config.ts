import type { Config } from 'jest'
import { defaults } from 'jest-config'

// OC fork: @openclinica/logic-builder is a private optionalDependency. Map the
// bare specifier to the committed CI stub only when the real package isn't
// installed (public CI); otherwise let jest resolve the real one. Its
// `/style.css` import is already covered by the CSS mapper below.
const logicBuilderMap = ((): Record<string, string> => {
  try {
    require.resolve('@openclinica/logic-builder')
    return {}
  } catch {
    return {
      '^@openclinica/logic-builder$': '<rootDir>/../js/openclinica/logic-builder-stub/index.tsx',
    }
  }
})()

// Config to run ☕ unit tests using the Jest runner
//
// To run the unit tests: 🏃
//
//     npx jest --config ./jsapp/jest/unit.config.ts
//

const config: Config = {
  // Naming convention (*.tests.*)
  testMatch: ['**/?(*.)+(tests).(js|jsx|ts|tsx|coffee)'],

  // Where to find tests. <rootDir> = 'kpi/jsapp/jest'
  roots: [
    '<rootDir>/../js/', // unit tests    🛠️ 'jsapp/js/**/*.tests.ts'
    '<rootDir>/../../test/', // xlform/coffee ☕ 'test/**/*.tests.coffee'
  ],

  // Where to resolve module imports
  moduleNameMapper: {
    // ℹ️ same aliases as in webpack.common.js (module.resolve.alias)
    '^#/(.*)$': '<rootDir>/../js/$1', // 📁 'js/*'
    ...logicBuilderMap, // 🧩 CI stub for the private @openclinica/logic-builder when absent
    // 🎨 mock all CSS modules imported (styles.root = 'root')
    '\\.(css|scss)$': 'identity-obj-proxy',
  },

  // Extensions to try in order (for import statements with no extension)
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'coffee'],

  // Transformers (SWC for JS/TS, CoffeeScript for .coffee)
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '@swc/jest',
    '^.+\\.coffee$': '<rootDir>/coffeeTransformer.js',
  },

  // Exclude these files, even if they contain tests
  testPathIgnorePatterns: [
    'test/xlform/integration.tests.coffee$', // 📄 skipped in `ee98aebe631b`
    ...defaults.testPathIgnorePatterns, // 📦 exclude '/node_modules/'
  ],

  // Set up test environment
  testEnvironment: 'jsdom',

  // Make Chai and jQuery globals available in the test environment
  setupFilesAfterEnv: ['<rootDir>/setupUnitTest.ts'],

  // Appearance options (for console output)
  verbose: true,
  displayName: { name: 'UNIT', color: 'black' },
}

export default config
