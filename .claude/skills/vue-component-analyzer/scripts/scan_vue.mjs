#!/usr/bin/env node
// Static pre-scan of Vue 3 SFCs. Produces leads (not verdicts) for the
// vue-component-analyzer skill: sizes, v-for key problems, template calls
// inside loops, listener/timer leaks, and cross-file duplication.
//
// Usage: node scan_vue.mjs [srcDir=client/src] [--json]
// Parses with vue/compiler-sfc, resolved from the project's own node_modules
// (the script lives outside the client package, so a bare import would fail).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const srcDir = path.resolve(args.find((a) => !a.startsWith('--')) || 'client/src')

// Walk up from srcDir to find a package.json whose node_modules has vue.
function loadCompiler(start) {
  let dir = start
  while (dir !== path.dirname(dir)) {
    const pkg = path.join(dir, 'package.json')
    if (fs.existsSync(pkg)) {
      try {
        return createRequire(pkg)('vue/compiler-sfc')
      } catch {}
    }
    dir = path.dirname(dir)
  }
  console.error(`Could not resolve vue/compiler-sfc from ${start}. Run npm install in the client first.`)
  process.exit(1)
}
const { parse } = loadCompiler(srcDir)

const NODE = { ELEMENT: 1, INTERPOLATION: 5, ATTRIBUTE: 6, DIRECTIVE: 7 }
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10)
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const lineCount = (s) => (s ? s.split('\n').length : 0)

function listFiles(dir, ext) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory() && e.name !== 'node_modules') out.push(...listFiles(p, ext))
    else if (ext.some((x) => e.name.endsWith(x))) out.push(p)
  }
  return out
}

// Identifiers that are called like functions inside a template expression.
const callRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g
const IGNORE_CALLS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'return',
  'typeof',
  'String',
  'Number',
  'Boolean',
  'Math',
  'Date',
  'Object',
  'Array',
  'JSON',
  'parseInt',
  'parseFloat'
])

function analyzeTemplate(ast, file, report) {
  const classes = new Set()
  const svgs = []
  // loopVars: aliases introduced by enclosing v-for scopes
  function walk(node, loopDepth, loopVars) {
    if (node.type === NODE.ELEMENT) {
      const vfor = node.props.find((p) => p.type === NODE.DIRECTIVE && p.name === 'for')
      const vif = node.props.find((p) => p.type === NODE.DIRECTIVE && p.name === 'if')
      const keyProp = node.props.find(
        (p) =>
          (p.type === NODE.DIRECTIVE && p.name === 'bind' && p.arg?.content === 'key') ||
          (p.type === NODE.ATTRIBUTE && p.name === 'key')
      )
      let vars = loopVars
      if (vfor) {
        const line = node.loc.start.line
        const expr = vfor.exp?.content || ''
        // "(item, index) in list" -> aliases [item, index]
        const m = expr.match(/^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+)$/)
        const aliases = m
          ? m[1]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []
        vars = new Set([...loopVars, ...aliases])
        const keyExpr = keyProp?.exp?.content ?? keyProp?.value?.content
        // <template v-for> puts the key on the child in Vue 3; don't flag it
        if (!keyProp && node.tag !== 'template') report.push({ file, line, kind: 'vfor-missing-key', detail: expr })
        else if (keyExpr && aliases.length > 1 && keyExpr.trim() === aliases[aliases.length - 1])
          report.push({ file, line, kind: 'vfor-index-key', detail: `${expr}  :key="${keyExpr}"` })
        if (vif)
          report.push({ file, line, kind: 'vfor-with-vif', detail: `v-if="${vif.exp?.content}" on same element` })
        if (/\.(filter|sort|map|slice|reduce)\(/.test(m?.[2] || ''))
          report.push({ file, line, kind: 'vfor-inline-transform', detail: m[2].trim() })
      }
      const depth = loopDepth + (vfor ? 1 : 0)
      for (const p of node.props) {
        if (p.type === NODE.ATTRIBUTE && p.name === 'class' && p.value)
          p.value.content.split(/\s+/).forEach((c) => c && classes.add(c))
        // bound attributes (not event handlers) evaluated every render
        if (p.type === NODE.DIRECTIVE && p.name !== 'on' && p.name !== 'for' && p.exp)
          recordCalls(p.exp.content, node.loc.start.line, depth)
      }
      if (node.tag === 'svg')
        svgs.push({ line: node.loc.start.line, h: hash(norm(node.loc.source)), lines: lineCount(node.loc.source) })
      node.children?.forEach((c) => walk(c, depth, vars))
    } else if (node.type === NODE.INTERPOLATION) {
      recordCalls(node.content.content, node.loc.start.line, loopDepth)
    } else node.children?.forEach((c) => walk(c, loopDepth, loopVars))
  }
  const calls = {}
  function recordCalls(expr, line, depth) {
    for (const [, name] of expr.matchAll(callRe)) {
      if (IGNORE_CALLS.has(name)) continue
      calls[name] ??= { count: 0, inLoop: 0, firstLine: line }
      calls[name].count++
      if (depth > 0) calls[name].inLoop++
    }
  }
  walk(ast, 0, new Set())
  return { classes, svgs, calls }
}

// Top-level-ish function definitions in a script: function foo() {...} / const foo = (...) => {...}
function extractFunctions(code, scriptStartLine) {
  const out = []
  const re =
    /(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{)/g
  for (const m of code.matchAll(re)) {
    const name = m[1] || m[2]
    let i = m.index + m[0].length
    let depth = 1
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++
      else if (code[i] === '}') depth--
      i++
    }
    const body = code.slice(m.index + m[0].length, i - 1)
    const lines = lineCount(body.trim())
    if (lines < 3) continue // trivial helpers are not worth flagging as duplicates
    out.push({ name, line: scriptStartLine + lineCount(code.slice(0, m.index)) - 1, lines, h: hash(norm(body)) })
  }
  return out
}

function analyzeScript(code, file, startLine, report) {
  const count = (re) => (code.match(re) || []).length
  const lineOf = (idx) => startLine + lineCount(code.slice(0, idx)) - 1
  const stats = {
    refs: count(/\b(ref|shallowRef|reactive)\s*\(/g),
    computed: count(/\bcomputed\s*\(/g),
    watchers: count(/\b(watch|watchEffect)\s*\(/g),
    apiCalls: count(/\bapi\.\w+\s*\(/g)
  }
  for (const m of code.matchAll(/deep\s*:\s*true/g))
    report.push({ file, line: lineOf(m.index), kind: 'deep-watch', detail: 'deep: true watcher' })
  const pairs = [
    ['addEventListener', 'removeEventListener', 'listener-not-removed'],
    ['setInterval', 'clearInterval', 'interval-not-cleared']
  ]
  for (const [add, remove, kind] of pairs) {
    const a = count(new RegExp(`\\b${add}\\s*\\(`, 'g'))
    const r = count(new RegExp(`\\b${remove}\\s*\\(`, 'g'))
    if (a > r) report.push({ file, line: lineOf(code.indexOf(add)), kind, detail: `${a}x ${add}, ${r}x ${remove}` })
  }
  for (const m of code.matchAll(/console\.log\(/g))
    report.push({ file, line: lineOf(m.index), kind: 'console-log', detail: '' })
  return stats
}

function cssBlocks(css, startLine) {
  const out = []
  // Blank out comments but keep their newlines so reported line numbers stay correct
  css = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  // flat rule blocks only; nested @media bodies are scanned as their inner rules
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const decls = m[2].split(';').map(norm).filter(Boolean).sort()
    if (decls.length < 3) continue
    out.push({
      selector: norm(m[1]),
      line: startLine + lineCount(css.slice(0, m.index)),
      h: hash(decls.join(';')),
      decls: decls.length
    })
  }
  return out
}

const components = []
const findings = []
const fnIndex = {}
const cssIndex = {}
const svgIndex = {}
const classIndex = {}

for (const file of listFiles(srcDir, ['.vue'])) {
  const rel = path.relative(process.cwd(), file)
  const { descriptor, errors } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
  if (errors.length)
    findings.push({ file: rel, line: 1, kind: 'parse-error', detail: String(errors[0].message || errors[0]) })
  const script = descriptor.scriptSetup || descriptor.script
  const apiStyle = descriptor.scriptSetup
    ? 'script-setup'
    : script && /\bsetup\s*\(/.test(script.content)
      ? 'setup()'
      : script
        ? 'options'
        : 'none'
  const c = {
    file: rel,
    apiStyle,
    lines: {
      template: lineCount(descriptor.template?.content),
      script: lineCount(script?.content),
      style: descriptor.styles.reduce((n, s) => n + lineCount(s.content), 0)
    },
    scoped: descriptor.styles.length ? descriptor.styles.every((s) => s.scoped) : null
  }
  if (descriptor.template?.ast) {
    const t = analyzeTemplate(descriptor.template.ast, rel, findings)
    c.templateCallsInLoops = Object.entries(t.calls)
      .filter(([, v]) => v.inLoop > 0)
      .map(([k, v]) => `${k}() x${v.inLoop}`)
    t.svgs.forEach((s) => (svgIndex[s.h] ??= []).push({ file: rel, line: s.line, lines: s.lines }))
    t.classes.forEach((cl) => (classIndex[cl] ??= new Set()).add(rel))
  }
  if (script) {
    const start = script.loc.start.line
    c.stats = analyzeScript(script.content, rel, start, findings)
    extractFunctions(script.content, start).forEach((f) => {
      ;(fnIndex[`h:${f.h}`] ??= []).push({ ...f, file: rel })
      ;(fnIndex[`n:${f.name}`] ??= []).push({ ...f, file: rel })
    })
  }
  for (const s of descriptor.styles)
    cssBlocks(s.content, s.loc.start.line).forEach((b) => (cssIndex[b.h] ??= []).push({ ...b, file: rel }))
  components.push(c)
}

// Helpers in plain .js files (utils/, composables/) count as "already shared"
const sharedFns = new Set()
for (const file of listFiles(srcDir, ['.js'])) {
  for (const m of fs
    .readFileSync(file, 'utf8')
    .matchAll(/export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)/g))
    sharedFns.add(m[1] || m[2])
}

const multiFile = (list) => new Set(list.map((x) => x.file)).size > 1
const dupFunctions = Object.entries(fnIndex)
  .filter(([k, v]) => k.startsWith('h:') && multiFile(v))
  .map(([, v]) => ({
    name: v[0].name,
    lines: v[0].lines,
    sites: v.map((x) => `${x.file}:${x.line}`),
    alreadyShared: sharedFns.has(v[0].name)
  }))
const sameNameFunctions = Object.entries(fnIndex)
  .filter(([k, v]) => k.startsWith('n:') && multiFile(v) && new Set(v.map((x) => x.h)).size > 1)
  .map(([k, v]) => ({
    name: k.slice(2),
    sites: v.map((x) => `${x.file}:${x.line}`),
    alreadyShared: sharedFns.has(k.slice(2))
  }))
const dupCss = Object.values(cssIndex)
  .filter(multiFile)
  .map((v) => ({ decls: v[0].decls, sites: v.map((x) => `${x.file}:${x.line} ${x.selector}`) }))
  .sort((a, b) => b.sites.length * b.decls - a.sites.length * a.decls)
const dupSvgs = Object.values(svgIndex)
  .filter((v) => v.length > 1)
  .map((v) => ({ lines: v[0].lines, sites: v.map((x) => `${x.file}:${x.line}`) }))
  .sort((a, b) => b.sites.length - a.sites.length)
// Class names that appear in 3+ components hint at a repeated UI pattern (modal shell, card, table...)
const sharedClasses = Object.entries(classIndex)
  .filter(([, s]) => s.size >= 3)
  .map(([cl, s]) => ({ cl, files: [...s].sort() }))
const clusters = {}
for (const { cl, files } of sharedClasses) (clusters[files.join('|')] ??= []).push(cl)
const patternClusters = Object.entries(clusters)
  .map(([files, cls]) => ({ classes: cls, files: files.split('|') }))
  .filter((x) => x.classes.length >= 3)
  .sort((a, b) => b.classes.length * b.files.length - a.classes.length * a.files.length)

const result = {
  srcDir: path.relative(process.cwd(), srcDir),
  components,
  findings,
  dupFunctions,
  sameNameFunctions,
  dupCss,
  dupSvgs,
  patternClusters
}

if (asJson) {
  console.log(JSON.stringify(result, null, 2))
} else {
  const p = (s = '') => console.log(s)
  p(`# Vue scan of ${result.srcDir} (${components.length} components)`)
  p('\n## Components (template/script/style lines, API style)')
  for (const c of [...components].sort(
    (a, b) => b.lines.template + b.lines.script + b.lines.style - (a.lines.template + a.lines.script + a.lines.style)
  )) {
    const big = c.lines.template > 250 || c.lines.script > 250 ? '  [LARGE]' : ''
    const loops = c.templateCallsInLoops?.length ? `  calls-in-v-for: ${c.templateCallsInLoops.join(', ')}` : ''
    const st = c.stats
      ? `  ref:${c.stats.refs} computed:${c.stats.computed} watch:${c.stats.watchers} api:${c.stats.apiCalls}`
      : ''
    p(
      `- ${c.file}  ${c.lines.template}/${c.lines.script}/${c.lines.style}  ${c.apiStyle}${c.scoped === false ? '  UNSCOPED-STYLE' : ''}${st}${big}${loops}`
    )
  }
  p('\n## Findings')
  if (!findings.length) p('(none)')
  for (const f of findings) p(`- [${f.kind}] ${f.file}:${f.line}  ${f.detail}`)
  p('\n## Identical functions in multiple files')
  dupFunctions.forEach((d) =>
    p(`- ${d.name} (${d.lines} lines)${d.alreadyShared ? ' [exists in utils/composables]' : ''}: ${d.sites.join(', ')}`)
  )
  p('\n## Same function name, different bodies')
  sameNameFunctions.forEach((d) =>
    p(`- ${d.name}${d.alreadyShared ? ' [exists in utils/composables]' : ''}: ${d.sites.join(', ')}`)
  )
  p('\n## Identical CSS rule bodies across files (top 15)')
  dupCss.slice(0, 15).forEach((d) => p(`- ${d.decls} decls x${d.sites.length}: ${d.sites.join(' | ')}`))
  if (dupCss.length > 15) p(`- ... ${dupCss.length - 15} more (use --json)`)
  p('\n## Identical inline SVGs (top 10)')
  dupSvgs.slice(0, 10).forEach((d) => p(`- ${d.lines} lines x${d.sites.length}: ${d.sites.join(', ')}`))
  p('\n## Shared class clusters (candidate shared components)')
  patternClusters
    .slice(0, 10)
    .forEach((x) =>
      p(
        `- [${x.classes.slice(0, 8).join(' ')}${x.classes.length > 8 ? ' ...' : ''}] in ${x.files.length} files: ${x.files.join(', ')}`
      )
    )
}
