// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http'; // Import createServer
import { Server } from 'socket.io'; // Import Server từ socket.io
import { format } from 'date-fns'; // Import format cho middleware thông báo

import authRoutes from './routes/authRoutes.js';
import { createAdminAccount } from './controllers/authController.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js'; // Assuming these exist from previous context
import { createNotification } from './controllers/notificationController.js'; // Import hàm createNotification
import User from './models/User.js'; // Import User model
import TrainingCourse from './models/TrainingCourse.js'; // Import TrainingCourse model
import CourseRegistration from './models/CourseRegistration.js'; // Import CourseRegistration model
import EvaluationForm from './models/EvaluationForm.js'; // Import EvaluationForm model
import EvaluationResponse from './models/EvaluationResponse.js'; // Import EvaluationResponse model


dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await createAdminAccount();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

const app = express();
const httpServer = createServer(app); // Tạo HTTP server từ Express app
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Cho phép frontend từ port 5173 kết nối
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Gắn io object vào req để có thể sử dụng trong các controller
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware để lưu trữ response data trước khi gửi đi (PHẢI ĐẶT TRƯỚC CÁC ROUTES)
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
        res.locals.responseData = data; // Lưu dữ liệu phản hồi
        originalJson.call(this, data);
    };
    next(); // Quan trọng: Gọi next() để request tiếp tục đến middleware tiếp theo
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Đảm bảo middleware này được bật

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Người dùng đã kết nối qua Socket.IO: ${socket.id}`);

    // Khi người dùng đăng nhập, họ sẽ gửi userId của họ để tham gia một room
    socket.on('joinRoom', (userId) => {
        socket.join(userId);
        console.log(`Người dùng ${userId} đã tham gia phòng.`);
    });

    socket.on('disconnect', () => {
        console.log(`Người dùng đã ngắt kết nối Socket.IO: ${socket.id}`);
    });
});

// Middleware để tạo thông báo hệ thống sau khi các hành động thành công
// Lưu ý: Middleware này phải được đặt SAU authRoutes để có thể truy cập res.locals.responseData
app.use(async (req, res, next) => {
    console.log(`[Notification Middleware] START for path: ${req.path}, Method: ${req.method}`); // Log khi middleware bắt đầu

    // Kiểm tra xem req.user có tồn tại không
    if (!req.user) {
        console.log(`[Notification Middleware] req.user is NOT available for path: ${req.path}`);
        return next(); // Nếu không có user, bỏ qua middleware này
    }
    console.log(`[Notification Middleware] req.user IS available: ${req.user.name} (${req.user.role})`);


    // Chỉ xử lý nếu req.method là POST hoặc PUT và res.statusCode là 2xx
    if ((req.method === 'POST' || req.method === 'PUT') && res.statusCode >= 200 && res.statusCode < 300) {
        const path = req.path;
        const user = req.user; // Người dùng thực hiện hành động
        const responseData = res.locals.responseData; // Dữ liệu phản hồi từ controller (nếu có)

        console.log(`[Notification Middleware] Condition met for path: ${path}, Method: ${req.method}`);
        console.log(`[Notification Middleware] User: ${user ? user.name : 'N/A'}, Role: ${user ? user.role : 'N/A'}`);
        console.log(`[Notification Middleware] Response Data:`, responseData);

        // Xử lý thông báo cho chấm công
        if (path === '/attendance/check-in' && user) {
            // Thông báo cho người dùng đã chấm công
            await createNotification({
                sender: null, // Hệ thống gửi
                senderName: 'Hệ thống',
                receiver: user._id,
                receiverRole: user.role,
                type: 'user_checked_in',
                message: `Bạn đã chấm công thành công vào lúc ${new Date().toLocaleTimeString('vi-VN')}.`,
                relatedDate: new Date().toISOString().split('T')[0],
            });
            io.to(user._id.toString()).emit('newNotification', { type: 'user_checked_in' });
            console.log(`[Notification Middleware] Emitted 'user_checked_in' to user ${user._id}`);

            // Thông báo cho admin về việc user vừa chấm công
            const admins = await User.find({ role: 'admin' });
            console.log(`[Notification Middleware] Found ${admins.length} admins for 'check_in' notification.`);
            for (const admin of admins) {
                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: admin._id,
                    receiverRole: 'admin',
                    type: 'check_in',
                    message: `${user.name} đã chấm công vào lúc ${new Date().toLocaleTimeString('vi-VN')}.`,
                    relatedDate: new Date().toISOString().split('T')[0],
                });
                io.to(admin._id.toString()).emit('newNotification', { type: 'check_in' });
                console.log(`[Notification Middleware] Emitted 'check_in' to admin ${admin._id}`);
            }
        }
        // Xử lý thông báo cho yêu cầu nghỉ phép (Admin duyệt/từ chối)
        else if (path.startsWith('/leave-requests/') && path.endsWith('/status') && user && user.role === 'admin' && responseData?.updatedLeaveRequest) {
            const updatedLeaveRequest = responseData.updatedLeaveRequest;
            const receiverUser = await User.findById(updatedLeaveRequest.user);
            if (receiverUser) {
                const type = updatedLeaveRequest.status === 'approved' ? 'leave_approved' : 'leave_rejected';
                const messageContent = updatedLeaveRequest.status === 'approved'
                    ? `Yêu cầu nghỉ phép ngày ${format(new Date(updatedLeaveRequest.requestDate), 'dd/MM/yyyy')} của bạn đã được duyệt. Ghi chú: ${updatedLeaveRequest.adminNotes || 'Không có'}`
                    : `Yêu cầu nghỉ phép ngày ${format(new Date(updatedLeaveRequest.requestDate), 'dd/MM/yyyy')} của bạn đã bị từ chối. Lý do: ${updatedLeaveRequest.adminNotes || 'Không có'}`;

                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: receiverUser._id,
                    receiverRole: receiverUser.role,
                    type: type,
                    message: messageContent,
                    entityId: updatedLeaveRequest._id,
                    relatedDate: updatedLeaveRequest.requestDate,
                });
                io.to(receiverUser._id.toString()).emit('newNotification', { type: type, entityId: updatedLeaveRequest._id });
                console.log(`[Notification Middleware] Emitted '${type}' to user ${receiverUser._id} for leave request.`);
            }
        }
        // Xử lý thông báo cho khiếu nại (Admin giải quyết)
        else if (path.startsWith('/complaints/') && path.endsWith('/status') && user && user.role === 'admin' && responseData?.updatedComplaint) {
            const updatedComplaint = responseData.updatedComplaint;
            const receiverUser = await User.findById(updatedComplaint.user);
            if (receiverUser) {
                const messageContent = `Khiếu nại "${updatedComplaint.subject}" của bạn đã được giải quyết. Ghi chú của Admin: ${updatedComplaint.adminNotes || 'Không có'}`;
                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: receiverUser._id,
                    receiverRole: receiverUser.role,
                    type: 'complaint_resolved',
                    message: messageContent,
                    entityId: updatedComplaint._id,
                    relatedDate: format(new Date(updatedComplaint.createdAt), 'yyyy-MM-dd'),
                });
                io.to(receiverUser._id.toString()).emit('newNotification', { type: 'complaint_resolved', entityId: updatedComplaint._id });
                console.log(`[Notification Middleware] Emitted 'complaint_resolved' to user ${receiverUser._id} for complaint.`);
            }
        }
        // Thông báo cho admin khi có đơn nghỉ phép mới
        else if (path === '/leave-requests' && req.method === 'POST' && user) {
            const admins = await User.find({ role: 'admin' });
            console.log(`[Notification Middleware] Found ${admins.length} admins for 'new_leave_request' notification.`);
            for (const admin of admins) {
                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: admin._id,
                    receiverRole: 'admin',
                    type: 'new_leave_request',
                    message: `${user.name} đã gửi một yêu cầu nghỉ phép mới cho ngày ${format(new Date(req.body.requestDate), 'dd/MM/yyyy')}.`,
                    entityId: responseData?.leaveRequest?._id,
                    relatedDate: req.body.requestDate,
                });
                io.to(admin._id.toString()).emit('newNotification', { type: 'new_leave_request' });
                console.log(`[Notification Middleware] Emitted 'new_leave_request' to admin ${admin._id}`);
            }
        }
        // Thông báo cho admin khi có khiếu nại mới
        else if (path === '/complaints' && req.method === 'POST' && user) {
            const admins = await User.find({ role: 'admin' });
            console.log(`[Notification Middleware] Found ${admins.length} admins for 'new_complaint' notification.`);
            for (const admin of admins) {
                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: admin._id,
                    receiverRole: 'admin',
                    type: 'new_complaint',
                    message: `${user.name} đã gửi một khiếu nại mới với chủ đề: "${req.body.subject}".`,
                    entityId: responseData?.complaint?._id,
                    relatedDate: format(new Date(), 'yyyy-MM-dd'),
                });
                io.to(admin._id.toString()).emit('newNotification', { type: 'new_complaint' });
                console.log(`[Notification Middleware] Emitted 'new_complaint' to admin ${admin._id}`);
            }
        }
        // Thông báo cho user khi admin đánh dấu nghỉ phép
        else if (path === '/attendance/mark-leave' && req.method === 'POST' && user && user.role === 'admin' && responseData?.leaveRecord) {
            const leaveRecord = responseData.leaveRecord;
            const receiverUser = await User.findById(leaveRecord.user);
            if (receiverUser) {
                await createNotification({
                    sender: user._id,
                    senderName: user.name,
                    receiver: receiverUser._id,
                    receiverRole: receiverUser.role,
                    type: 'marked_leave',
                    message: `Admin ${user.name} đã đánh dấu bạn nghỉ phép vào ngày ${format(new Date(leaveRecord.date), 'dd/MM/yyyy')}. Lý do: ${leaveRecord.leaveReason || 'Không có'}.`,
                    entityId: leaveRecord._id,
                    relatedDate: leaveRecord.date,
                });
                io.to(receiverUser._id.toString()).emit('newNotification', { type: 'marked_leave', entityId: leaveRecord._id });
                console.log(`[Notification Middleware] Emitted 'marked_leave' to user ${receiverUser._id}`);
            }
        }
        // Thông báo khi có người đăng ký khóa học (đã được xử lý trong courseRegistrationController.js)
        // Thông báo khi đăng ký khóa học được duyệt/từ chối (đã được xử lý trong courseRegistrationController.js)
        // Thông báo khi khóa học được xem (đã được xử lý trong trainingCourseController.js)

        // Xử lý thông báo cho chức năng đánh giá
        // Thông báo khi admin tạo bản đánh giá mới (đã xử lý trong evaluationFormController.js)
        // Thông báo khi user hoàn thành bản đánh giá (đã xử lý trong evaluationResponseController.js)
        // Thông báo khi admin đã nhận bản đánh giá của user (đã xử lý trong evaluationResponseController.js)
    }
    next();
});

// Error handling middleware
// Đảm bảo các middleware này được định nghĩa trong './middleware/errorMiddleware.js'
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Sử dụng httpServer.listen thay vì app.listen
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
