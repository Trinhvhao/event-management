import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left hover:text-brandBlue transition-colors"
            >
                <span className="text-lg font-bold text-primary pr-8">{question}</span>
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-brandBlue text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-6 text-gray-500 leading-relaxed">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FAQ: React.FC = () => {
    const faqs = [
        {
            question: "Hệ thống có giới hạn số lượng sinh viên không?",
            answer: "Không. UniEvent được thiết kế trên nền tảng Cloud Computing có khả năng mở rộng tự động, hỗ trợ từ 1.000 đến 100.000+ sinh viên truy cập cùng lúc."
        },
        {
            question: "Làm thế nào để tích hợp với dữ liệu hiện có của trường?",
            answer: "Chúng tôi cung cấp bộ API chuẩn RESTful và hỗ trợ import danh sách sinh viên qua Excel/CSV. Đội ngũ kỹ thuật sẽ hỗ trợ đấu nối với hệ thống SSO hoặc LDAP của nhà trường."
        },
        {
            question: "Chi phí triển khai được tính như thế nào?",
            answer: "Chúng tôi có các gói linh hoạt theo năm hoặc theo quy mô sinh viên. Vui lòng liên hệ bộ phận kinh doanh để nhận báo giá chi tiết dành riêng cho giáo dục."
        },
        {
            question: "Sinh viên quên mang điện thoại thì điểm danh thế nào?",
            answer: "BTC có thể hỗ trợ điểm danh thủ công bằng cách nhập Mã số sinh viên (MSSV) trực tiếp trên Dashboard quản lý sự kiện."
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-16">
                    <div className="lg:w-1/3">
                        <span className="text-secondary font-bold uppercase tracking-wider text-sm">Hỗ trợ</span>
                        <h2 className="text-4xl font-bold mt-2 mb-6 text-primary">Câu hỏi thường gặp</h2>
                        <p className="text-gray-500 mb-8">
                            Nếu bạn có thắc mắc khác, vui lòng liên hệ trực tiếp với chúng tôi qua các kênh hỗ trợ.
                        </p>
                        <a href="#contact" className="text-brandBlue font-bold hover:underline">Liên hệ tư vấn &rarr;</a>
                    </div>
                    <div className="lg:w-2/3">
                        {faqs.map((faq, index) => (
                            <FAQItem key={index} {...faq} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;