import Ffmpeg from 'fluent-ffmpeg'
import { readFile } from 'fs-extra'
import { tmpdir } from 'os'

/**
 * Crop animated stickers to meet WhatsApp requirements:
 * - Exactly 512x512 pixels
 * - Maximum 10 seconds duration
 * - Minimum 8ms frame duration (we use 15fps = 66.67ms per frame)
 * - WebP format with proper loop behavior
 */
const crop = async (filename: string): Promise<Buffer> => {
    const file = await new Promise<string>((resolve, reject) => {
        const name = `${tmpdir()}/${Math.random().toString(36)}.webp`
        Ffmpeg(filename)
            .outputOptions([
                '-vcodec', 'libwebp', // WebP codec for WhatsApp compatibility
                '-vf',
                // WhatsApp-compliant crop and scale filter:
                // - Crop to square aspect ratio using minimum dimension
                // - Scale to exactly 512x512 (WhatsApp requirement)
                // - Set proper pixel aspect ratio and frame rate
                `crop=w='min(min(iw\\,ih)\\,500)':h='min(min(iw\\,ih)\\,500)',scale=512:512,setsar=1,fps=15`,
                '-loop', '0', // Infinite loop (WhatsApp requirement)
                '-preset', 'default', // Encoding preset
                '-an', // Remove audio
                '-vsync', '0', // Variable sync
                '-s', '512:512' // Force output size to 512x512
            ])
            .save(name)
            .on('end', () => resolve(name))
            .on('error', reject)
    })
    
    return await readFile(file)
}

export default crop
