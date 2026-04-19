import { useState, useEffect } from 'react';

// Define the shape of our data based on your Fastify schema
interface ShoppingItem {
  id: number;
  username: string;
  item_name: string;
  quantity: number;
  is_bought: boolean;
}

function App() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  // Environment-aware URL logic
  const BASE_URL = import.meta.env.VITE_API_URL || '/api';

  // Fetch items from the backend
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/items`);
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new item
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const res = await fetch(`${BASE_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'matt', // Using your identifier from the tests
          item_name: newItemName,
          quantity: quantity
        }),
      });

      if (res.ok) {
        setNewItemName('');
        setQuantity(1);
        fetchItems(); // Refresh the list
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/items/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Optimistic UI update: filter out the deleted item immediately
        setItems(items.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600">
            Shopping List
          </h1>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            {items.length} Items
          </span>
        </header>

        {/* Input Form */}
        <form onSubmit={addItem} className="mb-8 flex gap-2 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <input
            type="text"
            placeholder="Add an item..."
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            className="w-20 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none transition-all"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
          >
            Add
          </button>
        </form>

        {/* Items List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 italic">Loading groceries...</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 py-12 text-center text-slate-400">
              The fridge is empty!
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100 hover:border-red-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600">
                    {item.quantity}
                  </span>
                  <span className="font-medium text-slate-700">{item.item_name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                    {item.username}
                  </div>
                  {/* Delete Button */}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                    title="Delete item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {/* Note: Standard SVG path for a trash can or X */}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )))}
        </div>
      </div>
    </div>
  );
}

export default App;