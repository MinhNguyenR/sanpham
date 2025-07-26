import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import LoginPage from './Pages/Login';
import RegisterPage from './Pages/Register';
import QuanLyTaiKhoan from './Pages/QuanLyTaiKhoan';
import SettingsPage from './Pages/SettingsPage';
import QuyenRiengTu from './Pages/QuyenRiengTu';
import QuanLyNhanVien from './Pages/QuanLyNhanVien';
import ChamCong from './Pages/ChamCong'; // Trang chấm công cho user và admin
import QLChamCong from './Pages/QLChamCong'; // Trang quản lý chấm công cho admin
import XinNghi from './Pages/XinNghi'; // Import trang XinNghi
import KhieuNai from './Pages/KhieuNai'; // Import trang KhieuNai
import QuanLyXinNghi from './Pages/QuanLyXinNghi'; // Import trang QuanLyXinNghi
import QuanLyKhieuNai from './Pages/QuanLyKhieuNai'; // Import trang QuanLyKhieuNai
import PrivateRoutes from './Router/PrivateRoutes';
import { AuthProvider } from './Context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/quanlytaikhoan" element={<QuanLyTaiKhoan />} />
          <Route path="/caidat" element={<SettingsPage />} />
          <Route path="/caidat/quyenriengtu" element={<QuyenRiengTu />} />

          {/* Route cho trang Chấm công (cả user và admin đều truy cập được) */}
          <Route path="/chamcong" element={<ChamCong />} />
          {/* Route cho trang Xin nghỉ (cả user và admin đều truy cập được) */}
          <Route path="/xinnghi" element={<XinNghi />} />
          {/* Route cho trang Khiếu nại (cả user và admin đều truy cập được) */}
          <Route path="/khieunai" element={<KhieuNai />} />

          <Route element={<PrivateRoutes allowedRoles={['admin']} />}>
            <Route path="/quanlynhanvien" element={<QuanLyNhanVien />} />
            {/* Route riêng cho Quản lý Chấm công (chỉ admin) */}
            <Route path="/quanlychamcong" element={<QLChamCong />} />
            {/* Route riêng cho Quản lý Yêu cầu nghỉ phép (chỉ admin) */}
            <Route path="/quanlyxinnghi" element={<QuanLyXinNghi />} />
            {/* Route riêng cho Quản lý Khiếu nại (chỉ admin) */}
            <Route path="/quanlykhieunai" element={<QuanLyKhieuNai />} />
          </Route>

          <Route path="*" element={
            <div className="flex items-center justify-center h-screen text-2xl text-red-600">
              404 - Trang không tìm thấy
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
