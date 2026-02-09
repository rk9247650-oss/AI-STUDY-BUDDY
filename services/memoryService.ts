
import { HistoryItem, HistoryType } from "../types";

const HISTORY_KEY = 'study_buddy_universal_history';
const PROFILE_KEY = 'study_buddy_user_profile';

export const memoryService = {
  // --- USER PROFILE ---
  getUserName: (): string => {
    try {
        const profile = localStorage.getItem(PROFILE_KEY);
        if (profile) return JSON.parse(profile).name;
        // Default to "Dev" as per user request if not set
        return "Dev";
    } catch {
        return "Dev";
    }
  },

  setUserName: (name: string) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name }));
  },

  // Save an item to history
  saveItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    try {
      const history = memoryService.getAll();
      const newItem: HistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      // Prepend new item
      const updated = [newItem, ...history];
      // Limit to 100 items to prevent storage overflow
      if (updated.length > 100) updated.pop();
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return newItem;
    } catch (e) {
      console.error("Memory Save Error", e);
      return null;
    }
  },

  // Get all history items
  getAll: (): HistoryItem[] => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  // Get items by specific type
  getByType: (type: HistoryType): HistoryItem[] => {
    return memoryService.getAll().filter(item => item.type === type);
  },

  // Delete an item
  deleteItem: (id: string) => {
    const history = memoryService.getAll();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  },

  // --- LONG TERM MEMORY CORE ---
  // Generates a context string for the AI Tutor based on user's recent activity
  getUserContext: (): string => {
    const name = memoryService.getUserName();
    const history = memoryService.getAll();
    
    let contextString = `### USER PROFILE:\n- Name: ${name}\n- Board: Bihar Board (BSEB)\n\n`;

    if (history.length > 0) {
        // Take the last 10 interactions to form a "Short-term Context Window"
        const recentActivity = history.slice(0, 10);
        
        contextString += "### USER'S RECENT STUDY HISTORY (LONG TERM MEMORY):\n";
        
        recentActivity.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString();
        let activityDesc = "";
        
        switch(item.type) {
            case 'note': activityDesc = `Created study notes on "${item.title}"`; break;
            case 'mnemonic': activityDesc = `Generated a mnemonic (jugad) for "${item.title}"`; break;
            case 'formula': activityDesc = `Created a formula sheet for "${item.title}"`; break;
            case 'deepdive': activityDesc = `Did a deep dive explanation on "${item.title}"`; break;
            case 'grade': activityDesc = `Got an answer graded for "${item.title}"`; break;
            case 'quiz': activityDesc = `Took a quiz on "${item.title}"`; break;
            case 'flashcard': activityDesc = `Generated flashcards for "${item.title}"`; break;
        }
        
        contextString += `- [${date}] ${activityDesc}\n`;
        });
        
        contextString += "Refer to this history to make conversation personal. If they ask about a previous topic, use this context.\n";
    }

    return contextString;
  }
};
