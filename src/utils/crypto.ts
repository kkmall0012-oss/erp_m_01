/**
 * 資料庫備份加密與解密工具
 * 採用標準 W3C Web Crypto API：PBKDF2 密鑰衍生 + AES-GCM 256 位元對稱加密
 * 確保備份檔案帶在隨身碟或上傳時具備最高等級商業保密性
 */

export interface EncryptedBackupPayload {
  version: string;
  isEncrypted: true;
  backupType: 'full' | 'module';
  moduleKey?: string;
  moduleLabel?: string;
  exportedAt: string;
  salt: string; // Base64
  iv: string;   // Base64
  ciphertext: string; // Base64
}

// 輔助函式：Uint8Array 轉 Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 輔助函式：Base64 轉 Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 衍生 AES-GCM 金鑰
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 檢查備份物件是否為加密檔案
 */
export function isEncryptedBackup(obj: any): obj is EncryptedBackupPayload {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.isEncrypted === true &&
    typeof obj.ciphertext === 'string' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string'
  );
}

/**
 * 對備份資料進行 AES-256-GCM 密碼加密
 */
export async function encryptBackupData(
  plainData: any,
  password: string,
  backupType: 'full' | 'module' = 'full',
  moduleKey?: string,
  moduleLabel?: string
): Promise<EncryptedBackupPayload> {
  if (!password || password.trim().length === 0) {
    throw new Error('密碼不能為空');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(plainData);
  const encodedData = encoder.encode(jsonString);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any
    },
    key,
    encodedData
  );

  return {
    version: '2.0.0',
    isEncrypted: true,
    backupType,
    moduleKey,
    moduleLabel,
    exportedAt: new Date().toISOString(),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(cipherBuffer)
  };
}

/**
 * 對加密的備份檔案進行解密
 */
export async function decryptBackupData(
  encryptedPayload: EncryptedBackupPayload,
  password: string
): Promise<any> {
  if (!password || password.trim().length === 0) {
    throw new Error('請輸入解密密碼');
  }

  try {
    const salt = base64ToUint8Array(encryptedPayload.salt);
    const iv = base64ToUint8Array(encryptedPayload.iv);
    const ciphertext = base64ToUint8Array(encryptedPayload.ciphertext);

    const key = await deriveKey(password, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any
      },
      key,
      ciphertext as any
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error('解密失敗！密碼錯誤或檔案已損毀。');
  }
}
