import sharp, { Color } from 'sharp'
import { StickerTypes } from './internal/Metadata/StickerTypes'

/** Sticker metadata config */
export interface IStickerConfig {
    /** Sticker Pack title*/
    pack?: string
    /** Sticker Pack Author*/
    author?: string
    /** Sticker Pack ID*/
    id?: string
    /** Sticker Category*/
    categories?: Categories[]
}

export interface IStickerOptions extends IStickerConfig {
    /** How you want your sticker to look like
     * Can be crop or full. Defaults to 'default' (no changes)
     */
    type?: StickerTypes | string

    /**
     * Quality of the output webp image. Must be an integer from 0 to 100 (defaults to 100
     */
    quality?: sharp.WebpOptions['quality']
    /**
     * Background Color of the sticker (only for type full)
     */
    background?: Color
}

export interface IRawMetadata {
    emojis: string[]
    'sticker-pack-id': string
    'sticker-pack-name': string
    'sticker-pack-publisher': string
}

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

export type Metadata = IStickerConfig | IStickerOptions

type Love =
    | '❤'
    | '😍'
    | '😘'
    | '💕'
    | '😻'
    | '💑'
    | '👩‍❤‍👩'
    | '👨‍❤‍👨'
    | '💏'
    | '👩‍❤‍💋‍👩'
    | '👨‍❤‍💋‍👨'
    | '🧡'
    | '💛'
    | '💚'
    | '💙'
    | '💜'
    | '🖤'
    | '💔'
    | '❣'
    | '💞'
    | '💓'
    | '💗'
    | '💖'
    | '💘'
    | '💝'
    | '💟'
    | '♥'
    | '💌'
    | '💋'
    | '👩‍❤️‍💋‍👩'
    | '👨‍❤️‍💋‍👨'
    | '👩‍❤️‍👨'
    | '👩‍❤️‍👩'
    | '👨‍❤️‍👨'
    | '👩‍❤️‍💋‍👨'
    | '👬'
    | '👭'
    | '👫'
    | '🥰'
    | '😚'
    | '😙'
    | '👄'
    | '🌹'
    | '😽'
    | '❣️'
    | '❤️'
type Happy =
    | '😀'
    | '😃'
    | '😄'
    | '😁'
    | '😆'
    | '😅'
    | '😂'
    | '🤣'
    | '🙂'
    | '😛'
    | '😝'
    | '😜'
    | '🤪'
    | '🤗'
    | '😺'
    | '😸'
    | '😹'
    | '☺'
    | '😌'
    | '😉'
    | '🤗'
    | '😊'
type Sad =
    | '☹'
    | '😣'
    | '😖'
    | '😫'
    | '😩'
    | '😢'
    | '😭'
    | '😞'
    | '😔'
    | '😟'
    | '😕'
    | '😤'
    | '😠'
    | '😥'
    | '😰'
    | '😨'
    | '😿'
    | '😾'
    | '😓'
    | '🙍‍♂'
    | '🙍‍♀'
    | '💔'
    | '🙁'
    | '🥺'
    | '🤕'
    | '☔️'
    | '⛈'
    | '🌩'
    | '🌧'
type Angry =
    | '😯'
    | '😦'
    | '😧'
    | '😮'
    | '😲'
    | '🙀'
    | '😱'
    | '🤯'
    | '😳'
    | '❗'
    | '❕'
    | '🤬'
    | '😡'
    | '😠'
    | '🙄'
    | '👿'
    | '😾'
    | '😤'
    | '💢'
    | '👺'
    | '🗯️'
    | '😒'
    | '🥵'
type Greet = '👋'
type Celebrate =
    | '🎊'
    | '🎉'
    | '🎁'
    | '🎈'
    | '👯‍♂️'
    | '👯'
    | '👯‍♀️'
    | '💃'
    | '🕺'
    | '🔥'
    | '⭐️'
    | '✨'
    | '💫'
    | '🎇'
    | '🎆'
    | '🍻'
    | '🥂'
    | '🍾'
    | '🎂'
    | '🍰'

/** Sticker Category. Learn More: https://github.com/WhatsApp/stickers/wiki/Tag-your-stickers-with-Emojis*/
export type Categories = Love | Happy | Sad | Angry | Greet | Celebrate
