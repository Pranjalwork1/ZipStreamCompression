import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

interface SeoValidationResult {
  route: string;
  hasTitle: boolean;
  title: string;
  hasDescription: boolean;
  description: string;
  hasCanonical: boolean;
  canonical: string;
  hasH1: boolean;
  h1: string;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasJsonLd: boolean;
  internalLinks: string[];
  issues: string[];
}

import { TOOL_ROUTES } from './prerender_seo';

const CHECKED_ROUTES = [
  '/',
  '/pdf-tools',
  ...TOOL_ROUTES.map((r) => r.path),
];

export function verifySeo(): boolean {
  console.log('🔍 Running Comprehensive SEO Technical Audit on ZipStream distribution...\n');

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const allDiscoveredLinks = new Set<string>();
  const results: SeoValidationResult[] = [];
  let totalErrors = 0;

  for (const route of CHECKED_ROUTES) {
    const filePath = route === '/'
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, route.replace(/^\//, ''), 'index.html');

    const result: SeoValidationResult = {
      route,
      hasTitle: false,
      title: '',
      hasDescription: false,
      description: '',
      hasCanonical: false,
      canonical: '',
      hasH1: false,
      h1: '',
      hasOgTitle: false,
      hasOgDescription: false,
      hasJsonLd: false,
      internalLinks: [],
      issues: [],
    };

    if (!fs.existsSync(filePath)) {
      result.issues.push(`Missing pre-rendered static HTML file at: ${filePath}`);
      totalErrors++;
      results.push(result);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');

    // Title Check
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1].trim()) {
      result.hasTitle = true;
      result.title = titleMatch[1].trim();
      if (titles.has(result.title) && titles.get(result.title) !== route) {
        result.issues.push(`Duplicate title detected: "${result.title}" (also used on ${titles.get(result.title)})`);
        totalErrors++;
      } else {
        titles.set(result.title, route);
      }
    } else {
      result.issues.push('Missing or empty <title> tag');
      totalErrors++;
    }

    // Meta Description Check
    const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"\s*\/?>/i);
    if (descMatch && descMatch[1].trim()) {
      result.hasDescription = true;
      result.description = descMatch[1].trim();
      if (descriptions.has(result.description) && descriptions.get(result.description) !== route) {
        result.issues.push(`Duplicate meta description detected (also used on ${descriptions.get(result.description)})`);
        totalErrors++;
      } else {
        descriptions.set(result.description, route);
      }
    } else {
      result.issues.push('Missing or empty meta description');
      totalErrors++;
    }

    // Canonical Tag Check
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="(.*?)"\s*\/?>/i);
    if (canonicalMatch && canonicalMatch[1].trim()) {
      result.hasCanonical = true;
      result.canonical = canonicalMatch[1].trim();
      const expectedCanonical = `https://zipstream.online${route === '/' ? '/' : route}`;
      if (result.canonical !== expectedCanonical && result.canonical !== expectedCanonical + '/') {
        result.issues.push(`Canonical mismatch: got "${result.canonical}", expected "${expectedCanonical}"`);
        totalErrors++;
      }
    } else {
      result.issues.push('Missing canonical <link rel="canonical"> tag');
      totalErrors++;
    }

    // H1 Heading Check
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1].trim()) {
      result.hasH1 = true;
      result.h1 = h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    } else {
      result.issues.push('Missing semantic <h1> heading tag in HTML response');
      totalErrors++;
    }

    // OpenGraph Tags Check
    result.hasOgTitle = /<meta\s+property="og:title"/i.test(html);
    result.hasOgDescription = /<meta\s+property="og:description"/i.test(html);
    if (!result.hasOgTitle) {
      result.issues.push('Missing og:title metadata');
      totalErrors++;
    }

    // Structured Data (JSON-LD) Check
    result.hasJsonLd = /<script\s+type="application\/ld\+json"/i.test(html);
    if (!result.hasJsonLd) {
      result.issues.push('Missing JSON-LD structured data');
      totalErrors++;
    }

    // Internal Link Extraction
    const linkMatches = html.matchAll(/<a\s+[^>]*href="(\/[^"#?]*)"[^>]*>/gi);
    for (const match of linkMatches) {
      const link = match[1];
      result.internalLinks.push(link);
      allDiscoveredLinks.add(link);
    }

    results.push(result);
  }

  // Summary Report
  console.log('------------------------------------------------------------');
  console.log(`Audited ${results.length} Core Canonical Routes:`);
  for (const r of results) {
    if (r.issues.length === 0) {
      console.log(`  ✅ [200 OK] ${r.route.padEnd(22)} | Title: "${r.title.slice(0, 42)}…" | H1: "${r.h1.slice(0, 30)}…"`);
    } else {
      console.log(`  ❌ [FAIL]   ${r.route.padEnd(22)} | Issues:`);
      for (const issue of r.issues) {
        console.log(`       - ${issue}`);
      }
    }
  }

  // Internal Link Validation Check
  console.log('\n------------------------------------------------------------');
  console.log(`🔗 Internal Hyperlink Graph Validation (${allDiscoveredLinks.size} unique internal links discovered):`);
  let brokenLinks = 0;
  for (const link of allDiscoveredLinks) {
    const isFile = path.extname(link).length > 0;
    const targetFile = link === '/'
      ? path.join(DIST_DIR, 'index.html')
      : isFile
        ? path.join(DIST_DIR, link.replace(/^\//, ''))
        : path.join(DIST_DIR, link.replace(/^\//, ''), 'index.html');

    if (!fs.existsSync(targetFile)) {
      console.log(`  ❌ Broken internal link detected: ${link} -> File not found`);
      brokenLinks++;
      totalErrors++;
    }
  }

  if (brokenLinks === 0) {
    console.log(`  ✅ All ${allDiscoveredLinks.size} internal hyperlinks resolve to valid pre-rendered HTML files!`);
  }

  // Sitemap and Robots Verification
  console.log('\n------------------------------------------------------------');
  const sitemapExists = fs.existsSync(path.join(DIST_DIR, 'sitemap.xml'));
  const robotsExists = fs.existsSync(path.join(DIST_DIR, 'robots.txt'));
  console.log(`  ${sitemapExists ? '✅' : '❌'} sitemap.xml exists in dist/`);
  console.log(`  ${robotsExists ? '✅' : '❌'} robots.txt exists in dist/`);

  if (!sitemapExists || !robotsExists) {
    totalErrors++;
  }

  console.log('------------------------------------------------------------');
  if (totalErrors === 0) {
    console.log('🎉 SEO Technical Audit PASSED! All pages have unique metadata, canonicals, H1s, schema, and valid links.\n');
    return true;
  } else {
    console.error(`💥 SEO Technical Audit FAILED with ${totalErrors} issue(s).\n`);
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = verifySeo();
  if (!success) process.exit(1);
}
