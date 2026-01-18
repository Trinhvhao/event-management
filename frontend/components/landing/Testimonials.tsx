import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
  const partners = [
    "Đại học Bách Khoa", "Đại học Quốc gia", "RMIT Vietnam", "Đại học FPT", "Đại học Kinh Tế", "Đại học Ngoại Thương"
  ];

  const reviews = [
    {
      content: "UniEvent đã giúp chúng tôi tiết kiệm 70% thời gian xử lý điểm danh và cấp chứng nhận. Sinh viên rất hào hứng khi được check-in bằng QR Code.",
      author: "Ths. Nguyễn Văn An",
      role: "Bí thư Đoàn trường ĐH Bách Khoa",
      avatar: "https://i.pravatar.cc/100?img=68"
    },
    {
      content: "Giao diện thân thiện, dễ sử dụng. Tính năng báo cáo real-time giúp BTC nắm bắt tình hình sự kiện ngay lập tức để điều phối nhân sự.",
      author: "Lê Thị Bích Ngọc",
      role: "Chủ tịch Hội Sinh viên ĐH Kinh Tế",
      avatar: "https://i.pravatar.cc/100?img=49"
    }
  ];

  return (
    <section id="testimonials" className="py-24 bg-brandBlue text-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-[100px]"></div>

      <div className="container mx-auto px-6 relative z-10">
        
        {/* Partners Section */}
        <div className="text-center mb-20">
          <p className="text-brandLightBlue/60 uppercase tracking-widest text-sm font-semibold mb-8">
            Được tin dùng bởi các trường hàng đầu
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
             {partners.map((partner, i) => (
                 <span key={i} className="text-xl md:text-2xl font-bold text-white/40 hover:text-white transition-colors cursor-default">
                    {partner}
                 </span>
             ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl relative"
            >
              <Quote className="absolute top-8 right-8 text-secondary/30 w-12 h-12" />
              <p className="text-lg text-brandLightBlue/90 leading-relaxed mb-8 relative z-10">
                "{review.content}"
              </p>
              <div className="flex items-center gap-4">
                <img src={review.avatar} alt={review.author} className="w-12 h-12 rounded-full border-2 border-secondary" />
                <div>
                  <h4 className="font-bold text-white">{review.author}</h4>
                  <p className="text-sm text-brandLightBlue/60">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;