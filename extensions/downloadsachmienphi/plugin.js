// DownloadSáchMiễnPhí (https://downloadsachmienphi.com - WP REST API v2 + Search chính xác, không cần đăng nhập)
function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function extractCoverFromPost(p) {
  const emb = p._embedded && p._embedded["wp:featuredmedia"];
  if (emb && emb[0] && emb[0].source_url) return emb[0].source_url;
  const html = (p.content && p.content.rendered) ? p.content.rendered : "";
  const imgs = JSON.parse(htmlSelect(html, "img"));
  const valid = imgs.find(i => i.src && !i.src.includes("Logo") && !i.src.includes("logo"));
  return valid ? valid.src : "";
}

function isAffiliateUrl(u) {
  const low = (u || "").toLowerCase();
  return low.includes("accesstrade") || low.includes("shopee.vn") || low.includes("tiki") ||
    low.includes("fahasa") || low.includes("vinabook") || low.includes("newshop");
}

async function popular(page) {
  const raw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?per_page=20&page=${page}&_embed=1`);
  const arr = JSON.parse(raw) || [];
  return arr.map(p => ({
    title: stripHtml(p.title ? p.title.rendered : "Sách"),
    url: p.link || "",
    coverUrl: extractCoverFromPost(p),
    author: ""
  })).filter(x => x.url);
}

async function search(query, page) {
  const q = encodeURIComponent(query);
  const searchRaw = await httpGet(`${BASE_URL}/wp-json/wp/v2/search?search=${q}&per_page=20&page=${page}&subtype=post`);
  const hits = JSON.parse(searchRaw) || [];
  if (hits.length === 0) return [];

  const coverMap = {};
  try {
    const ids = hits.map(h => h.id).filter(Boolean).slice(0, 20);
    if (ids.length > 0) {
      const postsRaw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?include=${ids.join(",")}&per_page=20&_embed=1`);
      const posts = JSON.parse(postsRaw) || [];
      for (const p of posts) {
        coverMap[p.id] = extractCoverFromPost(p);
      }
    }
  } catch (e) {}

  return hits.map(h => ({
    title: stripHtml(h.title || "Sách"),
    url: h.url || "",
    coverUrl: coverMap[h.id] || "",
    author: ""
  })).filter(x => x.url);
}

async function getDetail(bookUrl) {
  const parts = bookUrl.replace(/\/+$/, "").split("/");
  const slug = parts[parts.length - 1];
  if (slug && !slug.includes("?")) {
    try {
      const apiRaw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`);
      const arr = JSON.parse(apiRaw) || [];
      if (arr[0]) {
        const p = arr[0];
        const paras = JSON.parse(htmlStripToParagraphs(p.content ? p.content.rendered : ""));
        return {
          title: stripHtml(p.title ? p.title.rendered : "Sách"),
          url: bookUrl,
          coverUrl: extractCoverFromPost(p),
          author: "",
          synopsis: paras.slice(0, 3).join("\n").slice(0, 500),
          mediaType: "NOVEL"
        };
      }
    } catch (e) {}
  }

  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h1") || "DownloadSáchMiễnPhí";
  const synopsis = htmlSelectText(html, ".entry-content p, article p");
  const imgs = JSON.parse(htmlSelect(html, "article img, .entry-content img"));
  return {
    title: title.trim(),
    url: bookUrl,
    coverUrl: imgs[0] ? imgs[0].src : "",
    author: "",
    synopsis: synopsis.trim().slice(0, 500),
    mediaType: "NOVEL"
  };
}

async function getChapters(bookUrl) {
  return [{
    title: "Giới thiệu & Link tải Ebook (Mở Trình duyệt nguồn để tải PDF/EPUB)",
    url: bookUrl,
    chapterIndex: 0
  }];
}

async function getChapterContent(chapterUrl) {
  const parts = chapterUrl.replace(/\/+$/, "").split("/");
  const slug = parts[parts.length - 1];
  let renderedHtml = "";
  if (slug && !slug.includes("?")) {
    try {
      const apiRaw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`);
      const arr = JSON.parse(apiRaw) || [];
      if (arr[0] && arr[0].content && arr[0].content.rendered) {
        renderedHtml = arr[0].content.rendered;
      }
    } catch (e) {}
  }
  if (!renderedHtml) {
    renderedHtml = await httpGet(chapterUrl);
  }

  const paragraphs = JSON.parse(htmlStripToParagraphs(renderedHtml));
  const links = JSON.parse(htmlSelect(renderedHtml, "a[href]"))
    .filter(a => a.href && !isAffiliateUrl(a.href))
    .filter(a => {
      const h = a.href.toLowerCase();
      const t = (a.text || "").toLowerCase();
      return h.includes(".pdf") || h.includes(".epub") || h.includes("drive.google") ||
        h.includes("mega.nz") || h.includes("mediafire") || t.includes("pdf") || t.includes("epub") || t.includes("tải");
    })
    .map(a => `[Tải sách (${a.text.trim() || "Link"})] ${a.href}`);

  return { kind: "NOVEL", paragraphs: paragraphs.concat(links), images: [] };
}
