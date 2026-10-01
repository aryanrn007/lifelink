import { Link } from 'react-router-dom';

// CPR guidance page placeholder
// Will contain offline-capable step-by-step CPR instructions
export default function Cpr() {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <Link to="/" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">CPR Guidance</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-gray-400">CPR instructions coming soon...</p>
      </main>
    </div>
  );
}
