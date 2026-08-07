import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { updateJobState } from '../../features/aiIntake/aiIntakeSlice';
import { applyAiFields } from '../../features/complaintForm/complaintFormSlice';
import type { IntakeJob } from '../../types';

/**
 * Subscribes to the SSE stream for a given job_id.
 * On each event, dispatches job state updates to aiIntakeSlice
 * and, on completion, applies extracted fields to complaintFormSlice.
 * Falls back to polling if EventSource is unavailable.
 */
export function useIntakeStream(jobId: string | null): void {
  const dispatch = useDispatch<AppDispatch>();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const url = `/api/v1/intake/${jobId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: IntakeJob = JSON.parse(event.data);
        dispatch(updateJobState({
          status: data.status,
          progress_percent: data.progress_percent,
          extracted_payload: data.extracted_payload,
          error_message: data.error_message,
        }));

        if (data.status === 'complete' && data.extracted_payload?.mapped_complaint) {
          dispatch(applyAiFields(data.extracted_payload.mapped_complaint as Record<string, string | null>));
        }

        if (data.status === 'complete' || data.status === 'error') {
          es.close();
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId, dispatch]);
}
