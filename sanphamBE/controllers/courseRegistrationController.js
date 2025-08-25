import asyncHandler from 'express-async-handler';
import CourseRegistration from '../models/CourseRegistration.js';
import TrainingCourse from '../models/TrainingCourse.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js'; 
import { format } from 'date-fns';

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
        position: req.user.position, // LƯU TRỮ CHỨC VỤ CỦA NGƯỜI DÙNG KHI ĐĂNG KÝ
        notes,
        status: 'pending', // Mặc định là đang chờ duyệt
    });

    const createdRegistration = await registration.save();

    // Gửi thông báo cho admin tạo khóa học
    const courseCreator = course.createdBy ? await User.findById(course.createdBy) : null;
    if (courseCreator && courseCreator.role === 'admin') {
        await createNotification({
            sender: req.user._id,
            senderName: req.user.name,
            receiver: courseCreator._id,
            receiverRole: 'admin',
            type: 'course_registered',
            message: `${req.user.name} (${req.user.email}, ${req.user.position}) đã đăng ký khóa học "${course.title}" của bạn.`, // THÊM POSITION VÀO TIN NHẮN
            entityId: createdRegistration._id,
            relatedDate: format(new Date(), 'yyyy-MM-dd'),
        });
        if (req.io) {
            req.io.to(courseCreator._id.toString()).emit('newNotification', { type: 'course_registered', entityId: createdRegistration._id });
            console.log(`[Notification] Emitted 'course_registered' to admin ${courseCreator._id} for registration ${createdRegistration._id}`);
        } else {
            console.warn('Socket.IO (req.io) is not available to send real-time notification.');
        }
    }

    res.status(201).json(createdRegistration);
});

const getUserRegistrations = asyncHandler(async (req, res) => {
    const registrations = await CourseRegistration.find({ user: req.user._id })
        .populate('user', 'name email position') 
        .populate({
            path: 'course',
            select: 'title overview createdBy mainInCharge',
            populate: [
                { path: 'createdBy', select: 'name email position' },
                { path: 'mainInCharge', select: 'name email position' }
            ]
        });

    res.json(registrations);
});


const getCourseRegistrationsForAdmin = asyncHandler(async (req, res) => {
    const courseId = req.params.id;

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
        .populate('user', 'name email position') // THÊM 'position' VÀO ĐÂY
        .populate('course', 'title');

    res.json(registrations);
});


const getAdminAllRegistrations = asyncHandler(async (req, res) => {
    const createdCourses = await TrainingCourse.find({ createdBy: req.user._id }).select('_id');
    const createdCourseIds = createdCourses.map(course => course._id);

    const registrations = await CourseRegistration.find({ course: { $in: createdCourseIds } })
        .populate('user', 'name email position') 
        .populate({
            path: 'course',
            select: 'title overview createdBy mainInCharge',
            populate: [
                { path: 'createdBy', select: 'name email position' },
                { path: 'mainInCharge', select: 'name email position' }
            ]
        });

    res.json(registrations);
});



const updateRegistrationStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body;
    const registrationId = req.params.id;

    const registration = await CourseRegistration.findById(registrationId)
        .populate('course', 'title createdBy')
        .populate('user', 'name email role position'); 

    console.log('[updateRegistrationStatus] Fetched registration:', registration);

    if (!registration) {
        res.status(404);
        throw new Error('Không tìm thấy đăng ký khóa học.');
    }

    if (!registration.course) {
        res.status(404);
        throw new Error('Không tìm thấy khóa học liên quan đến đăng ký này.');
    }
    if (!registration.user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng liên quan đến đăng ký này.');
    }

    if (!registration.course.createdBy || registration.course.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền cập nhật trạng thái đăng ký này.');
    }

    registration.status = status;

    const updatedRegistration = await registration.save();
    console.log('[updateRegistrationStatus] Updated registration:', updatedRegistration);

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

    if (req.io) {
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