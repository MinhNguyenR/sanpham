import asyncHandler from 'express-async-handler';
import Contract from '../models/Contract.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js'; 
import { format, addMonths, isBefore } from 'date-fns'; 


const createContract = asyncHandler(async (req, res) => {
    const { user: userId, contractType, contractCode, startDate, endDate, salary, position, description, fileUrl, status } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!userId || !contractType || !contractCode || !startDate || !salary || !position) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc: Nhân viên, Loại hợp đồng, Mã hợp đồng, Ngày bắt đầu, Lương, Chức vụ.');
    }

    // Kiểm tra xem nhân viên có tồn tại không
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên được chỉ định cho hợp đồng này.');
    }

    // Kiểm tra mã hợp đồng đã tồn tại chưa
    const contractExists = await Contract.findOne({ contractCode });
    if (contractExists) {
        res.status(400);
        throw new Error('Mã hợp đồng đã tồn tại. Vui lòng sử dụng mã khác.');
    }

    // Tính toán thời hạn hợp đồng
    let duration = 'Không thời hạn';
    if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (diffMonths > 0) {
            duration = `${diffMonths} tháng`;
        } else {
            duration = 'Dưới 1 tháng';
        }
    }

    const contract = await Contract.create({
        user: userId,
        contractType,
        contractCode,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        duration,
        salary,
        position,
        description: description || '',
        fileUrl: fileUrl || null,
        status: status || 'active',
        createdBy: req.user._id, // Người tạo là admin hiện tại
    });

    // Populate lại hợp đồng để có thông tin người dùng đầy đủ cho thông báo
    const populatedContract = await Contract.findById(contract._id)
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email position');

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho nhân viên liên quan về hợp đồng mới của họ
    await createNotification({
        io: req.io,
        sender: req.user._id,
        senderName: req.user.name,
        receiver: populatedContract.user._id,
        receiverRole: populatedContract.user.role,
        type: 'new_contract',
        message: `Hợp đồng mới (${populatedContract.contractCode}) của bạn đã được tạo bởi ${req.user.name}.`,
        entityId: populatedContract._id,
        relatedDate: populatedContract.createdAt,
        data: populatedContract, 
    });

    // Thông báo cho tất cả Admin về hợp đồng mới
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        if (admin._id.toString() !== req.user._id.toString()) { 
            await createNotification({
                io: req.io,
                sender: req.user._id,
                senderName: req.user.name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'new_contract',
                message: `Admin ${req.user.name} đã tạo hợp đồng mới (${populatedContract.contractCode}) cho ${populatedContract.user.name}.`,
                entityId: populatedContract._id,
                relatedDate: populatedContract.createdAt,
                data: populatedContract, 
            });
        }
    }
    console.log(`[contractController] Emitted 'new_contract' notifications.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo hợp đồng thành công.',
        contract: populatedContract,
    });
});

const getAllContracts = asyncHandler(async (req, res) => {
    const contracts = await Contract.find({})
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email position')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: contracts.length,
        contracts,
    });
});

const getContractById = asyncHandler(async (req, res) => {
    const contract = await Contract.findById(req.params.id)
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email position');

    if (!contract) {
        res.status(404);
        throw new Error('Không tìm thấy hợp đồng.');
    }

    res.status(200).json({
        success: true,
        contract,
    });
});

const updateContract = asyncHandler(async (req, res) => {
    const { contractType, contractCode, startDate, endDate, salary, position, description, fileUrl, status } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
        res.status(404);
        throw new Error('Không tìm thấy hợp đồng.');
    }

    // Kiểm tra mã hợp đồng nếu có thay đổi và đã tồn tại
    if (contractCode && contractCode !== contract.contractCode) {
        const contractExists = await Contract.findOne({ contractCode });
        if (contractExists) {
            res.status(400);
            throw new Error('Mã hợp đồng đã tồn tại. Vui lòng sử dụng mã khác.');
        }
    }


    contract.contractType = contractType || contract.contractType;
    contract.contractCode = contractCode || contract.contractCode;
    contract.startDate = startDate ? new Date(startDate) : contract.startDate;
    contract.endDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : contract.endDate; 
    contract.salary = salary || contract.salary;
    contract.position = position || contract.position;
    contract.description = description !== undefined ? description : contract.description;
    contract.fileUrl = fileUrl !== undefined ? fileUrl : contract.fileUrl; 
    contract.status = status || contract.status;

    // Cập nhật lại thời hạn nếu ngày bắt đầu hoặc ngày kết thúc thay đổi
    if (startDate || endDate) {
        let duration = 'Không thời hạn';
        if (contract.endDate) {
            const start = new Date(contract.startDate);
            const end = new Date(contract.endDate);
            const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            if (diffMonths > 0) {
                duration = `${diffMonths} tháng`;
            } else {
                duration = 'Dưới 1 tháng';
            }
        }
        contract.duration = duration;
    }

    const updatedContract = await contract.save();

    // Populate lại hợp đồng để có thông tin người dùng đầy đủ cho thông báo
    const populatedUpdatedContract = await Contract.findById(updatedContract._id)
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email position');


    await createNotification({
        io: req.io,
        sender: req.user._id,
        senderName: req.user.name,
        receiver: populatedUpdatedContract.user._id,
        receiverRole: populatedUpdatedContract.user.role,
        type: 'contract_updated',
        message: `Hợp đồng (${populatedUpdatedContract.contractCode}) của bạn đã được cập nhật bởi Admin ${req.user.name}.`,
        entityId: populatedUpdatedContract._id,
        relatedDate: populatedUpdatedContract.updatedAt,
        data: populatedUpdatedContract, 
    });

    // Thông báo cho tất cả Admin về hợp đồng được cập nhật
    const admins = await User.find({ role: 'admin' }); 
    for (const admin of admins) {
        if (admin._id.toString() !== req.user._id.toString()) {
            await createNotification({
                io: req.io,
                sender: req.user._id,
                senderName: req.user.name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'contract_updated',
                message: `Admin ${req.user.name} đã cập nhật hợp đồng (${populatedUpdatedContract.contractCode}) cho ${populatedUpdatedContract.user.name}.`,
                entityId: populatedUpdatedContract._id,
                relatedDate: populatedUpdatedContract.updatedAt,
                data: populatedUpdatedContract,
            });
        }
    }
    console.log(`[contractController] Emitted 'contract_updated' notifications.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật hợp đồng thành công.',
        contract: populatedUpdatedContract,
    });
});


const deleteContract = asyncHandler(async (req, res) => {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
        res.status(404);
        throw new Error('Không tìm thấy hợp đồng.');
    }

    const contractCode = contract.contractCode;
    const contractId = contract._id;
    const contractUser = contract.user; // Lấy ID của người dùng liên quan

    await contract.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho nhân viên liên quan về hợp đồng bị xóa
    await createNotification({
        io: req.io,
        sender: req.user._id,
        senderName: req.user.name,
        receiver: contractUser, // Gửi thông báo cho người dùng có hợp đồng bị xóa
        receiverRole: 'user', 
        type: 'contract_deleted',
        message: `Hợp đồng (${contractCode}) của bạn đã bị Admin ${req.user.name} xóa.`,
        entityId: contractId,
        relatedDate: new Date().toISOString().split('T')[0],
        data: { _id: contractId, userId: contractUser }, // Truyền ID của đối tượng bị xóa và userId
    });

    // Thông báo cho tất cả Admin về hợp đồng bị xóa
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        if (admin._id.toString() !== req.user._id.toString()) {
            await createNotification({
                io: req.io,
                sender: req.user._id,
                senderName: req.user.name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'contract_deleted',
                message: `Admin ${req.user.name} đã xóa hợp đồng (${contractCode}) của nhân viên ${contractUser}.`,
                entityId: contractId,
                relatedDate: new Date().toISOString().split('T')[0],
                data: { _id: contractId, userId: contractUser }, 
            });
        }
    }
    console.log(`[contractController] Emitted 'contract_deleted' notifications.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa hợp đồng thành công.',
    });
});


const getUserContracts = asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    // Nếu người dùng hiện tại không phải admin và ID yêu cầu không phải của chính họ, từ chối
    if (req.user.role !== 'admin' && req.user._id.toString() !== targetUserId.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền xem hợp đồng của người dùng khác.');
    }

    const contracts = await Contract.find({ user: targetUserId })
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email')
        .sort({ startDate: -1 }); // Sắp xếp hợp đồng mới nhất lên đầu

    res.status(200).json({
        success: true,
        count: contracts.length,
        contracts,
    });
});


const getMyContracts = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Đảm bảo rằng userId không phải là undefined hoặc null
    if (!userId) {
        res.status(400);
        throw new Error('Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
    }

    const contracts = await Contract.find({ user: userId })
        .populate('user', 'name email position role')
        .populate('createdBy', 'name email')
        .sort({ startDate: -1 });



    res.status(200).json({
        success: true,
        count: contracts.length,
        contracts,
    });
});

const getContractsExpiringSoon = asyncHandler(async (req, res) => {
    const threeMonthsFromNow = addMonths(new Date(), 3);
    const today = new Date();

    const contracts = await Contract.find({
        endDate: { $ne: null, $gte: today, $lte: threeMonthsFromNow }, // Có ngày kết thúc, từ hôm nay đến 3 tháng tới
        status: 'active', // Chỉ những hợp đồng còn hiệu lực
    })
    .populate('user', 'name email position role')
    .sort({ endDate: 1 }); // Sắp xếp theo ngày hết hạn sớm nhất

    res.status(200).json({
        success: true,
        count: contracts.length,
        contracts,
    });
});


export {
    createContract,
    getAllContracts,
    getContractById,
    updateContract,
    deleteContract,
    getUserContracts,
    getMyContracts,
    getContractsExpiringSoon,
};
