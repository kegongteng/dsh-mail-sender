import { build } from 'esbuild'

const id = 'dsh-mail-sender'

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client/index.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/cordis'],
  banner: {
    js: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:require=>{var module={exports:{}};var exports=module.exports;Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});`,
  },
  footer: {
    js: 'Object.defineProperty(module.exports,Symbol.toStringTag,{value:"Module"});return module.exports}});',
  },
})
