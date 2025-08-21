import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Folder, FolderOpen, Utensils, Car, ShoppingCart, Clapperboard, Receipt, Banknote, TrendingUp, HelpCircle, Home, Gamepad2, Shirt, Plane, Smartphone, Zap, DollarSign, Gift, Briefcase, Trophy, Target, Diamond, Wrench, Palette, Book, Coffee, Heart, Music, Camera, MapPin, ShoppingBag, CreditCard, Fuel, GraduationCap, Stethoscope, Dumbbell, Scissors, Hammer, PaintBucket } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import apiClient from "@/lib/api-client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
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
};

const defaultIcons = Object.entries(iconMap).map(([name, icon]) => ({ name, icon }));

const renderIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  if (IconComponent) {
    return <IconComponent className="h-4 w-4" />;
  }
  return iconName;
};

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
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [formData, setFormData] = useState<CategoryFormData>({
    nama_kategori: "",
    kategori_induk_id: "",
    ikon: "utensils",
    warna: "#ef4444",
  });

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant) {
      loadCategories();
    }
  }, [currentTenant]);

  const loadCategories = async () => {
    if (!currentTenant) return;

    try {
      setIsLoading(true);
      const response = await apiClient.kategori.list({
        tenant_id: currentTenant,
        include_system: true,
      });
      const categoriesData = response?.kategori || response || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error: any) {
      console.error("Failed to load categories:", error);
      setCategories([]);
      toast({
        title: "Gagal memuat kategori",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat data kategori",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await apiClient.kategori.update({
          id: editingCategory.id,
          ...formData,
        });
        toast({
          title: "Kategori berhasil diperbarui",
          description: "Data kategori telah disimpan",
        });
      } else {
        await apiClient.kategori.create({
          tenant_id: currentTenant,
          ...formData,
        });
        toast({
          title: "Kategori berhasil ditambahkan",
          description: "Kategori baru telah dibuat",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error("Failed to save category:", error);
      toast({
        title: editingCategory
          ? "Gagal memperbarui kategori"
          : "Gagal menambah kategori",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nama_kategori: category.nama_kategori,
      kategori_induk_id: category.kategori_induk_id || "",
      ikon: category.ikon || "utensils",
      warna: category.warna || "#ef4444",
    });

    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.category) return;

    try {
      await apiClient.kategori.deleteKategori({ id: deleteDialog.category.id });
      toast({
        title: "Kategori berhasil dihapus",
        description: "Kategori telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, category: null });
      loadCategories();
    } catch (error: any) {
      console.error("Failed to delete category:", error);
      toast({
        title: "Gagal menghapus kategori",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menghapus kategori",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nama_kategori: "",
      kategori_induk_id: "",
      ikon: "utensils",
      warna: "#ef4444",
    });
    setEditingCategory(null);
  };

  const getParentCategories = () => {
    return categories.filter((c) => !c.kategori_induk_id);
  };

  const getSubCategories = (parentId: string) => {
    return categories.filter((c) => c.kategori_induk_id === parentId);
  };

  const renderCategoryList = () => {
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
            <div key={parent.id} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: parent.warna || "#6b7280" }}
                  >
                    {renderIcon(parent.ikon)}
                  </div>
                  <div>
                    <h3 className="font-medium">{parent.nama_kategori}</h3>
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parent)}
                      className="p-1 sm:p-2"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, category: parent })}
                      className="text-red-600 hover:text-red-700 p-1 sm:p-2"
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
                      className="flex items-center justify-between p-2 sm:p-3 pl-8 sm:pl-12 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: sub.warna || "#6b7280" }}
                        >
                          {renderIcon(sub.ikon)}
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            {sub.nama_kategori}
                          </span>
                          {sub.sistem_bawaan && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              System
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!sub.sistem_bawaan && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sub)}
                            className="p-1"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, category: sub })}
                            className="text-red-600 hover:text-red-700 p-1"
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kategori</h1>
            <p className="text-gray-600">Kelola kategori transaksi Anda</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Tambah Kategori</span>
                <span className="sm:hidden">Tambah</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Perbarui informasi kategori"
                  : "Buat kategori untuk mengorganisir transaksi"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_kategori">Nama Kategori</Label>
                <Input
                  id="nama_kategori"
                  placeholder="Contoh: Makanan & Minuman"
                  value={formData.nama_kategori}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nama_kategori: e.target.value,
                    }))
                  }
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
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {defaultIcons.map((iconItem) => {
                    const IconComponent = iconItem.icon;
                    return (
                      <button
                        key={iconItem.name}
                        type="button"
                        className={`p-2 rounded border hover:bg-gray-100 ${
                          formData.ikon === iconItem.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, ikon: iconItem.name }))}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="grid grid-cols-10 gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded border-2 ${
                        formData.warna === color
                          ? "border-gray-800"
                          : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, warna: color }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Menyimpan...
                    </>
                  ) : editingCategory ? (
                    "Perbarui"
                  ) : (
                    "Tambah"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Kategori</CardTitle>
            <CardDescription>Semua kategori transaksi Anda</CardDescription>
          </CardHeader>
          <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            renderCategoryList()
          )}
        </CardContent>
        </Card>
        
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, category: null })}
          title="Hapus Kategori"
          description={`Apakah Anda yakin ingin menghapus kategori "${deleteDialog.category?.nama_kategori}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
