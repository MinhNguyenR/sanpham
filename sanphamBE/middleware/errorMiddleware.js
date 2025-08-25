// Middleware để xử lý lỗi 404 (Not Found)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Chuyển lỗi đến middleware xử lý lỗi tiếp theo
};

// Middleware xử lý lỗi chung
const errorHandler = (err, req, res, next) => {
    // Xác định mã trạng thái HTTP: nếu mã trạng thái hiện tại là 200 (OK),
    // thì chuyển thành 500 (Internal Server Error), ngược lại giữ nguyên.
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode); // Đặt mã trạng thái HTTP cho phản hồi

    // Gửi phản hồi JSON chứa thông báo lỗi và stack trace (trong môi trường phát triển)
    res.json({
        message: err.message, // Thông báo lỗi
        stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Stack trace (chỉ hiển thị trong môi trường dev)
    });
};

// Export các hàm middleware để có thể sử dụng trong server.js
export { notFound, errorHandler };
