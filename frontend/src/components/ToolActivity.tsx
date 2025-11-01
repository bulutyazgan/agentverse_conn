import type { ToolActivity as ToolActivityType } from '../types';
import './ToolActivity.css';

interface ToolActivityProps {
  tools: ToolActivityType[];
}

export const ToolActivity = ({ tools }: ToolActivityProps) => {
  if (tools.length === 0) return null;

  return (
    <div className="tool-activity">
      <div className="tool-activity-header">
        <span className="tool-activity-icon">🔧</span>
        <span>Agent is using tools:</span>
      </div>
      <div className="tool-list">
        {tools.map((tool, index) => (
          <div key={index} className={`tool-item tool-${tool.status}`}>
            <span className="tool-name">{tool.name}</span>
            {tool.status === 'active' && (
              <span className="spinner"></span>
            )}
            {tool.status === 'completed' && (
              <span className="checkmark">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
