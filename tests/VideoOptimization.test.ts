// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path='../src/internal/node-webpmux.d.ts' />
import { strict as assert } from 'assert'
import Sticker, { WHATSAPP_LIMITS } from '../src'
import { existsSync } from 'fs'
import { join } from 'path'

const testVideoPath = join(__dirname, '..', 'test_video.mp4')

describe('Video File Size Optimization', () => {
    before(function() {
        if (!existsSync(testVideoPath)) {
            this.skip()
        }
    })

    it('should convert test video to compliant animated sticker', async function() {
        this.timeout(60000) // 60 seconds for video processing

        try {
            console.log('\n=== Testing Video Conversion Optimization ===')
            
            // Create sticker with optimized settings
            const sticker = new Sticker(testVideoPath, {
                pack: 'Test Pack',
                author: 'Test Author',
                quality: 40, // Start with medium-low quality for size optimization
                type: 'crop'
            })

            console.log('Converting video with adaptive optimization...')
            const buffer = await sticker.build()
            const sizeBytes = buffer.length
            const sizeKB = (sizeBytes / 1024).toFixed(1)
            
            console.log(`Final sticker size: ${sizeKB}KB`)
            console.log(`WhatsApp limit: ${WHATSAPP_LIMITS.ANIMATED_MAX_SIZE / 1024}KB`)
            console.log(`Size ratio: ${((sizeBytes / WHATSAPP_LIMITS.ANIMATED_MAX_SIZE) * 100).toFixed(1)}%`)

            // Validate compliance
            const validation = await sticker.validateWhatsAppCompliance()
            console.log(`Is compliant: ${validation.isValid}`)
            
            if (!validation.isValid) {
                console.log('Validation errors:')
                validation.errors.forEach(error => console.log(`  • ${error}`))
            }
            
            if (validation.warnings.length > 0) {
                console.log('Validation warnings:')
                validation.warnings.forEach(warning => console.log(`  • ${warning}`))
            }

            // Test assertions
            assert.strictEqual(validation.dimensions.width, 512, 'Width should be 512px')
            assert.strictEqual(validation.dimensions.height, 512, 'Height should be 512px')
            assert.strictEqual(validation.fileSize.type, 'animated', 'Should be detected as animated')
            
            // The main requirement: file size should be under WhatsApp limit
            assert.ok(
                sizeBytes <= WHATSAPP_LIMITS.ANIMATED_MAX_SIZE,
                `File size ${sizeKB}KB should be under WhatsApp limit of ${WHATSAPP_LIMITS.ANIMATED_MAX_SIZE / 1024}KB`
            )

            // Additional checks for good practices
            assert.ok(sizeBytes > 1024, 'File should not be too small (indicates processing worked)')
            
            console.log('✅ Video conversion test passed!')

        } catch (error) {
            if (error instanceof Error && (error.message.includes('spawn') || error.message.includes('ffmpeg'))) {
                console.log('⏭️  Skipping test - ffmpeg not available')
                this.skip()
            }
            throw error
        }
    })
})
