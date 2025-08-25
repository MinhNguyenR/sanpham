import asyncHandler from 'express-async-handler';
import BenefitPolicy from '../models/BenefitPolicy.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js';


const createBenefitPolicy = asyncHandler(async (req, res) => {
    const { name, description, type, value, isMonetary, effectiveDate, endDate, eligibilityCriteria } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || !description || !type || !effectiveDate) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc: Tên, Mô tả, Loại, Ngày hiệu lực.');
    }

    // Kiểm tra xem tên chính sách đã tồn tại chưa
    const policyExists = await BenefitPolicy.findOne({ name });
    if (policyExists) {
        res.status(400);
        throw new Error('Tên chính sách phúc lợi đã tồn tại.');
    }

    const benefitPolicy = await BenefitPolicy.create({
        name,
        description,
        type,
        value: value || 0, 
        isMonetary: isMonetary || false, 
        effectiveDate: new Date(effectiveDate),
        endDate: endDate ? new Date(endDate) : null,
        eligibilityCriteria: eligibilityCriteria || 'Tất cả nhân viên',
        createdBy: req.user._id, 
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về chính sách mới
    const allUsers = await User.find({}); // Lấy tất cả người dùng
    for (const user of allUsers) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'new_benefit_policy',
            message: `Một chính sách phúc lợi mới đã được ban hành: "${name}". Vui lòng kiểm tra mục Phúc lợi.`,
            entityId: benefitPolicy._id,
            relatedDate: effectiveDate,
        });
    }
    console.log(`[benefitPolicyController] Emitted 'new_benefit_policy' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo chính sách phúc lợi thành công.',
        benefitPolicy,
    });
});


const getAllBenefitPoliciesForAdmin = asyncHandler(async (req, res) => {
    const policies = await BenefitPolicy.find({})
        .populate('createdBy', 'name email role') // Lấy thông tin người tạo
        .sort({ createdAt: -1 }); // Sắp xếp theo ngày tạo mới nhất

    res.status(200).json({
        success: true,
        count: policies.length,
        policies,
    });
});

const getBenefitPolicyById = asyncHandler(async (req, res) => {
    const policy = await BenefitPolicy.findById(req.params.id).populate('createdBy', 'name email');

    if (!policy) {
        res.status(404);
        throw new Error('Không tìm thấy chính sách phúc lợi.');
    }

    // Admin có thể xem tất cả các chính sách
    // Người dùng thông thường chỉ có thể xem nếu chính sách đang hoạt động
    // (logic này đã được xử lý ở route getActiveBenefitPoliciesForUser)
    // Nếu truy cập trực tiếp bằng ID, chỉ admin mới được phép để tránh lộ thông tin chính sách chưa công khai
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền truy cập chính sách này bằng ID.');
    }

    res.status(200).json({
        success: true,
        policy,
    });
});


const updateBenefitPolicy = asyncHandler(async (req, res) => {
    const { name, description, type, value, isMonetary, effectiveDate, endDate, eligibilityCriteria } = req.body;

    const policy = await BenefitPolicy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Không tìm thấy chính sách phúc lợi.');
    }

    // Chỉ admin mới có quyền cập nhật
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền cập nhật chính sách phúc lợi.');
    }

    policy.name = name || policy.name;
    policy.description = description || policy.description;
    policy.type = type || policy.type;
    policy.value = value !== undefined ? value : policy.value;
    policy.isMonetary = isMonetary !== undefined ? isMonetary : policy.isMonetary;
    policy.effectiveDate = effectiveDate ? new Date(effectiveDate) : policy.effectiveDate;
    policy.endDate = endDate ? new Date(endDate) : null;
    policy.eligibilityCriteria = eligibilityCriteria || policy.eligibilityCriteria;

    const updatedPolicy = await policy.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về chính sách được cập nhật
    const allUsers = await User.find({});
    for (const user of allUsers) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'benefit_policy_updated',
            message: `Chính sách phúc lợi "${updatedPolicy.name}" đã được cập nhật bởi ${req.user.name}.`,
            entityId: updatedPolicy._id,
            relatedDate: updatedPolicy.effectiveDate,
        });
    }
    console.log(`[benefitPolicyController] Emitted 'benefit_policy_updated' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật chính sách phúc lợi thành công.',
        policy: updatedPolicy,
    });
});

const deleteBenefitPolicy = asyncHandler(async (req, res) => {
    const policy = await BenefitPolicy.findById(req.params.id);

    if (!policy) {
        res.status(404);
        throw new Error('Không tìm thấy chính sách phúc lợi.');
    }

    // Chỉ admin mới có quyền xóa
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Bạn không có quyền xóa chính sách phúc lợi.');
    }

    const policyName = policy.name; 
    await policy.deleteOne(); 

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả người dùng về chính sách bị xóa
    const allUsers = await User.find({});
    for (const user of allUsers) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: user._id,
            receiverRole: user.role,
            type: 'benefit_policy_deleted',
            message: `Chính sách phúc lợi "${policyName}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[benefitPolicyController] Emitted 'benefit_policy_deleted' to all users.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa chính sách phúc lợi thành công.',
    });
});


const getActiveBenefitPoliciesForUser = asyncHandler(async (req, res) => {
    const today = new Date();
    const policies = await BenefitPolicy.find({
        effectiveDate: { $lte: today }, // Ngày hiệu lực phải nhỏ hơn hoặc bằng hôm nay
        $or: [
            { endDate: null }, // Hoặc không có ngày kết thúc
            { endDate: { $gte: today } } // Hoặc ngày kết thúc lớn hơn hoặc bằng hôm nay
        ]
    })
    .select('-createdBy') 
    .sort({ effectiveDate: -1 });

    res.status(200).json({
        success: true,
        count: policies.length,
        policies,
    });
});


export {
    createBenefitPolicy,
    getAllBenefitPoliciesForAdmin,
    getBenefitPolicyById,
    updateBenefitPolicy,
    deleteBenefitPolicy,
    getActiveBenefitPoliciesForUser,
};
