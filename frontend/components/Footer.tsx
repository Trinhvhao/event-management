import React from 'react';
import { CalendarCheck, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer id="footer" className="bg-brandBlue text-white pt-20 pb-10 border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CalendarCheck className="text-secondary w-8 h-8" />
              <span className="text-2xl font-bold">Uni<span className="text-secondary">Event</span></span>
            </div>
            <p className="text-brandLightBlue/80 leading-relaxed">
              Nền tảng quản lý sự kiện và hoạt động ngoại khóa hàng đầu cho các trường đại học và cao đẳng tại Việt Nam.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-secondary transition-colors">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Sản phẩm</h4>
            <ul className="space-y-4">
              {['Tính năng', 'Bảng giá', 'Tải ứng dụng', 'API Document', 'Changelog'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-brandLightBlue/70 hover:text-secondary transition-colors block">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Hỗ trợ</h4>
            <ul className="space-y-4">
              {['Trung tâm trợ giúp', 'Cộng đồng', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Liên hệ sale'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-brandLightBlue/70 hover:text-secondary transition-colors block">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Liên hệ</h4>
            <ul className="space-y-4 text-brandLightBlue/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
                <span>Tầng 12, Tòa nhà Innovation, Khu Công nghệ cao, TP. Thủ Đức</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-secondary flex-shrink-0" />
                <span>1900 123 456</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-secondary flex-shrink-0" />
                <span>contact@unievent.edu.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-brandLightBlue/50">
          <p>© 2024 UniEvent Pro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;