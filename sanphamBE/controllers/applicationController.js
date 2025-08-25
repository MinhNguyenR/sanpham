import asyncHandler from 'express-async-handler';
import Application from '../models/Application.js';
import JobPosting from '../models/JobPosting.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';


const submitApplication = asyncHandler(async (req, res) => {
    const { jobPostingId, resumeUrl, coverLetter } = req.body;
    const applicantId = req.user._id;

    // Kiểm tra các trường bắt buộc
    if (!jobPostingId) {
        res.status(400);
        throw new Error('Vui lòng cung cấp ID vị trí tuyển dụng.');
    }

    // Kiểm tra vị trí tuyển dụng có tồn tại và đang mở không
    const jobPosting = await JobPosting.findById(jobPostingId);
    if (!jobPosting) {
        res.status(404);
        throw new Error('Không tìm thấy vị trí tuyển dụng.');
    }
    if (jobPosting.status !== 'open' || jobPosting.applicationDeadline < new Date()) {
        res.status(400);
        throw new Error('Vị trí tuyển dụng này không còn mở để ứng tuyển hoặc đã hết hạn.');
    }

    // Kiểm tra xem người dùng đã nộp đơn cho vị trí này chưa
    const existingApplication = await Application.findOne({ jobPosting: jobPostingId, applicant: applicantId });
    if (existingApplication) {
        res.status(400);
        throw new Error('Bạn đã nộp đơn cho vị trí này rồi.');
    }

    const application = await Application.create({
        jobPosting: jobPostingId,
        applicant: applicantId,
        resumeUrl: resumeUrl || null,
        coverLetter: coverLetter || null,
        applicationDate: new Date(),
        status: 'pending',
    });

    // --- Logic Thông báo theo thời gian thực ---
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'new_application',
            message: `${req.user.name} đã nộp đơn ứng tuyển cho vị trí "${jobPosting.title}".`, 
            entityId: application._id,
            relatedDate: application.applicationDate,
        });
    }
    console.log(`[applicationController] Emitted 'new_application' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã nộp đơn ứng tuyển thành công.',
        application,
    });
});

const getUserApplications = asyncHandler(async (req, res) => {
    const applications = await Application.find({ applicant: req.user._id })
        .populate('jobPosting', 'title department location')
        .sort({ applicationDate: -1 });

    res.status(200).json({
        success: true,
        count: applications.length,
        applications,
    });
});


const getAllApplicationsForAdmin = asyncHandler(async (req, res) => {
    const applications = await Application.find({})
        .populate('jobPosting', 'title department location')
        .populate('applicant', 'name email position')
        .sort({ applicationDate: -1 });

    res.status(200).json({
        success: true,
        count: applications.length,
        applications,
    });
});


const getApplicationById = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate('jobPosting', 'title department location')
        .populate('applicant', 'name email position');

    if (!application) {
        res.status(404);
        throw new Error('Không tìm thấy đơn ứng tuyển.');
    }

    if (application.applicant._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền truy cập đơn ứng tuyển này.');
    }

    res.status(200).json({
        success: true,
        application,
    });
});


const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status, notes, interviewDate, interviewFeedback } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Không tìm thấy đơn ứng tuyển.');
    }

    const oldStatus = application.status; 

    application.status = status || application.status;
    application.notes = notes || application.notes;
    application.interviewDate = interviewDate ? new Date(interviewDate) : application.interviewDate;
    application.interviewFeedback = interviewFeedback || application.interviewFeedback;

    const updatedApplication = await application.save();


    if (oldStatus !== updatedApplication.status) {
        const applicantUser = await User.findById(updatedApplication.applicant);
        const jobPostingDetails = await JobPosting.findById(updatedApplication.jobPosting);


        const jobTitle = jobPostingDetails ? jobPostingDetails.title : 'một vị trí tuyển dụng không xác định';

        if (applicantUser) {
            let messageContent;
            switch (updatedApplication.status) {
                case 'reviewed':
                    messageContent = `Đơn ứng tuyển vị trí "${jobTitle}" của bạn đã được xem xét.`;
                    break;
                case 'interview_scheduled':
                    messageContent = `Bạn có lịch phỏng vấn cho vị trí "${jobTitle}" vào ngày ${interviewDate ? new Date(interviewDate).toLocaleDateString('vi-VN') : 'sắp tới'}.`;
                    break;
                case 'offered':
                    messageContent = `Bạn đã nhận được đề nghị cho vị trí "${jobTitle}".`;
                    break;
                case 'rejected':
                    messageContent = `Đơn ứng tuyển vị trí "${jobTitle}" của bạn đã bị từ chối.`;
                    break;
                case 'hired':
                    messageContent = `Chúc mừng! Bạn đã được tuyển dụng cho vị trí "${jobTitle}".`;
                    break;
                case 'withdrawn':
                    messageContent = `Đơn ứng tuyển vị trí "${jobTitle}" của bạn đã được rút lại.`;
                    break;
                default:
                    messageContent = `Trạng thái đơn ứng tuyển vị trí "${jobTitle}" của bạn đã được cập nhật thành "${updatedApplication.status}".`;
            }

            await createNotification({
                io: req.io,
                sender: req.user._id, 
                senderName: req.user.name,
                receiver: applicantUser._id,
                receiverRole: applicantUser.role,
                type: 'application_status_updated',
                message: messageContent,
                entityId: updatedApplication._id,
                relatedDate: updatedApplication.updatedAt,
            });
            console.log(`[applicationController] Emitted 'application_status_updated' to user ${applicantUser._id}`);
        }
    }
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật trạng thái đơn ứng tuyển thành công.',
        application: updatedApplication,
    });
});


const deleteApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Không tìm thấy đơn ứng tuyển.');
    }

    const applicantUser = await User.findById(application.applicant); 
    const jobPosting = await JobPosting.findById(application.jobPosting); 

    await application.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    const jobTitle = jobPosting ? jobPosting.title : 'một vị trí tuyển dụng không xác định';
    if (applicantUser) { 
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: applicantUser._id,
            receiverRole: applicantUser.role,
            type: 'application_status_updated', 
            message: `Đơn ứng tuyển vị trí "${jobTitle}" của bạn đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
        console.log(`[applicationController] Emitted 'application_status_updated' (deleted) to user ${applicantUser._id}`);
    }
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa đơn ứng tuyển thành công.',
    });
});

export {
    submitApplication,
    getUserApplications,
    getAllApplicationsForAdmin,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
};
