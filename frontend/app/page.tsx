import Image from "next/image";
import Link from "next/link";
import { Bot, BookOpen, Workflow, FileText } from "lucide-react";


export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-slate-100">

      {/* Header */}
      <section className="text-center py-20 max-w-7xl mx-auto">
<div className="flex justify-center mb-8">
  <Image
    src="/images/Grovaitech_Logo_Optimized.png"
    alt="Grovaitech Logo"
    width={420}
    height={420}
    priority
  />
</div>
       
        <p className="mt-6 text-3xl font-bold text-black">
          We Don't Sell Software.
        </p>

        <p className="text-4xl font-extrabold text-blue-600">
          We Deploy AI Employees.
        </p>
<div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-6">

  <div className="rounded-2xl bg-white p-6 shadow-lg">
    🤖
    <p className="mt-3 font-bold">AI Agents</p>
  </div>

  <div className="rounded-2xl bg-white p-6 shadow-lg">
    💬
    <p className="mt-3 font-bold">WhatsApp Automation</p>
  </div>

  <div className="rounded-2xl bg-white p-6 shadow-lg">
    ⚙️
    <p className="mt-3 font-bold">Business Automation</p>
  </div>

  <div className="rounded-2xl bg-white p-6 shadow-lg">
    🎧
    <p className="mt-3 font-bold">AI Receptionist</p>
  </div>

  <div className="rounded-2xl bg-white p-6 shadow-lg">
    📈
    <p className="mt-3 font-bold">Lead Generation</p>
  </div>

</div>
      </section>

      {/* Dashboard Cards */}

      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-8">

        <Link
          href="/chat"
          className="rounded-3xl border p-8 shadow hover:shadow-xl transition"
        >
          <Bot className="w-12 h-12 text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold">AI Chat</h2>
          <p className="text-gray-600 mt-2">
            Talk with your Grovaitech AI assistant.
          </p>
        </Link>

        <div className="rounded-3xl border p-8 shadow">
          <BookOpen className="w-12 h-12 text-green-600 mb-4" />
          <h2 className="text-2xl font-bold">Knowledge Base</h2>
          <p className="text-gray-600 mt-2">
            Company documents and memory.
          </p>
        </div>

        <div className="rounded-3xl border p-8 shadow">
          <Workflow className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold">Automations</h2>
          <p className="text-gray-600 mt-2">
            AI workflows powered by n8n.
          </p>
        </div>

        <div className="rounded-3xl border p-8 shadow">
          <FileText className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-2xl font-bold">Prompt Library</h2>
          <p className="text-gray-600 mt-2">
            Store and reuse prompts.
          </p>
        </div>

      </section>

    </main>
  );
}
