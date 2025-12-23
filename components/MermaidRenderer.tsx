
import React, { useEffect, useRef } from 'react';

interface MermaidRendererProps {
  chart: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart && (window as any).mermaid) {
        try {
          // Clear previous content
          ref.current.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await (window as any).mermaid.render(id, chart);
          ref.current.innerHTML = svg;
        } catch (error) {
          console.error("Mermaid error:", error);
          ref.current.innerHTML = '<p class="text-red-500 text-xs">Invalid Diagram Definition</p>';
        }
      }
    };
    
    renderChart();
  }, [chart]);

  return (
    <div className="my-6 p-4 bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-sm">
      <div ref={ref} className="flex justify-center" />
    </div>
  );
};

export default MermaidRenderer;
