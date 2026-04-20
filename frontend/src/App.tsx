import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useApi } from './hooks/useApi';
import { UserStatus } from './components/UserStatus';

interface ShoppingItem {
  id: number;
  username: string;
  item_name: string;
  quantity: number;
}

function App() {
  const { authenticated } = useAuth(); // 1. Access Auth State
  const { callApi } = useApi();        // 2. Access Protected API Wrapper

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch items using the authenticated wrapper
  const fetchItems = async () => {
    if (!authenticated) return;
    try {
      setLoading(true);
      const data = await callApi('/items'); // Automatically adds Bearer token
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      await callApi('/items', {
        method: 'POST',
        body: JSON.stringify({
          item_name: newItemName,
          quantity: quantity
          // NOTE: We no longer send 'username' here! 
          // The backend extracts it from the JWT for security.
        }),
      });

      setNewItemName('');
      setQuantity(1);
      fetchItems();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await callApi(`/items/${id}`, { method: 'DELETE' });
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchItems();
    }
  }, [authenticated]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600">
            Cloud Shopping
          </h1>
          <UserStatus /> {/* 3. Show Login/Logout UI */}
        </header>

        {authenticated ? (
          <>
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
              <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700 transition-all">
                Add
              </button>
            </form>

            {/* Items List */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-slate-500 italic">Updating list...</p>
              ) : items.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-300 py-12 text-center text-slate-400">
                  Your list is empty.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600">
                        {item.quantity}
                      </span>
                      <span className="font-medium text-slate-700">{item.item_name}</span>
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-2">Welcome to the Shopping App</h2>
            <p className="text-slate-500">Please sign in to view and manage your private shopping list.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;