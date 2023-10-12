/**
* @type {import("esbuild").BuildOptions}
*/
const buildOptions = {
  minify: true,
  target: "node18",
  // output to a single file with esbuild
  bundle: true,
  outfile: "dist/scheduler-app.js",
  outdir: undefined,
  entryPoints: ["src/scheduler-app.ts"],
  sourcemap: false,
  legalComments: "none",
}

const config = {
  esbuild: buildOptions
}

export default config;