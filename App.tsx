
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { LogOut, Save, FolderOpen, Plus, Trash2, Clock, Sparkle, Download, FileText, Check, AlertCircle, RefreshCw, Users } from 'lucide-react';
import ChatPane from './components/ChatPane';
import EditorPane from './components/EditorPane';
import Avatar from './components/Avatar';
import { GeminiService } from './services/geminiService';
import { Message, SavedProject, Attachment } from './types';
import * as fb from './services/firebase';
// Fix: Import onAuthStateChanged and User from local firebase service which re-exports them correctly.
import { onAuthStateChanged, User } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectName, setProjectName] = useState('New Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [functionalSpec, setFunctionalSpec] = useState('');
  const [technicalSpec, setTechnicalSpec] = useState('');
  const [implementationPlan, setImplementationPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  // We check this every render to ensure the UI is in sync
  const firebaseReady = fb.isFirebaseEnabled();

  const geminiService = useMemo(() => new GeminiService(), []);

  // Listen for Auth changes using the correctly exported onAuthStateChanged from local firebase service.
  useEffect(() => {
    if (!fb.auth) return;
    const unsubscribe = onAuthStateChanged(fb.auth, (currentUser) => {
      setUser(currentUser);
      console.log("👤 Auth State:", currentUser ? `Logged in as ${currentUser.displayName}` : "Logged out");
    });
    return () => unsubscribe();
  }, [firebaseReady]);

  // Real-time listener for projects
  useEffect(() => {
    if (fb.db) {
      console.log("🛰️ Connecting to Firestore 'projects' collection...");
      const q = fb.query(fb.collection(fb.db, "projects"), fb.orderBy("updatedAt", "desc"));
      const unsubscribe = fb.onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SavedProject);
        setSavedProjects(projects);
        console.log(`📂 Synced ${projects.length} projects from Firestore`);
      }, (error) => {
        console.error("❌ Firestore Sync Error:", error);
      });
      return () => unsubscribe();
    } else {
      // Fallback to local storage if DB isn't available
      const stored = localStorage.getItem('ba_doc_projects');
      if (stored) {
        try {
          setSavedProjects(JSON.parse(stored));
        } catch (e) {
          console.error("Local load error:", e);
        }
      }
    }
  }, [firebaseReady]);

  const handleSignIn = async () => {
    if (!fb.auth) return;
    try {
      await fb.signInWithPopup(fb.auth, fb.googleProvider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      alert(`Sign in failed: ${error.message}`);
    }
  };

  const saveCurrentProject = useCallback(async () => {
    setSaveStatus('saving');
    const id = activeProjectId || crypto.randomUUID();
    const newProject = {
      id,
      projectName,
      functional: functionalSpec,
      technical: technicalSpec,
      implementationPlan,
      messages,
      updatedAt: Date.now(),
      lastEditedBy: user?.displayName || 'Anonymous',
      lastEditedAvatar: user?.photoURL || null,
      ownerId: user?.uid || 'anonymous'
    };

    try {
      if (fb.db) {
        console.log("💾 Attempting Cloud Save to ID:", id);
        console.log("🔐 Auth Status:", {
          isAuthenticated: !!user,
          userId: user?.uid || 'NOT_AUTHENTICATED',
          userEmail: user?.email || 'N/A',
          ownerIdBeingSaved: newProject.ownerId
        });
        console.log("📦 Project data being saved:", newProject);

        // Write to Firestore
        await fb.setDoc(fb.doc(fb.db, "projects", id), newProject);
        if (!activeProjectId) setActiveProjectId(id);
        console.log("✅ Cloud Save Successful");
      } else {
        throw new Error("Firestore Database not initialized");
      }
      setSaveStatus('saved');
    } catch (error: any) {
      console.error("❌ Save Failed:", error);
      console.error("❌ Full error details:", error.code, error.message);

      // Fallback to Local Storage on error
      const stored = JSON.parse(localStorage.getItem('ba_doc_projects') || '[]');
      const updated = [newProject, ...stored.filter((p: any) => p.id !== id)];
      localStorage.setItem('ba_doc_projects', JSON.stringify(updated));
      setSavedProjects(updated as SavedProject[]);

      alert(`Cloud Sync Error: ${error.message}. Project saved to local storage instead.`);
      setSaveStatus('idle');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [activeProjectId, projectName, functionalSpec, technicalSpec, implementationPlan, messages, user, firebaseReady]);

  const loadProject = (project: SavedProject) => {
    setActiveProjectId(project.id);
    setProjectName(project.projectName);
    setFunctionalSpec(project.functional);
    setTechnicalSpec(project.technical);
    setImplementationPlan(project.implementationPlan || '');
    setMessages(project.messages);
  };

  const createNewProject = () => {
    setActiveProjectId(null);
    setProjectName('New Project');
    setFunctionalSpec('');
    setTechnicalSpec('');
    setImplementationPlan('');
    setMessages([]);
  };

  const startEditingName = () => {
    setEditingNameValue(projectName);
    setIsEditingName(true);
  };

  const saveProjectName = () => {
    const trimmed = editingNameValue.trim();
    if (trimmed.length === 0) {
      setProjectName('Untitled Project');
    } else if (trimmed.length > 100) {
      setProjectName(trimmed.substring(0, 100));
    } else {
      setProjectName(trimmed);
    }
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditingNameValue('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveProjectName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditingName();
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this project?')) return;

    try {
      if (fb.db) {
        await fb.deleteDoc(fb.doc(fb.doc(fb.db, "projects", id)));
      } else {
        const filtered = savedProjects.filter(p => p.id !== id);
        setSavedProjects(filtered);
        localStorage.setItem('ba_doc_projects', JSON.stringify(filtered));
      }
      if (activeProjectId === id) createNewProject();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const exportAsMarkdown = (type: 'functional' | 'technical' | 'implementation') => {
    const content = type === 'functional' ? functionalSpec : type === 'technical' ? technicalSpec : implementationPlan;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${type}.md`;
    a.click();
    setShowExportMenu(false);
  };

  const handleSendMessage = useCallback(async (content: string, attachment?: Attachment) => {
    setIsLoading(true);
    const userMessage: Message = { role: 'user', content, ...(attachment && { attachment }) };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await geminiService.generateSpec(content, messages, functionalSpec, technicalSpec, implementationPlan, attachment);
      if (response.projectName) setProjectName(response.projectName);
      setFunctionalSpec(response.functional);
      setTechnicalSpec(response.technical);
      setImplementationPlan(response.implementationPlan);
      setMessages(prev => [...prev, { role: 'assistant', content: response.chatResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Draftio: Architect disconnected. Please check your connection or Gemini API key." }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, functionalSpec, technicalSpec, implementationPlan, geminiService]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900">
      {/* Cloud Status Banner */}
      {!firebaseReady && (
        <div className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 flex items-center justify-center gap-2 z-50 shrink-0">
          <AlertCircle className="w-3 h-3" />
          Cloud Hub Connection Failed: Using Local Storage Fallback
        </div>
      )}

      <header className="h-14 bg-white border-b flex items-center justify-between px-6 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsLibraryOpen(!isLibraryOpen)} className={`p-2 rounded-lg transition-colors ${isLibraryOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}>
            <FolderOpen className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkle className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-sm font-black flex items-center gap-2">Draftio <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase">Requirements</span></h1>
              {isEditingName ? (
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={saveProjectName}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  maxLength={100}
                  className="text-[9px] text-indigo-600 font-bold uppercase max-w-[150px] bg-indigo-50 border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <p
                  onClick={startEditingName}
                  className="text-[9px] text-indigo-600 font-bold uppercase truncate max-w-[150px] cursor-pointer hover:bg-indigo-50 hover:px-1 rounded transition-all"
                  title="Click to edit project name"
                >
                  {projectName}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Download className="w-5 h-5" /></button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-100 origin-top-right">
                <button onClick={() => exportAsMarkdown('functional')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-indigo-500" /> Functional Spec (.md)</button>
                <button onClick={() => exportAsMarkdown('technical')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-emerald-500" /> Technical Spec (.md)</button>
                <button onClick={() => exportAsMarkdown('implementation')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-purple-500" /> Implementation Plan (.md)</button>
              </div>
            )}
          </div>
          
          <div className="w-[1px] h-6 bg-slate-200 mx-1" />

          {user ? (
            <div className="flex items-center gap-3">
              <Avatar photoURL={user.photoURL} displayName={user.displayName} size={7} className="border border-indigo-100" />
              <button onClick={() => fb.auth && fb.signOut(fb.auth)} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={handleSignIn} className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Sign In</button>
          )}

          <button 
            onClick={saveCurrentProject} 
            disabled={saveStatus === 'saving'} 
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 shadow-md ${
              saveStatus === 'saved' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Synced' : 'Push to Cloud'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`bg-slate-800 transition-all duration-300 border-r border-slate-700 overflow-hidden ${isLibraryOpen ? 'w-64' : 'w-0'}`}>
          <div className="w-64 flex flex-col h-full">
            <div className="p-4 flex justify-between items-center text-slate-400 border-b border-slate-700">
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Workspace Library</span></div>
              <button onClick={createNewProject} className="p-1 hover:bg-slate-700 rounded transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {savedProjects.length === 0 ? (
                <div className="p-6 text-center">
                   <p className="text-[10px] text-slate-500 font-black uppercase italic">Library Empty</p>
                </div>
              ) : (
                savedProjects.map(p => (
                  <div key={p.id} onClick={() => loadProject(p)} className={`group p-3 rounded-xl cursor-pointer border transition-all ${activeProjectId === p.id ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-slate-800/50 border-transparent hover:border-slate-600'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-slate-200 truncate">{p.projectName}</h4>
                      <button onClick={(e) => deleteProject(p.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase">
                      <Clock className="w-2.5 h-2.5" /> {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="w-[380px] shrink-0 border-r border-slate-800 shadow-xl z-10"><ChatPane messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} /></section>
        <section className="flex-1 bg-slate-50"><EditorPane functional={functionalSpec} technical={technicalSpec} implementationPlan={implementationPlan} onUpdateFunctional={setFunctionalSpec} onUpdateTechnical={setTechnicalSpec} onUpdateImplementationPlan={setImplementationPlan} /></section>
      </div>
    </div>
  );
};

export default App;
