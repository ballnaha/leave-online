declare module 'heic-convert' {
    interface HeicConvertOptions {
        buffer: ArrayBuffer | Buffer;
        format: 'JPEG' | 'PNG';
        quality?: number;
    }

    export default function heicConvert(options: HeicConvertOptions): Promise<ArrayBuffer | Buffer>;
}
