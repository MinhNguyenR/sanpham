import React from "react";
import { Avatar, Input } from "antd";
import { Bell } from "lucide-react";

const HomePage = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gradient-to-b from-slate-800 to-slate-900 text-white fixed h-full shadow-xl z-10">
        <div className="p-6 text-2xl font-bold border-b border-slate-700">
          QLNX
        </div>
        <nav className="p-4 space-y-4">
          <div className="hover:text-slate-300 cursor-pointer">Dashboard</div>
          <div className="hover:text-slate-300 cursor-pointer">Quản lý nhân viên</div>
          <div className="hover:text-slate-300 cursor-pointer">Chấm công</div>
          <div className="hover:text-slate-300 cursor-pointer">Lương & Thưởng</div>
          <div className="hover:text-slate-300 cursor-pointer">Báo cáo</div>
          <div className="hover:text-slate-300 cursor-pointer">Cài đặt</div>
        </nav>
      </aside>

      {/* Nội dung chính */}
      <div className="flex flex-col flex-1 ml-60">
        {/* Navbar */}
        <header className="flex justify-between items-center p-4 border-b shadow-sm bg-white sticky top-0 z-10">
          <div className="w-64">
            <Input
              placeholder="Tìm kiếm..."
              className="rounded-full px-4 py-1 border border-slate-300 text-sm"
              allowClear
            />
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="text-slate-600 w-5 h-5" />
            <div className="flex items-center space-x-2">
              <Avatar size={32} />
              <div className="text-sm text-slate-700">
                <div>...</div>
                <div className="text-xs text-slate-500">...</div>
              </div>
            </div>
          </div>
        </header>

        {/* Khung chào mừng */}
        <main className="flex items-center justify-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200">
          <div className="text-center">
            <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)]">
              Chào mừng <span className="text-sky-600">...</span> đến với <br /> trang quản lý nhân sự
            </h1>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
