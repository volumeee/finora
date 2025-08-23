import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTrigger } from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogForm,
  ResponsiveDialogActions,
  ResponsiveDialogButton,
} from "@/components/ui/ResponsiveDialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Utensils, Car, ShoppingCart, Clapperboard, Receipt, Banknote, TrendingUp, HelpCircle, Home, Gamepad2, Shirt, Plane, Smartphone, Zap, DollarSign, Gift, Briefcase, Trophy, Target, Diamond, Wrench, Palette, Book, Coffee, Heart, Music, Camera, MapPin, ShoppingBag, CreditCard, Fuel, GraduationCap, Stethoscope, Dumbbell, Scissors, Hammer, PaintBucket } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import apiClient from "@/lib/api-client";
import { CategorySkeleton } from "@/components/ui/skeletons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Category {
  id: string;
  tenant_id?: string;
  nama_kategori: string;
  warna: string;
  ikon: string;
  kategori_induk_id?: string;
  sistem_bawaan: boolean;
  dibuat_pada: Date;
  diubah_pada: Date;
}

interface CategoryFormData {
  nama_kategori: string;
  kategori_induk_id: string;
  ikon: string;
  warna: string;
}

interface IconOption {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const iconMap = {
  'utensils': Utensils,
  'car': Car,
  'shopping-cart': ShoppingCart,
  'clapperboard': Clapperboard,
  'receipt': Receipt,
  'banknote': Banknote,
  'trending-up': TrendingUp,
  'help-circle': HelpCircle,
  'home': Home,
  'gamepad-2': Gamepad2,
  'shirt': Shirt,
  'plane': Plane,
  'smartphone': Smartphone,
  'zap': Zap,
  'dollar-sign': DollarSign,
  'gift': Gift,
  'briefcase': Briefcase,
  'trophy': Trophy,
  'target': Target,
  'diamond': Diamond,
  'wrench': Wrench,
  'palette': Palette,
  'book': Book,
  'coffee': Coffee,
  'heart': Heart,
  'music': Music,
  'camera': Camera,
  'map-pin': MapPin,
  'shopping-bag': ShoppingBag,
  'credit-card': CreditCard,
  'fuel': Fuel,
  'graduation-cap': GraduationCap,
  'stethoscope': Stethoscope,
  'dumbbell': Dumbbell,
  'scissors': Scissors,
  'hammer': Hammer,
  'paint-bucket': PaintBucket
} as const;

type IconName = keyof typeof iconMap;

const defaultIcons: IconOption[] = Object.entries(iconMap).map(([name, icon]) => ({ 
  name, 
  icon 
}));

const defaultColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#000000",
] as const;

const INITIAL_FORM_DATA: CategoryFormData = {
  nama_kategori: "",
  kategori_induk_id: "",
  ikon: "utensils",
  warna: "#ef4444",
};

const renderIcon = (iconName: string): JSX.Element => {
  const IconComponent = iconMap[iconName as IconName];
  if (IconComponent) {
    return <IconComponent className="h-4 w-4" />;
  }
  return <span>{iconName}</span>;
};

export default function CategoriesPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: Category | null }>({ 
    open: false, 
    category: null 
  });
  const [formData, setFormData] = useState<CategoryFormData>(INITIAL_FORM_DATA);

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const loadCategories = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;

    try {
      setIsLoading(true);
      const response = await apiClient.kategori.list({
        tenant_id: currentTenant,
        include_system: true,
      });
      const categoriesData = response?.kategori || response || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setCategories([]);
      toast({
        title: "Gagal memuat kategori",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data kategori",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, toast]);

  useEffect(() => {
    if (currentTenant) {
      loadCategories();
    }
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        kategori_induk_id: formData.kategori_induk_id || undefined,
      };

      if (editingCategory) {
        await apiClient.kategori.update({
          id: editingCategory.id,
          ...submitData,
        });
        toast({
          title: "Kategori berhasil diperbarui",
          description: "Data kategori telah disimpan",
        });
      } else {
        await apiClient.kategori.create({
          tenant_id: currentTenant,
          ...submitData,
        });
        toast({
          title: "Kategori berhasil ditambahkan",
          description: "Kategori baru telah dibuat",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      toast({
        title: editingCategory ? "Gagal memperbarui kategori" : "Gagal menambah kategori",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category): void => {
    setEditingCategory(category);
    setFormData({
      nama_kategori: category.nama_kategori,
      kategori_induk_id: category.kategori_induk_id || "",
      ikon: category.ikon || "utensils",
      warna: category.warna || "#ef4444",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteDialog.category) return;

    try {
      await apiClient.kategori.deleteKategori({ id: deleteDialog.category.id });
      toast({
        title: "Kategori berhasil dihapus",
        description: "Kategori telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, category: null });
      await loadCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        title: "Gagal menghapus kategori",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus kategori",
        variant: "destructive",
      });
    }
  };

  const resetForm = (): void => {
    setFormData(INITIAL_FORM_DATA);
    setEditingCategory(null);
  };

  const getParentCategories = (): Category[] => {
    return categories.filter((c) => !c.kategori_induk_id);
  };

  const getSubCategories = (parentId: string): Category[] => {
    return categories.filter((c) => c.kategori_induk_id === parentId);
  };

  const handleDialogClose = (open: boolean): void => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const handleDeleteDialogChange = (open: boolean): void => {
    setDeleteDialog({ open, category: null });
  };

  const renderCategoryList = (): JSX.Element => {
    const parentCategories = getParentCategories();

    if (parentCategories.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Belum ada kategori. Tambahkan kategori pertama Anda!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {parentCategories.map((parent) => {
          const subCategories = getSubCategories(parent.id);
          return (
            <div key={parent.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0"
                    style={{ backgroundColor: parent.warna || "#6b7280" }}
                  >
                    {renderIcon(parent.ikon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base truncate" title={parent.nama_kategori}>
                      {parent.nama_kategori}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {parent.sistem_bawaan && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                      {subCategories.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {subCategories.length} sub-kategori
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!parent.sistem_bawaan && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parent)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, category: parent })}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {subCategories.length > 0 && (
                <div className="border-t bg-gray-50">
                  {subCategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 sm:p-3 pl-6 sm:pl-8 lg:pl-12 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-white text-xs flex-shrink-0"
                          style={{ backgroundColor: sub.warna || "#6b7280" }}
                        >
                          {renderIcon(sub.ikon)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium truncate block" title={sub.nama_kategori}>
                            {sub.nama_kategori}
                          </span>
                          {sub.sistem_bawaan && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              System
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!sub.sistem_bawaan && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sub)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, category: sub })}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Kategori</h1>
            <p className="text-gray-600 text-sm sm:text-base truncate">Kelola kategori transaksi Anda</p>
          </div>
          <ResponsiveDialog
            open={isDialogOpen}
            onOpenChange={handleDialogClose}
            title={editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
            description={editingCategory ? "Perbarui informasi kategori" : "Buat kategori untuk mengorganisir transaksi"}
            size="md"
          >
            <ResponsiveDialogForm onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nama_kategori">Nama Kategori</Label>
                <Input
                  id="nama_kategori"
                  placeholder="Contoh: Makanan & Minuman"
                  value={formData.nama_kategori}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nama_kategori: e.target.value.slice(0, 50),
                    }))
                  }
                  maxLength={50}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kategori_induk_id">
                  Kategori Induk (Opsional)
                </Label>
                <Select
                  value={formData.kategori_induk_id || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      kategori_induk_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori induk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Tidak ada (Kategori utama)
                    </SelectItem>
                    {getParentCategories().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nama_kategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ikon</Label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {defaultIcons.map((iconItem) => {
                    const IconComponent = iconItem.icon;
                    return (
                      <button
                        key={iconItem.name}
                        type="button"
                        className={`p-1.5 sm:p-2 rounded border hover:bg-gray-100 transition-colors ${
                          formData.ikon === iconItem.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, ikon: iconItem.name }))}
                      >
                        <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded border-2 transition-all ${
                        formData.warna === color
                          ? "border-gray-800 scale-110"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, warna: color }))
                      }
                    />
                  ))}
                </div>
              </div>

              <ResponsiveDialogActions>
                <ResponsiveDialogButton
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </ResponsiveDialogButton>
                <ResponsiveDialogButton
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Menyimpan...
                    </>
                  ) : editingCategory ? (
                    "Perbarui"
                  ) : (
                    "Tambah"
                  )}
                </ResponsiveDialogButton>
              </ResponsiveDialogActions>
            </ResponsiveDialogForm>
          </ResponsiveDialog>
          
          <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Tambah Kategori</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
      </div>

        <Card className="overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg truncate">Daftar Kategori</CardTitle>
            <CardDescription className="text-sm truncate">Semua kategori transaksi Anda</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CategorySkeleton key={i} />
              ))}
            </div>
          ) : (
            renderCategoryList()
          )}
        </CardContent>
        </Card>
        
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={handleDeleteDialogChange}
          title="Hapus Kategori"
          description={`Apakah Anda yakin ingin menghapus kategori "${deleteDialog.category?.nama_kategori}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}