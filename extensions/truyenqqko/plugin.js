// TruyenQQ Plugin (https://truyenqqko.com - Truyện tranh)
function absUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("//")) return "https:" + u;
  return u.startsWith("/") ? (BASE_URL + u) : (BASE_URL + "/" + u);
}

async function popular(page) {
  const url = `${BASE_URL}/truyen-moi-cap-nhat/trang-${page}`;
  const html = await httpGet(url);
  const avatarLinks = JSON.parse(htmlSelect(html, "ul.list_grid li .book_avatar a"));
  const nameLinks = JSON.parse(htmlSelect(html, "ul.list_grid li .book_name a"));
  const covers = JSON.parse(htmlSelect(html, "ul.list_grid li .book_avatar img"));

  const count = Math.max(avatarLinks.length, nameLinks.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = nameLinks[i] || avatarLinks[i];
    const img = covers[i];
    const title = (a && a.text && a.text.trim()) || (img && img.alt && img.alt.trim()) || "";
    const href = (a && a.href) || (avatarLinks[i] && avatarLinks[i].href) || "";
    if (title && href) {
      out.push({
        title: title,
        url: absUrl(href),
        coverUrl: img ? absUrl(img.src) : "",
        author: ""
      });
    }
  }
  return out;
}

async function search(query, page) {
  const body = "search=" + encodeURIComponent(query) + "&type=0";
  const headers = JSON.stringify({
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": BASE_URL + "/"
  });
  const html = await httpPost(`${BASE_URL}/frontend/search/search`, body, headers);
  const items = JSON.parse(htmlSelect(html, "li"));
  const out = [];
  for (const li of items) {
    const anchors = JSON.parse(htmlSelect(li.html, "a"));
    const names = JSON.parse(htmlSelect(li.html, ".name"));
    const imgs = JSON.parse(htmlSelect(li.html, "img"));
    const a = anchors[0];
    if (!a || !a.href) continue;
    const title = (names[0] && names[0].text.trim()) || a.text.trim() || (imgs[0] && imgs[0].alt.trim()) || "";
    if (!title) continue;
    out.push({
      title: title,
      url: absUrl(a.href),
      coverUrl: imgs[0] ? absUrl(imgs[0].src) : "",
      author: ""
    });
  }
  return out;
}

async function getDetail(bookUrl) {
  const html = await httpGet(bookUrl);
  const title = htmlSelectText(html, "h1") || "TruyenQQ";
  const author = htmlSelectText(html, ".author a, li.author p.col-xs-9");
  const synopsis = htmlSelectText(html, ".story-detail-info");
  const imgs = JSON.parse(htmlSelect(html, ".book_avatar img"));
  return {
    title: title.trim(),
    url: bookUrl,
    coverUrl: imgs[0] ? absUrl(imgs[0].src) : "",
    author: author.trim(),
    synopsis: synopsis.trim(),
    mediaType: "COMIC"
  };
}

async function getChapters(bookUrl) {
  const html = await httpGet(bookUrl);
  const links = JSON.parse(htmlSelect(html, ".works-chapter-item a")).reverse();
  return links.map((a, i) => ({
    title: a.text.trim(),
    url: absUrl(a.href),
    chapterIndex: i
  })).filter(c => c.url);
}

async function getChapterContent(chapterUrl) {
  const html = await httpGet(chapterUrl);
  const imgs = JSON.parse(htmlSelect(html, ".page-chapter img"));
  const pages = imgs.map(img => ({
    url: absUrl(img.src),
    referer: BASE_URL + "/"
  })).filter(p => p.url && p.url.startsWith("http"));
  return { kind: "COMIC", paragraphs: [], images: pages };
}
