# Lighthouse Audit Requirements Fix List

**URL:** https://imat-futa.vercel.app/
**Fetch Time:** 2026-04-28T16:12:42.869Z

## Category: Performance (Score: 52)
### 🟡 Medium Priority: Largest Contentful Paint
**Current Value:** 3.5 s

Largest Contentful Paint marks the time at which the largest text or image is painted. [Learn more about the Largest Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint/)

### 🔴 High Priority: Total Blocking Time
**Current Value:** 1,240 ms

Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. [Learn more about the Total Blocking Time metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time/).

### 🟡 Medium Priority: Cumulative Layout Shift
**Current Value:** 0.176

Cumulative Layout Shift measures the movement of visible elements within the viewport. [Learn more about the Cumulative Layout Shift metric](https://web.dev/articles/cls).

### 🔴 High Priority: Speed Index
**Current Value:** 6.5 s

Speed Index shows how quickly the contents of a page are visibly populated. [Learn more about the Speed Index metric](https://developer.chrome.com/docs/lighthouse/performance/speed-index/).

### 🔴 High Priority: Layout shift culprits
Layout shifts occur when elements move absent any user interaction. [Investigate the causes of layout shifts](https://developer.chrome.com/docs/performance/insights/cls-culprit), such as elements being added, removed, or their fonts changing as the page loads.

### 🟡 Medium Priority: Improve image delivery
**Current Value:** Est savings of 25,493 KiB

Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/performance/insights/image-delivery)

**Technical Details / Affected Items:**
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849144/oy4jqxlap9nehoxducti.png` (Potential Savings: 9823 KB)
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849390/akn48unzumjyioqkva7j.png` (Potential Savings: 7064 KB)
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849606/j2icpjoh4b6azag8vayj.png` (Potential Savings: 6640 KB)
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776844931/e0jhgywsln4iczo7ok4w.webp` (Potential Savings: 1894 KB)
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776770090/xludi28zspmfll7jqqxj.jpg` (Potential Savings: 70 KB)

### 🔴 High Priority: Legacy JavaScript
**Current Value:** Est savings of 14 KiB

Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/articles/baseline-and-polyfills) features, unless you know you must support older browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://developer.chrome.com/docs/performance/insights/legacy-javascript)

**Technical Details / Affected Items:**
- URL: `https://imat-futa.vercel.app/_next/static/chunks/10tevgwx82og2.js` (Potential Savings: 13 KB)

### 🔴 High Priority: Network dependency tree
[Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.

### 🟡 Medium Priority: Render-blocking requests
**Current Value:** Est savings of 0 ms

Requests are blocking the page's initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking) can move these network requests out of the critical path.

**Technical Details / Affected Items:**
- URL: `https://imat-futa.vercel.app/_next/static/chunks/0v9bouwm2a5re.css`

### 🔴 High Priority: Time to Interactive
**Current Value:** 32.2 s

Time to Interactive is the amount of time it takes for the page to become fully interactive. [Learn more about the Time to Interactive metric](https://developer.chrome.com/docs/lighthouse/performance/interactive/).

### 🔴 High Priority: Max Potential First Input Delay
**Current Value:** 390 ms

The maximum potential First Input Delay that your users could experience is the duration of the longest task. [Learn more about the Maximum Potential First Input Delay metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-max-potential-fid/).

### 🔴 High Priority: Reduce unused JavaScript
**Current Value:** Est savings of 98 KiB

Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).

### 🟡 Medium Priority: Avoid enormous network payloads
**Current Value:** Total size was 29,345 KiB

Large network payloads cost users real money and are highly correlated with long load times. [Learn how to reduce payload sizes](https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight/).

**Technical Details / Affected Items:**
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849144/oy4jqxlap9nehoxducti.png`
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849390/akn48unzumjyioqkva7j.png`
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776849606/j2icpjoh4b6azag8vayj.png`
- URL: `https://imat-futa.vercel.app/icon.png?v=20260425-1`
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776844931/e0jhgywsln4iczo7ok4w.webp`
- URL: `https://res.cloudinary.com/dz5lb2hw1/image/upload/v1776770090/xludi28zspmfll7jqqxj.jpg`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/10tevgwx82og2.js`
- URL: `https://imat-futa.vercel.app/_next/static/media/GeistMonoVF-s.p.0ifhplp~93ddj.woff`
- URL: `https://imat-futa.vercel.app/_next/static/media/GeistVF-s.p.04dvp7dj03si8.woff`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/0tj8ruoqtq~xm.js`

### 🔴 High Priority: Reduce JavaScript execution time
**Current Value:** 3.0 s

Consider reducing the time spent parsing, compiling, and executing JS. You may find delivering smaller JS payloads helps with this. [Learn how to reduce Javascript execution time](https://developer.chrome.com/docs/lighthouse/performance/bootup-time/).

**Technical Details / Affected Items:**
- URL: `Unattributable`
- URL: `https://imat-futa.vercel.app/`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/10tevgwx82og2.js`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/05r_5c1hf5c93.js`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/08drt6mzdsc.i.js`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/07xs_j2~41968.js`
- URL: `https://imat-futa.vercel.app/_next/static/chunks/0tj8ruoqtq~xm.js`
- URL: `https://imat-futa.vercel.app/427d791c757b9f1c/script.js`

### 🔴 High Priority: Minimize main-thread work
**Current Value:** 12.8 s

Consider reducing the time spent parsing, compiling and executing JS. You may find delivering smaller JS payloads helps with this. [Learn how to minimize main-thread work](https://developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown/)

**Technical Details / Affected Items:**

### 🔴 High Priority: Avoid large layout shifts
**Current Value:** 15 layout shifts found

These are the largest layout shifts observed on the page. Each table item represents a single layout shift, and shows the element that shifted the most. Below each item are possible root causes that led to the layout shift. Some of these layout shifts may not be included in the CLS metric value due to [windowing](https://web.dev/articles/cls#what_is_cls). [Learn how to improve CLS](https://web.dev/articles/optimize-cls)

**Technical Details / Affected Items:**
- Element: `<::before>`
- Element: `<::before>`
- Element: `<section class="border-y border-borderDark bg-bg2/40 py-14 md:py-18" style="opacity: 1; transform: none;">`
- Element: `<section class="border-y border-borderDark bg-bg2/40 py-14 md:py-18" style="opacity: 1; transform: none;">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- Element: `<span class="opacity-100 text-accent animate-pulse">`
- ... and 5 more items.

## Category: Accessibility (Score: 100)
✅ All core audits passed.

## Category: Best Practices (Score: 100)
✅ All core audits passed.

## Category: SEO (Score: 100)
✅ All core audits passed.

