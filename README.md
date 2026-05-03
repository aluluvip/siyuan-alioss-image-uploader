# Aliyun OSS Image Uploader

English | [简体中文](README_zh_CN.md)

> Automatically upload images pasted into SiYuan notes to Aliyun OSS and insert remote image links at the cursor.

## Features

- Upload pasted screenshots, clipboard images, or dropped local images to Aliyun OSS
- Insert Markdown image links after upload succeeds
- Support custom OSS object path prefix
- Built-in guide link for finding OSS parameters
- Keep SiYuan's default paste behavior when the plugin is not configured

## Usage

1. Install and enable the plugin.
2. Open plugin settings and fill in `AccessKeyId`, `AccessKeySecret`, `Endpoint`, `Bucket`, and `Path`.
3. Configure CORS for your OSS bucket.
4. Paste a screenshot or clipboard image into the SiYuan editor, or drop a local image into the document.
5. The plugin uploads the image and inserts a Markdown image link:

```markdown
![image.png](https://your-bucket.oss-cn-beijing.aliyuncs.com/img/image-123.png)
```

## Settings

| Field | Description | Example |
| --- | --- | --- |
| `AccessKeyId` | Aliyun AccessKey ID | `LTAI...` |
| `AccessKeySecret` | Aliyun AccessKey Secret | `******` |
| `Endpoint` | OSS public endpoint, without protocol | `oss-cn-beijing.aliyuncs.com` |
| `Bucket` | Target OSS bucket name | `my-image-bucket` |
| `Path` | Optional object path prefix | `img/` |

Guide for finding these parameters:  
[Build an image hosting service with Aliyun OSS](https://blog.luluvip.cn/2021/11/09/%E6%8A%98%E8%85%BE%E7%AF%87%EF%BC%9A%E7%94%A8%E9%98%BF%E9%87%8C%E4%BA%91OSS%E6%90%AD%E5%BB%BA%E5%9B%BE%E5%BA%8A/)

## CORS

Add a CORS rule to your OSS bucket:

| Option | Suggested value |
| --- | --- |
| Origin | `*` for testing, restrict it for regular use |
| Method | `PUT` |
| Header | `*` |
| Expose Header | `ETag` |

If upload fails, check CORS, AccessKey permission, Bucket, and Endpoint first.

## Security

The plugin runs in the local frontend environment. Credentials are stored in local plugin data. Use a RAM user with minimum write permission for the target bucket and path. Do not use root account credentials.

Rotate any AccessKey that has ever been committed to a public repository.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The build generates `package.zip` for GitHub Releases and SiYuan marketplace publishing.

## License

MIT
