import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs-extra'
import { tmpdir } from 'os'

// Convert video directly to animated WebP and limit duration to 10 seconds
const videoToGif = async (data: Buffer): Promise<Buffer> => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    const [video, webp] = ['video', 'webp'].map((ext) => `${filename}.${ext}`)
    await writeFile(video, data)

    await new Promise((resolve) => {
        // Notes:
        // - Limit to 10s with -t 10 (WhatsApp sticker requirement target)
        // - fps=15 keeps size reasonable
        // - scale to fit within 512x512 preserving aspect ratio, then pad to square
        // - transparent pad color (alpha 0) to avoid visible borders
        // - loop 0 for infinite loop
        ffmpeg(video)
            .outputOptions([
                '-an',
                '-vsync',
                '0',
                '-vcodec',
                'libwebp',
                '-loop',
                '0',
                '-t',
                '10',
                '-preset',
                'default',
                '-compression_level',
                '4',
                '-q:v',
                '75',
                // Use filter chain for fps, scale (maintain AR), and pad to 512x512
                '-vf',
                [
                    'fps=15',
                    'scale=512:-1:flags=lanczos:force_original_aspect_ratio=decrease',
                    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
                ].join(',')
            ])
            .save(webp)
            .on('end', resolve)
    })

    const buffer = await readFile(webp)
    ;[video, webp].forEach((file) => unlink(file))
    return buffer
}

export default videoToGif
