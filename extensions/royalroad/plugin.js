// RoyalRoad Web Novel Plugin (English)
async function popular(page) {
  const html = await httpGet(`${BASE_URL}/fictions/best-rated?page=${page}`);
  return parseList(html);
}

async function search(query, page) {
  const q = encodeURIComponent(query);
  const html = await httpGet(`${BASE_URL}/fictions/search?title=${q}&page=${page}`);
  return parseList(html);
}

function parseList(html) {
  const titles = JSON.parse(htmlSelect(html, ".fiction-list-item .fiction-title a"));
  const covers = JSON.parse(htmlSelectAttr(html, ".fiction-list-item img", "src"));
  return titles.map((t, i) => ({
    title: t.text,
    url: t.href.startsWith("http") ? t.href : `${BASE_URL}${t.href}`,
    coverUrl: covers[i] || "",
    author: ""
  }));
}

async function getDetail(bookUrl) {
  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h1") || "RoyalRoad Novel";
  const author = htmlSelectText(html, "h4 a") || "";
  const synopsis = htmlSelectText(html, ".description .hidden-content");
  const covers = JSON.parse(htmlSelectAttr(html, ".cover-art-container img", "src"));
  return {
    title: title,
    url: bookUrl,
    coverUrl: covers[0] || "",
    author: author,
    synopsis: synopsis,
    mediaType: "NOVEL"
  };
}

async function getChapters(bookUrl) {
  const html = await httpGet(bookUrl);
  const links = JSON.parse(htmlSelect(html, "table#chapters tbody tr td:first-child a"));
  return links.map((a, i) => ({
    title: a.text,
    url: a.href.startsWith("http") ? a.href : `${BASE_URL}${a.href}`,
    chapterIndex: i
  }));
}

async function getChapterContent(chapterUrl) {
  const html = await httpGet(chapterUrl);
  const blocks = JSON.parse(htmlSelect(html, ".chapter-content"));
  const inner = blocks[0] ? blocks[0].html : html;
  const paragraphs = JSON.parse(htmlStripToParagraphs(inner));
  return { kind: "NOVEL", paragraphs: paragraphs, images: [] };
}
