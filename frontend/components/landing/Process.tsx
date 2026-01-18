import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Share2, ScanBarcode, FileCheck2 } from 'lucide-react';

const Process: React.FC = () => {
  const steps = [
    {
      id: 1,
      title: "Lên kế hoạch & Tạo sự kiện",
      desc: "Thiết lập thông tin, thời gian, địa điểm và giới hạn số lượng tham gia chỉ trong 2 phút.",
      icon: <CalendarDays size={28} />,
      color: "bg-blue-500",
      shadow: "shadow-blue-500/30"
    },
    {
      id: 2,
      title: "Truyền thông & Đăng ký",
      desc: "Sinh viên đăng ký trực tuyến qua App hoặc Web. Hệ thống tự động gửi vé mời có mã QR.",
      icon: <Share2 size={28} />,
      color: "bg-purple-500",
      shadow: "shadow-purple-500/30"
    },
    {
      id: 3,
      title: "Check-in thông minh",
      desc: "BTC quét mã QR để điểm danh. Hỗ trợ check-in offline và kiểm soát ra/vào real-time.",
      icon: <ScanBarcode size={28} />,
      color: "bg-orange-500",
      shadow: "shadow-orange-500/30"
    },
    {
      id: 4,
      title: "Tổng kết & Cấp chứng nhận",
      desc: "Xuất báo cáo chi tiết. Tự động gửi giấy chứng nhận tham gia về email sinh viên.",
      icon: <FileCheck2 size={28} />,
      color: "bg-green-500",
      shadow: "shadow-green-500/30"
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="inline-block mb-3 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
             Quy trình vận hành
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-primary mb-6"
          >
            Đơn giản hóa trong <span className="text-brandBlue">4 bước</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg max-w-2xl mx-auto"
          >
            Chúng tôi đã tối ưu hóa mọi công đoạn để bạn có thể tập trung vào nội dung sự kiện.
          </motion.p>
        </div>

        <div className="relative">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[45px] left-0 w-full h-1 z-0">
             <svg className="w-full h-20 absolute -top-10 left-0 overflow-visible">
                <motion.path
                    d="M 0 50 L 10000 50"
                    fill="transparent"
                    strokeWidth="3"
                    stroke="#E2E8F0" // slate-200
                    strokeDasharray="10 10"
                />
                 <motion.path
                    d="M 0 50 L 10000 50"
                    fill="transparent"
                    strokeWidth="3"
                    stroke="#f66600" // secondary color
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    viewport={{ once: true }}
                />
             </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative group"
              >
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 relative z-10 h-full flex flex-col items-center text-center md:items-start md:text-left hover:-translate-y-2">
                  
                  {/* Step Number Badge */}
                  <div className={`
                    w-14 h-14 rounded-2xl ${step.color} text-white flex items-center justify-center mb-6 
                    shadow-lg ${step.shadow} transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300
                    relative
                  `}>
                    {step.icon}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-800 border shadow-sm">
                        {step.id}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brandBlue transition-colors">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                
                {/* Mobile Connector */}
                {index !== steps.length - 1 && (
                    <div className="md:hidden absolute left-1/2 bottom-[-32px] w-0.5 h-8 bg-gray-200 -translate-x-1/2"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;