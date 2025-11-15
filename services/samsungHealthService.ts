
import { HealthDataPoint } from '../types';

declare const JSZip: any;

const MAX_FILES_TO_PROCESS = 500; // To prevent performance issues with huge exports

export const parseSamsungHealthZip = async (file: File): Promise<HealthDataPoint[]> => {
    const zip = await JSZip.loadAsync(file);
    const healthData: HealthDataPoint[] = [];

    const filesToProcess: { entry: any; type: 'stress' }[] = [];
    zip.forEach((relativePath: string, zipEntry: any) => {
        if (relativePath.endsWith('.binning_data.json')) {
            if (relativePath.includes('com.samsung.shealth.stress')) {
                filesToProcess.push({ entry: zipEntry, type: 'stress' });
            }
        }
    });

    for (const file of filesToProcess.slice(0, MAX_FILES_TO_PROCESS)) {
        const { entry, type } = file;
        try {
            const jsonString = await entry.async('string');
            const data = JSON.parse(jsonString);

            const dataPoints = Array.isArray(data) ? data : data.data || data.binning_data || [];

            for (const point of dataPoints) {
                let value: number | undefined;
                const timestamp: number | undefined = point.end_time;
                
                if (type === 'stress') {
                    value = point.score;
                }

                if (value !== undefined && timestamp !== undefined) {
                    healthData.push({
                        timestamp,
                        value,
                        type,
                    });
                }
            }
        } catch (error) {
            console.warn(`Could not parse file ${entry.name}:`, error);
        }
    }

    // Sort data chronologically
    healthData.sort((a, b) => a.timestamp - b.timestamp);

    return healthData;
};
