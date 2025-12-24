'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  onClose?: () => void;
  isModal?: boolean;
}

export default function BrandManagement({ onClose, isModal = false }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    
    if (error) {
      setError('Failed to load brands');
      console.error('Error fetching brands:', error);
    } else {
      setBrands(data || []);
    }
    setLoading(false);
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    // Check if brand already exists
    const exists = brands.some(
      b => b.name.toLowerCase() === newBrandName.trim().toLowerCase()
    );
    if (exists) {
      setError('A brand with this name already exists');
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('brands')
      .insert({ name: newBrandName.trim() });

    setAdding(false);

    if (insertError) {
      setError('Failed to add brand');
      console.error('Error adding brand:', insertError);
      return;
    }

    setSuccess(`Brand "${newBrandName.trim()}" added successfully!`);
    setNewBrandName('');
    fetchBrands();

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.name}"? Tasks using this brand will have no brand.`)) {
      return;
    }

    setDeleting(brand.id);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', brand.id);

    setDeleting(null);

    if (deleteError) {
      setError('Failed to delete brand. It may be in use by existing tasks.');
      console.error('Error deleting brand:', deleteError);
      return;
    }

    setSuccess(`Brand "${brand.name}" deleted successfully!`);
    fetchBrands();

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const content = (
    <div className={isModal ? '' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-6'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Brand Management</h2>
          <p className="text-sm text-gray-500 mt-1">Add or remove brands for task assignment</p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Add Brand Form */}
      <form onSubmit={handleAddBrand} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            placeholder="Enter brand name..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={adding || !newBrandName.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <span>+</span>
                Add Brand
              </>
            )}
          </button>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Brands List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading brands...</div>
      ) : brands.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No brands yet. Add your first brand above.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="bg-purple-100 text-purple-700 text-sm font-medium px-3 py-1 rounded-lg">
                  {brand.name}
                </span>
              </div>
              <button
                onClick={() => handleDeleteBrand(brand)}
                disabled={deleting === brand.id}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {deleting === brand.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        Total: {brands.length} brand{brands.length !== 1 ? 's' : ''}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}

