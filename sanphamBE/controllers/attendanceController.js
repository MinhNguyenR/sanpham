import asyncHandler from 'express-async-handler';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 
import { format } from 'date-fns'; 

const checkIn = asyncHandler(async (req, res) => {
    const { _id, name, email, role, position } = req.user;
    const today = new Date().toISOString().split('T')[0];

    let existingRecord = await Attendance.findOne({
        user: _id,
        date: today,
    });

    if (existingRecord) {
        if (existingRecord.isLeave) {
            res.status(400);
            throw new Error('Bạn đã được đánh dấu là nghỉ phép cho ngày hôm nay.');
        } else if (existingRecord.checkInTime) {
            // Nếu đã có bản ghi và đã có checkInTime, nghĩa là đã chấm công rồi
            res.status(400);
            throw new Error('Bạn đã chấm công cho ngày hôm nay rồi.');
        } else {

            existingRecord.checkInTime = new Date();
            existingRecord.isLeave = false;
            existingRecord.leaveReason = undefined;

            const updatedAttendance = await existingRecord.save();

            // Gửi thông báo cho chính người dùng về việc chấm công thành công
            await createNotification({
                io: req.io, // Truyền đối tượng io
                sender: _id,
                senderName: name,
                receiver: _id,
                receiverRole: role,
                type: 'user_checked_in',
                message: `Bạn đã chấm công thành công vào lúc ${format(new Date(), 'HH:mm dd/MM/yyyy')}.`,
                entityId: updatedAttendance._id,
                relatedDate: today,
            });

            // Gửi thông báo cho admin khi có người dùng chấm công
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await createNotification({
                    io: req.io, // Truyền đối tượng io
                    sender: _id,
                    senderName: name,
                    receiver: admin._id,
                    receiverRole: 'admin',
                    type: 'check_in',
                    message: `${name} (${role}, Chức vụ: ${position || 'Chưa cập nhật'}) đã chấm công vào lúc ${format(updatedAttendance.checkInTime, 'HH:mm dd/MM/yyyy')}.`,
                    entityId: updatedAttendance._id,
                    relatedDate: today,
                });
            }

            return res.status(200).json({
                _id: updatedAttendance._id,
                user: updatedAttendance.user,
                name: updatedAttendance.name,
                email: updatedAttendance.email,
                role: updatedAttendance.role,
                position: updatedAttendance.position, 
                date: updatedAttendance.date,
                checkInTime: updatedAttendance.checkInTime,
                isLeave: updatedAttendance.isLeave,
            });
        }
    }

    // Nếu không có bản ghi nào tồn tại cho ngày hôm nay, tạo bản ghi mới
    const attendance = await Attendance.create({
        user: _id,
        name,
        email,
        role,
        position, 
        date: today,
        checkInTime: new Date(),
        isLeave: false,
    });

    if (attendance) {
        // Gửi thông báo cho chính người dùng về việc chấm công thành công
        await createNotification({
            io: req.io, // Truyền đối tượng io
            sender: _id,
            senderName: name,
            receiver: _id,
            receiverRole: role,
            type: 'user_checked_in',
            message: `Bạn đã chấm công thành công vào lúc ${format(new Date(), 'HH:mm dd/MM/yyyy')}.`,
            entityId: attendance._id,
            relatedDate: today,
        });

        // Gửi thông báo cho admin khi có người dùng chấm công
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await createNotification({
                io: req.io, // Truyền đối tượng io
                sender: _id,
                senderName: name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'check_in',
                message: `${name} (${role}, Chức vụ: ${position || 'Chưa cập nhật'}) đã chấm công vào lúc ${format(attendance.checkInTime, 'HH:mm dd/MM/yyyy')}.`,
                entityId: attendance._id,
                relatedDate: today,
            });
        }

        res.status(201).json({
            _id: attendance._id,
            user: attendance.user,
            name: attendance.name,
            email: attendance.email,
            role: attendance.role,
            position: attendance.position, 
            date: attendance.date,
            checkInTime: attendance.checkInTime,
            isLeave: attendance.isLeave,
        });
    } else {
        res.status(400);
        throw new Error('Không thể chấm công.');
    }
});


const markLeave = asyncHandler(async (req, res) => {
    const { userId, date, leaveReason } = req.body;
    const adminUser = req.user; // Người dùng hiện tại là admin

    // Lấy ngày hiện tại nếu không cung cấp
    const leaveDate = date || new Date().toISOString().split('T')[0];

    // Kiểm tra xem đã có bản ghi chấm công hoặc nghỉ phép cho người dùng vào ngày này chưa
    let existingRecord = await Attendance.findOne({
        user: userId,
        date: leaveDate,
    });

    if (existingRecord) {
        // Nếu đã có bản ghi và người dùng đã nghỉ phép, báo lỗi
        if (existingRecord.isLeave) {
            res.status(400);
            throw new Error('Người dùng này đã được đánh dấu là nghỉ phép cho ngày đã chọn.');
        }
        // Nếu có bản ghi nhưng không phải nghỉ phép VÀ không có checkInTime,
        // thì đây là trường hợp người dùng chưa chấm công nhưng có bản ghi cũ (ví dụ: sau khi hủy nghỉ phép)
        // Trong trường hợp này, chúng ta sẽ cập nhật bản ghi hiện có để đánh dấu nghỉ phép
        else if (!existingRecord.checkInTime) {
            existingRecord.isLeave = true;
            existingRecord.leaveReason = leaveReason || 'Không có lý do';
            existingRecord.markedBy = adminUser._id;
            existingRecord.markedByName = adminUser.name;
            existingRecord.markedAt = new Date();
            existingRecord.checkInTime = undefined; 

            const updatedAttendance = await existingRecord.save();

            // Gửi thông báo cho người dùng đã bị đánh dấu nghỉ phép
            const user = await User.findById(userId); 
            if (!user) {
                res.status(404);
                throw new Error('Không tìm thấy người dùng mục tiêu để tạo thông báo.');
            }

            await createNotification({
                io: req.io, // Truyền đối tượng io
                sender: adminUser._id,
                senderName: adminUser.name,
                receiver: user._id, 
                receiverRole: user.role,
                type: 'marked_leave',
                message: `${adminUser.name} (${adminUser.role}) đã đánh dấu bạn nghỉ phép vào ngày ${format(new Date(leaveDate), 'dd/MM/yyyy')}. Lý do: ${leaveReason || 'Không có'}.`,
                entityId: updatedAttendance._id,
                relatedDate: leaveDate,
            });

            return res.status(200).json({
                _id: updatedAttendance._id,
                user: updatedAttendance.user,
                name: updatedAttendance.name,
                email: updatedAttendance.email,
                role: updatedAttendance.role,
                position: updatedAttendance.position,
                date: updatedAttendance.date,
                isLeave: updatedAttendance.isLeave,
                leaveReason: updatedAttendance.leaveReason,
                markedBy: updatedAttendance.markedBy,
                markedByName: updatedAttendance.markedByName,
            });
        }
        // Nếu có bản ghi và đã có checkInTime, báo lỗi đã chấm công
        else {
            res.status(400);
            throw new Error('Người dùng này đã chấm công cho ngày đã chọn. Không thể đánh dấu nghỉ phép.');
        }
    }

    // Nếu không có bản ghi nào tồn tại cho ngày hôm nay, tạo bản ghi mới
    const user = await User.findById(userId); // Cần tìm user ở đây nếu chưa có existingRecord
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const attendance = await Attendance.create({
        user: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position, // Lưu trữ chức vụ khi đánh dấu nghỉ phép
        date: leaveDate,
        isLeave: true,
        leaveReason: leaveReason || 'Không có lý do',
        markedBy: adminUser._id,
        markedByName: adminUser.name,
        markedAt: new Date(),
    });

    if (attendance) {
        // Gửi thông báo cho người dùng đã bị đánh dấu nghỉ phép
        await createNotification({
            io: req.io, // Truyền đối tượng io
            sender: adminUser._id,
            senderName: adminUser.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'marked_leave',
            message: `${adminUser.name} (${adminUser.role}) đã đánh dấu bạn nghỉ phép vào ngày ${format(new Date(leaveDate), 'dd/MM/yyyy')}. Lý do: ${leaveReason || 'Không có'}.`,
            entityId: attendance._id,
            relatedDate: leaveDate,
        });

        res.status(201).json({
            _id: attendance._id,
            user: attendance.user,
            name: attendance.name,
            email: attendance.email,
            role: attendance.role,
            position: attendance.position,
            date: attendance.date,
            isLeave: attendance.isLeave,
            leaveReason: attendance.leaveReason,
            markedBy: attendance.markedBy,
            markedByName: attendance.markedByName,
        });
    } else {
        res.status(400);
        throw new Error('Không thể đánh dấu nghỉ phép.');
    }
});


const getAttendanceForAdmin = asyncHandler(async (req, res) => {
    const { date, role, search, position } = req.query;

    // Lấy tất cả người dùng trong hệ thống
    let allUsers = await User.find({}).select('name email role position');

    // Lọc allUsers dựa trên role, position, search nếu có
    if (role && role !== 'all') {
        allUsers = allUsers.filter(user => user.role === role);
    }
    if (position && position !== 'all') {
        allUsers = allUsers.filter(user => user.position === position);
    }
    if (search) {
        const lowerCaseSearch = search.toLowerCase();
        allUsers = allUsers.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
        );
    }

    // Lấy tất cả các bản ghi chấm công (hoặc nghỉ phép) cho ngày đã chọn
    // Sử dụng `date` từ query để tìm kiếm bản ghi trong ngày cụ thể
    const attendanceRecordsForDate = await Attendance.find({ date: date })
                                                    .populate('user', 'name email role position');

    const checkedInUsers = [];
    const onLeaveUsers = [];
    const notCheckedInAndNotOnLeaveUsers = []; // Danh sách này sẽ chứa đối tượng User

    // Tạo một Map để tra cứu nhanh các bản ghi chấm công theo userId
    const attendanceMap = new Map();
    attendanceRecordsForDate.forEach(record => {
        if (record.user) { 
            attendanceMap.set(record.user._id.toString(), record);
        }
    });

    // Duyệt qua danh sách người dùng đã được lọc và phân loại họ
    allUsers.forEach(user => {
        const record = attendanceMap.get(user._id.toString());

        if (record) {
            if (record.isLeave) {
                onLeaveUsers.push(record); 
            } else if (record.checkInTime) {
                checkedInUsers.push(record); 
            } else {
                notCheckedInAndNotOnLeaveUsers.push(user);
            }
        } else {
            notCheckedInAndNotOnLeaveUsers.push(user); 
        }
    });

    res.status(200).json({
        checkedInUsers,
        onLeaveUsers,
        notCheckedInAndNotOnLeaveUsers,
        totalUsers: allUsers.length, 
        totalCheckedIn: checkedInUsers.length,
        totalOnLeave: onLeaveUsers.length,
        totalNotCheckedInAndNotOnLeave: notCheckedInAndNotOnLeaveUsers.length,
    });
});

const getUserAttendance = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const attendanceRecords = await Attendance.find({ user: userId })
        .populate('user', 'name email role position') 
        .sort({ date: -1, checkInTime: -1 })
        .limit(50); 

    res.status(200).json(attendanceRecords);
});


const updateAttendanceLeaveStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { leaveReason, isLeave } = req.body; // Thêm isLeave vào đây

    const attendanceRecord = await Attendance.findById(id);

    if (!attendanceRecord) {
        res.status(404);
        throw new Error('Không tìm thấy bản ghi chấm công.');
    }


    if (typeof isLeave === 'boolean') {
        attendanceRecord.isLeave = isLeave;
        if (!isLeave) {
            attendanceRecord.checkInTime = undefined; 
            attendanceRecord.leaveReason = undefined;
        }
    }

    if (attendanceRecord.isLeave && typeof leaveReason === 'string') {
        attendanceRecord.leaveReason = leaveReason;
    } else if (!attendanceRecord.isLeave && (leaveReason === null || leaveReason === '')) {
        attendanceRecord.leaveReason = undefined;
    }


    await attendanceRecord.save();

    if (typeof isLeave === 'boolean' && !isLeave && attendanceRecord.isModified('isLeave')) {
        if (req.io) {
            await createNotification(req.io, {
                recipient: attendanceRecord.user,
                type: 'attendance_update',
                message: `Thông báo: Admin đã hủy đánh dấu nghỉ phép của bạn vào ngày ${format(new Date(attendanceRecord.date), 'dd/MM/yyyy')}.`,
                link: `/attendance/me`
            });
        } else {
            console.warn('[attendanceController] Đối tượng Socket.IO (req.io) không khả dụng để tạo thông báo.');
        }
    }


    res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái nghỉ phép thành công.',
        attendanceRecord
    });
});

export {
    checkIn,
    markLeave,
    getAttendanceForAdmin,
    getUserAttendance,
    updateAttendanceLeaveStatus,
};
