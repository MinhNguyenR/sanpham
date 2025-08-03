// frontend/src/Pages/DanhGia.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Empty, Tag, Tabs, Form, Input, Radio, Checkbox, DatePicker, Rate, InputNumber } from 'antd'; // Thêm InputNumber
import { Eye, Send, History, FileText, Calendar, Clock, User as UserIcon, Mail as MailIcon, Phone as PhoneIcon } from 'lucide-react';
import axios from 'axios';
import { format, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; // Sử dụng moment cho DatePicker của Ant Design

const { TextArea } = Input;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5000/api/auth';

const DanhGia = () => {
    const { user, loading: authLoading } = useAuth();
    const [availableForms, setAvailableForms] = useState([]); // Các bản đánh giá có sẵn để làm
    const [submittedResponses, setSubmittedResponses] = useState([]); // Lịch sử các bản đã làm
    const [loadingForms, setLoadingForms] = useState(true);
    const [loadingResponses, setLoadingResponses] = useState(true);
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [isResponseDetailModalVisible, setIsResponseDetailModalVisible] = useState(false);
    const [selectedForm, setSelectedForm] = useState(null); // Bản đánh giá đang được làm
    const [selectedResponse, setSelectedResponse] = useState(null); // Bản trả lời đang được xem chi tiết
    const [form] = Form.useForm(); // Form cho việc làm bài đánh giá
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [activeTab, setActiveTab] = useState('availableForms'); // Mặc định tab bản đánh giá có sẵn

    // Hàm lấy các bản đánh giá có sẵn cho user
    const fetchAvailableForms = useCallback(async () => {
        if (!user) return;
        setLoadingForms(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            // Gọi API mới để lấy các bản đánh giá có sẵn cho người dùng
            const res = await axios.get(`${API_URL}/evaluation-forms/available`, config);
            console.log('API response for available forms:', res.data); // Thêm dòng này để kiểm tra dữ liệu
            setAvailableForms(res.data);
        } catch (error) {
            console.error('Lỗi khi tải các bản đánh giá có sẵn:', error.response?.data || error.message);
            message.error(error.response?.data?.message || 'Không thể tải các bản đánh giá có sẵn.');
        } finally {
            setLoadingForms(false);
        }
    }, [user]);

    // Hàm lấy lịch sử các bản đánh giá đã gửi của user
    const fetchSubmittedResponses = useCallback(async () => {
        if (!user) return;
        setLoadingResponses(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/evaluation-responses/me`, config);
            setSubmittedResponses(res.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử phản hồi đánh giá:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch sử phản hồi đánh giá.');
        } finally {
            setLoadingResponses(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchAvailableForms();
            fetchSubmittedResponses();
        }
    }, [user, authLoading, fetchAvailableForms, fetchSubmittedResponses]);

    const showFormModal = async (formId) => {
        setLoadingForms(true); // Tạm thời hiển thị loading khi fetch form chi tiết
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            // Lấy chi tiết form từ API
            const res = await axios.get(`${API_URL}/evaluation-forms/${formId}`, config);
            setSelectedForm(res.data);
            form.resetFields(); // Reset form trước khi mở modal mới
            setIsFormModalVisible(true);
        } catch (error) {
            console.error('Lỗi khi tải chi tiết bản đánh giá:', error);
            message.error(error.response?.data?.message || 'Không thể tải chi tiết bản đánh giá.');
        } finally {
            setLoadingForms(false);
        }
    };

    const handleFormModalCancel = () => {
        setIsFormModalVisible(false);
        setSelectedForm(null);
        form.resetFields();
    };

    const onFinishForm = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token || !selectedForm) {
            message.error('Lỗi xác thực hoặc không có bản đánh giá được chọn.');
            setLoadingSubmit(false);
            return;
        }

        const answers = selectedForm.questions.map(q => {
            let answerValue = values[`question_${q._id}`];

            // Handle "Other" option for radio/checkbox
            if ((q.questionType === 'radio' || q.questionType === 'checkbox') && q.options.includes('Khác')) {
                const otherText = values[`question_${q._id}_other`];
                if (Array.isArray(answerValue) && answerValue.includes('Khác') && otherText) {
                    // For checkbox, append "Other: [text]"
                    answerValue = answerValue.filter(opt => opt !== 'Khác'); // Remove 'Khác' itself
                    answerValue.push(`Khác: ${otherText}`);
                } else if (answerValue === 'Khác' && otherText) {
                    // For radio, replace 'Khác' with "Other: [text]"
                    answerValue = `Khác: ${otherText}`;
                }
            }

            return {
                questionId: q._id,
                questionText: q.questionText,
                answer: answerValue, // Lấy câu trả lời theo tên trường động
            };
        });

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.post(`${API_URL}/evaluation-forms/${selectedForm._id}/submit-response`, { answers }, config);
            message.success('Bạn đã gửi bản đánh giá thành công!');
            handleFormModalCancel();
            fetchAvailableForms(); // Cập nhật lại danh sách các form có sẵn
            fetchSubmittedResponses(); // Cập nhật lại lịch sử đã gửi
        } catch (error) {
            console.error('Lỗi khi gửi bản đánh giá:', error);
            message.error(error.response?.data?.message || 'Gửi bản đánh giá thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const showResponseDetailModal = (response) => {
        setSelectedResponse(response);
        setIsResponseDetailModalVisible(true);
    };

    const handleResponseDetailModalCancel = () => {
        setIsResponseDetailModalVisible(false);
        setSelectedResponse(null);
    };

    const availableFormsColumns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            width: 250,
            ellipsis: true,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 300,
            ellipsis: true,
        },
        {
            title: 'Người tạo',
            dataIndex: 'creatorName', // Trường này cần được populate từ backend
            key: 'creatorName',
            width: 150,
            render: (text, record) => record.createdBy?.name || 'N/A', // Đảm bảo hiển thị tên người tạo
        },
        {
            title: 'Thời hạn',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 180,
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 120,
            render: (text, record) => (
                <Button
                    type="primary"
                    icon={<FileText size={16} />}
                    onClick={() => showFormModal(record._id)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                    disabled={isPast(new Date(record.dueDate))} // Vô hiệu hóa nếu quá thời hạn
                >
                    Làm bài
                </Button>
            ),
        },
    ];

    const submittedResponsesColumns = [
        {
            title: 'Tiêu đề bản đánh giá',
            dataIndex: ['form', 'title'],
            key: 'formTitle',
            width: 250,
            ellipsis: true,
            render: (text, record) => record.form?.title || 'N/A',
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 180,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
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
            width: 120,
            render: (text, record) => (
                <Button
                    type="default"
                    icon={<Eye size={16} />}
                    onClick={() => showResponseDetailModal(record)}
                    className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                >
                    Xem chi tiết
                </Button>
            ),
        },
    ];

    // Hàm render câu hỏi dựa trên loại câu hỏi
    const renderQuestionInput = (question) => {
        const fieldName = `question_${question._id}`;
        const rules = question.isRequired ? [{ required: true, message: `Vui lòng trả lời câu hỏi này!` }] : [];

        switch (question.questionType) {
            case 'text':
                return (
                    <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                        <Input placeholder="Nhập câu trả lời của bạn" />
                    </Form.Item>
                );
            case 'textarea':
                return (
                    <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                        <TextArea rows={4} placeholder="Nhập câu trả lời chi tiết của bạn" />
                    </Form.Item>
                );
            case 'radio':
                return (
                    <>
                        <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                            <Radio.Group>
                                {question.options.map((option, index) => (
                                    <Radio key={index} value={option}>{option}</Radio>
                                ))}
                            </Radio.Group>
                        </Form.Item>
                        {/* Conditional "Other" input for radio */}
                        {form.getFieldValue(fieldName) === 'Khác' && (
                            <Form.Item
                                name={`${fieldName}_other`}
                                rules={[{ required: true, message: 'Vui lòng nhập nội dung khác!' }]}
                                className="mt-2"
                            >
                                <Input placeholder="Vui lòng ghi rõ" />
                            </Form.Item>
                        )}
                    </>
                );
            case 'checkbox':
                return (
                    <>
                        <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                            <Checkbox.Group>
                                {question.options.map((option, index) => (
                                    <Checkbox key={index} value={option}>{option}</Checkbox>
                                ))}
                            </Checkbox.Group>
                        </Form.Item>
                        {/* Conditional "Other" input for checkbox */}
                        {form.getFieldValue(fieldName)?.includes('Khác') && (
                            <Form.Item
                                name={`${fieldName}_other`}
                                rules={[{ required: true, message: 'Vui lòng nhập nội dung khác!' }]}
                                className="mt-2"
                            >
                                <Input placeholder="Vui lòng ghi rõ" />
                            </Form.Item>
                        )}
                    </>
                );
            case 'number':
                return (
                    <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                        <InputNumber
                            placeholder="Nhập một số"
                            min={question.min !== null ? question.min : undefined}
                            max={question.max !== null ? question.max : undefined}
                            className="w-full"
                        />
                    </Form.Item>
                );
            case 'rating':
                return (
                    <Form.Item name={fieldName} label={question.questionText} rules={rules}>
                        <Rate count={question.max || 5} /> {/* Mặc định 5 sao nếu không có max */}
                    </Form.Item>
                );
            default:
                return null;
        }
    };

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
                        Bản Đánh Giá
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Hoàn thành các bản đánh giá được giao.
                    </p>
                </div>

                <div className="w-full max-w-7xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <Tabs defaultActiveKey="availableForms" activeKey={activeTab} onChange={setActiveTab} centered>
                        <TabPane tab={<span><FileText size={16} className="inline-block mr-2" />Bản đánh giá có sẵn</span>} key="availableForms">
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Các bản đánh giá bạn cần làm</h2>
                            {loadingForms ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải bản đánh giá..." />
                                </div>
                            ) : availableForms.length > 0 ? (
                                <Table
                                    columns={availableFormsColumns}
                                    dataSource={availableForms}
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Không có bản đánh giá nào có sẵn hoặc bạn đã hoàn thành tất cả." />
                            )}
                        </TabPane>
                        <TabPane tab={<span><History size={16} className="inline-block mr-2" />Lịch sử đã gửi</span>} key="submittedResponses">
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Lịch sử bản đánh giá đã gửi</h2>
                            {loadingResponses ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải lịch sử phản hồi..." />
                                </div>
                            ) : submittedResponses.length > 0 ? (
                                <Table
                                    columns={submittedResponsesColumns}
                                    dataSource={submittedResponses}
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Bạn chưa gửi bản đánh giá nào." />
                            )}
                        </TabPane>
                    </Tabs>
                </div>
            </div>

            {/* Modal làm bản đánh giá */}
            <Modal
                title={selectedForm ? `Làm bản đánh giá: ${selectedForm.title}` : "Bản đánh giá"}
                open={isFormModalVisible}
                onCancel={handleFormModalCancel}
                footer={null}
                width={800}
                destroyOnClose={true} // Đảm bảo form được reset khi đóng
            >
                {selectedForm ? (
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinishForm}
                        className="mt-4"
                    >
                        <p className="mb-4 text-gray-700">{selectedForm.description}</p>
                        <p className="mb-6 text-gray-600 flex items-center">
                            <Calendar size={16} className="mr-2" />
                            Thời hạn: {selectedForm.dueDate ? format(new Date(selectedForm.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                            {isPast(new Date(selectedForm.dueDate)) && <Tag color="red" className="ml-2">Đã hết hạn</Tag>}
                        </p>
                        {selectedForm.questions.map((question, index) => (
                            <div key={question._id} className="mb-6 p-4 border rounded-lg bg-gray-50">
                                <h4 className="text-lg font-semibold mb-2">{index + 1}. {question.questionText} {question.isRequired && <span className="text-red-500">*</span>}</h4>
                                {renderQuestionInput(question)}
                            </div>
                        ))}
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg" disabled={isPast(new Date(selectedForm.dueDate))}>
                                Gửi bản đánh giá
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <Spin tip="Đang tải chi tiết bản đánh giá..." />
                )}
            </Modal>

            {/* Modal xem chi tiết phản hồi đã gửi */}
            <Modal
                title={selectedResponse ? `Chi tiết phản hồi: ${selectedResponse.form?.title || 'N/A'}` : "Chi tiết phản hồi"}
                open={isResponseDetailModalVisible}
                onCancel={handleResponseDetailModalCancel}
                footer={[
                    <Button key="close" onClick={handleResponseDetailModalCancel} className="rounded-lg">
                        Đóng
                    </Button>,
                ]}
                width={800}
            >
                {selectedResponse ? (
                    <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Thông tin bản đánh giá</h3>
                        <p className="flex items-center mb-2"><FileText size={18} className="mr-2 text-blue-500" /> <strong>Tiêu đề:</strong>&nbsp;{selectedResponse.form?.title || 'N/A'}</p>
                        <p className="flex items-center mb-2"><UserIcon size={18} className="mr-2 text-blue-500" /> <strong>Người tạo:</strong>&nbsp;{selectedResponse.form?.createdBy?.name || 'N/A'}</p>
                        <p className="flex items-center mb-2"><Calendar size={18} className="mr-2 text-blue-500" /> <strong>Thời hạn:</strong>&nbsp;{selectedResponse.form?.dueDate ? format(new Date(selectedResponse.form.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
                        <p className="flex items-center mb-2"><Clock size={18} className="mr-2 text-blue-500" /> <strong>Ngày gửi:</strong>&nbsp;{selectedResponse.createdAt ? format(new Date(selectedResponse.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
                        <p className="flex items-center mb-4"><strong>Trạng thái:</strong>&nbsp;
                            {selectedResponse.status === 'pending' ? <Tag color="gold">Đang chờ Admin xem</Tag> : <Tag color="green">Đã nhận</Tag>}
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Các câu trả lời của bạn</h3>
                        {selectedResponse.answers.length > 0 ? (
                            selectedResponse.answers.map((ans, index) => (
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

export default DanhGia;
