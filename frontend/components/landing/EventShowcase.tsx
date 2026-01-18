import React, { useState } from 'react';
import { Calendar, MapPin, Clock, ArrowRight, Search, Grid, CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

const EventCard: React.FC<{ title: string; date: string; time: string; location: string; category: string; image: string; index: number }> = ({ 
  title, date, time, location, category, image, index 
}) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full"
  >
    <div className="relative h-56 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity"></div>
      <img src={image} alt={title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
        {category}
      </div>
      <div className="absolute bottom-4 left-4 z-20 text-white">
        <div className="flex items-center gap-2 text-sm font-medium mb-1">
          <Calendar size={14} className="text-secondary" />
          <span>{date}</span>
        </div>
      </div>
    </div>
    <div className="p-6 flex-1 flex flex-col">
      <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-brandBlue transition-colors leading-snug">
        {title}
      </h3>
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock size={16} className="text-slate-400" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <MapPin size={16} className="text-slate-400" />
          <span className="truncate">{location}</span>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-50">
        <button className="text-brandBlue font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
          Xem chi tiết <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </motion.div>
);

const CalendarView: React.FC<{ events: any[] }> = ({ events }) => {
    // Mock Calendar Grid Logic (Visual representation)
    const days = Array.from({ length: 35 }, (_, i) => i + 1);
    
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col lg:flex-row"
        >
            {/* Left: Mini Calendar */}
            <div className="lg:w-1/3 bg-slate-50 p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-800">Tháng 11, 2024</h3>
                    <div className="flex gap-2">
                        <button className="p-1 hover:bg-slate-200 rounded-lg"><ChevronLeft size={20} className="text-slate-500"/></button>
                        <button className="p-1 hover:bg-slate-200 rounded-lg"><ChevronRight size={20} className="text-slate-500"/></button>
                    </div>
                </div>
                
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                        <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-2 gap-x-2">
                    {/* Placeholder for previous month days */}
                    {[29, 30, 31].map(d => (
                        <div key={`prev-${d}`} className="text-center text-sm py-2 text-slate-300 rounded-lg">{d}</div>
                    ))}
                    {/* Current month */}
                    {Array.from({length: 30}, (_, i) => i + 1).map(d => {
                        const hasEvent = events.some(e => e.date.includes(`${d} Tháng 11`));
                        return (
                            <div 
                                key={d} 
                                className={`
                                    relative text-center text-sm py-2 rounded-lg cursor-pointer transition-all
                                    ${hasEvent ? 'bg-brandBlue text-white font-bold shadow-md shadow-brandBlue/30' : 'text-slate-700 hover:bg-white hover:shadow'}
                                `}
                            >
                                {d}
                                {hasEvent && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-secondary"></div>}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-8">
                     <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Sắp diễn ra</h4>
                     <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex flex-col items-center justify-center leading-none border border-red-100">
                                <span className="text-xs font-bold">T11</span>
                                <span className="font-bold text-lg">20</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500">08:00 AM</div>
                                <div className="text-sm font-bold text-slate-800 line-clamp-1">TechExpo 2024</div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Right: Agenda Timeline */}
            <div className="lg:w-2/3 p-6 lg:p-8 bg-white max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-secondary font-bold uppercase tracking-wider text-xs">Lịch trình</span>
                        <h2 className="text-2xl font-bold text-slate-900 mt-1">Sự kiện trong tháng</h2>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex">Xuất lịch (iCal)</Button>
                </div>

                <div className="space-y-0 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100"></div>

                    {events.map((event, index) => (
                        <div key={index} className="relative pl-12 pb-8 last:pb-0 group">
                            {/* Timeline Dot */}
                            <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-white border-4 border-slate-100 group-hover:border-secondary transition-colors z-10 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 group-hover:bg-secondary transition-colors"></div>
                            </div>

                            <div className="bg-slate-50 hover:bg-white p-5 rounded-2xl border border-slate-100 hover:border-secondary/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full bg-brandBlue/5 text-brandBlue text-xs font-bold border border-brandBlue/10">
                                            {event.category}
                                        </span>
                                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                                            <Calendar size={14} /> {event.date}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-secondary flex items-center gap-1">
                                        <Clock size={14} /> {event.time}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-brandBlue transition-colors">{event.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                    <MapPin size={16} className="text-slate-400" />
                                    {event.location}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-brandBlue">
                                    Chi tiết <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

const EventShowcase: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  const events = [
    {
      title: "Ngày hội Việc làm Công nghệ TechExpo 2024 - Kết nối tương lai",
      category: "Hướng nghiệp",
      date: "20 Tháng 11",
      time: "08:00 - 16:00",
      location: "Hội trường A, Đại học Bách Khoa",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Workshop: Tư duy phản biện trong kỷ nguyên AI",
      category: "Kỹ năng mềm",
      date: "22 Tháng 11",
      time: "18:00 - 20:30",
      location: "Phòng 304, Tòa nhà Innovation",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Gala Âm nhạc: Giai điệu Tuổi trẻ 2024",
      category: "Văn nghệ",
      date: "25 Tháng 11",
      time: "19:00 - 22:00",
      location: "Sân khấu ngoài trời, Khu A",
      image: "https://tse1.mm.bing.net/th/id/OIP.ld16Hdba8_4__BTG3QQ5pAHaE7?w=1280&h=853&rs=1&pid=ImgDetMain&o=7&rm=3"
    },
    {
      title: "Giải bóng đá sinh viên toàn thành 2024",
      category: "Thể thao",
      date: "01 Tháng 12",
      time: "07:30 - 17:00",
      location: "Sân vận động Quân Khu 7",
      image: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Triển lãm Sáng tạo Sinh viên - Student Innovation",
      category: "Học thuật",
      date: "05 Tháng 12",
      time: "09:00 - 16:00",
      location: "Sảnh B, Nhà Văn hóa Sinh viên",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Cuộc thi Hackathon: Code for Green Life",
      category: "Công nghệ",
      date: "10 Tháng 12",
      time: "24h liên tục",
      location: "Khu Công nghệ phần mềm ITP",
      image: "https://th.bing.com/th/id/OIP.hfawrnz8WVYWLaqbkCC-4AHaDt?w=346&h=175&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3"
    }
  ];

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    event.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="events" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-8 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Sự kiện sắp diễn ra</h2>
            <p className="text-slate-500 text-lg">Khám phá và tham gia các hoạt động ngoại khóa hấp dẫn.</p>
          </div>
          <div className="flex gap-3">
             <Button 
                variant={viewMode === 'grid' ? "primary" : "outline"} 
                className="rounded-full px-6 gap-2"
                onClick={() => setViewMode('grid')}
             >
                <Grid size={18} /> Lưới
             </Button>
             <Button 
                variant={viewMode === 'calendar' ? "primary" : "outline"} 
                className="rounded-full px-6 gap-2"
                onClick={() => setViewMode('calendar')}
             >
                <CalendarDays size={18} /> Lịch biểu
             </Button>
          </div>
        </div>

        {/* Search Bar - Only show in Grid Mode or make it work for both if complex, simplified here */}
        {viewMode === 'grid' && (
            <div className="mb-12 relative max-w-lg">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm sự kiện, địa điểm, chủ đề..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue transition-all shadow-sm"
                    />
                </div>
            </div>
        )}

        <div className="min-h-[600px]">
            <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                    <motion.div 
                        key="grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {filteredEvents.length > 0 ? (
                            filteredEvents.map((event, index) => (
                                <EventCard key={event.title} index={index} {...event} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                    <Search className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy kết quả</h3>
                                <p className="text-slate-500">Vui lòng thử lại với từ khóa khác.</p>
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4 text-brandBlue font-semibold hover:underline"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <CalendarView events={events} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Mobile View Toggle Helper */}
        <div className="mt-8 md:hidden flex justify-center">
            <Button variant="outline" className="whitespace-nowrap rounded-full px-8 w-full" onClick={() => setViewMode(viewMode === 'grid' ? 'calendar' : 'grid')}>
                {viewMode === 'grid' ? 'Chuyển sang xem Lịch' : 'Chuyển sang xem Lưới'}
            </Button>
        </div>
      </div>
    </section>
  );
};

export default EventShowcase;