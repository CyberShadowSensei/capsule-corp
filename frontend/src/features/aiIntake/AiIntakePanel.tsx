import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setJobId, addChatMessage, setChatLoading } from './aiIntakeSlice';
import { useIntakeStream } from './useIntakeStream';
import { applyAiFields } from '../complaintForm/complaintFormSlice';
import ProgressBar from '../../components/ui/ProgressBar/ProgressBar';
import './AiIntakePanel.css';

const ALLOWED_EXTS = ['.pdf', '.txt', '.docx', '.eml'];

const AiIntakePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { jobId, status, progressPercent, extractedPayload, errorMessage, chatMessages, isChatLoading } =
    useSelector((state: RootState) => state.aiIntake);
  const formFields = useSelector((state: RootState) => state.complaintForm.fields);

  const [chatInput, setChatInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useIntakeStream(jobId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setUploadError(`File type not supported. Allowed: ${ALLOWED_EXTS.join(', ')}`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File exceeds 10MB limit');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() && !selectedFile) return;

    const msg = chatInput.trim();
    let currentJobId = jobId;

    // Step 1: Upload file if present
    if (selectedFile) {
      setUploadError(null);
      dispatch(setChatLoading(true));
      try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        if (currentJobId) {
          fd.append('job_id', currentJobId);
        }
        
        const res = await fetch('/api/v1/intake/upload', {
          method: 'POST',
          body: fd
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Upload failed');
        }
        
        const data = await res.json();
        currentJobId = data.job_id;
        if (!jobId && currentJobId) {
          dispatch(setJobId(currentJobId));
        }
        removeFile();
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        dispatch(setChatLoading(false));
        return; 
      }
    }

    // Step 2: Send chat message if there is text
    if (msg) {
      setChatInput('');
      dispatch(addChatMessage({ role: 'user', content: msg }));
      dispatch(setChatLoading(true)); 
      try {
        const endpoint = currentJobId 
          ? `/api/v1/intake/${currentJobId}/chat` 
          : `/api/v1/intake/chat`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, current_fields: formFields }),
        });
        const data = await res.json();
        
        if (!jobId && data.job_id) {
          dispatch(setJobId(data.job_id));
        }

        if ((data.intent === 'log' || data.intent === 'edit') && data.fields) {
          dispatch(applyAiFields(data.fields));
        }
        const bubbleContent = data.response || 'No response.';
        dispatch(addChatMessage({ role: 'assistant', content: bubbleContent, intent: data.intent ?? 'qa' }));
      } catch {
        dispatch(addChatMessage({ role: 'assistant', content: 'Failed to get a response. Please try again.', intent: 'qa' }));
      } finally {
        dispatch(setChatLoading(false));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } else {
       dispatch(setChatLoading(false));
       setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const isProcessing = status === 'pending' || status === 'running';

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h2 className="ai-panel-title">AIVOA Copilot AI Assistant</h2>
        <p className="ai-panel-subtitle">
          Upload a document or chat. The assistant will extract and populate the form automatically.
        </p>
      </div>

      <div className="ai-panel-body">
        <div className="chat-panel" id="panel-chat">
          {isProcessing && (
            <div className="progress-section">
              <ProgressBar percent={progressPercent} label="Extracting..." />
            </div>
          )}
          {status === 'error' && (
            <div className="panel-error" role="alert">{errorMessage || 'Extraction failed.'}</div>
          )}
          {status === 'complete' && extractedPayload?.summary && (
            <div className="summary-box">
              <p className="summary-label">Summary</p>
              <p className="summary-text">{extractedPayload.summary}</p>
            </div>
          )}
          
          <div className="chat-messages" aria-live="polite">
            {chatMessages.length === 0 && !isProcessing && (
              <p className="chat-empty">
                {jobId
                  ? 'Extraction complete. Ask a follow-up question or review the form.'
                  : 'Upload a document or say hello to begin.'}
              </p>
            )}
            {chatMessages.map((msg: any, i: number) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <span className="bubble-role">{msg.role === 'user' ? 'You' : 'Copilot'}</span>
                {msg.role === 'assistant' && (msg.intent === 'log' || msg.intent === 'edit') && (
                  <span className="intent-badge">Form updated</span>
                )}
                <p className="bubble-content">{msg.content}</p>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-bubble assistant">
                <span className="bubble-role">Copilot</span>
                <p className="bubble-content typing">Thinking...</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-disclaimer">
            AI responses may contain errors. Always verify critical information before submitting.
          </div>

          {uploadError && <p className="panel-error input-error" role="alert">{uploadError}</p>}

          <div className="chat-input-container">
            {selectedFile && (
              <div className="attachment-chip">
                <span className="attachment-filename">{selectedFile.name}</span>
                <button type="button" className="attachment-remove" onClick={removeFile} aria-label="Remove attachment">[X]</button>
              </div>
            )}
            <div className="chat-input-row">
              <button 
                type="button" 
                className="btn-paperclip" 
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                +
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.eml"
                className="hidden-file-input"
                onChange={handleFileChange}
                aria-hidden="true"
              />
              <input
                id="chat-input"
                type="text"
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Message Copilot..."
                disabled={isChatLoading}
                aria-label="Chat message input"
              />
              <button
                id="btn-send-chat"
                type="button"
                className="chat-send"
                onClick={handleChat}
                disabled={(!chatInput.trim() && !selectedFile) || isChatLoading}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiIntakePanel;
