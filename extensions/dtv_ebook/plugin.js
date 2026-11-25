// DTV-Ebook (https://dtv-ebook.com.vn - Tìm kiếm ?s=, hỗ trợ vượt Cloudflare qua WebView)
function absUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return u.startsWith("/") ? (BASE_URL + u) : (BASE_URL + "/" + u);
}

async function popular(page) {
  const url = page <= 1 ? `${BASE_URL}/` : `${BASE_URL}/sach-hay-nen-doc/trang-${page}.html`;
  const html = await httpGet(url);
  return parseCards(html, "");
}

async function search(query, page) {
  const q = encodeURIComponent(query);
  const html = await httpGet(`${BASE_URL}/?s=${q}`);
  const results = parseCards(html, query);
  if (results.length === 0) {
    throw new Error("Không tìm thấy sách khớp trên DTV-Ebook (hoặc trang đang dùng Google Search). Bấm 'Mở Trình duyệt nguồn' để tìm trực tiếp trên web.");
  }
  return results;
}

function parseCards(html, query) {
  const containers = JSON.parse(htmlSelect(html, "main, #main, #content, .search-results, .list-ebook, .archive-content"));
  const scopedHtml = containers[0] ? containers[0].html : html;
  const links = JSON.parse(htmlSelect(scopedHtml, ".item a[href$='.html'], .book-item a[href$='.html'], article a[href$='.html'], h2 a[href$='.html'], h3 a[href$='.html']"));
  const imgs = JSON.parse(htmlSelect(scopedHtml, ".item img, .book-item img, article img"));

  const seen = {};
  const all = [];
  links.forEach((a, i) => {
    const u = absUrl(a.href);
    const title = (a.text.trim() || a.alt.trim());
    if (title && u && !seen[u] && !u.includes("tim-kiem") && !u.includes("/tac-gia/")) {
      seen[u] = true;
      all.push({
        title: title,
        url: u,
        coverUrl: imgs[i] ? absUrl(imgs[i].src) : "",
        author: ""
      });
    }
  });

  if (!query) return all.slice(0, 30);
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  const matched = all.filter(b => {
    const tl = b.title.toLowerCase();
    return tokens.some(t => tl.includes(t));
  });
  return matched.slice(0, 30);
}

async function getDetail(bookUrl) {
  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h1") || "DTV-Ebook";
  const synopsis = htmlSelectText(html, ".gioithieu, .description, article p");
  const imgs = JSON.parse(htmlSelect(html, ".anhbia img, .book-cover img, article img"));
  return {
    title: title.trim(),
    url: bookUrl,
    coverUrl: imgs[0] ? absUrl(imgs[0].src) : "",
    author: "",
    synopsis: synopsis.trim().slice(0, 500),
    mediaType: "NOVEL"
  };
}

async function getChapters(bookUrl) {
  const html = await httpGet(bookUrl);
  const readLinks = JSON.parse(htmlSelect(html, "a[href*='doc-online'], a[href*='chuong-']"))
    .filter(a => a.href && !a.href.includes("#"));
  if (readLinks.length > 0) {
    return readLinks.map((a, i) => ({
      title: a.text.trim() || `Chương ${i + 1}`,
      url: absUrl(a.href),
      chapterIndex: i
    }));
  }
  return [{ title: "Thông tin sách & Link tải (Mở Trình duyệt nguồn để tải EPUB/PDF/MP3)", url: bookUrl, chapterIndex: 0 }];
}

async function getChapterContent(chapterUrl) {
  const html = await httpGet(chapterUrl);
  const blocks = JSON.parse(htmlSelect(html, ".noidung, #noidung, .entry-content, .single-content, article"));
  const inner = blocks[0] ? blocks[0].html : html;
  const paragraphs = JSON.parse(htmlStripToParagraphs(inner));
  const dlLinks = JSON.parse(htmlSelect(html, "a[href$='.epub'], a[href$='.pdf'], a[href$='.mp3'], a[href*='download']"))
    .map(a => `[Tải file: ${a.text.trim()}] ${absUrl(a.href)}`);
  return { kind: "NOVEL", paragraphs: paragraphs.concat(dlLinks), images: [] };
}
