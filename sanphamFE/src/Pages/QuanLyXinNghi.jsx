// frontend/src/Pages/QuanLyXinNghi.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Tag, Modal, Input, DatePicker } from 'antd'; // Import DatePicker
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment';

const { TextArea } = Input;

const QuanLyXinNghi = () => {
    const { user, loading: authLoading } = useAuth();
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    // Thay đổi selectedDate thành null ban đầu để hiển thị tất cả
    const [selectedDate, setSelectedDate] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [currentRequestToReview, setCurrentRequestToReview] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [reviewStatus, setReviewStatus] = useState(null); // 'approved' or 'rejected'

    const API_URL = 'http://localhost:5000/api/auth';

    // Hàm lấy tất cả yêu cầu nghỉ phép cho Admin (có thể lọc theo ngày)
    const fetchAllLeaveRequests = async (date = null) => { // Tham số date có thể là null
        if (!user || user.role !== 'admin') {
            setLoadingRequests(false);
            return;
        }

        setLoadingRequests(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem dữ liệu yêu cầu nghỉ phép.');
            setLoadingRequests(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            let url = `${API_URL}/leave-requests/admin`;
            if (date) {
                url += `?date=${format(new Date(date), 'yyyy-MM-dd')}`; // Định dạng lại ngày nếu có
            }

            const res = await axios.get(url, config);
            setLeaveRequests(res.data);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu yêu cầu nghỉ phép Admin:', error);
            message.error(error.response?.data?.message || 'Không thể tải dữ liệu yêu cầu nghỉ phép Admin.');
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAllLeaveRequests(selectedDate); // Gọi với selectedDate (có thể là null)
        }
    }, [user, authLoading, selectedDate]);

    // Xử lý thay đổi ngày từ DatePicker
    const handleDateChange = (date, dateString) => {
        // date là đối tượng moment, dateString là chuỗi 'YYYY-MM-DD'
        setSelectedDate(date); // Lưu đối tượng moment hoặc null
    };

    // Xử lý khi nhấn nút "Tìm kiếm"
    const handleSearchClick = () => {
        fetchAllLeaveRequests(selectedDate); // Gọi hàm fetch với ngày đã chọn
    };

    // Xử lý khi nhấn nút "Xem tất cả"
    const handleViewAllClick = () => {
        setSelectedDate(null); // Đặt lại ngày tìm kiếm về null
        // useEffect sẽ tự động gọi fetchAllLeaveRequests() mà không có filter ngày
    };

    const showReviewModal = (record, status) => {
        setCurrentRequestToReview(record);
        setAdminNotes(record.adminNotes || '');
        setReviewStatus(status);
        setIsReviewModalOpen(true);
    };

    const handleReviewRequest = async () => {
        if (!currentRequestToReview || !reviewStatus) return;

        setLoadingRequests(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingRequests(false);
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
                `${API_URL}/leave-requests/${currentRequestToReview._id}/status`,
                { status: reviewStatus, adminNotes: adminNotes },
                config
            );
            message.success(res.data.message);
            setIsReviewModalOpen(false);
            setAdminNotes('');
            setReviewStatus(null);
            setCurrentRequestToReview(null);
            fetchAllLeaveRequests(selectedDate); // Cập nhật lại dữ liệu với filter hiện tại
        } catch (error) {
            console.error('Lỗi khi xử lý yêu cầu nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Xử lý yêu cầu nghỉ phép thất bại.');
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleCancelReviewModal = () => {
        setIsReviewModalOpen(false);
        setAdminNotes('');
        setReviewStatus(null);
        setCurrentRequestToReview(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
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
            width: 150,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
        },
        {
            title: 'Ngày xin nghỉ',
            dataIndex: 'requestDate',
            key: 'requestDate',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
            width: 150,
        },
        {
            title: 'Lý do',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            width: 250,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'pending' ? 'Đang chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                </Tag>
            ),
            width: 150,
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
            dataIndex: ['reviewedBy', 'name'],
            key: 'reviewedBy',
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
                    <div className="flex space-x-2">
                        <Button
                            type="primary"
                            onClick={() => showReviewModal(record, 'approved')}
                            className="bg-green-500 hover:bg-green-600 rounded-lg"
                        >
                            Duyệt
                        </Button>
                        <Button
                            type="primary"
                            danger
                            onClick={() => showReviewModal(record, 'rejected')}
                            className="bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                            Từ chối
                        </Button>
                    </div>
                ) : (
                    <Tag color={getStatusColor(record.status)}>
                        {record.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                    </Tag>
                )
            ),
            width: 180,
            fixed: 'right',
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
                        Quản Lý Yêu Cầu Nghỉ Phép
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                    </p>
                </div>

                <div className="w-full max-w-6xl mt-12 bg-white p-8 rounded-lg shadow-xl">
                    <div className="mb-6 flex items-center justify-center gap-4">
                        <label htmlFor="leaveRequestDate" className="text-lg font-medium text-gray-700">Lọc theo ngày xin nghỉ:</label>
                        <DatePicker
                            format="DD/MM/YYYY"
                            value={selectedDate} // Giá trị là đối tượng moment hoặc null
                            onChange={handleDateChange}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                            type="primary"
                            onClick={handleSearchClick}
                            className="bg-blue-500 hover:bg-blue-600 rounded-lg"
                            disabled={!selectedDate} // Vô hiệu hóa nếu chưa chọn ngày
                        >
                            Tìm kiếm
                        </Button>
                        <Button
                            type="default"
                            onClick={handleViewAllClick}
                            className="rounded-lg border-slate-300 text-slate-600 hover:text-blue-500 hover:border-blue-400"
                        >
                            Xem tất cả
                        </Button>
                    </div>

                    {loadingRequests ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải dữ liệu yêu cầu nghỉ phép..." />
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={leaveRequests}
                            rowKey="_id"
                            pagination={{ pageSize: 10 }}
                            className="shadow-md rounded-lg overflow-hidden"
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </div>

                <Modal
                    title={reviewStatus === 'approved' ? "Duyệt Yêu Cầu Nghỉ Phép" : "Từ Chối Yêu Cầu Nghỉ Phép"}
                    open={isReviewModalOpen}
                    onOk={handleReviewRequest}
                    onCancel={handleCancelReviewModal}
                    okText={reviewStatus === 'approved' ? "Xác nhận duyệt" : "Xác nhận từ chối"}
                    cancelText="Hủy"
                >
                    {currentRequestToReview && (
                        <>
                            <p>Bạn đang xử lý yêu cầu nghỉ phép của: <strong>{currentRequestToReview.name}</strong></p>
                            <p>Ngày xin nghỉ: <strong>{format(new Date(currentRequestToReview.requestDate), 'dd/MM/yyyy', { locale: vi })}</strong></p>
                            <p>Lý do: {currentRequestToReview.reason}</p>
                            <TextArea
                                rows={4}
                                placeholder={reviewStatus === 'approved' ? "Nhập ghi chú của Admin (tùy chọn)" : "Nhập lý do từ chối"}
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

export default QuanLyXinNghi;
