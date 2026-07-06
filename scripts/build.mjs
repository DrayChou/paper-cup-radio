import { build } from 'esbuild'
import fs from 'fs'

fs.mkdirSync('dist', { recursive: true })
fs.mkdirSync('public', { recursive: true })

await Promise.all([
  build({
    entryPoints: ['src/server.ts'],
    outfile: 'dist/server.js',
    platform: 'node',
    bundle: true,
    format: 'cjs',
    target: 'node18',
    sourcemap: false,
  }),
  build({
    entryPoints: ['src/mobile.ts'],
    outfile: 'public/mobile.js',
    platform: 'browser',
    bundle: true,
    format: 'iife',
    target: 'es2020',
    sourcemap: false,
  }),
  build({
    entryPoints: ['src/desktop.ts'],
    outfile: 'public/desktop.js',
    platform: 'browser',
    bundle: true,
    format: 'iife',
    target: 'es2020',
    sourcemap: false,
  }),
])

console.log('Build completed.')
