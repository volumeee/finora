/**
 * Utility functions for consistent formatting across the application
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

export const parseFormattedNumber = (str: string): number => {
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatDateShort = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('id-ID');
};

export const getTransactionColor = (type: string) => {
  switch (type) {
    case 'pemasukan':
    case 'income':
      return {
        text: 'text-green-700',
        bg: 'bg-green-50',
        border: 'border-l-green-500',
        icon: 'bg-green-100',
        light: 'text-green-600'
      };
    case 'pengeluaran':
    case 'expense':
      return {
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-l-red-500',
        icon: 'bg-red-100',
        light: 'text-red-600'
      };
    case 'transfer':
      return {
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-l-blue-500',
        icon: 'bg-blue-100',
        light: 'text-blue-600'
      };
    default:
      return {
        text: 'text-gray-700',
        bg: 'bg-gray-50',
        border: 'border-l-gray-500',
        icon: 'bg-gray-100',
        light: 'text-gray-600'
      };
  }
};