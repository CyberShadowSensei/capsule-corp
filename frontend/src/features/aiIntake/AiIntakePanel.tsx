import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setJobId, setActiveTab, addChatMessage, setChatLoading } from './aiIntakeSlice';
import { useIntakeStream } from './useIntakeStream';
import { applyAiFields } from '../complaintForm/complaintFormSlice';
import ProgressBar from '../../components/ui/ProgressBar/ProgressBar';
import './AiIntakePanel.css';

const ALLOWED_EXTS = ['.pdf', '.txt', '.docx', '.eml'];

const AiIntakePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { jobId, status, progressPercent, extractedPayload, errorMessage, chatMessages, isChatLoading, activeTab } =
    useSelector((state: RootState) => state.aiIntake);
  const formFields = useSelector((state: RootState) => state.complaintForm.fields);

  const [pasteText, setPasteText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useIntakeStream(jobId);

  const startJob = async (formData: FormData | null, pasteBody: { text: string } | null) => {
    setUploadError(null);
    try {
      const url = formData ? '/api/v1/intake/upload' : '/api/v1/intake/paste';
      const init: RequestInit = formData
        ? { method: 'POST', body: formData }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteBody) };

      const res = await fetch(url, init);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }
      const data = await res.json();
      dispatch(setJobId(data.job_id));
      dispatch(setActiveTab('chat'));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(`File type not supported. Allowed: ${ALLOWED_EXTS.join(', ')}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    startJob(fd, null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    startJob(null, { text: pasteText });
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !jobId) return;
    const msg = chatInput.trim();
    setChatInput('');
    dispatch(addChatMessage({ role: 'user', content: msg }));
    dispatch(setChatLoading(true));
    try {
      const res = await fetch(`/api/v1/intake/${jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, current_fields: formFields }),
      });
      const data = await res.json();
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
  };

  const isProcessing = status === 'pending' || status === 'running';

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h2 className="ai-panel-title">AIVOA Copilot AI Assistant</h2>
        <p className="ai-panel-subtitle">
          Upload a document or paste complaint text. The assistant will extract and populate the form automatically.
        </p>
      </div>

      <div className="ai-panel-tabs" role="tablist">
        {(['upload', 'paste', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => dispatch(setActiveTab(tab))}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="ai-panel-body">
        {activeTab === 'upload' && (
          <div className="tab-panel" id="panel-upload" role="tabpanel" aria-labelledby="tab-upload">
            <div
              className={`dropzone${dragOver ? ' dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload complaint file"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.eml"
                className="hidden-file-input"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                aria-hidden="true"
              />
              <div className="dropzone-content">
                <p className="dropzone-primary">Drag and drop a complaint file</p>
                <p className="dropzone-secondary">or click to browse</p>
                <p className="dropzone-meta">Supported: PDF, TXT, DOCX, EML — max 10MB</p>
              </div>
            </div>
            {uploadError && <p className="panel-error" role="alert">{uploadError}</p>}
          </div>
        )}

        {activeTab === 'paste' && (
          <div className="tab-panel" id="panel-paste" role="tabpanel" aria-labelledby="tab-paste">
            <label htmlFor="paste-textarea" className="paste-label">Paste complaint text or email body</label>
            <textarea
              id="paste-textarea"
              className="paste-textarea"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the complaint text here..."
              rows={10}
            />
            <button
              id="btn-extract-paste"
              type="button"
              className="btn-extract"
              onClick={handlePaste}
              disabled={!pasteText.trim() || isProcessing}
            >
              Extract with AI
            </button>
            {uploadError && <p className="panel-error" role="alert">{uploadError}</p>}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="tab-panel chat-panel" id="panel-chat" role="tabpanel" aria-labelledby="tab-chat">
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
                    : 'Upload or paste a complaint document to begin.'}
                </p>
              )}
              {chatMessages.map((msg, i) => (
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

            <div className="chat-input-row">
              <input
                id="chat-input"
                type="text"
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                placeholder={jobId ? 'Ask a follow-up question...' : 'Upload a document first'}
                disabled={!jobId || isChatLoading}
                aria-label="Chat message input"
              />
              <button
                id="btn-send-chat"
                type="button"
                className="chat-send"
                onClick={handleChat}
                disabled={!jobId || !chatInput.trim() || isChatLoading}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiIntakePanel;
