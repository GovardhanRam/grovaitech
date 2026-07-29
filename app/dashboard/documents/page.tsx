'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Upload, 
  Search, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Loader2, 
  Database,
  Sparkles
} from 'lucide-react'

interface DocumentFile {
  id: string
  name: string
  size: number
  type: string
  status: 'Uploading' | 'Indexing' | 'Vectorizing' | 'Ready'
  created_at: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const supabase = createClient()

  // Load documents
  const loadDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select()
      .order('created_at', { ascending: false })
    if (data) {
      setDocuments(data)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // File upload handler (Simulated)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsUploading(true)
    setUploadProgress(10)

    // Step 1: Uploading progress simulation
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 20
      })
    }, 150)

    setTimeout(async () => {
      clearInterval(interval)
      setUploadProgress(100)
      
      const { data: { user } } = await supabase.auth.getUser()
      const newDoc = {
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop() || 'unknown',
        status: 'Indexing' as const,
        user_id: user?.id || 'mock-admin'
      }

      // Insert into DB
      const { data: insertedDoc } = await supabase
        .from('documents')
        .insert(newDoc)
        .select()
        .single()

      setIsUploading(false)
      loadDocuments()

      if (insertedDoc) {
        // Step 2: Indexing status transition
        setTimeout(async () => {
          await supabase.from('documents').update({ status: 'Vectorizing' }).eq('id', insertedDoc.id)
          loadDocuments()

          // Step 3: Ready status transition
          setTimeout(async () => {
            await supabase.from('documents').update({ status: 'Ready' }).eq('id', insertedDoc.id)
            loadDocuments()
          }, 3000)
        }, 3000)
      }
    }, 1200)
  }

  // Delete document
  const deleteDocument = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id)
    loadDocuments()
  }

  // Submit search query (RAG)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchResult(null)

    try {
      const res = await fetch('/api/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSearchResult(data.answer)
    } catch (e: any) {
      console.error(e)
      setSearchResult('Failed to retrieve context. Please ensure you have uploaded documents to search.')
    } finally {
      setIsSearching(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Document RAG Workspace</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Upload training materials, policy PDFs, or clinic FAQs to equip your AI employees with context-aware knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & Document Manager (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Card */}
          <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Upload Knowledge Base</h3>
            
            <label className="flex flex-col items-center justify-center border border-dashed border-[#1E293B] hover:border-[#3B82F6]/50 rounded-2xl bg-[#0F172A]/30 hover:bg-[#0F172A]/70 p-8 cursor-pointer transition-all duration-200 group relative">
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
                  <p className="text-xs font-semibold text-slate-200">Uploading to storage cabinet...</p>
                  <div className="w-48 bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#3B82F6] h-1.5 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#1E293B]/80 flex items-center justify-center text-slate-400 mx-auto group-hover:scale-105 transition-transform group-hover:text-[#3B82F6]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Drag & drop your files, or <span className="text-[#3B82F6] hover:underline">browse</span></p>
                    <p className="text-[10px] text-[#94A3B8] mt-1">Supports PDF, DOCX, TXT up to 10MB</p>
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Documents Table */}
          <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Indexed Files</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-[#94A3B8] font-semibold">
                    <th className="pb-3">File Name</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Indexing Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/50">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#94A3B8]">No documents uploaded.</td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="text-slate-300 hover:bg-[#1E293B]/25">
                        <td className="py-3.5 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#3B82F6] shrink-0" />
                          <span className="font-medium truncate max-w-[180px]" title={doc.name}>{doc.name}</span>
                        </td>
                        <td className="py-3.5 text-[#94A3B8] font-mono text-[10px]">{formatBytes(doc.size)}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            doc.status === 'Ready' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : doc.status === 'Vectorizing'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {doc.status === 'Ready' && <CheckCircle className="w-3 h-3" />}
                            {doc.status === 'Vectorizing' && <Cpu className="w-3 h-3 animate-pulse" />}
                            {doc.status === 'Indexing' && <Clock className="w-3 h-3 animate-spin" />}
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button 
                            onClick={() => deleteDocument(doc.id)}
                            className="p-1 rounded-lg text-[#94A3B8] hover:text-red-450 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: RAG Search Panel (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">RAG Search Terminal</h3>
                  <p className="text-[10px] text-[#94A3B8]">Query files using semantic context</p>
                </div>
              </div>

              {/* Query Form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask e.g. What are doctor consultation hours?"
                  className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-3 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 rounded-xl text-white font-semibold text-xs flex items-center gap-1 transition-all"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Query
                </button>
              </form>

              {/* Search Output */}
              <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 min-h-[200px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#3B82F6]" /> RAG Output Response
                    </span>
                    {searchResult && (
                      <span className="text-[9px] uppercase font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10">
                        resolved
                      </span>
                    )}
                  </div>
                  
                  {isSearching ? (
                    <div className="h-full py-12 flex flex-col items-center justify-center gap-2 text-[#94A3B8]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
                      <span className="text-[10px] animate-pulse">Scanning chunks, formulating answer...</span>
                    </div>
                  ) : searchResult ? (
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{searchResult}</p>
                  ) : (
                    <div className="py-12 text-center text-[#94A3B8] text-xs">
                      Enter a query in the bar above to test retrieval.
                    </div>
                  )}
                </div>
                
                {searchResult && (
                  <div className="border-t border-[#1E293B] pt-3 mt-4">
                    <span className="text-[9px] uppercase font-semibold text-[#94A3B8] block mb-1">Referenced Files</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#1E293B]">
                        {documents.find(d => d.status === 'Ready')?.name || 'dental_clinic_faqs.pdf'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl border border-[#3B82F6]/10 bg-[#3B82F6]/5 text-[10px] text-[#94A3B8] leading-relaxed">
              <strong>Tip:</strong> The search utilizes embeddings via <code className="text-[#3B82F6]">text-embedding-004</code>. Ensure documents are in **Ready** state before querying.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
