
import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';

import Dashboard from './components/Dashboard';
import MilestoneForm from './components/MilestoneForm';
import { getAllMilestones } from './services/api';

function App() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getAllMilestones();

      if (response.success) {
        setMilestones(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#1e293b',
            color: '#fff',
          },
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              NexusPay <span className="text-indigo-600">AI</span>
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              GitHub-Verified Milestones & PayPal Payouts
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl active:translate-y-0 active:scale-95"
          >
            <span className="text-xl leading-none">+</span>
            New Milestone
          </button>

        </div>
      </header>

      {/* Dashboard */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard
          milestones={milestones}
          loading={loading}
          onRefresh={fetchMilestones}
        />
      </main>

      {/* Milestone Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <MilestoneForm
              onSuccess={() => {
                setShowForm(false);
                fetchMilestones();
              }}
              onCancel={() => setShowForm(false)}
            />

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
