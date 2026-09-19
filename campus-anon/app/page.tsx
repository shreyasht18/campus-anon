import Link from "next/link";
import { MessageSquare, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="inline-block px-3 py-1 mb-6 text-xs font-medium text-blue-400 bg-blue-900/30 rounded-full border border-blue-800/50">
        Currently exclusive to AMBIT students
      </div>
      
      <h1 className="text-5xl font-extrabold tracking-tight mb-6 max-w-3xl mx-auto">
        Your Campus, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Unfiltered.</span>
      </h1>
      
      <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
        The private, anonymous network to share confessions, ask questions, and discuss college life without exposing your real identity. 
      </p>

      <Link 
        href="/login" 
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-blue-900/20"
      >
        Enter the Network
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left w-full max-w-5xl mx-auto">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <Shield className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="font-bold text-xl mb-2">100% Anonymous</h3>
          <p className="text-gray-400 text-sm">Get a random username. Your real identity is never shown publicly.</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <MessageSquare className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="font-bold text-xl mb-2">Speak Freely</h3>
          <p className="text-gray-400 text-sm">Confessions, rants, memes, and genuine advice from your peers.</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <Zap className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="font-bold text-xl mb-2">Exclusive Access</h3>
          <p className="text-gray-400 text-sm">A private network dedicated strictly to your campus life.</p>
        </div>
      </div>
    </div>
  );
}