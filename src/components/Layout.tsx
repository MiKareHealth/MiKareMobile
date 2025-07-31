import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { LogOut, UserPlus, ChevronLeft, Home, Menu, X, Sun, Moon, Users, Clock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import SettingsMenu from './SettingsMenu';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import type { Patient } from '../types/database';
import { useTheme } from '../contexts/ThemeContext';
import { MIKARE_HEART_LOGO, LOADING_ICON } from '../config/branding';
import { usePatients, PatientSummary } from '../contexts/PatientsContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
}

export default function Layout({ children, title, loading }: LayoutProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { patients, loading: patientsLoading, refreshPatients } = usePatients();
  const [signoutInProgress, setSignoutInProgress] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  
  // Mobile and desktop state management
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const { theme, toggleTheme } = useTheme();

  // Detect mobile vs desktop
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // On desktop, restore previous collapsed state, on mobile always start closed
      if (!mobile) {
        setIsMenuOpen(true);
      } else {
        setIsMenuOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;
    
    console.log('[Layout] Sidebar loading state:', { patientsLoading, patientsLength: patients.length, sidebarReady });
    
    // Show skeleton if still loading OR if we have no patients yet but loading is complete
    if (patientsLoading || (!patientsLoading && patients.length === 0 && !sidebarReady)) {
      console.log('[Layout] Showing skeleton loading');
      setSidebarReady(false);
      const start = Date.now();
      interval = setInterval(() => {
        // Stop showing skeleton if we have patients OR if loading is complete and we've waited long enough
        if (patients.length > 0 || (!patientsLoading && Date.now() - start > 400)) {
          console.log('[Layout] Stopping skeleton, patients:', patients.length, 'loading:', patientsLoading);
          setSidebarReady(true);
          clearInterval(interval);
        }
      }, 100);
      timeout = setTimeout(() => {
        console.log('[Layout] Skeleton timeout reached');
        setSidebarReady(true);
        clearInterval(interval);
      }, 400);
    } else {
      console.log('[Layout] Setting sidebar ready immediately');
      setSidebarReady(true);
    }
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [patientsLoading, patients.length, sidebarReady]);

  const handleSignOut = async () => {
    if (signoutInProgress) return;
    
    setSignoutInProgress(true);
    
    try {
      localStorage.removeItem('sessionStart');
      localStorage.removeItem('sessionLength');
      
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error during sign out:', error);
      navigate('/signin');
    }
  };

  const toggleMenu = () => {
    if (isMobile) {
      setIsMenuOpen(!isMenuOpen);
    } else {
      setIsDesktopCollapsed(!isDesktopCollapsed);
    }
  };

  const closeMenu = () => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  // Calculate sidebar width and main content margin
  const getSidebarWidth = () => {
    if (isMobile) {
      return isMenuOpen ? 'w-64' : 'w-0';
    } else {
      return isDesktopCollapsed ? 'w-20' : 'w-64';
    }
  };

  const getMainMargin = () => {
    if (isMobile) {
      return 'ml-0'; // No margin on mobile since sidebar is overlay
    } else {
      return isDesktopCollapsed ? 'ml-20' : 'ml-64';
    }
  };

  return (
    <div className="min-h-screen bg-background-surface animate-fade-down flex max-w-full overflow-x-hidden">
      {/* Mobile Backdrop */}
      {isMobile && isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar Toggle Button - Positioned on right edge of sidebar, vertically centered */}
      {!isMobile && (
        <button
          onClick={toggleMenu}
          className={`fixed top-1/2 transform -translate-y-1/2 z-50 p-2 bg-white dark:bg-neutral-800 rounded-r-md shadow-lg hover:shadow-xl border border-l-0 border-gray-200 dark:border-neutral-800 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-neutral-700 ${
            isDesktopCollapsed ? 'left-20' : 'left-64'
          }`}
          aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`h-5 w-5 text-gray-500 dark:text-gray-300 transition-transform duration-200 ${isDesktopCollapsed ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Mobile Toggle Button - Only show when menu is closed */}
      {isMobile && !isMenuOpen && (
        <button
          onClick={toggleMenu}
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-800 rounded-md shadow-lg hover:shadow-xl border border-gray-200 dark:border-neutral-800 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-500 dark:text-gray-300" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed' : 'fixed'} 
        inset-y-0 left-0 
        ${getSidebarWidth()} 
        bg-background-light shadow-lg 
        transform transition-all duration-300 ease-in-out 
        ${isMobile && !isMenuOpen ? '-translate-x-full' : 'translate-x-0'}
        z-50 border-r border-border
        overflow-hidden
      `}>
        <div className="h-full flex flex-col">
          {/* Menu Header - Desktop only */}
          {!isMobile && (
            <div className={`relative ${isDesktopCollapsed ? 'w-20' : 'w-64'} flex items-center justify-center py-8`}>
              <img 
                src={isDesktopCollapsed 
                  ? MIKARE_HEART_LOGO
                  : MIKARE_HEART_LOGO
                }
                alt="MiKare"
                className={isDesktopCollapsed ? "h-8 w-8 object-contain" : "h-12 object-contain"}
              />
            </div>
          )}

          {/* Mobile Header with Close Button */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <img 
                src={MIKARE_HEART_LOGO}
                alt="MiKare" 
                className="h-8" 
              />
              <button
                onClick={closeMenu}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Navigation Section */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                <button
                  onClick={() => navigate('/')}
                  className={`w-full flex items-center ${(!isMobile && isDesktopCollapsed) ? 'justify-center' : 'justify-start'} px-3 py-2 rounded-md transition-all duration-200 ${
                    location.pathname === '/' 
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' 
                      : 'text-teal-900 hover:bg-white/50'
                  }`}
                >
                  <Home className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className={`font-medium transition-opacity duration-300 ${(!isMobile && isDesktopCollapsed) ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    Home
                  </span>
                </button>
              </div>

              {/* Actions Section */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                <button
                  onClick={() => navigate('/add-patient')}
                  className={`w-full flex items-center ${(!isMobile && isDesktopCollapsed) ? 'justify-center' : 'justify-start'} px-3 py-2 rounded-md transition-all duration-200 ${
                    location.pathname === '/add-patient' 
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' 
                      : 'text-teal-900 hover:bg-white/50'
                  }`}
                >
                  <UserPlus className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className={`font-medium transition-opacity duration-300 ${(!isMobile && isDesktopCollapsed) ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    Add person
                  </span>
                </button>
              </div>

              {/* Patients List */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                <h3 className={`px-3 py-2 text-sm font-semibold text-teal-900 ${(!isMobile && isDesktopCollapsed) ? 'text-center' : 'text-left'} ${((!isMobile && isDesktopCollapsed)) ? 'hidden' : ''}`}>
                  {(!isMobile && isDesktopCollapsed) ? 'People' : 'My people'}
                </h3>
                <div className="mt-2 space-y-1">
                  {!sidebarReady ? (
                    // Show skeleton loading while waiting for sidebarReady
                    Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/80 shadow-inner">
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200 text-teal-600 font-medium">
                            {index + 1}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Show actual patients or empty state
                    patients.length > 0 ? (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/patient/${p.id}`)}
                          className={`w-full flex items-center ${(!isMobile && isDesktopCollapsed) ? 'justify-center' : 'justify-start'} px-3 py-2 rounded-md transition-all duration-200 ${
                            p.id === id 
                              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' 
                              : 'text-teal-900 hover:bg-white/50'
                          }`}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/80 shadow-inner">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200 text-teal-600 font-medium">
                                {p.full_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className={`ml-3 font-medium truncate transition-opacity duration-300 ${(!isMobile && isDesktopCollapsed) ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            {p.full_name}
                          </span>
                        </button>
                      ))
                    ) : (
                      // Empty state when no patients
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No people yet
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* People Shared With Me Section */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-2">
                <h3 className={`px-3 py-2 text-sm font-semibold text-purple-900 ${(!isMobile && isDesktopCollapsed) ? 'text-center' : 'text-left'} ${((!isMobile && isDesktopCollapsed)) ? 'hidden' : ''}`}>
                  {(!isMobile && isDesktopCollapsed) ? 'Shared' : 'Shared with me'}
                </h3>
                <div className="mt-2">
                  <div className={`p-3 ${(!isMobile && isDesktopCollapsed) ? 'text-center' : ''}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className={`h-5 w-5 text-purple-500 ${(!isMobile && isDesktopCollapsed) ? 'mx-auto' : ''}`} />
                      {!(!isMobile && isDesktopCollapsed) && (
                        <span className="font-medium text-purple-800">Coming Soon</span>
                      )}
                    </div>
                    
                    {!(!isMobile && isDesktopCollapsed) && (
                      <p className="text-xs text-gray-600">
                        Securely share your health profile with people you choose—and view the profiles they share with you.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-neutral-800 dark:to-neutral-900">
            <SettingsMenu isMenuOpen={!(!isMobile && isDesktopCollapsed)} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${getMainMargin()} w-full max-w-full overflow-x-hidden`}>
        <nav className={`fixed top-0 right-0 left-0 bg-white dark:bg-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-800 z-20 transition-all duration-300 ease-in-out ${getMainMargin()}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                <button
                  onClick={() => navigate('/')}
                  className="hidden sm:inline-flex items-center text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 flex-shrink-0"
                >
                  <Home className="h-5 w-5" />
                </button>
                {title && (
                  <>
                    <span className="hidden sm:block text-gray-400 dark:text-gray-500">/</span>
                    <span className="hidden sm:block text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</span>
                  </>
                )}
              </div>
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={toggleTheme}
                  className="mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-700" />
                  )}
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signoutInProgress}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-md shadow-sm transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
                  {signoutInProgress ? 'Signing Out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 pt-16">
          <div className="sm:max-w-7xl sm:mx-auto sm:py-3 sm:py-6 sm:px-3 sm:px-6 lg:px-8 max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}