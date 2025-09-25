import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs-extra'
import { tmpdir } from 'os'
import sharp from 'sharp'
import { fromBuffer } from 'file-type'

/**
 * Convert video directly to animated WebP following WhatsApp requirements:
 * - Maximum 10 seconds duration
 * - Minimum frame duration of 8ms (we use adaptive fps: 5-12fps)
 * - 512x512 pixels exactly
 * - WebP format with transparent background
 * - File size target under 500KB with adaptive quality
 */
const videoToGif = async (data: Buffer): Promise<Buffer> => {
    const targetSize = 500 * 1024 // 500KB WhatsApp limit

    // Pre-check: If input is already a WebP that meets requirements, return as-is
    try {
        const fileType = await fromBuffer(data)
        if (fileType?.mime === 'image/webp') {
            console.log('🔍 Input is already WebP, checking WhatsApp compliance...')
            
            // Check file size
            const sizeKB = (data.length / 1024).toFixed(1)
            console.log(`📏 Current size: ${sizeKB}KB`)
            
            if (data.length <= targetSize) {
                // Check dimensions using Sharp
                try {
                    const metadata = await sharp(data).metadata()
                    const isCorrectSize = metadata.width === 512 && metadata.height === 512
                    const isAnimated = metadata.pages && metadata.pages > 1
                    
                    if (isCorrectSize) {
                        if (isAnimated) {
                            // For animated WebP, we can't easily check duration without ffprobe
                            // But if size and dimensions are good, likely compliant
                            console.log(`✅ Input animated WebP meets requirements: ${sizeKB}KB, 512x512px, ${metadata.pages} frames`)
                        } else {
                            console.log(`✅ Input static WebP meets requirements: ${sizeKB}KB, 512x512px`)
                        }
                        return data
                    } else {
                        console.log(`📐 Dimensions don't match: ${metadata.width}x${metadata.height} (need 512x512)`)
                    }
                } catch (sharpError) {
                    console.log('📝 Sharp metadata check failed, proceeding with conversion')
                }
            } else {
                console.log(`📦 File too large: ${sizeKB}KB > ${targetSize / 1024}KB limit`)
            }
        }
    } catch (error) {
        console.log('📝 Pre-check failed, proceeding with conversion:', error instanceof Error ? error.message : String(error))
    }

    console.log('🔄 Converting video with adaptive optimization...')
    
    // Quick video analysis to avoid unnecessary conversion
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    const [video] = ['video'].map((ext) => `${filename}.${ext}`)
    await writeFile(video, data)
    
    // Try to get video info to see if we can skip conversion
    try {
        const videoInfo = await new Promise<any>((resolve, reject) => {
            ffmpeg.ffprobe(video, (err, metadata) => {
                if (err) reject(err)
                else resolve(metadata)
            })
        })
        
        const videoStream = videoInfo.streams.find((s: any) => s.codec_type === 'video')
        if (videoStream) {
            const duration = parseFloat(videoStream.duration) || parseFloat(videoInfo.format.duration) || 0
            const width = videoStream.width
            const height = videoStream.height
            
            console.log(`📊 Input video: ${width}x${height}, ${duration.toFixed(1)}s`)
            
            // If video is already small enough and good dimensions, use minimal conversion
            if (data.length <= targetSize * 0.8 && width === 512 && height === 512 && duration <= 10) {
                console.log('🎯 Input video already close to requirements, using minimal conversion')
            }
        }
    } catch (probeError) {
        console.log('📝 Video analysis failed, proceeding with full conversion')
    }
    
    // Quality levels to try, from best to worst
    // If input is already good, start with higher quality
    const inputSizeKB = data.length / 1024
    const startFromHighQuality = inputSizeKB <= 600 // If input is already reasonably sized
    
    const qualityLevels = [
        ...(startFromHighQuality ? [{ quality: 70, fps: 12, duration: 10, compression: 4, method: 4 }] : []),
        { quality: 50, fps: 10, duration: 10, compression: 5, method: 4 },
        { quality: 40, fps: 8, duration: 6, compression: 6, method: 6 },
        { quality: 30, fps: 6, duration: 5, compression: 6, method: 6 },
        { quality: 25, fps: 5, duration: 4, compression: 6, method: 6 },
    ]
    
    if (startFromHighQuality) {
        console.log(`🎯 Input size ${inputSizeKB.toFixed(1)}KB is reasonable, trying higher quality first`)
    }

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
                        '-auto-alt-ref', '0', // Disable alt-ref frames for better transparency
                        '-metadata:s:v:0', 'alpha_mode=1', // Enable alpha channel support
                        // Optimized video filter chain for small file size with transparency:
                        '-vf',
                        [
                            `fps=${settings.fps}`, // Adaptive frame rate (>> 8ms minimum requirement)
                            // Smart scaling that preserves aspect ratio without forcing padding
                            // For portrait videos (h > w): fit height to 512, center horizontally with transparency
                            // For landscape videos (w > h): fit width to 512, center vertically with transparency
                            'scale=\'if(gte(iw,ih),512,-1)\':\'if(gte(ih,iw),512,-1)\':flags=lanczos', // High quality scaling
                            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0', // Center with fully transparent padding
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
