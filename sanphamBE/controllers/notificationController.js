import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import User from '../models/User.js'; 

const createNotification = async ({ io, sender, senderName, receiver, receiverRole, type, message, entityId = null, relatedDate = null }) => {
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

        // Emit thông báo qua Socket.IO cho người nhận cụ thể
        if (io) {
            io.to(receiver.toString()).emit('newNotification', notification);
            console.log(`[Notification Controller] Emitted '${type}' to user ${receiver}`);
        }
        return notification;
    } catch (error) {
        console.error('Lỗi khi tạo thông báo:', error);
        // Không throw lỗi để không làm ảnh hưởng đến luồng chính
    }
};

const getUserNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ receiver: req.user._id })
        .populate('sender', 'name email position')
        .populate('receiver', 'name email position')
        .sort({ createdAt: -1 })
        .limit(50); 

    res.status(200).json(notifications);
});


const sendAdminNotification = asyncHandler(async (req, res) => {
    const { receiverId, message, sendToAllUsers, sendToAllAdmins } = req.body;
    // Lấy thêm chức vụ của admin gửi thông báo
    const { _id: adminId, name: adminName, position: adminPosition } = req.user; 

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
        // Tùy chọn: Thêm chức vụ của admin vào tin nhắn gửi đi
        const fullMessage = `Thông báo từ ${adminName} (${adminPosition}): ${message}`; 
        const notification = await createNotification({
            io: req.io,
            sender: adminId,
            senderName: adminName,
            receiver: receiver._id,
            receiverRole: receiver.role,
            type: 'admin_message',
            message: fullMessage, 
        });
        if (notification) {
            createdNotifications.push(notification);
        }
    }

    res.status(201).json({
        message: 'Thông báo đã được gửi thành công.',
        notifications: createdNotifications,
    });
});

const getSentNotifications = asyncHandler(async (req, res) => {
    const sentNotifications = await Notification.find({ sender: req.user._id, type: 'admin_message' })
        .populate('receiver', 'name email position') 
        .sort({ createdAt: -1 })
        .limit(50);

    res.status(200).json(sentNotifications);
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Không tìm thấy thông báo.');
    }

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

const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
        res.status(404);
        throw new Error('Không tìm thấy thông báo.');
    }

    if (notification.sender && notification.sender.toString() !== req.user._id.toString() || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền xóa thông báo này.');
    }

    await notification.deleteOne();

    res.status(200).json({ message: 'Thông báo đã được xóa thành công.' });
});

const clearReadNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ receiver: req.user._id, isRead: true });
    res.json({ message: 'Đã xóa tất cả thông báo đã đọc.' });
});

export {
    createNotification,
    getUserNotifications,
    sendAdminNotification,
    getSentNotifications,
    markNotificationAsRead,
    clearReadNotifications,
    deleteNotification,
};