import React from 'react';
import { Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SettingsMenuProps {
  isMenuOpen: boolean;
}

export default function SettingsMenu({ isMenuOpen }: SettingsMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative">
      <button
        onClick={() => navigate('/settings')}
        className={`w-full flex items-center ${isMenuOpen ? 'justify-start' : 'justify-center'} px-3 py-2 rounded-md transition-all duration-200 ${
          location.pathname === '/settings' 
            ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' 
            : 'text-teal-900 hover:bg-white/50'
        }`}
      >
        <Settings className="h-5 w-5 flex-shrink-0" />
        <span className={`ml-2 font-medium transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          Profile & Settings
        </span>
      </button>
    </div>
  );
}