import {build} from 'esbuild';import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
await mkdir('public',{recursive:true});
await build({entryPoints:['src/ui.tsx'],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2020'],outfile:'public/ui.js',define:{'process.env.NODE_ENV':'"production"'},jsx:'automatic'});
execFileSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i','src/theme.css','-o','public/ui.css','--minify'],{stdio:'inherit'});
for(const name of ['enhancements.css','enhancements.js','sync.js','mobile.js'])await copyFile('src/'+name,'public/'+name);
await writeFile('app/index-html.ts','export default '+JSON.stringify(await readFile('src/index.html','utf8'))+';\n');
execFileSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit',env:process.env});
console.log('Built Kadry with shadcn/ui components.');
