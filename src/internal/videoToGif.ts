import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs-extra'
import { tmpdir } from 'os'

/**
 * Convert video directly to animated WebP following WhatsApp requirements:
 * - Maximum 10 seconds duration
 * - Minimum frame duration of 8ms (125 fps max, we use 15fps for reasonable file size)
 * - 512x512 pixels exactly
 * - WebP format with transparent background
 * - File size target under 500KB
 */
const videoToGif = async (data: Buffer): Promise<Buffer> => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    const [video, webp] = ['video', 'webp'].map((ext) => `${filename}.${ext}`)
    await writeFile(video, data)

    await new Promise((resolve, reject) => {
        // WhatsApp sticker requirements compliance:
        // - Duration limit: 10 seconds (-t 10)
        // - Frame rate: 15fps (66.67ms per frame, well above 8ms minimum)
        // - Dimensions: 512x512 pixels exactly
        // - Format: WebP with infinite loop
        // - Size optimization: compression_level=4, quality=75
        ffmpeg(video)
            .outputOptions([
                '-an', // Remove audio
                '-vsync', '0', // Variable frame rate
                '-vcodec', 'libwebp', // WebP codec
                '-loop', '0', // Infinite loop (WhatsApp requirement)
                '-t', '10', // Maximum 10 seconds (WhatsApp requirement)
                '-preset', 'default', // Default encoding preset
                '-compression_level', '4', // WebP compression level (0-6, 4 is good balance)
                '-q:v', '75', // Quality level to help keep under 500KB limit
                // Video filter chain for WhatsApp compliance:
                '-vf',
                [
                    'fps=15', // 15fps = 66.67ms per frame (>> 8ms minimum requirement)
                    'scale=512:-1:flags=lanczos:force_original_aspect_ratio=decrease', // Scale to fit 512 width
                    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0' // Pad to 512x512 with transparent background
                ].join(',')
            ])
            .save(webp)
            .on('end', resolve)
            .on('error', reject)
    })

    const buffer = await readFile(webp)
    
    // Cleanup temporary files
    try {
        await Promise.all([unlink(video), unlink(webp)])
    } catch {
        // Ignore cleanup errors
    }
    
    return buffer
}

export default videoToGif
