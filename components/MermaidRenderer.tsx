
import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Network, Database, ListTree, Calendar, Map, PieChart, Users, Workflow, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MermaidRendererProps {
  chart: string;
}

// Detect diagram type from mermaid code
const getDiagramInfo = (chart: string): { type: string; icon: React.ReactNode; color: string; isWide: boolean } => {
  const firstLine = chart.trim().split('\n')[0].toLowerCase();

  if (firstLine.startsWith('gantt')) {
    return { type: 'Gantt Chart', icon: <Calendar className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700 border-purple-200', isWide: true };
  }
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
    return { type: 'Flowchart', icon: <Workflow className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 border-blue-200', isWide: false };
  }
  if (firstLine.startsWith('sequencediagram')) {
    return { type: 'Sequence Diagram', icon: <Network className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700 border-green-200', isWide: false };
  }
  if (firstLine.startsWith('erdiagram')) {
    return { type: 'ER Diagram', icon: <Database className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-200', isWide: false };
  }
  if (firstLine.startsWith('journey')) {
    return { type: 'User Journey', icon: <Users className="w-3.5 h-3.5" />, color: 'bg-pink-100 text-pink-700 border-pink-200', isWide: true };
  }
  if (firstLine.startsWith('mindmap')) {
    return { type: 'Mind Map', icon: <ListTree className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200', isWide: false };
  }
  if (firstLine.startsWith('statediagram')) {
    return { type: 'State Diagram', icon: <GitBranch className="w-3.5 h-3.5" />, color: 'bg-cyan-100 text-cyan-700 border-cyan-200', isWide: false };
  }
  if (firstLine.startsWith('pie')) {
    return { type: 'Pie Chart', icon: <PieChart className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700 border-rose-200', isWide: false };
  }
  if (firstLine.startsWith('timeline')) {
    return { type: 'Timeline', icon: <Calendar className="w-3.5 h-3.5" />, color: 'bg-teal-100 text-teal-700 border-teal-200', isWide: true };
  }
  if (firstLine.startsWith('classdiagram')) {
    return { type: 'Class Diagram', icon: <Network className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700 border-orange-200', isWide: false };
  }

  return { type: 'Diagram', icon: <Map className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 border-slate-200', isWide: false };
};

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);

  // Pan and drag state for Figma-like experience
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const diagramInfo = getDiagramInfo(chart);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => {
    setZoomLevel(initialZoom);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate auto-fit zoom when fullscreen opens
  const calculateFitZoom = () => {
    if (!fullscreenRef.current || !containerRef.current) return 1.5;

    const svg = fullscreenRef.current.querySelector('svg');
    if (!svg) return 1.5;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Get SVG dimensions from attributes (more reliable than viewBox for Mermaid)
    const svgWidthAttr = svg.getAttribute('width');
    const svgHeightAttr = svg.getAttribute('height');

    // Parse dimensions (Mermaid often uses values like "800" or "800px")
    const svgWidth = svgWidthAttr ? parseFloat(svgWidthAttr) : svg.getBoundingClientRect().width || 400;
    const svgHeight = svgHeightAttr ? parseFloat(svgHeightAttr) : svg.getBoundingClientRect().height || 300;

    // Available space (with padding for the white container)
    const availableWidth = containerRect.width - 120;
    const availableHeight = containerRect.height - 120;

    // For wide diagrams (Gantt, Timeline, Journey), prioritize width fitting
    if (diagramInfo.isWide) {
      const widthZoom = availableWidth / svgWidth;
      // Ensure it's at least 1.5x for readability, cap at 6x
      return Math.max(Math.min(widthZoom, 6), 1.5);
    }

    // For regular diagrams, fit to both dimensions
    const zoomToFitWidth = availableWidth / svgWidth;
    const zoomToFitHeight = availableHeight / svgHeight;

    // Use the smaller to fit both, but ensure minimum 1.2x for readability
    const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 6);
    return Math.max(fitZoom, 1.2);
  };

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart && (window as any).mermaid) {
        setIsLoading(true);
        setHasError(false);
        try {
          ref.current.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await (window as any).mermaid.render(id, chart);
          ref.current.innerHTML = svg;
          setSvgContent(svg);
          setIsLoading(false);
        } catch (error) {
          console.error("Mermaid error:", error);
          setHasError(true);
          setIsLoading(false);
          ref.current.innerHTML = '';
        }
      }
    };

    renderChart();
  }, [chart]);

  // Update fullscreen content when it opens and calculate fit zoom
  useEffect(() => {
    if (isFullscreen && fullscreenRef.current && svgContent) {
      fullscreenRef.current.innerHTML = svgContent;

      // Reset pan offset when opening fullscreen
      setPanOffset({ x: 0, y: 0 });

      // Wait for next frame to ensure SVG is rendered, then calculate fit
      requestAnimationFrame(() => {
        const fitZoom = calculateFitZoom();
        setInitialZoom(fitZoom);
        setZoomLevel(fitZoom);
      });
    }
  }, [isFullscreen, svgContent]);

  // Figma-like controls: keyboard, wheel zoom to cursor, drag to pan
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        setIsSpaceHeld(false);
        setIsDragging(false);
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
        setIsDragging(false);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // Zoom to cursor position
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate cursor position relative to center
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const cursorOffsetX = mouseX - centerX;
        const cursorOffsetY = mouseY - centerY;

        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const newZoom = Math.min(Math.max(zoomLevel + delta, 0.25), 10);
        const zoomRatio = newZoom / zoomLevel;

        // Adjust pan to zoom toward cursor
        setPanOffset(prev => ({
          x: cursorOffsetX - (cursorOffsetX - prev.x) * zoomRatio,
          y: cursorOffsetY - (cursorOffsetY - prev.y) * zoomRatio
        }));

        setZoomLevel(newZoom);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isSpaceHeld || e.button === 1) { // Space held or middle mouse button
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        panStartRef.current = { ...panOffset };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPanOffset({
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, isSpaceHeld, isDragging, zoomLevel, panOffset]);

  return (
    <>
      <div className="my-6 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-gradient-to-b from-white to-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${diagramInfo.color}`}>
            {diagramInfo.icon}
            {diagramInfo.type}
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="View fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        </div>

        {/* Diagram Content */}
        <div className={`p-4 overflow-x-auto ${diagramInfo.isWide ? 'min-h-[200px]' : ''}`}>
          {isLoading && !hasError && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <span className="ml-2 text-sm">Rendering diagram...</span>
            </div>
          )}

          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm font-semibold mb-2">Failed to render diagram</p>
              <pre className="text-xs text-red-500 bg-red-100 p-3 rounded overflow-x-auto font-mono">
                {chart}
              </pre>
            </div>
          )}

          <div
            ref={ref}
            className={`flex justify-center ${isLoading || hasError ? 'hidden' : ''} ${diagramInfo.isWide ? '[&>svg]:w-full [&>svg]:max-w-none' : ''}`}
          />
        </div>

        {/* Scroll hint for wide diagrams */}
        {diagramInfo.isWide && !isLoading && !hasError && (
          <div className="text-center py-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50/50">
            Scroll horizontally to view full diagram or click Expand for fullscreen
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${diagramInfo.color}`}>
              {diagramInfo.icon}
              {diagramInfo.type}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 rounded-lg p-1">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm font-medium text-slate-300 min-w-[60px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-slate-600 mx-1" />
                <button
                  onClick={handleResetZoom}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Reset zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { setIsFullscreen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
                className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Content - Figma-like canvas */}
          <div
            ref={containerRef}
            className={`flex-1 overflow-hidden bg-slate-800 ${
              isDragging ? 'cursor-grabbing' : isSpaceHeld ? 'cursor-grab' : 'cursor-default'
            }`}
            style={{ userSelect: 'none' }}
          >
            <div className="h-full w-full flex items-center justify-center">
              <div
                ref={fullscreenRef}
                className="bg-white rounded-xl p-8 shadow-2xl"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
              />
            </div>
          </div>

          {/* Fullscreen Footer */}
          <div className="px-6 py-3 bg-slate-900 border-t border-slate-700 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Space</kbd> + drag to pan</span>
              <span>•</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl</kbd>/<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Cmd</kbd> + scroll to zoom</span>
              <span>•</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">ESC</kbd> to close</span>
            </div>
            <button
              onClick={() => { setIsFullscreen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MermaidRenderer;
