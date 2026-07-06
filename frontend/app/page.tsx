export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-5xl font-bold">🚀 Grovaitech OS</h1>

      <p className="mt-4 text-xl text-gray-300">
        One Workspace. Every AI. Unlimited Automation.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-10">
        <div className="rounded-xl bg-slate-800 p-6">🤖 AI Chat</div>
        <div className="rounded-xl bg-slate-800 p-6">🧠 Knowledge Base</div>
        <div className="rounded-xl bg-slate-800 p-6">⚙️ Automations</div>
        <div className="rounded-xl bg-slate-800 p-6">📚 Prompt Library</div>
      </div>
    </main>
  );
}