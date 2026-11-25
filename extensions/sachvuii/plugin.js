// Sách Vui (https://sachvuii.com - WordPress /wp-json/wp/v2/search + lấy bìa batch)
function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

async function popular(page) {
  const raw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?per_page=20&page=${page}&_embed=1`);
  return mapWpPosts(raw);
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
        const emb = p._embedded && p._embedded["wp:featuredmedia"];
        if (emb && emb[0] && emb[0].source_url) {
          coverMap[p.id] = emb[0].source_url;
        }
      }
    }
  } catch (e) {}

  return hits.map(h => ({
    title: stripHtml(h.title || "Sách Vui"),
    url: h.url || "",
    coverUrl: coverMap[h.id] || "",
    author: ""
  })).filter(x => x.url);
}

function mapWpPosts(raw) {
  const arr = JSON.parse(raw) || [];
  return arr.map(p => {
    let cover = "";
    const emb = p._embedded && p._embedded["wp:featuredmedia"];
    if (emb && emb[0] && emb[0].source_url) cover = emb[0].source_url;
    return {
      title: stripHtml(p.title ? p.title.rendered : "Sách Vui"),
      url: p.link || "",
      coverUrl: cover,
      author: ""
    };
  }).filter(x => x.url);
}

async function getDetail(bookUrl) {
  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h1") || "Sách Vui";
  const synopsis = htmlSelectText(html, ".entry-content p, article p, main p");
  const imgs = JSON.parse(htmlSelect(html, "article img, .post-thumbnail img, main img"));
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
  const html = await httpGet(bookUrl);
  const links = JSON.parse(htmlSelect(html, ".entry-content a, article a"))
    .filter(a => a.href && (a.href.includes("/doc-") || a.href.includes("chuong-")))
    .filter(a => !a.href.includes("#") && !a.href.includes("/get-link/"));
  if (links.length > 0) {
    return links.map((a, i) => ({
      title: a.text.trim() || `Phần ${i + 1}`,
      url: a.href.startsWith("http") ? a.href : `${BASE_URL}${a.href}`,
      chapterIndex: i
    }));
  }
  return [{ title: "Giới thiệu & Link tải Ebook (Mở Trình duyệt nguồn để tải EPUB/PDF)", url: bookUrl, chapterIndex: 0 }];
}

async function getChapterContent(chapterUrl) {
  const html = await httpGet(chapterUrl);
  const dlLinks = JSON.parse(htmlSelect(html, "a[href*='/get-link/'], a[href$='.epub'], a[href$='.pdf']"))
    .map(a => `[Tải file: ${a.text.trim()}] ${a.href.startsWith("http") ? a.href : BASE_URL + a.href}`);

  const parts = chapterUrl.replace(/\/+$/, "").split("/");
  const slug = parts[parts.length - 1];
  let paragraphs = [];
  if (slug && !slug.includes("?")) {
    try {
      const apiRaw = await httpGet(`${BASE_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`);
      const arr = JSON.parse(apiRaw) || [];
      if (arr[0] && arr[0].content && arr[0].content.rendered) {
        paragraphs = JSON.parse(htmlStripToParagraphs(arr[0].content.rendered));
      }
    } catch (e) {}
  }
  if (paragraphs.length === 0) {
    const blocks = JSON.parse(htmlSelect(html, ".entry-content, article, main"));
    const inner = blocks[0] ? blocks[0].html : html;
    paragraphs = JSON.parse(htmlStripToParagraphs(inner));
  }
  return { kind: "NOVEL", paragraphs: paragraphs.concat(dlLinks), images: [] };
}
