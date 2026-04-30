import OSS from "ali-oss";
import {getAllEditor, Plugin, Protyle, Setting, showMessage} from "siyuan";
import "./index.scss";

const STORAGE_NAME = "oss-config";
const HELP_URL = "https://blog.luluvip.cn/2021/11/09/%E6%8A%98%E8%85%BE%E7%AF%87%EF%BC%9A%E7%94%A8%E9%98%BF%E9%87%8C%E4%BA%91OSS%E6%90%AD%E5%BB%BA%E5%9B%BE%E5%BA%8A/";

interface OssSettings {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
    bucket: string;
    path: string;
}

interface UploadResult {
    key: string;
    url: string;
    filename: string;
}

const DEFAULT_SETTINGS: OssSettings = {
    accessKeyId: "",
    accessKeySecret: "",
    endpoint: "oss-cn-beijing.aliyuncs.com",
    bucket: "",
    path: "img/",
};

export default class AliOssImageUploader extends Plugin {
    private settings: OssSettings = {...DEFAULT_SETTINGS};
    private pasteHandler = this.handlePaste.bind(this) as EventListener;
    private isUploading = false;

    async onload() {
        this.data[STORAGE_NAME] = {...DEFAULT_SETTINGS};
        await this.loadData(STORAGE_NAME);
        this.settings = this.normalizeSettings(this.data[STORAGE_NAME]);

        this.addIcons(`<symbol id="iconAliOssUpload" viewBox="0 0 32 32">
<path d="M25.8 13.4A10 10 0 0 0 6.2 11 7.3 7.3 0 0 0 7.3 25h17.4a5.8 5.8 0 0 0 1.1-11.6ZM24.7 22.3H7.3a4.6 4.6 0 0 1-.2-9.2l1.3-.1.3-1.3a7.3 7.3 0 0 1 14.4 1.6v2.1l2.1.4a3.1 3.1 0 0 1-.5 6.2v.3Z"></path>
<path d="M15 19.8h2.7v-5.6l2.1 2.1 1.9-1.9L16.3 9l-5.4 5.4 1.9 1.9 2.1-2.1v5.6Z"></path>
</symbol>`);

        this.setting = this.buildSettingPanel();
        window.addEventListener("paste", this.pasteHandler, true);
    }

    onunload() {
        window.removeEventListener("paste", this.pasteHandler, true);
    }

    private buildSettingPanel() {
        const elements: Record<keyof OssSettings, HTMLInputElement> = {
            accessKeyId: this.createInput(this.settings.accessKeyId),
            accessKeySecret: this.createInput(this.settings.accessKeySecret, "password"),
            endpoint: this.createInput(this.settings.endpoint),
            bucket: this.createInput(this.settings.bucket),
            path: this.createInput(this.settings.path),
        };

        const setting = new Setting({
            confirmCallback: () => {
                this.settings = this.normalizeSettings({
                    accessKeyId: elements.accessKeyId.value.trim(),
                    accessKeySecret: elements.accessKeySecret.value.trim(),
                    endpoint: elements.endpoint.value.trim(),
                    bucket: elements.bucket.value.trim(),
                    path: elements.path.value.trim(),
                });
                this.saveData(STORAGE_NAME, this.settings).then(() => {
                    showMessage(this.i18n.settingsSaved);
                });
            },
        });

        const helpButton = document.createElement("button");
        helpButton.className = "b3-button b3-button--outline fn__flex-center ali-oss-uploader__help";
        helpButton.textContent = this.i18n.helpLink;
        helpButton.addEventListener("click", () => {
            window.open(HELP_URL, "_blank", "noopener,noreferrer");
        });
        setting.addItem({
            title: this.i18n.helpTitle,
            description: this.i18n.helpDesc,
            actionElement: helpButton,
        });

        this.addSettingItem(setting, "accessKeyId", "accessKeyIdDesc", elements.accessKeyId);
        this.addSettingItem(setting, "accessKeySecret", "accessKeySecretDesc", elements.accessKeySecret);
        this.addSettingItem(setting, "endpoint", "endpointDesc", elements.endpoint);
        this.addSettingItem(setting, "bucket", "bucketDesc", elements.bucket);
        this.addSettingItem(setting, "path", "pathDesc", elements.path);

        return setting;
    }

    private async handlePaste(event: Event) {
        const clipboardEvent = event as ClipboardEvent;
        if (this.isUploading) {
            return;
        }
        const files = this.getImageFiles(clipboardEvent);
        if (files.length === 0 || !this.hasRequiredSettings()) {
            return;
        }

        const protyle = this.getActiveProtyle();
        if (!protyle) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.isUploading = true;

        try {
            showMessage(this.i18n.uploading.replace("${count}", String(files.length)), 4000);
            const results: UploadResult[] = [];
            for (const file of files) {
                results.push(await this.uploadFile(file));
            }
            const markdown = results.map((result) => {
                const alt = this.escapeMarkdownAlt(result.filename);
                return `![${alt}](${result.url})`;
            }).join("\n");
            protyle.insert(markdown);
            showMessage(this.i18n.uploadSuccess.replace("${count}", String(results.length)));
        } catch (error) {
            console.error("[siyuan-alioss-image-uploader] upload failed", error);
            showMessage(`${this.i18n.uploadFailed}: ${this.getErrorMessage(error)}`, 7000, "error");
        } finally {
            this.isUploading = false;
        }
    }

    private async uploadFile(file: File): Promise<UploadResult> {
        const client = new OSS({
            accessKeyId: this.settings.accessKeyId,
            accessKeySecret: this.settings.accessKeySecret,
            bucket: this.settings.bucket,
            endpoint: this.trimProtocol(this.settings.endpoint),
            secure: true,
        });
        const key = this.buildObjectKey(file);
        const result = await client.put(key, file, {
            headers: {
                "Content-Type": file.type || "application/octet-stream",
            },
        });

        return {
            key,
            filename: file.name || key.split("/").pop() || "image",
            url: this.buildPublicUrl(key, result.url),
        };
    }

    private getImageFiles(event: ClipboardEvent) {
        const items = Array.from(event.clipboardData?.items ?? []);
        return items
            .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));
    }

    private getActiveProtyle(): Protyle | undefined {
        const editors = getAllEditor() as unknown as Protyle[];
        const activeElement = document.activeElement;
        const activeEditor = editors.find((editor) => {
            const wysiwygElement = editor.protyle?.wysiwyg?.element;
            return activeElement && wysiwygElement?.contains(activeElement);
        });
        return activeEditor ?? editors[0];
    }

    private buildObjectKey(file: File) {
        const prefix = this.trimSlashes(this.settings.path);
        const extension = this.getExtension(file);
        const baseName = this.sanitizeFilename(file.name ? file.name.replace(/\.[^.]+$/, "") : "pasted-image");
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const filename = `${baseName || "pasted-image"}-${suffix}.${extension}`;
        return [prefix, filename].filter(Boolean).join("/");
    }

    private buildPublicUrl(key: string, sdkUrl?: string) {
        if (sdkUrl) {
            return sdkUrl;
        }
        const endpoint = this.trimProtocol(this.settings.endpoint);
        return `https://${this.settings.bucket}.${endpoint}/${encodeURI(key)}`;
    }

    private hasRequiredSettings() {
        return Boolean(
            this.settings.accessKeyId &&
            this.settings.accessKeySecret &&
            this.settings.bucket &&
            this.settings.endpoint
        );
    }

    private normalizeSettings(value: Partial<OssSettings> | undefined): OssSettings {
        return {
            ...DEFAULT_SETTINGS,
            ...(value ?? {}),
            path: this.normalizePath(value?.path ?? DEFAULT_SETTINGS.path),
        };
    }

    private addSettingItem(setting: Setting, titleKey: string, descKey: string, element: HTMLElement) {
        setting.addItem({
            title: this.i18n[titleKey],
            description: this.i18n[descKey],
            actionElement: element,
        });
    }

    private createInput(value: string, type = "text") {
        const element = document.createElement("input");
        element.className = "b3-text-field fn__block ali-oss-uploader__input";
        element.type = type;
        element.value = value;
        return element;
    }

    private getExtension(file: File) {
        const byName = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1];
        if (byName) {
            return byName.toLowerCase();
        }
        const byType = file.type.split("/")[1];
        return (byType || "png").replace("jpeg", "jpg").toLowerCase();
    }

    private sanitizeFilename(value: string) {
        return value
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9._-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^[-_.]+|[-_.]+$/g, "");
    }

    private trimSlashes(value: string) {
        return value.replace(/^\/+|\/+$/g, "");
    }

    private normalizePath(value: string) {
        const trimmed = this.trimSlashes(value.trim());
        return trimmed ? `${trimmed}/` : "";
    }

    private trimProtocol(value: string) {
        return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    }

    private escapeMarkdownAlt(value: string) {
        return value.replace(/[[\]\\]/g, "\\$&");
    }

    private getErrorMessage(error: unknown) {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}
