
import React from 'react';
import Loader from './Loader';

interface AnalysisPanelProps {
    analysis: string;
    isLoading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, isLoading }) => {
    return (
        <div className="w-full bg-white dark:bg-slate-800/50 rounded-xl shadow-lg p-6 ring-1 ring-slate-200 dark:ring-slate-700 min-h-[200px] flex items-center justify-center">
            {isLoading ? (
                <Loader message="Correlating your data and generating insights..." />
            ) : analysis ? (
                 <div className="prose prose-slate dark:prose-invert max-w-none w-full">
                    <div className="whitespace-pre-wrap font-sans">{analysis}</div>
                </div>
            ) : (
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Analysis Unavailable</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">We couldn't generate insights for this trip. This might be due to an error or lack of significant stress data on your travel day.</p>
                </div>
            )}
        </div>
    );
};

export default AnalysisPanel;
