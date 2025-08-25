import React from "react";
import { useAuth } from "../Context/AuthContext";
import SBNV from "../ChucNang/sbnv";
import { Card, Typography } from "antd";

const { Title, Text } = Typography;

const HomePage = () => {
  const { user } = useAuth();

  return (
    <SBNV>
      <div className="flex items-center justify-center min-h-full bg-gradient-to-br from-slate-50 via-white to-slate-200 p-6">
        <Card
          bordered={false}
          className="shadow-xl rounded-2xl bg-white/80 backdrop-blur-sm px-8 py-12 max-w-3xl w-full"
        >
          <Title
            level={1}
            className="!text-blue-700 !mb-4 !text-center drop-shadow-md"
          >
            Chào mừng{" "}
            <span className="text-sky-600">
              {user ? user.name : "Bạn"}
            </span>
          </Title>
          <Text className="block text-center text-lg text-gray-600">
            đến với hệ thống <strong>Quản lý nhân sự</strong>
          </Text>
        </Card>
      </div>
    </SBNV>
  );
};

export default HomePage;
