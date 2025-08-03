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
    getAllUsersForManagement, // Import hàm mới
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
import {
    getUserNotifications,
    sendAdminNotification,
    getSentNotifications,
    markNotificationAsRead,
    deleteNotification,
    clearReadNotifications, // Import hàm mới để xóa thông báo đã đọc
} from '../controllers/notificationController.js'; // Import các hàm thông báo mới
import {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getAdminCreatedCourses,
} from '../controllers/trainingCourseController.js'; // Import các hàm khóa đào tạo
import {
    registerForCourse,
    getUserRegistrations,
    getCourseRegistrationsForAdmin,
    getAdminAllRegistrations,
    updateRegistrationStatus,
} from '../controllers/courseRegistrationController.js'; // Import các hàm đăng ký khóa học
import {
    createEvaluationForm,
    getAdminCreatedEvaluationForms,
    getEvaluationFormById,
    getAllAvailableEvaluationFormsForUser, // Import hàm mới
    deleteEvaluationForm,
} from '../controllers/evaluationFormController.js'; // Import các hàm đánh giá form
import {
    submitEvaluationResponse,
    getUserEvaluationResponses,
    getAdminEvaluationResponses,
    getEvaluationResponseById,
    markResponseAsReceived,
} from '../controllers/evaluationResponseController.js'; // Import các hàm phản hồi đánh giá

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
router.get('/users-management', protect, authorizeRoles('admin'), getAllUsersForManagement);
router.put('/users/:id', protect, authorizeRoles('admin'), updateUserByAdmin);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUserByAdmin);

// Attendance routes (chấm công)
router.post('/attendance/check-in', protect, checkIn);
router.get('/attendance/me', protect, getUserAttendance);
router.post('/attendance/mark-leave', protect, authorizeRoles('admin'), markLeave);
router.get('/attendance/admin', protect, authorizeRoles('admin'), getAttendanceForAdmin);
router.put('/attendance/:id/leave', protect, authorizeRoles('admin'), updateAttendanceLeaveStatus);

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

// Notification routes (thông báo)
router.get('/notifications/me', protect, getUserNotifications); // Lấy thông báo của người dùng hiện tại
router.post('/notifications/send', protect, authorizeRoles('admin'), sendAdminNotification); // Admin gửi thông báo
router.get('/notifications/sent', protect, authorizeRoles('admin'), getSentNotifications); // Admin xem lịch sử thông báo đã gửi
router.put('/notifications/:id/read', protect, markNotificationAsRead); // Đánh dấu thông báo đã đọc
router.delete('/notifications/read', protect, clearReadNotifications); // Xóa tất cả thông báo đã đọc của người dùng hiện tại
router.delete('/notifications/:id', protect, authorizeRoles('admin'), deleteNotification); // Route mới để xóa thông báo

// Training Course routes (khóa đào tạo) - ĐẢM BẢO THỨ TỰ NÀY
// Các route cụ thể phải đứng trước route có tham số động (:id)
router.get('/training-courses/my-registrations', protect, getUserRegistrations); // User xem lịch sử đăng ký của mình
router.get('/training-courses/my-created', protect, authorizeRoles('admin'), getAdminCreatedCourses); // Admin xem các khóa học mình đã tạo
router.get('/training-courses/admin/all-registrations', protect, authorizeRoles('admin'), getAdminAllRegistrations); // Admin xem tất cả đăng ký cho các khóa học mình tạo

router.post('/training-courses/:id/register', protect, registerForCourse); // User đăng ký khóa học
router.get('/training-courses/:id/registrations', protect, authorizeRoles('admin'), getCourseRegistrationsForAdmin); // Admin xem danh sách đăng ký của một khóa học cụ thể
router.put('/training-courses/registrations/:id/status', protect, authorizeRoles('admin'), updateRegistrationStatus); // Admin cập nhật trạng thái đăng ký

router.post('/training-courses', protect, authorizeRoles('admin'), createCourse); // Admin tạo khóa học
router.get('/training-courses', protect, getAllCourses); // Lấy tất cả khóa học (User & Admin)
router.get('/training-courses/:id', protect, getCourseById); // Lấy chi tiết khóa học (User & Admin)
router.put('/training-courses/:id', protect, authorizeRoles('admin'), updateCourse); // Admin cập nhật khóa học
router.delete('/training-courses/:id', protect, authorizeRoles('admin'), deleteCourse); // Admin xóa khóa học

// Evaluation Form routes (Bản đánh giá)
router.post('/evaluation-forms', protect, authorizeRoles('admin'), createEvaluationForm); // Admin tạo bản đánh giá mới
router.get('/evaluation-forms/my-created', protect, authorizeRoles('admin'), getAdminCreatedEvaluationForms); // Admin xem các bản đánh giá mình đã tạo
router.get('/evaluation-forms/available', protect, getAllAvailableEvaluationFormsForUser); // Route mới: Lấy tất cả bản đánh giá có sẵn cho user
router.get('/evaluation-forms/:id', protect, getEvaluationFormById); // Lấy chi tiết bản đánh giá (User & Admin)
router.delete('/evaluation-forms/:id', protect, authorizeRoles('admin'), deleteEvaluationForm); // Admin xóa bản đánh giá

// Evaluation Response routes (Phản hồi đánh giá)
router.post('/evaluation-forms/:formId/submit-response', protect, submitEvaluationResponse); // User gửi phản hồi
router.get('/evaluation-responses/me', protect, getUserEvaluationResponses); // User xem lịch sử phản hồi của mình
router.get('/evaluation-responses/admin/all', protect, authorizeRoles('admin'), getAdminEvaluationResponses); // Admin xem tất cả phản hồi cho các form mình tạo
router.get('/evaluation-responses/:id', protect, authorizeRoles('admin'), getEvaluationResponseById); // Admin xem chi tiết phản hồi của user
router.put('/evaluation-responses/:id/mark-received', protect, authorizeRoles('admin'), markResponseAsReceived); // Admin đánh dấu phản hồi đã nhận

export default router;
