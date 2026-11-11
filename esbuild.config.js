const esbuild = require('esbuild');
const path = require('path');
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [path.join(__dirname, 'public', 'main.js')],
  bundle: true,
  outfile: path.join(__dirname, 'public', 'dist', 'bundle.js'),
  format: 'esm',
  target: ['es2020'],
  sourcemap: true,
  minify: !isWatch
};

async function run() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[esbuild] Watching frontend assets...');
  } else {
    await esbuild.build(buildOptions);
    console.log('[esbuild] Frontend bundle built successfully!');
  }
}
run().catch(() => process.exit(1));
