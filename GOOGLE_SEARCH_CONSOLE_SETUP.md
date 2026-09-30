# Google Search Console Setup & Verification Guide for ZipStream.online

This operational guide details the exact step-by-step procedure for verifying ownership, submitting sitemaps, requesting URL indexing, and monitoring search performance for **ZipStream.online** in Google Search Console (GSC).

---

## Pre-Requisite Verification Assets Already Deployed

The following technical assets are live in production:
1. **Google Site Verification Meta Tag:**
   ```html
   <meta name="google-site-verification" content="google53d4a97d2e287d34" />
   ```
2. **Canonical XML Sitemap:**
   ```text
   https://zipstream.online/sitemap.xml
   ```
3. **Robots Exclusion Standard (`robots.txt`):**
   ```text
   https://zipstream.online/robots.txt
   ```
4. **Pre-rendered HTML Shells:**
   Every tool route (e.g., `/compress-pdf`, `/merge-pdf`, `/split-pdf`, `/pdf-to-word`) returns HTTP 200 with complete crawlable DOM, semantic `<h1>`, `<meta name="description">`, `<link rel="canonical">`, and structured JSON-LD data.

---

## Step 1: Add Property in Google Search Console

1. Navigate to [Google Search Console](https://search.google.com/search-console).
2. Click **Add Property** in the property selector dropdown.
3. You will be prompted to choose between two property types:
   * **Domain property** (`zipstream.online`): Requires DNS verification via TXT record on Cloudflare DNS. *(Recommended for comprehensive cross-subdomain and protocol tracking).*
   * **URL prefix property** (`https://zipstream.online`): Allows instant HTML meta tag verification.
4. For immediate verification, select **URL prefix** and enter `https://zipstream.online`. (You may also add the Domain property for DNS redundancy).

---

## Step 2: Verify Property Ownership

ZipStream supports multiple verification methods:

### Method A: HTML Tag (Instant)
Since `<meta name="google-site-verification" content="google53d4a97d2e287d34" />` is already embedded in the `<head>` of `index.html` across all pre-rendered pages:
1. Select **HTML tag** in GSC.
2. Click **Verify**.
3. Googlebot will fetch `https://zipstream.online/` and confirm the token.

### Method B: DNS TXT Record via Cloudflare (Domain Level)
1. In Cloudflare Dashboard, navigate to **DNS** > **Records**.
2. Add a new record:
   * **Type:** `TXT`
   * **Name:** `@` (or `zipstream.online`)
   * **Content:** The `google-site-verification=...` string supplied by GSC.
   * **TTL:** Auto
3. In GSC, click **Verify**.

---

## Step 3: Submit the XML Sitemap

1. In GSC, click **Sitemaps** under the **Indexing** section in the left sidebar.
2. Under **Add a new sitemap**, enter:
   ```text
   sitemap.xml
   ```
3. Click **Submit**.
4. Status will initially show as *Submitted*. Within 10 to 60 minutes, Google will process the sitemap and display *Success* along with the count of discovered URLs (currently 39 URLs).

---

## Step 4: Inspect Key Tool Landing Pages (`/compress-pdf`, etc.)

Verify how Google's Web Rendering Service (WRS) parses your pre-rendered HTML:

1. Click the search bar at the very top of GSC (**Inspect any URL in "https://zipstream.online"**).
2. Enter the primary landing page URL:
   ```text
   https://zipstream.online/compress-pdf
   ```
3. Click **Test Live URL** (top right corner).
4. Review the test results:
   * **HTTP Response:** Must be `HTTP 200`.
   * **Page fetch:** Successful.
   * **User-agent:** Googlebot smartphone.
   * **View Tested Page** > **HTML tab:** Verify that the semantic `<h1>Compress PDF Online Free</h1>`, benefits, HowTo steps, FAQs, and JSON-LD schema are present in the parsed DOM.
   * **View Tested Page** > **Screenshot tab:** Verify that the page renders without horizontal clipping or blocked UI elements.

---

## Step 5: Request Indexing for High-Priority Pages

Google enforces daily quota limits on manual indexing requests, so prioritize high-intent landing pages:

1. `/` (Homepage)
2. `/pdf-tools` (Central tool directory)
3. `/compress-pdf` (Primary compression tool)
4. `/merge-pdf` (High search volume)
5. `/split-pdf`
6. `/pdf-to-word`
7. `/pdf-to-jpg`
8. `/jpg-to-pdf`
9. `/word-to-pdf`
10. `/protect-pdf`

For each URL:
* Inspect URL in GSC.
* Click **Request Indexing**.

*(Note: Requesting indexing places the URL in Google's crawl queue; actual indexing typically occurs within 24 to 72 hours).*

---

## Step 6: Monitor Indexing Coverage & Status

Check the **Pages** report weekly:

1. **Indexed vs. Not Indexed:**
   * Expected state: Pre-rendered tool routes move from *Discovered - currently not indexed* to *Crawled - currently not indexed* to **Indexed**.
2. **Review "Not Indexed" Reasons:**
   * **Alternate page with proper canonical tag:** Normal if query-string URLs or trailing slashes are accessed; verify that canonical targets `https://zipstream.online/<tool>`.
   * **Crawled - currently not indexed:** Usually reflects crawl budget or content evaluation phase; pre-rendered rich content and internal links will accelerate indexing.
   * **Excluded by 'noindex' tag:** Ensure no public tool routes ever contain `noindex` directives.
   * **Soft 404:** All invalid paths in ZipStream return client-side 404 boundaries without duplicate indexable content.

---

## Step 7: Monitor Search Queries & Impressions

Under **Performance** > **Search results**:

1. Enable metrics:
   * **Total clicks**
   * **Total impressions**
   * **Average CTR**
   * **Average position**
2. Filter by Pages:
   * Track `/compress-pdf` for queries: `compress pdf`, `pdf compressor`, `reduce pdf size`, `compress pdf online free`.
   * Track `/merge-pdf` for queries: `merge pdf`, `combine pdf`, `merge pdf files`.
   * Track `/pdf-to-word` for queries: `pdf to word`, `convert pdf to word`, `pdf to docx`.
3. High Impressions + Low CTR indicates an opportunity to test title tags or meta descriptions for clearer search-intent alignment.

---

## Step 8: Monitor Core Web Vitals & Page Experience

Under **Experience** in GSC:

1. **Core Web Vitals:**
   * **LCP (Largest Contentful Paint):** Target < 2.5s. ZipStream achieves this by pre-rendering critical DOM and deferring heavy WebAssembly / PDF processing engines until user upload.
   * **INP (Interaction to Next Paint):** Target < 200ms. Handled via lightweight UI state and background Web Workers for compression.
   * **CLS (Cumulative Layout Shift):** Target < 0.1. Static shells have fixed-dimension containers to prevent layout jumps upon React hydration.
2. **Mobile Usability:**
   * Verify all touch targets exceed 48px.
   * Ensure viewport meta tag is configured: `width=device-width, initial-scale=1.0`.

---

## Summary Checklist

| Action Item | Target Status | Verification Path |
| :--- | :--- | :--- |
| Verify Domain in GSC | Completed | HTML meta tag or DNS TXT |
| Submit `sitemap.xml` | 39 URLs Submitted | GSC > Sitemaps |
| Inspect `/compress-pdf` | HTTP 200, Crawled | GSC > URL Inspection |
| Request Indexing (Top 10) | In Crawl Queue | GSC > Request Indexing |
| Validate Rich Results | Valid JSON-LD | Rich Results Test tool |
| Track Weekly Clicks & Queries | Ongoing | GSC > Performance |
