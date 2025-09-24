import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs-extra'
import { tmpdir } from 'os'
import { WHATSAPP_LIMITS } from './WhatsAppValidation'

/**
 * Adaptive video to WebP conversion with automatic quality adjustment
 * to ensure the result stays under WhatsApp's 500KB limit
 */
export const adaptiveVideoToWebp = async (data: Buffer, targetSize: number = WHATSAPP_LIMITS.ANIMATED_MAX_SIZE): Promise<Buffer> => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    const [video] = ['video'].map((ext) => `${filename}.${ext}`)
    await writeFile(video, data)

    // Quality levels to try, from best to worst
    const qualityLevels = [
        { quality: 60, fps: 12, duration: 8, compression: 4 },
        { quality: 50, fps: 10, duration: 6, compression: 5 },
        { quality: 40, fps: 8, duration: 5, compression: 6 },
        { quality: 30, fps: 6, duration: 4, compression: 6 },
        { quality: 20, fps: 5, duration: 3, compression: 6 },
    ]

    let result: Buffer | null = null
    
    for (const settings of qualityLevels) {
        const webpFile = `${filename}_q${settings.quality}.webp`
        
        try {
            await new Promise<void>((resolve, reject) => {
                ffmpeg(video)
                    .outputOptions([
                        '-an', // Remove audio
                        '-vsync', '0', // Variable frame rate
                        '-vcodec', 'libwebp', // WebP codec
                        '-loop', '0', // Infinite loop
                        '-t', String(settings.duration), // Duration limit
                        '-preset', 'default',
                        '-compression_level', String(settings.compression), // WebP compression
                        '-q:v', String(settings.quality), // Quality level
                        '-method', '6', // Best compression method
                        // Optimized filter chain
                        '-vf',
                        [
                            `fps=${settings.fps}`, // Frame rate
                            'scale=512:512:force_original_aspect_ratio=decrease', // Scale
                            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0', // Pad with transparent
                            'mpdecimate=hi=64*12:lo=64*5:frac=0.33' // Remove duplicate frames
                        ].join(',')
                    ])
                    .save(webpFile)
                    .on('end', resolve)
                    .on('error', reject)
            })

            const buffer = await readFile(webpFile)
            
            // Cleanup this attempt's file
            try {
                await unlink(webpFile)
            } catch {}
            
            console.log(`Quality ${settings.quality}: ${(buffer.length / 1024).toFixed(1)}KB`)
            
            // If this quality level produces a file under the target size, use it
            if (buffer.length <= targetSize) {
                result = buffer
                break
            }
            
            // If this is our last attempt, use it anyway
            if (settings === qualityLevels[qualityLevels.length - 1]) {
                result = buffer
            }
            
        } catch (error) {
            console.warn(`Failed at quality ${settings.quality}:`, error)
            continue
        }
    }

    // Cleanup original video file
    try {
        await unlink(video)
    } catch {}

    if (!result) {
        throw new Error('Failed to convert video with any quality settings')
    }

    return result
}

/**
 * Original video conversion function with optimized settings for smaller file sizes
 */
const videoToGif = async (data: Buffer): Promise<Buffer> => {
    // Try adaptive conversion first
    try {
        return await adaptiveVideoToWebp(data)
    } catch (error) {
        console.warn('Adaptive conversion failed, falling back to standard conversion:', error)
        
        // Fallback to original method with optimized settings
        const filename = `${tmpdir()}/${Math.random().toString(36)}`
        const [video, webp] = ['video', 'webp'].map((ext) => `${filename}.${ext}`)
        await writeFile(video, data)

        await new Promise((resolve, reject) => {
            ffmpeg(video)
                .outputOptions([
                    '-an',
                    '-vsync', '0',
                    '-vcodec', 'libwebp',
                    '-loop', '0',
                    '-t', '5', // Shorter duration
                    '-preset', 'default',
                    '-compression_level', '6', // Maximum compression
                    '-q:v', '35', // Lower quality
                    '-method', '6',
                    '-vf',
                    [
                        'fps=8', // Lower frame rate
                        'scale=512:512:force_original_aspect_ratio=decrease',
                        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0'
                    ].join(',')
                ])
                .save(webp)
                .on('end', resolve)
                .on('error', reject)
        })

        const buffer = await readFile(webp)
        
        // Cleanup
        try {
            await Promise.all([unlink(video), unlink(webp)])
        } catch {}
        
        return buffer
    }
}

export default videoToGif
