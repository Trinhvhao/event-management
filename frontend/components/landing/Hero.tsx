import React from 'react';
import { ArrowRight, Play, CheckCircle2, Star, Shield, Users, Mouse } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-brandBlue pt-20">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 w-full h-full opacity-60">
        {/* White/Light Blue Blob for highlight */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brandLightBlue/20 rounded-full blur-[120px] animate-float" style={{animationDuration: '8s'}}></div>
        {/* Secondary Orange Blob */}
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[60%] bg-secondary/30 rounded-full blur-[100px] animate-float" style={{animationDuration: '10s'}}></div>
        {/* Darker Blue Blob for depth */}
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-[#002563]/50 rounded-full blur-[120px] animate-float" style={{animationDuration: '12s'}}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150"></div>
      
      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center pb-12">
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors cursor-pointer group"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="text-brandLightBlue text-sm font-medium tracking-wide">Phiên bản 3.0 đã ra mắt</span>
            <ArrowRight className="w-3 h-3 text-brandLightBlue group-hover:translate-x-1 transition-transform" />
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            Quản lý sự kiện <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-brandRed to-brandLightBlue animate-gradient bg-300%">
              Kỷ nguyên mới
            </span>
          </h1>
          
          <p className="text-lg text-brandLightBlue/90 max-w-lg leading-relaxed font-light">
            Giải pháp toàn diện giúp các trường đại học tự động hóa 100% quy trình tổ chức, điểm danh và cấp chứng nhận cho sinh viên.
          </p>
          
          <motion.div 
            className="flex flex-wrap gap-4 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button variant="primary" size="lg" className="group shadow-secondary/25 shadow-lg">
              Bắt đầu miễn phí
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="lg" className="text-brandLightBlue border-brandLightBlue/30 hover:bg-brandLightBlue/10">
              <Play className="mr-2 w-4 h-4 fill-current" />
              Xem video giới thiệu
            </Button>
          </motion.div>

          <div className="flex items-center gap-8 pt-8 border-t border-white/10">
            <div className="flex -space-x-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-brandBlue bg-brandBlue overflow-hidden hover:-translate-y-1 transition-transform duration-300 z-0 hover:z-10">
                   <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-brandBlue bg-secondary text-white flex items-center justify-center text-xs font-bold z-10">
                2k+
              </div>
            </div>
            <div className="text-brandLightBlue/80 text-sm">
              <span className="text-white font-bold text-lg">50+</span> Trường đã tin dùng
            </div>
          </div>
        </motion.div>

        {/* Visual Content - 3D Perspective */}
        <motion.div 
          className="relative hidden lg:block perspective-1000"
          initial={{ opacity: 0, scale: 0.8, rotateY: -10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ perspective: '1000px' }}
        >
          {/* Main Dashboard Card */}
          <motion.div 
            className="relative z-20 bg-brandBlue/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transform-style-3d rotate-y-6 hover:rotate-y-0 transition-transform duration-700"
            animate={{ 
              y: [0, -15, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Window Controls */}
            <div className="bg-white/5 border-b border-white/5 p-4 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-white/5">
                <Shield size={12} className="text-brandLightBlue" />
                <span className="text-[10px] text-brandLightBlue/80 font-mono">unievent.edu.vn/secure</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-3 gap-6">
               {/* Sidebar */}
               <div className="col-span-1 space-y-4">
                  <div className="h-20 rounded-xl bg-gradient-to-br from-[#002870] to-brandBlue border border-white/10 p-3">
                     <div className="h-2 w-12 bg-white/20 rounded mb-2"></div>
                     <div className="h-8 w-8 rounded-lg bg-white/10"></div>
                  </div>
                  <div className="space-y-2">
                     {[1,2,3].map(i => <div key={i} className="h-8 w-full rounded-lg bg-white/5"></div>)}
                  </div>
               </div>
               
               {/* Main Area */}
               <div className="col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                     <div>
                        <h3 className="text-white font-bold text-xl">Thống kê</h3>
                        <p className="text-xs text-brandLightBlue/60">Cập nhật 5 phút trước</p>
                     </div>
                     <div className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded animate-pulse">Live</div>
                  </div>
                  
                  {/* Chart Area */}
                  <div className="h-32 flex items-end justify-between gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                     {[30, 50, 45, 80, 60, 95, 75].map((h, i) => (
                        <motion.div 
                          key={i} 
                          className="w-full bg-brandLightBlue/20 rounded-t-sm relative group overflow-hidden"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-t from-brandBlue to-brandLightBlue opacity-80 group-hover:opacity-100 transition-opacity"></div>
                        </motion.div>
                     ))}
                  </div>

                  {/* Active Users Row */}
                  <div className="flex gap-3">
                     <div className="flex-1 p-3 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-3">
                        <Users size={20} className="text-secondary" />
                        <div>
                           <div className="text-xs text-brandLightBlue/60">Đang online</div>
                           <div className="text-white font-bold">1,240</div>
                        </div>
                     </div>
                     <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <Star size={20} className="text-brandLightBlue" />
                        <div>
                           <div className="text-xs text-brandLightBlue/60">Đánh giá</div>
                           <div className="text-white font-bold">4.9/5</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Floating Elements */}
          <motion.div 
            className="absolute -right-8 top-20 z-30 glass-dark p-4 rounded-xl flex items-center gap-3 shadow-xl border-l-4 border-secondary bg-[#001a4d]/80"
            animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="bg-secondary/20 p-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-brandLightBlue/60 font-medium">Trạng thái</p>
              <p className="text-sm font-bold text-white">Check-in thành công</p>
            </div>
          </motion.div>

          <motion.div 
            className="absolute -left-10 bottom-20 z-30 glass-dark p-4 rounded-xl flex items-center gap-3 shadow-xl border-l-4 border-brandLightBlue bg-[#001a4d]/80"
            animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="bg-brandLightBlue/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-brandLightBlue" />
            </div>
            <div>
              <p className="text-xs text-brandLightBlue/60 font-medium">Người tham gia</p>
              <p className="text-sm font-bold text-white">+145 đăng ký mới</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Down Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center gap-2 cursor-pointer hover:text-white transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 2 }}
        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="text-xs uppercase tracking-widest font-medium">Khám phá</span>
        <Mouse size={24} />
      </motion.div>
    </section>
  );
};

export default Hero;