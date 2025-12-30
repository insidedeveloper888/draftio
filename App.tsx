
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LogOut, Save, FolderOpen, Plus, Trash2, Clock, Sparkle, Download, FileText, Check, AlertCircle, RefreshCw, Users, Lock, Unlock, BookOpen, Menu, X, MessageSquare, FileEdit, LayoutGrid, FileText as FileTextIcon } from 'lucide-react';
import ChatPane from './components/ChatPane';
import EditorPane from './components/EditorPane';
import ProjectPane from './components/ProjectPane';
import TaskExtractionModal from './components/TaskExtractionModal';
import TaskDetailPanel from './components/TaskDetailPanel';
import Avatar from './components/Avatar';
import UserGuide from './components/UserGuide';
import { GeminiService } from './services/geminiService';
import { Message, SavedProject, Attachment, AppMode, Task, Milestone, TaskExtractionResponse, ExtractedTask, ExtractedMilestone, TeamMember } from './types';
import * as fb from './services/firebase';
import './utils/seedUsers'; // Exposes seedUsers() to window for console access
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
  const [mobileView, setMobileView] = useState<'chat' | 'editor'>('chat');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('specs');
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const [extractionResult, setExtractionResult] = useState<TaskExtractionResponse | null>(null);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [myLockTimestamp, setMyLockTimestamp] = useState<number | null>(null); // Track when I locked (for UI re-render)

  // Use ref to store savedProjects to avoid dependency hell
  const savedProjectsRef = useRef<SavedProject[]>([]);
  savedProjectsRef.current = savedProjects;

  // CRITICAL: Use ref for lock timestamp to avoid stale closure problem
  const myLockTimestampRef = useRef<number | null>(null);

  // We check this every render to ensure the UI is in sync
  const firebaseReady = fb.isFirebaseEnabled();

  // Track project ID from URL for initial load
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(() => {
    // Read project ID from URL on initial render
    const path = window.location.pathname;
    const match = path.match(/^\/([a-f0-9-]{36})$/i);
    return match ? match[1] : null;
  });

  // Update URL when active project changes
  useEffect(() => {
    const currentPath = window.location.pathname;
    const expectedPath = activeProjectId ? `/${activeProjectId}` : '/';

    if (currentPath !== expectedPath) {
      window.history.pushState({ projectId: activeProjectId }, '', expectedPath);
    }
  }, [activeProjectId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const projectId = event.state?.projectId || null;
      if (projectId) {
        const project = savedProjectsRef.current.find(p => p.id === projectId);
        if (project) {
          loadProjectFromData(project);
        }
      } else {
        // No project in state, go to new project
        createNewProject();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load pending project from URL once projects are loaded
  useEffect(() => {
    if (pendingProjectId && savedProjects.length > 0) {
      const project = savedProjects.find(p => p.id === pendingProjectId);
      if (project) {
        console.log('📂 Loading project from URL:', pendingProjectId);
        loadProjectFromData(project);
      } else {
        console.log('⚠️ Project not found:', pendingProjectId);
        // Clear invalid URL
        window.history.replaceState(null, '', '/');
      }
      setPendingProjectId(null);
    }
  }, [pendingProjectId, savedProjects]);

  // Helper to load project data without triggering URL update loop
  const loadProjectFromData = (project: SavedProject) => {
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

  // Check if lock is stale (older than 15 minutes)
  const isLockStale = useMemo(() => {
    if (!currentProject?.lockedBy || !currentProject?.lastActivityAt) return false;
    const fifteenMinutes = 15 * 60 * 1000;
    return Date.now() - currentProject.lastActivityAt > fifteenMinutes;
  }, [currentProject]);

  const isLockedByOther = useMemo(() => {
    // If I have the lock locally, it's not locked by others
    if (myLockTimestamp !== null && currentProject?.id === activeProjectId) return false;
    // If the lock is stale (>15 min), treat it as unlocked (can be stolen)
    if (isLockStale) return false;
    return currentProject?.lockedBy && currentProject.lockedBy !== user?.uid;
  }, [currentProject, user, myLockTimestamp, activeProjectId, isLockStale]);

  const lockInfo = useMemo(() => {
    return {
      lockedByName: currentProject?.lockedByName,
      lockedByAvatar: currentProject?.lockedByAvatar,
      lockedAt: currentProject?.lockedAt,
      lastActivityAt: currentProject?.lastActivityAt,
      isStale: isLockStale
    };
  }, [currentProject, isLockStale]);

  // Countdown timer for lock takeover
  const [lockCountdown, setLockCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!isLockedByOther || !lockInfo.lastActivityAt) {
      setLockCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const fifteenMinutes = 15 * 60 * 1000;
      const elapsed = Date.now() - lockInfo.lastActivityAt!;
      const remaining = fifteenMinutes - elapsed;

      if (remaining <= 0) {
        setLockCountdown(null);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isLockedByOther, lockInfo.lastActivityAt]);

  const geminiService = useMemo(() => new GeminiService(), []);

  // Listen for Auth changes using the correctly exported onAuthStateChanged from local firebase service.
  useEffect(() => {
    if (!fb.auth) return;
    const unsubscribe = onAuthStateChanged(fb.auth, async (currentUser) => {
      setUser(currentUser);
      console.log("👤 Auth State:", currentUser ? `Logged in as ${currentUser.displayName}` : "Logged out");

      // Store/update user info in Firestore users collection
      if (currentUser && fb.db) {
        try {
          const userDoc: TeamMember = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            lastSignIn: Date.now(),
          };
          await fb.setDoc(fb.doc(fb.db, "users", currentUser.uid), userDoc, { merge: true });
          console.log("👥 User info stored in Firestore");
        } catch (error) {
          console.error("Failed to store user info:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [firebaseReady]);

  // Listen for team members (all users who have signed in)
  useEffect(() => {
    if (!fb.db) return;

    console.log("👥 Loading team members...");
    const q = fb.query(fb.collection(fb.db, "users"), fb.orderBy("lastSignIn", "desc"));
    const unsubscribe = fb.onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => doc.data() as TeamMember);
      setTeamMembers(members);
      console.log(`👥 Loaded ${members.length} team members`);
    }, (error) => {
      console.error("❌ Team members sync error:", error);
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

    // Get current project's PM data to preserve it during saves
    const existingProject = savedProjectsRef.current.find(p => p.id === id);

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
      // Preserve original owner info (don't overwrite on subsequent saves)
      ownerId: existingProject?.ownerId || user?.uid || 'anonymous',
      ownerName: existingProject?.ownerName || user?.displayName || 'Anonymous',
      ownerAvatar: existingProject?.ownerAvatar || user?.photoURL || null,
      // Preserve project management fields
      tasks: existingProject?.tasks || [],
      milestones: existingProject?.milestones || [],
      timeEntries: existingProject?.timeEntries || [],
      comments: existingProject?.comments || [],
      lastTaskExtraction: existingProject?.lastTaskExtraction || null,
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
    loadProjectFromData(project);
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

  // Handler for changing task status (from drag-and-drop)
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: Task['status']) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const tasks = currentProject.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const now = Date.now();
    const updatedTask = {
      ...tasks[taskIndex],
      status: newStatus,
      completedAt: newStatus === 'done' ? now : null,
      updatedAt: now,
    };

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        tasks: updatedTasks,
        updatedAt: now,
      });
      console.log(`✅ Task "${updatedTask.title}" moved to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [currentProject, activeProjectId]);

  // Handler for clicking on a task (opens detail panel)
  const handleTaskClick = useCallback((task: Task) => {
    console.log('📋 Task clicked:', task.title);
    setSelectedTask(task);
  }, []);

  // Handler for updating a task
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const tasks = currentProject.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const now = Date.now();
    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: now,
    };

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        tasks: updatedTasks,
        updatedAt: now,
      });
      console.log(`✅ Task "${updatedTask.title}" updated`);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    }
  }, [currentProject, activeProjectId]);

  // Handler for deleting a task
  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const tasks = currentProject.tasks || [];
    const taskToDelete = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);

    // Also remove this task from any dependencies
    const cleanedTasks = updatedTasks.map(t => ({
      ...t,
      dependsOn: t.dependsOn.filter(depId => depId !== taskId),
    }));

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        tasks: cleanedTasks,
        updatedAt: Date.now(),
      });
      console.log(`🗑️ Task "${taskToDelete?.title}" deleted`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  }, [currentProject, activeProjectId]);

  // Handler for logging time on a task
  const handleLogTime = useCallback(async (taskId: string, hours: number, description: string) => {
    if (!currentProject || !activeProjectId || !fb.db || !user) return;

    const now = Date.now();
    const newEntry = {
      id: crypto.randomUUID(),
      taskId,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      hours,
      description,
      loggedAt: now,
    };

    const timeEntries = [...(currentProject.timeEntries || []), newEntry];

    // Update task's loggedHours
    const tasks = currentProject.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        loggedHours: (updatedTasks[taskIndex].loggedHours || 0) + hours,
        updatedAt: now,
      };

      try {
        await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
          timeEntries,
          tasks: updatedTasks,
          updatedAt: now,
        });
        console.log(`⏱️ Logged ${hours}h on task`);
      } catch (error) {
        console.error('Failed to log time:', error);
      }
    }
  }, [currentProject, activeProjectId, user]);

  // Handler for deleting a time entry
  const handleDeleteTimeEntry = useCallback(async (entryId: string) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const timeEntries = currentProject.timeEntries || [];
    const entryToDelete = timeEntries.find(e => e.id === entryId);
    if (!entryToDelete) return;

    const updatedEntries = timeEntries.filter(e => e.id !== entryId);

    // Update task's loggedHours
    const tasks = currentProject.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === entryToDelete.taskId);
    if (taskIndex !== -1) {
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        loggedHours: Math.max(0, (updatedTasks[taskIndex].loggedHours || 0) - entryToDelete.hours),
        updatedAt: Date.now(),
      };

      try {
        await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
          timeEntries: updatedEntries,
          tasks: updatedTasks,
          updatedAt: Date.now(),
        });
        console.log(`🗑️ Deleted time entry`);
      } catch (error) {
        console.error('Failed to delete time entry:', error);
      }
    }
  }, [currentProject, activeProjectId]);

  // Handler for adding a comment
  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    if (!currentProject || !activeProjectId || !fb.db || !user) return;

    const now = Date.now();
    const newComment = {
      id: crypto.randomUUID(),
      taskId,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      content,
      createdAt: now,
      updatedAt: null,
    };

    const comments = [...(currentProject.comments || []), newComment];

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        comments,
        updatedAt: now,
      });
      console.log(`💬 Added comment`);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [currentProject, activeProjectId, user]);

  // Handler for editing a comment
  const handleEditComment = useCallback(async (commentId: string, content: string) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const comments = currentProject.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const now = Date.now();
    const updatedComments = [...comments];
    updatedComments[commentIndex] = {
      ...updatedComments[commentIndex],
      content,
      updatedAt: now,
    };

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        comments: updatedComments,
        updatedAt: now,
      });
      console.log(`✏️ Edited comment`);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  }, [currentProject, activeProjectId]);

  // Handler for deleting a comment
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!currentProject || !activeProjectId || !fb.db) return;

    const comments = currentProject.comments || [];
    const updatedComments = comments.filter(c => c.id !== commentId);

    try {
      await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
        comments: updatedComments,
        updatedAt: Date.now(),
      });
      console.log(`🗑️ Deleted comment`);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }, [currentProject, activeProjectId]);

  // Handler for extracting tasks from implementation plan
  const handleExtractTasks = useCallback(async () => {
    if (!implementationPlan || !currentProject) {
      alert('No implementation plan available to extract tasks from.');
      return;
    }

    setIsExtractingTasks(true);
    try {
      console.log('🤖 Starting AI task extraction...');
      const result = await geminiService.extractTasks(
        implementationPlan,
        currentProject.projectName,
        currentProject.tasks || [],
        currentProject.milestones || []
      );
      console.log('✅ Task extraction complete:', result);

      setExtractionResult(result);
      setShowExtractionModal(true);
    } catch (error) {
      console.error('Task extraction failed:', error);
      alert('Failed to extract tasks. Please try again.');
    } finally {
      setIsExtractingTasks(false);
    }
  }, [implementationPlan, currentProject, geminiService]);

  // Handler for confirming extracted tasks
  const handleConfirmExtraction = useCallback(async (
    selectedTasks: ExtractedTask[],
    selectedMilestones: ExtractedMilestone[]
  ) => {
    if (!currentProject || !user || !activeProjectId) return;

    console.log('📥 Importing tasks:', selectedTasks.length, 'milestones:', selectedMilestones.length);

    // Create milestone objects with IDs
    const now = Date.now();
    const newMilestones: Milestone[] = selectedMilestones.map((m, index) => ({
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      name: m.name,
      description: m.description,
      targetDate: null,
      completedAt: null,
      orderIndex: (currentProject.milestones?.length || 0) + index,
      createdAt: now,
      updatedAt: now,
    }));

    // Create a map of milestone names to IDs
    const milestoneNameToId: Record<string, string> = {};
    [...(currentProject.milestones || []), ...newMilestones].forEach(m => {
      milestoneNameToId[m.name] = m.id;
    });

    // Create task objects with IDs
    const newTasks: Task[] = selectedTasks.map((t, index) => ({
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      title: t.title,
      description: t.description,
      status: 'todo' as const,
      priority: t.priority,
      assigneeIds: [],
      assigneeNames: [],
      assigneeAvatars: [],
      estimatedHours: t.estimatedHours,
      loggedHours: 0,
      dueDate: null,
      startDate: null,
      completedAt: null,
      dependsOn: [], // Will be resolved after all tasks are created
      milestoneId: t.milestoneName ? milestoneNameToId[t.milestoneName] || null : null,
      orderIndex: (currentProject.tasks?.length || 0) + index,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
    }));

    // Resolve dependencies (map task titles to IDs)
    const taskTitleToId: Record<string, string> = {};
    [...(currentProject.tasks || []), ...newTasks].forEach(t => {
      taskTitleToId[t.title] = t.id;
    });

    newTasks.forEach((task, index) => {
      const extractedTask = selectedTasks[index];
      if (extractedTask.dependsOn && extractedTask.dependsOn.length > 0) {
        task.dependsOn = extractedTask.dependsOn
          .map(title => taskTitleToId[title])
          .filter(Boolean) as string[];
      }
    });

    // Update project with new tasks and milestones
    const updatedTasks = [...(currentProject.tasks || []), ...newTasks];
    const updatedMilestones = [...(currentProject.milestones || []), ...newMilestones];

    try {
      if (fb.db) {
        await fb.updateDoc(fb.doc(fb.db, "projects", activeProjectId), {
          tasks: updatedTasks,
          milestones: updatedMilestones,
          lastTaskExtraction: now,
          updatedAt: now,
        });
        console.log('✅ Tasks and milestones saved to Firestore');
      }
    } catch (error) {
      console.error('Failed to save tasks:', error);
      alert('Failed to save tasks. Please try again.');
    }

    // Close modal
    setShowExtractionModal(false);
    setExtractionResult(null);
  }, [currentProject, user, activeProjectId]);

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
      timestamp: Date.now(),
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
      setMessages(prev => [...prev, { role: 'assistant', content: response.chatResponse, timestamp: Date.now() }]);

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
          messages: [...newMessages, { role: 'assistant', content: response.chatResponse, timestamp: Date.now() }],
          updatedAt: Date.now(),
          lastEditedBy: user.displayName || 'Anonymous',
          lastEditedAvatar: user.photoURL || null,
          ownerId: user.uid,
          ownerName: user.displayName || 'Anonymous',
          ownerAvatar: user.photoURL || null,
          lockedBy: user.uid,
          lockedByName: user.displayName,
          lockedByAvatar: user.photoURL,
          lockedAt: lockTime,
          lastActivityAt: lockTime,
          // Initialize project management fields as empty
          tasks: [],
          milestones: [],
          timeEntries: [],
          comments: [],
          lastTaskExtraction: null
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
      setMessages(prev => [...prev, { role: 'assistant', content: "Draftio: Architect disconnected. Please check your connection or Gemini API key.", timestamp: Date.now() }]);
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

      <header className="h-14 bg-white border-b flex items-center justify-between px-3 sm:px-6 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop library toggle */}
          <button onClick={() => setIsLibraryOpen(!isLibraryOpen)} className={`hidden md:block p-2 rounded-lg transition-colors ${isLibraryOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}>
            <FolderOpen className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkle className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
            <div>
              <h1 className="text-xs sm:text-sm font-black flex items-center gap-2">Draftio <span className="hidden sm:inline text-[8px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase">Requirements</span></h1>
              {isEditingName ? (
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={saveProjectName}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  maxLength={100}
                  className="text-[11px] sm:text-xs text-indigo-600 font-bold uppercase max-w-[120px] sm:max-w-[180px] bg-indigo-50 border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <p
                  onClick={startEditingName}
                  className="text-[11px] sm:text-xs text-indigo-600 font-bold uppercase truncate max-w-[100px] sm:max-w-[180px] cursor-pointer hover:bg-indigo-50 hover:px-1 rounded transition-all"
                  title="Click to edit project name"
                >
                  {projectName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setAppMode('specs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                appMode === 'specs'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Specs
            </button>
            <button
              onClick={() => setAppMode('project')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                appMode === 'project'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Project
            </button>
          </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => setShowUserGuide(true)}
            className="hidden sm:block p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            title="User Guide"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="hidden sm:block p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Export"><Download className="w-5 h-5" /></button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-100 origin-top-right">
                <button onClick={() => exportAsMarkdown('functional')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-indigo-500" /> Functional Spec (.md)</button>
                <button onClick={() => exportAsMarkdown('technical')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-emerald-500" /> Technical Spec (.md)</button>
                <button onClick={() => exportAsMarkdown('implementation')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><FileText className="w-4 h-4 text-purple-500" /> Implementation Plan (.md)</button>
              </div>
            )}
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-slate-200 mx-1" />

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Avatar photoURL={user.photoURL} displayName={user.displayName} size={7} className="border border-indigo-100" />
              <button onClick={() => fb.auth && fb.signOut(fb.auth)} className="hidden sm:block text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={handleSignIn} className="text-[10px] font-black uppercase px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Sign In</button>
          )}

          {isLockedByOther ? (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Avatar photoURL={lockInfo.lockedByAvatar} displayName={lockInfo.lockedByName} size={6} />
              <span className="text-xs font-semibold text-amber-700">
                🔒 {lockInfo.lockedByName} is editing
              </span>
            </div>
          ) : isLockedByMe ? (
            <button
              onClick={unlockProject}
              className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 sm:gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Unlock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">UNLOCK</span>
            </button>
          ) : lockInfo.isStale && lockInfo.lockedByName ? (
            <button
              onClick={lockProject}
              disabled={!activeProjectId}
              className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 sm:gap-2 shadow-md bg-amber-500 hover:bg-amber-600 text-white"
              title={`Previous lock by ${lockInfo.lockedByName} expired (idle >15 min)`}
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">TAKE OVER</span>
            </button>
          ) : (
            <button
              onClick={lockProject}
              disabled={!activeProjectId}
              className={`px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 sm:gap-2 shadow-md ${
                !activeProjectId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">LOCK TO EDIT</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop: inline, Mobile: overlay */}
        <aside className={`
          bg-slate-800 transition-all duration-300 border-r border-slate-700 overflow-hidden z-50
          ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 w-72 pt-14' : 'hidden'}
          md:relative md:block md:pt-0
          ${isLibraryOpen ? 'md:w-64' : 'md:w-0'}
        `}>
          <div className="w-72 md:w-64 flex flex-col h-full">
            <div className="p-4 flex justify-between items-center text-slate-300 border-b border-slate-700">
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-wide">Workspace Library</span></div>
              <button onClick={createNewProject} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title="New Project"><Plus className="w-4 h-4" /></button>
            </div>
            {/* Mobile-only menu items */}
            <div className="md:hidden p-3 border-b border-slate-700 space-y-2">
              <button
                onClick={() => { setShowUserGuide(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg"
              >
                <BookOpen className="w-4 h-4" /> User Guide
              </button>
              <button
                onClick={() => { setShowExportMenu(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg"
              >
                <Download className="w-4 h-4" /> Export
              </button>
              {user && (
                <button
                  onClick={() => { fb.auth && fb.signOut(fb.auth); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-lg"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {savedProjects.length === 0 ? (
                <div className="p-6 text-center">
                   <p className="text-xs text-slate-400 font-bold uppercase italic">Library Empty</p>
                   <p className="text-[10px] text-slate-500 mt-1">Click + to create a new project</p>
                </div>
              ) : (
                savedProjects.map(p => {
                  const owner = teamMembers.find(m => m.uid === p.ownerId);
                  // Use teamMember photo first, then stored owner info, then lastEdited as final fallback
                  const ownerPhoto = owner?.photoURL || p.ownerAvatar || p.lastEditedAvatar;
                  const ownerName = owner?.displayName || p.ownerName || p.lastEditedBy || owner?.email || 'Unknown';

                  return (
                    <div
                      key={p.id}
                      onClick={() => { loadProject(p); setIsMobileMenuOpen(false); }}
                      className={`group p-3 rounded-xl cursor-pointer border transition-all ${activeProjectId === p.id ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-slate-800/50 border-transparent hover:border-slate-600'}`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="shrink-0 w-5 h-5"
                            title={`Created by ${ownerName}`}
                          >
                            {ownerPhoto ? (
                              <img
                                src={ownerPhoto}
                                alt={ownerName}
                                className="w-5 h-5 rounded-full border border-slate-600 object-cover"
                                onLoad={() => console.log('✅ Image loaded:', p.projectName)}
                                onError={(e) => {
                                  console.log('❌ Image failed to load:', ownerPhoto);
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white border border-slate-600"
                              style={{ display: ownerPhoto ? 'none' : 'flex' }}
                            >
                              {ownerName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-slate-200 truncate">{p.projectName}</h4>
                        </div>
                        <button onClick={(e) => deleteProject(p.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold pl-7">
                        <Clock className="w-3 h-3" /> {new Date(p.updatedAt).toLocaleDateString()} • {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Read-only Banner */}
          {isLockedByOther && (
            <div className="bg-amber-100 border-b border-amber-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-center gap-2 sm:gap-3 shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
              <div className="flex items-center gap-2">
                <Avatar photoURL={lockInfo.lockedByAvatar} displayName={lockInfo.lockedByName} size={6} />
                <span className="text-xs sm:text-sm font-bold text-amber-800">
                  <span className="hidden sm:inline">You are in READ ONLY mode - </span>🔒 Locked by {lockInfo.lockedByName}
                </span>
              </div>
              {lockCountdown && (
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-amber-200/60 rounded-full">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-700" />
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-800">
                    {lockCountdown}
                  </span>
                  <span className="hidden sm:inline text-xs text-amber-700">until takeover</span>
                </div>
              )}
            </div>
          )}

          {appMode === 'specs' ? (
            <>
              {/* Mobile View Toggle */}
              <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0">
                <button
                  onClick={() => setMobileView('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${
                    mobileView === 'chat'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => setMobileView('editor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${
                    mobileView === 'editor'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  Editor
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Chat Section - Full width on mobile when active, fixed width on desktop */}
                <section className={`
                  ${mobileView === 'chat' ? 'flex' : 'hidden'}
                  md:flex md:w-[380px] lg:w-[420px] w-full shrink-0 border-r border-slate-800 shadow-xl z-10
                `}>
                  <ChatPane
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    isReadOnly={isLockedByOther || false}
                    lockedByName={lockInfo.lockedByName}
                  />
                </section>
                {/* Editor Section - Full width on mobile when active, flexible on desktop */}
                <section className={`
                  ${mobileView === 'editor' ? 'flex' : 'hidden'}
                  md:flex flex-1 bg-slate-50
                `}>
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
            </>
          ) : (
            /* Project Mode */
            <ProjectPane
              project={currentProject}
              teamMembers={teamMembers}
              isLockedByMe={isLockedByMe}
              isReadOnly={isLockedByOther || false}
              onExtractTasks={handleExtractTasks}
              isExtractingTasks={isExtractingTasks}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>

      {/* User Guide Modal */}
      {showUserGuide && <UserGuide onClose={() => setShowUserGuide(false)} />}

      {/* Task Extraction Modal */}
      {showExtractionModal && extractionResult && (
        <TaskExtractionModal
          extractionResult={extractionResult}
          onConfirm={handleConfirmExtraction}
          onCancel={() => {
            setShowExtractionModal(false);
            setExtractionResult(null);
          }}
        />
      )}

      {/* Task Detail Panel */}
      {selectedTask && currentProject && (
        <TaskDetailPanel
          task={selectedTask}
          milestones={currentProject.milestones || []}
          allTasks={currentProject.tasks || []}
          timeEntries={currentProject.timeEntries || []}
          comments={currentProject.comments || []}
          teamMembers={teamMembers}
          currentUserId={user?.uid || ''}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onLogTime={handleLogTime}
          onDeleteTimeEntry={handleDeleteTimeEntry}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onClose={() => setSelectedTask(null)}
          isReadOnly={isLockedByOther || false}
        />
      )}
    </div>
  );
};

export default App;
