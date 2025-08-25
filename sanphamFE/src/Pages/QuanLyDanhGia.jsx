import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Empty, Tag, Tabs, Form, Input, Radio, Checkbox, DatePicker, Rate, Select, Popconfirm, InputNumber } from 'antd'; // Thêm InputNumber
import { Eye, History, FileText, Calendar, Clock, User as UserIcon, Filter, CheckCircle, PlusCircle, Trash2 } from 'lucide-react'; // Import các icon cần thiết
import axios from 'axios';
import { format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5000/api/auth';

const QuanLyDanhGia = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm(); 
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [formsCreatedByAdmin, setFormsCreatedByAdmin] = useState([]); 
    const [loadingForms, setLoadingForms] = useState(true);
    const [isCreateFormModalVisible, setIsCreateFormModalVisible] = useState(false);
    const [formToDelete, setFormToDelete] = useState(null);
    const [isDeleteFormModalVisible, setIsDeleteFormModalVisible] = useState(false);

    const [allEvaluationResponses, setAllEvaluationResponses] = useState([]); 
    const [filteredResponses, setFilteredResponses] = useState([]); 
    const [loadingResponses, setLoadingResponses] = useState(true);
    const [isResponseDetailModalVisible, setIsResponseDetailModalVisible] = useState(false);
    const [selectedResponseDetail, setSelectedResponseDetail] = useState(null); 
    const [loadingResponseUpdate, setLoadingResponseUpdate] = useState(false);

    const [activeTab, setActiveTab] = useState('manageForms'); 

    // State cho filter
    const [filterUserName, setFilterUserName] = useState('');
    const [filterUserEmail, setFilterUserEmail] = useState('');
    const [filterDate, setFilterDate] = useState(null); 

    // Hàm lấy các bản đánh giá do admin hiện tại tạo
    const fetchAdminCreatedForms = useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        setLoadingForms(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/evaluation-forms/my-created`, config);
            setFormsCreatedByAdmin(res.data);
        } catch (error) {
            console.error('Lỗi khi tải các bản đánh giá đã tạo:', error);
            message.error(error.response?.data?.message || 'Không thể tải các bản đánh giá đã tạo.');
        } finally {
            setLoadingForms(false);
        }
    }, [user]);

    // Hàm lấy tất cả các phản hồi cho các bản đánh giá do admin hiện tại tạo
    const fetchAllEvaluationResponses = useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        setLoadingResponses(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/evaluation-responses/admin/all`, config);
            setAllEvaluationResponses(res.data);
            setFilteredResponses(res.data);
        } catch (error) {
            console.error('Lỗi khi tải tất cả phản hồi đánh giá:', error);
            message.error(error.response?.data?.message || 'Không thể tải tất cả phản hồi đánh giá.');
        } finally {
            setLoadingResponses(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAdminCreatedForms();
            fetchAllEvaluationResponses();
        }
    }, [user, authLoading, fetchAdminCreatedForms, fetchAllEvaluationResponses]);

    useEffect(() => {
        const applyFilters = () => {
            let tempResponses = [...allEvaluationResponses];

            if (filterUserName) {
                tempResponses = tempResponses.filter(response =>
                    response.userName && response.userName.toLowerCase().includes(filterUserName.toLowerCase())
                );
            }
            if (filterUserEmail) {
                tempResponses = tempResponses.filter(response =>
                    response.userEmail && response.userEmail.toLowerCase().includes(filterUserEmail.toLowerCase())
                );
            }
            if (filterDate) {
                const filterDateFormatted = format(new Date(filterDate), 'yyyy-MM-dd');
                tempResponses = tempResponses.filter(response =>
                    response.createdAt && format(new Date(response.createdAt), 'yyyy-MM-dd') === filterDateFormatted
                );
            }
            setFilteredResponses(tempResponses);
        };
        applyFilters();
    }, [filterUserName, filterUserEmail, filterDate, allEvaluationResponses]);


    const showCreateFormModal = () => {
        form.resetFields();
        setIsCreateFormModalVisible(true);
    };

    const handleCreateFormCancel = () => {
        setIsCreateFormModalVisible(false);
        form.resetFields();
    };

    const onFinishCreateForm = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingSubmit(false);
            return;
        }

        // Chuyển đổi dueDate từ moment object sang Date object
        const dueDate = values.dueDate ? values.dueDate.toDate() : null;

        // Lấy questions trực tiếp từ values của form (được Ant Design Form.List tự động điền)
        const questions = [];
        let hasValidationError = false;

        if (!values.questions || values.questions.length === 0) {
            message.error('Vui lòng thêm ít nhất một câu hỏi.');
            setLoadingSubmit(false);
            return;
        }

        values.questions.forEach((q, index) => {
            if (!q) {
                message.error(`Câu hỏi ${index + 1}: Dữ liệu câu hỏi không hợp lệ.`);
                hasValidationError = true;
                return;
            }

            if (!q.questionText || q.questionText.trim() === '' || !q.questionType || q.questionType.trim() === '') {
                message.error(`Câu hỏi ${index + 1}: Vui lòng nhập nội dung và chọn loại câu hỏi.`);
                hasValidationError = true;
                return; 
            }

            const questionData = {
                questionText: q.questionText,
                questionType: q.questionType,
                isRequired: q.isRequired || false,
            };

            if (questionData.questionType === 'radio' || questionData.questionType === 'checkbox') {
                questionData.options = q.options ? q.options.map(opt => opt.optionText.trim()).filter(opt => opt !== '') : [];
                if (questionData.options.length === 0) {
                    message.error(`Câu hỏi ${index + 1}: Vui lòng thêm ít nhất một lựa chọn cho câu hỏi loại "${questionData.questionType}".`);
                    hasValidationError = true;
                    return;
                }
            }
            if (questionData.questionType === 'number' || questionData.questionType === 'rating') {
                questionData.min = q.min !== undefined ? Number(q.min) : null;
                questionData.max = q.max !== undefined ? Number(q.max) : null;
            }
            questions.push(questionData);
        });

        if (hasValidationError) {
            setLoadingSubmit(false);
            return; 
        }

        const payload = {
            title: values.title,
            description: values.description,
            dueDate: dueDate,
            questions: questions,
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2)); 

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.post(`${API_URL}/evaluation-forms`, payload, config);
            message.success('Tạo bản đánh giá thành công!');
            handleCreateFormCancel();
            fetchAdminCreatedForms(); 
            fetchAllEvaluationResponses(); 
        } catch (error) {
            message.error(error.response?.data?.message || 'Tạo bản đánh giá thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const showDeleteFormConfirmModal = (record) => {
        setFormToDelete(record);
        setIsDeleteFormModalVisible(true);
    };

    const handleDeleteForm = async () => {
        if (!formToDelete) return;

        setLoadingForms(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.delete(`${API_URL}/evaluation-forms/${formToDelete._id}`, config);
            message.success('Bản đánh giá đã được xóa thành công.');
            setIsDeleteFormModalVisible(false);
            setFormToDelete(null);
            fetchAdminCreatedForms(); 
            fetchAllEvaluationResponses(); 
        } catch (error) {
            console.error('Lỗi khi xóa bản đánh giá:', error);
            message.error(error.response?.data?.message || 'Xóa bản đánh giá thất bại.');
        } finally {
            setLoadingForms(false);
        }
    };

    const showResponseDetailModal = async (response) => {
        setLoadingResponses(true); 
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/evaluation-responses/${response._id}`, config);
            setSelectedResponseDetail(res.data);
            setIsResponseDetailModalVisible(true);
        } catch (error) {
            console.error('Lỗi khi tải chi tiết phản hồi:', error);
            message.error(error.response?.data?.message || 'Không thể tải chi tiết phản hồi.');
        } finally {
            setLoadingResponses(false);
        }
    };

    const handleResponseDetailCancel = () => {
        setIsResponseDetailModalVisible(false);
        setSelectedResponseDetail(null);
    };

    const markResponseAsReceived = async (responseId) => {
        setLoadingResponseUpdate(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.put(`${API_URL}/evaluation-responses/${responseId}/mark-received`, {}, config);
            message.success('Phản hồi đã được đánh dấu là đã nhận.');
            fetchAllEvaluationResponses(); // Cập nhật lại danh sách phản hồi
            // Nếu modal chi tiết đang mở, đóng nó lại
            if (isResponseDetailModalVisible) {
                setIsResponseDetailModalVisible(false);
                setSelectedResponseDetail(null);
            }
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã nhận:', error);
            message.error(error.response?.data?.message || 'Đánh dấu đã nhận thất bại.');
        } finally {
            setLoadingResponseUpdate(false);
        }
    };

    // Hàm thêm câu hỏi mới vào form tạo bản đánh giá
    const addQuestionField = (add) => { // Nhận 'add' từ Form.List
        add({ questionType: 'text' }); // Thêm một câu hỏi mới với loại mặc định là 'text'
    };

    // Hàm xóa câu hỏi khỏi form tạo bản đánh giá
    const removeQuestionField = (remove, name) => { // Nhận 'remove' và 'name' từ Form.List
        remove(name);
    };


    const formsColumns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            width: 180, 
            ellipsis: true,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 250, 
            ellipsis: true,
        },
        {
            title: 'Người tạo',
            dataIndex: 'creatorName',
            key: 'creatorName',
            width: 150, 
            render: (text, record) => (
                <span>
                    {record.createdBy?.name || 'N/A'} {record.createdBy?.position ? `(${record.createdBy.position})` : ''}
                </span>
            ),
        },
        {
            title: 'Thời hạn',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 150, 
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 150, 
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 120,
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 100, 
            fixed: 'right',
            render: (text, record) => (
                <Popconfirm
                    title="Bạn có chắc chắn muốn xóa bản đánh giá này?"
                    description="Thao tác này không thể hoàn tác và chỉ có thể thực hiện nếu chưa có phản hồi nào."
                    onConfirm={() => showDeleteFormConfirmModal(record)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    disabled={record.responsesCount > 0}
                >
                    <Button
                        type="primary"
                        danger
                        icon={<Trash2 size={16} />}
                        className="bg-red-500 hover:bg-red-600 rounded-lg"
                        title={record.responsesCount > 0 ? "Không thể xóa (đã có phản hồi)" : "Xóa bản đánh giá"}
                        disabled={record.responsesCount > 0}
                    />
                </Popconfirm>
            ),
        },
    ];

    const responsesColumns = [
        {
            title: 'Tiêu đề bản đánh giá',
            dataIndex: ['form', 'title'],
            key: 'formTitle',
            width: 200, 
            ellipsis: true,
            render: (text, record) => record.form?.title || 'N/A',
        },
        {
            title: 'Người trả lời',
            dataIndex: 'userName',
            key: 'userName',
            width: 150, 
            render: (text, record) => (
                <span>
                    {record.user?.name || 'N/A'} {record.user?.position ? `(${record.user.position})` : ''}
                    {record.user?.email && <><br /><small className="text-gray-500">{record.user.email}</small></>}
                </span>
            ),
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 150, 
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130, 
            render: (status) => {
                let color = 'gold';
                let text = 'Đang chờ Admin xem';
                if (status === 'received') {
                    color = 'green';
                    text = 'Đã nhận';
                }
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 100, 
            fixed: 'right', 
            render: (text, record) => (
                <div className="flex space-x-2">
                    <Button
                        type="default"
                        icon={<Eye size={16} />}
                        onClick={() => showResponseDetailModal(record)}
                        className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                        title="Xem chi tiết"
                    />
                    {record.status === 'pending' && (
                        <Button
                            type="primary"
                            icon={<CheckCircle size={16} />}
                            onClick={() => markResponseAsReceived(record._id)}
                            className="bg-green-500 hover:bg-green-600 rounded-lg"
                            title="Đánh dấu đã nhận"
                            loading={loadingResponseUpdate}
                        />
                    )}
                </div>
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

    if (!user) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn cần đăng nhập để truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] mb-4">
                        Quản Lý Đánh Giá
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Quản lý các bản đánh giá và phản hồi.
                    </p>
                </div>

                <div className="w-full max-w-7xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <Tabs defaultActiveKey="manageForms" activeKey={activeTab} onChange={setActiveTab} centered>
                        <TabPane tab={<span><FileText size={16} className="inline-block mr-2" />Quản lý Bản Đánh Giá</span>} key="manageForms">
                            <div className="flex justify-end mb-6">
                                <Button
                                    type="primary"
                                    icon={<PlusCircle size={18} />}
                                    onClick={showCreateFormModal}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                    Tạo Bản Đánh Giá Mới
                                </Button>
                            </div>
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Các Bản Đánh Giá Đã Tạo</h2>
                            {loadingForms ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải bản đánh giá..." />
                                </div>
                            ) : formsCreatedByAdmin.length > 0 ? (
                                <Table
                                    columns={formsColumns}
                                    dataSource={formsCreatedByAdmin} // responsesCount đã được thêm vào đây từ backend
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Bạn chưa tạo bản đánh giá nào." />
                            )}
                        </TabPane>
                        <TabPane tab={<span><History size={16} className="inline-block mr-2" />Quản lý Phản Hồi</span>} key="manageResponses">
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Danh Sách Phản Hồi Đánh Giá</h2>
                            <div className="mb-6 p-4 border rounded-lg bg-gray-50 flex flex-wrap gap-4 items-end">
                                <Form layout="vertical" className="flex-grow">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Form.Item label="Lọc theo tên người trả lời">
                                            <Input
                                                placeholder="Nhập tên"
                                                value={filterUserName}
                                                onChange={(e) => setFilterUserName(e.target.value)}
                                            />
                                        </Form.Item>
                                        <Form.Item label="Lọc theo email người trả lời">
                                            <Input
                                                placeholder="Nhập email"
                                                value={filterUserEmail}
                                                onChange={(e) => setFilterUserEmail(e.target.value)}
                                            />
                                        </Form.Item>
                                        <Form.Item label="Lọc theo ngày gửi">
                                            <DatePicker
                                                format="DD/MM/YYYY"
                                                placeholder="Chọn ngày"
                                                value={filterDate}
                                                onChange={(date) => setFilterDate(date)}
                                                className="w-full"
                                            />
                                        </Form.Item>
                                    </div>
                                </Form>
                                <Button
                                    type="default"
                                    icon={<Filter size={16} />}
                                    onClick={() => {
                                        setFilterUserName('');
                                        setFilterUserEmail('');
                                        setFilterDate(null);
                                    }}
                                    className="rounded-lg border-gray-400 text-gray-600 hover:text-gray-700 hover:border-gray-500"
                                >
                                    Xóa bộ lọc
                                </Button>
                            </div>
                            {loadingResponses ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải phản hồi đánh giá..." />
                                </div>
                            ) : filteredResponses.length > 0 ? (
                                <Table
                                    columns={responsesColumns}
                                    dataSource={filteredResponses}
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Không có phản hồi đánh giá nào." />
                            )}
                        </TabPane>
                    </Tabs>
                </div>
            </div>

            {/* Modal tạo bản đánh giá mới */}
            <Modal
                title="Tạo Bản Đánh Giá Mới"
                open={isCreateFormModalVisible}
                onCancel={handleCreateFormCancel}
                footer={null}
                width={900}
                destroyOnClose={true} // Đảm bảo form được reset khi đóng
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinishCreateForm}
                    className="mt-4"
                >
                    <Form.Item
                        name="title"
                        label="Tiêu đề bản đánh giá"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề bản đánh giá!' }]}
                    >
                        <Input placeholder="Ví dụ: Đánh giá hiệu suất quý 3 năm 2025" />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Mô tả"
                    >
                        <TextArea rows={3} placeholder="Mô tả chi tiết về bản đánh giá này" />
                    </Form.Item>
                    <Form.Item
                        name="dueDate"
                        label="Thời hạn hoàn thành"
                        rules={[{ required: true, message: 'Vui lòng chọn thời hạn!' }]}
                    >
                        <DatePicker
                            showTime
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Chọn ngày và giờ"
                            className="w-full"
                        />
                    </Form.Item>

                    <h3 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Các câu hỏi</h3>
                    <Form.List name="questions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map((field, index) => {
                                    const questionType = form.getFieldValue(['questions', field.name, 'questionType']);

                                    return (
                                        <div key={field.key} className="mb-6 p-4 border rounded-lg bg-gray-50 relative">
                                            <Button
                                                type="text"
                                                danger
                                                onClick={() => removeQuestionField(remove, field.name)}
                                                className="absolute top-2 right-2"
                                                icon={<Trash2 size={16} />}
                                                title="Xóa câu hỏi"
                                            />
                                            <h4 className="text-lg font-semibold mb-2">Câu hỏi {index + 1}</h4>
                                            <Form.Item
                                                label="Loại câu hỏi"
                                                name={[field.name, 'questionType']}
                                                fieldKey={[field.fieldKey, 'questionType']}
                                                rules={[{ required: true, message: 'Vui lòng chọn loại câu hỏi!' }]}
                                                initialValue="text" // Đảm bảo giá trị ban đầu được thiết lập
                                            >
                                                <Select
                                                    placeholder="Chọn loại câu hỏi"
                                                    onChange={(value) => {
                                                        // Khi thay đổi loại câu hỏi, reset các trường liên quan
                                                        form.setFieldsValue({
                                                            questions: form.getFieldValue('questions').map((qItem, qIndex) => {
                                                                if (qIndex === index) { // Chỉ cập nhật câu hỏi hiện tại
                                                                    return {
                                                                        ...qItem,
                                                                        questionType: value,
                                                                        options: undefined, // Reset options
                                                                        min: undefined,     // Reset min
                                                                        max: undefined,     // Reset max
                                                                    };
                                                                }
                                                                return qItem;
                                                            })
                                                        });
                                                    }}
                                                >
                                                    <Option value="text">Văn bản ngắn</Option>
                                                    <Option value="textarea">Văn bản dài</Option>
                                                    <Option value="radio">Chọn một (Radio)</Option>
                                                    <Option value="checkbox">Chọn nhiều (Checkbox)</Option>
                                                    <Option value="number">Số</Option>
                                                    <Option value="rating">Đánh giá (Sao)</Option>
                                                </Select>
                                            </Form.Item>

                                            <Form.Item
                                                name={[field.name, 'questionText']}
                                                rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi!' }]}
                                                fieldKey={[field.fieldKey, 'questionText']}
                                            >
                                                <Input placeholder="Nội dung câu hỏi (ví dụ: Tên của bạn là gì?)" />
                                            </Form.Item>

                                            {(questionType === 'radio' || questionType === 'checkbox') && (
                                                <Form.List name={[field.name, 'options']}>
                                                    {(optionFields, { add: addOption, remove: removeOption }) => (
                                                        <>
                                                            {optionFields.map((optionField, optionIndex) => (
                                                                <div key={optionField.key} className="flex items-center space-x-2 mb-2">
                                                                    <Form.Item
                                                                        name={[optionField.name, 'optionText']}
                                                                        fieldKey={[optionField.fieldKey, 'optionText']}
                                                                        rules={[{ required: true, message: 'Vui lòng nhập lựa chọn!' }]}
                                                                        className="flex-grow mb-0" 
                                                                    >
                                                                        <Input placeholder={`Lựa chọn ${optionIndex + 1}`} />
                                                                    </Form.Item>
                                                                    {optionFields.length > 0 && (
                                                                        <Button
                                                                            type="text"
                                                                            danger
                                                                            icon={<Trash2 size={16} />}
                                                                            onClick={() => removeOption(optionField.name)}
                                                                            title="Xóa lựa chọn"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <Form.Item>
                                                                <Button
                                                                    type="dashed"
                                                                    onClick={() => addOption({ optionText: '' })} // Thêm một lựa chọn mới với giá trị rỗng
                                                                    block
                                                                    icon={<PlusCircle size={16} />}
                                                                >
                                                                    Thêm lựa chọn
                                                                </Button>
                                                            </Form.Item>
                                                        </>
                                                    )}
                                                </Form.List>
                                            )}
                                            {(questionType === 'number' || questionType === 'rating') && (
                                                <div className="flex space-x-2">
                                                    <Form.Item name={[field.name, 'min']} label="Min" className="flex-1" fieldKey={[field.fieldKey, 'min']}>
                                                        <Input type="number" placeholder="Min" />
                                                    </Form.Item>
                                                    <Form.Item name={[field.name, 'max']} label="Max" className="flex-1" fieldKey={[field.fieldKey, 'max']}>
                                                        <Input type="number" placeholder="Max" />
                                                    </Form.Item>
                                                </div>
                                            )}

                                            <Form.Item name={[field.name, 'isRequired']} valuePropName="checked" fieldKey={[field.fieldKey, 'isRequired']}>
                                                <Checkbox>Bắt buộc</Checkbox>
                                            </Form.Item>
                                        </div>
                                    );
                                })}
                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ questionType: 'text' })} // Thêm một câu hỏi mới với loại mặc định là 'text'
                                        block
                                        icon={<PlusCircle size={16} />}
                                    >
                                        Thêm câu hỏi
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                            Tạo Bản Đánh Giá
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal xác nhận xóa bản đánh giá */}
            <Modal
                title="Xác nhận xóa bản đánh giá"
                open={isDeleteFormModalVisible}
                onOk={handleDeleteForm}
                onCancel={() => setIsDeleteFormModalVisible(false)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
            >
                <p>Bạn có chắc chắn muốn xóa bản đánh giá này không?</p>
                {formToDelete && (
                    <p>Tiêu đề: <strong>"{formToDelete.title}"</strong></p>
                )}
                <p className="text-red-500 mt-2">Lưu ý: Bạn chỉ có thể xóa bản đánh giá nếu chưa có bất kỳ phản hồi nào từ người dùng.</p>
            </Modal>

            {/* Modal xem chi tiết phản hồi */}
            <Modal
                title={selectedResponseDetail?.userName ? `Chi tiết phản hồi từ: ${selectedResponseDetail.userName} (${selectedResponseDetail.userEmail})` : "Chi tiết phản hồi"}
                open={isResponseDetailModalVisible}
                onCancel={handleResponseDetailCancel}
                footer={[
                    <Button key="close" onClick={handleResponseDetailCancel} className="rounded-lg">
                        Đóng
                    </Button>,
                    selectedResponseDetail?.status === 'pending' && (
                        <Button
                            key="markReceived"
                            type="primary"
                            onClick={() => markResponseAsReceived(selectedResponseDetail._id)}
                            loading={loadingResponseUpdate}
                            className="bg-green-600 hover:bg-green-700 rounded-lg"
                        >
                            Đánh dấu đã nhận
                        </Button>
                    ),
                ]}
                width={800}
            >
                {selectedResponseDetail ? (
                    <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Thông tin bản đánh giá</h3>
                        <p className="flex items-center mb-2"><FileText size={18} className="mr-2 text-blue-500" /> <strong>Tiêu đề:</strong>&nbsp;{selectedResponseDetail.form?.title || 'N/A'}</p>
                        <p className="flex items-center mb-2">
                            <span className="flex items-center">
                                <UserIcon size={16} className="inline-block mr-1 text-blue-500" /> 
                                <strong>Người tạo:</strong>&nbsp; 
                                {selectedResponseDetail.form.createdBy?.name || 'N/A'}
                                {selectedResponseDetail.form.createdBy?.position ? ` (${selectedResponseDetail.form.createdBy.position})` : ''}
                            </span>
                        </p>
                        <p className="flex items-center mb-2"><Calendar size={18} className="mr-2 text-blue-500" /> <strong>Thời hạn form:</strong>&nbsp;{selectedResponseDetail.form?.dueDate ? format(new Date(selectedResponseDetail.form.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
                        <p className="flex items-center mb-2"><Clock size={18} className="mr-2 text-blue-500" /> <strong>Ngày gửi phản hồi:</strong>&nbsp;{selectedResponseDetail.createdAt ? format(new Date(selectedResponseDetail.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
                        <p className="flex items-center mb-4"><strong>Trạng thái phản hồi:</strong>&nbsp;
                            {selectedResponseDetail.status === 'pending' ? <Tag color="gold">Đang chờ Admin xem</Tag> : <Tag color="green">Đã nhận</Tag>}
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Các câu trả lời</h3>
                        {selectedResponseDetail.answers.length > 0 ? (
                            selectedResponseDetail.answers.map((ans, index) => (
                                <div key={index} className="mb-4 p-3 border rounded-lg bg-gray-50">
                                    <p className="font-medium text-gray-700">{index + 1}. {ans.questionText}</p>
                                    <p className="text-gray-900 mt-1">
                                        Trả lời:&nbsp;
                                        {Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <Empty description="Không có câu trả lời nào." />
                        )}
                    </div>
                ) : (
                    <Spin tip="Đang tải chi tiết phản hồi..." />
                )}
            </Modal>
        </SBNV>
    );
};

export default QuanLyDanhGia;
