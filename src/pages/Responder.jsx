import { Link } from 'react-router-dom';

// Responder page placeholder
// Will contain volunteer status toggle, incoming alerts, and map view
export default function Responder() {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <Link to="/" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">Responder Mode</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-gray-400">Responder functionality coming soon...</p>
      </main>
    </div>
  );
}
