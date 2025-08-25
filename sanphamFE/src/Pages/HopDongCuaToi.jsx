import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin, Table, Tag, Button, Card, Typography } from 'antd';
import { FileText, Download } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { Title, Text } = Typography;

const API_URL = 'http://localhost:5000/api/auth';

const HopDongCuaToi = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myContracts, setMyContracts] = useState([]);

    useEffect(() => {
        if (!authLoading && !user) {
            message.error("Bạn cần đăng nhập để xem trang này.");
            // navigate('/login'); // Thêm navigate từ react-router-dom nếu cần
        }
    }, [authLoading, user]);

    const fetchMyContracts = useCallback(async () => {
        if (!user || authLoading) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/contracts/me`, config);
            setMyContracts(res.data.contracts);
        } catch (error) {
            message.error('Lỗi khi tải danh sách hợp đồng của bạn.');
            console.error('ERROR: Lỗi khi tải hợp đồng cá nhân:', error.response ? error.response.data : error.message);
            setMyContracts([]);
        } finally {
            setLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (user && !authLoading) {
            fetchMyContracts();
        }
    }, [user, authLoading, fetchMyContracts]);

    const columns = [
        {
            title: 'Mã HĐ',
            dataIndex: 'contractCode',
            key: 'contractCode',
            sorter: (a, b) => a.contractCode.localeCompare(b.contractCode),
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
        {
            title: 'Ngày kết thúc',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : 'Không thời hạn',
            sorter: (a, b) => new Date(a.endDate) - new Date(b.endDate),
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
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'File Hợp đồng',
            dataIndex: 'fileUrl',
            key: 'fileUrl',
            render: (fileUrl) => (
                fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button icon={<Download size={16} />} type="primary" className="bg-blue-500 hover:bg-blue-600 rounded-lg">Tải xuống</Button>
                    </a>
                ) : 'Không có file'
            ),
        },
    ];

    if (authLoading || loading) {
        return <Spin tip="Đang tải dữ liệu hợp đồng của bạn..." size="large" className="flex justify-center items-center h-screen" />;
    }

    if (!user) {
        return (
            <SBNV>
                <div className="container mx-auto p-4 text-center text-red-500">
                    Bạn cần đăng nhập để xem trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-indigo-800 !font-bold drop-shadow-sm mb-2">
                        Hợp đồng của tôi
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Chào mừng <span className="text-indigo-600 font-bold">{user.name}</span>! Xem lại tất cả hợp đồng của bạn tại đây.
                    </Text>
                </div>

                <Card
                    className="w-full max-w-7xl shadow-xl rounded-2xl bg-white/95 p-8"
                    bordered={false}
                    title={<span className="flex items-center text-xl font-semibold text-gray-800"><FileText size={20} className="mr-2" /> Danh sách Hợp đồng</span>}
                >
                    <Table
                        columns={columns}
                        dataSource={myContracts}
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

export default HopDongCuaToi;