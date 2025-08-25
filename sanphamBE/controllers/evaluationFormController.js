import asyncHandler from 'express-async-handler';
import EvaluationForm from '../models/EvaluationForm.js';
import EvaluationResponse from '../models/EvaluationResponse.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { format } from 'date-fns';


const createEvaluationForm = asyncHandler(async (req, res) => {
    const { title, description, questions, dueDate } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0 || !dueDate) {
        res.status(400);
        throw new Error('Vui lòng cung cấp đầy đủ tiêu đề, câu hỏi và thời hạn cho bản đánh giá.');
    }

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
        createdBy: req.user._id,
        creatorName: req.user.name,
        dueDate: new Date(dueDate),
        isActive: true,
    });

    const createdForm = await evaluationForm.save();

    const allUsers = await User.find({});
    for (const u of allUsers) {
        if (u._id.toString() !== req.user._id.toString()) {
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
            if (req.io) {
                req.io.to(u._id.toString()).emit('newNotification', { type: 'new_evaluation_form', entityId: createdForm._id });
                console.log(`[Notification] Emitted 'new_evaluation_form' to user ${u._id}`);
            }
        }
    }

    res.status(201).json(createdForm);
});


const getAdminCreatedEvaluationForms = asyncHandler(async (req, res) => {
    const forms = await EvaluationForm.find({ createdBy: req.user._id })
        .populate('createdBy', 'name email position'); 

    const formsWithResponseCounts = await Promise.all(forms.map(async (form) => {
        const responsesCount = await EvaluationResponse.countDocuments({ form: form._id });
        return { ...form.toObject(), responsesCount };
    }));

    res.json(formsWithResponseCounts);
});


const getEvaluationFormById = asyncHandler(async (req, res) => {
    const form = await EvaluationForm.findById(req.params.id)
        .populate('createdBy', 'name email position'); 
    if (!form) {
        res.status(404);
        throw new Error('Không tìm thấy bản đánh giá.');
    }

    res.json(form);
});


const getAllAvailableEvaluationFormsForUser = asyncHandler(async (req, res) => {
    const activeForms = await EvaluationForm.find({
        isActive: true,
        dueDate: { $gte: new Date() }
    }).populate('createdBy', 'name email position'); // THÊM DÒNG NÀY ĐỂ POPULATE THÔNG TIN NGƯỜI TẠO

    const userResponses = await EvaluationResponse.find({ user: req.user._id }).select('form');
    const respondedFormIds = new Set(userResponses.map(resp => resp.form.toString()));

    const availableForms = activeForms.filter(form => !respondedFormIds.has(form._id.toString()));

    res.json(availableForms);
});


const deleteEvaluationForm = asyncHandler(async (req, res) => {
    const formId = req.params.id;

    const form = await EvaluationForm.findById(formId);

    if (!form) {
        res.status(404);
        throw new Error('Không tìm thấy bản đánh giá.');
    }

    if (form.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xóa bản đánh giá này.');
    }

    const existingResponses = await EvaluationResponse.countDocuments({ form: formId });
    if (existingResponses > 0) {
        res.status(400);
        throw new Error('Không thể xóa bản đánh giá này vì đã có người dùng phản hồi.');
    }

    await form.deleteOne();

    res.json({ message: 'Bản đánh giá đã được xóa thành công.' });
});

export {
    createEvaluationForm,
    getAdminCreatedEvaluationForms,
    getEvaluationFormById,
    getAllAvailableEvaluationFormsForUser,
    deleteEvaluationForm,
};