// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path='../src/internal/node-webpmux.d.ts' />

// Command line argument handling
const command = process.argv[2]

if (command === 'whatsapp-video-test') {
    import('./whatsapp-video-test')
} else {
    // Run all examples by default
    (async () => {
        await import('./default')
        await import('./crop')
        await import('./full')
        await import('./circle')
        await import('./rounded')
        await import('./whatsapp-compliance')
    })().catch(console.error)
}
