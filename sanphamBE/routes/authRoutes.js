// backend/routes/authRoutes.js
import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    deleteUser,
} from '../controllers/authController.js'; // Các hàm cơ bản
import {
    getAllUsers,
    updateUserByAdmin,
    deleteUserByAdmin
} from '../controllers/adminController.js'; // Import các hàm admin
import {
    checkIn,
    markLeave,
    getAttendanceForAdmin,
    getUserAttendance,
    updateAttendanceLeaveStatus,
} from '../controllers/attendanceController.js'; // Import các hàm chấm công
import {
    createLeaveRequest,
    getUserLeaveRequests,
    getAllLeaveRequests,
    updateLeaveRequestStatus,
} from '../controllers/leaveRequestController.js'; // Import các hàm nghỉ phép
import {
    createComplaint,
    getUserComplaints,
    getAllComplaints,
    updateComplaintStatus,
} from '../controllers/complaintController.js'; // Import các hàm khiếu nại
import { protect, authorizeRoles } from '../middleware/middleware.js'; // Import middleware

const router = express.Router();

// Public routes (đăng ký và đăng nhập)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (dành cho người dùng đã đăng nhập)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/delete-account', protect, deleteUser);

// Admin-only routes (dùng protect và authorizeRoles)
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.put('/users/:id', protect, authorizeRoles('admin'), updateUserByAdmin);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUserByAdmin);

// Attendance routes (chấm công)
router.post('/attendance/check-in', protect, checkIn); // Cả user và admin đều có thể chấm công
router.get('/attendance/me', protect, getUserAttendance); // Xem lịch sử chấm công của bản thân
router.post('/attendance/mark-leave', protect, authorizeRoles('admin'), markLeave); // Admin đánh dấu nghỉ phép
router.get('/attendance/admin', protect, authorizeRoles('admin'), getAttendanceForAdmin); // Admin xem danh sách chấm công
router.put('/attendance/:id/leave', protect, authorizeRoles('admin'), updateAttendanceLeaveStatus); // Admin cập nhật trạng thái nghỉ phép

// Leave Request routes (yêu cầu nghỉ phép)
router.post('/leave-requests', protect, createLeaveRequest); // Gửi yêu cầu nghỉ phép
router.get('/leave-requests/me', protect, getUserLeaveRequests); // Lấy yêu cầu nghỉ phép của bản thân
router.get('/leave-requests/admin', protect, authorizeRoles('admin'), getAllLeaveRequests); // Lấy tất cả yêu cầu nghỉ phép
router.put('/leave-requests/:id/status', protect, authorizeRoles('admin'), updateLeaveRequestStatus); // Cập nhật trạng thái yêu cầu nghỉ phép

// Complaint routes (khiếu nại)
router.post('/complaints', protect, createComplaint); // Gửi khiếu nại
router.get('/complaints/me', protect, getUserComplaints); // Lấy khiếu nại của bản thân
router.get('/complaints/admin', protect, authorizeRoles('admin'), getAllComplaints); // Lấy tất cả khiếu nại
router.put('/complaints/:id/status', protect, authorizeRoles('admin'), updateComplaintStatus); // Cập nhật trạng thái khiếu nại

export default router;
