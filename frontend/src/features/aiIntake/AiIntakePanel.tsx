import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setJobId, addChatMessage, setChatLoading, setExtractingDocument } from './aiIntakeSlice';
import { useIntakeStream } from './useIntakeStream';
import { applyAiFields } from '../complaintForm/complaintFormSlice';
import ProgressBar from '../../components/ui/ProgressBar/ProgressBar';
import './AiIntakePanel.css';

const ALLOWED_EXTS = ['.pdf', '.txt', '.docx', '.eml'];

const AiIntakePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { jobId, title, status, progressPercent, extractedPayload, errorMessage, chatMessages, isChatLoading, isExtractingDocument } =
    useSelector((state: RootState) => state.aiIntake);
  const formFields = useSelector((state: RootState) => state.complaintForm.fields);

  const [chatInput, setChatInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useIntakeStream(jobId);

  useEffect(() => {
    if (status === 'error' && errorMessage) {
      // Prevent duplicate error messages in chat
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (!lastMsg || lastMsg.content !== `Pipeline Error: ${errorMessage}`) {
        dispatch(addChatMessage({ role: 'system', intent: 'error', content: `Pipeline Error: ${errorMessage}` }));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [status, errorMessage, dispatch, chatMessages]);

  const handleFileSelection = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) && !['.png', '.jpg', '.jpeg'].includes(ext)) {
      dispatch(addChatMessage({ role: 'system', intent: 'error', content: `File type not supported.` }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      dispatch(addChatMessage({ role: 'system', intent: 'error', content: 'File exceeds 10MB limit' }));
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
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

    const displayMsg = msg 
      ? (selectedFile ? `${msg}\n[Attached: ${selectedFile.name}]` : msg)
      : `[Uploaded document: ${selectedFile?.name}]`;
      
    setChatInput('');
    dispatch(addChatMessage({ role: 'user', content: displayMsg }));
    dispatch(setChatLoading(true));

    // Step 1: Upload file if present
    if (selectedFile) {
      dispatch(setExtractingDocument(true));
      try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        if (currentJobId) {
          fd.append('job_id', currentJobId);
        }
        if (msg) {
          fd.append('message', msg);
        }
        
        const res = await fetch('/api/v1/intake/upload', {
          method: 'POST',
          body: fd
        });
        
        if (!res.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await res.json();
        currentJobId = data.job_id;
        if (!jobId && currentJobId) {
          dispatch(setJobId(currentJobId));
        }
        removeFile();
        
        // Since the backend will handle generating the chat response after extraction, 
        // we can simply return and wait for the SSE stream or chat refresh.
        return;
      } catch (err: unknown) {
        dispatch(addChatMessage({ role: 'system', intent: 'error', content: "Upload failed. Please check your connection." }));
        dispatch(setChatLoading(false));
        dispatch(setExtractingDocument(false));
        return; 
      }
    }

    // Step 2: Send chat message if there is text
    if (msg) {
      try {
        const endpoint = currentJobId 
          ? `/api/v1/intake/${currentJobId}/chat` 
          : `/api/v1/intake/chat`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, current_fields: formFields }),
        });
        
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.detail || 'Chat request failed');
        }
        
        const data = await res.json();
        
        if (!jobId && data.job_id) {
          dispatch(setJobId(data.job_id));
        }

        if (data.fields && Object.keys(data.fields).length > 0) {
          dispatch(applyAiFields(data.fields));
        }
        const bubbleContent = data.response || "I have processed your request, but couldn't generate a proper response. Please check the form to see the updates.";
        dispatch(addChatMessage({ role: 'assistant', content: bubbleContent, intent: data.intent ?? 'qa' }));
        
        if (data.title) {
          dispatch({ type: 'aiIntake/updateJobState', payload: { title: data.title } });
        }
      } catch (err: any) {
        dispatch(addChatMessage({ role: 'system', intent: 'error', content: `Error: ${err.message || "I'm having trouble connecting to the server. Please check your connection."}` }));
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
        <h2 className={`ai-panel-title ${title ? 'typewriter-text' : ''}`}>{title || 'AIVOA Copilot AI Assistant'}</h2>
        <p className="ai-panel-subtitle">
          Upload a document or chat. The assistant will extract and populate the form automatically.
        </p>
      </div>

      <div className="ai-panel-body">
        <div className="chat-panel" id="panel-chat">
          {isProcessing && isExtractingDocument && (
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
                <span className="bubble-role">{msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Copilot'}</span>
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

          <div 
            className={`chat-input-container ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={isDragging ? { border: '2px dashed var(--color-primary)', background: 'var(--color-bg)' } : {}}
          >
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
                accept=".pdf,.txt,.docx,.eml,.png,.jpg,.jpeg"
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
