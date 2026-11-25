// Official MangaDex API v5 Plugin (VI + EN)
async function popular(page) {
  const offset = (page - 1) * 20;
  const url = `${BASE_URL}/manga?limit=20&offset=${offset}&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
  const raw = await httpGet(url);
  return mapMangaList(raw);
}

async function search(query, page) {
  const offset = (page - 1) * 20;
  const q = encodeURIComponent(query);
  const url = `${BASE_URL}/manga?title=${q}&limit=20&offset=${offset}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`;
  const raw = await httpGet(url);
  return mapMangaList(raw);
}

function mapMangaList(raw) {
  const data = JSON.parse(raw).data || [];
  return data.map(m => {
    const attrs = m.attributes || {};
    const titleObj = attrs.title || {};
    const title = titleObj.vi || titleObj.en || Object.values(titleObj)[0] || "Untitled";
    const coverRel = (m.relationships || []).find(r => r.type === "cover_art");
    const fileName = coverRel && coverRel.attributes ? coverRel.attributes.fileName : "";
    const coverUrl = fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` : "";
    return {
      title: title,
      url: `${BASE_URL}/manga/${m.id}`,
      coverUrl: coverUrl,
      author: ""
    };
  });
}

async function getDetail(bookUrl) {
  const id = bookUrl.split("/").pop();
  const raw = await httpGet(`${BASE_URL}/manga/${id}?includes[]=cover_art&includes[]=author`);
  const m = JSON.parse(raw).data;
  const attrs = m.attributes || {};
  const titleObj = attrs.title || {};
  const descObj = attrs.description || {};
  const coverRel = (m.relationships || []).find(r => r.type === "cover_art");
  const authorRel = (m.relationships || []).find(r => r.type === "author");
  const fileName = coverRel && coverRel.attributes ? coverRel.attributes.fileName : "";
  return {
    title: titleObj.vi || titleObj.en || Object.values(titleObj)[0] || "Untitled",
    url: bookUrl,
    coverUrl: fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg` : "",
    author: authorRel && authorRel.attributes ? (authorRel.attributes.name || "") : "",
    synopsis: descObj.vi || descObj.en || "",
    mediaType: "COMIC"
  };
}

async function getChapters(bookUrl) {
  const id = bookUrl.split("/").pop();
  const url = `${BASE_URL}/manga/${id}/feed?translatedLanguage[]=vi&translatedLanguage[]=en&order[chapter]=asc&limit=100`;
  const raw = await httpGet(url);
  const items = JSON.parse(raw).data || [];
  return items.map((c, idx) => {
    const a = c.attributes || {};
    const chNum = a.chapter ? `Ch.${a.chapter}` : `Ep.${idx + 1}`;
    const lang = a.translatedLanguage ? `[${a.translatedLanguage}] ` : "";
    const title = a.title ? `${lang}${chNum}: ${a.title}` : `${lang}${chNum}`;
    return {
      title: title,
      url: `${BASE_URL}/at-home/server/${c.id}`,
      chapterIndex: idx
    };
  });
}

async function getChapterContent(chapterUrl) {
  const raw = await httpGet(chapterUrl);
  const json = JSON.parse(raw);
  const host = json.baseUrl;
  const ch = json.chapter || {};
  const files = (ch.dataSaver && ch.dataSaver.length > 0) ? ch.dataSaver : (ch.data || []);
  const mode = (ch.dataSaver && ch.dataSaver.length > 0) ? "data-saver" : "data";
  const images = files.map(f => ({
    url: `${host}/${mode}/${ch.hash}/${f}`,
    referer: "https://mangadex.org/"
  }));
  return { kind: "COMIC", paragraphs: [], images: images };
}
