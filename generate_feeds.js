const SUPABASE_URL = 'https://baprrfxmkcithsnjolgs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_egqZEvdO5jFCaEg6PTs9ow_E9YZFhMr';
const fs = require('fs');
const path = require('path');

async function buildFeeds() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&is_available=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const products = await res.json();
        console.log(`Fetched ${products.length} products from Supabase.`);

        // 1. Generate sitemap.xml
        let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        sitemapXml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
        sitemapXml += `  <url>\n    <loc>https://elrayek.qd.je/</loc>\n    <lastmod>2026-08-18</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        sitemapXml += `  <url>\n    <loc>https://elrayek.qd.je/index.html</loc>\n    <lastmod>2026-08-18</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

        products.forEach(p => {
            const prodUrl = `https://elrayek.qd.je/product.html?id=${p.id}`;
            const cleanName = (p.name || 'تحفة نادرة').trim();
            sitemapXml += `  <url>\n`;
            sitemapXml += `    <loc>${prodUrl}</loc>\n`;
            sitemapXml += `    <changefreq>weekly</changefreq>\n`;
            sitemapXml += `    <priority>0.8</priority>\n`;
            if (p.image_url) {
                sitemapXml += `    <image:image>\n`;
                sitemapXml += `      <image:loc>${p.image_url}</image:loc>\n`;
                sitemapXml += `      <image:title>${cleanName}</image:title>\n`;
                sitemapXml += `    </image:image>\n`;
            }
            sitemapXml += `  </url>\n`;
        });

        sitemapXml += `</urlset>\n`;
        fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf8');

        // 2. Generate Google Merchant products_feed.xml
        let feedXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        feedXml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`;
        feedXml += `  <channel>\n`;
        feedXml += `    <title>الرايق لبيع الانتيكات والتحف</title>\n`;
        feedXml += `    <link>https://elrayek.qd.je/</link>\n`;
        feedXml += `    <description>متجر الرايق لبيع أفخم الأنتيكات والتحف والفازات والديكورات المنزلية النادرة في مصر.</description>\n`;

        products.forEach(p => {
            const prodUrl = `https://elrayek.qd.je/product.html?id=${p.id}`;
            const cleanName = (p.name || 'تحفة نادرة').trim();
            const cleanDesc = (p.description || `${cleanName} - تحفة عريقة وأنيقة من متجر الرايق لبيع الأنتيكات والتحف.`).replace(/[\r\n]+/g, ' ').trim();
            const finalPrice = (p.discount_price || p.price || 0).toFixed(2);

            feedXml += `    <item>\n`;
            feedXml += `      <g:id>${p.id}</g:id>\n`;
            feedXml += `      <g:title>${cleanName}</g:title>\n`;
            feedXml += `      <g:description>${cleanDesc}</g:description>\n`;
            feedXml += `      <g:link>${prodUrl}</g:link>\n`;
            if (p.image_url) feedXml += `      <g:image_link>${p.image_url}</g:image_link>\n`;
            feedXml += `      <g:price>${finalPrice} EGP</g:price>\n`;
            feedXml += `      <g:availability>${p.is_available ? 'in_stock' : 'out_of_stock'}</g:availability>\n`;
            feedXml += `      <g:condition>new</g:condition>\n`;
            feedXml += `      <g:brand>الرايق</g:brand>\n`;
            feedXml += `    </item>\n`;
        });

        feedXml += `  </channel>\n</rss>\n`;
        fs.writeFileSync(path.join(__dirname, 'products_feed.xml'), feedXml, 'utf8');

        console.log(`Successfully generated sitemap.xml and products_feed.xml with ${products.length} products!`);
    } catch (err) {
        console.error('Error generating feeds:', err);
    }
}

buildFeeds();
