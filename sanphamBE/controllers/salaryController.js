import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import SalaryAdjustment from '../models/salaryAdjustment.js';
import { createNotification } from './notificationController.js'; 


const setBaseSalary = asyncHandler(async (req, res) => {
    const { baseSalary, position } = req.body;
    const userId = req.params.id;

    if (typeof baseSalary !== 'number' || baseSalary < 0) {
        res.status(400);
        throw new Error('Mức lương cơ bản phải là một số dương.');
    }
    if (position && typeof position !== 'string') {
        res.status(400);
        throw new Error('Chức vụ phải là một chuỗi.');
    }

    const user = await User.findById(userId);

    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const oldBaseSalary = user.baseSalary; // Lấy lương cũ để so sánh
    const oldPosition = user.position; // Lấy chức vụ cũ

    user.baseSalary = baseSalary;
    if (position) {
        user.position = position;
    }
    await user.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Chỉ gửi thông báo nếu có sự thay đổi về lương cơ bản hoặc chức vụ
    if (oldBaseSalary !== baseSalary || oldPosition !== position) {
        // Thông báo cho người dùng có lương được cập nhật
        await createNotification({
            io: req.io, 
            sender: req.user._id, 
            senderName: req.user.name,
            receiver: user._id, 
            receiverRole: user.role,
            type: 'salary_base_updated',
            message: `Lương cơ bản của bạn đã được cập nhật bởi ${req.user.name} lên ${baseSalary.toLocaleString('vi-VN')} VND. ${position ? `Chức vụ: ${position}.` : ''}`,
            entityId: user._id,
            relatedDate: new Date().toISOString().split('T')[0],
        });
        console.log(`[salaryController] Emitted 'salary_base_updated' to user ${user._id}`);
    }
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: `Đã cập nhật lương cơ bản và chức vụ (nếu có) cho ${user.name}.`,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            baseSalary: user.baseSalary,
            position: user.position,
        },
    });
});


const addSalaryAdjustment = asyncHandler(async (req, res) => {
    const { userId, type, category, reason, value, isPercentage, effectiveDate } = req.body;

   
    if (!userId || !type || !reason || (value === undefined || value === null) || !effectiveDate) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc (người dùng, loại, lý do, giá trị, ngày hiệu lực).');
    }

    if (!['bonus', 'deduction'].includes(type)) {
        res.status(400);
        throw new Error('Loại điều chỉnh lương không hợp lệ. Phải là "bonus" hoặc "deduction".');
    }

    if (!['individual', 'seasonal'].includes(category)) {
        res.status(400);
        throw new Error('Loại danh mục không hợp lệ. Phải là "individual" hoặc "seasonal".');
    }

    if (typeof value !== 'number' || value < 0) {
        res.status(400);
        throw new Error('Giá trị điều chỉnh phải là một số không âm.');
    }

    let finalAmount = value;
    let percentageVal = undefined;

    if (isPercentage) {
        if (typeof value !== 'number' || value < 0 || value > 1) { 
            res.status(400);
            throw new Error('Giá trị phần trăm phải nằm trong khoảng từ 0 đến 1 (ví dụ: 0.3 cho 30%).');
        }
        percentageVal = value; 
        
        const user = await User.findById(userId);
        if (!user || user.baseSalary === undefined) {
            res.status(404);
            throw new Error('Không tìm thấy người dùng hoặc lương cơ bản của người dùng chưa được thiết lập để tính toán phần trăm.');
        }
        finalAmount = user.baseSalary * percentageVal; 
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng mục tiêu.');
    }

    const newAdjustment = await SalaryAdjustment.create({
        user: userId,
        recordedBy: req.user._id, 
        type,
        category,
        reason,
        amount: finalAmount, 
        isPercentage: isPercentage || false,
        percentageValue: percentageVal, 
        effectiveDate: new Date(effectiveDate),
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho người dùng được thêm điều chỉnh lương
    await createNotification({
        io: req.io,
        sender: req.user._id,
        senderName: req.user.name,
        receiver: userId,
        receiverRole: userExists.role, 
        type: 'salary_adjustment_added',
        message: `Bạn có một điều chỉnh lương mới (${type === 'bonus' ? 'Thưởng' : 'Trừ lương'}) từ ${req.user.name}: "${reason}" với giá trị ${finalAmount.toLocaleString('vi-VN')} VND.`,
        entityId: newAdjustment._id,
        relatedDate: effectiveDate,
    });
    console.log(`[salaryController] Emitted 'salary_adjustment_added' to user ${userId}`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã thêm điều chỉnh lương thành công.',
        adjustment: newAdjustment,
    });
});

const getMonthlySalaryDetails = asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId || req.user._id; 
    const { month, year } = req.query;
    if (!month || !year) {
        res.status(400);
        throw new Error('Vui lòng cung cấp tháng và năm để xem lương.');
    }

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, parseInt(month) + 1, 0, 23, 59, 59, 999); 

    if (req.user.role !== 'admin' && targetUserId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xem thông tin lương của người dùng khác.');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const baseSalary = user.baseSalary || 0;

    const adjustments = await SalaryAdjustment.find({
        user: targetUserId,
        effectiveDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ createdAt: 1 });

    let totalBonus = 0;
    let totalDeduction = 0;
    let bonusDetails = [];
    let deductionDetails = [];
    let totalPercentageBonus = 0;
    let totalPercentageDeduction = 0;


    adjustments.forEach(adj => {
        if (adj.type === 'bonus') {
            totalBonus += adj.amount;
            bonusDetails.push({
                id: adj._id,
                reason: adj.reason,
                amount: adj.amount,
                isPercentage: adj.isPercentage,
                percentageValue: adj.percentageValue,
                category: adj.category,
                date: adj.effectiveDate,
            });
            if (adj.isPercentage) {
                totalPercentageBonus += adj.percentageValue;
            }
        } else if (adj.type === 'deduction') {
            totalDeduction += adj.amount;
            deductionDetails.push({
                id: adj._id,
                reason: adj.reason,
                amount: adj.amount,
                isPercentage: adj.isPercentage,
                percentageValue: adj.percentageValue,
                category: adj.category,
                date: adj.effectiveDate,
            });
            if (adj.isPercentage) {
                totalPercentageDeduction += adj.percentageValue;
            }
        }
    });

    const netSalary = baseSalary + totalBonus - totalDeduction;

    res.status(200).json({
        success: true,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userPosition: user.position,
        month: parseInt(month),
        year: parseInt(year),
        baseSalary,
        totalBonus,
        totalDeduction,
        netSalary,
        bonusDetails,
        deductionDetails,
        totalPercentageBonus,
        totalPercentageDeduction,
    });
});

const getAnnualSalaryDetails = asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId || req.user._id; 
    const { year } = req.query;

    if (!year) {
        res.status(400);
        throw new Error('Vui lòng cung cấp năm để xem lương.');
    }

    const startOfYear = new Date(year, 0, 1); 
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999); 

    // Ad
    if (req.user.role !== 'admin' && targetUserId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xem thông tin lương của người dùng khác.');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const baseSalary = user.baseSalary || 0;

    const adjustments = await SalaryAdjustment.find({
        user: targetUserId,
        effectiveDate: { $gte: startOfYear, $lte: endOfYear },
    }).sort({ effectiveDate: 1 }); 

    const monthlyData = {}; // { 'YYYY-MM': { totalBonus, totalDeduction, netSalary, bonusDetails, deductionDetails } }

    adjustments.forEach(adj => {
        const monthKey = `${adj.effectiveDate.getFullYear()}-${(adj.effectiveDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                totalBonus: 0,
                totalDeduction: 0,
                bonusDetails: [],
                deductionDetails: [],
                totalPercentageBonus: 0,
                totalPercentageDeduction: 0,
            };
        }

        if (adj.type === 'bonus') {
            monthlyData[monthKey].totalBonus += adj.amount;
            monthlyData[monthKey].bonusDetails.push({
                id: adj._id,
                reason: adj.reason,
                amount: adj.amount,
                isPercentage: adj.isPercentage,
                percentageValue: adj.percentageValue,
                category: adj.category,
                date: adj.effectiveDate,
            });
            if (adj.isPercentage) {
                monthlyData[monthKey].totalPercentageBonus += adj.percentageValue;
            }
        } else if (adj.type === 'deduction') {
            monthlyData[monthKey].totalDeduction += adj.amount;
            monthlyData[monthKey].deductionDetails.push({
                id: adj._id,
                reason: adj.reason,
                amount: adj.amount,
                isPercentage: adj.isPercentage,
                percentageValue: adj.percentageValue,
                category: adj.category,
                date: adj.effectiveDate,
            });
            if (adj.isPercentage) {
                monthlyData[monthKey].totalPercentageDeduction += adj.percentageValue;
            }
        }
    });

    let totalAnnualNetSalary = 0;
    const annualSummary = [];

    for (let m = 0; m < 12; m++) {
        const monthKey = `${year}-${(m + 1).toString().padStart(2, '0')}`;
        const data = monthlyData[monthKey] || { totalBonus: 0, totalDeduction: 0, bonusDetails: [], deductionDetails: [], totalPercentageBonus: 0, totalPercentageDeduction: 0 };
        const monthlyNetSalary = baseSalary + data.totalBonus - data.totalDeduction;
        totalAnnualNetSalary += monthlyNetSalary;

        annualSummary.push({
            month: m + 1,
            year: parseInt(year),
            baseSalary,
            totalBonus: data.totalBonus,
            totalDeduction: data.totalDeduction,
            netSalary: monthlyNetSalary,
            bonusDetails: data.bonusDetails,
            deductionDetails: data.deductionDetails,
            totalPercentageBonus: data.totalPercentageBonus,
            totalPercentageDeduction: data.totalPercentageDeduction,
        });
    }

    res.status(200).json({
        success: true,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userPosition: user.position,
        year: parseInt(year),
        baseSalary,
        totalAnnualNetSalary,
        monthlyBreakdown: annualSummary, 
    });
});
const getAllSalaryAdjustments = asyncHandler(async (req, res) => {
    const adjustments = await SalaryAdjustment.find({})
        .populate('user', 'name email position baseSalary role') 
        .populate('recordedBy', 'name email') 
        .sort({ createdAt: -1 })
    console.log("BACKEND TRACE (getAllSalaryAdjustments): Adjustments found in DB:", adjustments);
    res.status(200).json({
        success: true,
        count: adjustments.length,
        adjustments,
    });
});

const deleteSalaryAdjustment = asyncHandler(async (req, res) => {
    const adjustmentId = req.params.id;

    const adjustment = await SalaryAdjustment.findById(adjustmentId);

    if (!adjustment) {
        res.status(404);
        throw new Error('Không tìm thấy điều chỉnh lương.');
    }

    const affectedUser = await User.findById(adjustment.user); // Lấy thông tin người dùng bị ảnh hưởng

    await adjustment.deleteOne(); 

    // --- Logic Thông báo theo thời gian thực ---
    if (affectedUser) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: affectedUser._id,
            receiverRole: affectedUser.role,
            type: 'salary_adjustment_deleted',
            message: `Một điều chỉnh lương của bạn (${adjustment.type === 'bonus' ? 'Thưởng' : 'Trừ lương'}): "${adjustment.reason}" đã bị xóa bởi ${req.user.name}.`,
            entityId: adjustment._id,
            relatedDate: adjustment.effectiveDate,
        });
        console.log(`[salaryController] Emitted 'salary_adjustment_deleted' to user ${affectedUser._id}`);
    }
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({ success: true, message: 'Đã xóa điều chỉnh lương thành công.' });
});


const bulkDeleteSalaryAdjustments = asyncHandler(async (req, res) => {
    const { ids } = req.body; 

    console.log("BACKEND TRACE (bulkDeleteSalaryAdjustments): Received IDs for deletion:", ids);

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('Vui lòng cung cấp một mảng các ID để xóa.');
    }

    try {
        // Tìm các điều chỉnh trước khi xóa để lấy thông tin người dùng bị ảnh hưởng
        const adjustmentsToDelete = await SalaryAdjustment.find({ _id: { $in: ids } });
        const affectedUserIds = [...new Set(adjustmentsToDelete.map(adj => adj.user.toString()))]; // Lấy các ID người dùng duy nhất

        const result = await SalaryAdjustment.deleteMany({ _id: { $in: ids } });

        console.log("BACKEND TRACE (bulkDeleteSalaryAdjustments): Delete result:", result);

        if (result.deletedCount > 0) {
            // --- Logic Thông báo theo thời gian thực ---
            // Thông báo cho từng người dùng bị ảnh hưởng
            for (const userId of affectedUserIds) {
                const affectedUser = await User.findById(userId);
                if (affectedUser) {
                    await createNotification({
                        io: req.io,
                        sender: req.user._id,
                        senderName: req.user.name,
                        receiver: affectedUser._id,
                        receiverRole: affectedUser.role,
                        type: 'salary_adjustment_deleted',
                        message: `Một số điều chỉnh lương của bạn đã bị xóa bởi ${req.user.name}. Vui lòng kiểm tra lại mục Lương & Thưởng.`,
                        entityId: null, 
                        relatedDate: new Date().toISOString().split('T')[0],
                    });
                    console.log(`[salaryController] Emitted 'salary_adjustment_deleted' (bulk) to user ${affectedUser._id}`);
                }
            }
            // --- Kết thúc Logic Thông báo ---

            res.status(200).json({ success: true, message: `Đã xóa ${result.deletedCount} điều chỉnh lương thành công.` });
        } else {
            res.status(404);
            throw new Error('Không tìm thấy điều chỉnh lương nào để xóa.');
        }
    } catch (error) {
        console.error("BACKEND ERROR (bulkDeleteSalaryAdjustments): Error during bulk deletion:", error);
        throw error;
    }
});


export {
    setBaseSalary,
    addSalaryAdjustment,
    getMonthlySalaryDetails,
    getAnnualSalaryDetails,
    getAllSalaryAdjustments,
    deleteSalaryAdjustment,
    bulkDeleteSalaryAdjustments, 
};
