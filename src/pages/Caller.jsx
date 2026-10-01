import { Link } from 'react-router-dom';

// Caller page placeholder
// Will contain SOS button, location sharing, and connection to responders
export default function Caller() {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <Link to="/" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">Caller Mode</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-gray-400">Caller functionality coming soon...</p>
      </main>
    </div>
  );
}
