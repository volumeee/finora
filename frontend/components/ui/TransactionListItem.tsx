import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatCurrency, getTransactionColor } from "@/lib/format";

interface Transaction {
  id: string;
  akun_id: string;
  kategori_id?: string;
  jenis: "pemasukan" | "pengeluaran" | "transfer";
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan?: string;
  nama_akun?: string;
  nama_kategori?: string;
  transfer_info?: {
    type: "masuk" | "keluar";
    paired_account_id: string;
    paired_transaction_id: string;
    transfer_id: string;
    paired_account_name?: string;
  };
}

interface TransactionListItemProps {
  transaction: Transaction;
  getAccountName: (accountId: string) => string;
  getCategoryName: (categoryId?: string) => string;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  showActions?: boolean;
  compact?: boolean;
}

const safeFormatCurrency = (value: number | undefined | null): string => {
  const numValue = Number(value);
  return Number.isFinite(numValue) ? formatCurrency(numValue) : formatCurrency(0);
};

const getTransactionIcon = (type: string, transferType?: string): JSX.Element => {
  switch (type) {
    case "pemasukan":
    case "income":
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    case "pengeluaran":
    case "expense":
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    case "transfer":
      return transferType === 'keluar' ? 
        <ArrowUpRight className="h-4 w-4 text-orange-600" /> : 
        <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
    default:
      return <ArrowUpRight className="h-4 w-4" />;
  }
};

export function TransactionListItem({
  transaction,
  getAccountName,
  getCategoryName,
  onEdit,
  onDelete,
  showActions = true,
  compact = false
}: TransactionListItemProps): JSX.Element {
  const isTransfer = transaction.jenis === "transfer";
  const isIncome = transaction.jenis === "pemasukan" || transaction.jenis === "income";
  const isExpense = transaction.jenis === "pengeluaran" || transaction.jenis === "expense";
  const transferInfo = transaction.transfer_info;
  const transferType = transferInfo?.type;

  // For transfers, render based on type
  if (isTransfer && transferInfo) {
    const isOut = transferType === 'keluar';
    const currentAccountName = transaction.nama_akun || getAccountName(transaction.akun_id);
    const pairedAccountName = transferInfo.paired_account_name || 
      (transferInfo.paired_account_id ? getAccountName(transferInfo.paired_account_id) : 'Tujuan Tabungan');
    
    return (
      <div className={`flex items-center ${compact ? 'gap-2 sm:gap-3 p-2 sm:p-3' : 'justify-between p-4'} rounded-lg border-l-4 ${
        isOut ? 'border-orange-400 bg-orange-50' : 'border-blue-400 bg-blue-50'
      } hover:shadow-md transition-shadow`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`${compact ? 'p-1.5 sm:p-2' : 'p-2'} rounded-lg ${
            isOut ? 'bg-orange-100' : 'bg-blue-100'
          }`}>
            {isOut ? 
              <ArrowUpRight className="h-4 w-4 text-orange-600" /> :
              <ArrowDownLeft className="h-4 w-4 text-blue-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm sm:text-base' : ''}`}>
              {isOut ? `Transfer Keluar ke ${pairedAccountName}` : `Transfer Masuk dari ${pairedAccountName}`}
            </h3>
            <p className={`text-gray-600 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
              {isOut ? 'Keluar dari' : 'Masuk ke'} {currentAccountName} • {new Date(transaction.dibuat_pada).toLocaleString("id-ID", {
                weekday: 'short',
                year: 'numeric', 
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            {transaction.catatan && (
              <p className={`text-gray-500 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                {transaction.catatan}
              </p>
            )}
          </div>
        </div>
        <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2 sm:gap-3'} flex-shrink-0`}>
          <div className="text-right">
            <p className={`font-semibold truncate ${compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base'} ${
              isOut ? 'text-orange-700' : 'text-blue-700'
            }`}>
              {isOut ? '-' : '+'}{safeFormatCurrency(transaction.nominal)}
            </p>
            <p className={`truncate ${compact ? 'text-xs sm:text-sm' : 'text-xs'} ${
              isOut ? 'text-orange-600' : 'text-blue-600'
            }`}>
              {isOut ? `ke ${pairedAccountName}` : `dari ${pairedAccountName}`}
            </p>
          </div>
          {showActions && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(transaction)}
                disabled={true}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(transaction)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular transactions
  const colors = getTransactionColor(transaction.jenis);
  
  return (
    <div className={`flex items-center ${compact ? 'gap-2 sm:gap-3 p-2 sm:p-3' : 'justify-between p-4'} rounded-lg border-l-4 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`${compact ? 'p-1.5 sm:p-2' : 'p-2'} rounded-lg ${colors.icon}`}>
          {getTransactionIcon(transaction.jenis, transferType)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm sm:text-base' : ''}`}>
            {transaction.catatan?.includes('Saldo awal') ? (
              transaction.catatan.includes('utang') ? '💳 Saldo Awal Utang' : '💰 Saldo Awal Akun'
            ) : (
              transaction.nama_kategori || getCategoryName(transaction.kategori_id)
            )}
          </h3>
          <p className={`text-gray-600 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            {isIncome ? 'Masuk ke' : isExpense ? 'Keluar dari' : ''} {transaction.nama_akun || getAccountName(transaction.akun_id)} • {new Date(transaction.dibuat_pada).toLocaleString("id-ID", {
              weekday: 'short',
              year: 'numeric',
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {transaction.catatan && (
            <p className={`text-gray-500 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
              {transaction.catatan}
            </p>
          )}
        </div>
      </div>
      <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2 sm:gap-3'} flex-shrink-0`}>
        <div className="text-right">
          <p className={`font-semibold ${colors.text} truncate ${compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base'}`}>
            {isIncome ? '+' : isExpense ? '-' : ''}
            {safeFormatCurrency(transaction.nominal)}
          </p>
          <p className={`capitalize ${colors.light} truncate ${compact ? 'text-xs sm:text-sm' : 'text-xs'}`}>
            {transaction.jenis === "income" ? "pemasukan" : transaction.jenis === "expense" ? "pengeluaran" : transaction.jenis}
          </p>
        </div>
        {showActions && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(transaction)}
              disabled={isTransfer}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(transaction)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}