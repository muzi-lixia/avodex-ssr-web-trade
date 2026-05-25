// @az/ssg 用 process.PROJECT_NAME 拼 seo.${name}.*，与 process.env 不同；现货站与 locales 中 seo.spot 对齐
process.PROJECT_NAME = process.PROJECT_NAME || process.env.PROJECT_NAME || "spot";

const fs = require("fs");
const withPlugins = require("next-compose-plugins");
const withLess = require("next-with-less");
const withOptimizedImages = require("next-optimized-images");
const path = require("path");
const tms = [];
const azComs = fs.readdirSync("node_modules/@az", { encoding: "utf8" });
for (let i = 0; i < azComs.length; ++i) {
  if (azComs[i][0] != ".") tms.push("@az/" + azComs[i]);
}

const withTM = require("next-transpile-modules")(tms);
const isProduction = process.env.NODE_ENV === "production";

const Package = require("./package.json");
console.log("【process.env.NEXT_PUBLIC_LOCAL】=", process.env.NEXT_PUBLIC_LOCAL);
console.log("【process.env.NEXT_PUBLIC_cdn】=", process.env.NEXT_PUBLIC_cdn);
console.log("【process.env.NODE_ENV】=", process.env.NODE_ENV);
console.log("【Package.version】=", Package.version);

const { locales } = require("./src/locales/map.json");
const proxyApi = require("./proxyApi.json");

const nextConfig = {
  experimental: {
    outputStandalone: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  assetPrefix: isProduction ? process.env.NEXT_PUBLIC_cdn : undefined,
  images: {
    disableStaticImages: true,
  },
  i18n: {
    locales: ["default", "en", "zh-HK", "ja", "ko"], // ["default", ...locales.map((obj) => obj.name)],
    defaultLocale: "default",
    localeDetection: false,
  },
  compiler: {
    styledComponents: true,
    removeConsole: process.env.NEXT_PUBLIC_ENV == "prod",
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "./src/styles")],
    // additionalData: `@import "@/styles/variable.scss";`,
  },
  webpack: (config, {}) => {
    const rules = config.module.rules.find((rule) => typeof rule.oneOf === "object").oneOf.filter((rule) => Array.isArray(rule.use));

    rules.forEach((rule) => {
      rule.use.forEach((moduleLoader) => {
        if (moduleLoader.loader && moduleLoader.loader.includes("/css-loader/") && typeof moduleLoader.options.modules === "object") {
          moduleLoader.options = {
            ...moduleLoader.options,
            modules: {
              ...moduleLoader.options.modules,
              exportLocalsConvention: "camelCase",
            },
          };
        }
      });
    });
    for (var i = 0; i < config.module.rules.length; ++i) {
      if (config.module.rules[i].test && config.module.rules[i].test.test(".svg")) {
        if (!config.module.rules[i].exclude) config.module.rules[i].exclude = [];
        config.module.rules[i].exclude.push(path.resolve(__dirname, "./src/assets/icon-svg"));
        config.module.rules[i].exclude.push(new RegExp(`${path.resolve(__dirname, "./node_modules/@az")}\/.+\/.+\\.svg`));
      }
    }
    config.module.rules.push({
      test: /\.svg$/,
      include: [path.resolve(__dirname, "./src/assets/icon-svg"), path.resolve(__dirname, "./node_modules/@az")],
      use: ["svg-inline-loader"],
    });

    return config;
  },
  async rewrites() {
    // const sourceAry = ["uaapi", "sapi", "fapi", "dapi", "exapi/app", "exapi/lever", "exapi/redemption", "exapi/message", "exapi"];
    const host = process.env.NEXT_PUBLIC_protocol + "//" + process.env.NEXT_PUBLIC_host;
    const list = proxyApi.map((path) => {
      return {
        source: `/${path}/:slug*`,
        destination: `${host}/${path}/:slug*`,
      };
    });
    return list;
  },
  async redirects() {
    const defaultMarket = process.env.NEXT_PUBLIC_DEFAULT_MARKET || "hive_usdt";
    return [
      {
        source: "/",
        destination: `/trade/${defaultMarket}`,
        permanent: true,
      },
      {
        source: "/trade",
        destination: `/trade/${defaultMarket}`,
        permanent: true,
      },
      {
        source: "/trade-order",
        destination: `/trade-order/${defaultMarket}`,
        permanent: true,
      },
    ];
  },
};

const plugins = [
  [
    withOptimizedImages,
    {
      optimizeImages: false,
    },
  ],
  withLess,
  withTM,
];

module.exports = withPlugins(plugins, nextConfig);
