"use client";

import { StoryPanel as StoryPanelType } from "@/types/story";

interface StoryPanelProps {
  panel: StoryPanelType;
}

export default function StoryPanel({ panel }: StoryPanelProps) {
  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 space-y-6 text-sm h-full overflow-y-auto">
      <div>
        <h3 className="text-purple-300 font-bold text-lg mb-3 border-b border-purple-500/30 pb-2">
          Key Items
        </h3>
        {panel.keyItems.length > 0 ? (
          <ul className="space-y-2">
            {panel.keyItems.map((item, idx) => (
              <li key={idx} className="text-slate-200">
                <span className="font-semibold text-purple-200">{item.name}</span>
                {item.note && <span className="text-slate-400"> — {item.note}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic">None yet</p>
        )}
      </div>

      <div>
        <h3 className="text-purple-300 font-bold text-lg mb-3 border-b border-purple-500/30 pb-2">
          Current Thread
        </h3>
        <p className="text-slate-200 font-medium mb-2">{panel.currentThread.focus}</p>
        {panel.currentThread.leads.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            {panel.currentThread.leads.map((lead, idx) => (
              <li key={idx}>{lead}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-purple-300 font-bold text-lg mb-3 border-b border-purple-500/30 pb-2">
          People
        </h3>
        {panel.people.length > 0 ? (
          <ul className="space-y-2">
            {panel.people.map((person, idx) => (
              <li key={idx} className="text-slate-200">
                <span className="font-semibold text-purple-200">{person.name}</span>
                <span className="text-slate-400"> ({person.status})</span>
                {person.note && <p className="text-slate-400 text-xs mt-1">{person.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic">None yet</p>
        )}
      </div>

      <div>
        <h3 className="text-purple-300 font-bold text-lg mb-3 border-b border-purple-500/30 pb-2">
          Abilities
        </h3>
        {panel.abilities.length > 0 ? (
          <ul className="space-y-2">
            {panel.abilities.map((ability, idx) => (
              <li key={idx} className="text-slate-200">
                <span className="font-semibold text-purple-200">{ability.name}</span>
                <span className="text-slate-400"> [Cost: {ability.cost}]</span>
                {ability.drawback && (
                  <p className="text-slate-400 text-xs mt-1">Drawback: {ability.drawback}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic">None yet</p>
        )}
      </div>

      <div>
        <h3 className="text-purple-300 font-bold text-lg mb-3 border-b border-purple-500/30 pb-2">
          Continuity Flags
        </h3>
        {panel.continuityFlags.length > 0 ? (
          <ul className="space-y-1">
            {panel.continuityFlags.map((flag, idx) => (
              <li key={idx} className="text-slate-300 text-xs bg-slate-700/50 px-2 py-1 rounded">
                {flag}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic">None yet</p>
        )}
      </div>
    </div>
  );
}
