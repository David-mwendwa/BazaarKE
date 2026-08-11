import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ROUTES } from '../../constants/routes';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../common/Logo';
import {
  Menu,
  X as XIcon,
  Search as SearchIcon,
  ShoppingCart,
  User,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  X,
  Settings,
  User as UserIcon,
  Package,
  Heart,
  LogOut,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Bell,
  Star,
  MessageCircle,
  FileText,
  Lock,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  ShoppingBag,
  BarChart2,
  Grid,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Truck,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronUp,
  MoreHorizontal,
  Share2,
  Tag,
  Percent,
  Gift,
  Award,
  Headphones,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Paperclip,
  Smile,
  Camera,
  Video,
  Mic,
  MoreVertical,
  Edit,
  Trash,
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff,
  Unlock,
  BellOff,
  UserX,
} from 'lucide-react';
import { Button } from '../ui/Button';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { cartItems = [], itemCount: cartCount = 0 } = useCart();
  const { items: wishlistItems = [], hasLoaded } = useWishlist();
  const wishlistCount = hasLoaded ? wishlistItems.length : 0;
  const {
    isAuthenticated,
    user: authData,
    logout,
    isLoading: authLoading,
  } = useAuth();
  const user = authData?.user; // Extract user from the response object

  // Auth state changes are handled internally
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu((prev) => !prev);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    window.addEventListener('popstate', closeMobileMenu);
    return () => window.removeEventListener('popstate', closeMobileMenu);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearchSuggestions(false);
    }
  };

  const navLinks = [
    {
      name: 'Home',
      path: '/',
      highlight: true,
    },
    {
      name: 'Shop',
      path: '/shop',
      highlight: true,
      new: true,
    },
    {
      name: 'Categories',
      path: '/categories',
      icon: Grid,
      submenu: [
        { name: 'All Categories', path: '/categories' },
        { name: 'Electronics', path: '/categories/electronics' },
        { name: 'Fashion', path: '/categories/fashion' },
        { name: 'Home & Garden', path: '/categories/home-garden' },
        { name: 'Beauty', path: '/categories/beauty' },
        { name: 'Sports', path: '/categories/sports' },
      ],
    },
    {
      name: 'Deals',
      path: '/deals',
      icon: Tag,
      highlight: true,
      badge: 'HOT',
    },
    {
      name: 'About',
      path: '/about',
      icon: Info,
    },
    {
      name: 'Contact',
      path: '/contact',
      icon: Mail,
    },
  ];

  const popularSearches = [
    {
      name: 'iPhone 15 Pro',
      category: 'Smartphones',
      icon: <TrendingUp className='h-4 w-4 text-green-500' />,
    },
    {
      name: 'MacBook Air M2',
      category: 'Laptops',
      icon: <Award className='h-4 w-4 text-blue-500' />,
    },
    {
      name: 'Sony WH-1000XM5',
      category: 'Headphones',
      icon: <Star className='h-4 w-4 text-yellow-500' />,
    },
    {
      name: 'Apple Watch Series 9',
      category: 'Smart Watches',
      icon: <Clock className='h-4 w-4 text-purple-500' />,
    },
    {
      name: 'Nike Air Max',
      category: 'Sneakers',
      icon: <TrendingUp className='h-4 w-4 text-red-500' />,
    },
  ];

  const getUserMenuItems = React.useCallback(
    (userRole) => {
      // Common items for all user roles
      const commonItems = [
        {
          name: 'My Profile',
          icon: UserIcon,
          path: '/account/profile',
          description:
            'Manage your personal information, contact details, and preferences',
          divider: userRole === 'vendor',
        },
      ];

      // Role-specific items
      const roleSpecificItems = {
        admin: [
          {
            name: 'Admin Dashboard',
            icon: Shield,
            path: '/dashboard/admin',
            description:
              'Manage users, products, orders, and view system analytics',
            divider: true,
          },
        ],
        vendor: [
          {
            name: 'Vendor Dashboard',
            icon: BarChart2,
            path: '/dashboard/vendor',
            description:
              'Track sales, manage inventory, and view customer orders',
            divider: true,
          },
        ],
        user: [
          {
            name: 'My Orders',
            icon: ShoppingBag,
            path: ROUTES.DASHBOARD.CUSTOMER_ORDERS || '/dashboard/orders',
            description:
              'View order history, track shipments, and manage returns',
          },
          {
            name: 'Wishlist',
            icon: Heart,
            path: ROUTES.DASHBOARD.CUSTOMER_WISHLIST || '/dashboard/wishlist',
            description:
              'Your saved items and favorite products for later purchase',
            badge: wishlistCount > 0 ? wishlistCount.toString() : null,
          },
        ],
      };

      // Bottom menu items
      const bottomItems = [
        {
          name: 'Help Center',
          icon: HelpCircle,
          path: '/help',
          description: 'FAQs, contact support, and troubleshooting guides',
          divider: true,
        },
        {
          name: 'Sign Out',
          path: '/logout',
          icon: LogOut,
          danger: true,
          description: 'Securely end your current session',
        },
      ];

      // Combine all menu items based on user role
      const menuItems = [
        ...commonItems,
        ...(roleSpecificItems[userRole] || []),
        ...bottomItems,
      ];

      return menuItems;
    },
    [cartCount, wishlistCount]
  ); // Add cartCount and wishlistCount as dependencies

  // Initialize user menu based on user role
  const userMenu = React.useMemo(() => {
    // Map legacy roles to new role system if needed
    const roleMap = {
      buyer: 'user',
      seller: 'vendor',
    };
    const normalizedRole = roleMap[user?.role] || user?.role || 'user';
    return getUserMenuItems(normalizedRole);
  }, [user?.role, getUserMenuItems]);

  // Animation variants for menu items
  const menuVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700'
            : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'
        }`}>
        <div className='relative'>
          {/* Top announcement bar - Hidden on dashboard routes */}
          {showAnnouncement && !location.pathname.startsWith('/dashboard') && (
            <div className='bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm text-center py-1.5 px-4'>
              <div className='container mx-auto flex items-center justify-center'>
                <span className='animate-pulse mr-2'>✨</span>
                <span>
                  Usafirishaji wa bure kwa agizo la zaidi ya Ksh 5,000 | Tumia
                  nambari ya kufungua: <strong>KARIBU10</strong> kwa punguzo la
                  10%
                </span>
                <button
                  onClick={() => setShowAnnouncement(false)}
                  className='ml-4 p-1 rounded-full transition-colors bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600'
                  aria-label='Close announcement'>
                  <XIcon className='h-3.5 w-3.5 text-white' />
                </button>
              </div>
            </div>
          )}

          <div className='container mx-auto px-4 2xl:px-6'>
            <div className='flex items-center justify-between h-16 md:h-20'>
              {/* Logo and Mobile Menu Button */}
              <div className='flex items-center'>
                <button
                  type='button'
                  className='lg:hidden p-2 -ml-2 text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label='Toggle menu'>
                  {isMobileMenuOpen ? (
                    <X className='h-6 w-6' />
                  ) : (
                    <Menu className='h-6 w-6' />
                  )}
                </button>
                <Logo className='ml-2 lg:ml-0' withBadge={true} size='lg' />
              </div>

              {/* Desktop Navigation */}
              <nav className='hidden lg:flex items-center h-full'>
                <ul className='flex items-center h-full'>
                  {navLinks.map((link, index) => (
                    <li key={link.path} className='h-full relative group'>
                      <Link
                        to={link.path}
                        className={`flex items-center h-full px-3 py-2 mx-1 text-sm font-medium rounded-lg transition-all ${
                          location.pathname === link.path
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                        } ${link.highlight ? 'font-semibold' : ''}`}>
                        {link.icon && (
                          <link.icon
                            className={`h-4 w-4 mr-2 ${link.highlight ? 'text-primary-500' : 'text-gray-500'}`}
                          />
                        )}
                        <span className='relative'>
                          {link.name}
                          {link.badge && (
                            <span className='absolute -top-2 -right-5 text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full'>
                              {link.badge}
                            </span>
                          )}
                          {link.new && (
                            <span className='absolute -top-2 -right-5 text-[8px] font-bold bg-emerald-500 text-white px-1 py-0.5 rounded-full'>
                              NEW
                            </span>
                          )}
                        </span>
                        {link.submenu && (
                          <ChevronDown className='ml-1 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-transform group-hover:rotate-180' />
                        )}
                      </Link>

                      {/* Dropdown Menu */}
                      {link.submenu && (
                        <div className='absolute left-0 top-full mt-1 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50'>
                          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-2'>
                            {link.submenu.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                className='flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'>
                                {item.name}
                                {item.icon && (
                                  <item.icon className='ml-auto h-4 w-4 text-gray-400' />
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Search and Actions */}
              <div className='flex items-center space-x-2 md:space-x-3'>
                {/* Search Bar */}
                <div className='relative hidden md:block' ref={searchRef}>
                  <form
                    onSubmit={handleSearch}
                    className={`relative flex items-center transition-all duration-300 ${
                      isSearchFocused ? 'w-80' : 'w-64'
                    }`}>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <SearchIcon
                        className={`h-4 w-4 transition-colors ${
                          isSearchFocused ? 'text-primary-500' : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchSuggestions(!!e.target.value);
                      }}
                      onFocus={() => {
                        setShowSearchSuggestions(!!searchQuery);
                        setIsSearchFocused(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowSearchSuggestions(false), 200);
                        setIsSearchFocused(false);
                      }}
                      placeholder='Search for products...'
                      className={`w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border-2 ${
                        isSearchFocused
                          ? 'border-primary-400 dark:border-primary-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200`}
                    />
                    {searchQuery && (
                      <button
                        type='button'
                        onClick={() => setSearchQuery('')}
                        className='absolute right-10 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors'>
                        <XIcon className='h-4 w-4' />
                      </button>
                    )}
                    <button
                      type='submit'
                      className='absolute right-2 p-1.5 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'>
                      <SearchIcon className='h-4 w-4' />
                    </button>
                  </form>

                  <AnimatePresence>
                    {showSearchSuggestions && searchQuery && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className='absolute z-50 mt-2 w-full rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
                        <div className='divide-y divide-gray-100 dark:divide-gray-700/50'>
                          <div className='px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50'>
                            <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                              Popular Searches
                            </h4>
                          </div>
                          <div className='py-1'>
                            {popularSearches
                              .filter(
                                (item) =>
                                  item.name
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()) ||
                                  item.category
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                              )
                              .slice(0, 5)
                              .map((item, index) => (
                                <motion.button
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => {
                                    navigate(
                                      `/search?q=${encodeURIComponent(item.name)}`
                                    );
                                    setSearchQuery('');
                                    setShowSearchSuggestions(false);
                                  }}
                                  className='flex items-center w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group'>
                                  <div className='flex-shrink-0 p-1.5 mr-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors'>
                                    {item.icon || (
                                      <SearchIcon className='h-4 w-4' />
                                    )}
                                  </div>
                                  <div className='flex-1 min-w-0'>
                                    <p className='font-medium text-gray-900 dark:text-white truncate'>
                                      {item.name}
                                    </p>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                                      {item.category}
                                    </p>
                                  </div>
                                  <ChevronRight className='ml-2 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors' />
                                </motion.button>
                              ))}

                            {searchQuery && (
                              <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                onClick={() => {
                                  navigate(
                                    `/search?q=${encodeURIComponent(searchQuery)}`
                                  );
                                  setSearchQuery('');
                                  setShowSearchSuggestions(false);
                                }}
                                className='w-full px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex items-center'>
                                <SearchIcon className='h-4 w-4 mr-2' />
                                Search for "{searchQuery}"
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Search Button */}
                <button
                  onClick={() => {
                    const searchInput = document.querySelector(
                      '.mobile-search-input'
                    );
                    if (searchInput) {
                      searchInput.focus();
                    }
                  }}
                  className='md:hidden p-2 text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                  <SearchIcon className='h-5 w-5' />
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className='p-2 rounded-full text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative group'
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                  <div className='relative h-5 w-5 flex items-center justify-center'>
                    <motion.div
                      key={theme === 'dark' ? 'sun' : 'moon'}
                      initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.8, rotate: 30 }}
                      transition={{ duration: 0.2 }}
                      className='absolute'>
                      {theme === 'dark' ? (
                        <Sun className='h-5 w-5 text-amber-400' />
                      ) : (
                        <Moon className='h-5 w-5 text-indigo-600' />
                      )}
                    </motion.div>
                    <span className='sr-only'>
                      {theme === 'dark'
                        ? 'Switch to light mode'
                        : 'Switch to dark mode'}
                    </span>
                  </div>
                </button>

                <Link
                  to={ROUTES.DASHBOARD.BUYER_WISHLIST}
                  className='p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative'
                  aria-label={`Wishlist with ${wishlistCount} items`}>
                  <Heart
                    className='h-5 w-5'
                    fill={wishlistCount > 0 ? 'currentColor' : 'none'}
                  />
                  {wishlistCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center'>
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={ROUTES.CART}
                  className='p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative'
                  aria-label={`Shopping cart with ${cartCount} items`}>
                  <ShoppingCart className='h-5 w-5' />
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center'>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated ? (
                  <div className='relative' ref={userMenuRef}>
                    <button
                      onClick={toggleUserMenu}
                      className='flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group'
                      aria-expanded={showUserMenu}
                      aria-haspopup='true'
                      aria-label='User menu'>
                      <div className='relative'>
                        <div className='h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium text-sm'>
                          {user?.firstName && user?.lastName ? (
                            `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                          ) : user?.firstName ? (
                            user.firstName[0].toUpperCase()
                          ) : (
                            <User className='h-4 w-4' />
                          )}
                        </div>
                        <div className='absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 bg-green-500'></div>
                      </div>
                      <span className='hidden md:inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors'>
                        {user?.firstName || 'Account'}
                        <ChevronDown
                          className={`ml-1 h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''} text-gray-600 dark:text-gray-300`}
                        />
                      </span>
                    </button>

                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          transition={{
                            duration: 0.15,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                          className='absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 overflow-hidden z-50 py-1'>
                          <div className='py-1'>
                            {userMenu.map((item, index) => (
                              <React.Fragment key={item.name}>
                                {item.divider && (
                                  <div className='border-t border-gray-100 dark:border-gray-700 my-1' />
                                )}
                                <motion.div
                                  custom={index}
                                  initial='hidden'
                                  animate='visible'
                                  variants={menuVariants}>
                                  <Link
                                    to='#'
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (item.name === 'Sign Out') {
                                        // Handle sign out
                                        logout();
                                      } else {
                                        // Navigate programmatically for better control
                                        if (item.path) {
                                          navigate(item.path);
                                        }
                                      }
                                      setShowUserMenu(false);
                                    }}
                                    className={`flex items-center px-4 py-2.5 text-sm ${
                                      item.danger
                                        ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20'
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50'
                                    } transition-colors group`}>
                                    <item.icon
                                      className={`h-4 w-4 mr-3 ${
                                        item.danger
                                          ? 'text-rose-500 dark:text-rose-400'
                                          : 'text-gray-400 group-hover:text-primary-500 dark:text-gray-500 dark:group-hover:text-primary-400'
                                      }`}
                                    />
                                    <span>{item.name}</span>
                                    {item.badge && (
                                      <span className='ml-auto bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-full'>
                                        {item.badge}
                                      </span>
                                    )}
                                  </Link>
                                </motion.div>
                              </React.Fragment>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className='hidden md:flex items-center space-x-2'>
                    <Button
                      as={Link}
                      to={ROUTES.LOGIN}
                      variant='ghost'
                      size='sm'
                      className='text-gray-700 dark:text-gray-200'>
                      Sign in
                    </Button>
                    <Button
                      as={Link}
                      to={ROUTES.REGISTER}
                      variant='primary'
                      size='sm'>
                      Sign up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className='lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800'>
              <div className='px-2 pt-2 pb-3 space-y-1'>
                {navLinks.map((link) => (
                  <Link
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-base font-medium rounded-lg my-0.5 ${
                      location.pathname === link.path
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } transition-colors`}>
                    {link.name}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <div className='px-3 pt-2 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-800 mt-2'>
                    <Button
                      as={Link}
                      to={ROUTES.LOGIN}
                      variant='outline'
                      className='w-full justify-center'
                      onClick={() => setIsMobileMenuOpen(false)}>
                      Sign in
                    </Button>
                    <Button
                      as={Link}
                      to={ROUTES.REGISTER}
                      variant='primary'
                      className='w-full justify-center'
                      onClick={() => setIsMobileMenuOpen(false)}>
                      Create account
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
