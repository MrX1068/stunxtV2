export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum StorageProvider {
  CLOUDINARY = 'cloudinary',
  AWS_S3 = 's3',
  LOCAL = 'local',
}

export enum FilePrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PROTECTED = 'protected',
}

export enum FileCategory {
  PROFILE = 'profile',
  DOCUMENT = 'document',
  MEDIA = 'media',
  ATTACHMENT = 'attachment',
  AVATAR = 'avatar',
  BANNER = 'banner',
  CONTENT = 'content',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VariantType {
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
  WEBP = 'webp',
  AVIF = 'avif',
  COMPRESSED = 'compressed',
}

export enum UploadSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
