
import React from 'react';
import { AppState } from '../types';
import { HeartPulse, PlaneTakeoff, BarChart2 } from 'lucide-react';

interface StepIndicatorProps {
    currentState: AppState;
}

const steps = [
    { state: AppState.AWAITING_WATCH_DATA, label: 'Upload Watch Data', Icon: HeartPulse },
    { state: AppState.AWAITING_FLIGHT_DATA, label: 'Upload Flight PDF', Icon: PlaneTakeoff },
    { state: AppState.DISPLAYING_RESULTS, label: 'View Analysis', Icon: BarChart2 }
];

const Step: React.FC<{ Icon: React.ElementType, label: string, status: 'completed' | 'current' | 'upcoming' }> = ({ Icon, label, status }) => {
    const statusClasses = {
        completed: {
            icon: 'bg-cyan-600 text-white',
            label: 'text-cyan-600 dark:text-cyan-400 font-semibold',
            connector: 'bg-cyan-600'
        },
        current: {
            icon: 'border-2 border-cyan-600 bg-white dark:bg-slate-800 text-cyan-600',
            label: 'text-cyan-600 dark:text-cyan-400 font-bold',
            connector: 'bg-slate-300 dark:bg-slate-700'
        },
        upcoming: {
            icon: 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500',
            label: 'text-slate-500 dark:text-slate-400',
            connector: 'bg-slate-300 dark:bg-slate-700'
        }
    };
    const classes = statusClasses[status];

    return (
        <div className="relative flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${classes.icon} transition-all duration-300`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className={`mt-2 text-sm text-center ${classes.label}`}>{label}</p>
        </div>
    );
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentState }) => {
    const currentStepIndex = steps.findIndex(step => step.state === currentState) ;
    if(currentStepIndex < 0) return null; // Don't show for processing state

    return (
        <div className="w-full max-w-2xl mx-auto mb-8 px-4">
            <div className="flex items-start justify-between">
                {steps.map((step, index) => {
                    const getStatus = () => {
                        if (index < currentStepIndex) return 'completed';
                        if (index === currentStepIndex) return 'current';
                        return 'upcoming';
                    };
                    const status = getStatus();
                    const isLastStep = index === steps.length - 1;

                    return (
                        <React.Fragment key={step.state}>
                            <Step Icon={step.Icon} label={step.label} status={status} />
                            {!isLastStep && (
                                <div className={`flex-1 h-1 self-start mt-6 ${index < currentStepIndex ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StepIndicator;
