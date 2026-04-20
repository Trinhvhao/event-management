'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, TrendingUp, Flame, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Button from './Button';
import { feedbackService, TopRatedEvent } from '@/services/feedbackService';

const TopStudentRow: React.FC<{ 
    rank: number; 
    name: string; 
    faculty: string; 
    points: number; 
    events: number; 
    avatar: string; 
}> = ({ rank, name, faculty, points, events, avatar }) => {
    
    let rankIcon;
    let rankColor;
    let rankBg;

    switch (rank) {
        case 1:
            rankIcon = <Crown size={20} className="text-yellow-500 fill-yellow-500" />;
            rankColor = "border-yellow-400";
            rankBg = "bg-yellow-50/50";
            break;
        case 2:
            rankIcon = <Medal size={20} className="text-slate-400 fill-slate-300" />;
            rankColor = "border-slate-300";
            rankBg = "bg-slate-50/50";
            break;
        case 3:
            rankIcon = <Medal size={20} className="text-amber-700 fill-amber-600" />;
            rankColor = "border-amber-600";
            rankBg = "bg-orange-50/30";
            break;
        default:
            rankIcon = <span className="text-sm font-bold text-slate-500">#{rank}</span>;
            rankColor = "border-transparent";
            rankBg = "bg-white";
    }

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: rank * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-2xl border ${rank <= 3 ? rankColor : 'border-slate-100'} ${rankBg} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
        >
            <div className="flex-shrink-0 w-8 flex justify-center">
                {rankIcon}
            </div>
            <div className="relative">
                <div className={`w-12 h-12 rounded-full border-2 p-0.5 ${rank <= 3 ? rankColor : 'border-slate-100'}`}>
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                        <Image src={avatar} alt={name} fill sizes="48px" className="object-cover" unoptimized />
                    </div>
                </div>
                {rank === 1 && (
                    <motion.div 
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-3 -right-1 text-2xl"
                    >
                        👑
                    </motion.div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 truncate">{name}</h4>
                <p className="text-xs text-slate-500 truncate">{faculty}</p>
            </div>
            <div className="text-right">
                <div className="font-bold text-brandBlue text-lg">{points}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Điểm</div>
                <div className="text-[10px] text-slate-400">{events} SK</div>
            </div>
        </motion.div>
    );
};

const TrendingEventCard: React.FC<{
    id: number;
    rank: number;
    title: string;
    rating: number;
    participants: number;
    image: string;
    category: string;
}> = ({ rank, title, rating, participants, image, category }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: rank * 0.1 }}
        className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex"
    >
        <div className="w-32 h-full relative flex-shrink-0">
                 <Image src={image} alt={title} fill sizes="128px" className="object-cover absolute inset-0 transform group-hover:scale-110 transition-transform duration-700" unoptimized />
             <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-0.5 rounded-md">
                #{rank}
             </div>
        </div>
        <div className="p-4 flex flex-col justify-between flex-1">
             <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">{category}</span>
                <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-2 group-hover:text-brandBlue transition-colors mb-2">
                    {title}
                </h4>
             </div>
             
             <div className="flex items-center justify-between mt-2">
                 <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                     <Star size={12} className="text-yellow-500 fill-yellow-500" />
                     <span className="text-xs font-bold text-slate-700">{rating}</span>
                 </div>
                 <div className="flex items-center gap-1 text-xs text-slate-500">
                     <Users size={12} />
                     <span>{participants}+</span>
                 </div>
             </div>
        </div>
        
        {rank === 1 && (
             <div className="absolute top-2 right-2">
                 <div className="relative">
                    <span className="absolute -inset-1 rounded-full bg-red-500 blur opacity-40 animate-pulse"></span>
                    <Flame size={18} className="text-red-500 relative z-10 fill-red-500" />
                 </div>
             </div>
        )}
    </motion.div>
);

const Leaderboard: React.FC = () => {
  const [topRatedEvents, setTopRatedEvents] = useState<TopRatedEvent[]>([]);

  useEffect(() => {
      const loadTopRatedEvents = async () => {
          try {
              const data = await feedbackService.getTopRatedEvents(4);
              setTopRatedEvents(data);
          } catch {
              setTopRatedEvents([]);
          }
      };

      loadTopRatedEvents();
  }, []);

  const students = [
      { rank: 1, name: "Trần Minh Tâm", faculty: "Khoa CNTT", points: 2450, events: 45, avatar: "https://i.pravatar.cc/100?img=33" },
      { rank: 2, name: "Nguyễn Thảo Ly", faculty: "Khoa Kinh Tế", points: 2100, events: 38, avatar: "https://i.pravatar.cc/100?img=5" },
      { rank: 3, name: "Lê Hoàng Nam", faculty: "Khoa Xây Dựng", points: 1950, events: 32, avatar: "https://i.pravatar.cc/100?img=11" },
      { rank: 4, name: "Phạm Thị Hoa", faculty: "Khoa Ngoại Ngữ", points: 1800, events: 29, avatar: "https://i.pravatar.cc/100?img=24" },
      { rank: 5, name: "Vũ Tuấn Anh", faculty: "Khoa Cơ Khí", points: 1750, events: 25, avatar: "https://i.pravatar.cc/100?img=59" },
  ];

  const fallbackTrendingEvents = [
      { id: 1, rank: 1, title: "Đêm nhạc hội Unplugged 2024", category: "Giải trí", rating: 4.9, participants: 5000, image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=400" },
      { id: 2, rank: 2, title: "Tech Talk: AI Revolution", category: "Học thuật", rating: 4.8, participants: 1200, image: "https://images.unsplash.com/photo-1544531696-6057a701f568?auto=format&fit=crop&q=80&w=400" },
      { id: 3, rank: 3, title: "Ngày hội hiến máu nhân đạo", category: "Tình nguyện", rating: 5.0, participants: 800, image: "https://images.unsplash.com/photo-1615461166324-cd1f91f9b9b0?auto=format&fit=crop&q=80&w=400" },
      { id: 4, rank: 4, title: "Giải bóng rổ sinh viên mở rộng", category: "Thể thao", rating: 4.7, participants: 300, image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=400" },
  ];

  const trendingEvents = topRatedEvents.length > 0
      ? topRatedEvents.map((event, index) => ({
          id: event.id,
          rank: index + 1,
          title: event.title,
          category: 'Đánh giá nổi bật',
          rating: Number(event.average_rating.toFixed(1)),
          participants: event.feedback_count,
          image: fallbackTrendingEvents[index % fallbackTrendingEvents.length].image,
      }))
      : fallbackTrendingEvents;

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brandBlue/5 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/5 rounded-full blur-[100px]"></div>

        <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-700 text-xs font-bold uppercase tracking-wider mb-4"
                 >
                    <Trophy size={14} className="fill-yellow-600" />
                    Bảng vàng thành tích
                 </motion.div>
                 <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-slate-900 mb-4"
                 >
                    Vinh danh <span className="text-brandBlue">Cá nhân & Sự kiện</span>
                 </motion.h2>
                 <p className="text-slate-500 max-w-2xl mx-auto">
                    Cập nhật liên tục theo thời gian thực. Hãy tích cực tham gia để ghi tên mình vào bảng vàng của trường!
                 </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Column 1: Top Students */}
                <div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brandBlue rounded-xl text-white shadow-lg shadow-brandBlue/30">
                                <Crown size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Sinh viên tiêu biểu</h3>
                                <p className="text-xs text-slate-500">Xếp hạng theo điểm rèn luyện tháng 11</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4">Xem tất cả</Button>
                    </div>

                    <div className="space-y-4">
                        {students.map((student) => (
                            <TopStudentRow key={student.rank} {...student} />
                        ))}
                    </div>
                </div>

                {/* Column 2: Trending Events */}
                <div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-secondary rounded-xl text-white shadow-lg shadow-secondary/30">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Sự kiện xu hướng</h3>
                                <p className="text-xs text-slate-500">Được quan tâm và đánh giá cao nhất</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4">Khám phá</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                        {trendingEvents.map((event) => (
                            <TrendingEventCard key={`${event.id}-${event.rank}`} {...event} />
                        ))}
                        
                        {/* Call to action card */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-brandBlue rounded-2xl p-6 text-white text-center flex flex-col items-center justify-center border border-white/10 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <h4 className="font-bold text-lg mb-2 relative z-10">Bạn muốn tổ chức sự kiện?</h4>
                            <p className="text-brandLightBlue/80 text-sm mb-4 relative z-10">Đăng ký ngay để sự kiện của bạn xuất hiện tại đây.</p>
                            <button className="text-sm font-bold bg-white text-brandBlue px-4 py-2 rounded-full hover:bg-secondary hover:text-white transition-colors flex items-center gap-2 relative z-10">
                                Tạo sự kiện ngay <ArrowRight size={14} />
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
};

export default Leaderboard;