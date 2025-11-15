
export const STRESS_THRESHOLD = 80;

export interface HealthDataPoint {
  timestamp: number;
  value: number;
  type: 'stress';
}

export interface FlightEvent {
  event: string;
  timestamp: number;
  details: string;
}

export interface FlightData {
  summary: string;
  events: FlightEvent[];
}

export interface ChartDataPoint {
    time: string;
    stress?: number;
}

export enum AppState {
  AWAITING_WATCH_DATA,
  AWAITING_FLIGHT_DATA,
  PROCESSING,
  DISPLAYING_RESULTS
}
