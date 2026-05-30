export const IPC = {
  // Accounts
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_ADD_PHONE: 'accounts:add-phone',
  ACCOUNTS_SEND_CODE: 'accounts:send-code',
  ACCOUNTS_VERIFY_CODE: 'accounts:verify-code',
  ACCOUNTS_VERIFY_PASSWORD: 'accounts:verify-password',
  ACCOUNTS_REMOVE: 'accounts:remove',
  ACCOUNTS_RECONNECT: 'accounts:reconnect',

  // Entities (channels + chats)
  ENTITIES_LIST: 'entities:list',
  ENTITIES_SYNC: 'entities:sync',
  ENTITIES_SUBSCRIBE: 'entities:subscribe',
  ENTITIES_UNSUBSCRIBE: 'entities:unsubscribe',
  ENTITIES_BULK_UNSUBSCRIBE: 'entities:bulk-unsubscribe',
  ENTITIES_BULK_SUBSCRIBE: 'entities:bulk-subscribe',

  // Transfer
  TRANSFER_START: 'transfer:start',
  TRANSFER_STATUS: 'transfer:status',
  TRANSFER_LIST: 'transfer:list',

  // Analytics
  ANALYTICS_ENTITY: 'analytics:entity',
  ANALYTICS_ACCOUNT_SUMMARY: 'analytics:account-summary',

  // Events (renderer ← main)
  EVENT_SYNC_PROGRESS: 'event:sync-progress',
  EVENT_AUTH_STEP: 'event:auth-step',
  EVENT_BULK_PROGRESS: 'event:bulk-progress',
  EVENT_TRANSFER_PROGRESS: 'event:transfer-progress',
  EVENT_ACCOUNT_STATUS: 'event:account-status'
} as const
