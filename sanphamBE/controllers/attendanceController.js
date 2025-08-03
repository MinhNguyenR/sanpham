// backend/controllers/attendanceController.js
import asyncHandler from 'express-async-handler';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js'; // Cần import User để lấy thông tin người dùng

// @desc    Chấm công (check-in) cho người dùng
// @route   POST /api/attendance/check-in
// @access  Private (User & Admin)
const checkIn = asyncHandler(async (req, res) => {
    const { _id, name, email, role } = req.user; // Lấy thông tin người dùng từ req.user (được gắn bởi middleware protect)

    // Lấy ngày hiện tại ở định dạng YYYY-MM-DD để kiểm tra chấm công trong ngày
    const today = new Date().toISOString().split('T')[0];

    // Kiểm tra xem người dùng đã chấm công hoặc đã được đánh dấu nghỉ phép trong ngày hôm nay chưa
    const existingRecord = await Attendance.findOne({
        user: _id,
        date: today,
    });

    if (existingRecord) {
        if (existingRecord.isLeave) {
            res.status(400);
            throw new Error('Bạn đã được đánh dấu là nghỉ phép cho ngày hôm nay.');
        } else {
            res.status(400);
            throw new Error('Bạn đã chấm công cho ngày hôm nay rồi.');
        }
    }

    const attendance = await Attendance.create({
        user: _id,
        name,
        email,
        role,
        date: today,
        isLeave: false, // Mặc định là không nghỉ phép
    });

    if (attendance) {
        res.status(201).json({
            message: 'Chấm công thành công!',
            attendance,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu chấm công không hợp lệ.');
    }
});

// @desc    Admin đánh dấu người dùng là nghỉ phép
// @route   POST /api/attendance/mark-leave
// @access  Private (Admin only)
const markLeave = asyncHandler(async (req, res) => {
    const { userId, date, leaveReason } = req.body;

    // Kiểm tra xem người dùng đã tồn tại chưa
    const userToMark = await User.findById(userId);
    if (!userToMark) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng để đánh dấu nghỉ phép.');
    }

    // Kiểm tra xem đã có bản ghi chấm công/nghỉ phép cho người dùng này vào ngày này chưa
    const existingRecord = await Attendance.findOne({
        user: userId,
        date: date,
    });

    if (existingRecord) {
        if (existingRecord.isLeave) {
            res.status(400);
            throw new Error('Người dùng này đã được đánh dấu nghỉ phép cho ngày đã chọn.');
        } else {
            res.status(400);
            throw new Error('Người dùng này đã chấm công cho ngày đã chọn. Không thể đánh dấu nghỉ phép.');
        }
    }

    const leaveRecord = await Attendance.create({
        user: userId,
        name: userToMark.name,
        email: userToMark.email,
        role: userToMark.role,
        checkInTime: new Date(date), // Sử dụng ngày được chọn làm thời gian check-in cơ bản cho bản ghi nghỉ phép
        date: date,
        isLeave: true,
        leaveReason: leaveReason || 'Nghỉ phép không có lý do cụ thể.',
    });

    if (leaveRecord) {
        res.status(201).json({
            message: 'Đánh dấu nghỉ phép thành công!',
            leaveRecord,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu đánh dấu nghỉ phép không hợp lệ.');
    }
});

// @desc    Admin cập nhật trạng thái nghỉ phép của một bản ghi (chủ yếu để hủy nghỉ phép)
// @route   PUT /api/attendance/:id/leave
// @access  Private (Admin only)
const updateAttendanceLeaveStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isLeave, leaveReason } = req.body; // isLeave sẽ là false khi hủy nghỉ phép

    const attendanceRecord = await Attendance.findById(id);

    if (attendanceRecord) {
        attendanceRecord.isLeave = isLeave;
        attendanceRecord.leaveReason = isLeave ? (leaveReason || 'Nghỉ phép không có lý do cụ thể.') : ''; // Xóa lý do nếu hủy nghỉ phép

        const updatedRecord = await attendanceRecord.save();
        res.status(200).json({
            message: `Cập nhật trạng thái nghỉ phép thành công.`,
            updatedRecord,
        });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy bản ghi chấm công.');
    }
});


// @desc    Lấy danh sách chấm công cho admin (có thể lọc theo ngày và người dùng)
// @route   GET /api/attendance/admin
// @access  Private (Admin only)
const getAttendanceForAdmin = asyncHandler(async (req, res) => {
    const { date, userName, userEmail } = req.query; // Lấy ngày, tên, email từ query parameter

    if (!date) {
        res.status(400);
        throw new Error('Vui lòng cung cấp ngày để truy vấn.');
    }

    let usersToQuery = [];
    if (userName || userEmail) {
        // Nếu có yêu cầu tìm kiếm theo tên hoặc email
        let userQuery = {};
        if (userName) userQuery.name = new RegExp(userName, 'i'); // Case-insensitive search
        if (userEmail) userQuery.email = new RegExp(userEmail, 'i'); // Case-insensitive search

        const foundUser = await User.findOne(userQuery);
        if (foundUser) {
            usersToQuery.push(foundUser);
        } else {
            // Nếu không tìm thấy người dùng, trả về danh sách rỗng
            return res.status(200).json({
                checkedInUsers: [],
                onLeaveUsers: [],
                notCheckedInAndNotOnLeaveUsers: [],
                totalUsers: 0,
                totalCheckedIn: 0,
                totalOnLeave: 0,
                totalNotCheckedInAndNotOnLeave: 0,
            });
        }
    } else {
        // Nếu không có yêu cầu tìm kiếm người dùng cụ thể, lấy tất cả người dùng
        usersToQuery = await User.find({}).select('name email role');
    }

    // Lấy tất cả bản ghi chấm công/nghỉ phép cho ngày đã chọn
    let attendanceRecordsForDate = await Attendance.find({ date: date }).populate('user', 'name email role');

    // Lọc bỏ các bản ghi mà user reference bị null sau khi populate
    // Điều này ngăn chặn lỗi khi truy cập record.user.name/email/role nếu user đã bị xóa
    attendanceRecordsForDate = attendanceRecordsForDate.filter(record => record.user !== null);

    const checkedInUsers = [];
    const onLeaveUsers = [];
    const processedUserIds = new Set(); // Dùng để theo dõi những người đã được xử lý (chấm công hoặc nghỉ phép)

    attendanceRecordsForDate.forEach(record => {
        // Chỉ xử lý bản ghi nếu nó thuộc về người dùng đang được query (hoặc tất cả người dùng nếu không có filter)
        // và đảm bảo record.user tồn tại
        if (record.user && (usersToQuery.length === 0 || usersToQuery.some(u => u._id.toString() === record.user._id.toString()))) {
            processedUserIds.add(record.user._id.toString());
            if (record.isLeave) {
                onLeaveUsers.push(record);
            } else {
                checkedInUsers.push(record);
            }
        }
    });

    // Tìm những người chưa chấm công và không nghỉ phép trong số usersToQuery
    const notCheckedInAndNotOnLeaveUsers = usersToQuery.filter(user =>
        !processedUserIds.has(user._id.toString())
    );

    res.status(200).json({
        checkedInUsers,
        onLeaveUsers,
        notCheckedInAndNotOnLeaveUsers,
        totalUsers: usersToQuery.length, // Tổng số người dùng đang được query
        totalCheckedIn: checkedInUsers.length,
        totalOnLeave: onLeaveUsers.length,
        totalNotCheckedInAndNotOnLeave: notCheckedInAndNotOnLeaveUsers.length,
    });
});

// @desc    Lấy lịch sử chấm công của một người dùng cụ thể
// @route   GET /api/attendance/me
// @access  Private (User & Admin)
const getUserAttendance = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const attendanceRecords = await Attendance.find({ user: userId }).sort({ checkInTime: -1 });
    res.status(200).json(attendanceRecords);
});


export {
    checkIn,
    markLeave,
    getAttendanceForAdmin,
    getUserAttendance,
    updateAttendanceLeaveStatus,
};
