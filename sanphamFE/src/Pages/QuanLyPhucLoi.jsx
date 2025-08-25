import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Form, Input, Select, DatePicker, Popconfirm, Tag, InputNumber, Radio } from 'antd';
import { PlusCircle, Trash2, Edit2, Award } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; 

const { Option } = Select;

const API_URL = 'http://localhost:5000/api/auth';

const QuanLyPhucLoi = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [benefitPolicies, setBenefitPolicies] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null); 
    const [form] = Form.useForm();

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
        }
    }, [authLoading, isAdmin]);

    const fetchBenefitPolicies = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/benefit-policies/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBenefitPolicies(res.data.policies);
        } catch (error) {
            message.error('Lỗi khi tải chính sách phúc lợi.');
            console.error('Error fetching benefit policies:', error.response ? error.response.data : error.message);
            setBenefitPolicies([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    useEffect(() => {
        fetchBenefitPolicies();
    }, [fetchBenefitPolicies]);

    const handleAddPolicy = () => {
        setEditingPolicy(null);
        form.resetFields();
        form.setFieldsValue({ 
            isMonetary: false,
            type: 'other' 
        });
        setIsModalVisible(true);
    };

    const handleEditPolicy = (policy) => {
        setEditingPolicy(policy);
        form.setFieldsValue({
            ...policy,
            effectiveDate: policy.effectiveDate ? moment(policy.effectiveDate) : null,
            endDate: policy.endDate ? moment(policy.endDate) : null,
        });
        setIsModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const payload = {
                ...values,
                effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD') : null,
                endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
                value: values.value || 0, // Đảm bảo giá trị là số
                isMonetary: values.isMonetary || false, // Đảm bảo giá trị là boolean
            };

            if (editingPolicy) {
                await axios.put(`${API_URL}/benefit-policies/${editingPolicy._id}`, payload, config);
                message.success('Cập nhật chính sách phúc lợi thành công!');
            } else {
                await axios.post(`${API_URL}/benefit-policies`, payload, config);
                message.success('Thêm chính sách phúc lợi thành công!');
            }
            setIsModalVisible(false);
            fetchBenefitPolicies(); // Tải lại dữ liệu
        } catch (error) {
            message.error('Lỗi khi lưu chính sách phúc lợi.');
            console.error('Error saving benefit policy:', error.response ? error.response.data : error.message);
        }
    };

    const handleDeletePolicy = async (policyId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/benefit-policies/${policyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Xóa chính sách phúc lợi thành công!');
            fetchBenefitPolicies(); // Tải lại dữ liệu
        } catch (error) {
            message.error('Lỗi khi xóa chính sách phúc lợi.');
            console.error('Error deleting benefit policy:', error.response ? error.response.data : error.message);
        }
    };

    const getPolicyTypeColor = (type) => {
        switch (type) {
            case 'health_insurance': return 'blue';
            case 'transport_allowance': return 'purple';
            case 'meal_allowance': return 'orange';
            case 'paid_leave': return 'green';
            case 'bonus': return 'gold';
            case 'training_development': return 'cyan';
            case 'wellness_program': return 'magenta';
            default: return 'default';
        }
    };

    const columns = [
        { title: 'Tên chính sách', dataIndex: 'name', key: 'name' },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (
                <Tag color={getPolicyTypeColor(type)}>
                    {type.replace(/_/g, ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Giá trị',
            dataIndex: 'value',
            key: 'value',
            render: (text, record) => {
                if (text === undefined || text === null) return 'N/A';
                return `${text.toLocaleString('vi-VN')} ${record.isMonetary ? 'VND' : ''}`;
            },
        },
        {
            title: 'Tiền tệ',
            dataIndex: 'isMonetary',
            key: 'isMonetary',
            render: (isMonetary) => (isMonetary ? <Tag color="geekblue">Có</Tag> : <Tag>Không</Tag>),
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            render: (date) => format(new Date(date), 'dd/MM/yyyy', { locale: vi }),
        },
        {
            title: 'Ngày kết thúc',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => (date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : 'Vô thời hạn'),
        },
        { title: 'Tiêu chí đủ điều kiện', dataIndex: 'eligibilityCriteria', key: 'eligibilityCriteria' },
        {
            title: 'Người tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            render: (createdBy) => createdBy ? `${createdBy.name} (${createdBy.email})` : 'N/A',
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Button
                        icon={<Edit2 size={16} />}
                        onClick={() => handleEditPolicy(record)}
                        className="mr-2"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa chính sách này?"
                        onConfirm={() => handleDeletePolicy(record._id)}
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
        return <Spin tip="Đang tải dữ liệu..." size="large" className="flex justify-center items-center h-screen" />;
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
                    <Award size={32} className="mr-3" /> Quản lý Chính sách Phúc lợi
                </h1>

                <Button
                    type="primary"
                    icon={<PlusCircle size={18} />}
                    onClick={handleAddPolicy}
                    className="mb-4 bg-green-500 hover:bg-green-600"
                >
                    Thêm Chính sách Phúc lợi Mới
                </Button>

                <Table
                    columns={columns}
                    dataSource={benefitPolicies}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />

                <Modal
                    title={editingPolicy ? "Chỉnh sửa Chính sách Phúc lợi" : "Thêm Chính sách Phúc lợi Mới"}
                    visible={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="name"
                            label="Tên chính sách"
                            rules={[{ required: true, message: 'Vui lòng nhập tên chính sách!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item
                            name="type"
                            label="Loại phúc lợi"
                            rules={[{ required: true, message: 'Vui lòng chọn loại phúc lợi!' }]}
                        >
                            <Select placeholder="Chọn loại phúc lợi">
                                <Option value="health_insurance">Bảo hiểm y tế</Option>
                                <Option value="transport_allowance">Trợ cấp đi lại</Option>
                                <Option value="meal_allowance">Trợ cấp ăn uống</Option>
                                <Option value="paid_leave">Nghỉ phép có lương</Option>
                                <Option value="bonus">Thưởng</Option>
                                <Option value="training_development">Đào tạo & Phát triển</Option>
                                <Option value="wellness_program">Chương trình chăm sóc sức khỏe</Option>
                                <Option value="other">Khác</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="isMonetary"
                            label="Phúc lợi tiền tệ?"
                            initialValue={false}
                        >
                            <Radio.Group>
                                <Radio value={true}>Có</Radio>
                                <Radio value={false}>Không</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="value"
                            label="Giá trị (nếu có, VND)"
                            rules={[{ type: 'number', min: 0, message: 'Giá trị phải là số không âm!' }]}
                            initialValue={0}
                        >
                             <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/,*/g, '')}
                            />
                        </Form.Item>
                        <Form.Item
                            name="effectiveDate"
                            label="Ngày hiệu lực"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item
                            name="endDate"
                            label="Ngày kết thúc (tùy chọn)"
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item
                            name="eligibilityCriteria"
                            label="Tiêu chí đủ điều kiện"
                        >
                            <Input.TextArea rows={2} placeholder="Ví dụ: Tất cả nhân viên, Nhân viên toàn thời gian, Sau 6 tháng làm việc..." />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                {editingPolicy ? "Cập nhật" : "Thêm mới"}
                            </Button>
                            <Button onClick={() => setIsModalVisible(false)}>
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyPhucLoi;
