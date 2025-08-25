import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Form, Input, Select, DatePicker, Popconfirm, Tag, Tabs, InputNumber, Radio, Checkbox } from 'antd'; // Thêm Checkbox
import { DollarSign, PlusCircle, Trash2, Edit2 } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; 

const { TabPane } = Tabs;
const { Option } = Select;


const API_URL = 'http://localhost:5000/api/auth';

const QuanLyLuongThuong = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [salaryAdjustments, setSalaryAdjustments] = useState([]);
    const [users, setUsers] = useState([]);
    const [isBaseSalaryModalVisible, setIsBaseSalaryModalVisible] = useState(false);
    const [isAdjustmentModalVisible, setIsAdjustmentModalVisible] = useState(false);
    const [isBulkAdjustmentModalVisible, setIsBulkAdjustmentModalVisible] = useState(false); 
    const [currentEditingUser, setCurrentEditingUser] = useState(null);
    const [selectedUserForView, setSelectedUserForView] = useState(null);
    const [monthlySalaryForSelectedUser, setMonthlySalaryForSelectedUser] = useState(null);
    const [annualSalaryForSelectedUser, setAnnualSalaryForSelectedUser] = useState(null);
    const [baseSalaryForm] = Form.useForm();
    const [adjustmentForm] = Form.useForm();
    const [bulkAdjustmentForm] = Form.useForm(); 
    const [viewUserSalaryForm] = Form.useForm();
    const [adjustmentSearchTerm, setAdjustmentSearchTerm] = useState('');
    const [adjustmentSelectedDate, setAdjustmentSelectedDate] = useState(null);
    const [userAdjustmentsFilterDate, setUserAdjustmentsFilterDate] = useState(null); 
    const [activeAdjustmentTab, setActiveAdjustmentTab] = useState('all'); 
    const [selectedAdjustmentRowKeys, setSelectedAdjustmentRowKeys] = useState([]); 

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
        }
    }, [authLoading, isAdmin]); 

    // --- Hàm tải dữ liệu ---
    const fetchAllUsers = useCallback(async () => {
        if (!isAdmin || authLoading) {
            return;
        }
        setLoading(true);
        console.log("TRACE: fetchAllUsers - Setting loading to true.");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data && Array.isArray(res.data.users)) {
                setUsers(res.data.users);
            } else if (res.data && Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                console.warn("TRACE: fetchAllUsers - API /users không trả về mảng users trong res.data:", res.data); 
                setUsers([]);
            }
        } catch (error) {
            message.error('Lỗi khi tải danh sách người dùng.');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchAllSalaryAdjustments = useCallback(async () => {
        if (!isAdmin || authLoading) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/salary/adjustments/all`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data && Array.isArray(res.data.adjustments)) {
                setSalaryAdjustments(res.data.adjustments);

            } else if (res.data && Array.isArray(res.data)) {
                setSalaryAdjustments(res.data);
            } else {
                setSalaryAdjustments([]);
            }
        } catch (error) {
            message.error('Lỗi khi tải các điều chỉnh lương.');
            setSalaryAdjustments([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchSalaryForSelectedUser = useCallback(async (userId) => {
        if (!isAdmin || !userId || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const now = new Date();
            const currentMonth = now.getMonth(); // Lấy tháng hiện tại (0-11)
            const currentYear = now.getFullYear(); // Lấy năm hiện tại

            const [monthlyRes, annualRes] = await Promise.all([
                axios.get(`${API_URL}/salary/monthly/${userId}?month=${currentMonth}&year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/salary/annual/${userId}?year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setMonthlySalaryForSelectedUser(monthlyRes.data);
            setAnnualSalaryForSelectedUser(annualRes.data);
        } catch (error) {
            message.error('Lỗi khi tải thông tin lương của người dùng đã chọn.');
            console.error('Error fetching selected user salary:', error);
            setMonthlySalaryForSelectedUser(null);
            setAnnualSalaryForSelectedUser(null);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const getFilteredAdjustments = (typeFilter = 'all') => {
        return salaryAdjustments.filter(adj => {
            // Lọc theo loại (thưởng/phạt)
            const typeMatch = typeFilter === 'all' || adj.type === typeFilter;

            // Lọc theo tên người dùng
            const nameMatch = adjustmentSearchTerm === '' ||
                (adj.user && adj.user.name && adj.user.name.toLowerCase().includes(adjustmentSearchTerm.toLowerCase()));

            // Lọc theo ngày
            const dateMatch = adjustmentSelectedDate ?
                format(new Date(adj.effectiveDate), 'yyyy-MM-dd') === format(new Date(adjustmentSelectedDate), 'yyyy-MM-dd') :
                true;

            return typeMatch && nameMatch && dateMatch;
        });
    };
    // Chạy khi component mount hoặc authLoading/isAdmin thay đổi
    useEffect(() => {
        console.log("TRACE: useEffect for data fetching triggered."); // Trace 16
        if (!authLoading && isAdmin) {
            console.log("TRACE: useEffect - Condition met (!authLoading && isAdmin). Calling fetch functions."); // Trace 17
            fetchAllUsers();
            fetchAllSalaryAdjustments();
        } else {
            console.log("TRACE: useEffect - Condition NOT met. authLoading:", authLoading, "isAdmin:", isAdmin); // Trace 18
        }
    }, [authLoading, isAdmin, fetchAllUsers, fetchAllSalaryAdjustments]);

    // --- Xử lý các hành động của Admin ---
    const handleEditBaseSalary = (userRecord) => {
        setCurrentEditingUser(userRecord);
        baseSalaryForm.setFieldsValue({
            // Nếu người dùng đã có lương cứng và chức vụ, hiển thị chúng
            baseSalary: userRecord.baseSalary || 0,
            position: userRecord.position || '',
            userId: userRecord._id 
        });
        setIsBaseSalaryModalVisible(true);
    };

    const handleSetBaseSalary = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const targetUserId = currentEditingUser ? currentEditingUser._id : values.userId;
            await axios.put(`${API_URL}/salary/base/${targetUserId}`, {
                baseSalary: values.baseSalary,
                position: values.position
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Cập nhật lương cứng thành công!');
            setIsBaseSalaryModalVisible(false);
            fetchAllUsers(); // Tải lại danh sách người dùng để cập nhật dữ liệu
        } catch (error) {
            message.error('Lỗi khi cập nhật lương cứng.');
            console.error('Error setting base salary:', error);
        }
    };

    const handleAddAdjustment = () => {
        adjustmentForm.resetFields(); // Reset form trước khi mở modal
        setIsAdjustmentModalVisible(true);
    };

    const handleAddSalaryAdjustment = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const { userId, type, value, description, date } = values; 
            await axios.post(`${API_URL}/salary/adjustments`, {
                userId: userId,
                type: type,
                reason: description, 
                value: value,       
                effectiveDate: date.format('YYYY-MM-DD'), 
                category: 'individual', 
                isPercentage: false,    
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Thêm điều chỉnh lương thành công!');
            setIsAdjustmentModalVisible(false);
            adjustmentForm.resetFields(); 
            fetchAllSalaryAdjustments(); 
        } catch (error) {
            message.error('Lỗi khi thêm điều chỉnh lương.');
            console.error('Error adding salary adjustment:', error.response ? error.response.data : error.message);
        }
    };

    const handleDeleteAdjustment = async (adjustmentId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/salary/adjustments/${adjustmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Xóa điều chỉnh lương thành công!');
            fetchAllSalaryAdjustments(); 
        } catch (error) {
            message.error('Lỗi khi xóa điều chỉnh lương.');
            console.error('Error deleting salary adjustment:', error);
        }
    };

    const handleViewUserSalary = (values) => {
        const userId = values.userId;
        setSelectedUserForView(userId);
        fetchSalaryForSelectedUser(userId);
    };

    // --- Hàm xử lý thưởng hàng loạt ---
    const handleBulkAdjustment = () => {
        bulkAdjustmentForm.resetFields();
        bulkAdjustmentForm.setFieldsValue({
            value: 0, 
            isPercentage: false 
        });
        setIsBulkAdjustmentModalVisible(true);
    };

    const handleAddBulkAdjustment = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const { userIds, type, value, description, date, isPercentage } = values;

            if (!userIds || userIds.length === 0) {
                message.error('Vui lòng chọn ít nhất một người dùng.');
                return;
            }

            // Gửi từng yêu cầu điều chỉnh cho mỗi người dùng được chọn
            const promises = userIds.map(userId =>
                axios.post(`${API_URL}/salary/adjustments`, {
                    userId: userId,
                    type: type, 
                    reason: description,
                    value: value,
                    effectiveDate: date.format('YYYY-MM-DD'),
                    category: 'seasonal', 
                    isPercentage: isPercentage || false,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );

            await Promise.all(promises); // Chờ tất cả các yêu cầu hoàn thành
            message.success('Thêm điều chỉnh lương hàng loạt thành công!');
            setIsBulkAdjustmentModalVisible(false);
            bulkAdjustmentForm.resetFields();
            fetchAllSalaryAdjustments(); // Tải lại danh sách điều chỉnh
        } catch (error) {
            message.error('Lỗi khi thêm điều chỉnh lương hàng loạt.');
            console.error('Error adding bulk salary adjustment:', error.response ? error.response.data : error.message);
        }
    };

    const handleBulkDeleteAdjustments = async () => {
        if (selectedAdjustmentRowKeys.length === 0) {
            message.warn('Vui lòng chọn ít nhất một điều chỉnh để xóa.');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa ${selectedAdjustmentRowKeys.length} điều chỉnh đã chọn?`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/salary/adjustments/bulk-delete`, {
                        ids: selectedAdjustmentRowKeys
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    message.success(`Đã xóa ${selectedAdjustmentRowKeys.length} điều chỉnh thành công!`);
                    setSelectedAdjustmentRowKeys([]); 
                    fetchAllSalaryAdjustments(); 
                } catch (error) {
                    message.error('Lỗi khi xóa các điều chỉnh đã chọn.');
                    console.error('Error bulk deleting salary adjustments:', error.response ? error.response.data : error.message);
                }
            },
        });
    };


    // --- Cột cho bảng ---

    const userColumns = [
        { title: 'Tên người dùng', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Lương cơ bản', dataIndex: 'baseSalary', key: 'baseSalary', render: (text) => text ? `${text.toLocaleString('vi-VN')} VND` : 'N/A' },
        { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Button icon={<Edit2 size={16} />} onClick={() => handleEditBaseSalary(record)}>
                    Sửa
                </Button>
            ),
        },
    ];

    const adjustmentColumns = [
        {
            title: 'Tên người dùng', 
            dataIndex: 'user',
            key: 'userName',
            render: (userObj) => userObj ? userObj.name : 'N/A'
        },
        {
            title: 'Email',
            dataIndex: ['user', 'email'], 
            key: 'userEmail',
            render: (email, record) => record.user?.email || 'N/A'
        },
        {
            title: 'Vai trò',
            dataIndex: ['user', 'role'],
            key: 'userRole',
            render: (role, record) => record.user?.role || 'N/A'
        },
        {
            title: 'Chức vụ',
            dataIndex: ['user', 'position'], 
            key: 'userPosition',
            render: (position, record) => record.user?.position || 'N/A'
        },
        {
            title: 'Loại điều chỉnh', dataIndex: 'type', key: 'type', render: (type) => (
                <Tag color={type === 'bonus' ? 'green' : 'red'}>
                    {type === 'bonus' ? 'Thưởng' : 'Trừ lương'}
                </Tag>
            )
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            render: (text) => {
                if (text !== undefined && text !== null) {
                    return `${text.toLocaleString('vi-VN')} VND`;
                }
                return 'N/A VND'; // Hoặc một giá trị mặc định khác nếu không có dữ liệu
            }
        },
        { title: 'Mô tả', dataIndex: 'reason', key: 'reason' },
        { title: 'Ngày', dataIndex: 'effectiveDate', key: 'effectiveDate', render: (text) => format(new Date(text), 'dd/MM/yyyy', { locale: vi }) }, // Đổi date thành effectiveDate
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Popconfirm
                    title="Bạn có chắc chắn muốn xóa điều chỉnh này?"
                    onConfirm={() => handleDeleteAdjustment(record._id)}
                    okText="Có"
                    cancelText="Không"
                >
                    <Button danger icon={<Trash2 size={16} />}>
                        Xóa
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    if (authLoading || !isAdmin) {
        console.log("TRACE: Render - Showing Spin (authLoading or not isAdmin). authLoading:", authLoading, "isAdmin:", isAdmin); // Trace 19
        return <Spin tip="Đang tải..." size="large" className="flex justify-center items-center h-screen" />;
    }
    return (
        <SBNV>
            <div className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                    <DollarSign size={32} className="mr-3" /> Quản lý Lương & Thưởng
                </h1>

                <Tabs defaultActiveKey="1" className="bg-white p-6 rounded-lg shadow-md">
                    <TabPane tab="Quản lý Lương Cứng" key="1">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={() => {
                                setCurrentEditingUser(null);
                                baseSalaryForm.resetFields();
                                setIsBaseSalaryModalVisible(true);
                            }}
                            className="mb-4 bg-green-500 hover:bg-green-600 mr-2"
                        >
                            Thêm Lương Cứng Mới / Sửa Lương Cứng
                        </Button>
                        <Table
                            columns={userColumns}
                            dataSource={users}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>

                    <TabPane tab="Quản lý Điều Chỉnh Lương" key="2">
                        <div className="flex justify-between mb-4">
                            <Button
                                type="primary"
                                icon={<PlusCircle size={18} />}
                                onClick={handleAddAdjustment}
                                className="bg-green-500 hover:bg-green-600"
                            >
                                Thêm Điều Chỉnh Lương Cá Nhân
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusCircle size={18} />}
                                onClick={handleBulkAdjustment}
                                className="bg-purple-500 hover:bg-purple-600 ml-2"
                            >
                                Thêm Điều Chỉnh Lương Hàng Loạt
                            </Button>
                            <Button
                                type="danger"
                                icon={<Trash2 size={18} />}
                                onClick={handleBulkDeleteAdjustments}
                                disabled={selectedAdjustmentRowKeys.length === 0}
                                className="bg-red-500 hover:bg-red-600 ml-2"
                            >
                                Xóa đã chọn ({selectedAdjustmentRowKeys.length})
                            </Button>
                        </div>


                        <Tabs
                            defaultActiveKey="all"
                            onChange={(key) => setActiveAdjustmentTab(key)}
                            className="mt-4"
                        >
                            <TabPane tab="Tất cả" key="all">
                                <div className="flex space-x-4 mb-4">
                                    <Input.Search
                                        placeholder="Tìm kiếm theo tên người dùng"
                                        allowClear
                                        onSearch={setAdjustmentSearchTerm}
                                        onChange={(e) => setAdjustmentSearchTerm(e.target.value)}
                                        style={{ width: 300 }}
                                    />
                                    <DatePicker
                                        placeholder="Chọn ngày"
                                        format="DD/MM/YYYY"
                                        onChange={(date) => setAdjustmentSelectedDate(date)}
                                        allowClear
                                    />
                                </div>
                                <Table
                                    columns={adjustmentColumns}
                                    dataSource={getFilteredAdjustments('all')}
                                    rowKey="_id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                    rowSelection={{
                                        selectedRowKeys: selectedAdjustmentRowKeys,
                                        onChange: (selectedKeys) => {
                                            setSelectedAdjustmentRowKeys(selectedKeys);
                                        },
                                    }}
                                />
                            </TabPane>

                            <TabPane tab="Thưởng" key="bonus">
                                <div className="flex space-x-4 mb-4">
                                    <Input.Search
                                        placeholder="Tìm kiếm theo tên người dùng"
                                        allowClear
                                        onSearch={setAdjustmentSearchTerm}
                                        onChange={(e) => setAdjustmentSearchTerm(e.target.value)}
                                        style={{ width: 300 }}
                                    />
                                    <DatePicker
                                        placeholder="Chọn ngày"
                                        format="DD/MM/YYYY"
                                        onChange={(date) => setAdjustmentSelectedDate(date)}
                                        allowClear
                                    />
                                </div>
                                <Table
                                    columns={adjustmentColumns}
                                    dataSource={getFilteredAdjustments('bonus')}
                                    rowKey="_id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                    rowSelection={{
                                        selectedRowKeys: selectedAdjustmentRowKeys,
                                        onChange: (selectedKeys) => {
                                            setSelectedAdjustmentRowKeys(selectedKeys);
                                        },
                                    }}
                                />
                            </TabPane>

                            <TabPane tab="Phạt" key="deduction">
                                <div className="flex space-x-4 mb-4">
                                    <Input.Search
                                        placeholder="Tìm kiếm theo tên người dùng"
                                        allowClear
                                        onSearch={setAdjustmentSearchTerm}
                                        onChange={(e) => setAdjustmentSearchTerm(e.target.value)}
                                        style={{ width: 300 }}
                                    />
                                    <DatePicker
                                        placeholder="Chọn ngày"
                                        format="DD/MM/YYYY"
                                        onChange={(date) => setAdjustmentSelectedDate(date)}
                                        allowClear
                                    />
                                </div>
                                <Table
                                    columns={adjustmentColumns}
                                    dataSource={getFilteredAdjustments('deduction')}
                                    rowKey="_id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                    rowSelection={{
                                        selectedRowKeys: selectedAdjustmentRowKeys,
                                        onChange: (selectedKeys) => {
                                            setSelectedAdjustmentRowKeys(selectedKeys);
                                        },
                                    }}
                                />
                            </TabPane>
                        </Tabs>
                    </TabPane>
                    {/* Giữ nguyên TabPane "Xem Lương Của Nhân Viên" key="3" */}
                    <TabPane tab="Xem Lương Của Nhân Viên" key="3">
                        <Form form={viewUserSalaryForm} onFinish={handleViewUserSalary} layout="vertical">
                            <Form.Item
                                name="userId"
                                label="Chọn người dùng"
                                rules={[{ required: true, message: 'Vui lòng chọn một người dùng!' }]}
                            >
                                <Select
                                    placeholder="Chọn nhân viên"
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {Array.isArray(users) && users.map(u => (
                                        <Option key={u._id} value={u._id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span>{u.name}</span>
                                                <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
                                                    {u.position ? `${u.position}, ` : ''}{u.email}
                                                </span>
                                            </div>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Xem chi tiết lương
                                </Button>
                            </Form.Item>
                        </Form>

                        {selectedUserForView && !loading && (
                            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">Chi tiết lương tháng</h3>
                                {monthlySalaryForSelectedUser ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <p><strong>Tháng:</strong> {monthlySalaryForSelectedUser.month}/{monthlySalaryForSelectedUser.year}</p>
                                        <p><strong>Lương cứng:</strong> {monthlySalaryForSelectedUser.baseSalary !== undefined && monthlySalaryForSelectedUser.baseSalary !== null ? monthlySalaryForSelectedUser.baseSalary.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Tổng thưởng:</strong> {monthlySalaryForSelectedUser.totalBonus !== undefined && monthlySalaryForSelectedUser.totalBonus !== null ? monthlySalaryForSelectedUser.totalBonus.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Tổng phạt:</strong> {monthlySalaryForSelectedUser.totalDeduction !== undefined && monthlySalaryForSelectedUser.totalDeduction !== null ? monthlySalaryForSelectedUser.totalDeduction.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Lương thực nhận:</strong> <span className="font-bold text-blue-600">{monthlySalaryForSelectedUser.netSalary !== undefined && monthlySalaryForSelectedUser.netSalary !== null ? monthlySalaryForSelectedUser.netSalary.toLocaleString('vi-VN') : 'N/A'} VND</span></p>
                                    </div>
                                ) : (
                                    <p>Không có dữ liệu lương tháng cho người dùng này.</p>
                                )}

                                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Chi tiết lương năm</h3>
                                {annualSalaryForSelectedUser ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <p><strong>Năm:</strong> {annualSalaryForSelectedUser.year}</p>
                                        <p><strong>Tổng lương cứng:</strong> {annualSalaryForSelectedUser.totalBaseSalary !== undefined && annualSalaryForSelectedUser.totalBaseSalary !== null ? annualSalaryForSelectedUser.totalBaseSalary.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Tổng thưởng:</strong> {annualSalaryForSelectedUser.totalBonus !== undefined && annualSalaryForSelectedUser.totalBonus !== null ? annualSalaryForSelectedUser.totalBonus.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Tổng phạt:</strong> {annualSalaryForSelectedUser.totalDeduction !== undefined && annualSalaryForSelectedUser.totalDeduction !== null ? annualSalaryForSelectedUser.totalDeduction.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                        <p><strong>Tổng lương thực nhận:</strong> <span className="font-bold text-blue-600">{annualSalaryForSelectedUser.totalNetSalary !== undefined && annualSalaryForSelectedUser.totalNetSalary !== null ? annualSalaryForSelectedUser.totalNetSalary.toLocaleString('vi-VN') : 'N/A'} VND</span></p>
                                    </div>
                                ) : (
                                    <p>Không có dữ liệu lương năm cho người dùng này.</p>
                                )}

                                {/* Phần mới: Chi tiết điều chỉnh lương của nhân viên */}
                                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Chi tiết điều chỉnh lương</h3>
                                <div className="flex space-x-4 mb-4">
                                    <DatePicker
                                        placeholder="Lọc theo ngày"
                                        format="DD/MM/YYYY"
                                        onChange={(date) => setUserAdjustmentsFilterDate(date)}
                                        allowClear
                                    />
                                </div>
                                <Table
                                    columns={adjustmentColumns}
                                    dataSource={salaryAdjustments.filter(adj =>
                                        adj.user && adj.user._id === selectedUserForView && // Lọc theo user được chọn
                                        (userAdjustmentsFilterDate ? format(new Date(adj.effectiveDate), 'yyyy-MM-dd') === format(new Date(userAdjustmentsFilterDate), 'yyyy-MM-dd') : true)
                                    )}
                                    rowKey="_id"
                                    loading={loading}
                                    pagination={{ pageSize: 5 }} // Phân trang riêng cho phần này
                                />
                            </div>
                        )}
                    </TabPane>
                </Tabs>


                {/* Modal cho Đặt/Sửa Lương Cứng */}
                <Modal
                    title={currentEditingUser ? "Cập nhật lương cứng & chức vụ" : "Thêm lương cứng mới"}
                    visible={isBaseSalaryModalVisible}
                    onCancel={() => {
                        setIsBaseSalaryModalVisible(false);
                        baseSalaryForm.resetFields(); // Đặt lại form khi đóng modal
                    }}
                    footer={null}
                >
                    <Form form={baseSalaryForm} layout="vertical" onFinish={handleSetBaseSalary}>
                        {!currentEditingUser && ( // Chỉ hiển thị mục chọn người dùng khi thêm mới
                            <Form.Item
                                name="userId"
                                label="Chọn người dùng"
                                rules={[{ required: true, message: 'Vui lòng chọn người dùng!' }]}
                            >
                                <Select
                                    placeholder="Chọn nhân viên"
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {/* Đảm bảo users là một mảng trước khi gọi map */}
                                    {Array.isArray(users) && users.map(u => (
                                        <Option key={u._id} value={u._id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span>{u.name}</span>
                                                <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
                                                    {u.position ? `${u.position}, ` : ''}{u.email}
                                                </span>
                                            </div>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item
                            name="baseSalary"
                            label="Lương cứng (VND)"
                            rules={[{ required: true, message: 'Vui lòng nhập lương cứng!' }]}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/,*/g, '')} />
                        </Form.Item>
                        <Form.Item
                            name="position"
                            label="Chức vụ"
                            rules={[{ required: true, message: 'Vui lòng nhập chức vụ!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                {currentEditingUser ? "Cập nhật" : "Thêm mới"}
                            </Button>
                            <Button onClick={() => {
                                setIsBaseSalaryModalVisible(false);
                                baseSalaryForm.resetFields();
                            }}>
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Modal cho Thêm Điều Chỉnh Lương Cá Nhân */}
                <Modal
                    title="Thêm Điều Chỉnh Lương Cá Nhân"
                    visible={isAdjustmentModalVisible}
                    onCancel={() => {
                        setIsAdjustmentModalVisible(false);
                        adjustmentForm.resetFields(); // Đặt lại form khi đóng modal
                    }}
                    footer={null}
                >
                    <Form form={adjustmentForm} layout="vertical" onFinish={handleAddSalaryAdjustment}>
                        <Form.Item
                            name="userId"
                            label="Người dùng"
                            rules={[{ required: true, message: 'Vui lòng chọn người dùng!' }]}
                        >
                            <Select
                                placeholder="Chọn nhân viên"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {/* Đảm bảo users là một mảng trước khi gọi map */}
                                {Array.isArray(users) && users.map(u => (
                                    <Option key={u._id} value={u._id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span>{u.name}</span>
                                            <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
                                                {u.position ? `${u.position}, ` : ''}{u.email}
                                            </span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="type"
                            label="Loại điều chỉnh"
                            rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh!' }]}
                        >
                            <Radio.Group>
                                <Radio value="bonus">Thưởng</Radio>
                                <Radio value="deduction">Trừ lương</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="value"
                            label="Số tiền (VND)"
                            rules={[{ required: true, message: 'Vui lòng nhập số tiền!' }]}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/,*/g, '')} />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item
                            name="date"
                            label="Ngày áp dụng"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                Thêm
                            </Button>
                            <Button onClick={() => {
                                setIsAdjustmentModalVisible(false);
                                adjustmentForm.resetFields();
                            }}>
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Modal cho Thêm Điều Chỉnh Lương Hàng Loạt */}
                <Modal
                    title="Thêm Điều Chỉnh Lương Hàng Loạt"
                    visible={isBulkAdjustmentModalVisible}
                    onCancel={() => {
                        setIsBulkAdjustmentModalVisible(false);
                        bulkAdjustmentForm.resetFields();
                    }}
                    footer={null}
                >
                    <Form form={bulkAdjustmentForm} layout="vertical" onFinish={handleAddBulkAdjustment}>
                        <Form.Item
                            name="userIds"
                            label="Chọn người dùng"
                            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một người dùng!' }]}
                        >
                            <Select
                                mode="multiple" // Cho phép chọn nhiều
                                placeholder="Chọn nhân viên"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {Array.isArray(users) && users.map(u => (
                                    <Option key={u._id} value={u._id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span>{u.name}</span>
                                            <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
                                                {u.position ? `${u.position}, ` : ''}{u.email}
                                            </span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="type"
                            label="Loại điều chỉnh"
                            rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh!' }]}
                        >
                            <Radio.Group>
                                <Radio value="bonus">Thưởng</Radio>
                                <Radio value="deduction">Trừ lương</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="isPercentage"
                            label="Loại giá trị"
                            initialValue={false} // Mặc định là số tiền cố định
                        >
                            <Radio.Group>
                                <Radio value={false}>Số tiền cố định</Radio>
                                <Radio value={true}>Phần trăm (%)</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="value"
                            label="Giá trị"
                            rules={[{ required: true, message: 'Vui lòng nhập giá trị!' }]}
                            initialValue={0} // Đảm bảo giá trị khởi tạo là 0
                        >
                            {/* Render InputNumber trực tiếp, không dùng hàm con */}
                            <InputNumber
                                min={0}
                                // Max 1 cho phần trăm (0-100%)
                                max={bulkAdjustmentForm.getFieldValue('isPercentage') ? 1 : undefined}
                                // Bước nhảy cho phần trăm
                                step={bulkAdjustmentForm.getFieldValue('isPercentage') ? 0.01 : 1000}
                                style={{ width: '100%' }}
                                formatter={val => bulkAdjustmentForm.getFieldValue('isPercentage') ? `${(val || 0) * 100}%` : `${val || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={val => {
                                    if (val === null || val === undefined || val === '') {
                                        return 0; // Trả về 0 cho giá trị rỗng
                                    }
                                    const isPercentage = bulkAdjustmentForm.getFieldValue('isPercentage');
                                    const cleanVal = isPercentage ? String(val).replace('%', '') : String(val).replace(/,*/g, ''); // Ensure val is string
                                    const parsed = parseFloat(cleanVal);
                                    return isNaN(parsed) ? 0 : parsed; // Trả về 0 nếu không phải số
                                }}
                            />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item
                            name="date"
                            label="Ngày áp dụng"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                Thêm Hàng Loạt
                            </Button>
                            <Button onClick={() => {
                                setIsBulkAdjustmentModalVisible(false);
                                bulkAdjustmentForm.resetFields();
                            }}>
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyLuongThuong;
