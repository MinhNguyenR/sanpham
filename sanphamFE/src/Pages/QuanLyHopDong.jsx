import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv'; 
import { Button, message, Spin, Table, Modal, Form, Input, Select, DatePicker, Popconfirm, Tag, Upload, InputNumber } from 'antd';
import { PlusCircle, Trash2, Edit2, FileText, Upload as UploadIcon, Search as SearchIcon } from 'lucide-react'; // Thêm SearchIcon
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker; 

const API_URL = 'http://localhost:5000/api/auth'; 

const QuanLyHopDong = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState([]);
    const [usersList, setUsersList] = useState([]); 
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingContract, setEditingContract] = useState(null); 
    const [form] = Form.useForm();

    // State cho bộ lọc
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState(null); 
    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
            navigate('/'); 
        }
    }, [authLoading, isAdmin]);

    const fetchUsers = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/users-management`, config);
            setUsersList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error.response ? error.response.data : error.message);
            message.error('Không thể tải danh sách người dùng.');
            setUsersList([]);
        }
    }, [isAdmin, authLoading]);

    // Fetch Contracts
    const fetchContracts = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/contracts`, config);
            setContracts(res.data.contracts);
        } catch (error) {
            message.error('Lỗi khi tải danh sách hợp đồng.');
            console.error('Error fetching contracts:', error.response ? error.response.data : error.message);
            setContracts([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    // Initial data fetch
    useEffect(() => {
        if (isAdmin && !authLoading) {
            fetchUsers();
            fetchContracts();
        }
    }, [isAdmin, authLoading, fetchUsers, fetchContracts]);

    // Hàm lọc hợp đồng dựa trên các state filter
    const getFilteredContracts = () => {
        let filtered = contracts;

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(contract =>
                (contract.user && contract.user.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (contract.user && contract.user.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (contract.contractCode && contract.contractCode.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        if (filterType !== 'all') {
            filtered = filtered.filter(contract => contract.contractType === filterType);
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(contract => contract.status === filterStatus);
        }

        if (filterDateRange && filterDateRange.length === 2) {
            const [startDate, endDate] = filterDateRange;
            filtered = filtered.filter(contract => {
                const contractStartDate = moment(contract.startDate);
                const contractEndDate = contract.endDate ? moment(contract.endDate) : null;

                // Lọc theo ngày bắt đầu nằm trong khoảng
                const startsWithinRange = contractStartDate.isBetween(startDate, endDate, null, '[]'); // Inclusive

                // Lọc theo ngày kết thúc nằm trong khoảng (nếu có)
                const endsWithinRange = contractEndDate ? contractEndDate.isBetween(startDate, endDate, null, '[]') : false;

                // Hoặc hợp đồng bao trùm khoảng ngày tìm kiếm
                const rangeWithinContract = contractStartDate.isSameOrBefore(startDate) && (contractEndDate === null || contractEndDate.isSameOrAfter(endDate));

                return startsWithinRange || endsWithinRange || rangeWithinContract;
            });
        }

        return filtered;
    };

    // Handle Add/Edit Contract
    const handleAdd = () => {
        setEditingContract(null);
        form.resetFields();
        form.setFieldsValue({
            contractType: 'official', // Giá trị mặc định
            status: 'active', // Giá trị mặc định
            salary: 0, // Giá trị mặc định
        });
        setIsModalVisible(true);
    };

    const handleEdit = (contract) => {
        setEditingContract(contract);
        form.resetFields();
        form.setFieldsValue({
            ...contract,
            user: contract.user._id, // Gán ID của user để Select hiển thị đúng
            startDate: contract.startDate ? moment(contract.startDate) : null,
            endDate: contract.endDate ? moment(contract.endDate) : null,
        });
        setIsModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Định dạng lại ngày tháng trước khi gửi lên server
            const payload = {
                ...values,
                startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
                endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
            };

            if (editingContract) {
                const res = await axios.put(`${API_URL}/contracts/${editingContract._id}`, payload, config);
                message.success('Cập nhật hợp đồng thành công!');
                // Cập nhật state trực tiếp
                setContracts(prev => prev.map(c => c._id === res.data.contract._id ? res.data.contract : c));
            } else {
                const res = await axios.post(`${API_URL}/contracts`, payload, config);
                message.success('Thêm hợp đồng thành công!');
                // Cập nhật state trực tiếp
                setContracts(prev => [res.data.contract, ...prev]);
            }
            setIsModalVisible(false);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi lưu hợp đồng.');
            console.error('Error saving contract:', error.response ? error.response.data : error.message);
        }
    };

    const handleDelete = async (contractId) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${API_URL}/contracts/${contractId}`, config);
            message.success('Xóa hợp đồng thành công!');
            // Cập nhật state trực tiếp
            setContracts(prev => prev.filter(c => c._id !== contractId));
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa hợp đồng.');
            console.error('Error deleting contract:', error.response ? error.response.data : error.message);
        }
    };

    // Columns for Ant Design Table
    const columns = [
        { title: 'Mã HĐ', dataIndex: 'contractCode', key: 'contractCode' },
        {
            title: 'Nhân viên',
            dataIndex: 'user',
            key: 'userName',
            render: (userObj) => userObj ? `${userObj.name} (${userObj.email})` : 'N/A',
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
                return <Tag color="blue">{typeMap[type] || type}</Tag>;
            },
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date) => date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
        },
        {
            title: 'Ngày kết thúc',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : 'Không thời hạn',
        },
        { title: 'Thời hạn', dataIndex: 'duration', key: 'duration' },
        {
            title: 'Lương',
            dataIndex: 'salary',
            key: 'salary',
            render: (salary) => salary ? `${salary.toLocaleString('vi-VN')} VND` : 'N/A',
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
                return <Tag color={colorMap[status] || 'default'}>{statusMap[status] || status}</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Button
                        icon={<Edit2 size={16} />}
                        onClick={() => handleEdit(record)}
                        className="mr-2"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title={`Bạn có chắc chắn muốn xóa hợp đồng ${record.contractCode} này?`}
                        onConfirm={() => handleDelete(record._id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<Trash2 size={16} />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </>
            ),
        },
    ];

    if (authLoading || loading) {
        return <Spin tip="Đang tải dữ liệu hợp đồng..." size="large" className="flex justify-center items-center h-screen" />;
    }

    if (!isAdmin) {
        return (
            <SBNV>
                <div className="container mx-auto p-4 text-center text-red-500">
                    Bạn không có quyền truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                    <FileText size={32} className="mr-3" /> Quản lý Hợp đồng
                </h1>

                <div className="mb-4 p-4 bg-white rounded-lg shadow-md flex flex-wrap items-center gap-4">
                    <Input
                        placeholder="Tìm kiếm theo tên/email NV, mã HĐ"
                        prefix={<SearchIcon size={16} />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Select
                        placeholder="Lọc theo loại HĐ"
                        style={{ width: 180 }}
                        onChange={(value) => setFilterType(value)}
                        value={filterType}
                    >
                        <Option value="all">Tất cả loại HĐ</Option>
                        <Option value="probationary">Thử việc</Option>
                        <Option value="official">Chính thức</Option>
                        <Option value="collaborator">Cộng tác viên</Option>
                        <Option value="seasonal">Thời vụ</Option>
                        <Option value="internship">Thực tập</Option>
                        <Option value="other">Khác</Option>
                    </Select>
                    <Select
                        placeholder="Lọc theo trạng thái"
                        style={{ width: 180 }}
                        onChange={(value) => setFilterStatus(value)}
                        value={filterStatus}
                    >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value="active">Còn hiệu lực</Option>
                        <Option value="expired">Đã hết hạn</Option>
                        <Option value="terminated">Đã chấm dứt</Option>
                        <Option value="pending">Đang chờ</Option>
                        <Option value="renewed">Đã gia hạn</Option>
                    </Select>
                    <RangePicker
                        style={{ width: 300 }}
                        format="DD/MM/YYYY"
                        onChange={(dates) => setFilterDateRange(dates)}
                        value={filterDateRange}
                    />
                    <Button
                        type="primary"
                        icon={<PlusCircle size={18} />}
                        onClick={handleAdd}
                        className="bg-green-500 hover:bg-green-600 ml-auto"
                    >
                        Thêm Hợp đồng mới
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={getFilteredContracts()} // Sử dụng hàm lọc dữ liệu
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />

                {/* Modal for Add/Edit Contract */}
                <Modal
                    title={editingContract ? "Chỉnh sửa Hợp đồng" : "Thêm Hợp đồng mới"}
                    visible={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    footer={null}
                    width={700}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="user"
                            label="Nhân viên"
                            rules={[{ required: true, message: 'Vui lòng chọn nhân viên!' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Chọn nhân viên"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                                disabled={!!editingContract} // Không cho phép thay đổi nhân viên khi chỉnh sửa
                            >
                                {usersList.map(u => (
                                    <Option key={u._id} value={u._id}>
                                        {u.name} ({u.email}) - {u.position}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="contractCode"
                            label="Mã Hợp đồng"
                            rules={[{ required: true, message: 'Vui lòng nhập mã hợp đồng!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="contractType"
                            label="Loại Hợp đồng"
                            rules={[{ required: true, message: 'Vui lòng chọn loại hợp đồng!' }]}
                        >
                            <Select>
                                <Option value="probationary">Thử việc</Option>
                                <Option value="official">Chính thức</Option>
                                <Option value="collaborator">Cộng tác viên</Option>
                                <Option value="seasonal">Thời vụ</Option>
                                <Option value="internship">Thực tập</Option>
                                <Option value="other">Khác</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="startDate"
                            label="Ngày bắt đầu"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item
                            name="endDate"
                            label="Ngày kết thúc (Để trống nếu không thời hạn)"
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item
                            name="salary"
                            label="Mức lương (VND)"
                            rules={[{ required: true, message: 'Vui lòng nhập mức lương!' }, { type: 'number', min: 0, message: 'Lương phải là số không âm!' }]}
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

                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <TextArea rows={3} />
                        </Form.Item>

                        {/* Tạm thời bỏ qua phần upload file thực tế, chỉ lưu URL */}
                        <Form.Item
                            name="fileUrl"
                            label="URL File Hợp đồng (tùy chọn)"
                        >
                            <Input placeholder="Ví dụ: https://example.com/contract.pdf" />
                        </Form.Item>
                        {/* <Form.Item
                            name="contractFile"
                            label="File Hợp đồng"
                            valuePropName="fileList"
                            getValueFromEvent={(e) => Array.isArray(e) ? e : e && e.fileList}
                        >
                            <Upload name="file" action="/upload.do" listType="text" maxCount={1}>
                                <Button icon={<UploadIcon size={16} />}>Chọn File</Button>
                            </Upload>
                        </Form.Item> */}

                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                        >
                            <Select>
                                <Option value="active">Còn hiệu lực</Option>
                                <Option value="expired">Đã hết hạn</Option>
                                <Option value="terminated">Đã chấm dứt</Option>
                                <Option value="pending">Đang chờ</Option>
                                <Option value="renewed">Đã gia hạn</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item className="text-right mt-4">
                            <Button onClick={() => setIsModalVisible(false)} className="mr-2">
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editingContract ? "Cập nhật" : "Thêm mới"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyHopDong;
