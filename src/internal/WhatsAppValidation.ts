import { Categories, IStickerOptions } from '../Types'
import { fromBuffer } from 'file-type'
import sharp from 'sharp'

/** WhatsApp sticker validation result */
export interface IWhatsAppValidationResult {
    /** Whether the sticker meets all WhatsApp requirements */
    isValid: boolean
    /** List of validation errors */
    errors: string[]
    /** List of validation warnings */
    warnings: string[]
    /** File size validation */
    fileSize: {
        size: number
        isValid: boolean
        limit: number
        type: 'static' | 'animated'
    }
    /** Dimensions validation */
    dimensions: {
        width: number
        height: number
        isValid: boolean
    }
    /** Metadata validation */
    metadata: {
        pack: { value: string; isValid: boolean; limit: number }
        author: { value: string; isValid: boolean; limit: number }
        id: { value: string; isValid: boolean; limit: number }
        categories: { value: Categories[]; isValid: boolean; count: number; limit: number }
    }
}

/** WhatsApp sticker requirements constants */
export const WHATSAPP_LIMITS = {
    // File size limits in bytes
    STATIC_MAX_SIZE: 100 * 1024, // 100KB
    ANIMATED_MAX_SIZE: 500 * 1024, // 500KB
    TRAY_ICON_MAX_SIZE: 50 * 1024, // 50KB
    
    // Dimensions
    STICKER_SIZE: 512, // 512x512 pixels
    TRAY_ICON_SIZE: 96, // 96x96 pixels
    
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
    MAX_ANIMATION_DURATION: 10, // seconds
    MIN_FRAME_DURATION: 8, // milliseconds
    
    // Quality recommendations
    RECOMMENDED_QUALITY_MIN: 75,
    RECOMMENDED_FILE_SIZE: 15 * 1024 // 15KB recommended
} as const

/**
 * WhatsApp sticker validation utility class
 */
export class WhatsAppValidator {
    /**
     * Validates a sticker buffer against WhatsApp requirements
     * @param buffer - The sticker buffer to validate
     * @param metadata - The sticker metadata
     * @returns Validation result
     */
    static async validateSticker(
        buffer: Buffer,
        metadata: Partial<IStickerOptions> = {}
    ): Promise<IWhatsAppValidationResult> {
        const result: IWhatsAppValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            fileSize: { size: 0, isValid: true, limit: 0, type: 'static' },
            dimensions: { width: 0, height: 0, isValid: true },
            metadata: {
                pack: { value: '', isValid: true, limit: WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH },
                author: { value: '', isValid: true, limit: WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH },
                id: { value: '', isValid: true, limit: WHATSAPP_LIMITS.ID_MAX_LENGTH },
                categories: { value: [], isValid: true, count: 0, limit: WHATSAPP_LIMITS.MAX_CATEGORIES_PER_STICKER }
            }
        }

        try {
            // Validate file type and determine if animated
            const isAnimated = await this.isAnimatedSticker(buffer)
            result.fileSize.type = isAnimated ? 'animated' : 'static'

            // Validate file size
            this.validateFileSize(buffer, isAnimated, result)

            // Validate dimensions
            await this.validateDimensions(buffer, result)

            // Validate metadata
            this.validateMetadata(metadata, result)

            // Additional validations for animated stickers
            if (isAnimated) {
                await this.validateAnimatedSticker(buffer, result)
            }

            // Set overall validity
            result.isValid = result.errors.length === 0

            return result
        } catch (error) {
            result.isValid = false
            result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
            return result
        }
    }

    /**
     * Determines if a sticker is animated
     */
    private static async isAnimatedSticker(buffer: Buffer): Promise<boolean> {
        try {
            const fileType = await fromBuffer(buffer)
            if (!fileType) return false

            // Check for animated formats
            if (fileType.mime === 'image/webp') {
                // Use sharp to detect if WebP is animated
                const metadata = await sharp(buffer).metadata()
                return metadata.pages !== undefined && metadata.pages > 1
            }
            
            return fileType.mime === 'image/gif'
        } catch {
            return false
        }
    }

    /**
     * Validates file size against WhatsApp limits
     */
    private static validateFileSize(
        buffer: Buffer,
        isAnimated: boolean,
        result: IWhatsAppValidationResult
    ): void {
        const size = buffer.length
        const limit = isAnimated ? WHATSAPP_LIMITS.ANIMATED_MAX_SIZE : WHATSAPP_LIMITS.STATIC_MAX_SIZE

        result.fileSize.size = size
        result.fileSize.limit = limit
        result.fileSize.isValid = size <= limit

        if (!result.fileSize.isValid) {
            result.errors.push(
                `File size ${(size / 1024).toFixed(1)}KB exceeds WhatsApp limit of ${(limit / 1024).toFixed(1)}KB for ${isAnimated ? 'animated' : 'static'} stickers`
            )
        }

        // Warning for files significantly larger than recommended
        if (size > WHATSAPP_LIMITS.RECOMMENDED_FILE_SIZE * 3) {
            result.warnings.push(
                `File size ${(size / 1024).toFixed(1)}KB is much larger than the recommended ~15KB for optimal performance`
            )
        }
    }

    /**
     * Validates sticker dimensions
     */
    private static async validateDimensions(
        buffer: Buffer,
        result: IWhatsAppValidationResult
    ): Promise<void> {
        try {
            const metadata = await sharp(buffer).metadata()
            const { width = 0, height = 0 } = metadata

            result.dimensions.width = width
            result.dimensions.height = height
            result.dimensions.isValid = width === WHATSAPP_LIMITS.STICKER_SIZE && height === WHATSAPP_LIMITS.STICKER_SIZE

            if (!result.dimensions.isValid) {
                result.errors.push(
                    `Sticker dimensions ${width}x${height} must be exactly ${WHATSAPP_LIMITS.STICKER_SIZE}x${WHATSAPP_LIMITS.STICKER_SIZE} pixels`
                )
            }
        } catch (error) {
            result.errors.push(`Failed to read sticker dimensions: ${error instanceof Error ? error.message : String(error)}`)
            result.dimensions.isValid = false
        }
    }

    /**
     * Validates metadata against WhatsApp requirements
     */
    private static validateMetadata(
        metadata: Partial<IStickerOptions>,
        result: IWhatsAppValidationResult
    ): void {
        // Validate pack name
        const pack = metadata.pack || ''
        result.metadata.pack.value = pack
        if (pack.length > WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH) {
            result.metadata.pack.isValid = false
            result.errors.push(`Pack name exceeds ${WHATSAPP_LIMITS.PACK_NAME_MAX_LENGTH} character limit`)
        }

        // Validate author
        const author = metadata.author || ''
        result.metadata.author.value = author
        if (author.length > WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH) {
            result.metadata.author.isValid = false
            result.errors.push(`Author name exceeds ${WHATSAPP_LIMITS.AUTHOR_MAX_LENGTH} character limit`)
        }

        // Validate ID
        const id = metadata.id || ''
        result.metadata.id.value = id
        if (id.length > WHATSAPP_LIMITS.ID_MAX_LENGTH) {
            result.metadata.id.isValid = false
            result.errors.push(`Sticker ID exceeds ${WHATSAPP_LIMITS.ID_MAX_LENGTH} character limit`)
        }

        // Validate ID format (alphanumeric plus allowed characters)
        if (id && !/^[a-zA-Z0-9_\-. ]+$/.test(id)) {
            result.metadata.id.isValid = false
            result.errors.push('Sticker ID contains invalid characters. Only a-z, A-Z, 0-9, "_", "-", ".", and " " are allowed')
        }

        // Validate categories
        const categories = metadata.categories || []
        result.metadata.categories.value = categories
        result.metadata.categories.count = categories.length

        if (categories.length > WHATSAPP_LIMITS.MAX_CATEGORIES_PER_STICKER) {
            result.metadata.categories.isValid = false
            result.errors.push(`Too many categories (${categories.length}). Maximum ${WHATSAPP_LIMITS.MAX_CATEGORIES_PER_STICKER} emojis allowed per sticker`)
        }

        // Warning if no categories provided
        if (categories.length === 0) {
            result.warnings.push('No emoji categories provided. Adding 1-3 relevant emojis helps users discover your stickers through search')
        }

        // Warning about recommended white stroke for better visibility
        result.warnings.push('Consider adding an 8px white stroke around your sticker for better visibility on different backgrounds (as recommended by WhatsApp)')
    }

    /**
     * Additional validation for animated stickers
     */
    private static async validateAnimatedSticker(
        buffer: Buffer,
        result: IWhatsAppValidationResult
    ): Promise<void> {
        try {
            const metadata = await sharp(buffer).metadata()
            
            // Check if it's actually animated
            if (metadata.pages && metadata.pages > 1) {
                // Note: Sharp doesn't provide frame duration info for WebP
                // This is a limitation - full validation would require ffmpeg probe
                result.warnings.push('Animated sticker detected. Ensure animation duration is ≤10 seconds and frame duration is ≥8ms')
                
                // Check frame count as a rough indicator
                if (metadata.pages > 150) { // Rough estimate: 15fps * 10s = 150 frames
                    result.warnings.push(`High frame count (${metadata.pages}). Consider reducing frames to keep within 10-second duration limit`)
                }
            }
        } catch (error) {
            result.warnings.push(`Could not fully validate animated sticker properties: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Validates if emojis are in the allowed WhatsApp categories
     * @param emojis - Array of emoji strings
     * @returns Validation result
     */
    static validateEmojiCategories(emojis: string[]): { isValid: boolean; invalidEmojis: string[] } {
        // This is a simplified check - in practice, you'd want a comprehensive emoji validation
        // against the specific WhatsApp-allowed emoji list from their documentation
        const invalidEmojis: string[] = []
        
        for (const emoji of emojis) {
            // Basic check for emoji-like characters
            // This is a simplified regex - real implementation should check against the full WhatsApp emoji list
            if (!/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(emoji)) {
                invalidEmojis.push(emoji)
            }
        }

        return {
            isValid: invalidEmojis.length === 0,
            invalidEmojis
        }
    }

    /**
     * Generates a compliance report
     * @param result - Validation result
     * @returns Formatted compliance report
     */
    static generateComplianceReport(result: IWhatsAppValidationResult): string {
        const lines: string[] = []
        
        lines.push('=== WhatsApp Sticker Compliance Report ===\n')
        lines.push(`Overall Status: ${result.isValid ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n`)
        
        // File size section
        lines.push('📏 File Size:')
        lines.push(`   Size: ${(result.fileSize.size / 1024).toFixed(1)}KB`)
        lines.push(`   Limit: ${(result.fileSize.limit / 1024).toFixed(1)}KB (${result.fileSize.type})`)
        lines.push(`   Status: ${result.fileSize.isValid ? '✅' : '❌'}\n`)
        
        // Dimensions section
        lines.push('📐 Dimensions:')
        lines.push(`   Size: ${result.dimensions.width}x${result.dimensions.height}px`)
        lines.push(`   Required: 512x512px`)
        lines.push(`   Status: ${result.dimensions.isValid ? '✅' : '❌'}\n`)
        
        // Metadata section
        lines.push('📋 Metadata:')
        lines.push(`   Pack: "${result.metadata.pack.value}" (${result.metadata.pack.value.length}/${result.metadata.pack.limit}) ${result.metadata.pack.isValid ? '✅' : '❌'}`)
        lines.push(`   Author: "${result.metadata.author.value}" (${result.metadata.author.value.length}/${result.metadata.author.limit}) ${result.metadata.author.isValid ? '✅' : '❌'}`)
        lines.push(`   ID: "${result.metadata.id.value}" (${result.metadata.id.value.length}/${result.metadata.id.limit}) ${result.metadata.id.isValid ? '✅' : '❌'}`)
        lines.push(`   Categories: ${result.metadata.categories.count}/${result.metadata.categories.limit} ${result.metadata.categories.isValid ? '✅' : '❌'}\n`)
        
        // Errors section
        if (result.errors.length > 0) {
            lines.push('❌ Errors:')
            result.errors.forEach(error => lines.push(`   • ${error}`))
            lines.push('')
        }
        
        // Warnings section
        if (result.warnings.length > 0) {
            lines.push('⚠️  Warnings:')
            result.warnings.forEach(warning => lines.push(`   • ${warning}`))
            lines.push('')
        }
        
        lines.push('📚 Learn more: https://github.com/WhatsApp/stickers')
        
        return lines.join('\n')
    }
}
