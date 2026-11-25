# Umefor Library — Official Extensions

Kho extension JS chính thức cho ứng dụng **[Umefor Library](https://github.com/umefor-labs/umefor-library)** (Đọc truyện chữ, Truyện tranh, Ebook & Sách nói trên Android).

## Cài đặt trong Umefor Library

Kho này đã được gắn sẵn làm kho mặc định trong Umefor Library (người dùng tự chọn cài các nguồn mình cần, không ép cài sẵn). Nếu cần thêm thủ công trên phiên bản khác, dán đường dẫn `index.json`:

```text
https://raw.githubusercontent.com/umefor-labs/umefor-library-extensions/main/index.json
```

Mirror CDN dự phòng (`jsDelivr`):

```text
https://cdn.jsdelivr.net/gh/umefor-labs/umefor-library-extensions@main/index.json
```

## Đề xuất nguồn mới hoặc báo lỗi

- Đề xuất website mới: [Mở Issue Đề xuất nguồn mới](https://github.com/umefor-labs/umefor-library-extensions/issues/new?template=request-source.yml)
- Báo lỗi nguồn / đổi tên miền: [Mở Issue Báo nguồn lỗi](https://github.com/umefor-labs/umefor-library-extensions/issues/new?template=broken-source.yml)

## Cấu trúc một Extension (`extensions/<id>/`)

Mỗi extension gồm 2 tệp:

1. `manifest.json`: khai báo `id`, `name`, `mediaType` (`NOVEL` | `COMIC` | `AUDIOBOOK`), `lang`, `version`, `minAppApi`, `baseUrl`, `description`, `changelog`, `nsfw`.
2. `plugin.js`: cài đặt 5 hàm `async` chạy trên QuickJS sandbox của Umefor Library:
   - `popular(page)` -> `[{ title, url, coverUrl, author }]`
   - `search(query, page)` -> `[{ title, url, coverUrl, author }]`
   - `getDetail(bookUrl)` -> `{ title, url, coverUrl, author, synopsis, mediaType }`
   - `getChapters(bookUrl)` -> `[{ title, url, chapterIndex }]`
   - `getChapterContent(chapterUrl)` -> `{ kind: "NOVEL"|"COMIC", paragraphs: [...], images: [{ url, referer }] }`

Sau khi thêm hoặc sửa extension, chạy:

```bash
python3 scripts/build_index.py
```

(Hoặc push lên nhánh `main` để GitHub Actions tự động cập nhật `index.json` và mã kiểm tra `sha256`.)
