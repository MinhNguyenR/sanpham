// frontend/src/Pages/ChamCong.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Tag } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ChamCong = () => {
    const { user, loading: authLoading } = useAuth();
    const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
    const [loadingCheckIn, setLoadingCheckIn] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [userSearchDate, setUserSearchDate] = useState(format(new Date(), 'yyyy-MM-dd')); // State cho ngày tìm kiếm của người dùng

    const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo đúng URL API

    // Hàm kiểm tra trạng thái chấm công của người dùng hiện tại và lấy lịch sử theo ngày
    const checkUserCheckInStatus = async (dateToFetch = null) => {
        if (!user) return; // Đảm bảo user đã được load

        setLoadingAttendance(true); // Bắt đầu tải lịch sử
        const token = localStorage.getItem('token');
        if (!token) {
            setLoadingAttendance(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/attendance/me`, config);

            // Cập nhật trạng thái chấm công hôm nay
            const today = format(new Date(), 'yyyy-MM-dd');
            const checkedInToday = res.data.some(record =>
                record.checkInTime && new Date(record.checkInTime).toString() !== 'Invalid Date' &&
                format(new Date(record.checkInTime), 'yyyy-MM-dd') === today
            );
            setHasCheckedInToday(checkedInToday);

            // Lọc lịch sử chấm công theo ngày tìm kiếm nếu có
            const filteredRecords = dateToFetch
                ? res.data.filter(record =>
                    record.checkInTime && new Date(record.checkInTime).toString() !== 'Invalid Date' &&
                    format(new Date(record.checkInTime), 'yyyy-MM-dd') === dateToFetch
                )
                : res.data; // Nếu không có ngày tìm kiếm, hiển thị tất cả

            setAttendanceRecords(filteredRecords); // Cập nhật lịch sử chấm công của user
        } catch (error) {
            console.error('Lỗi khi kiểm tra trạng thái chấm công:', error);
            message.error('Không thể tải trạng thái chấm công.');
        } finally {
            setLoadingAttendance(false); // Kết thúc tải lịch sử
        }
    };

    useEffect(() => {
        if (!authLoading) {
            checkUserCheckInStatus(userSearchDate); // Gọi với ngày tìm kiếm ban đầu
        }
    }, [user, authLoading, userSearchDate]); // Thêm userSearchDate vào dependency array

    const handleCheckIn = async () => {
        setLoadingCheckIn(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để chấm công.');
            setLoadingCheckIn(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.post(`${API_URL}/attendance/check-in`, {}, config);
            message.success(res.data.message);
            setHasCheckedInToday(true);
            checkUserCheckInStatus(userSearchDate); // Cập nhật lại trạng thái và lịch sử với ngày tìm kiếm hiện tại
        } catch (error) {
            console.error('Lỗi khi chấm công:', error);
            message.error(error.response?.data?.message || 'Chấm công thất bại.');
        } finally {
            setLoadingCheckIn(false);
        }
    };

    const handleUserSearchDateChange = (e) => {
        setUserSearchDate(e.target.value);
    };

    const userColumns = [
        {
            title: 'Ngày',
            dataIndex: 'checkInTime',
            key: 'date',
            render: (text) => text && new Date(text).toString() !== 'Invalid Date' ? format(new Date(text), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
        },
        {
            title: 'Thời gian chấm công',
            dataIndex: 'checkInTime',
            key: 'time',
            render: (text) => text && new Date(text).toString() !== 'Invalid Date' ? format(new Date(text), 'HH:mm:ss', { locale: vi }) : 'N/A',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isLeave',
            key: 'status',
            render: (isLeave) => (
                <Tag color={isLeave ? 'red' : 'green'}>
                    {isLeave ? 'Nghỉ phép' : 'Đã chấm công'}
                </Tag>
            ),
        },
        {
            title: 'Lý do nghỉ phép',
            dataIndex: 'leaveReason',
            key: 'leaveReason',
            render: (text) => text || 'N/A',
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

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] mb-4">
                        Trang Chấm Công
                    </h1>
                    {user && (
                        <p className="text-xl text-gray-700">
                            Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                        </p>
                    )}
                </div>

                <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-xl w-full max-w-md mb-12">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6">Chấm Công Hôm Nay</h2>
                    {hasCheckedInToday ? (
                        <div className="text-center">
                            <p className="text-green-600 text-lg font-medium mb-4">Bạn đã chấm công cho ngày hôm nay rồi!</p>
                            <p className="text-gray-600">Thời gian chấm công gần nhất: {attendanceRecords.length > 0 && attendanceRecords[0].checkInTime && new Date(attendanceRecords[0].checkInTime).toString() !== 'Invalid Date' ? format(new Date(attendanceRecords[0].checkInTime), 'HH:mm:ss dd/MM/yyyy', { locale: vi }) : 'N/A'}</p>
                        </div>
                    ) : (
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleCheckIn}
                            loading={loadingCheckIn}
                            className="w-48 h-48 rounded-full text-3xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105
                                bg-gradient-to-r from-blue-500 to-blue-700 border-none text-white
                                flex items-center justify-center"
                        >
                            {loadingCheckIn ? <Spin /> : 'Chấm Công'}
                        </Button>
                    )}
                </div>

                {/* Lịch sử chấm công của người dùng hiện tại */}
                {user && (
                    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl">
                        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Lịch Sử Chấm Công Của Bạn</h2>
                        <div className="mb-6 flex items-center justify-center">
                            <label htmlFor="userSearchDate" className="mr-4 text-lg font-medium text-gray-700">Tìm theo ngày:</label>
                            <input
                                type="date"
                                id="userSearchDate"
                                value={userSearchDate}
                                onChange={handleUserSearchDateChange}
                                className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {loadingAttendance ? (
                            <div className="flex items-center justify-center py-8">
                                <Spin size="large" tip="Đang tải lịch sử chấm công..." />
                            </div>
                        ) : (
                            <Table
                                columns={userColumns}
                                dataSource={attendanceRecords}
                                rowKey="_id"
                                pagination={{ pageSize: 5 }}
                                className="shadow-md rounded-lg overflow-hidden"
                            />
                        )}
                    </div>
                )}
            </div>
        </SBNV>
    );
};

export default ChamCong;
