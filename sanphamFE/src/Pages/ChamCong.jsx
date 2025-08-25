import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../Context/AuthContext";
import SBNV from "../ChucNang/sbnv";
import { Button, message, Spin, Table, Card, Typography, DatePicker, Tag } from "antd";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
dayjs.locale('vi');

const { Title, Text } = Typography;

const ChamCong = () => {
  const { user, loading: authLoading } = useAuth();
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [userSearchDate, setUserSearchDate] = useState(dayjs());

  const API_URL = "http://localhost:5000/api/auth";

  const checkUserCheckInStatus = useCallback(async (dateToFetch = null) => {
    if (!user) return;

    setLoadingAttendance(true);
    const token = localStorage.getItem("token");
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

      const today = format(new Date(), "yyyy-MM-dd");
      const checkedInToday = res.data.some(
        (record) =>
          record.checkInTime &&
          new Date(record.checkInTime).toString() !== "Invalid Date" &&
          format(new Date(record.checkInTime), "yyyy-MM-dd") === today
      );
      setHasCheckedInToday(checkedInToday);

      const formattedDate = dateToFetch ? dateToFetch.format("YYYY-MM-DD") : null;

      const filteredRecords = formattedDate
        ? res.data.filter(
            (record) =>
              record.checkInTime &&
              new Date(record.checkInTime).toString() !== "Invalid Date" &&
              format(new Date(record.checkInTime), "yyyy-MM-dd") === formattedDate
          )
        : res.data;

      setAttendanceRecords(filteredRecords);
    } catch (error) {
      console.error("Lỗi khi kiểm tra trạng thái chấm công:", error);
      message.error("Không thể tải trạng thái chấm công.");
    } finally {
      setLoadingAttendance(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkUserCheckInStatus(userSearchDate);
    }
  }, [user, authLoading, userSearchDate, checkUserCheckInStatus]);

  const handleCheckIn = async () => {
    setLoadingCheckIn(true);
    const token = localStorage.getItem("token");
    if (!token) {
      message.error("Bạn cần đăng nhập để chấm công.");
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
      checkUserCheckInStatus(userSearchDate);
    } catch (error) {
      console.error("Lỗi khi chấm công:", error);
      message.error(error.response?.data?.message || "Chấm công thất bại.");
    } finally {
      setLoadingCheckIn(false);
    }
  };

  const handleUserSearchDateChange = (date) => {
    setUserSearchDate(date);
  };

  const userColumns = [
    {
      title: "Ngày",
      dataIndex: "checkInTime",
      key: "date",
      render: (text) =>
        text && new Date(text).toString() !== "Invalid Date"
          ? format(new Date(text), "dd/MM/yyyy", { locale: vi })
          : "N/A",
    },
    {
      title: "Thời gian chấm công",
      dataIndex: "checkInTime",
      key: "time",
      render: (text) =>
        text && new Date(text).toString() !== "Invalid Date"
          ? format(new Date(text), "HH:mm:ss", { locale: vi })
          : "N/A",
    },
    {
      title: "Trạng thái",
      dataIndex: "isLeave",
      key: "status",
      render: (isLeave) => (
        <Tag color={isLeave ? "volcano" : "green"} className="rounded-full">
          {isLeave ? "Nghỉ phép" : "Đã chấm công"}
        </Tag>
      ),
    },
    {
      title: "Lý do nghỉ phép",
      dataIndex: "leaveReason",
      key: "leaveReason",
      render: (text) => text || "N/A",
    },
  ];

  if (authLoading) {
    return (
      <SBNV>
        <div className="flex items-center justify-center h-full">
          <Spin size="large">
            <div>Đang tải...</div>
          </Spin>
        </div>
      </SBNV>
    );
  }

  return (
    <SBNV>
      <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 font-sans">
        <div className="text-center mb-8">
          <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm mb-2">
            Trang Chấm Công
          </Title>
          {user && (
            <Text className="text-lg text-gray-700">
              Chào mừng <span className="text-blue-600 font-bold">{user.name}</span>!
            </Text>
          )}
        </div>

        {/* Chấm công hôm nay */}
        <Card
          className="shadow-2xl rounded-3xl bg-white/90 px-8 py-10 max-w-md w-full mb-10 text-center transform transition-transform duration-300 hover:scale-105"
          bordered={false}
        >
          <Title level={3} className="!mb-6 text-gray-800">
            Chấm Công Hôm Nay
          </Title>

          {hasCheckedInToday ? (
            <>
              <Text className="block text-green-600 text-lg font-medium mb-4">
                Bạn đã chấm công cho ngày hôm nay!
              </Text>
              <Text type="secondary" className="text-gray-500">
                Thời gian chấm công gần nhất:{" "}
                {attendanceRecords.length > 0 &&
                attendanceRecords[0].checkInTime &&
                new Date(attendanceRecords[0].checkInTime).toString() !== "Invalid Date"
                  ? format(
                      new Date(attendanceRecords[0].checkInTime),
                      "HH:mm:ss dd/MM/yyyy",
                      { locale: vi }
                    )
                  : "N/A"}
              </Text>
            </>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={handleCheckIn}
              loading={loadingCheckIn}
              className="w-48 h-48 rounded-full text-2xl font-bold shadow-lg hover:shadow-2xl transition-transform duration-300 hover:scale-105 border-none"
              style={{
                background: "linear-gradient(45deg, #2563eb, #1e40af)",
              }}
            >
              {loadingCheckIn ? <Spin /> : "Chấm Công"}
            </Button>
          )}
        </Card>

        {/* Lịch sử chấm công */}
        {user && (
          <Card
            className="shadow-2xl rounded-3xl bg-white/90 p-8 max-w-5xl w-full"
            bordered={false}
          >
            <Title level={3} className="!mb-6 text-center text-gray-800">
              Lịch Sử Chấm Công Của Bạn
            </Title>

            <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
              <label
                htmlFor="userSearchDate"
                className="text-lg font-medium text-gray-700"
              >
                Tìm theo ngày:
              </label>
              <DatePicker
                id="userSearchDate"
                value={userSearchDate}
                onChange={handleUserSearchDateChange}
                format="DD/MM/YYYY"
                locale={vi}
                className="w-48 rounded-lg shadow-sm"
              />
            </div>

            <Spin spinning={loadingAttendance} tip="Đang tải lịch sử chấm công...">
              <Table
                columns={userColumns}
                dataSource={attendanceRecords}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                className="rounded-xl overflow-hidden shadow-lg"
              />
            </Spin>
          </Card>
        )}
      </div>
    </SBNV>
  );
};

export default ChamCong;