// src/Pages/SettingsPage.jsx
import React from "react";
import { Button } from "antd";
import { useNavigate } from 'react-router-dom';
import SBNV from '../ChucNang/sbnv';

const SettingsPage = () => {
    const navigate = useNavigate();

    return (
        <SBNV>
            {/* Khung nội dung cài đặt */}
            {/* Thay đổi nền của main thành màu trắng để đồng nhất */}
            <main className="flex flex-col items-center justify-center flex-1 bg-white p-8">
                <h2 className="text-4xl font-bold text-slate-800 mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)]">Cài đặt</h2>
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md space-y-6">
                    <Button
                        type="default" // Giữ màu trắng mặc định
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200"
                        onClick={() => navigate('/caidatthongbao')}
                    >
                        Cài đặt thông báo
                    </Button>
                    <Button
                        type="default" // Giữ màu trắng mặc định
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200"
                        onClick={() => navigate('/caidat/quyenriengtu')}
                    >
                        Cài đặt quyền riêng tư
                    </Button>
                    <Button
                        type="default" // Giữ màu trắng mặc định
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200"
                        onClick={() => navigate('/dieukhoansudung')}
                    >
                        Điều khoản
                    </Button>
                </div>
            </main>
        </SBNV>
    );
};

export default SettingsPage;
