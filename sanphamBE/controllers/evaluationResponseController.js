// backend/controllers/evaluationResponseController.js
import asyncHandler from 'express-async-handler';
import EvaluationForm from '../models/EvaluationForm.js';
import EvaluationResponse from '../models/EvaluationResponse.js';
import User from '../models/User.js'; // Import để populate thông tin người dùng
import { createNotification } from './notificationController.js'; // Import hàm tạo thông báo
import { format } from 'date-fns';

// @desc    Người dùng gửi phản hồi bản đánh giá
// @route   POST /api/auth/evaluation-forms/:formId/submit-response
// @access  User
const submitEvaluationResponse = asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const { answers } = req.body; // answers là một mảng các đối tượng { questionId, questionText, answer }

    const form = await EvaluationForm.findById(formId);

    if (!form) {
        res.status(404);
        throw new Error('Không tìm thấy bản đánh giá.');
    }

    if (!form.isActive) {
        res.status(400);
        throw new Error('Bản đánh giá này không còn hoạt động.');
    }

    // Kiểm tra thời hạn
    if (new Date() > form.dueDate) {
        res.status(400);
        throw new Error('Thời hạn làm bản đánh giá đã hết.');
    }

    // Kiểm tra xem người dùng đã gửi phản hồi cho bản đánh giá này chưa
    const existingResponse = await EvaluationResponse.findOne({
        form: formId,
        user: req.user._id,
    });

    if (existingResponse) {
        res.status(400);
        throw new Error('Bạn đã gửi phản hồi cho bản đánh giá này rồi.');
    }

    // Kiểm tra các câu hỏi bắt buộc và định dạng câu trả lời
    const processedAnswers = [];
    for (const q of form.questions) {
        const userAnswer = answers.find(a => a.questionId.toString() === q._id.toString());

        if (q.isRequired && (!userAnswer || userAnswer.answer === undefined || userAnswer.answer === null || (typeof userAnswer.answer === 'string' && userAnswer.answer.trim() === '') || (Array.isArray(userAnswer.answer) && userAnswer.answer.length === 0))) {
            res.status(400);
            throw new Error(`Câu hỏi "${q.questionText}" là bắt buộc và chưa được trả lời.`);
        }

        if (userAnswer) {
            // Thêm logic kiểm tra kiểu dữ liệu và giá trị cho từng loại câu hỏi nếu cần
            // Ví dụ: kiểm tra min/max cho number/rating
            if ((q.questionType === 'number' || q.questionType === 'rating') && typeof userAnswer.answer !== 'number') {
                res.status(400);
                throw new Error(`Câu trả lời cho "${q.questionText}" phải là một số.`);
            }
            if (q.min !== null && userAnswer.answer < q.min) {
                res.status(400);
                throw new Error(`Câu trả lời cho "${q.questionText}" phải lớn hơn hoặc bằng ${q.min}.`);
            }
            if (q.max !== null && userAnswer.answer > q.max) {
                res.status(400);
                throw new Error(`Câu trả lời cho "${q.questionText}" phải nhỏ hơn hoặc bằng ${q.max}.`);
            }
            // Đối với radio/checkbox, đảm bảo câu trả lời nằm trong các options
            if ((q.questionType === 'radio' || q.questionType === 'checkbox') && q.options.length > 0) {
                const answerArray = Array.isArray(userAnswer.answer) ? userAnswer.answer : [userAnswer.answer];
                const invalidOptions = answerArray.filter(ans => !q.options.includes(ans));
                if (invalidOptions.length > 0) {
                    res.status(400);
                    throw new Error(`Câu trả lời không hợp lệ cho "${q.questionText}".`);
                }
            }


            processedAnswers.push({
                questionId: q._id,
                questionText: q.questionText,
                answer: userAnswer.answer,
            });
        }
    }

    const evaluationResponse = new EvaluationResponse({
        form: formId,
        user: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        answers: processedAnswers,
        status: 'pending', // Mặc định là đang chờ admin xem
    });

    const createdResponse = await evaluationResponse.save();

    // Gửi thông báo cho admin đã tạo bản đánh giá
    const formCreator = await User.findById(form.createdBy);
    if (formCreator && formCreator.role === 'admin') {
        await createNotification({
            sender: req.user._id,
            senderName: req.user.name,
            receiver: formCreator._id,
            receiverRole: 'admin',
            type: 'new_evaluation_response',
            message: `${req.user.name} (${req.user.email}) đã hoàn thành bản đánh giá "${form.title}".`,
            entityId: createdResponse._id,
            relatedDate: format(new Date(), 'yyyy-MM-dd'),
        });
        // Gửi thông báo real-time qua socket.io
        if (req.io) {
            req.io.to(formCreator._id.toString()).emit('newNotification', { type: 'new_evaluation_response', entityId: createdResponse._id });
            console.log(`[Notification] Emitted 'new_evaluation_response' to admin ${formCreator._id}`);
        } else {
            console.warn('Socket.IO (req.io) is not available to send real-time notification.');
        }
    }

    res.status(201).json(createdResponse);
});

// @desc    Lấy tất cả các bản đánh giá mà người dùng hiện tại đã trả lời
// @route   GET /api/auth/evaluation-responses/me
// @access  User
const getUserEvaluationResponses = asyncHandler(async (req, res) => {
    const responses = await EvaluationResponse.find({ user: req.user._id })
        .populate('form', 'title description dueDate creatorName') // Lấy thông tin form
        .populate('user', 'name email'); // Lấy thông tin người dùng (chính mình)

    res.json(responses);
});

// @desc    Lấy tất cả các phản hồi cho các bản đánh giá do admin hiện tại tạo
// @route   GET /api/auth/evaluation-responses/admin/all
// @access  Admin
const getAdminEvaluationResponses = asyncHandler(async (req, res) => {
    // Tìm tất cả các bản đánh giá mà admin hiện tại đã tạo
    const createdForms = await EvaluationForm.find({ createdBy: req.user._id }).select('_id');
    const createdFormIds = createdForms.map(form => form._id);

    // Tìm tất cả các phản hồi cho các bản đánh giá đó
    const responses = await EvaluationResponse.find({ form: { $in: createdFormIds } })
        .populate('form', 'title description dueDate creatorName') // Lấy thông tin form
        .populate('user', 'name email'); // Lấy thông tin người dùng đã trả lời

    res.json(responses);
});

// @desc    Lấy chi tiết một phản hồi bản đánh giá theo ID (dành cho admin)
// @route   GET /api/auth/evaluation-responses/:id
// @access  Admin
const getEvaluationResponseById = asyncHandler(async (req, res) => {
    const response = await EvaluationResponse.findById(req.params.id)
        .populate('form', 'title description dueDate creatorName questions') // Lấy chi tiết form và câu hỏi
        .populate('user', 'name email'); // Lấy thông tin người dùng đã trả lời

    if (!response) {
        res.status(404);
        throw new Error('Không tìm thấy phản hồi bản đánh giá.');
    }

    // Kiểm tra quyền: chỉ admin tạo form hoặc admin có quyền xem tất cả mới được xem
    // Lấy form gốc để kiểm tra người tạo
    const form = await EvaluationForm.findById(response.form);
    if (!form || form.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xem phản hồi này.');
    }

    res.json(response);
});

// @desc    Admin đánh dấu phản hồi bản đánh giá là đã nhận
// @route   PUT /api/auth/evaluation-responses/:id/mark-received
// @access  Admin
const markResponseAsReceived = asyncHandler(async (req, res) => {
    const responseId = req.params.id;

    const response = await EvaluationResponse.findById(responseId)
        .populate('form', 'title') // Lấy tiêu đề form để thông báo
        .populate('user', 'name email role'); // Lấy thông tin người dùng để thông báo

    if (!response) {
        res.status(404);
        throw new Error('Không tìm thấy phản hồi bản đánh giá.');
    }

    // Kiểm tra quyền: chỉ admin tạo form mới được đánh dấu đã nhận
    const form = await EvaluationForm.findById(response.form);
    if (!form || form.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền cập nhật trạng thái phản hồi này.');
    }

    if (response.status === 'received') {
        res.status(400);
        throw new Error('Phản hồi này đã được đánh dấu là đã nhận.');
    }

    response.status = 'received';
    const updatedResponse = await response.save();

    // Gửi thông báo cho người dùng đã gửi phản hồi
    await createNotification({
        sender: req.user._id,
        senderName: req.user.name,
        receiver: response.user._id,
        receiverRole: response.user.role,
        type: 'evaluation_response_received',
        message: `Bản đánh giá "${response.form.title}" của bạn đã được Admin ${req.user.name} tiếp nhận.`,
        entityId: updatedResponse._id,
        relatedDate: format(new Date(), 'yyyy-MM-dd'),
    });
    // Gửi thông báo real-time qua socket.io
    if (req.io) {
        req.io.to(response.user._id.toString()).emit('newNotification', { type: 'evaluation_response_received', entityId: updatedResponse._id });
        console.log(`[Notification] Emitted 'evaluation_response_received' to user ${response.user._id}`);
    } else {
        console.warn('Socket.IO (req.io) is not available to send real-time notification.');
    }

    res.json(updatedResponse);
});

export {
    submitEvaluationResponse,
    getUserEvaluationResponses,
    getAdminEvaluationResponses,
    getEvaluationResponseById,
    markResponseAsReceived,
};
