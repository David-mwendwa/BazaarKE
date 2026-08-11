import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROUTES, DASHBOARD_LINKS } from '../../constants/routes';
import BrandLogo from '../../components/common/BrandLogo.jsx';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  Tag,
  BarChart2,
  BarChart3,
  BadgeCheck,
  FolderTree,
  MessageSquare,
  Heart,
  MapPin,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  List,
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Get the current role and path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentRole = pathSegments[1] || 'admin';
  const navLinks = DASHBOARD_LINKS[currentRole] || [];

  // Get the current path without query parameters
  const currentPath = location.pathname.split('?')[0];

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Get the icon component based on the name
  const getIcon = (iconName) => {
    const icons = {
      Grid: LayoutDashboard,
      LayoutDashboard, // Add this line to map 'LayoutDashboard' to the imported icon
      Users,
      Package,
      ShoppingBag,
      Tag,
      BarChart2,
      BarChart3,
      BadgeCheck,
      FolderTree,
      MessageSquare,
      Heart,
      MapPin,
      CreditCard,
      Settings,
      List,
    };
    return icons[iconName] || LayoutDashboard; // Fallback to LayoutDashboard if icon not found
  };

  // Close mobile menu when clicking outside on mobile
  React.useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClick = (event) => {
      const menuButton = document.querySelector(
        '[aria-label="Open main menu"]'
      );
      const sidebar = document.querySelector('.sidebar-content');

      if (window.innerWidth >= 1024) return; // Don't close on desktop

      const isClickInside = (element) => {
        if (!element) return false;
        let current = event.target;
        while (current) {
          if (current === element) return true;
          current = current.parentElement;
        }
        return false;
      };

      if (!isClickInside(sidebar) && !isClickInside(menuButton)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [mobileMenuOpen]);

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative'>
      {/* Mobile menu overlay - Only show when sidebar is open on mobile */}
      {mobileMenuOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-40 lg:hidden'
          onClick={() => setMobileMenuOpen(false)}
          style={{
            pointerEvents: 'auto', // Ensure overlay is clickable
            WebkitTapHighlightColor: 'transparent',
          }}
        />
      )}

      {/* Mobile menu button - Fixed at the top */}
      <div className='lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800'>
        <button
          type='button'
          className='p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-all duration-200 relative z-[61]'
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className='sr-only'>Open main menu</span>
          {mobileMenuOpen ? (
            <X className='h-6 w-6' aria-hidden='true' />
          ) : (
            <Menu className='h-6 w-6' aria-hidden='true' />
          )}
        </button>
        <BrandLogo className='ml-4 text-xl' iconSize={20} />
      </div>

      <div className='flex flex-1'>
        {/* Sidebar */}
        <div
          role='navigation'
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 transform bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
            'lg:w-64 xl:w-72 2xl:w-80',
            'border-r border-gray-200 dark:border-gray-700',
            'sidebar-content flex flex-col',
            mobileMenuOpen
              ? 'translate-x-0 shadow-2xl'
              : '-translate-x-full lg:shadow-none'
          )}>
          {/* Mobile header - only visible on mobile */}
          <div className='lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700'>
            <BrandLogo className='text-xl' iconSize={20} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'>
              <X className='h-5 w-5' />
            </button>
          </div>
          <div className='flex-1 flex flex-col'>
            {/* Sidebar Header */}
            {/* The brand, not the role — the nav links below already say which
                dashboard this is, and matching the storefront header keeps the
                two halves of the app looking like one product. */}
            <div className='flex-shrink-0 hidden lg:flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
              <BrandLogo />
            </div>

            {/* Navigation */}
            <nav className='flex-1 px-2 py-4 space-y-1'>
              <div className='px-2 space-y-1'>
                {navLinks.map((item) => {
                  const Icon = getIcon(item.icon);
                  // For the Overview link, match exact path
                  if (item.path === `/${pathSegments.slice(0, 2).join('/')}`) {
                    var isActive = currentPath === item.path;
                  }
                  // For other links, check if current path starts with the item path
                  // but also make sure it's not a partial match (e.g., /dashboard/admin/prod should not match /dashboard/admin/products)
                  else {
                    isActive =
                      currentPath === item.path ||
                      (currentPath.startsWith(item.path) &&
                        (currentPath.length === item.path.length ||
                          currentPath[item.path.length] === '/'));
                  }

                  return (
                    <a
                      key={item.name}
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        isActive
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                        'group flex items-center px-4 py-3.5 text-base font-medium rounded-md transition-colors mx-2 lg:text-[15px] lg:py-2.5',
                        'active:bg-primary-50 active:dark:bg-primary-900/20', // Add active state for touch devices
                        'cursor-pointer select-none' // Ensure clickable area works
                      )}
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      {Icon && (
                        <Icon
                          className={cn(
                            isActive
                              ? 'text-primary-500 dark:text-primary-400'
                              : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400',
                            'mr-3 h-5 w-5 flex-shrink-0'
                          )}
                          aria-hidden='true'
                        />
                      )}
                      <span className='truncate'>{item.name}</span>
                    </a>
                  );
                })}
              </div>
            </nav>

            {/* User profile dropdown */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='relative'>
                <button
                  type='button'
                  className='flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700'
                  onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <div className='flex items-center min-w-0'>
                    <div className='h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0'>
                      <User className='h-4 w-4 text-primary-600 dark:text-primary-400' />
                    </div>
                    <div className='ml-3 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                        {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0]}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden='true'
                  />
                </button>

                {/* Dropdown menu - Updated to match header */}
                {userMenuOpen && (
                  <div className='absolute bottom-full left-0 right-0 mb-2 w-full overflow-hidden rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50'>
                    <div className='py-1'>
                      {/* The profile page is a storefront route — one page for
                          every role, so this deliberately leaves the dashboard. */}
                      <button
                        type='button'
                        className='flex w-full items-center rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/account/profile');
                        }}>
                        <User className='mr-3 h-5 w-5 text-gray-400' />
                        <span>My profile</span>
                      </button>
                      {/* Sign out button — its own radius matches the ported
                          DropdownMenuItem elsewhere, and the wrapper above
                          clips it so the hover highlight can't square off the
                          corners the container itself is rounding. */}
                      <button
                        type='button'
                        className='flex w-full items-center rounded-md px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700'
                        onClick={() => {
                          handleLogout();
                          setUserMenuOpen(false);
                        }}>
                        <LogOut className='mr-3 h-5 w-5 text-red-400' />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content
            - `min-w-0`: without it this flex child defaults to min-width:auto,
              so a wide table stretches the whole page instead of scrolling
              inside its own card.
            - `pt-16 lg:pt-0`: clears the fixed mobile header, which otherwise
              sits on top of the first row of content below `lg`. */}
        <div className='min-w-0 flex-1'>
          <main className='min-h-screen p-3 pt-16 sm:p-4 sm:pt-16 md:p-5 md:pt-16 lg:p-6 lg:pt-6'>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
