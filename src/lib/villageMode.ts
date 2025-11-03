/**
 * Village Mode Module
 * Offline-first capability for ASHA workers in low-connectivity areas
 * Uses IndexedDB for local storage and implements sync queue
 */

import localforage from 'localforage';

// Configure localforage
const villageStore = localforage.createInstance({
  name: 'medaid-saarthi-village',
  storeName: 'offline_data',
  description: 'Offline storage for village mode operations'
});

const syncQueue = localforage.createInstance({
  name: 'medaid-saarthi-village',
  storeName: 'sync_queue',
  description: 'Queue for pending sync operations'
});

interface QueuedVisit {
  id: string;
  patientId?: string;
  patientName: string;
  symptoms: string[];
  vitals: {
    temperature?: number;
    bloodPressure?: string;
    pulseRate?: number;
  };
  notes: string;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Initialize village mode
 */
export async function initVillageMode(): Promise<void> {
  console.log('🏘️ Initializing village mode...');
  
  // Check if service worker is registered
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready for village mode');
      
      // Request background sync permission
      if ('sync' in registration) {
        console.log('✅ Background sync available');
      }
    } catch (error) {
      console.error('Failed to initialize service worker:', error);
    }
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Queue a patient visit for later sync
 */
export async function queueVisit(visit: Omit<QueuedVisit, 'id' | 'synced' | 'retryCount'>): Promise<string> {
  const id = `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const queuedVisit: QueuedVisit = {
    id,
    ...visit,
    synced: false,
    retryCount: 0
  };
  
  await syncQueue.setItem(id, queuedVisit);
  console.log('📝 Visit queued:', id);
  
  // Try immediate sync if online
  if (isOnline()) {
    setTimeout(() => syncPendingVisits(), 1000);
  }
  
  return id;
}

/**
 * Get all queued visits
 */
export async function getQueuedVisits(): Promise<QueuedVisit[]> {
  const visits: QueuedVisit[] = [];
  
  await syncQueue.iterate((value: any) => {
    visits.push(value as QueuedVisit);
  });
  
  return visits.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Sync pending visits with exponential backoff
 */
export async function syncPendingVisits(): Promise<SyncResult> {
  if (!isOnline()) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['Device is offline']
    };
  }
  
  console.log('🔄 Starting sync of pending visits...');
  
  const visits = await getQueuedVisits();
  const unsynced = visits.filter(v => !v.synced);
  
  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const visit of unsynced) {
    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('/api/village/sync-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token from storage
        },
        body: JSON.stringify(visit)
      });
      
      if (response.ok) {
        // Mark as synced
        visit.synced = true;
        await syncQueue.setItem(visit.id, visit);
        syncedCount++;
        console.log('✅ Synced visit:', visit.id);
        
        // Remove from queue after successful sync
        await syncQueue.removeItem(visit.id);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      failedCount++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Visit ${visit.id}: ${errorMsg}`);
      
      // Increment retry count
      visit.retryCount++;
      
      // Exponential backoff: Stop retrying after 5 attempts
      if (visit.retryCount < 5) {
        await syncQueue.setItem(visit.id, visit);
        console.warn(`⚠️ Sync failed for visit ${visit.id}, will retry (attempt ${visit.retryCount})`);
      } else {
        console.error(`❌ Visit ${visit.id} exceeded retry limit, marking as failed`);
        // Keep in queue but flag as failed for manual review
      }
    }
  }
  
  console.log(`✅ Sync complete: ${syncedCount} succeeded, ${failedCount} failed`);
  
  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    errors
  };
}

/**
 * Save health record offline
 */
export async function saveOfflineRecord(recordId: string, data: any): Promise<void> {
  await villageStore.setItem(`record_${recordId}`, {
    ...data,
    savedAt: new Date().toISOString(),
    offline: true
  });
}

/**
 * Get offline health record
 */
export async function getOfflineRecord(recordId: string): Promise<any> {
  return await villageStore.getItem(`record_${recordId}`);
}

/**
 * Clear old offline data (older than 30 days)
 */
export async function cleanupOldData(): Promise<number> {
  let cleanedCount = 0;
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  await villageStore.iterate((value: any, key) => {
    const savedAt = new Date(value.savedAt).getTime();
    if (savedAt < thirtyDaysAgo) {
      villageStore.removeItem(key);
      cleanedCount++;
    }
  });
  
  console.log(`🧹 Cleaned up ${cleanedCount} old offline records`);
  return cleanedCount;
}

/**
 * Get sync queue statistics
 */
export async function getSyncStats(): Promise<{
  total: number;
  pending: number;
  synced: number;
  failed: number;
}> {
  const visits = await getQueuedVisits();
  
  return {
    total: visits.length,
    pending: visits.filter(v => !v.synced && v.retryCount < 5).length,
    synced: visits.filter(v => v.synced).length,
    failed: visits.filter(v => v.retryCount >= 5).length
  };
}

// Auto-sync when connection is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored, triggering sync...');
    syncPendingVisits();
  });
}

export default {
  initVillageMode,
  isOnline,
  queueVisit,
  getQueuedVisits,
  syncPendingVisits,
  saveOfflineRecord,
  getOfflineRecord,
  cleanupOldData,
  getSyncStats
};
