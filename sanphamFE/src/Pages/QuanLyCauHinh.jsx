import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Form, Input, Select, Popconfirm, Tag, InputNumber, Tabs } from 'antd';
import { PlusCircle, Trash2, Edit2, Settings, Building2, Briefcase, CalendarClock, DollarSign } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5000/api/auth/config';
const USER_API_URL = 'http://localhost:5000/api/auth/users-management'; 
const SOCKET_URL = 'http://localhost:5000';

let socket; // Khai báo socket ở ngoài để giữ trạng thái

const QuanLyCauHinh = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('departments'); 
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [salaryCategories, setSalaryCategories] = useState([]);
    const [usersList, setUsersList] = useState([]); // Danh sách người dùng để chọn trưởng phòng
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // null nếu thêm mới, object nếu chỉnh sửa
    const [currentCategory, setCurrentCategory] = useState('');
    const [form] = Form.useForm();

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
            navigate('/'); 
        }
    }, [authLoading, isAdmin]);

    // Đảm bảo fetchUsers chỉ chạy khi isAdmin và authLoading đã hoàn tất
    const fetchUsers = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(USER_API_URL, config);
            // Đảm bảo res.data là một mảng. Nếu không, đặt là mảng rỗng.
            setUsersList(Array.isArray(res.data) ? res.data : []); 
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error.response ? error.response.data : error.message);
            message.error('Không thể tải danh sách người dùng.');
            setUsersList([]); // Đảm bảo usersList là một mảng rỗng nếu có lỗi
        } finally {
            
        }
    }, [isAdmin, authLoading]);

    const fetchDepartments = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/departments`, config);
            setDepartments(res.data.departments);
        } catch (error) {
            message.error('Lỗi khi tải phòng ban.');
            console.error('Error fetching departments:', error.response ? error.response.data : error.message);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchPositions = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/positions`, config);
            setPositions(res.data.positions);
        } catch (error) {
            message.error('Lỗi khi tải chức vụ.');
            console.error('Error fetching positions:', error.response ? error.response.data : error.message);
            setPositions([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchLeaveTypes = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/leave-types`, config);
            setLeaveTypes(res.data.leaveTypes);
        } catch (error) {
            message.error('Lỗi khi tải loại hình nghỉ phép.');
            console.error('Error fetching leave types:', error.response ? error.response.data : error.message);
            setLeaveTypes([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchSalaryCategories = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/salary-categories`, config);
            setSalaryCategories(res.data.categories);
        } catch (error) {
            message.error('Lỗi khi tải loại điều chỉnh lương.');
            console.error('Error fetching salary categories:', error.response ? error.response.data : error.message);
            setSalaryCategories([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);


    useEffect(() => {
        if (isAdmin && !authLoading) {
            fetchUsers();

            const loadDataForActiveTab = () => {
                if (activeTab === 'departments') fetchDepartments();
                else if (activeTab === 'positions') fetchPositions();
                else if (activeTab === 'leaveTypes') fetchLeaveTypes();
                else if (activeTab === 'salaryCategories') fetchSalaryCategories();
            };
            loadDataForActiveTab();



            if (!socket) {
                socket = io(SOCKET_URL, {
                    auth: { token: localStorage.getItem('token') },
                    transports: ['websocket', 'polling']
                });

                socket.on('connect', () => {
                    console.log('Socket.IO connected from QuanLyCauHinh.jsx');
                    socket.emit('joinRoom', user._id); 
                });

                socket.on('newNotification', (payload) => {
                    const { notification, data } = payload;
                    if (user && notification.sender !== user._id) {
                        message.info(`Thông báo: ${notification.message}`);
                    }

                    switch (notification.type) {
                        case 'new_department':
                            if (activeTab === 'departments' && data) {
                                setDepartments(prev => [data, ...prev]);
                            }
                            break;
                        case 'department_updated':
                            if (activeTab === 'departments' && data) {
                                setDepartments(prev => prev.map(dep =>
                                    dep._id === data._id ? data : dep 
                                ));
                            }
                            break;
                        case 'department_deleted':
                            if (activeTab === 'departments' && data && data._id) {
                                setDepartments(prev => prev.filter(dep => dep._id !== data._id)); 
                            }
                            break;
                        case 'new_position':
                            if (activeTab === 'positions' && data) {
                                setPositions(prev => [data, ...prev]);
                            }
                            break;
                        case 'position_updated':
                            if (activeTab === 'positions' && data) {
                                setPositions(prev => prev.map(pos =>
                                    pos._id === data._id ? data : pos
                                ));
                            }
                            break;
                        case 'position_deleted':
                            if (activeTab === 'positions' && data && data._id) {
                                setPositions(prev => prev.filter(pos => pos._id !== data._id));
                            }
                            break;
                        case 'new_leave_type':
                            if (activeTab === 'leaveTypes' && data) {
                                setLeaveTypes(prev => [data, ...prev]);
                            }
                            break;
                        case 'leave_type_updated':
                            if (activeTab === 'leaveTypes' && data) {
                                setLeaveTypes(prev => prev.map(lt =>
                                    lt._id === data._id ? data : lt
                                ));
                            }
                            break;
                        case 'leave_type_deleted':
                            if (activeTab === 'leaveTypes' && data && data._id) {
                                setLeaveTypes(prev => prev.filter(lt => lt._id !== data._id));
                            }
                            break;
                        case 'new_salary_category':
                            if (activeTab === 'salaryCategories' && data) {
                                setSalaryCategories(prev => [data, ...prev]);
                            }
                            break;
                        case 'salary_category_updated':
                            if (activeTab === 'salaryCategories' && data) {
                                setSalaryCategories(prev => prev.map(sc =>
                                    sc._id === data._id ? data : sc
                                ));
                            }
                            break;
                        case 'salary_category_deleted':
                            if (activeTab === 'salaryCategories' && data && data._id) {
                                setSalaryCategories(prev => prev.filter(sc => sc._id !== data._id));
                            }
                            break;
                        default:

                            break;
                    }
                });

                socket.on('disconnect', () => { console.log('Socket.IO disconnected from QuanLyCauHinh.jsx'); });
                socket.on('connect_error', (err) => { console.error('Socket.IO connection error from QuanLyCauHinh.jsx:', err.message); });
            } else {
                socket.emit('joinRoom', user._id);
            }
        }

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [user, authLoading, isAdmin, activeTab, fetchUsers, fetchDepartments, fetchPositions, fetchLeaveTypes, fetchSalaryCategories]); // Đã thêm các fetch functions vào dependencies


    const handleAdd = (category) => {
        setCurrentCategory(category);
        setEditingItem(null);
        form.resetFields();
        if (category === 'leaveType') {
            form.setFieldsValue({ defaultDays: 0, isPaid: true });
        } else if (category === 'salaryCategory') {
            form.setFieldsValue({ type: 'bonus' });
        }
        setIsModalVisible(true);
    };

    const handleEdit = (category, item) => {
        setCurrentCategory(category);
        setEditingItem(item);
        form.resetFields();
        form.setFieldsValue({
            ...item,
            headOfDepartment: item.headOfDepartment ? item.headOfDepartment._id : null, 
        });
        setIsModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            let endpoint = '';

            switch (currentCategory) {
                case 'department': endpoint = 'departments'; break;
                case 'position': endpoint = 'positions'; break;
                case 'leaveType': endpoint = 'leave-types'; break;
                case 'salaryCategory': endpoint = 'salary-categories'; break;
                default: throw new Error('Loại danh mục không hợp lệ.');
            }

            if (editingItem) {
                const res = await axios.put(`${API_URL}/${endpoint}/${editingItem._id}`, values, config);
                message.success(`Cập nhật ${currentCategory} thành công!`);
                if (currentCategory === 'department') {
                    setDepartments(prev => prev.map(dep => dep._id === res.data.department._id ? res.data.department : dep));
                } else if (currentCategory === 'position') {
                    setPositions(prev => prev.map(pos => pos._id === res.data.position._id ? res.data.position : pos));
                } else if (currentCategory === 'leaveType') {
                    setLeaveTypes(prev => prev.map(lt => lt._id === res.data.leaveType._id ? res.data.leaveType : lt));
                } else if (currentCategory === 'salaryCategory') {
                    setSalaryCategories(prev => prev.map(sc => sc._id === res.data.category._id ? res.data.category : sc));
                }
            } else {
                const res = await axios.post(`${API_URL}/${endpoint}`, values, config);
                message.success(`Thêm ${currentCategory} thành công!`);
                if (currentCategory === 'department') {
                    setDepartments(prev => [res.data.department, ...prev]);
                } else if (currentCategory === 'position') {
                    setPositions(prev => [res.data.position, ...prev]);
                } else if (currentCategory === 'leaveType') {
                    setLeaveTypes(prev => [res.data.leaveType, ...prev]);
                } else if (currentCategory === 'salaryCategory') {
                    setSalaryCategories(prev => [res.data.category, ...prev]);
                }
            }
            setIsModalVisible(false);
        } catch (error) {
            message.error(error.response?.data?.message || `Lỗi khi lưu ${currentCategory}.`);
            console.error(`Error saving ${currentCategory}:`, error.response ? error.response.data : error.message);
        }
    };

    const handleDelete = async (category, id) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            let endpoint = '';

            switch (category) {
                case 'department': endpoint = 'departments'; break;
                case 'position': endpoint = 'positions'; break;
                case 'leaveType': endpoint = 'leave-types'; break;
                case 'salaryCategory': endpoint = 'salary-categories'; break;
                default: throw new Error('Loại danh mục không hợp lệ.');
            }

            await axios.delete(`${API_URL}/${endpoint}/${id}`, config);
            message.success(`Xóa ${category} thành công!`);
            if (category === 'department') {
                setDepartments(prev => prev.filter(dep => dep._id !== id));
            } else if (category === 'position') {
                setPositions(prev => prev.filter(pos => pos._id !== id));
            } else if (category === 'leaveType') {
                setLeaveTypes(prev => prev.filter(lt => lt._id !== id));
            } else if (category === 'salaryCategory') {
                setSalaryCategories(prev => prev.filter(sc => sc._id !== id));
            }
        } catch (error) {
            message.error(error.response?.data?.message || `Lỗi khi xóa ${category}.`);
            console.error(`Error deleting ${category}:`, error.response ? error.response.data : error.message);
        }
    };

    const getModalTitle = () => {
        const action = editingItem ? 'Chỉnh sửa' : 'Thêm mới';
        switch (currentCategory) {
            case 'department': return `${action} Phòng ban`;
            case 'position': return `${action} Chức vụ`;
            case 'leaveType': return `${action} Loại hình nghỉ phép`;
            case 'salaryCategory': return `${action} Loại điều chỉnh lương`;
            default: return 'Cấu hình';
        }
    };

    const getColumns = (category) => {
        const commonActions = (record, cat) => (
            <>
                <Button
                    icon={<Edit2 size={16} />}
                    onClick={() => handleEdit(cat, record)}
                    className="mr-2"
                >
                    Sửa
                </Button>
                <Popconfirm
                    title={`Bạn có chắc chắn muốn xóa ${record.name} này?`}
                    onConfirm={() => handleDelete(cat, record._id)}
                    okText="Có"
                    cancelText="Không"
                >
                    <Button danger icon={<Trash2 size={16} />}>
                        Xóa
                    </Button>
                </Popconfirm>
            </>
        );

        switch (category) {
            case 'departments':
                return [
                    { title: 'Tên Phòng ban', dataIndex: 'name', key: 'name' },
                    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
                    {
                        title: 'Trưởng phòng',
                        dataIndex: 'headOfDepartment',
                        key: 'headOfDepartment',
                        render: (head) => head ? `${head.name} (${head.position || 'Chưa cập nhật'})` : 'Chưa có',
                    },
                    {
                        title: 'Hành động',
                        key: 'actions',
                        render: (_, record) => commonActions(record, 'department'),
                    },
                ];
            case 'positions':
                return [
                    { title: 'Tên Chức vụ', dataIndex: 'name', key: 'name' },
                    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
                    { title: 'Cấp độ', dataIndex: 'level', key: 'level', render: (level) => <Tag color="blue">{level.toUpperCase()}</Tag> },
                    {
                        title: 'Hành động',
                        key: 'actions',
                        render: (_, record) => commonActions(record, 'position'),
                    },
                ];
            case 'leaveTypes':
                return [
                    { title: 'Tên Loại hình', dataIndex: 'name', key: 'name' },
                    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
                    { title: 'Số ngày mặc định', dataIndex: 'defaultDays', key: 'defaultDays' },
                    { title: 'Có lương', dataIndex: 'isPaid', key: 'isPaid', render: (isPaid) => <Tag color={isPaid ? 'green' : 'red'}>{isPaid ? 'Có' : 'Không'}</Tag> },
                    {
                        title: 'Hành động',
                        key: 'actions',
                        render: (_, record) => commonActions(record, 'leaveType'),
                    },
                ];
            case 'salaryCategories':
                return [
                    { title: 'Tên Loại', dataIndex: 'name', key: 'name' },
                    { title: 'Loại điều chỉnh', dataIndex: 'type', key: 'type', render: (type) => <Tag color={type === 'bonus' ? 'green' : 'red'}>{type.toUpperCase()}</Tag> },
                    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
                    {
                        title: 'Hành động',
                        key: 'actions',
                        render: (_, record) => commonActions(record, 'salaryCategory'),
                    },
                ];
            default: return [];
        }
    };

    const getFormFields = (category) => {
        switch (category) {
            case 'department':
                return (
                    <>
                        <Form.Item
                            name="name"
                            label="Tên Phòng ban"
                            rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <TextArea rows={2} />
                        </Form.Item>
                        <Form.Item
                            name="headOfDepartment"
                            label="Trưởng phòng"
                        >
                            {usersList && usersList.length > 0 ? (
                                <Select
                                    showSearch
                                    placeholder="Chọn trưởng phòng (tùy chọn)"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                    allowClear
                                >
                                    {usersList.map(user => (
                                        <Option key={user._id} value={user._id}>
                                            {user.name} ({user.email}) - {user.position}
                                        </Option>
                                    ))}
                                </Select>
                            ) : (
                                <Input placeholder="Đang tải danh sách người dùng..." disabled />
                            )}
                        </Form.Item>
                    </>
                );
            case 'position':
                return (
                    <>
                        <Form.Item
                            name="name"
                            label="Tên Chức vụ"
                            rules={[{ required: true, message: 'Vui lòng nhập tên chức vụ!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <TextArea rows={2} />
                        </Form.Item>
                        <Form.Item
                            name="level"
                            label="Cấp độ"
                            rules={[{ required: true, message: 'Vui lòng chọn cấp độ!' }]}
                        >
                            <Select>
                                <Option value="entry">Mới vào</Option>
                                <Option value="junior">Junior</Option>
                                <Option value="mid">Mid-level</Option>
                                <Option value="senior">Senior</Option>
                                <Option value="lead">Trưởng nhóm</Option>
                                <Option value="manager">Quản lý</Option>
                                <Option value="executive">Giám đốc điều hành</Option>
                                <Option value="none">Không có</Option>
                            </Select>
                        </Form.Item>
                    </>
                );
            case 'leaveType':
                return (
                    <>
                        <Form.Item
                            name="name"
                            label="Tên Loại hình nghỉ phép"
                            rules={[{ required: true, message: 'Vui lòng nhập tên loại hình!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <TextArea rows={2} />
                        </Form.Item>
                        <Form.Item
                            name="defaultDays"
                            label="Số ngày mặc định (năm)"
                            rules={[{ required: true, message: 'Vui lòng nhập số ngày mặc định!' }, { type: 'number', min: 0, message: 'Phải là số không âm!' }]}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            name="isPaid"
                            label="Có lương?"
                            valuePropName="checked"
                        >
                            <Select>
                                <Option value={true}>Có</Option>
                                <Option value={false}>Không</Option>
                            </Select>
                        </Form.Item>
                    </>
                );
            case 'salaryCategory':
                return (
                    <>
                        <Form.Item
                            name="name"
                            label="Tên Loại điều chỉnh"
                            rules={[{ required: true, message: 'Vui lòng nhập tên loại điều chỉnh!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="type"
                            label="Loại (Thưởng/Phạt)"
                            rules={[{ required: true, message: 'Vui lòng chọn loại!' }]}
                        >
                            <Select>
                                <Option value="bonus">Thưởng</Option>
                                <Option value="deduction">Phạt</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <TextArea rows={2} />
                        </Form.Item>
                    </>
                );
            default: return null;
        }
    };

    if (authLoading || loading) {
        return <Spin tip="Đang tải dữ liệu cấu hình..." size="large" className="flex justify-center items-center h-screen" />;
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
                    <Settings size={32} className="mr-3" /> Cấu hình Hệ thống
                </h1>

                <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-6">
                    <TabPane tab={<span className="flex items-center"><Building2 size={18} className="mr-2" />Phòng ban</span>} key="departments">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={() => handleAdd('department')}
                            className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                            Thêm Phòng ban mới
                        </Button>
                        <Table
                            columns={getColumns('departments')}
                            dataSource={departments}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                    <TabPane tab={<span className="flex items-center"><Briefcase size={18} className="mr-2" />Chức vụ</span>} key="positions">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={() => handleAdd('position')}
                            className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                            Thêm Chức vụ mới
                        </Button>
                        <Table
                            columns={getColumns('positions')}
                            dataSource={positions}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                    <TabPane tab={<span className="flex items-center"><CalendarClock size={18} className="mr-2" />Loại hình nghỉ phép</span>} key="leaveTypes">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={() => handleAdd('leaveType')}
                            className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                            Thêm Loại hình nghỉ phép mới
                        </Button>
                        <Table
                            columns={getColumns('leaveTypes')}
                            dataSource={leaveTypes}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                    <TabPane tab={<span className="flex items-center"><DollarSign size={18} className="mr-2" />Loại điều chỉnh lương</span>} key="salaryCategories">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={() => handleAdd('salaryCategory')}
                            className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                            Thêm Loại điều chỉnh lương mới
                        </Button>
                        <Table
                            columns={getColumns('salaryCategories')}
                            dataSource={salaryCategories}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                </Tabs>

                <Modal
                    title={getModalTitle()}
                    visible={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    footer={null}
                    width={600}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        {getFormFields(currentCategory)}
                        <Form.Item className="text-right mt-4">
                            <Button onClick={() => setIsModalVisible(false)} className="mr-2">
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editingItem ? "Cập nhật" : "Thêm mới"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyCauHinh;
