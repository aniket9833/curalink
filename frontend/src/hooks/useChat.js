import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatAPI } from '../services/api';

const SESSION_KEY = 'curalink_session_id';

export function useChat() {
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  });

  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('');
  const [error, setError] = useState(null);
  const [huggingFaceStatus, setHuggingFaceStatus] = useState(null);
  const [medicalContext, setMedicalContext] = useState({});
  const [lastQueryInfo, setLastQueryInfo] = useState(null);

  const pipelineSteps = [
    '🧠 Parsing intent…',
    '🔍 Expanding query…',
    '📡 Fetching PubMed publications…',
    '🌐 Searching OpenAlex database…',
    '🧪 Retrieving clinical trials…',
    '⚖️ Ranking & filtering results…',
    '🤖 Generating AI analysis…',
    '📋 Formatting response…',
  ];
  const stepTimers = useRef([]);

  // Check Hugging Face health on mount
  useEffect(() => {
    chatAPI
      .getHealth()
      .then((r) => setHuggingFaceStatus(r.data.huggingface))
      .catch((err) =>
        setHuggingFaceStatus({
          available: false,
          error:
            err.response?.data?.error ||
            err.message ||
            'Unable to reach backend health check',
        }),
      );
  }, []);

  // Load chat history
  useEffect(() => {
    chatAPI
      .getHistory(sessionId)
      .then((r) => setChats(r.data.chats || []))
      .catch(() => {});
  }, [sessionId]);

  // Load a specific chat
  const loadChat = useCallback(async (chatId) => {
    try {
      const r = await chatAPI.getChat(chatId);
      const chat = r.data.chat;
      setCurrentChatId(chatId);
      setMessages(
        chat.messages.map((m) => ({
          id: uuidv4(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          sources: m.sources || [],
          queryExpanded: m.queryExpanded,
          followUpQuestions: m.followUpQuestions || [],
          retrievalStats: m.retrievalStats,
        })),
      );
      setMedicalContext(chat.medicalContext || {});
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Failed to load chat');
    }
  }, []);

  // Start new chat
  const newChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
    setLastQueryInfo(null);
  }, []);

  // Delete a chat
  const deleteChat = useCallback(
    async (chatId) => {
      await chatAPI.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (currentChatId === chatId) newChat();
    },
    [currentChatId, newChat],
  );

  // Send message
  const sendMessage = useCallback(
    async (userInput, contextOverride = null) => {
      if (!userInput.trim() || isLoading) return;
      setError(null);

      const userMsg = {
        id: uuidv4(),
        role: 'user',
        content: userInput,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Simulate pipeline steps
      let stepIdx = 0;
      const runNextStep = () => {
        if (stepIdx < pipelineSteps.length) {
          setPipelineStep(pipelineSteps[stepIdx]);
          stepIdx++;
          const t = setTimeout(runNextStep, 900 + Math.random() * 600);
          stepTimers.current.push(t);
        }
      };
      runNextStep();

      try {
        const ctx = contextOverride || medicalContext;
        const payload = {
          sessionId,
          message: userInput,
          chatId: currentChatId,
          medicalContext: ctx,
        };

        const r = await chatAPI.sendMessage(payload);
        const data = r.data;

        // Clear pipeline steps
        stepTimers.current.forEach(clearTimeout);
        stepTimers.current = [];
        setPipelineStep('');

        const aiMsg = {
          id: uuidv4(),
          role: 'assistant',
          content: data.response.content,
          timestamp: new Date().toISOString(),
          sources: data.response.sources || [],
          queryExpanded: data.response.queryExpanded,
          followUpQuestions: data.response.followUpQuestions || [],
          retrievalStats: data.response.retrievalStats,
          model: data.response.model,
          aiAvailable: data.response.aiAvailable,
          parsedQuery: data.response.parsedQuery,
          userQuery: userInput,
        };

        setMessages((prev) => [...prev, aiMsg]);
        setCurrentChatId(data.chatId);
        setLastQueryInfo(data.response.parsedQuery);

        // Update context from parsed query
        if (data.response.parsedQuery?.disease && !medicalContext.disease) {
          setMedicalContext((prev) => ({
            ...prev,
            disease: data.response.parsedQuery.disease,
          }));
        }

        // Refresh chat list
        chatAPI
          .getHistory(sessionId)
          .then((r2) => setChats(r2.data.chats || []))
          .catch(() => {});
      } catch (err) {
        stepTimers.current.forEach(clearTimeout);
        stepTimers.current = [];
        setPipelineStep('');
        const errMsg =
          err.response?.data?.message || err.message || 'Something went wrong';
        setError(errMsg);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, currentChatId, medicalContext],
  );

  return {
    sessionId,
    chats,
    currentChatId,
    messages,
    isLoading,
    pipelineStep,
    error,
    huggingFaceStatus,
    medicalContext,
    setMedicalContext,
    lastQueryInfo,
    sendMessage,
    loadChat,
    newChat,
    deleteChat,
  };
}
