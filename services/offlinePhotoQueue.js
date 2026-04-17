/**
 * Offline Photo Queue Service
 * Phase 1: IndexedDB-based ephemeral storage for verification photos
 * Phase 2: Swappable with Capacitor native private storage
 * 
 * Key design principles:
 * - No device filesystem persistence (browser-private storage only)
 * - Automatic retry on online event, app load, app resume
 * - Auto-delete after successful upload or 24h expiration
 * - GPS + timestamp + project/location/user metadata capture
 * - Clean abstraction for Phase 2 swap
 */

const DB_NAME = "speccom_photo_queue";
const DB_VERSION = 1;
const STORE_PENDING = "pending_photos";
const STORE_METADATA = "upload_metadata";

// 24 hour expiration
const EXPIRATION_MS = 24 * 60 * 60 * 1000;
const SYNC_CHECK_INTERVAL_MS = 5000;

class OfflinePhotoQueue {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.syncInProgress = false;
    this.pendingCount = 0;
    this.syncCheckId = null;
    this.listeners = new Set();
    
    // Track upload state
    this.uploadingIds = new Set();
    this.failedIds = new Set();
    this.successIds = new Set();
  }

  /**
   * Initialize IndexedDB database
   */
  async init() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] IndexedDB open failed:", req.error);
        reject(req.error);
      };

      req.onsuccess = () => {
        this.db = req.result;
        this.isInitialized = true;
        console.log("[OfflinePhotoQueue] IndexedDB initialized");
        resolve(this.db);
      };

      req.onupgradeneeded = (evt) => {
        const db = evt.target.result;
        
        // Pending photos store
        if (!db.objectStoreNames.contains(STORE_PENDING)) {
          const store = db.createObjectStore(STORE_PENDING, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("siteId", "siteId", { unique: false });
          store.createIndex("projectId", "projectId", { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Request persistent storage permission
   */
  async requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      console.log("[OfflinePhotoQueue] Persistent storage API not available");
      return false;
    }

    try {
      const isPersistent = await navigator.storage.persist();
      console.log(
        "[OfflinePhotoQueue] Persistent storage permission:",
        isPersistent
      );
      return isPersistent;
    } catch (err) {
      console.warn("[OfflinePhotoQueue] Persistent storage request failed:", err);
      return false;
    }
  }

  /**
   * Enqueue a photo for upload
   * Called when offline or immediately tried when online
   */
  async enqueuePhoto({
    id,
    blob,
    gpsLat,
    gpsLng,
    gpsAccuracy,
    capturedAt,
    projectId,
    siteId,
    userId,
    metadata = {},
  }) {
    if (!this.db) {
      await this.init();
    }

    const photoRecord = {
      id: id || `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      blob,
      gpsLat,
      gpsLng,
      gpsAccuracy,
      capturedAt: capturedAt || new Date().toISOString(),
      projectId,
      siteId,
      userId,
      metadata,
      status: "pending", // pending | uploading | success | failed
      createdAt: Date.now(),
      lastAttemptAt: null,
      attemptCount: 0,
      uploadedAt: null,
      error: null,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readwrite");
      const store = tx.objectStore(STORE_PENDING);
      const req = store.put(photoRecord);

      req.onsuccess = () => {
        console.log(`[OfflinePhotoQueue] Photo enqueued: ${photoRecord.id}`);
        this.updatePendingCount();
        this.notifyListeners();
        resolve(photoRecord.id);
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] Enqueue failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Get all pending photos
   */
  async getPending() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readonly");
      const store = tx.objectStore(STORE_PENDING);
      const index = store.index("status");
      const req = index.getAll("pending");

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] getPending failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Get photo by ID (with blob)
   */
  async getPhotoById(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readonly");
      const store = tx.objectStore(STORE_PENDING);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] getPhotoById failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Update photo status
   */
  async updatePhotoStatus(id, status, { error = null, uploadedAt = null } = {}) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readwrite");
      const store = tx.objectStore(STORE_PENDING);
      const req = store.get(id);

      req.onsuccess = () => {
        const photo = req.result;
        if (!photo) {
          reject(new Error(`Photo ${id} not found`));
          return;
        }

        photo.status = status;
        photo.lastAttemptAt = Date.now();
        photo.attemptCount = (photo.attemptCount || 0) + 1;
        if (error) photo.error = error;
        if (uploadedAt) photo.uploadedAt = uploadedAt;

        const updateReq = store.put(photo);
        updateReq.onsuccess = () => {
          console.log(`[OfflinePhotoQueue] Photo status updated: ${id} -> ${status}`);
          this.updatePendingCount();
          this.notifyListeners();
          resolve(photo);
        };
        updateReq.onerror = () => {
          reject(updateReq.error);
        };
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] updatePhotoStatus failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Delete photo record (after successful upload)
   */
  async deletePhoto(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readwrite");
      const store = tx.objectStore(STORE_PENDING);
      const req = store.delete(id);

      req.onsuccess = () => {
        console.log(`[OfflinePhotoQueue] Photo deleted: ${id}`);
        this.updatePendingCount();
        this.notifyListeners();
        resolve();
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] deletePhoto failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Clean up expired photos
   */
  async cleanupExpired() {
    if (!this.db) {
      await this.init();
    }

    const now = Date.now();
    const cutoff = now - EXPIRATION_MS;
    const expired = [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readwrite");
      const store = tx.objectStore(STORE_PENDING);
      const index = store.index("createdAt");
      const req = index.getAll(IDBKeyRange.upperBound(cutoff));

      req.onsuccess = () => {
        const toDelete = req.result || [];
        if (toDelete.length === 0) {
          resolve([]);
          return;
        }

        toDelete.forEach((photo) => {
          expired.push(photo.id);
          store.delete(photo.id);
        });

        console.log(`[OfflinePhotoQueue] Cleaned up ${expired.length} expired photos`);
        this.updatePendingCount();
        this.notifyListeners();
        resolve(expired);
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] cleanupExpired failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Clear all pending photos (manual clear)
   */
  async clearAll() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PENDING], "readwrite");
      const store = tx.objectStore(STORE_PENDING);
      const req = store.clear();

      req.onsuccess = () => {
        console.log("[OfflinePhotoQueue] All photos cleared");
        this.updatePendingCount();
        this.notifyListeners();
        resolve();
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] clearAll failed:", req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Update pending count from database
   */
  async updatePendingCount() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction([STORE_PENDING], "readonly");
      const store = tx.objectStore(STORE_PENDING);
      const index = store.index("status");
      const req = index.count("pending");

      req.onsuccess = () => {
        this.pendingCount = req.result || 0;
        resolve(this.pendingCount);
      };

      req.onerror = () => {
        console.error("[OfflinePhotoQueue] updatePendingCount failed:", req.error);
        this.pendingCount = 0;
        resolve(0);
      };
    });
  }

  /**
   * Register listener for queue changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb({
          pendingCount: this.pendingCount,
          uploadingIds: Array.from(this.uploadingIds),
          failedIds: Array.from(this.failedIds),
        });
      } catch (err) {
        console.error("[OfflinePhotoQueue] Listener error:", err);
      }
    });
  }

  /**
   * Start periodic sync checks
   */
  startSyncChecks(uploadFn, onlineCheckFn = () => navigator.onLine) {
    if (this.syncCheckId) {
      return; // Already running
    }

    const check = async () => {
      if (!onlineCheckFn()) {
        return; // Still offline
      }

      try {
        await this.syncAll(uploadFn);
      } catch (err) {
        console.error("[OfflinePhotoQueue] Sync check failed:", err);
      }
    };

    this.syncCheckId = setInterval(check, SYNC_CHECK_INTERVAL_MS);
    console.log("[OfflinePhotoQueue] Sync checks started");
  }

  /**
   * Stop periodic sync checks
   */
  stopSyncChecks() {
    if (this.syncCheckId) {
      clearInterval(this.syncCheckId);
      this.syncCheckId = null;
      console.log("[OfflinePhotoQueue] Sync checks stopped");
    }
  }

  /**
   * Sync all pending photos to server
   */
  async syncAll(uploadFn) {
    if (this.syncInProgress) {
      console.log("[OfflinePhotoQueue] Sync already in progress");
      return [];
    }

    this.syncInProgress = true;
    const results = [];

    try {
      const pending = await this.getPending();
      console.log(`[OfflinePhotoQueue] Starting sync of ${pending.length} photos`);

      for (const photo of pending) {
        try {
          this.uploadingIds.add(photo.id);
          this.notifyListeners();

          // Call the provided upload function
          const result = await uploadFn(photo);

          if (result.success) {
            await this.updatePhotoStatus(photo.id, "success", {
              uploadedAt: new Date().toISOString(),
            });
            await this.deletePhoto(photo.id);
            this.uploadingIds.delete(photo.id);
            this.successIds.add(photo.id);
            results.push({ id: photo.id, success: true });
            console.log(`[OfflinePhotoQueue] Upload successful: ${photo.id}`);
          } else {
            await this.updatePhotoStatus(photo.id, "failed", {
              error: result.error || "Unknown error",
            });
            this.uploadingIds.delete(photo.id);
            this.failedIds.add(photo.id);
            results.push({ id: photo.id, success: false, error: result.error });
            console.log(`[OfflinePhotoQueue] Upload failed: ${photo.id}`);
          }
        } catch (err) {
          console.error(`[OfflinePhotoQueue] Upload error for ${photo.id}:`, err);
          await this.updatePhotoStatus(photo.id, "failed", {
            error: err.message,
          });
          this.uploadingIds.delete(photo.id);
          this.failedIds.add(photo.id);
          results.push({
            id: photo.id,
            success: false,
            error: err.message,
          });
        }
      }

      this.notifyListeners();
      return results;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Retry failed photos
   */
  async retryFailed(uploadFn) {
    const failed = Array.from(this.failedIds);
    console.log(`[OfflinePhotoQueue] Retrying ${failed.length} failed photos`);

    for (const photoId of failed) {
      try {
        const photo = await this.getPhotoById(photoId);
        if (!photo) continue;

        await this.updatePhotoStatus(photoId, "pending");
        this.failedIds.delete(photoId);
      } catch (err) {
        console.error(`[OfflinePhotoQueue] Retry prep failed for ${photoId}:`, err);
      }
    }

    if (navigator.onLine) {
      return this.syncAll(uploadFn);
    }
    return [];
  }

  /**
   * Get storage stats
   */
  async getStats() {
    if (!this.db) {
      await this.init();
    }

    const pending = await this.getPending();
    let totalSize = 0;

    pending.forEach((photo) => {
      if (photo.blob) {
        totalSize += photo.blob.size;
      }
    });

    return {
      count: pending.length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      pending: pending.length,
      uploading: this.uploadingIds.size,
      failed: this.failedIds.size,
    };
  }
}

// Create singleton instance
const offlinePhotoQueue = new OfflinePhotoQueue();

export { offlinePhotoQueue, OfflinePhotoQueue };
