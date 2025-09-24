# WhatsApp Sticker Compliance

Wa-Sticker-Formatter now includes comprehensive WhatsApp sticker compliance validation to ensure your stickers meet all official WhatsApp requirements.

## WhatsApp Requirements

According to [WhatsApp's official sticker documentation](https://github.com/WhatsApp/stickers/tree/main/Android), stickers must meet these requirements:

### File Requirements
- **Format**: WebP
- **Dimensions**: Exactly 512 × 512 pixels
- **Static stickers**: ≤ 100KB file size
- **Animated stickers**: ≤ 500KB file size
- **Recommended size**: ~15KB for optimal performance

### Animation Requirements (for animated stickers)
- **Duration**: ≤ 10 seconds
- **Frame duration**: ≥ 8ms (minimum frame duration)
- **Loop**: Must loop infinitely
- **First frame**: Should represent the complete sticker (WhatsApp shows first frame when animation ends)

### Metadata Requirements
- **Pack name**: ≤ 128 characters
- **Author name**: ≤ 128 characters
- **Sticker ID**: ≤ 128 characters, alphanumeric + `_`, `-`, `.`, ` `
- **Categories**: 1-3 emoji categories per sticker (for search/discovery)

### Pack Requirements
- **Stickers per pack**: 3-30 stickers
- **Packs per app**: 1-10 packs
- **Pack types**: Static OR animated (cannot mix)

### Tray Icon Requirements
- **Format**: Static PNG or WebP
- **Dimensions**: 96 × 96 pixels
- **File size**: ≤ 50KB

## Using Compliance Validation

### Basic Validation

```typescript
import { Sticker } from 'wa-sticker-formatter'

const sticker = new Sticker('./image.png', {
    pack: 'My Pack',
    author: 'John Doe',
    categories: ['😀', '🎉']
})

// Validate compliance
const validation = await sticker.validateWhatsAppCompliance()

if (validation.isValid) {
    console.log('✅ Sticker is WhatsApp compliant!')
} else {
    console.log('❌ Compliance issues found:')
    validation.errors.forEach(error => console.log(`  • ${error}`))
}

// Show warnings (recommendations)
validation.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`))
```

### Generate Compliance Report

```typescript
// Get a detailed compliance report
const report = await sticker.getWhatsAppComplianceReport()
console.log(report)
```

Sample output:
```
=== WhatsApp Sticker Compliance Report ===

Overall Status: ✅ COMPLIANT

📏 File Size:
   Size: 45.2KB
   Limit: 100.0KB (static)
   Status: ✅

📐 Dimensions:
   Size: 512x512px
   Required: 512x512px
   Status: ✅

📋 Metadata:
   Pack: "My Pack" (7/128) ✅
   Author: "John Doe" (8/128) ✅
   ID: "abc123def" (9/128) ✅
   Categories: 2/3 ✅

⚠️  Warnings:
   • Consider adding an 8px white stroke around your sticker for better visibility on different backgrounds (as recommended by WhatsApp)

📚 Learn more: https://github.com/WhatsApp/stickers
```

### Static Validation Methods

```typescript
import { WhatsAppValidator, WHATSAPP_LIMITS } from 'wa-sticker-formatter'

// Validate any buffer directly
const buffer = await someSticker.build()
const validation = await WhatsAppValidator.validateSticker(buffer, metadata)

// Check emoji validity
const emojiValidation = WhatsAppValidator.validateEmojiCategories(['😀', '🎉'])
if (!emojiValidation.isValid) {
    console.log('Invalid emojis:', emojiValidation.invalidEmojis)
}

// Access WhatsApp limits
console.log(`Static sticker limit: ${WHATSAPP_LIMITS.STATIC_MAX_SIZE / 1024}KB`)
console.log(`Animation duration limit: ${WHATSAPP_LIMITS.MAX_ANIMATION_DURATION}s`)
```

### Available Limits Constants

```typescript
WHATSAPP_LIMITS = {
    // File size limits (bytes)
    STATIC_MAX_SIZE: 100 * 1024,        // 100KB
    ANIMATED_MAX_SIZE: 500 * 1024,      // 500KB
    TRAY_ICON_MAX_SIZE: 50 * 1024,      // 50KB
    
    // Dimensions
    STICKER_SIZE: 512,                   // 512x512 pixels
    TRAY_ICON_SIZE: 96,                  // 96x96 pixels
    
    // Metadata limits
    PACK_NAME_MAX_LENGTH: 128,
    AUTHOR_MAX_LENGTH: 128,
    ID_MAX_LENGTH: 128,
    
    // Category/emoji limits
    MAX_CATEGORIES_PER_STICKER: 3,
    MIN_CATEGORIES_PER_STICKER: 1,
    
    // Pack limits
    MIN_STICKERS_PER_PACK: 3,
    MAX_STICKERS_PER_PACK: 30,
    MAX_PACKS_PER_APP: 10,
    
    // Animation limits
    MAX_ANIMATION_DURATION: 10,          // seconds
    MIN_FRAME_DURATION: 8,               // milliseconds
    
    // Quality recommendations
    RECOMMENDED_QUALITY_MIN: 75,
    RECOMMENDED_FILE_SIZE: 15 * 1024     // 15KB recommended
}
```

## Best Practices for WhatsApp Compliance

### 1. File Size Optimization
- Use quality settings between 75-90 for good balance of size/quality
- For animated stickers, prefer 15 FPS over higher frame rates
- Consider the 15KB recommended size for optimal user experience

### 2. Design Guidelines
- Add an 8px white stroke around stickers for better visibility
- Test stickers on various backgrounds (white, black, colored, patterned)
- Ensure stickers are readable at small sizes
- Use transparent backgrounds appropriately

### 3. Animation Guidelines
- Keep animations under 10 seconds
- Make the first frame represent the complete sticker
- Ensure smooth looping (first frame should flow well after last frame)
- Test animations at 15 FPS for size efficiency

### 4. Metadata Best Practices
- Use descriptive but concise pack and author names
- Choose relevant emoji categories for better discoverability
- Use consistent naming across your sticker packs
- Keep IDs simple and alphanumeric

### 5. Quality Assurance
- Always validate compliance before publishing
- Test stickers in actual WhatsApp conversations
- Verify stickers work on both light and dark themes
- Check stickers on different device sizes

## Compliance Validation Response

The validation response includes:

```typescript
interface IWhatsAppValidationResult {
    isValid: boolean                 // Overall compliance status
    errors: string[]                 // Critical issues that must be fixed
    warnings: string[]               // Recommendations and best practices
    
    fileSize: {
        size: number                 // File size in bytes
        isValid: boolean            // Within size limits
        limit: number               // Size limit for this sticker type
        type: 'static' | 'animated' // Sticker type
    }
    
    dimensions: {
        width: number               // Actual width
        height: number              // Actual height
        isValid: boolean           // Must be 512x512
    }
    
    metadata: {
        pack: { value: string; isValid: boolean; limit: number }
        author: { value: string; isValid: boolean; limit: number }
        id: { value: string; isValid: boolean; limit: number }
        categories: { 
            value: Categories[]
            isValid: boolean
            count: number
            limit: number
        }
    }
}
```

## Integration with CI/CD

You can integrate WhatsApp compliance checking into your build process:

```typescript
// validate-stickers.js
const { Sticker } = require('wa-sticker-formatter')
const fs = require('fs')

async function validateStickerPack() {
    const stickerFiles = fs.readdirSync('./stickers')
    const results = []
    
    for (const file of stickerFiles) {
        const sticker = new Sticker(`./stickers/${file}`)
        const validation = await sticker.validateWhatsAppCompliance()
        
        if (!validation.isValid) {
            console.error(`❌ ${file}: ${validation.errors.join(', ')}`)
            process.exit(1)
        } else {
            console.log(`✅ ${file}: Compliant`)
        }
    }
}

validateStickerPack()
```

## Troubleshooting Common Issues

### File Size Too Large
- Reduce quality setting: `{ quality: 70 }`
- For animated stickers, reduce frame rate or duration
- Use more aggressive WebP compression

### Invalid Dimensions
- Ensure your conversion uses appropriate `type` setting
- Check that source images are processed correctly
- Verify no manual resizing is interfering

### Metadata Violations
- Trim pack/author names to under 128 characters
- Use only alphanumeric + `_.-` and space in IDs
- Limit categories to 3 relevant emojis maximum

### Animation Issues
- Check that ffmpeg is installed and accessible
- Verify source videos are not corrupted
- Consider reducing complexity for better compression

This compliance validation ensures your stickers meet WhatsApp's requirements and provide the best user experience.
