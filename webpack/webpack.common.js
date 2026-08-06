const BundleTracker = require('webpack-bundle-tracker')
const ExtractTranslationKeysPlugin = require('webpack-extract-translation-keys-plugin')
const fs = require('fs')
const lodash = require('lodash')
const path = require('path')
const webpack = require('webpack')

const outputPath = path.resolve(__dirname, '../jsapp/compiled/')
// ExtractTranslationKeysPlugin, for one, just fails if this directory doesn't exist
fs.mkdirSync(outputPath, { recursive: true })

// OC fork: @openclinica/logic-builder is a private optionalDependency. Use the
// real package wherever it's installed (local dev, Jenkins/prod image); fall
// back to the committed CI stub only when it's absent (public CI, which can't
// clone the private repo). Aliasing the bare specifier (with `$` for an exact
// match) and the side-effect `/style.css` covers both imports.
const logicBuilderAlias = (() => {
  try {
    // Probe the BARE specifier: it resolves through the package's `exports` map
    // (which only exposes `.` and `./style.css`) to dist/, so it proves the
    // package is installed AND built. Probing `<pkg>/package.json` throws
    // ERR_PACKAGE_PATH_NOT_EXPORTED even when installed (round-7: that made
    // every build silently bundle the stub).
    require.resolve('@openclinica/logic-builder')
    console.log('[logic-builder] bundling the real @openclinica/logic-builder package')
    return {} // installed → normal node_modules resolution (respects its exports)
  } catch {
    console.log('[logic-builder] private package absent — bundling the CI stub')
    const stub = path.join(__dirname, '..', 'jsapp', 'js', 'openclinica', 'logic-builder-stub')
    return {
      '@openclinica/logic-builder$': path.join(stub, 'index.tsx'),
      '@openclinica/logic-builder/style.css': path.join(stub, 'style.css'),
    }
  }
})()

// HACK: we needed to define this postcss-loader because of a problem with
// including CSS files from node_modules directory, i.e. this build error:
// `Error: No PostCSS Config found in: /srv/node_modules/…`
const postCssLoader = {
  loader: 'postcss-loader',
  options: {
    sourceMap: true,
    postcssOptions: {
      plugins: ['autoprefixer'],
    },
  },
}

const swcLoader = {
  loader: require.resolve('swc-loader'),
  options: {
    jsc: {
      transform: {
        react: {
          refresh: true,
        },
      },
    },
  },
}

const commonOptions = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [swcLoader],
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        // Find TypeScript errors on CI and local builds
        // Allow skipping to save resources.
        use: process.env.SKIP_TS_CHECK ? [swcLoader] : [swcLoader, 'ts-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', postCssLoader],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: ['style-loader', 'css-loader', postCssLoader, 'sass-loader'],
      },
      {
        test: /\.module\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
              sourceMap: true,
            },
          },
          postCssLoader,
          'sass-loader',
        ],
      },
      {
        test: /\.coffee$/,
        use: {
          loader: 'coffee-loader',
        },
      },
      {
        test: /\.(png|jpg|gif|ttf|eot|svg|woff(2)?)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.jsx', '.js', '.coffee', '.ts', '.tsx', '.scss'],
    alias: {
      '#': path.join(__dirname, '..', 'jsapp', 'js'), // TODO: someday rename "js" to "src".
      js: path.join(__dirname, '..', 'jsapp', 'js'), // within scss files only, sass-loader doesn't handle # char.
      scss: path.join(__dirname, '..', 'jsapp', 'scss'), // within scss files only.
      // OC fork: dedupe React so the git-pinned `@openclinica/logic-builder`
      // (which externalizes react/react-dom) binds to kpi's single React 18
      // copy instead of its own dev-dependency React.
      react: path.join(__dirname, '../node_modules/react'),
      'react-dom': path.join(__dirname, '../node_modules/react-dom'),
      ...logicBuilderAlias,
    },
    // HACKFIX: needed because of https://github.com/react-dnd/react-dnd/issues/3423
    fallback: {
      'react/jsx-runtime': 'react/jsx-runtime.js',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
    },
  },
  plugins: [
    new BundleTracker({ path: __dirname, filename: 'webpack-stats.json' }),
    new ExtractTranslationKeysPlugin({
      functionName: 't',
      output: path.join(outputPath, 'extracted-strings.json'),
    }),
    new webpack.ProvidePlugin({ $: 'jquery' }),
  ],
}

module.exports = (options) => {
  options = lodash.mergeWith(commonOptions, options || {}, (objValue, srcValue) => {
    if (lodash.isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  })
  return options
}
