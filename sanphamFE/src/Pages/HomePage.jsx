import React from "react";
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv'; 

const HomePage = () => {
    const { user } = useAuth(); 

    return (
        <SBNV> 
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-200">
                <div className="text-center">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)]">
                        Chào mừng <span className="text-sky-600">{user ? user.name : 'Bạn'}</span> đến với <br /> trang quản lý nhân sự
                    </h1>
                </div>
            </div>
        </SBNV>
    );
};

export default HomePage;