
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LogOut, Save, FolderOpen, Plus, Trash2, Clock, Sparkle, Download, FileText, Check, AlertCircle, RefreshCw, Users, Lock, Unlock, BookOpen } from 'lucide-react';
import ChatPane from './components/ChatPane';
import EditorPane from './components/EditorPane';
import Avatar from './components/Avatar';
import UserGuide from './components/UserGuide';
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
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [myLockTimestamp, setMyLockTimestamp] = useState<number | null>(null); // Track when I locked (for UI re-render)

  // Use ref to store savedProjects to avoid dependency hell
  const savedProjectsRef = useRef<SavedProject[]>([]);
  savedProjectsRef.current = savedProjects;

  // CRITICAL: Use ref for lock timestamp to avoid stale closure problem
  const myLockTimestampRef = useRef<number | null>(null);

  // We check this every render to ensure the UI is in sync
  const firebaseReady = fb.isFirebaseEnabled();

  // Derived lock states
  const currentProject = useMemo(() => {
    return savedProjects.find(p => p.id === activeProjectId);
  }, [savedProjects, activeProjectId]);

  const isLockedByMe = useMemo(() => {
    // Check both Firestore state AND local lock tracking (for immediate response after locking)
    const firestoreLock = currentProject?.lockedBy === user?.uid;
    const localLock = myLockTimestamp !== null && currentProject?.id === activeProjectId;
    return firestoreLock || localLock;
  }, [currentProject, user, myLockTimestamp, activeProjectId]);

  const isLockedByOther = useMemo(() => {
    // If I have the lock locally, it's not locked by others
    if (myLockTimestamp !== null && currentProject?.id === activeProjectId) return false;
    return currentProject?.lockedBy && currentProject.lockedBy !== user?.uid;
  }, [currentProject, user, myLockTimestamp, activeProjectId]);

  const lockInfo = useMemo(() => {
    return {
      lockedByName: currentProject?.lockedByName,
      lockedByAvatar: currentProject?.lockedByAvatar,
      lockedAt: currentProject?.lockedAt
    };
  }, [currentProject]);

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

  // Real-time listener for active project (for read-only users to see updates)
  useEffect(() => {
    if (!activeProjectId || !fb.db) return;

    console.log("👁️ Watching active project for real-time updates...");

    const unsubscribe = fb.onSnapshot(
      fb.doc(fb.db, "projects", activeProjectId),
      (snapshot) => {
        const data = snapshot.data() as SavedProject;

        if (!data) return;

        console.log('🔍 DEBUG Firestore listener - received data lock fields:', {
          lockedBy: data.lockedBy,
          lockedByName: data.lockedByName,
          lockedAt: data.lockedAt,
          lastActivityAt: data.lastActivityAt
        });
        console.log('🔍 DEBUG Firestore listener - current user:', user?.uid);
        console.log('🔍 DEBUG Firestore listener - myLockTimestamp:', myLockTimestamp);

        // Only update if not locked by me (prevent overwriting my own edits)
        if (data.lockedBy !== user?.uid) {
          console.log("📥 Receiving real-time updates from another user");
          setProjectName(data.projectName);
          setFunctionalSpec(data.functional);
          setTechnicalSpec(data.technical);
          setImplementationPlan(data.implementationPlan);
          setMessages(data.messages);
        } else {
          console.log("📥 Received my own update, skipping local state update");
        }
      },
      (error) => {
        console.error("❌ Active project sync error:", error);
      }
    );

    return () => unsubscribe();
  }, [activeProjectId, user]);

  // Clear local lock tracking if Firestore shows we no longer have the lock
  useEffect(() => {
    if (myLockTimestamp && currentProject) {
      // If Firestore says someone else has the lock, clear our local tracking
      if (currentProject.lockedBy && currentProject.lockedBy !== user?.uid) {
        console.log('⚠️ Lock was stolen or expired, clearing local tracking');
        myLockTimestampRef.current = null; // Clear ref FIRST
        setMyLockTimestamp(null);
        if (idleTimer) {
          clearTimeout(idleTimer);
          setIdleTimer(null);
        }
      }
    }
  }, [currentProject, user, myLockTimestamp, idleTimer]);

  const handleSignIn = async () => {
    if (!fb.auth) return;
    try {
      await fb.signInWithPopup(fb.auth, fb.googleProvider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      alert(`Sign in failed: ${error.message}`);
    }
  };

  const saveCurrentProject = useCallback(async (activityTime?: number) => {
    if (!activeProjectId) return;

    setSaveStatus('saving');
    const id = activeProjectId;

    // Read from REF to avoid stale closure - this is always the current value
    const currentLockTimestamp = myLockTimestampRef.current;

    console.log('🔍 DEBUG saveCurrentProject - myLockTimestampRef.current:', currentLockTimestamp);
    console.log('🔍 DEBUG saveCurrentProject - user:', user?.uid);
    console.log('🔍 DEBUG saveCurrentProject - condition check:', currentLockTimestamp !== null && user);

    // Determine lock fields: if we have lock timestamp, preserve OUR lock
    const lockFields = currentLockTimestamp !== null && user
      ? {
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByAvatar: user.photoURL,
          lockedAt: currentLockTimestamp,
          lastActivityAt: activityTime || Date.now()
        }
      : {
          lockedBy: null,
          lockedByName: null,
          lockedByAvatar: null,
          lockedAt: null,
          lastActivityAt: null
        };

    console.log('🔍 DEBUG saveCurrentProject - lockFields:', lockFields);

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
      ownerId: user?.uid || 'anonymous',
      ...lockFields
    };

    console.log('🔍 DEBUG saveCurrentProject - newProject lock fields:', {
      lockedBy: newProject.lockedBy,
      lockedByName: newProject.lockedByName,
      lockedAt: newProject.lockedAt,
      lastActivityAt: newProject.lastActivityAt
    });

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
  }, [activeProjectId, projectName, functionalSpec, technicalSpec, implementationPlan, messages, user]); // Note: myLockTimestamp removed - we read from ref instead

  const loadProject = (project: SavedProject) => {
    setActiveProjectId(project.id);
    setProjectName(project.projectName);
    setFunctionalSpec(project.functional);
    setTechnicalSpec(project.technical);
    setImplementationPlan(project.implementationPlan || '');
    setMessages(project.messages);
    // Clear lock tracking when switching projects
    myLockTimestampRef.current = null;
    setMyLockTimestamp(null);
  };

  const createNewProject = () => {
    setActiveProjectId(null);
    setProjectName('New Project');
    setFunctionalSpec('');
    setTechnicalSpec('');
    setImplementationPlan('');
    setMessages([]);
    myLockTimestampRef.current = null;
    setMyLockTimestamp(null);
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
        await fb.deleteDoc(fb.doc(fb.db, "projects", id));
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

  const lockProject = useCallback(async () => {
    if (!activeProjectId || !user || !fb.db) {
      alert('Please select a project and sign in first');
      return;
    }

    try {
      await fb.runTransaction(fb.db, async (transaction) => {
        const ref = fb.doc(fb.db, "projects", activeProjectId);
        const snap = await transaction.get(ref);
        const data = snap.data() as SavedProject;

        // Check if locked by someone else
        if (data.lockedBy && data.lockedBy !== user.uid) {
          const isStale = Date.now() - (data.lastActivityAt || 0) > 15 * 60 * 1000;
          if (!isStale) {
            throw new Error(`Project is locked by ${data.lockedByName}`);
          }
          // If stale, auto-steal the lock
          console.log(`🔓 Stealing stale lock from ${data.lockedByName}`);
        }

        // Acquire lock
        transaction.update(ref, {
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByAvatar: user.photoURL,
          lockedAt: Date.now(),
          lastActivityAt: Date.now()
        });
      });

      console.log('🔒 Lock acquired successfully');

      // Track lock locally for immediate UI response
      const lockTime = Date.now();
      myLockTimestampRef.current = lockTime; // Update ref FIRST (synchronous, for callbacks)
      setMyLockTimestamp(lockTime); // Update state (for UI re-render)

      // Start 15-min idle timer
      const timer = setTimeout(() => {
        console.log('⏰ Auto-unlocking due to 15 min idle');
        unlockProject();
      }, 15 * 60 * 1000);
      setIdleTimer(timer);

    } catch (error: any) {
      console.error('Lock acquisition failed:', error);
      alert(error.message);
    }
  }, [activeProjectId, user]);

  const unlockProject = useCallback(async () => {
    if (!activeProjectId || !fb.db || !user) return;

    // Clear idle timer
    if (idleTimer) {
      clearTimeout(idleTimer);
      setIdleTimer(null);
    }

    try {
      // Save final state before unlocking (will use myLockTimestamp to preserve lock)
      await saveCurrentProject();

      // Release lock
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        lockedBy: null,
        lockedByName: null,
        lockedByAvatar: null,
        lockedAt: null
      });

      // Clear local lock tracking (ref FIRST, then state)
      myLockTimestampRef.current = null;
      setMyLockTimestamp(null);

      console.log('🔓 Lock released successfully');
    } catch (error: any) {
      console.error('Unlock failed:', error);
    }
  }, [activeProjectId, idleTimer, saveCurrentProject, user]);

  // Cleanup: unlock on unmount ONLY (not on every dep change)
  // Use ref to avoid calling unlock when dependencies change
  const unlockProjectRef = useRef(unlockProject);
  unlockProjectRef.current = unlockProject;

  useEffect(() => {
    return () => {
      // Only run on actual unmount - check ref for current lock state
      if (myLockTimestampRef.current !== null) {
        console.log('🧹 Component unmounting, releasing lock...');
        unlockProjectRef.current();
      }
    };
  }, []); // Empty deps = only runs on mount/unmount

  // beforeunload: warn and attempt cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Use ref to check current lock state (avoids stale closure)
      if (myLockTimestampRef.current !== null) {
        e.preventDefault();
        e.returnValue = 'You have an active lock. Are you sure you want to leave?';
        unlockProjectRef.current(); // Best effort cleanup using ref
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Empty deps - handler uses refs for current values

  const handleSendMessage = useCallback(async (content: string, attachment?: Attachment) => {
    // For EXISTING projects, require lock. For NEW projects (no activeProjectId), allow messaging.
    const isNewProject = !activeProjectId;
    if (!isNewProject && !isLockedByMe) {
      alert('Please lock the project first before editing');
      return;
    }

    // Reset idle timer
    if (idleTimer) clearTimeout(idleTimer);

    setIsLoading(true);
    const userMessage: Message = {
      role: 'user',
      content,
      displayName: user?.displayName || 'Anonymous',
      photoURL: user?.photoURL || null,
      ...(attachment && { attachment })
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await geminiService.generateSpec(content, messages, functionalSpec, technicalSpec, implementationPlan, attachment);
      const newProjectName = response.projectName || projectName;
      if (response.projectName) setProjectName(response.projectName);
      setFunctionalSpec(response.functional);
      setTechnicalSpec(response.technical);
      setImplementationPlan(response.implementationPlan);
      setMessages(prev => [...prev, { role: 'assistant', content: response.chatResponse }]);

      // For NEW projects, create and auto-lock
      if (isNewProject && fb.db && user) {
        const newId = crypto.randomUUID();
        const lockTime = Date.now();

        // Set local state first
        setActiveProjectId(newId);
        myLockTimestampRef.current = lockTime;
        setMyLockTimestamp(lockTime);

        // Create project with lock in Firestore
        const newProject = {
          id: newId,
          projectName: newProjectName,
          functional: response.functional,
          technical: response.technical,
          implementationPlan: response.implementationPlan,
          messages: [...newMessages, { role: 'assistant', content: response.chatResponse }],
          updatedAt: Date.now(),
          lastEditedBy: user.displayName || 'Anonymous',
          lastEditedAvatar: user.photoURL || null,
          ownerId: user.uid,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByAvatar: user.photoURL,
          lockedAt: lockTime,
          lastActivityAt: lockTime
        };

        await fb.setDoc(fb.doc(fb.db, "projects", newId), newProject);
        console.log('🆕 New project created and auto-locked:', newId);

        // Start 15-min idle timer
        const timer = setTimeout(() => {
          console.log('⏰ Auto-unlocking due to 15 min idle');
          unlockProject();
        }, 15 * 60 * 1000);
        setIdleTimer(timer);
      } else if (!isNewProject) {
        // Existing project - just save
        await saveCurrentProject(Date.now());

        // Restart 15-min idle timer
        const timer = setTimeout(() => {
          console.log('⏰ Auto-unlocking due to 15 min idle');
          unlockProject();
        }, 15 * 60 * 1000);
        setIdleTimer(timer);
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Draftio: Architect disconnected. Please check your connection or Gemini API key." }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, functionalSpec, technicalSpec, implementationPlan, geminiService, user, isLockedByMe, idleTimer, activeProjectId, saveCurrentProject, unlockProject, projectName]);

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
          <button
            onClick={() => setShowUserGuide(true)}
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            title="User Guide"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Export"><Download className="w-5 h-5" /></button>
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

          {isLockedByOther ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Avatar photoURL={lockInfo.lockedByAvatar} displayName={lockInfo.lockedByName} size={6} />
              <span className="text-xs font-semibold text-amber-700">
                🔒 {lockInfo.lockedByName} is editing
              </span>
            </div>
          ) : isLockedByMe ? (
            <button
              onClick={unlockProject}
              className="px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Unlock className="w-4 h-4" />
              UNLOCK
            </button>
          ) : (
            <button
              onClick={lockProject}
              disabled={!activeProjectId}
              className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 shadow-md ${
                !activeProjectId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              LOCK TO EDIT
            </button>
          )}
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

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Read-only Banner */}
          {isLockedByOther && (
            <div className="bg-amber-100 border-b border-amber-200 px-6 py-3 flex items-center justify-center gap-3 shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <div className="flex items-center gap-2">
                <Avatar photoURL={lockInfo.lockedByAvatar} displayName={lockInfo.lockedByName} size={6} />
                <span className="text-sm font-bold text-amber-800">
                  You are in READ ONLY mode - 🔒 Locked by {lockInfo.lockedByName}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <section className="w-[380px] shrink-0 border-r border-slate-800 shadow-xl z-10">
              <ChatPane
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isReadOnly={isLockedByOther || false}
                lockedByName={lockInfo.lockedByName}
              />
            </section>
            <section className="flex-1 bg-slate-50">
              <EditorPane
                functional={functionalSpec}
                technical={technicalSpec}
                implementationPlan={implementationPlan}
                onUpdateFunctional={setFunctionalSpec}
                onUpdateTechnical={setTechnicalSpec}
                onUpdateImplementationPlan={setImplementationPlan}
                isReadOnly={isLockedByOther || false}
                lockedByName={lockInfo.lockedByName}
              />
            </section>
          </div>
        </div>
      </div>

      {/* User Guide Modal */}
      {showUserGuide && <UserGuide onClose={() => setShowUserGuide(false)} />}
    </div>
  );
};

export default App;
