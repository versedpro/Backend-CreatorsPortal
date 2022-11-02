import * as path from 'path';

import * as aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

import multer from 'multer';
import { awsConfig } from '../../constants';
import { Logger } from '../Logger';
import fs from 'fs';
import { dimensionMap, ImageSize, resizeImage, S3UploadMultipleResponse } from '../image.resizer';

aws.config.update({
  secretAccessKey: awsConfig.secretAccessKey,
  accessKeyId: awsConfig.accessKeyId,
  region: awsConfig.region,
});

const s3 = new aws.S3();


export const s3UploadSingle = async (file: Express.Multer.File, folder: string, name?: string, buffer?: Buffer): Promise<string> => {
  const fileExtension = path.extname(file.originalname);
  name = name || `${Date.now().toString()}_${uuidv4()}`;
  const params = {
    Bucket: awsConfig.s3BucketName,
    ACL: 'public-read',
    Key: `${folder}/${name}${fileExtension}`, // File name you want to save as in S3
    Body: buffer || fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  // Uploading files to the bucket
  const data = await s3.upload(params).promise();
  console.log(`File uploaded successfully at ${data.Location}`);
  fs.unlinkSync(file.path);
  return data.Location;
};


export const s3UploadOne = async (file: Express.Multer.File, folder: string, name?: string, buffer?: Buffer): Promise<string> => {
  const fileExtension = path.extname(file.originalname);
  name = name || `${Date.now().toString()}_${uuidv4()}`;
  const params = {
    Bucket: awsConfig.s3BucketName,
    ACL: 'public-read',
    Key: `${folder}/${name}${fileExtension}`, // File name you want to save as in S3
    Body: buffer || fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  // Uploading files to the bucket
  const data = await s3.upload(params).promise();
  console.log(`File uploaded successfully at ${data.Location}`);
  return data.Location;
};

export const s3UploadSingleAllResolutions = async (file: Express.Multer.File, folder: string, name?: string): Promise<S3UploadMultipleResponse> => {
  const original = await s3UploadOne(file, folder, name);

  const buffer256 = await resizeImage(file, ImageSize.IMAGE_256);
  const image256 = await s3UploadOne(file, folder, `${name}_${dimensionMap.get(ImageSize.IMAGE_256)}x${dimensionMap.get(ImageSize.IMAGE_256)}`, buffer256);

  const buffer512 = await resizeImage(file, ImageSize.IMAGE_512);
  const image512 = await s3UploadOne(file, folder, `${name}_${dimensionMap.get(ImageSize.IMAGE_512)}x${dimensionMap.get(ImageSize.IMAGE_512)}`, buffer512);

  const buffer64 = await resizeImage(file, ImageSize.IMAGE_64);
  const image64 = await s3UploadOne(file, folder, `${name}_${dimensionMap.get(ImageSize.IMAGE_64)}x${name}_${dimensionMap.get(ImageSize.IMAGE_64)}`, buffer64);

  return {
    original,
    image256,
    image512,
    image64,
  };
};

export const s3DeleteSingle = async (fileUrl: string) => {
  // Uploading files to the bucket
  const fileUrlSplit = fileUrl.toString().split('/');
  const params = {
    Bucket: awsConfig.s3BucketName,
    Key: fileUrlSplit.slice(fileUrlSplit.length - 2, fileUrlSplit.length).join('/'),
  };
  try {
    await s3.deleteObject(params).promise();
    Logger.Info(`File ${fileUrl} deleted successfully`);

  } catch (s3Err: any) {
    Logger.Error(`File ${fileUrl} not deleted`);
    Logger.Error(s3Err);
  }
};

export const uploadToS3 = async (folder: string, files: any[]): Promise<Map<string, string>> => {
  const resultMap = new Map<string, string>();
  for (const file of files) {
    const uploadLocation = await s3UploadSingle(file, folder);
    resultMap.set(file.fieldname, uploadLocation);
  }
  return resultMap;
};

export const deleteMultipleFromS3 = async (fileUrls: string[]) => {
  for (const url of fileUrls) {
    await s3DeleteSingle(url);
  }
};

const fileFilter = (req: any, file: any, cb: Function) => {
  if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png' && file.mimetype !== 'image/gif') {
    cb(new Error('Invalid file type, only JPEG and PNG is allowed'), false);
  } else if (file.size > 15728640) {
    cb(new Error('A single file cannot be larger than 15 MB'), false);
  } else {
    cb(null, true);
  }
};

const collectionAssetFilter = (req: any, file: any, cb: Function) => {
  if (!['image/jpeg', 'image/png', 'image/gif', 'video/mp4'].includes(file.mimetype)) {
    cb(new Error('Invalid file type, only JPEG, PNG, GIF, and MP4 is allowed'), false);
  } else if (file.size > 15728640) {
    cb(new Error('A single file cannot be larger than 15 MB'), false);
  } else {
    cb(null, true);
  }
};

export const multerUpload = multer({
  fileFilter,
  dest: 'uploads/',
});

export const collectionAssetMulterUpload = multer({
  fileFilter: collectionAssetFilter,
  dest: 'uploads/',
});
