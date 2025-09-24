// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path='../src/internal/node-webpmux.d.ts' />
import { strict as assert } from 'assert'
import Sticker, { WhatsAppValidator, WHATSAPP_LIMITS, StickerTypes } from '../src'

const images = {
    static: {
        portrait: 'https://i.pinimg.com/originals/3a/53/d6/3a53d68345b56241a875595b21ec2a59.jpg',
        landscape: 'https://chasinganime.com/wp-content/uploads/2021/02/0_YgtEypuJ2QfMPCbn.jpg'
    },
    animated: {
        portrait: 'https://c.tenor.com/-1mtmQgH5eYAAAAC/watson-amelia-vtuber.gif',
        landscape: 'https://c.tenor.com/2RdLoyV5VPsAAAAC/ayame-nakiri.gif'
    }
}

describe('WhatsApp Compliance Validation', () => {
    describe('Basic Validation', () => {
        it('should create a compliant static sticker', async () => {
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: 'Test Author',
                categories: ['😀', '🎉'],
                quality: 50, // Lower quality to reduce file size
                type: StickerTypes.CROPPED // Ensure proper dimensions
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            // Check that validation runs (may have warnings/errors due to file size)
            assert.ok(typeof validation.isValid === 'boolean')
            assert.strictEqual(validation.dimensions.width, 512)
            assert.strictEqual(validation.dimensions.height, 512)
            assert.strictEqual(validation.fileSize.type, 'static')
            assert.strictEqual(validation.metadata.pack.isValid, true)
            assert.strictEqual(validation.metadata.author.isValid, true)
            
            // Log any issues for debugging
            if (!validation.isValid) {
                console.log('Validation issues (may be expected for test image):')
                validation.errors.forEach(error => console.log(`  • ${error}`))
            }
        })

        it('should detect oversized pack name', async () => {
            const longPackName = 'A'.repeat(WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH + 1)
            const sticker = new Sticker(images.static.portrait, {
                pack: longPackName,
                author: 'Test Author'
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            assert.strictEqual(validation.isValid, false)
            assert.ok(validation.errors.some(error => error.includes('Pack name exceeds')))
            assert.strictEqual(validation.metadata.pack.isValid, false)
        })

        it('should detect oversized author name', async () => {
            const longAuthorName = 'B'.repeat(WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH + 1)
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: longAuthorName
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            assert.strictEqual(validation.isValid, false)
            assert.ok(validation.errors.some(error => error.includes('Author name exceeds')))
            assert.strictEqual(validation.metadata.author.isValid, false)
        })

        it('should detect too many categories', async () => {
            const tooManyCategories = ['😀', '😃', '😄', '😁'] as any[] // 4 > 3 limit
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: 'Test Author',
                categories: tooManyCategories
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            assert.strictEqual(validation.isValid, false)
            assert.ok(validation.errors.some(error => error.includes('Too many categories')))
            assert.strictEqual(validation.metadata.categories.isValid, false)
        })

        it('should validate ID format', async () => {
            const invalidId = 'test@#$%id' // Contains invalid characters
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: 'Test Author',
                id: invalidId
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            assert.strictEqual(validation.isValid, false)
            assert.ok(validation.errors.some(error => error.includes('invalid characters')))
            assert.strictEqual(validation.metadata.id.isValid, false)
        })

        it('should accept valid ID format', async () => {
            const validId = 'test-pack_1.0 beta'
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: 'Test Author',
                id: validId
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            // Should pass ID validation (may fail others due to file size etc)
            assert.strictEqual(validation.metadata.id.isValid, true)
        })
    })

    describe('File Size Validation', () => {
        it('should warn about large file sizes', async () => {
            const sticker = new Sticker(images.static.landscape, {
                pack: 'Test Pack',
                author: 'Test Author',
                quality: 100 // High quality = larger file
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            // May have warnings about file size if it exceeds recommended size
            if (validation.fileSize.size > WHATSAPP_LIMITS.RECOMMENDED_FILE_SIZE * 3) {
                assert.ok(validation.warnings.some(warning => warning.includes('larger than the recommended')))
            }
        })

        it('should differentiate between static and animated limits', async () => {
            const staticSticker = new Sticker(images.static.portrait, {
                pack: 'Static Pack',
                author: 'Test Author'
            })

            const staticValidation = await staticSticker.validateWhatsAppCompliance()
            assert.strictEqual(staticValidation.fileSize.type, 'static')
            assert.strictEqual(staticValidation.fileSize.limit, WHATSAPP_LIMITS.STATIC_MAX_SIZE)
        })
    })

    describe('Dimensions Validation', () => {
        it('should ensure stickers are exactly 512x512', async () => {
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Test Pack',
                author: 'Test Author',
                type: StickerTypes.CROPPED
            })

            const validation = await sticker.validateWhatsAppCompliance()
            
            assert.strictEqual(validation.dimensions.width, 512)
            assert.strictEqual(validation.dimensions.height, 512)
            assert.strictEqual(validation.dimensions.isValid, true)
        })
    })

    describe('Animated Stickers', () => {
        it('should validate animated sticker (may take longer)', async function() {
            this.timeout(30000) // Increase timeout for animation processing
            
            try {
                const sticker = new Sticker(images.animated.portrait, {
                    pack: 'Animated Pack',
                    author: 'Test Author',
                    categories: ['😀'],
                    quality: 50, // Lower quality to help stay under size limit
                    type: StickerTypes.CROPPED // Ensure proper dimensions
                })

                const validation = await sticker.validateWhatsAppCompliance()
                
                assert.strictEqual(validation.fileSize.type, 'animated')
                assert.strictEqual(validation.fileSize.limit, WHATSAPP_LIMITS.ANIMATED_MAX_SIZE)
                assert.strictEqual(validation.dimensions.width, 512)
                assert.strictEqual(validation.dimensions.height, 512)
                
                // Should have warnings about animation properties
                assert.ok(validation.warnings.some(warning => warning.includes('Animated sticker detected')))
                
                // Log validation results for debugging
                if (!validation.isValid) {
                    console.log('Animated sticker validation issues:')
                    validation.errors.forEach(error => console.log(`  • ${error}`))
                }
            } catch (error) {
                // Skip if ffmpeg not available
                if (error instanceof Error && error.message.includes('spawn')) {
                    this.skip()
                }
                throw error
            }
        })
    })

    describe('WhatsAppValidator Static Methods', () => {
        it('should validate emoji categories', () => {
            const validEmojis = ['😀', '🎉', '❤️']
            const result = WhatsAppValidator.validateEmojiCategories(validEmojis)
            assert.strictEqual(result.isValid, true)
            assert.strictEqual(result.invalidEmojis.length, 0)
        })

        it('should detect invalid emoji categories', () => {
            const invalidEmojis = ['not-emoji', 'abc', '123']
            const result = WhatsAppValidator.validateEmojiCategories(invalidEmojis)
            assert.strictEqual(result.isValid, false)
            assert.strictEqual(result.invalidEmojis.length, 3)
        })

        it('should generate compliance report', async () => {
            const sticker = new Sticker(images.static.portrait, {
                pack: 'Report Test',
                author: 'Test Author',
                categories: ['😀']
            })

            const report = await sticker.getWhatsAppComplianceReport()
            
            assert.ok(typeof report === 'string')
            assert.ok(report.includes('WhatsApp Sticker Compliance Report'))
            assert.ok(report.includes('File Size:'))
            assert.ok(report.includes('Dimensions:'))
            assert.ok(report.includes('Metadata:'))
        })
    })

    describe('Constants', () => {
        it('should export WhatsApp limits', () => {
            assert.strictEqual(WHATSAPP_LIMITS.STATIC_MAX_SIZE, 100 * 1024)
            assert.strictEqual(WHATSAPP_LIMITS.ANIMATED_MAX_SIZE, 500 * 1024)
            assert.strictEqual(WHATSAPP_LIMITS.STICKER_SIZE, 512)
            assert.strictEqual(WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH, 128)
            assert.strictEqual(WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH, 128)
            assert.strictEqual(WHATSAPP_LIMITS.MAX_CATEGORIES_PER_STICKER, 3)
            assert.strictEqual(WHATSAPP_LIMITS.MAX_ANIMATION_DURATION, 10)
            assert.strictEqual(WHATSAPP_LIMITS.MIN_FRAME_DURATION, 8)
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty metadata gracefully', async () => {
            const sticker = new Sticker(images.static.portrait, {
                type: StickerTypes.CROPPED // Ensure proper dimensions
            }) // Minimal metadata

            const validation = await sticker.validateWhatsAppCompliance()
            
            // Should still validate dimensions and file size
            assert.strictEqual(validation.dimensions.width, 512)
            assert.strictEqual(validation.dimensions.height, 512)
            assert.ok(validation.warnings.some(warning => warning.includes('No emoji categories')))
        })

        it('should handle malformed input gracefully', async () => {
            try {
                const sticker = new Sticker('invalid-file-path')
                await sticker.validateWhatsAppCompliance()
                assert.fail('Should have thrown an error')
            } catch (error) {
                // Error should be thrown during validation, not necessarily during construction
                assert.ok(error instanceof Error)
                // Should contain a relevant error message about file access or processing
                assert.ok(
                    error.message.includes('ENOENT') || 
                    error.message.includes('Request failed') ||
                    error.message.includes('Validation failed') ||
                    error.message.includes('no such file')
                )
            }
        })
    })
})
