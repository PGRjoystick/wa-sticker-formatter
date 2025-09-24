import { Sticker, WHATSAPP_LIMITS } from '../src'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * Standalone script to test video optimization
 * Usage: npm run examples -- whatsapp-video-test
 */
;(async () => {
    const testVideoPath = join(__dirname, '..', 'test_video.mp4')
    
    if (!existsSync(testVideoPath)) {
        console.log('❌ test_video.mp4 not found in project root')
        process.exit(1)
    }

    console.log('\n=== WhatsApp Video Sticker Optimization Test ===')
    console.log(`📁 Testing video: ${testVideoPath}`)
    console.log(`📏 WhatsApp animated sticker limit: ${WHATSAPP_LIMITS.ANIMATED_MAX_SIZE / 1024}KB`)
    console.log('')

    try {
        const sticker = new Sticker(testVideoPath, {
            pack: 'Video Test Pack',
            author: 'Test User',
            categories: ['🎬', '🎥'] as any,
            quality: 40, // Let the adaptive system optimize from here
            type: 'crop'
        })

        console.log('🔄 Converting video with adaptive optimization...')
        const startTime = Date.now()
        
        const buffer = await sticker.build()
        
        const endTime = Date.now()
        const processingTime = ((endTime - startTime) / 1000).toFixed(1)
        
        const sizeBytes = buffer.length
        const sizeKB = (sizeBytes / 1024).toFixed(1)
        const sizeRatio = ((sizeBytes / WHATSAPP_LIMITS.ANIMATED_MAX_SIZE) * 100).toFixed(1)
        
        console.log(`\n📊 Results:`)
        console.log(`   File size: ${sizeKB}KB`)
        console.log(`   Size ratio: ${sizeRatio}% of WhatsApp limit`)
        console.log(`   Processing time: ${processingTime}s`)
        
        // Validate WhatsApp compliance
        const validation = await sticker.validateWhatsAppCompliance()
        
        console.log(`\n✅ Compliance Check:`)
        console.log(`   Overall valid: ${validation.isValid ? '✅' : '❌'}`)
        console.log(`   Dimensions: ${validation.dimensions.width}x${validation.dimensions.height}px ${validation.dimensions.isValid ? '✅' : '❌'}`)
        console.log(`   File size: ${validation.fileSize.isValid ? '✅' : '❌'} (${(validation.fileSize.size / 1024).toFixed(1)}KB/${(validation.fileSize.limit / 1024).toFixed(1)}KB)`)
        console.log(`   Type: ${validation.fileSize.type}`)
        
        if (validation.errors.length > 0) {
            console.log(`\n❌ Errors:`)
            validation.errors.forEach(error => console.log(`   • ${error}`))
        }
        
        if (validation.warnings.length > 0) {
            console.log(`\n⚠️  Warnings:`)
            validation.warnings.forEach(warning => console.log(`   • ${warning}`))
        }

        // Save the optimized sticker
        const outputFile = await sticker.toFile('./optimized_test_video.webp')
        console.log(`\n💾 Saved optimized sticker: ${outputFile}`)

        if (validation.isValid) {
            console.log('\n🎉 SUCCESS: Video converted to WhatsApp-compliant animated sticker!')
        } else {
            console.log('\n⚠️  Video converted but may have compliance issues (see above)')
        }

    } catch (error) {
        console.error('\n❌ Error during video conversion:', error)
        
        if (error instanceof Error && error.message.includes('spawn')) {
            console.log('\n💡 Tip: Make sure ffmpeg is installed and available in your PATH')
            console.log('   - On Ubuntu/Debian: sudo apt install ffmpeg')
            console.log('   - On macOS: brew install ffmpeg')
            console.log('   - On Windows: Download from https://ffmpeg.org/download.html')
        }
    }
})().catch(console.error)
