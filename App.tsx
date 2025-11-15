import React, { useState, useCallback, useEffect } from 'react';
import { HealthDataPoint, AppState, FlightData, STRESS_THRESHOLD } from './types';
import { parseSamsungHealthZip } from './services/samsungHealthService';
import { extractFlightTimeline, analyzeStressPatterns } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import StepIndicator from './components/StepIndicator';
import FileUpload from './components/FileUpload';
import DataVisualization from './components/DataVisualization';
import AnalysisPanel from './components/AnalysisPanel';
import Loader from './components/Loader';
import FlightInfoPanel from './components/FlightInfoPanel';
import { PlaneTakeoff, HeartPulse, BrainCircuit, FileUp } from 'lucide-react';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.AWAITING_WATCH_DATA);
    const [healthData, setHealthData] = useState<HealthDataPoint[]>([]);
    const [flightData, setFlightData] = useState<FlightData | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleWatchDataUpload = async (file: File) => {
        setIsLoading(true);
        setLoadingMessage('Analyzing your smartwatch data... This may take a moment.');
        setError(null);
        try {
            const data = await parseSamsungHealthZip(file);
            if (data.length === 0) {
                throw new Error("Could not find compatible stress or heart rate data in the zip file. Please check the file structure.");
            }
            setHealthData(data);
            setAppState(AppState.AWAITING_FLIGHT_DATA);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred during zip file processing.');
            setAppState(AppState.AWAITING_WATCH_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlightDataUpload = async (file: File) => {
        setIsLoading(true);
        setLoadingMessage('Extracting flight details with Gemini AI...');
        setError(null);
        try {
            const base64Pdf = await fileToBase64(file);
            const data = await extractFlightTimeline(base64Pdf, file.type);
            setFlightData(data);
            setAppState(AppState.DISPLAYING_RESULTS);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred while analyzing the flight PDF.');
            setAppState(AppState.AWAITING_FLIGHT_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAnalysis = useCallback(async () => {
        if (!flightData) return;
        setIsAnalysisLoading(true);
        setError(null);
        try {
            const eventTimestamps = flightData.events.map(e => e.timestamp);
            const travelStart = Math.min(...eventTimestamps);
            const travelEnd = Math.max(...eventTimestamps);

            const firstEventDate = new Date(travelStart);
            firstEventDate.setHours(0, 0, 0, 0);
            const travelDayStart = firstEventDate.getTime();

            const lastEventDate = new Date(travelEnd);
            lastEventDate.setHours(23, 59, 59, 999);
            const travelDayEnd = lastEventDate.getTime();

            const highStressPeriods = healthData
                .filter(d => d.timestamp >= travelDayStart && d.timestamp <= travelDayEnd)
                .filter(d => d.type === 'stress' && d.value >= STRESS_THRESHOLD)
                .map(d => ({
                    timestamp: d.timestamp,
                    value: d.value
                }));

            const insight = await analyzeStressPatterns(highStressPeriods, flightData.events);
            setAnalysis(insight);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate AI analysis.');
        } finally {
            setIsAnalysisLoading(false);
        }
    }, [healthData, flightData]);

    useEffect(() => {
        if (appState === AppState.DISPLAYING_RESULTS && flightData && !analysis && !isAnalysisLoading) {
            handleGenerateAnalysis();
        }
    }, [appState, flightData, analysis, isAnalysisLoading, handleGenerateAnalysis]);

    const renderContent = () => {
        if (isLoading) {
            return <Loader message={loadingMessage} />;
        }

        switch (appState) {
            case AppState.AWAITING_WATCH_DATA:
                return (
                    <FileUpload
                        onFileUpload={handleWatchDataUpload}
                        title="Upload Smartwatch Data"
                        description="Upload the .zip file exported from your Samsung Health app."
                        acceptedFileTypes=".zip"
                        Icon={HeartPulse}
                    />
                );
            case AppState.AWAITING_FLIGHT_DATA:
                return (
                    <FileUpload
                        onFileUpload={handleFlightDataUpload}
                        title="Upload Flight Itinerary"
                        description="Upload your flight ticket or itinerary as a PDF file."
                        acceptedFileTypes=".pdf"
                        Icon={PlaneTakeoff}
                    />
                );
            case AppState.DISPLAYING_RESULTS:
                if (!flightData) return null;
                return (
                    <div className="w-full space-y-8">
                       <FlightInfoPanel summary={flightData.summary} />
                       <DataVisualization healthData={healthData} flightEvents={flightData.events} />
                       <AnalysisPanel analysis={analysis} isLoading={isAnalysisLoading} />
                    </div>
                );
        }
    };
    
    const resetApp = () => {
        setAppState(AppState.AWAITING_WATCH_DATA);
        setHealthData([]);
        setFlightData(null);
        setAnalysis('');
        setError(null);
        setIsLoading(false);
        setIsAnalysisLoading(false);
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3">
                      <BrainCircuit className="w-10 h-10 text-cyan-500"/>
                      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">StressFlight Analytics</h1>
                    </div>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Correlate flight events with your body's signals.</p>
                </header>

                <main className="w-full">
                    <StepIndicator currentState={appState} />
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md my-4 shadow-md" role="alert">
                            <p className="font-bold">An Error Occurred</p>
                            <p>{error}</p>
                        </div>
                    )}
                    <div className="mt-8 bg-white dark:bg-slate-800/50 rounded-2xl shadow-xl p-6 sm:p-10 min-h-[300px] flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
                        {renderContent()}
                    </div>
                     {appState === AppState.DISPLAYING_RESULTS && (
                        <div className="text-center mt-8">
                            <button
                                onClick={resetApp}
                                className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm"
                            >
                                <FileUp className="w-4 h-4" />
                                Start New Analysis
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;