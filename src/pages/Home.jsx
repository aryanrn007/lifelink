import { Link } from 'react-router-dom';

// Home page with two main action buttons
// Users choose between needing help (caller) or volunteering (responder)
export default function Home() {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      {/* Header with app logo */}
      <header className="p-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-emergency">LifeLink</h1>
        <p className="text-gray-400 text-sm mt-1">Hyper-local emergency response</p>
      </header>

      {/* Main content with action buttons */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <button className="w-full max-w-sm bg-emergency hover:bg-emergency-dark text-white font-semibold py-6 px-8 rounded-2xl text-xl transition-colors min-h-[56px]">
          <Link to="/caller" className="block w-full h-full">
            I need help
          </Link>
        </button>

        <button className="w-full max-w-sm bg-bg-card hover:bg-gray-800 text-white font-semibold py-6 px-8 rounded-2xl text-xl transition-colors border border-gray-700 min-h-[56px]">
          <Link to="/responder" className="block w-full h-full">
            I'm a volunteer
          </Link>
        </button>
      </main>
    </div>
  );
}
