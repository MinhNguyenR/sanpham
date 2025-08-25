import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin, Table, Tag, Card, Typography, Button } from 'antd';
import { Clock, Eye } from 'lucide-react'; 
import axios from 'axios';
import { format, isBefore, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

const { Title, Text } = Typography;

const API_URL = 'http://localhost:5000/api/auth';

const HopDongSapHetHan = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [expiringContracts, setExpiringContracts] = useState([]);

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
            // navigate('/'); // Thêm navigate từ react-router-dom nếu cần
        }
    }, [authLoading, isAdmin]);

    const fetchExpiringContracts = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/contracts/expiring-soon`, config);
            setExpiringContracts(res.data.contracts);
        } catch (error) {
            message.error('Lỗi khi tải danh sách hợp đồng sắp hết hạn.');
            setExpiringContracts([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);


    useEffect(() => {
        if (isAdmin && !authLoading) {
            fetchExpiringContracts();
        }
    }, [isAdmin, authLoading, fetchExpiringContracts]);


    const columns = [
        {
            title: 'Mã HĐ',
            dataIndex: 'contractCode',
            key: 'contractCode',
            width: 50,
            sorter: (a, b) => a.contractCode.localeCompare(b.contractCode),
        },
        {
            title: 'Nhân viên',
            dataIndex: ['user', 'name'],
            key: 'userName',
            width: 150,
            render: (text, record) => record.user ? `${record.user.name} (${record.user.email})` : 'N/A',
            sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''),
        },
        {
            title: 'Loại HĐ',
            dataIndex: 'contractType',
            key: 'contractType',
            render: (type) => {
                const typeMap = {
                    'probationary': 'Thử việc',
                    'official': 'Chính thức',
                    'collaborator': 'Cộng tác viên',
                    'seasonal': 'Thời vụ',
                    'internship': 'Thực tập',
                    'other': 'Khác',
                };
                return <Tag color="blue" className="rounded-full">{typeMap[type] || type}</Tag>;
            },
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date) => date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
            sorter: (a, b) => new Date(a.startDate) - new Date(b.startDate),
        },
        { title: 'Thời hạn', dataIndex: 'duration', key: 'duration' },
        {
            title: 'Lương',
            dataIndex: 'salary',
            key: 'salary',
            render: (salary) => salary ? `${salary.toLocaleString('vi-VN')} VND` : 'N/A',
            sorter: (a, b) => a.salary - b.salary,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const statusMap = {
                    'active': 'Còn hiệu lực',
                    'expired': 'Đã hết hạn',
                    'terminated': 'Đã chấm dứt',
                    'pending': 'Đang chờ',
                    'renewed': 'Đã gia hạn',
                };
                const colorMap = {
                    'active': 'green',
                    'expired': 'red',
                    'terminated': 'volcano',
                    'pending': 'gold',
                    'renewed': 'geekblue',
                };
                return <Tag color={colorMap[status] || 'default'} className="rounded-full">{statusMap[status] || status}</Tag>;
            },
            filters: Object.keys({
                'active': 'Còn hiệu lực',
                'expired': 'Đã hết hạn',
                'terminated': 'Đã chấm dứt',
                'pending': 'Đang chờ',
                'renewed': 'Đã gia hạn',
            }).map(key => ({ text: key, value: key })),
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Còn lại',
            key: 'remainingDays',
            render: (_, record) => {
                if (!record.endDate) return 'Vô thời hạn';
                const today = new Date();
                const endDate = new Date(record.endDate);
                if (isBefore(endDate, today)) {
                    return <Tag color="red" className="rounded-full">Đã hết hạn</Tag>;
                }
                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let color = "geekblue";
                if (diffDays <= 30) {
                    color = "orange";
                } else if (diffDays <= 90) {
                    color = "gold";
                }

                return <Tag color={color} className="rounded-full">{diffDays} ngày</Tag>;
            },
            sorter: (a, b) => {
                const daysA = a.endDate ? Math.ceil((new Date(a.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : Infinity;
                const daysB = b.endDate ? Math.ceil((new Date(b.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : Infinity;
                return daysA - daysB;
            },
        },
    ];

    if (authLoading || loading) {
        return <Spin tip="Đang tải dữ liệu hợp đồng sắp hết hạn..." size="large" className="flex justify-center items-center h-screen" />;
    }

    if (!isAdmin) {
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
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-red-700 !font-bold drop-shadow-sm mb-2">
                        Hợp đồng sắp hết hạn
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Chào mừng <span className="text-red-600 font-bold">{user.name}</span>! Quản lý các hợp đồng cần chú ý.
                    </Text>
                </div>

                <Card
                    className="w-full max-w-7xl shadow-xl rounded-2xl bg-white/95 p-8"
                    bordered={false}
                    title={<span className="flex items-center text-xl font-semibold text-gray-800"><Clock size={20} className="mr-2" /> Danh sách Hợp đồng Sắp hết hạn</span>}
                >
                    <Table
                        columns={columns}
                        dataSource={expiringContracts}
                        rowKey="_id"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        className="rounded-xl overflow-hidden shadow-lg"
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            </div>
        </SBNV>
    );
};

export default HopDongSapHetHan;