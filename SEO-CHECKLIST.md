# SEO Checklist - Aura OS

## ✅ Completed SEO Improvements

### Meta Tags & Open Graph
- [x] All pages have unique, descriptive titles
- [x] All pages have compelling meta descriptions
- [x] Open Graph tags (og:title, og:description, og:image) on all public pages
- [x] Twitter Card tags on all public pages
- [x] Proper canonical URLs on all pages
- [x] Keywords meta tags on key pages

### Structured Data (JSON-LD)
- [x] **LocalBusiness** schema on all `/b/{slug}` business pages
  - Includes: name, description, address, phone, email, ratings, hours
- [x] **WebPage** schema on Wien directory page
- [x] **SoftwareApplication** schema on homepage
- [x] **VideoObject** schema for teaser video
- [x] **Organization** schema in site-wide layout

### Images & Rich Media
- [x] All OG images present in `/public/og/`
- [x] OG images are 1200x630px (optimal size)
- [x] Image alt tags on all OG images
- [x] Poster images for videos

### Technical SEO
- [x] robots.txt properly configured
- [x] Sitemap.xml with all pages
- [x] Crawl-delay set to 1 second
- [x] Geo tags for location-based pages (Wien)
- [x] Hreflang tags for multi-language support
- [x] Proper noindex/nofollow on private pages

### Local SEO (Wien Businesses)
- [x] Business name, address, phone (NAP) on all business pages
- [x] LocalBusiness schema with full address
- [x] Geo placename and region tags
- [x] OpenGraph business properties
- [x] Google Maps links
- [x] Aggregate ratings in schema

## 📊 Key Pages SEO Status

| Page | Title | Description | OG Image | Schema | Status |
|------|-------|-------------|----------|--------|--------|
| `/` | ✅ | ✅ | ✅ | ✅ SoftwareApplication | Perfect |
| `/wien` | ✅ | ✅ | ✅ | ✅ WebPage | Perfect |
| `/lokal` | ✅ | ✅ | ✅ | - | Good |
| `/b/{slug}` | ✅ | ✅ | ✅ | ✅ LocalBusiness | Perfect |
| `/for/{funnel}` | ✅ | ✅ | ✅ | - | Good |
| `/nachbar` | ✅ | ✅ | ✅ | - | Good |
| `/team` | ✅ | ✅ | ✅ | - | Good |
| `/story` | ✅ | ✅ | ✅ | - | Good |

## 🎯 Next Steps (Optional Enhancements)

### Advanced Structured Data
- [ ] Add **FAQPage** schema to FAQ pages
- [ ] Add **BreadcrumbList** schema for navigation
- [ ] Add **ItemList** schema for Wien directory
- [ ] Add **Review** schema for individual customer reviews

### Performance
- [ ] Lazy load OG images below the fold
- [ ] Preconnect to external domains
- [ ] Add resource hints for critical assets

### Rich Results
- [ ] Test with Google Rich Results Test tool
- [ ] Submit updated sitemap to Google Search Console
- [ ] Monitor Core Web Vitals

## 🔍 Validation Tools

Test your SEO improvements:

1. **Meta Tags**: https://metatags.io/?url=https://aibusiness.fun
2. **Structured Data**: https://search.google.com/test/rich-results
3. **Open Graph**: https://www.opengraph.xyz/url/https://aibusiness.fun
4. **Twitter Cards**: https://cards-dev.twitter.com/validator
5. **Mobile Friendly**: https://search.google.com/test/mobile-friendly

## 📝 Business Page Example (Gigerl)

When Gigerl is added, it will have:
- Title: "Gigerl · Heuriger · 1010 Wien"
- Description: "Traditioneller Stadtheuriger im Herzen Wiens – 75% BIO-zertifiziert. Rauhensteingasse 3..."
- OG Image: Cover photo or default Wien image
- Schema: Full LocalBusiness with address, phone, hours, and ratings
- Geo tags: Wien, AT-9
- Google Maps link for reviews

## 🚀 Deployment

Run `./deploy-to-vps.sh` to deploy all SEO improvements to production.
