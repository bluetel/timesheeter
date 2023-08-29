/**
* @type {import("esbuild").BuildOptions}
*/
const buildOptions = {
  minify: true,
  target: "node18",
  // output to a single file with esbuild
  bundle: true,
  outfile: "dist/app.js",
  outdir: undefined,
  entryPoints: ["src/app.ts"],
  sourcemap: false,
  legalComments: "none",
}

const config = {
  esbuild: buildOptions
}

export default config;