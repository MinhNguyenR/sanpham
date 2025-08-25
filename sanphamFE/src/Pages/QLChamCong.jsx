import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Input } from 'antd';
import { UserCheck, UserX, CalendarCheck, User, XCircle } from 'lucide-react';
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
    const [currentRecordToUpdate, setCurrentRecordToUpdate] = useState(null);
    const [leaveReason, setLeaveReason] = useState('');
    const [isMarkingNewLeave, setIsMarkingNewLeave] = useState(false); 

    const API_URL = 'http://localhost:5000/api/auth';

    const fetchAdminAttendanceData = useCallback(async (date) => {
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
    }, [user]);

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAdminAttendanceData(selectedDate);
        }
    }, [user, authLoading, selectedDate, fetchAdminAttendanceData]);

    const handleActionLeave = async () => {
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
                const res = await axios.put(
                    `${API_URL}/attendance/${currentRecordToUpdate._id}/leave`, 
                    {
                        isLeave: false,    
                        leaveReason: null 
                    },
                    config
                );
                message.success(res.data.message);
            }

            setIsLeaveModalOpen(false);
            setLeaveReason(''); 
            setCurrentRecordToUpdate(null);
            setIsMarkingNewLeave(false);
            fetchAdminAttendanceData(selectedDate);
        } catch (error) {
            console.error('Lỗi khi thực hiện thao tác nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Thao tác thất bại.');
        } finally {
            setLoadingAttendance(false);
        }
    };

    const showMarkLeaveModal = (record) => {
        setCurrentRecordToUpdate(record);
        setLeaveReason(''); 
        setIsMarkingNewLeave(true);
        setIsLeaveModalOpen(true);
    };

    const showUnmarkLeaveModal = (record) => {
        setCurrentRecordToUpdate(record);
        setLeaveReason(record.leaveReason || ''); 
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

    const commonAttendanceColumns = [
        {
            title: 'Tên',
            dataIndex: ['user', 'name'], 
            key: 'name',
            render: (text, record) => record.user?.name || 'N/A' 
        },
        {
            title: 'Email',
            dataIndex: ['user', 'email'], 
            key: 'email',
            render: (text, record) => record.user?.email || 'N/A' 
        },
        {
            title: 'Vai trò',
            dataIndex: ['user', 'role'], 
            key: 'role',
            render: (text, record) => record.user?.role || 'N/A' 
        },
        {
            title: 'Chức vụ',
            dataIndex: ['user', 'position'],
            key: 'position',
            render: (text, record) => record.user?.position || 'N/A'
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
            title: 'Ngày nghỉ phép', 
            dataIndex: 'date', 
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
                    className="text-red-500 hover:text-red-700"
                    onClick={() => showUnmarkLeaveModal(record)}
                >
                    Hủy nghỉ phép
                </Button>
            ),
        },
    ];

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
            title: 'Chức vụ',
            dataIndex: 'position',
            key: 'position',
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="link"
                    className="text-blue-500 hover:text-blue-700"
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
                <div className="flex items-center justify-center h-screen bg-gray-50">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    if (!user || user.role !== 'admin') {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-screen text-2xl text-red-600 bg-gray-50">
                    Bạn không có quyền truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="container mx-auto p-4 md:p-8 lg:p-12 bg-gray-100 min-h-screen font-sans">
                <div className="flex items-center justify-center text-center mb-10">
                    <div className="flex items-center justify-center p-3 rounded-full bg-blue-500 text-white shadow-lg mr-4">
                        <CalendarCheck size={40} />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800">
                        Quản Lý Chấm Công
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex items-center justify-center mb-6">
                        <label htmlFor="attendanceDate" className="text-lg font-medium text-gray-700 mr-4">Chọn ngày:</label>
                        <input
                            type="date"
                            id="attendanceDate"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        />
                    </div>

                    {loadingAttendance ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải dữ liệu chấm công..." />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
                                <div className="p-4 bg-blue-50 rounded-lg shadow-md flex flex-col items-center justify-center">
                                    <User size={32} className="text-blue-600 mb-2"/>
                                    <p className="text-sm font-medium text-blue-700">Tổng số người dùng</p>
                                    <p className="text-3xl font-bold text-blue-900">{adminAttendanceData.totalUsers}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg shadow-md flex flex-col items-center justify-center">
                                    <UserCheck size={32} className="text-green-600 mb-2"/>
                                    <p className="text-sm font-medium text-green-700">Đã chấm công</p>
                                    <p className="text-3xl font-bold text-green-900">{adminAttendanceData.totalCheckedIn}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg shadow-md flex flex-col items-center justify-center">
                                    <XCircle size={32} className="text-red-600 mb-2"/>
                                    <p className="text-sm font-medium text-red-700">Chưa chấm công</p>
                                    <p className="text-3xl font-bold text-red-900">{adminAttendanceData.totalNotCheckedInAndNotOnLeave}</p>
                                </div>
                                <div className="p-4 bg-yellow-50 rounded-lg shadow-md flex flex-col items-center justify-center">
                                    <UserX size={32} className="text-yellow-600 mb-2"/>
                                    <p className="text-sm font-medium text-yellow-700">Nghỉ phép</p>
                                    <p className="text-3xl font-bold text-yellow-900">
                                        {adminAttendanceData.totalOnLeave}
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Người đã chấm công ({adminAttendanceData.checkedInUsers.length})</h3>
                            <Table
                                columns={checkedInColumns}
                                dataSource={adminAttendanceData.checkedInUsers}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="mb-8 shadow-md rounded-lg overflow-hidden"
                            />

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Người nghỉ phép ({adminAttendanceData.onLeaveUsers.length})</h3>
                            <Table
                                columns={onLeaveColumns}
                                dataSource={adminAttendanceData.onLeaveUsers}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="mb-8 shadow-md rounded-lg overflow-hidden"
                            />

                            <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Người chưa chấm công ({adminAttendanceData.notCheckedInAndNotOnLeaveUsers.length})</h3>
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
                            <p>Bạn có muốn đánh dấu <span className="font-bold text-blue-600">{currentRecordToUpdate?.name}</span> là nghỉ phép vào ngày <span className="font-bold">{format(new Date(selectedDate), 'dd/MM/yyyy', { locale: vi })}</span> không?</p>
                            <Input
                                placeholder="Nhập lý do nghỉ phép (tùy chọn)"
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                className="mt-4"
                            />
                        </>
                    ) : (
                        <>
                            <p>Bạn có chắc muốn hủy đánh dấu nghỉ phép cho <span className="font-bold text-blue-600">{currentRecordToUpdate?.name}</span> không?</p>
                            {currentRecordToUpdate?.leaveReason && (
                                <p className="text-sm text-gray-600 mt-2">Lý do hiện tại: <span className="italic">{currentRecordToUpdate.leaveReason}</span></p>
                            )}
                        </>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default QLChamCong;
