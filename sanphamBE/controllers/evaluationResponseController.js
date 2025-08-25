import asyncHandler from 'express-async-handler';
import EvaluationForm from '../models/EvaluationForm.js';
import EvaluationResponse from '../models/EvaluationResponse.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js'; 
import { format } from 'date-fns';


const submitEvaluationResponse = asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const { answers } = req.body; 

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
        userPosition: req.user.position, 
        answers: processedAnswers,
        status: 'pending', 
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
            // Đã cập nhật tin nhắn thông báo để bao gồm position
            message: `${req.user.name} (${req.user.email}, ${req.user.position}) đã hoàn thành bản đánh giá "${form.title}".`,
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

const getUserEvaluationResponses = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const responses = await EvaluationResponse.find({ user: userId })
        .populate('user', 'name email position')
        .populate({ 
            path: 'form',
            select: 'title description dueDate createdBy', 
            populate: {
                path: 'createdBy', 
                select: 'name position' 
            }
        })
        .sort({ createdAt: -1 });
    res.status(200).json(responses);
});

const getAdminEvaluationResponses = asyncHandler(async (req, res) => {
    const { status, formId, userId, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (formId) query.form = formId;
    if (userId) query.user = userId;

    if (startDate && endDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        query.createdAt = {
            $gte: startOfDay,
            $lte: endOfDay,
        };
    }

    const responses = await EvaluationResponse.find(query)
        .populate('user', 'name email role position')
        .populate({ // THÊM NESTED POPULATE NÀY
            path: 'form',
            select: 'title description dueDate createdBy',
            populate: {
                path: 'createdBy',
                select: 'name position'
            }
        })
        .sort({ createdAt: -1 });

    res.status(200).json(responses);
});

const getEvaluationResponseById = asyncHandler(async (req, res) => {
    const response = await EvaluationResponse.findById(req.params.id)
        .populate('user', 'name email position')
        .populate({ 
            path: 'form',
            select: 'title description dueDate createdBy',
            populate: {
                path: 'createdBy',
                select: 'name position'
            }
        });

    if (!response) {
        res.status(404);
        throw new Error('Không tìm thấy phản hồi đánh giá.');
    }

    // Đảm bảo người dùng chỉ xem được phản hồi của chính họ nếu không phải admin
    if (response.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền truy cập phản hồi này.');
    }

    res.json(response);
});


const markResponseAsReceived = asyncHandler(async (req, res) => {
    const responseId = req.params.id;

    const response = await EvaluationResponse.findById(responseId)
        .populate('form', 'title') // Lấy tiêu đề form để thông báo
        .populate('user', 'name email role position'); // Đã thêm 'position' vào populate

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