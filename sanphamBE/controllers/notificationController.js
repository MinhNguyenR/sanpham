// backend/controllers/notificationController.js
import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import User from '../models/User.js'; // Để lấy thông tin người dùng

// Hàm tạo thông báo chung (sử dụng nội bộ)
const createNotification = async ({ sender, senderName, receiver, receiverRole, type, message, entityId = null, relatedDate = null }) => {
    try {
        const notification = await Notification.create({
            sender,
            senderName,
            receiver,
            receiverRole,
            type,
            message,
            entityId,
            relatedDate,
        });
        // Emit thông báo qua Socket.IO
        // io.to(receiver.toString()).emit('newNotification', notification);
        // Lưu ý: io sẽ được truyền vào từ server.js
        return notification;
    } catch (error) {
        console.error('Lỗi khi tạo thông báo:', error);
        // Không throw lỗi để không làm ảnh hưởng đến luồng chính
    }
};

// @desc    Lấy tất cả thông báo của người dùng hiện tại
// @route   GET /api/auth/notifications/me
// @access  Private (User & Admin)
const getUserNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ receiver: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50); // Giới hạn số lượng thông báo để tránh quá tải

    res.status(200).json(notifications);
});

// @desc    Admin gửi thông báo thủ công
// @route   POST /api/auth/notifications/send
// @access  Private (Admin only)
const sendAdminNotification = asyncHandler(async (req, res) => {
    const { receiverId, message, sendToAllUsers, sendToAllAdmins } = req.body; // Bỏ receiverRole vì sẽ lấy từ User model
    const { _id: adminId, name: adminName } = req.user;

    if (!message) {
        res.status(400);
        throw new Error('Nội dung thông báo không được để trống.');
    }

    let receivers = [];

    if (sendToAllUsers) {
        const users = await User.find({ role: 'user' });
        receivers = [...receivers, ...users];
    }
    if (sendToAllAdmins) {
        const admins = await User.find({ role: 'admin' });
        receivers = [...receivers, ...admins];
    }
    if (receiverId) {
        const specificReceiver = await User.findById(receiverId);
        if (specificReceiver) {
            // Kiểm tra xem người nhận cụ thể đã được thêm vào danh sách chưa để tránh trùng lặp
            if (!receivers.some(r => r._id.toString() === specificReceiver._id.toString())) {
                receivers.push(specificReceiver);
            }
        } else {
            res.status(404);
            throw new Error('Không tìm thấy người nhận cụ thể.');
        }
    }

    if (receivers.length === 0) {
        res.status(400);
        throw new Error('Vui lòng chọn ít nhất một người nhận hoặc nhóm người nhận.');
    }

    const createdNotifications = [];
    for (const receiver of receivers) {
        const notification = await createNotification({
            sender: adminId,
            senderName: adminName,
            receiver: receiver._id,
            receiverRole: receiver.role, // Lấy role từ đối tượng receiver
            type: 'admin_message',
            message: message,
        });
        if (notification) {
            createdNotifications.push(notification);
            // Emit thông báo qua socket cho người nhận cụ thể
            req.io.to(receiver._id.toString()).emit('newNotification', notification);
        }
    }

    res.status(201).json({
        message: 'Thông báo đã được gửi thành công.',
        notifications: createdNotifications,
    });
});

// @desc    Lấy lịch sử thông báo đã gửi của Admin
// @route   GET /api/auth/notifications/sent
// @access  Private (Admin only)
const getSentNotifications = asyncHandler(async (req, res) => {
    const sentNotifications = await Notification.find({ sender: req.user._id, type: 'admin_message' })
        .populate('receiver', 'name email') // Lấy thông tin người nhận
        .sort({ createdAt: -1 })
        .limit(50);

    res.status(200).json(sentNotifications);
});

// @desc    Đánh dấu thông báo là đã đọc
// @route   PUT /api/auth/notifications/:id/read
// @access  Private (User & Admin)
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Không tìm thấy thông báo.');
    }

    // Đảm bảo chỉ người nhận thông báo mới có thể đánh dấu là đã đọc
    if (notification.receiver.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền đánh dấu thông báo này.');
    }

    notification.isRead = true;
    const updatedNotification = await notification.save();

    res.status(200).json({
        message: 'Thông báo đã được đánh dấu là đã đọc.',
        updatedNotification,
    });
});

// @desc    Xóa thông báo đã gửi (chỉ Admin mới có thể xóa thông báo của mình)
// @route   DELETE /api/auth/notifications/:id
// @access  Private (Admin only)
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Không tìm thấy thông báo.');
    }

    // Đảm bảo chỉ admin đã gửi thông báo mới có quyền xóa
    // Hoặc nếu thông báo là của hệ thống và người dùng là admin
    if (notification.sender && notification.sender.toString() !== req.user._id.toString() || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền xóa thông báo này.');
    }

    await notification.deleteOne(); // Sử dụng deleteOne() thay vì remove()

    res.status(200).json({ message: 'Thông báo đã được xóa thành công.' });
});
const clearReadNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ receiver: req.user._id, isRead: true });
    res.json({ message: 'Đã xóa tất cả thông báo đã đọc.' });
});

export {
    createNotification, // Export để sử dụng nội bộ bởi các controller khác
    getUserNotifications,
    sendAdminNotification,
    getSentNotifications,
    markNotificationAsRead,
    clearReadNotifications,
    deleteNotification,
};