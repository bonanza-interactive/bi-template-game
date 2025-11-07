const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = (env, argv) => {
  const isDev = argv.mode === "development";
  return {
    entry: "./src/index.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
      clean: true
    },
    resolve: {
      extensions: [".ts", ".js"]
    },
    devtool: isDev ? "eval-cheap-module-source-map" : "source-map",
    module: {
      rules: [
        { 
          test: /\.ts$/, 
          use: {
            loader: "ts-loader",
            options: { transpileOnly: true }
          }, 
          exclude: /node_modules/ 
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "../bi-wrapper-react/public/index.html")
      }),
      new ForkTsCheckerWebpackPlugin()
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, "public")
      },
      port: 4001
    }
  };
};
