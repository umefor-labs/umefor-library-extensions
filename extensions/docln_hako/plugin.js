// DocLN / Hako Light Novel Plugin (https://docln.sbs)
// Chương truyện được mã hóa bằng #chapter-c-protected -> dùng webViewGet để giải mã JS tự nhiên
function absUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return u.startsWith("/") ? (BASE_URL + u) : (BASE_URL + "/" + u);
}

function normalizeSeriesUrl(u) {
  const full = absUrl(u);
  const m = full.match(/^(https?:\/\/[^/]+\/truyen\/[^/?#]+)/);
  return m ? m[1] : full;
}

async function popular(page) {
  const html = await httpGet(`${BASE_URL}/danh-sach?truyendich=1&sapxep=top&page=${page}`);
  return parseList(html);
}

async function search(query, page) {
  const q = encodeURIComponent(query);
  const html = await httpGet(`${BASE_URL}/tim-kiem?keywords=${q}&page=${page}`);
  return parseList(html);
}

function parseList(html) {
  const items = JSON.parse(htmlSelect(html, ".thumb-item-flow .series-title a"));
  const covers = JSON.parse(htmlSelectAttr(html, ".thumb-item-flow .img-in-ratio", "data-bg"));
  return items.map((a, i) => ({
    title: a.text.trim(),
    url: normalizeSeriesUrl(a.href),
    coverUrl: absUrl(covers[i] || ""),
    author: ""
  })).filter(x => x.title && x.url);
}

async function getDetail(bookUrl) {
  const seriesUrl = normalizeSeriesUrl(bookUrl);
  const html = await httpGet(seriesUrl);
  const title = htmlSelectText(html, ".series-name a, h1") || "Light Novel";
  let author = htmlSelectText(html, ".info-item a[href*='/tac-gia/']");
  if (!author) author = htmlSelectText(html, "a[href*='/tac-gia/']");
  const synopsis = htmlSelectText(html, ".summary-content");
  const bg = JSON.parse(htmlSelectAttr(html, ".series-cover .img-in-ratio", "style"));
  let coverUrl = "";
  if (bg[0]) {
    const m = bg[0].match(/url\(['"]?(.*?)['"]?\)/);
    if (m) coverUrl = absUrl(m[1]);
  }
  return {
    title: title.trim(),
    url: seriesUrl,
    coverUrl: coverUrl,
    author: author.trim(),
    synopsis: synopsis.trim(),
    mediaType: "NOVEL"
  };
}

async function getChapters(bookUrl) {
  const seriesUrl = normalizeSeriesUrl(bookUrl);
  const html = await httpGet(seriesUrl);
  let links = JSON.parse(htmlSelect(html, "ul.list-chapters li .chapter-name a"));
  if (links.length === 0) {
    links = JSON.parse(htmlSelect(html, ".list-chapters a[href*='/c']"));
  }
  if (links.length === 0) {
    links = JSON.parse(htmlSelect(html, "a[href*='/truyen/'][href*='/c']"));
  }
  const seen = {};
  const out = [];
  for (const a of links) {
    const u = absUrl(a.href);
    const title = (a.text || "").trim();
    if (!u || seen[u] || !/\/c\d+/.test(u) || !title) continue;
    seen[u] = true;
    out.push({
      title: title,
      url: u,
      chapterIndex: out.length
    });
  }
  return out;
}

async function getChapterContent(chapterUrl) {
  // Use WebView so client-side JS decrypts #chapter-c-protected into readable <p> nodes
  const html = await webViewGet(chapterUrl, 3200);
  const blocks = JSON.parse(htmlSelect(html, "#chapter-content"));
  const inner = blocks[0] ? blocks[0].html : html;
  let paragraphs = JSON.parse(htmlStripToParagraphs(inner));
  if (paragraphs.length < 2) {
    paragraphs = JSON.parse(htmlStripToParagraphs(html));
  }
  return { kind: "NOVEL", paragraphs: paragraphs, images: [] };
}
