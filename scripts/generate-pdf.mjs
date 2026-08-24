// Converts a Markdown file to a print-formatted PDF using markdown-it + puppeteer.
//
// Not wired into package.json — run explicitly:
//   npm install --save-dev puppeteer markdown-it
//   node scripts/generate-pdf.mjs docs/ARCHITECTURE_REPORT.md docs/ARCHITECTURE_REPORT.pdf

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [, , inputArg, outputArg] = process.argv

if (!inputArg) {
  console.error('Usage: node scripts/generate-pdf.mjs <input.md> [output.pdf]')
  process.exit(1)
}

const inputPath = path.resolve(inputArg)
const outputPath = path.resolve(outputArg ?? inputPath.replace(/\.md$/, '.pdf'))

const [{ default: MarkdownIt }, puppeteer] = await Promise.all([
  import('markdown-it'),
  import('puppeteer'),
])

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
const source = await readFile(inputPath, 'utf-8')
const bodyHtml = md.render(source)

const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 22mm 18mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1a1a1a;
    max-width: 780px;
    margin: 0 auto;
  }
  h1 { font-size: 20pt; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 15pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 28px; page-break-after: avoid; }
  h3 { font-size: 12.5pt; margin-top: 20px; page-break-after: avoid; }
  h4 { font-size: 11pt; margin-top: 14px; page-break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 9pt;
    background: #f3f3f3;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f6f6f6;
    border: 1px solid #e2e2e2;
    border-radius: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th, td { border: 1px solid #ddd; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; font-weight: 600; }
  blockquote {
    border-left: 3px solid #ccc;
    margin: 12px 0;
    padding: 2px 14px;
    color: #555;
  }
  hr { border: none; border-top: 1px solid #ccc; margin: 28px 0; }
  a { color: #2563eb; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`

const browser = await puppeteer.launch({ headless: true })
try {
  const tab = await browser.newPage()
  await tab.setContent(page, { waitUntil: 'networkidle0' })
  await tab.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#888;">' +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '22mm', bottom: '18mm', left: '18mm', right: '18mm' },
  })
} finally {
  await browser.close()
}

console.log(`Wrote ${outputPath}`)
