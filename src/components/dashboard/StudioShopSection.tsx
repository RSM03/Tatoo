'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag, Sparkles, Plus, Edit3, Trash2, CheckCircle2, ShieldCheck, Heart, AlertCircle, ExternalLink, X } from 'lucide-react';

export interface ProductItem {
  id: string;
  studio_id?: string;
  name: string;
  category: 'aftercare' | 'soaps' | 'protection' | 'merch' | 'piercing';
  price: number;
  stock: number;
  image_url: string;
  description: string;
  usage_instructions?: string;
  is_available: boolean;
}

interface StudioShopSectionProps {
  isArtistMode?: boolean;
  studioName?: string;
  currentStudioId?: string;
  onInquireInChat?: (product: any) => void;
}

export default function StudioShopSection({
  isArtistMode = false,
  studioName = 'Tatoo Studio Atelier',
  currentStudioId,
  onInquireInChat
}: StudioShopSectionProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // New/Edit Product Modal State (For Artist Mode)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'aftercare' | 'soaps' | 'protection' | 'merch' | 'piercing'>('aftercare');
  const [price, setPrice] = useState('14.50');
  const [stock, setStock] = useState('15');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [usageInstructions, setUsageInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, currentStudioId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const url = currentStudioId
        ? `/api/products?category=${categoryFilter}&studioId=${currentStudioId}`
        : `/api/products?category=${categoryFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('aftercare');
    setPrice('14.50');
    setStock('15');
    setImageUrl('');
    setDescription('');
    setUsageInstructions('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setPrice(String(prod.price));
    setStock(String(prod.stock));
    setImageUrl(prod.image_url);
    setDescription(prod.description);
    setUsageInstructions(prod.usage_instructions || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingProduct) {
        // Edit existing product
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            name,
            category,
            price: Number(price),
            stock: Number(stock),
            imageUrl,
            description,
            usageInstructions
          })
        });
        const data = await res.json();
        if (data.product) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? data.product : p));
        } else if (data.updatedPayload) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...data.updatedPayload } : p));
        }
      } else {
        // Create new product
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            price: Number(price),
            stock: Number(stock),
            imageUrl,
            description,
            usageInstructions
          })
        });
        const data = await res.json();
        if (data.product) {
          setProducts(prev => [data.product, ...prev]);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error al guardar producto: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que deseas retirar este producto de la tienda del estudio?')) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error al eliminar producto: ${err.message}`);
    }
  };

  const categories = [
    { id: 'all', label: 'Todos los Artículos' },
    { id: 'aftercare', label: 'Pomadas & Cicatrización' },
    { id: 'soaps', label: 'Jabones Neutros' },
    { id: 'protection', label: 'Segunda Piel & Solar' },
    { id: 'merch', label: 'Merchandising Oficial' }
  ];

  return (
    <div className="space-y-6">
      {/* Shop Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-ink-900/90 via-ink-950 to-ink-900/90 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Tienda Oficial & Cuidados Post-Tattoo · {studioName}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            Productos Sanitarios y Merchandising
          </h2>
          <p className="text-xs text-ink-400 mt-1 max-w-xl">
            Todo lo necesario para garantizar una cicatrización impecable de tu pieza, disponible directamente en la recepción del estudio.
          </p>
        </div>

        {isArtistMode && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-bold text-xs shadow-lg shadow-crimson-600/30 transition-all hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Añadir Producto al Estudio</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === cat.id
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30 border border-crimson-400/30'
                : 'bg-ink-900/80 border border-white/5 text-ink-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs font-mono text-ink-400">
          Cargando catálogo del estudio...
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 bg-ink-950/60 max-w-md mx-auto">
          <ShoppingBag className="w-10 h-10 text-ink-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Sin productos en esta categoría</h3>
          <p className="text-xs text-ink-400">Selecciona otra categoría o añade nuevos artículos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="glass-panel rounded-3xl border border-white/10 bg-ink-900/70 overflow-hidden hover:border-crimson-500/40 transition-all group flex flex-col justify-between shadow-xl"
            >
              <div>
                {/* Product Image */}
                <div className="h-52 w-full overflow-hidden relative bg-black/60">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md text-amber-400 border border-amber-500/30">
                      {prod.category === 'aftercare' ? 'Cicatrización' : prod.category === 'soaps' ? 'Higiene' : prod.category === 'protection' ? 'Protección' : 'Merch'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      prod.stock > 0
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                        : 'bg-red-950/80 text-red-400 border border-red-500/40'
                    }`}>
                      {prod.stock > 0 ? `Stock: ${prod.stock} uds` : 'Agotado'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display font-bold text-base text-white group-hover:text-crimson-400 transition-colors">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="text-xl font-mono font-extrabold text-amber-400">
                    {Number(prod.price).toFixed(2)} €
                  </div>

                  <p className="text-xs text-ink-300 leading-relaxed line-clamp-3">
                    {prod.description}
                  </p>

                  {prod.usage_instructions && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-ink-400 font-mono">
                      <strong className="text-ink-200 block text-[10px] uppercase mb-0.5">Modo de aplicación:</strong>
                      {prod.usage_instructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 pt-0 border-t border-white/5 mt-4">
                {isArtistMode ? (
                  <div className="flex items-center gap-2 pt-3">
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-ink-400 hover:text-red-400 text-xs transition-colors border border-white/10"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 flex flex-col gap-2">
                    <button
                      onClick={() => onInquireInChat?.(prod)}
                      className="w-full py-2.5 rounded-xl bg-crimson-600/20 hover:bg-crimson-600 text-crimson-300 hover:text-white font-bold text-xs border border-crimson-500/30 transition-all flex items-center justify-center gap-2 shadow-md group/btn"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover/btn:rotate-12 transition-transform" />
                      <span>Reservar / Consultar en Chat</span>
                    </button>
                    <span className="text-[10px] text-center text-ink-500 font-mono">Disponible para recogida en cabina el día de tu cita</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL (For Artists / Studio Owners) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/20 bg-ink-950 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-crimson-400 text-xs font-mono font-bold uppercase">
              <ShoppingBag className="w-4 h-4" />
              <span>{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto al Estudio'}</span>
            </div>

            <h2 className="font-display text-xl font-bold text-white">
              {editingProduct ? editingProduct.name : 'Nuevo Producto para la Tienda'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Balm Tattoo Crema Cicatrizante 75g"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                  >
                    <option value="aftercare">Pomadas & Cuidado</option>
                    <option value="soaps">Jabón Neutro</option>
                    <option value="protection">Segunda Piel & Solar</option>
                    <option value="merch">Merchandising</option>
                    <option value="piercing">Piercing Care</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                    Precio (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                    Stock (uds)
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  URL de la Fotografía
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Propiedades, ingredientes clave o características de la prenda..."
                  className="w-full px-3.5 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Pauta de Uso Sanitaria (Opcional)
                </label>
                <input
                  type="text"
                  value={usageInstructions}
                  onChange={(e) => setUsageInstructions(e.target.value)}
                  placeholder="ej: Aplicar capa fina 3 veces al día tras lavar"
                  className="w-full px-3.5 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs shadow-lg transition-all"
                >
                  {saving ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Publicar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
