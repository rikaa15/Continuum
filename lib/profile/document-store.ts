"use client";

const DATABASE_NAME = "continuum-documents";
const STORE_NAME = "files";
const DATABASE_VERSION = 1;

type StoredDocument = {
  id: string;
  userId: string;
  blob: Blob;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local document storage is unavailable"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open document storage"));
  });
}

function completeTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Document storage failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Document storage was cancelled"));
  });
}

export async function saveDocumentFile(
  userId: string,
  documentId: string,
  file: File,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      id: documentId,
      userId,
      blob: file,
    } satisfies StoredDocument);
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function getDocumentFile(
  userId: string,
  documentId: string,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction
      .objectStore(STORE_NAME)
      .get(documentId) as IDBRequest<StoredDocument | undefined>;
    const record = await new Promise<StoredDocument | undefined>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Could not read document"));
      },
    );
    if (!record || record.userId !== userId) return null;
    return record.blob;
  } finally {
    database.close();
  }
}

export async function deleteDocumentFile(
  userId: string,
  documentId: string,
) {
  const existing = await getDocumentFile(userId, documentId);
  if (!existing) return;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(documentId);
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}
