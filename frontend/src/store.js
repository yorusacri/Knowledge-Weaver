import { create } from 'zustand';
import {
  generateMockGraphData,
  generateMockIntegrations,
  generateMockDialogHistory,
} from './utils/mockData';

export const useStore = create((set, get) => ({
  // ── Textbooks (real API) ──
  textbooks: [],
  selectedBookId: null,
  uploading: false,
  parsedData: null,
  parsedLoading: false,
  progressMap: {},          // { [textbookId]: number(0-100) }

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

  // ── Graph (demo until backend graph endpoint exists) ──
  graphData: generateMockGraphData(3),
  selectedNode: null,
  graphSearch: '',
  showLabels: true,

  setGraphData: (data) => set({ graphData: data }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setGraphSearch: (q) => set({ graphSearch: q }),
  setShowLabels: (v) => set({ showLabels: v }),

  // ── Integration (demo) ──
  integrations: generateMockIntegrations(),
  integrationRunning: false,
  integrationStats: {
    originalChars: 5820000,
    integratedChars: 1650000,
    compressionRatio: 28.4,
    mergeCount: 342,
    keepCount: 267,
    removeCount: 96,
    totalDecisions: 705,
    nodesBefore: 2847,
    nodesAfter: 1203,
    edgesBefore: 4562,
    edgesAfter: 2891,
  },

  setIntegrations: (data) => set({ integrations: data }),
  setIntegrationRunning: (v) => set({ integrationRunning: v }),
  setIntegrationStats: (stats) => set({ integrationStats: stats }),

  // ── RAG (real API) ──
  ragStatus: { indexed: false, textbookCount: 0, chunkCount: 0 },
  ragQuerying: false,
  ragResult: null,
  ragHistory: [],

  setRagStatus: (status) => set({ ragStatus: status }),
  setRagQuerying: (v) => set({ ragQuerying: v }),
  setRagResult: (result) => set({ ragResult: result }),
  addRagHistory: (entry) => set((s) => ({ ragHistory: [...s.ragHistory, entry] })),

  // ── Dialogue (demo) ──
  messages: generateMockDialogHistory(),
  messageSending: false,

  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessageSending: (v) => set({ messageSending: v }),

  // ── Report ──
  reportData: null,
}));
