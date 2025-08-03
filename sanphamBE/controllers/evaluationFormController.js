// backend/controllers/evaluationFormController.js
import asyncHandler from 'express-async-handler';
import EvaluationForm from '../models/EvaluationForm.js';
import EvaluationResponse from '../models/EvaluationResponse.js'; // Import để kiểm tra các phản hồi liên quan khi xóa form
import User from '../models/User.js'; // Import để populate creator info
import { createNotification } from './notificationController.js'; // Import hàm tạo thông báo
import { format } from 'date-fns';

// @desc    Tạo bản đánh giá mới
// @route   POST /api/auth/evaluation-forms
// @access  Admin
const createEvaluationForm = asyncHandler(async (req, res) => {
    const { title, description, questions, dueDate } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0 || !dueDate) {
        res.status(400);
        throw new Error('Vui lòng cung cấp đầy đủ tiêu đề, câu hỏi và thời hạn cho bản đánh giá.');
    }

    // Kiểm tra từng câu hỏi
    for (const q of questions) {
        if (!q.questionText || !q.questionType) {
            res.status(400);
            throw new Error('Mỗi câu hỏi phải có nội dung và loại câu hỏi.');
        }
        if ((q.questionType === 'radio' || q.questionType === 'checkbox') && (!q.options || !Array.isArray(q.options) || q.options.length === 0)) {
            res.status(400);
            throw new Error(`Câu hỏi loại "${q.questionType}" phải có ít nhất một lựa chọn.`);
        }
    }

    const evaluationForm = new EvaluationForm({
        title,
        description,
        questions,
        createdBy: req.user._id, // Người tạo là admin hiện tại
        creatorName: req.user.name, // Lưu tên người tạo để hiển thị nhanh
        dueDate: new Date(dueDate), // Chuyển đổi sang đối tượng Date
        isActive: true, // Mặc định là hoạt động khi tạo
    });

    const createdForm = await evaluationForm.save();

    // Gửi thông báo cho tất cả người dùng và admin khác
    const allUsers = await User.find({}); // Lấy tất cả người dùng
    for (const u of allUsers) {
        if (u._id.toString() !== req.user._id.toString()) { // Không gửi cho chính người tạo
            await createNotification({
                sender: req.user._id,
                senderName: req.user.name,
                receiver: u._id,
                receiverRole: u.role,
                type: 'new_evaluation_form',
                message: `Admin ${req.user.name} đã tạo một bản đánh giá mới: "${createdForm.title}". Thời hạn: ${format(new Date(createdForm.dueDate), 'dd/MM/yyyy HH:mm')}.`,
                entityId: createdForm._id,
                relatedDate: format(new Date(), 'yyyy-MM-dd'),
            });
            // Gửi thông báo real-time qua socket.io
            if (req.io) {
                req.io.to(u._id.toString()).emit('newNotification', { type: 'new_evaluation_form', entityId: createdForm._id });
                console.log(`[Notification] Emitted 'new_evaluation_form' to user ${u._id}`);
            }
        }
    }

    res.status(201).json(createdForm);
});

// @desc    Lấy tất cả các bản đánh giá do admin hiện tại tạo
// @route   GET /api/auth/evaluation-forms/my-created
// @access  Admin
const getAdminCreatedEvaluationForms = asyncHandler(async (req, res) => {
    const forms = await EvaluationForm.find({ createdBy: req.user._id })
        .populate('createdBy', 'name email'); // Populate thông tin người tạo

    // Đếm số lượng phản hồi cho mỗi form
    const formsWithResponseCounts = await Promise.all(forms.map(async (form) => {
        const responsesCount = await EvaluationResponse.countDocuments({ form: form._id });
        return { ...form.toObject(), responsesCount };
    }));

    res.json(formsWithResponseCounts);
});

// @desc    Lấy chi tiết một bản đánh giá theo ID
// @route   GET /api/auth/evaluation-forms/:id
// @access  User & Admin
const getEvaluationFormById = asyncHandler(async (req, res) => {
    const form = await EvaluationForm.findById(req.params.id)
        .populate('createdBy', 'name email'); // Populate thông tin người tạo

    if (!form) {
        res.status(404);
        throw new Error('Không tìm thấy bản đánh giá.');
    }

    res.json(form);
});

// @desc    Lấy tất cả các bản đánh giá có sẵn cho người dùng hiện tại
// @route   GET /api/auth/evaluation-forms/available
// @access  User
const getAllAvailableEvaluationFormsForUser = asyncHandler(async (req, res) => {
    // Tìm tất cả các form đang hoạt động và chưa hết hạn
    const activeForms = await EvaluationForm.find({
        isActive: true,
        dueDate: { $gte: new Date() } // Thời hạn phải lớn hơn hoặc bằng thời điểm hiện tại
    });

    // Tìm tất cả các phản hồi mà người dùng hiện tại đã gửi
    const userResponses = await EvaluationResponse.find({ user: req.user._id }).select('form');
    const respondedFormIds = new Set(userResponses.map(resp => resp.form.toString()));

    // Lọc ra các form mà người dùng chưa phản hồi
    const availableForms = activeForms.filter(form => !respondedFormIds.has(form._id.toString()));

    res.json(availableForms);
});


// @desc    Xóa một bản đánh giá (chỉ khi chưa có phản hồi nào)
// @route   DELETE /api/auth/evaluation-forms/:id
// @access  Admin
const deleteEvaluationForm = asyncHandler(async (req, res) => {
    const formId = req.params.id;

    const form = await EvaluationForm.findById(formId);

    if (!form) {
        res.status(404);
        throw new Error('Không tìm thấy bản đánh giá.');
    }

    // Kiểm tra quyền: chỉ người tạo mới được xóa
    if (form.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xóa bản đánh giá này.');
    }

    // Kiểm tra xem có bất kỳ phản hồi nào cho bản đánh giá này không
    const existingResponses = await EvaluationResponse.countDocuments({ form: formId });
    if (existingResponses > 0) {
        res.status(400);
        throw new Error('Không thể xóa bản đánh giá này vì đã có người dùng phản hồi.');
    }

    await form.deleteOne(); // Sử dụng deleteOne() thay vì remove()

    res.json({ message: 'Bản đánh giá đã được xóa thành công.' });
});

export {
    createEvaluationForm,
    getAdminCreatedEvaluationForms,
    getEvaluationFormById,
    getAllAvailableEvaluationFormsForUser, // Export hàm mới
    deleteEvaluationForm,
};
