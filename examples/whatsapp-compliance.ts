import { Sticker, WHATSAPP_LIMITS } from '../src'

/**
 * Example demonstrating WhatsApp sticker compliance validation
 */
;(async () => {
    console.log('\n=== WhatsApp Sticker Compliance Example ===\n')
    
    // Example 1: Compliant sticker
    console.log('Creating a WhatsApp-compliant sticker...')
    const compliantSticker = new Sticker('https://i.pinimg.com/originals/3a/53/d6/3a53d68345b56241a875595b21ec2a59.jpg', {
        pack: 'My Awesome Pack',
        author: 'John Doe',
        categories: ['😀', '🎉'],
        quality: 80,
        type: 'crop'
    })

    const complianceReport = await compliantSticker.getWhatsAppComplianceReport()
    console.log(complianceReport)
    console.log('\n' + '='.repeat(50) + '\n')

    // Example 2: Non-compliant sticker (metadata issues)
    console.log('Creating a NON-compliant sticker (metadata violations)...')
    const nonCompliantSticker = new Sticker('https://i.pinimg.com/originals/3a/53/d6/3a53d68345b56241a875595b21ec2a59.jpg', {
        pack: 'A'.repeat(140), // Too long (>128 chars)
        author: 'B'.repeat(140), // Too long (>128 chars)
        categories: ['😀', '😃', '😄', '😁'] as any, // Too many (>3)
        id: 'invalid@#$%id', // Invalid characters
        quality: 100
    })

    const nonCompliantReport = await nonCompliantSticker.getWhatsAppComplianceReport()
    console.log(nonCompliantReport)
    console.log('\n' + '='.repeat(50) + '\n')

    // Example 3: Show WhatsApp limits
    console.log('WhatsApp Sticker Limits:')
    console.log(`• Static sticker max size: ${WHATSAPP_LIMITS.STATIC_MAX_SIZE / 1024}KB`)
    console.log(`• Animated sticker max size: ${WHATSAPP_LIMITS.ANIMATED_MAX_SIZE / 1024}KB`)
    console.log(`• Sticker dimensions: ${WHATSAPP_LIMITS.STICKER_SIZE}x${WHATSAPP_LIMITS.STICKER_SIZE} pixels`)
    console.log(`• Pack name max length: ${WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH} characters`)
    console.log(`• Author name max length: ${WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH} characters`)
    console.log(`• Max categories per sticker: ${WHATSAPP_LIMITS.MAX_CATEGORIES_PER_STICKER}`)
    console.log(`• Max animation duration: ${WHATSAPP_LIMITS.MAX_ANIMATION_DURATION} seconds`)
    console.log(`• Min frame duration: ${WHATSAPP_LIMITS.MIN_FRAME_DURATION}ms`)
    console.log(`• Stickers per pack: ${WHATSAPP_LIMITS.MIN_STICKERS_PER_PACK}-${WHATSAPP_LIMITS.MAX_STICKERS_PER_PACK}`)
    console.log(`• Max packs per app: ${WHATSAPP_LIMITS.MAX_PACKS_PER_APP}`)
    console.log(`• Recommended file size: ~${WHATSAPP_LIMITS.RECOMMENDED_FILE_SIZE / 1024}KB`)

    console.log('\n=== Validation Complete ===')
})().catch(console.error)
