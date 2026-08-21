# My Tools

Bộ công cụ cá nhân chạy hoàn toàn phía client, phù hợp deploy lên GitHub Pages.

## Cấu trúc

```text
my-tools/
├── index.html
├── assets/
│   ├── css/global.css
│   └── js/app.js
└── tools/
    └── qr-code/
        ├── index.html
        ├── qr-code.css
        └── qr-code.js
```

Mỗi tool có thư mục riêng để dễ mở rộng.

## QR Code

Có 2 chức năng:

- Text/URL → QR PNG
- Ảnh QR → Text
- Chọn file ảnh
- Kéo thả ảnh
- Paste ảnh trực tiếp bằng Ctrl/Cmd + V
- Copy kết quả
- Dark/light mode

## Deploy GitHub Pages

1. Tạo repository trên GitHub.
2. Upload toàn bộ nội dung của thư mục này vào repository.
3. Vào `Settings` → `Pages`.
4. Chọn `Deploy from a branch`.
5. Chọn branch chứa source (thường là `main`) và thư mục `/ (root)`.
6. Save.

Không cần build step.

## Lưu ý

QR generator dùng thư viện QRCode.js và QR scanner dùng jsQR thông qua jsDelivr CDN. Vì vậy lần đầu mở trang cần có Internet để tải hai thư viện.

Phần tạo và đọc QR chạy phía client; nội dung/ảnh QR không được gửi lên server của ứng dụng.
