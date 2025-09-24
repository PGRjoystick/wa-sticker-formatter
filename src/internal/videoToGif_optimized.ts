import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs-extra'
import { tmpdir } from 'os'

/**
 * Convert video directly to animated WebP following WhatsApp requirements:
 * - Maximum 10 seconds duration
 * - Minimum frame duration of 8ms (we use adaptive fps: 5-12fps)
 * - 512x512 pixels exactly
 * - WebP format with transparent background
 * - File size target under 500KB with adaptive quality
 */
const videoToGif = async (data: Buffer): Promise<Buffer> => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    const [video] = ['video'].map((ext) => `${filename}.${ext}`)
    await writeFile(video, data)

    const targetSize = 500 * 1024 // 500KB WhatsApp limit
    
    // Quality levels to try, from best to worst
    const qualityLevels = [
        { quality: 50, fps: 10, duration: 6, compression: 5, method: 4 },
        { quality: 40, fps: 8, duration: 5, compression: 6, method: 6 },
        { quality: 30, fps: 6, duration: 4, compression: 6, method: 6 },
        { quality: 25, fps: 5, duration: 3, compression: 6, method: 6 },
    ]

    let result: Buffer | null = null
    
    for (let i = 0; i < qualityLevels.length; i++) {
        const settings = qualityLevels[i]
        const webpFile = `${filename}_q${settings.quality}.webp`
        
        try {
            await new Promise<void>((resolve, reject) => {
                const cmd = ffmpeg(video)
                    .outputOptions([
                        '-an', // Remove audio
                        '-vsync', '0', // Variable frame rate
                        '-vcodec', 'libwebp', // WebP codec
                        '-loop', '0', // Infinite loop (WhatsApp requirement)
                        '-t', String(settings.duration), // Duration limit for size control
                        '-preset', 'default',
                        '-compression_level', String(settings.compression), // WebP compression (0-6)
                        '-q:v', String(settings.quality), // Quality level
                        '-method', String(settings.method), // Compression method (0-6, higher = smaller)
                        // Optimized video filter chain for small file size:
                        '-vf',
                        [
                            `fps=${settings.fps}`, // Adaptive frame rate (>> 8ms minimum requirement)
                            'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos', // Scale with high-quality filter
                            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0', // Pad to 512x512 with transparent background
                            ...(i > 1 ? ['mpdecimate=hi=64*12:lo=64*5:frac=0.33'] : []) // Remove duplicate frames on lower qualities
                        ].filter(Boolean).join(',')
                    ])

                cmd.save(webpFile)
                   .on('end', resolve)
                   .on('error', reject)
            })

            const buffer = await readFile(webpFile)
            
            // Cleanup this attempt's file
            try {
                await unlink(webpFile)
            } catch {}
            
            const sizeKB = (buffer.length / 1024).toFixed(1)
            console.log(`Video conversion attempt ${i + 1}: Quality ${settings.quality}, Size ${sizeKB}KB`)
            
            // If this quality level produces a file under the target size, use it
            if (buffer.length <= targetSize) {
                result = buffer
                console.log(`✅ Successfully converted video to ${sizeKB}KB (under ${targetSize / 1024}KB limit)`)
                break
            }
            
            // If this is our last attempt, use it anyway (better than failing)
            if (i === qualityLevels.length - 1) {
                result = buffer
                console.log(`⚠️  Using final attempt: ${sizeKB}KB (over ${targetSize / 1024}KB limit)`)
            }
            
        } catch (error) {
            console.warn(`❌ Failed at quality ${settings.quality}:`, error instanceof Error ? error.message : error)
            
            // If this is our last attempt and we failed, throw
            if (i === qualityLevels.length - 1) {
                throw error
            }
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

export default videoToGif
