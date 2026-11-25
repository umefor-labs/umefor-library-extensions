// TruyenFull-style Vietnamese Novel Template
async function popular(page) {
  const html = await httpGet(`${BASE_URL}/danh-sach/truyen-hot/trang-${page}/`);
  return parseList(html);
}

async function search(query, page) {
  const q = encodeURIComponent(query);
  const html = await httpGet(`${BASE_URL}/tim-kiem/?tukhoa=${q}&page=${page}`);
  return parseList(html);
}

function parseList(html) {
  const links = JSON.parse(htmlSelect(html, ".list-truyen .truyen-title a"));
  const covers = JSON.parse(htmlSelectAttr(html, ".list-truyen img", "src"));
  return links.map((a, i) => ({
    title: a.text,
    url: a.href.startsWith("http") ? a.href : `${BASE_URL}${a.href}`,
    coverUrl: covers[i] || "",
    author: ""
  }));
}

async function getDetail(bookUrl) {
  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h3.title, h1") || "Truyện chữ";
  const author = htmlSelectText(html, ".info a[itemprop=author]");
  const synopsis = htmlSelectText(html, ".desc-text");
  const covers = JSON.parse(htmlSelectAttr(html, ".book img", "src"));
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
  const links = JSON.parse(htmlSelect(html, "#list-chapter ul.list-chapter li a"));
  return links.map((a, i) => ({
    title: a.text,
    url: a.href.startsWith("http") ? a.href : `${BASE_URL}${a.href}`,
    chapterIndex: i
  }));
}

async function getChapterContent(chapterUrl) {
  const html = await httpGet(chapterUrl);
  const blocks = JSON.parse(htmlSelect(html, "#chapter-c, .chapter-c"));
  const inner = blocks[0] ? blocks[0].html : html;
  const paragraphs = JSON.parse(htmlStripToParagraphs(inner));
  return { kind: "NOVEL", paragraphs: paragraphs, images: [] };
}
