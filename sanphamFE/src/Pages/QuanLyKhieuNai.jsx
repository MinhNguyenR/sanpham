// frontend/src/Pages/QuanLyKhieuNai.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Tag, Modal, Input } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; // Import moment for date formatting

const { TextArea } = Input;

const QuanLyKhieuNai = () => {
    const { user, loading: authLoading } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loadingComplaints, setLoadingComplaints] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [currentComplaintToResolve, setCurrentComplaintToResolve] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');

    const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo đúng URL API

    // Hàm lấy tất cả khiếu nại cho Admin (có thể lọc theo ngày)
    const fetchAllComplaints = async (date) => {
        if (!user || user.role !== 'admin') {
            setLoadingComplaints(false);
            return;
        }

        setLoadingComplaints(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem dữ liệu khiếu nại.');
            setLoadingComplaints(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/complaints/admin?date=${date}`, config);
            setComplaints(res.data);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu khiếu nại Admin:', error);
            message.error(error.response?.data?.message || 'Không thể tải dữ liệu khiếu nại Admin.');
        } finally {
            setLoadingComplaints(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAllComplaints(selectedDate);
        }
    }, [user, authLoading, selectedDate]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const showResolveModal = (record) => {
        setCurrentComplaintToResolve(record);
        setAdminNotes(record.adminNotes || ''); // Giữ lại ghi chú cũ nếu có
        setIsResolveModalOpen(true);
    };

    const handleResolveComplaint = async () => {
        if (!currentComplaintToResolve) return;

        setLoadingComplaints(true); // Dùng loadingComplaints cho thao tác này
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingComplaints(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.put(
                `${API_URL}/complaints/${currentComplaintToResolve._id}/status`,
                { status: 'resolved', adminNotes: adminNotes },
                config
            );
            message.success(res.data.message);
            setIsResolveModalOpen(false);
            setAdminNotes('');
            setCurrentComplaintToResolve(null);
            fetchAllComplaints(selectedDate); // Cập nhật lại dữ liệu
        } catch (error) {
            console.error('Lỗi khi giải quyết khiếu nại:', error);
            message.error(error.response?.data?.message || 'Giải quyết khiếu nại thất bại.');
        } finally {
            setLoadingComplaints(false);
        }
    };

    const handleCancelResolveModal = () => {
        setIsResolveModalOpen(false);
        setAdminNotes('');
        setCurrentComplaintToResolve(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved':
                return 'green';
            case 'pending':
            default:
                return 'blue';
        }
    };

    const columns = [
        {
            title: 'Người gửi',
            dataIndex: 'name',
            key: 'name',
            width: 150, // Thêm chiều rộng cố định
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
        },
        {
            title: 'Chủ đề',
            dataIndex: 'subject',
            key: 'subject',
            width: 180,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true, // Giúp nội dung dài không bị tràn
            width: 250,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'pending' ? 'Đang chờ giải quyết' : 'Đã giải quyết'}
                </Tag>
            ),
            width: 150, // Điều chỉnh chiều rộng cho cột trạng thái
        },
        {
            title: 'Ghi chú của Admin',
            dataIndex: 'adminNotes',
            key: 'adminNotes',
            render: (text) => text || 'N/A',
            ellipsis: true,
            width: 200,
        },
        {
            title: 'Admin xử lý',
            dataIndex: ['resolvedBy', 'name'], // Lấy tên admin từ populate
            key: 'resolvedBy',
            render: (text) => text || 'Chưa có',
            width: 150,
        },
        {
            title: 'Thời gian gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 180,
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (text, record) => (
                record.status === 'pending' ? (
                    <Button
                        type="primary"
                        onClick={() => showResolveModal(record)}
                        className="bg-blue-500 hover:bg-blue-600 rounded-lg"
                    >
                        Giải quyết
                    </Button>
                ) : (
                    <Tag color="green">Đã xử lý</Tag>
                )
            ),
            width: 120, // Chiều rộng cho cột hành động
            fixed: 'right', // Cố định cột hành động ở bên phải
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
                        Quản Lý Khiếu Nại
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                    </p>
                </div>

                <div className="w-full max-w-6xl mt-12 bg-white p-8 rounded-lg shadow-xl">
                    <div className="mb-6 flex items-center justify-center">
                        <label htmlFor="complaintDate" className="mr-4 text-lg font-medium text-gray-700">Lọc theo ngày gửi:</label>
                        <input
                            type="date"
                            id="complaintDate"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {loadingComplaints ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải dữ liệu khiếu nại..." />
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={complaints}
                            rowKey="_id"
                            pagination={{ pageSize: 10 }}
                            className="shadow-md rounded-lg overflow-hidden"
                            scroll={{ x: 'max-content' }} // Thêm thuộc tính này để bật cuộn ngang
                        />
                    )}
                </div>

                <Modal
                    title="Giải quyết Khiếu nại"
                    open={isResolveModalOpen}
                    onOk={handleResolveComplaint}
                    onCancel={handleCancelResolveModal}
                    okText="Xác nhận giải quyết"
                    cancelText="Hủy"
                >
                    {currentComplaintToResolve && (
                        <>
                            <p>Bạn đang giải quyết khiếu nại của: <strong>{currentComplaintToResolve.name}</strong></p>
                            <p>Chủ đề: <strong>{currentComplaintToResolve.subject}</strong></p>
                            <p>Mô tả: {currentComplaintToResolve.description}</p>
                            <TextArea
                                rows={4}
                                placeholder="Nhập ghi chú của Admin (lý do giải quyết)"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                className="mt-4"
                            />
                        </>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyKhieuNai;
