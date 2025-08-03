// frontend/src/Pages/QLChamCong.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Tag, Modal, Input } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const QLChamCong = () => {
    const { user, loading: authLoading } = useAuth();
    const [adminAttendanceData, setAdminAttendanceData] = useState({
        checkedInUsers: [],
        onLeaveUsers: [],
        notCheckedInAndNotOnLeaveUsers: [],
        totalUsers: 0,
        totalCheckedIn: 0,
        totalOnLeave: 0,
        totalNotCheckedInAndNotOnLeave: 0,
    });
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [currentRecordToUpdate, setCurrentRecordToUpdate] = useState(null); // Dùng cho cả đánh dấu và hủy nghỉ phép
    const [leaveReason, setLeaveReason] = useState('');
    const [isMarkingNewLeave, setIsMarkingNewLeave] = useState(false); // Để phân biệt đánh dấu mới hay cập nhật

    const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo đúng URL API

    // Hàm lấy dữ liệu chấm công cho Admin (chỉ còn lọc theo ngày)
    const fetchAdminAttendanceData = async (date) => {
        if (!user || user.role !== 'admin') {
            setLoadingAttendance(false);
            return;
        }

        setLoadingAttendance(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem dữ liệu.');
            setLoadingAttendance(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            // URL chỉ còn lọc theo ngày
            const url = `${API_URL}/attendance/admin?date=${date}`;

            const res = await axios.get(url, config);
            setAdminAttendanceData({
                checkedInUsers: res.data.checkedInUsers || [],
                onLeaveUsers: res.data.onLeaveUsers || [],
                notCheckedInAndNotOnLeaveUsers: res.data.notCheckedInAndNotOnLeaveUsers || [],
                totalUsers: res.data.totalUsers || 0,
                totalCheckedIn: res.data.totalCheckedIn || 0,
                totalOnLeave: res.data.totalOnLeave || 0,
                totalNotCheckedInAndNotOnLeave: res.data.totalNotCheckedInAndNotOnLeave || 0,
            });
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu chấm công Admin:', error);
            message.error(error.response?.data?.message || 'Không thể tải dữ liệu chấm công Admin.');
        } finally {
            setLoadingAttendance(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAdminAttendanceData(selectedDate);
        }
    }, [user, authLoading, selectedDate]); // Bỏ searchQuery và searchType khỏi dependency array

    const handleActionLeave = async () => {
        // Thêm kiểm tra phòng thủ ở đây
        if (!currentRecordToUpdate) {
            message.error('Không có bản ghi nào được chọn để xử lý.');
            setIsLeaveModalOpen(false);
            return;
        }

        setLoadingAttendance(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingAttendance(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };

            if (isMarkingNewLeave) {
                // Đánh dấu nghỉ phép cho người chưa chấm công
                const res = await axios.post(
                    `${API_URL}/attendance/mark-leave`,
                    {
                        userId: currentRecordToUpdate._id,
                        date: selectedDate,
                        leaveReason: leaveReason,
                    },
                    config
                );
                message.success(res.data.message);
            } else {
                // Cập nhật trạng thái nghỉ phép (hủy nghỉ phép)
                const res = await axios.put(
                    `${API_URL}/attendance/${currentRecordToUpdate._id}/leave`,
                    { isLeave: !currentRecordToUpdate.isLeave, leaveReason: leaveReason },
                    config
                );
                message.success(res.data.message);
            }

            setIsLeaveModalOpen(false);
            setLeaveReason('');
            setCurrentRecordToUpdate(null);
            setIsMarkingNewLeave(false);
            fetchAdminAttendanceData(selectedDate); // Cập nhật lại dữ liệu admin
        } catch (error) {
            console.error('Lỗi khi thực hiện thao tác nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Thao tác thất bại.');
        } finally {
            setLoadingAttendance(false);
        }
    };

    const showMarkLeaveModal = (record) => {
        setCurrentRecordToUpdate(record);
        setLeaveReason(''); // Luôn reset lý do khi đánh dấu mới
        setIsMarkingNewLeave(true);
        setIsLeaveModalOpen(true);
    };

    const showUnmarkLeaveModal = (record) => {
        setCurrentRecordToUpdate(record);
        setLeaveReason(record.leaveReason || ''); // Giữ lại lý do cũ nếu có
        setIsMarkingNewLeave(false);
        setIsLeaveModalOpen(true);
    };

    const handleCancelLeaveModal = () => {
        setIsLeaveModalOpen(false);
        setLeaveReason('');
        setCurrentRecordToUpdate(null);
        setIsMarkingNewLeave(false);
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    // Cập nhật commonAttendanceColumns để truy cập thuộc tính lồng
    const commonAttendanceColumns = [
        {
            title: 'Tên',
            dataIndex: ['user', 'name'], // Thay đổi để truy cập user.name
            key: 'name',
            render: (text, record) => record.user?.name || 'N/A' // Fallback nếu user null
        },
        {
            title: 'Email',
            dataIndex: ['user', 'email'], // Thay đổi để truy cập user.email
            key: 'email',
            render: (text, record) => record.user?.email || 'N/A' // Fallback nếu user null
        },
        {
            title: 'Vai trò',
            dataIndex: ['user', 'role'], // Thay đổi để truy cập user.role
            key: 'role',
            render: (text, record) => record.user?.role || 'N/A' // Fallback nếu user null
        },
    ];

    const checkedInColumns = [
        ...commonAttendanceColumns,
        {
            title: 'Thời gian chấm công',
            dataIndex: 'checkInTime',
            key: 'checkInTime',
            render: (text) => text && new Date(text).toString() !== 'Invalid Date' ? format(new Date(text), 'HH:mm:ss dd/MM/yyyy', { locale: vi }) : 'N/A',
        },
    ];

    const onLeaveColumns = [
        ...commonAttendanceColumns,
        {
            title: 'Ngày nghỉ phép', // Cột mới để hiển thị ngày nghỉ phép
            dataIndex: 'checkInTime', // Sử dụng checkInTime vì backend đặt nó là ngày nghỉ phép
            key: 'leaveDate',
            render: (text) => text && new Date(text).toString() !== 'Invalid Date' ? format(new Date(text), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
        },
        {
            title: 'Lý do nghỉ phép',
            dataIndex: 'leaveReason',
            key: 'leaveReason',
            render: (text) => text || 'N/A',
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="link"
                    onClick={() => showUnmarkLeaveModal(record)}
                >
                    Hủy nghỉ phép
                </Button>
            ),
        },
    ];

    // notCheckedInColumns vẫn truy cập trực tiếp vì adminAttendanceData.notCheckedInAndNotOnLeaveUsers là mảng User objects
    const notCheckedInColumns = [
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="link"
                    onClick={() => showMarkLeaveModal(record)}
                >
                    Đánh dấu nghỉ phép
                </Button>
            ),
        },
    ];

    if (authLoading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    if (!user || user.role !== 'admin') {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn không có quyền truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] mb-4">
                        Quản Lý Chấm Công
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                    </p>
                </div>

                <div className="w-full max-w-4xl mt-12 bg-white p-8 rounded-lg shadow-xl">
                    <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
                        <label htmlFor="attendanceDate" className="text-lg font-medium text-gray-700">Chọn ngày:</label>
                        <input
                            type="date"
                            id="attendanceDate"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {loadingAttendance ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải dữ liệu chấm công..." />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
                                <div className="p-4 bg-blue-100 rounded-lg shadow-md">
                                    <p className="text-lg font-medium text-blue-700">Tổng số người dùng</p>
                                    <p className="text-4xl font-bold text-blue-900">{adminAttendanceData.totalUsers}</p>
                                </div>
                                <div className="p-4 bg-green-100 rounded-lg shadow-md">
                                    <p className="text-lg font-medium text-green-700">Đã chấm công</p>
                                    <p className="text-4xl font-bold text-green-900">{adminAttendanceData.totalCheckedIn}</p>
                                </div>
                                <div className="p-4 bg-red-100 rounded-lg shadow-md">
                                    <p className="text-lg font-medium text-red-700">Chưa chấm công</p>
                                    <p className="text-4xl font-bold text-red-900">{adminAttendanceData.totalNotCheckedInAndNotOnLeave}</p>
                                </div>
                                <div className="p-4 bg-yellow-100 rounded-lg shadow-md">
                                    <p className="text-lg font-medium text-yellow-700">Nghỉ phép</p>
                                    <p className="text-4xl font-bold text-yellow-900">
                                        {adminAttendanceData.totalOnLeave}
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Người đã chấm công ({adminAttendanceData.checkedInUsers.length})</h3>
                            <Table
                                columns={checkedInColumns}
                                dataSource={adminAttendanceData.checkedInUsers}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="mb-8 shadow-md rounded-lg overflow-hidden"
                            />

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Người nghỉ phép ({adminAttendanceData.onLeaveUsers.length})</h3>
                            <Table
                                columns={onLeaveColumns}
                                dataSource={adminAttendanceData.onLeaveUsers}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="mb-8 shadow-md rounded-lg overflow-hidden"
                            />

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Người chưa chấm công ({adminAttendanceData.notCheckedInAndNotOnLeaveUsers.length})</h3>
                            <Table
                                columns={notCheckedInColumns}
                                dataSource={adminAttendanceData.notCheckedInAndNotOnLeaveUsers}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="shadow-md rounded-lg overflow-hidden"
                            />
                        </>
                    )}
                </div>

                <Modal
                    title={isMarkingNewLeave ? "Đánh Dấu Nghỉ Phép" : "Hủy Đánh Dấu Nghỉ Phép"}
                    open={isLeaveModalOpen}
                    onOk={handleActionLeave}
                    onCancel={handleCancelLeaveModal}
                    okText={isMarkingNewLeave ? "Xác nhận đánh dấu" : "Xác nhận hủy"}
                    cancelText="Hủy"
                >
                    {isMarkingNewLeave ? (
                        <>
                            <p>Bạn có muốn đánh dấu **{currentRecordToUpdate?.name}** là nghỉ phép vào ngày **{format(new Date(selectedDate), 'dd/MM/yyyy')}** không?</p>
                            <Input
                                placeholder="Nhập lý do nghỉ phép (tùy chọn)"
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                className="mt-4"
                            />
                        </>
                    ) : (
                        <>
                            <p>Bạn có chắc muốn hủy đánh dấu nghỉ phép cho **{currentRecordToUpdate?.name}** vào ngày **{currentRecordToUpdate?.checkInTime && new Date(currentRecordToUpdate?.checkInTime).toString() !== 'Invalid Date' ? format(new Date(currentRecordToUpdate?.checkInTime), 'dd/MM/yyyy') : 'N/A'}** không?</p>
                            {currentRecordToUpdate?.leaveReason && (
                                <p className="text-sm text-gray-600 mt-2">Lý do hiện tại: {currentRecordToUpdate.leaveReason}</p>
                            )}
                        </>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default QLChamCong;
