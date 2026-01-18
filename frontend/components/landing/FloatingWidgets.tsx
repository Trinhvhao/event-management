import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Phone } from 'lucide-react';

const FloatingWidgets: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Custom SVGs for Brands not in Lucide
  const ZaloIcon = () => (
    <svg viewBox="0 0 48 48" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M9.78 33.72h-2.5v-18h2.5v18zm10.97-17.5l-6.22 11.25v-11.25h-2.5v18h1.66l6.81-12.06v12.06h2.5v-18h-2.25zM36.47 18.25c-3.19 0-5.78 2.59-5.78 5.78s2.59 5.78 5.78 5.78 5.78-2.59 5.78-5.78-2.59-5.78-5.78-5.78zm0 9.06c-1.81 0-3.28-1.47-3.28-3.28s1.47-3.28 3.28-3.28 3.28 1.47 3.28 3.28-1.47 3.28-3.28 3.28zm-26.69-9.06h-5v2.5h5v-2.5z"/></svg>
  );

  const MessengerIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.36041 2 2 6.13629 2 11.3812C2 14.3364 3.53558 16.9749 5.92205 18.6655V21.6517C5.92205 21.8211 6.13286 21.9042 6.25208 21.7821L8.98188 18.9959C9.93922 19.2618 10.9509 19.4121 12 19.4121C17.6396 19.4121 22 15.2758 22 10.0309C22 4.78592 17.6396 2 12 2ZM13.0645 13.5678L10.9234 11.3812L6.74561 13.5678L11.3395 8.49414L13.4806 10.6807L17.6584 8.49414L13.0645 13.5678Z"/></svg>
  );

  const actions = [
    { 
      name: 'Chat AI Support', 
      icon: <Bot className="w-6 h-6" />, 
      color: 'bg-emerald-500', 
      delay: 0.1,
      onClick: () => alert("Mở cửa sổ chat AI...") 
    },
    { 
      name: 'Zalo Chat', 
      icon: <ZaloIcon />, 
      color: 'bg-blue-500', 
      delay: 0.2,
      onClick: () => window.open('#', '_blank')
    },
    { 
      name: 'Messenger', 
      icon: <MessengerIcon />, 
      color: 'bg-[#0084FF]', 
      delay: 0.3,
      onClick: () => window.open('#', '_blank')
    },
    { 
      name: 'Hotline: 1900 1234', 
      icon: <Phone className="w-6 h-6" />, 
      color: 'bg-red-500', 
      delay: 0.4,
      onClick: () => window.open('tel:19001234')
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {actions.map((action, index) => (
              <motion.div
                key={action.name}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: 0.05 * index }}
                className="flex items-center gap-3 group"
              >
                <span className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.name}
                </span>
                <button
                  onClick={action.onClick}
                  className={`w-12 h-12 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}
                >
                  {action.icon}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-colors relative z-50 ${
          isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-secondary to-brandRed'
        }`}
      >
        <AnimatePresence mode='wait'>
            {isOpen ? (
                <X className="w-8 h-8 text-white" key="close" />
            ) : (
                <div className="relative" key="open">
                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-secondary rounded-full"></span>
                     <MessageCircle className="w-8 h-8 text-white" />
                </div>
            )}
        </AnimatePresence>
      </motion.button>
      
      {/* Pulse effect when closed */}
      {!isOpen && (
        <span className="absolute bottom-0 right-0 w-16 h-16 rounded-full bg-secondary opacity-20 animate-ping pointer-events-none"></span>
      )}
    </div>
  );
};

export default FloatingWidgets;