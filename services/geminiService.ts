import { GoogleGenAI, Type } from "@google/genai";
import { FlightEvent, FlightData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const extractFlightTimeline = async (pdfBase64: string, mimeType: string): Promise<FlightData> => {
    const model = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                {
                    text: `
                        You are an expert travel assistant. Your task is to analyze the provided flight itinerary and extract two things:
                        1. A user-friendly summary of the trip in markdown format.
                        2. A detailed, chronologically ordered timeline of key events for the entire journey.

                        The itinerary may involve multiple flights and layovers.

                        **Summary Instructions:**
                        - Create a concise summary. For each flight, list the flight number, departure/arrival airports (with city and airport code), and times.
                        - Clearly mention any layovers, including the duration.
                        - The output should be a single markdown string that is easy to read.

                        **Timeline Instructions:**
                        - Follow these steps precisely to generate the timeline events. The accuracy of this timeline is critical.
                            1. **Identify All Flight Legs:** Scan the document to identify every distinct flight leg. Note departure/arrival airports, dates, and times for each. Assign them a leg number (Leg 1, Leg 2, etc.).
                            2. **Generate Journey Framing Events:**
                                * "Arrive at Airport": 2 hours before the departure time of Leg 1.
                                * "Leave Airport": 45 minutes after the landing time of the *very last* leg.
                            3. **Generate Events for EACH Flight Leg:** For each leg you identified:
                                * "Reach Gate (Leg X)": 30 minutes before that leg's departure time. (Replace X with the leg number).
                                * "Boarding (Leg X)": 15 minutes before that leg's departure time.
                                * "Takeoff (Leg X)": Exactly at that leg's departure time.
                                * "Landing (Leg X)": Exactly at that leg's arrival time.
                                * "Deplaning (Leg X)": 15 minutes after that leg's landing time.
                            4. **Generate Transit Events (if applicable):** If there is more than one leg, create these events for the time between legs:
                                * "Transit Start": At the landing time of the preceding flight.
                                * "Transit End": At the takeoff time of the succeeding flight.
                        - All timestamps MUST be in UTC ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).
                        - The 'details' field should be brief and relevant (e.g., flight numbers, airports).
                        - Ensure the final list of events is sorted chronologically.

                        **Output Format:**
                        - Return a single JSON object with two keys: "summary" and "events".
                        - "summary": Contains the markdown summary string.
                        - "events": Contains the array of timeline event objects.
                    `
                },
                {
                    inlineData: {
                        data: pdfBase64,
                        mimeType,
                    },
                },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: {
                        type: Type.STRING,
                        description: 'A concise, user-friendly summary of the entire flight itinerary, including layovers, formatted in markdown.'
                    },
                    events: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                event: {
                                    type: Type.STRING,
                                    description: 'The name of the flight event (e.g., "Takeoff (Leg 1)", "Landing").'
                                },
                                timestamp_iso: {
                                    type: Type.STRING,
                                    description: 'The UTC timestamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).'
                                },
                                details: {
                                    type: Type.STRING,
                                    description: 'Brief details about the event (e.g., "Flight UA123 from SFO to JFK").'
                                }
                            },
                            required: ["event", "timestamp_iso", "details"]
                        }
                    }
                },
                required: ["summary", "events"]
            }
        }
    });

    const parsedJson = JSON.parse(response.text);

    return {
        summary: parsedJson.summary,
        events: parsedJson.events.map((item: any) => ({
            event: item.event,
            timestamp: new Date(item.timestamp_iso).getTime(),
            details: item.details
        }))
    };
};


export const analyzeStressPatterns = async (
    highStressPeriods: { timestamp: number; value: number; }[], 
    flightEvents: FlightEvent[]
): Promise<string> => {
    const model = 'gemini-2.5-flash';

    const summary = `
    Flight Events Chronology:
    ${flightEvents.map(e => `- ${e.event} at ${new Date(e.timestamp).toUTCString()}: ${e.details}`).join('\n')}

    High-Stress Periods Detected (Stress score > 80):
    ${highStressPeriods.length > 0 ? highStressPeriods.map(p => `- Stress of ${p.value} detected at ${new Date(p.timestamp).toUTCString()}`).join('\n') : 'No significant stress events detected.'}
    `;

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [{
                text: `
                    You are a friendly and insightful travel wellness companion. Your goal is to look at a person's flight schedule and their stress data to offer some quick, helpful, and easy-to-understand advice.

                    **Your Task:**
                    1.  **Find the Connection:** Look at the moments of high stress and see what was happening with their flight at that time (like boarding, takeoff, etc.).
                    2.  **Give Friendly Insights:** Based on what you find, explain in a simple sentence or two what part of the trip seems to be the most stressful. If there wasn't much stress, just give them a friendly pat on the back for a smooth trip.
                    3.  **Offer 2-3 Simple Tips:** Provide a few super simple, actionable tips to help with those specific stressful moments. Think of things they can do right there in the airport or on the plane.

                    **How to Write:**
                    -   Keep it short and sweet. No long paragraphs.
                    -   Use a warm, encouraging, and human tone. Talk to them like a friend.
                    -   Use headings like "### Your Travel Vitals" and "**A Few Quick Tips**".
                    -   Use markdown bullet points (*) for the tips.

                    **Here is the data:**
                    ${summary}
                `
            }]
        }
    });

    return response.text;
};