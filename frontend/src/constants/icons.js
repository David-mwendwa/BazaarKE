/**
 * Icons and Emojis used throughout the application
 * Organized by category for better maintainability
 *
 * This file contains two main sections:
 * 1. EMOJIS - Unicode emoji characters
 * 2. ICONS - Lucide React components (from 'lucide-react')
 */

// ======================
// 1. EMOJIS (Unicode characters)
// ======================

export const EMOJIS = {
  // Basic Actions
  VIEW: '👁️',
  EDIT: '✏️',
  DELETE: '🗑️',
  ADD: '➕',
  SAVE: '💾',
  CANCEL: '❌',
  CONFIRM: '✅',
  CLOSE: '✕',
  SEARCH: '🔍',
  FILTER: '🔍',
  SORT_UP: '↑',
  SORT_DOWN: '↓',

  // Status
  LOADING: '⏳',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',

  // Navigation
  NEXT: '→',
  PREV: '←',
  FIRST: '⏮️',
  LAST: '⏭️',

  // User Actions
  USER: '👤',
  LOGOUT: '🚪',
  SETTINGS: '⚙️',
  NOTIFICATION: '🔔',

  // File Operations
  UPLOAD: '📤',
  DOWNLOAD: '📥',
  FOLDER: '📁',
  FILE: '📄',

  // Product Specific
  PRODUCT: '📦',
  INVENTORY: '📊',
  PRICE_TAG: '🏷️',
  DISCOUNT: '🏷️💲',

  // Order Specific
  CART: '🛒',
  SHOPPING_BAG: '🛍️',
  PACKAGE: '📦',
  TRUCK: '🚚',

  // Payment Status
  PAID: '💳',
  UNPAID: '💸',
  REFUND: '↩️',

  // General UI
  CHECK: '✓',
  CROSS: '✗',
  PLUS_SYMBOL: '+',
  MINUS: '-',
  ELLIPSIS: '⋯',

  // Social
  LIKE: '👍',
  DISLIKE: '👎',
  SHARE: '↗️',

  // Categories (using emojis for better recognition)
  CATEGORIES: {
    ELECTRONICS: '📱',
    FASHION: '👕',
    HOME: '🏠',
    BEAUTY: '💄',
    SPORTS: '⚽',
    BOOKS: '📚',
    FOOD: '🍎',
    TOYS: '🧸',
    AUTOMOTIVE: '🚗',
    HEALTH: '💊',
    OFFICE: '📎',
    GARDEN: '🌻',
    PETS: '🐶',
    BABY: '👶',
  },

  // Order Status
  STATUS: {
    PENDING: '⏳',
    PROCESSING: '🔄',
    SHIPPED: '🚚',
    DELIVERED: '📦✅',
    CANCELLED: '❌',
    RETURNED: '↩️',
    REFUNDED: '💸',
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CREDIT_CARD: '💳',
    PAYPAL: '🔵',
    BANK_TRANSFER: '🏦',
    CASH: '💵',
    CRYPTO: '🪙',
  },
};

// ======================
// Legacy Exports (for backward compatibility)
// ======================

// Export individual emojis for easier imports
export const {
  VIEW,
  EDIT: EDIT_EMOJI,
  DELETE,
  ADD,
  SAVE,
  CANCEL,
  CONFIRM,
  CLOSE,
  SEARCH: SEARCH_EMOJI,
  LOADING,
  SUCCESS,
  ERROR,
  WARNING,
  NEXT,
  PREV,
  USER: USER_EMOJI,
  LOGOUT,
  SETTINGS,
  UPLOAD,
  DOWNLOAD: DOWNLOAD_EMOJI,
  PRODUCT,
  CART,
  PAID,
  UNPAID,
  LIKE,
  DISLIKE,
  SHARE,
} = EMOJIS;

// Export categories and other groups
export const { CATEGORIES, STATUS, PAYMENT_METHODS } = EMOJIS;

// Alias ACTION_ICONS to EMOJIS for backward compatibility
export const ACTION_ICONS = EMOJIS;

// ======================
// 2. ICONS (Lucide React components)
// ======================

export const ICONS = {
  // Navigation
  SEARCH: 'Search',
  FILTER: 'Filter',
  DOWNLOAD: 'Download',
  PLUS: 'Plus',
  MORE_HORIZONTAL: 'MoreHorizontal',
  MORE_VERTICAL: 'MoreVertical',
  CHECK: 'Check',
  X: 'X',
  CLOCK: 'Clock',
  EYE: 'Eye',
  EDIT: 'Edit',
  TRASH: 'Trash2',
  STAR: 'Star',

  // Files & Documents
  FILE_TEXT: 'FileText',
  FILE_SEARCH: 'FileSearch',
  PRINTER: 'Printer',
  PRINT: 'Printer',

  // Products & Inventory
  PACKAGE: 'Package',
  PACKAGE_CHECK: 'PackageCheck',
  PACKAGE_X: 'PackageX',
  TRUCK: 'Truck',
  ARCHIVE: 'Archive',
  COPY: 'Copy',
  TAG: 'Tag',
  LIST_PLUS: 'ListPlus',

  // Status
  CHECK_CIRCLE: 'CheckCircle',
  ALERT_CIRCLE: 'AlertCircle',

  // User Interface
  CHEVRON_DOWN: 'ChevronDown',
  CHEVRON_RIGHT: 'ChevronRight',
  ARROW_RIGHT: 'ArrowRight',

  // Dashboard
  SHOPPING_BAG: 'ShoppingBag',
  BAR_CHART: 'BarChart2',
  USERS: 'Users',
  USER: 'User',
  MAIL: 'Mail',

  // Admin Dashboard
  CALENDAR: 'Calendar',
  BELL: 'Bell',
  SETTINGS: 'Settings',
  LOGOUT: 'LogOut',
  USER_PLUS: 'UserPlus',
  USER_MINUS: 'UserMinus',
  USER_CHECK: 'UserCheck',
  USER_X: 'UserX',
  LOCK: 'Lock',
  UNLOCK: 'Unlock',
  INFO: 'Info',
  HELP_CIRCLE: 'HelpCircle',
};
