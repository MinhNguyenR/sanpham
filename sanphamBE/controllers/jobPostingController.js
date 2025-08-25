import asyncHandler from 'express-async-handler';
import JobPosting from '../models/JobPosting.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 


const createJobPosting = asyncHandler(async (req, res) => {
    const { title, description, requirements, responsibilities, location, department, salaryRange, employmentType, experienceLevel, applicationDeadline } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !description || !requirements || !responsibilities || !location || !department || !applicationDeadline) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc.');
    }

    const jobPosting = await JobPosting.create({
        title,
        description,
        requirements,
        responsibilities,
        location,
        department,
        salaryRange: salaryRange || { min: 0, max: 0 },
        employmentType: employmentType || 'full-time',
        experienceLevel: experienceLevel || 'entry',
        applicationDeadline: new Date(applicationDeadline),
        createdBy: req.user._id,
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về vị trí tuyển dụng mới
    const allUsers = await User.find({});
    for (const user of allUsers) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'new_job_posting',
            message: `Một vị trí tuyển dụng mới đã được đăng: "${jobPosting.title}" tại phòng ban ${jobPosting.department}.`,
            entityId: jobPosting._id,
            relatedDate: jobPosting.createdAt,
        });
    }
    console.log(`[jobPostingController] Emitted 'new_job_posting' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo vị trí tuyển dụng thành công.',
        jobPosting,
    });
});

const getAllJobPostingsForAdmin = asyncHandler(async (req, res) => {
    const jobPostings = await JobPosting.find({})
        .populate('createdBy', 'name email position')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: jobPostings.length,
        jobPostings,
    });
});

const getOpenJobPostingsForUser = asyncHandler(async (req, res) => {
    const jobPostings = await JobPosting.find({ status: 'open', applicationDeadline: { $gte: new Date() } })
        .select('-createdBy') // Không hiển thị người tạo cho người dùng thông thường
        .sort({ applicationDeadline: 1 }); // Sắp xếp theo hạn chót sớm nhất

    res.status(200).json({
        success: true,
        count: jobPostings.length,
        jobPostings,
    });
});

const getJobPostingById = asyncHandler(async (req, res) => {
    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
        res.status(404);
        throw new Error('Không tìm thấy vị trí tuyển dụng.');
    }

    // Nếu là user, chỉ cho phép xem nếu trạng thái là 'open' và còn hạn chót
    if (req.user.role !== 'admin' && (jobPosting.status !== 'open' || jobPosting.applicationDeadline < new Date())) {
        res.status(403);
        throw new Error('Bạn không có quyền truy cập vị trí tuyển dụng này hoặc nó đã hết hạn/đóng.');
    }

    res.status(200).json({
        success: true,
        jobPosting,
    });
});


const updateJobPosting = asyncHandler(async (req, res) => {
    const { title, description, requirements, responsibilities, location, department, salaryRange, employmentType, experienceLevel, applicationDeadline, status } = req.body;

    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
        res.status(404);
        throw new Error('Không tìm thấy vị trí tuyển dụng.');
    }

    jobPosting.title = title || jobPosting.title;
    jobPosting.description = description || jobPosting.description;
    jobPosting.requirements = requirements || jobPosting.requirements;
    jobPosting.responsibilities = responsibilities || jobPosting.responsibilities;
    jobPosting.location = location || jobPosting.location;
    jobPosting.department = department || jobPosting.department;
    jobPosting.salaryRange = salaryRange || jobPosting.salaryRange;
    jobPosting.employmentType = employmentType || jobPosting.employmentType;
    jobPosting.experienceLevel = experienceLevel || jobPosting.experienceLevel;
    jobPosting.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : jobPosting.applicationDeadline;
    jobPosting.status = status || jobPosting.status;

    const updatedJobPosting = await jobPosting.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về vị trí tuyển dụng được cập nhật
    const allUsers = await User.find({});
    for (const user of allUsers) {
        let messageContent;
        if (status && status !== jobPosting.status) { // Nếu trạng thái thay đổi
            messageContent = `Vị trí tuyển dụng "${updatedJobPosting.title}" đã được cập nhật trạng thái thành "${status}".`;
            if (status === 'closed' || status === 'filled') {
                messageContent = `Vị trí tuyển dụng "${updatedJobPosting.title}" đã được đóng/điền đầy.`;
            }
        } else {
            messageContent = `Vị trí tuyển dụng "${updatedJobPosting.title}" đã được cập nhật.`;
        }
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'job_posting_updated',
            message: messageContent,
            entityId: updatedJobPosting._id,
            relatedDate: updatedJobPosting.updatedAt,
        });
    }
    console.log(`[jobPostingController] Emitted 'job_posting_updated' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật vị trí tuyển dụng thành công.',
        jobPosting: updatedJobPosting,
    });
});


const deleteJobPosting = asyncHandler(async (req, res) => {
    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
        res.status(404);
        throw new Error('Không tìm thấy vị trí tuyển dụng.');
    }

    const jobPostingTitle = jobPosting.title; // Lưu tên trước khi xóa
    await jobPosting.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về vị trí tuyển dụng bị xóa
    const allUsers = await User.find({});
    for (const user of allUsers) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'job_posting_closed',
            message: `Vị trí tuyển dụng "${jobPostingTitle}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[jobPostingController] Emitted 'job_posting_closed' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa vị trí tuyển dụng thành công.',
    });
});

export {
    createJobPosting,
    getAllJobPostingsForAdmin,
    getOpenJobPostingsForUser,
    getJobPostingById,
    updateJobPosting,
    deleteJobPosting,
};
