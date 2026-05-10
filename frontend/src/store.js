import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // ── Textbooks (real API) ──
  textbooks: [],
  selectedBookId: null,
  uploading: false,
  parsedData: null,
  parsedLoading: false,
  progressMap: {},

  setTextbooks: (textbooks) => set({ textbooks }),
  setSelectedBook: (id) => set({ selectedBookId: id }),
  setUploading: (v) => set({ uploading: v }),
  setParsedData: (data) => set({ parsedData: data }),
  setParsedLoading: (v) => set({ parsedLoading: v }),
  setProgress: (id, value) => set((s) => ({ progressMap: { ...s.progressMap, [id]: value } })),
  clearProgress: (id) => set((s) => {
    const next = { ...s.progressMap };
    delete next[id];
    return { progressMap: next };
  }),

  // ── Graph ──
  graphData: null,
  selectedNode: null,
  graphSearch: '',
  showLabels: true,

  setGraphData: (data) => set({ graphData: data }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setGraphSearch: (q) => set({ graphSearch: q }),
  setShowLabels: (v) => set({ showLabels: v }),

  // ── Integration ──
  integrations: [],
  integrationRunning: false,
  integrationStats: null,

  setIntegrations: (data) => set({ integrations: data }),
  setIntegrationRunning: (v) => set({ integrationRunning: v }),
  setIntegrationStats: (stats) => set({ integrationStats: stats }),

  // ── RAG ──
  ragStatus: null,
  ragQuerying: false,
  ragResult: null,
  ragHistory: [],

  setRagStatus: (status) => set({ ragStatus: status }),
  setRagQuerying: (v) => set({ ragQuerying: v }),
  setRagResult: (result) => set({ ragResult: result }),
  addRagHistory: (entry) => set((s) => ({ ragHistory: [...s.ragHistory, entry] })),

  // ── Dialogue ──
  messages: [],
  messageSending: false,

  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessageSending: (v) => set({ messageSending: v }),

  // ── Report ──
  reportData: null,
}));
