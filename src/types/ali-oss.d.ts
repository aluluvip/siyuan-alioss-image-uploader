declare module "ali-oss" {
    interface PutOptions {
        headers?: Record<string, string>;
    }

    interface PutResult {
        name: string;
        url: string;
        res: unknown;
    }

    interface ClientOptions {
        accessKeyId: string;
        accessKeySecret: string;
        bucket: string;
        endpoint?: string;
        region?: string;
        secure?: boolean;
    }

    export default class OSS {
        constructor(options: ClientOptions);
        put(name: string, file: File | Blob, options?: PutOptions): Promise<PutResult>;
    }
}
