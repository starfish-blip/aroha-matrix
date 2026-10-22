// sync.js - Remote Manifest & State Synchronization
export async function syncWorkstationState(manifestData) {
    try {
        const response = await fetch('/api/sync-remote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(manifestData)
        });
        const result = await response.json();
        console.log('Sync status:', result);
        return result;
    } catch (err) {
        console.warn('Sync failed (offline or local fallback):', err);
    }
}
