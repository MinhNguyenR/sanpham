import asyncHandler from 'express-async-handler';
import TrainingCourse from '../models/TrainingCourse.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js';
import { addHours } from 'date-fns'; 


const createCourse = asyncHandler(async (req, res) => {
    const { title, overview, content, imageUrl, detailedTime, mainInChargeId } = req.body;

    // Kiểm tra xem người phụ trách chính có tồn tại không
    const mainInChargeUser = await User.findById(mainInChargeId);
    if (!mainInChargeUser) {
        res.status(400);
        throw new Error('Người phụ trách chính không tồn tại.');
    }

    const course = new TrainingCourse({
        title,
        overview,
        content,
        imageUrl,
        detailedTime,
        createdBy: req.user._id, // Người tạo là admin hiện tại
        mainInCharge: mainInChargeId,
        creationTime: new Date(), // Ghi lại thời gian tạo
    });

    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
});

const getAllCourses = asyncHandler(async (req, res) => {
    // Populate thông tin người tạo và người phụ trách chính
    const courses = await TrainingCourse.find({})
        .populate('createdBy', 'name email position') // Chỉ lấy name và email của người tạo
        .populate('mainInCharge', 'name email position'); // Chỉ lấy name và email của người phụ trách

    res.json(courses);
});

const getCourseById = asyncHandler(async (req, res) => {
    const course = await TrainingCourse.findById(req.params.id)
        .populate('createdBy', 'name email position')
        .populate('mainInCharge', 'name email position');

    if (course) {
        // Gửi thông báo cho admin nếu có người dùng xem khóa học của họ
        if (req.user && course.createdBy.toString() === req.user._id.toString() && req.user.role === 'admin') {
            // Admin xem khóa học của chính họ, không cần thông báo
        } else if (req.user && course.createdBy.toString() !== req.user._id.toString() && course.createdBy.role === 'admin') {
             // Người dùng khác xem khóa học của admin, gửi thông báo cho admin
            await createNotification({
                sender: req.user._id,
                senderName: req.user.name,
                receiver: course.createdBy._id,
                receiverRole: 'admin',
                type: 'course_viewed',
                message: `${req.user.name} (${req.user.email}) đã xem khóa học "${course.title}" của bạn.`,
                entityId: course._id,
                relatedDate: new Date().toISOString().split('T')[0],
            });
            // Gửi thông báo real-time qua socket.io
            req.io.to(course.createdBy._id.toString()).emit('newNotification', { type: 'course_viewed', entityId: course._id });
            console.log(`[Notification] Emitted 'course_viewed' to admin ${course.createdBy._id} for course ${course._id}`);
        } else if (req.user && req.user.role === 'user' && course.createdBy.role === 'admin') {
             // Người dùng xem khóa học của admin, gửi thông báo cho admin
            await createNotification({
                sender: req.user._id,
                senderName: req.user.name,
                receiver: course.createdBy._id,
                receiverRole: 'admin',
                type: 'course_viewed',
                message: `${req.user.name} (${req.user.email}) đã xem khóa học "${course.title}" của bạn.`,
                entityId: course._id,
                relatedDate: new Date().toISOString().split('T')[0],
            });
            // Gửi thông báo real-time qua socket.io
            req.io.to(course.createdBy._id.toString()).emit('newNotification', { type: 'course_viewed', entityId: course._id });
            console.log(`[Notification] Emitted 'course_viewed' to admin ${course.createdBy._id} for course ${course._id}`);
        }
        res.json(course);
    } else {
        res.status(404);
        throw new Error('Không tìm thấy khóa đào tạo');
    }
});

const updateCourse = asyncHandler(async (req, res) => {
    const { title, overview, content, imageUrl, detailedTime, mainInChargeId } = req.body;

    const course = await TrainingCourse.findById(req.params.id);

    if (course) {
        // Kiểm tra quyền: chỉ admin tạo khóa học mới được chỉnh sửa
        if (course.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Bạn không có quyền chỉnh sửa khóa học này.');
        }

        // Kiểm tra giới hạn 24 giờ
        const twentyFourHoursAgo = addHours(new Date(), -24);
        if (course.creationTime < twentyFourHoursAgo) {
            res.status(403);
            throw new Error('Không thể chỉnh sửa khóa học sau 24 giờ kể từ khi tạo.');
        }

        // Kiểm tra người phụ trách chính mới
        let mainInChargeUser;
        if (mainInChargeId) {
            mainInChargeUser = await User.findById(mainInChargeId);
            if (!mainInChargeUser) {
                res.status(400);
                throw new Error('Người phụ trách chính không tồn tại.');
            }
        }

        course.title = title || course.title;
        course.overview = overview || course.overview;
        course.content = content || course.content;
        course.imageUrl = imageUrl || course.imageUrl;
        course.detailedTime = detailedTime || course.detailedTime;
        course.mainInCharge = mainInChargeId || course.mainInCharge;

        const updatedCourse = await course.save();
        res.json(updatedCourse);
    } else {
        res.status(404);
        throw new Error('Không tìm thấy khóa đào tạo');
    }
});

const deleteCourse = asyncHandler(async (req, res) => {
    const course = await TrainingCourse.findById(req.params.id);

    if (course) {
        // Kiểm tra quyền: chỉ admin tạo khóa học mới được xóa
        if (course.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Bạn không có quyền xóa khóa học này.');
        }
        await TrainingCourse.deleteOne({ _id: req.params.id }); // Sử dụng deleteOne thay vì remove
        res.json({ message: 'Khóa đào tạo đã được xóa' });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy khóa đào tạo');
    }
});

const getAdminCreatedCourses = asyncHandler(async (req, res) => {
    const courses = await TrainingCourse.find({ createdBy: req.user._id })
        .populate('createdBy', 'name email position')
        .populate('mainInCharge', 'name email position');
    res.json(courses);
});


export {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getAdminCreatedCourses,
};
