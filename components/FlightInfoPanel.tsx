
import React from 'react';
import { Ticket } from 'lucide-react';

interface FlightInfoPanelProps {
    summary: string;
}

const FlightInfoPanel: React.FC<FlightInfoPanelProps> = ({ summary }) => {
    return (
        <div className="w-full bg-white dark:bg-slate-800/50 rounded-xl shadow-lg p-6 ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="flex items-center gap-3 mb-4">
                <Ticket className="w-6 h-6 text-cyan-500" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Itinerary</h2>
            </div>
            {/* Using a div with whitespace-pre-wrap to respect newlines and formatting from the AI response */}
            <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {summary}
            </div>
        </div>
    );
};

export default FlightInfoPanel;
