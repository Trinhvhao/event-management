import React from 'react';
import Button from './Button';
import { motion } from 'framer-motion';
import { Sparkles, PhoneCall } from 'lucide-react';

const CallToAction: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-white">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-brandLightBlue/10 to-transparent"></div>
      
      <div className="container mx-auto px-6 relative z-20">
        <div className="bg-gradient-to-br from-brandBlue to-[#001a4d] rounded-[3rem] p-8 md:p-16 text-center shadow-2xl overflow-hidden relative">
          
          {/* Abstract blobs inside the card */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/30 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-brandLightBlue/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-3xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-2">
                <Sparkles size={16} className="text-secondary" />
                <span className="text-brandLightBlue text-sm font-medium">Giải pháp chuyển đổi số giáo dục</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Đồng hành cùng sự phát triển <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-orange-300">
                Phong trào Sinh viên
              </span>
            </h2>
            
            <p className="text-lg text-brandLightBlue/80 max-w-2xl mx-auto leading-relaxed">
              Chúng tôi hiểu những khó khăn trong công tác quản lý hoạt động đoàn hội. Hãy để UniEvent trở thành trợ thủ đắc lực của Nhà trường ngay hôm nay.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button variant="primary" size="lg" className="min-w-[200px] text-lg shadow-xl shadow-secondary/30 group">
                <PhoneCall className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Liên hệ hợp tác
              </Button>
              <Button variant="glass" size="lg" className="min-w-[200px] text-lg border-white/20 hover:bg-white/10">
                Nhận bản demo
              </Button>
            </div>
            
            <p className="text-white/40 text-sm mt-8">
              Hỗ trợ triển khai nhanh chóng • Đào tạo sử dụng miễn phí • Bảo mật dữ liệu 100%
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;