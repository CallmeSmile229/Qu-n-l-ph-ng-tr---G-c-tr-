# Nhà Trọ Manager

Webapp tiếng Việt để quản lý nhiều dãy trọ trên điện thoại. Ứng dụng có dữ liệu và cấu hình triển khai riêng.

## Chạy xem giao diện

Cần Node.js 22 trở lên. Chạy `npm run dev` rồi mở `http://localhost:3000`. Bản demo dùng dữ liệu giả và lưu thay đổi trên trình duyệt. Có thể đổi vai trò tại mục tài khoản hoặc thanh bên.

## Quyền truy cập

| Vai trò | Phạm vi |
| --- | --- |
| Chủ hệ thống | Tất cả dãy và phòng, đầu tư ban đầu, khách ở, hợp đồng, tài chính, điện nước, bảo trì, hồ sơ và phân quyền. |
| Quản lý dãy | Dãy được phân công. Quản lý phòng, khách ở, hợp đồng theo dãy, giao dịch, đồng hồ, hồ sơ theo dãy và sự cố. |
| Đội bảo trì | Dãy được phân công. Xem vị trí phòng, xem sự cố và cập nhật tiến độ, ghi chú xử lý. |

Chủ hệ thống vào **Phân quyền** để thêm hoặc cập nhật quyền theo email Google đã xác thực. Chỉ chủ hệ thống xem thông tin tài chính đầu tư ban đầu và liên hệ chủ nhà trong hồ sơ của dãy. Quyền được kiểm tra ở máy chủ khi đọc, ghi hoặc tải tệp.

## Vercel và Google Drive

1. Tạo repo GitHub riêng, commit mã nguồn rồi nhập repo vào Vercel. Preset là Other. Cấu hình nhận tự động từ `vercel.json`.
2. Tạo Redis REST riêng trong Upstash. Đặt `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` trong Production Environment Variables trên Vercel. Redis lưu dữ liệu vận hành. Drive chứa hồ sơ và ảnh đồng hồ. Dùng prefix hoặc cơ sở dữ liệu riêng nếu muốn vận hành môi trường thử nghiệm.
3. Trong Google Cloud, bật Google Drive API và tạo OAuth Client ID loại Web application. Thêm URL công khai của app làm origin và `https://<tên-miền-app>/api/callback` làm redirect URI. Thiết lập màn hình cấp quyền cho phạm vi `openid email profile` và `https://www.googleapis.com/auth/drive.file`.
4. Điền `APP_URL` bằng origin HTTPS chính thức, `OWNER_EMAIL` bằng email Google của chủ hệ thống, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và `SESSION_SECRET` vào Vercel. Tạo bí mật phiên bằng `openssl rand -hex 32`. Giữ các khóa ở biến môi trường. Đổi bí mật phiên sẽ vô hiệu hóa phiên và đòi hỏi kết nối lại Drive.
5. Triển khai lại, đăng nhập Google bằng tài khoản chủ hệ thống, chọn **Google Drive**, rồi cấp quyền **Kết nối Drive**. App tạo thư mục riêng **Nhà Trọ Manager** trong tài khoản này. App tải lên và trả tệp qua máy chủ dựa trên quyền của từng dãy. Dung lượng mỗi tệp tối đa 3 MB.

## Đọc chỉ số đồng hồ

App hỗ trợ nhập số thủ công trước khi dịch vụ ảnh sẵn sàng. Để bật nhận dạng, chuẩn bị ảnh đồng hồ thực của các loại đang dùng, gán nhãn khung hiển thị số và huấn luyện YOLO một lớp. Xuất mô hình phát hiện YOLOv8 hoặc YOLO11 thành ONNX kích thước cố định, batch 1, không NMS tích hợp, đầu ra `[1,5,N]` (4 tọa độ và điểm lớp). Trọng số tùy theo đồng hồ và ảnh thực tế.

Triển khai Dockerfile trong thư mục `ocr/` trên máy chạy container. Gắn file model vào đường dẫn chỉ đọc và thiết lập `YOLO_MODEL` cùng `OCR_TOKEN`. Ví dụ cục bộ:

```sh
docker build -t nha-tro-ocr ./ocr
docker run --rm -p 8080:8080 --env-file ocr.env \
  -v "$PWD/model.onnx:/models/meter.onnx:ro" nha-tro-ocr
```

Trong `ocr.env`, đặt `YOLO_MODEL=/models/meter.onnx` và `OCR_TOKEN` là token riêng. Trên Vercel, đặt cùng token và `OCR_URL` trỏ đến endpoint HTTPS `/read` của dịch vụ. Dịch vụ dùng YOLO để cắt vùng hiển thị rồi gọi pytesseract để đọc chữ số. Quản lý đối chiếu và chỉnh số trước khi lưu. Kiểm thử bằng ảnh từng loại đồng hồ, gồm trường hợp chói sáng, nghiêng, chữ số màu đỏ và có dấu thập phân.
