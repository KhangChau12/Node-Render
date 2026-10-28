import path from "node:path";
import { Config } from "@remotion/cli/config";

// Let examples import from "@kit" exactly like AI-written scenes do.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias ?? {}), "@kit": path.join(process.cwd(), "src", "index.ts") },
  },
}));
