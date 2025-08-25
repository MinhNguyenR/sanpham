import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Empty, Tag, Tabs, Form, Input, Radio, Checkbox, DatePicker, Rate, InputNumber, Card, Typography } from 'antd';
import { Eye, Send, History, FileText, Calendar, Clock, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { format, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const API_URL = 'http://localhost:5000/api/auth';

const DanhGia = () => {
  const { user, loading: authLoading } = useAuth();
  const [availableForms, setAvailableForms] = useState([]);
  const [submittedResponses, setSubmittedResponses] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [isResponseDetailModalVisible, setIsResponseDetailModalVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [form] = Form.useForm();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState('availableForms');

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
      const res = await axios.get(`${API_URL}/evaluation-forms/available`, config);
      setAvailableForms(res.data);
    } catch (error) {
      console.error('Lỗi khi tải các bản đánh giá có sẵn:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Không thể tải các bản đánh giá có sẵn.');
    } finally {
      setLoadingForms(false);
    }
  }, [user]);

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
    setLoadingForms(true);
    const token = localStorage.getItem('token');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(`${API_URL}/evaluation-forms/${formId}`, config);
      setSelectedForm(res.data);
      form.resetFields();
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

      if ((q.questionType === 'radio' || q.questionType === 'checkbox') && q.options.includes('Khác')) {
        const otherText = values[`question_${q._id}_other`];
        if (Array.isArray(answerValue) && answerValue.includes('Khác') && otherText) {
          answerValue = answerValue.filter(opt => opt !== 'Khác');
          answerValue.push(`Khác: ${otherText}`);
        } else if (answerValue === 'Khác' && otherText) {
          answerValue = `Khác: ${otherText}`;
        }
      }

      return {
        questionId: q._id,
        questionText: q.questionText,
        answer: answerValue,
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
      fetchAvailableForms();
      fetchSubmittedResponses();
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
      width: 200,
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
      dataIndex: 'createdBy',
      key: 'creatorInfo',
      width: 120,
      render: (createdBy) => (
        createdBy ? (
          <>
            <div>{createdBy.name || 'N/A'}</div>
            {createdBy.position && <div className="text-gray-500 text-sm">({createdBy.position})</div>}
          </>
        ) : 'N/A'
      ),
    },
    {
      title: 'Thời hạn',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
      width: 160,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'dueDate',
      key: 'status',
      width: 120,
      render: (dueDate) => (
        isPast(new Date(dueDate))
          ? <Tag color="error" className="rounded-full">Đã hết hạn</Tag>
          : <Tag color="processing" className="rounded-full">Còn hạn</Tag>
      ),
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
          disabled={isPast(new Date(record.dueDate))}
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
      width: 200,
      ellipsis: true,
      render: (text, record) => record.form?.title || 'N/A',
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
      width: 160,
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
        return <Tag color={color} className="rounded-full">{text}</Tag>;
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

  const renderQuestionInput = (question) => {
    const fieldName = `question_${question._id}`;
    const rules = question.isRequired ? [{ required: true, message: `Vui lòng trả lời câu hỏi này!` }] : [];

    switch (question.questionType) {
      case 'text':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <Input placeholder="Nhập câu trả lời của bạn" className="rounded-lg" />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <TextArea rows={4} placeholder="Nhập câu trả lời chi tiết của bạn" className="rounded-lg" />
          </Form.Item>
        );
      case 'radio':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <Radio.Group className="flex flex-col gap-2">
              {question.options.map((option, index) => (
                <Radio key={index} value={option}>{option}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        );
      case 'checkbox':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <Checkbox.Group className="flex flex-col gap-2">
              {question.options.map((option, index) => (
                <Checkbox key={index} value={option}>{option}</Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <InputNumber
              placeholder="Nhập một số"
              min={question.min !== null ? question.min : undefined}
              max={question.max !== null ? question.max : undefined}
              className="w-full rounded-lg"
            />
          </Form.Item>
        );
      case 'rating':
        return (
          <Form.Item name={fieldName} label={question.questionText} rules={rules}>
            <Rate count={question.max || 5} />
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
      <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 font-sans">
        <div className="text-center mb-8">
          <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm mb-2">
            Bản Đánh Giá
          </Title>
          <Text className="text-lg text-gray-700">
            Chào mừng <span className="text-blue-600 font-bold">{user.name}</span>! Hoàn thành các bản đánh giá được giao.
          </Text>
        </div>

        <Card
          className="w-full max-w-7xl shadow-2xl rounded-3xl bg-white/90 p-8 mb-12"
          bordered={false}
        >
          <Tabs defaultActiveKey="availableForms" activeKey={activeTab} onChange={setActiveTab} centered>
            <TabPane tab={<span className="flex items-center"><FileText size={16} className="mr-2" />Bản đánh giá có sẵn</span>} key="availableForms">
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
                  className="rounded-xl overflow-hidden shadow-lg"
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <Empty description="Không có bản đánh giá nào có sẵn hoặc bạn đã hoàn thành tất cả." />
              )}
            </TabPane>
            <TabPane tab={<span className="flex items-center"><History size={16} className="mr-2" />Lịch sử đã gửi</span>} key="submittedResponses">
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
                  className="rounded-xl overflow-hidden shadow-lg"
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <Empty description="Bạn chưa gửi bản đánh giá nào." />
              )}
            </TabPane>
          </Tabs>
        </Card>

        <Modal
          title={selectedForm ? `Làm bản đánh giá: ${selectedForm.title}` : "Bản đánh giá"}
          open={isFormModalVisible}
          onCancel={handleFormModalCancel}
          footer={null}
          width={800}
          destroyOnClose={true}
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
                <Calendar size={16} className="mr-2 text-blue-500" />
                Thời hạn: {selectedForm.dueDate ? format(new Date(selectedForm.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                {isPast(new Date(selectedForm.dueDate)) && <Tag color="error" className="ml-2 rounded-full">Đã hết hạn</Tag>}
              </p>
              {selectedForm.questions.map((question, index) => (
                <div key={question._id} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">{index + 1}. {question.questionText} {question.isRequired && <span className="text-red-500">*</span>}</h4>
                  {renderQuestionInput(question)}
                </div>
              ))}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loadingSubmit}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg h-10 text-lg font-semibold"
                  disabled={isPast(new Date(selectedForm.dueDate))}
                >
                  <Send size={18} className="inline-block mr-2" />
                  Gửi bản đánh giá
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <div className="flex justify-center items-center h-48">
              <Spin tip="Đang tải chi tiết bản đánh giá..." />
            </div>
          )}
        </Modal>

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
              <p className="flex items-center mb-2"><FileText size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Tiêu đề:</span>&nbsp;{selectedResponse.form?.title || 'N/A'}</p>
              <p className="flex items-center mb-2">
                <UserIcon size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Người tạo:</span>&nbsp;
                {selectedResponse.form?.createdBy?.name || 'N/A'}
                {selectedResponse.form?.createdBy?.position && <span className="text-gray-600 ml-1">({selectedResponse.form.createdBy.position})</span>}
              </p>
              <p className="flex items-center mb-2"><Calendar size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Thời hạn:</span>&nbsp;{selectedResponse.form?.dueDate ? format(new Date(selectedResponse.form.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
              <p className="flex items-center mb-2"><Clock size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Ngày gửi:</span>&nbsp;{selectedResponse.createdAt ? format(new Date(selectedResponse.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</p>
              <p className="flex items-center mb-4"><span className="font-medium">Trạng thái:</span>&nbsp;
                {selectedResponse.status === 'pending' ? <Tag color="gold" className="rounded-full">Đang chờ Admin xem</Tag> : <Tag color="green" className="rounded-full">Đã nhận</Tag>}
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Các câu trả lời của bạn</h3>
              {selectedResponse.answers.length > 0 ? (
                selectedResponse.answers.map((ans, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <p className="font-semibold text-gray-700">{index + 1}. {ans.questionText}</p>
                    <p className="text-gray-900 mt-2">
                      <span className="font-medium">Trả lời:</span>&nbsp;
                      {Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer}
                    </p>
                  </div>
                ))
              ) : (
                <Empty description="Không có câu trả lời nào." />
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <Spin tip="Đang tải chi tiết phản hồi..." />
            </div>
          )}
        </Modal>
      </div>
    </SBNV>
  );
};

export default DanhGia;