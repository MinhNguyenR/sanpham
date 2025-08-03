// backend/controllers/courseRegistrationController.js
import asyncHandler from 'express-async-handler';
import CourseRegistration from '../models/CourseRegistration.js';
import TrainingCourse from '../models/TrainingCourse.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js'; // Import hàm tạo thông báo
import { format } from 'date-fns';

// @desc    Đăng ký khóa học
// @route   POST /api/auth/training-courses/:id/register
// @access  User
const registerForCourse = asyncHandler(async (req, res) => {
    const { phoneNumber, email, fullName, notes } = req.body;
    const courseId = req.params.id;

    const course = await TrainingCourse.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Không tìm thấy khóa học để đăng ký.');
    }

    // Kiểm tra xem người dùng đã đăng ký khóa học này chưa
    const existingRegistration = await CourseRegistration.findOne({
        course: courseId,
        user: req.user._id,
    });

    if (existingRegistration) {
        res.status(400);
        throw new Error('Bạn đã đăng ký khóa học này rồi.');
    }

    const registration = new CourseRegistration({
        course: courseId,
        user: req.user._id,
        phoneNumber,
        email,
        fullName,
        notes,
        status: 'pending', // Mặc định là đang chờ duyệt
    });

    const createdRegistration = await registration.save();

    // Gửi thông báo cho admin tạo khóa học
    // Đảm bảo course.createdBy tồn tại trước khi tìm User
    const courseCreator = course.createdBy ? await User.findById(course.createdBy) : null;
    if (courseCreator && courseCreator.role === 'admin') {
        await createNotification({
            sender: req.user._id,
            senderName: req.user.name,
            receiver: courseCreator._id,
            receiverRole: 'admin',
            type: 'course_registered',
            message: `${req.user.name} (${req.user.email}) đã đăng ký khóa học "${course.title}" của bạn.`,
            entityId: createdRegistration._id,
            relatedDate: format(new Date(), 'yyyy-MM-dd'),
        });
        // Gửi thông báo real-time qua socket.io
        if (req.io) { // Kiểm tra req.io tồn tại
            req.io.to(courseCreator._id.toString()).emit('newNotification', { type: 'course_registered', entityId: createdRegistration._id });
            console.log(`[Notification] Emitted 'course_registered' to admin ${courseCreator._id} for registration ${createdRegistration._id}`);
        } else {
            console.warn('Socket.IO (req.io) is not available to send real-time notification.');
        }
    }

    res.status(201).json(createdRegistration);
});

// @desc    Lấy lịch sử đăng ký khóa học của người dùng hiện tại
// @route   GET /api/auth/training-courses/my-registrations
// @access  User
const getUserRegistrations = asyncHandler(async (req, res) => {
    const registrations = await CourseRegistration.find({ user: req.user._id })
        .populate('user', 'name email') // Đảm bảo lấy cả name và email
        .populate({
            path: 'course',
            select: 'title overview createdBy mainInCharge',
            populate: [
                { path: 'createdBy', select: 'name' },
                { path: 'mainInCharge', select: 'name' }
            ]
        });

    res.json(registrations);
});

// @desc    Lấy danh sách đăng ký cho một khóa học cụ thể (dành cho admin)
// @route   GET /api/auth/training-courses/:id/registrations
// @access  Admin
const getCourseRegistrationsForAdmin = asyncHandler(async (req, res) => {
    const courseId = req.params.id;

    // Kiểm tra xem khóa học có tồn tại và được tạo bởi admin hiện tại không
    const course = await TrainingCourse.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Không tìm thấy khóa học.');
    }
    if (course.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xem danh sách đăng ký của khóa học này.');
    }

    const registrations = await CourseRegistration.find({ course: courseId })
        .populate('user', 'name email') // Đảm bảo lấy cả name và email
        .populate('course', 'title'); // Lấy tên khóa học

    res.json(registrations);
});

// @desc    Lấy tất cả các đăng ký cho các khóa học do admin hiện tại tạo
// @route   GET /api/auth/training-courses/admin/all-registrations
// @access  Admin
const getAdminAllRegistrations = asyncHandler(async (req, res) => {
    // Tìm tất cả các khóa học mà admin hiện tại đã tạo
    const createdCourses = await TrainingCourse.find({ createdBy: req.user._id }).select('_id');
    const createdCourseIds = createdCourses.map(course => course._id);

    // Tìm tất cả các đăng ký cho các khóa học đó
    const registrations = await CourseRegistration.find({ course: { $in: createdCourseIds } })
        .populate('user', 'name email') // Đảm bảo lấy cả name và email
        .populate({
            path: 'course',
            select: 'title overview createdBy mainInCharge', // Chọn các trường của khóa học
            populate: [
                { path: 'createdBy', select: 'name' }, // Populate người tạo khóa học
                { path: 'mainInCharge', select: 'name' } // Populate người phụ trách chính khóa học
            ]
        });

    res.json(registrations);
});


// @desc    Cập nhật trạng thái đăng ký khóa học (duyệt/từ chối)
// @route   PUT /api/auth/training-courses/registrations/:id/status
// @access  Admin
const updateRegistrationStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body; // Thêm adminNotes nếu cần
    const registrationId = req.params.id;

    // Populate cả user và course để đảm bảo có đủ thông tin
    const registration = await CourseRegistration.findById(registrationId)
        .populate('course', 'title createdBy') // Chỉ lấy title và createdBy của course
        .populate('user', 'name email role'); // Lấy name, email, role của user (đã có name)

    console.log('[updateRegistrationStatus] Fetched registration:', registration);

    if (!registration) {
        res.status(404);
        throw new Error('Không tìm thấy đăng ký khóa học.');
    }

    // Đảm bảo registration.course và registration.user không phải là null
    if (!registration.course) {
        res.status(404);
        throw new Error('Không tìm thấy khóa học liên quan đến đăng ký này.');
    }
    if (!registration.user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng liên quan đến đăng ký này.');
    }

    // Kiểm tra quyền: chỉ admin tạo khóa học mới được duyệt/từ chối đăng ký
    // Đảm bảo registration.course.createdBy tồn tại
    if (!registration.course.createdBy || registration.course.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền cập nhật trạng thái đăng ký này.');
    }

    registration.status = status;
    // Có thể thêm trường adminNotes vào model CourseRegistration nếu muốn lưu ghi chú của admin
    // registration.adminNotes = adminNotes || registration.adminNotes;

    const updatedRegistration = await registration.save();
    console.log('[updateRegistrationStatus] Updated registration:', updatedRegistration);

    // Gửi thông báo cho người dùng đã đăng ký
    const messageContent = status === 'approved'
        ? `Đăng ký khóa học "${registration.course.title}" của bạn đã được duyệt.`
        : `Đăng ký khóa học "${registration.course.title}" của bạn đã bị từ chối.`;

    await createNotification({
        sender: req.user._id,
        senderName: req.user.name,
        receiver: registration.user._id,
        receiverRole: registration.user.role,
        type: status === 'approved' ? 'course_registration_approved' : 'course_registration_rejected',
        message: messageContent,
        entityId: updatedRegistration._id,
        relatedDate: format(new Date(), 'yyyy-MM-dd'),
    });

    // Gửi thông báo real-time qua socket.io
    if (req.io) { // Kiểm tra req.io tồn tại
        req.io.to(registration.user._id.toString()).emit('newNotification', {
            type: status === 'approved' ? 'course_registration_approved' : 'course_registration_rejected',
            entityId: updatedRegistration._id
        });
        console.log(`[Notification] Emitted 'course_registration_${status}' to user ${registration.user._id} for registration ${updatedRegistration._id}`);
    } else {
        console.warn('Socket.IO (req.io) is not available to send real-time notification.');
    }

    res.json(updatedRegistration);
});

export {
    registerForCourse,
    getUserRegistrations,
    getCourseRegistrationsForAdmin,
    getAdminAllRegistrations,
    updateRegistrationStatus,
};
