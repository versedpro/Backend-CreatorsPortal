import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { UploadFilesData } from '../interfaces/organization';

/**
 * Handles undefined route errors
 * @param req Express request
 * @param res Express response
 * @param next Next Function
 */
export async function cleanUpMulterFiles(req: Request, res: Response, next: NextFunction) {
  res.on('end', () => {

  });
  next();
}

export async function cleanupFiles(req: Request) {
  if (req.files?.length !== undefined) {
    for (const file of (req.files as Express.Multer.File[])) {
      deleteFileIfExists(file.path);
    }
  } else if (req.files) {
    const filesMap = (req.files as UploadFilesData);
    for (const fileList of Object.values(filesMap)) {
      for (const file of fileList) {
        deleteFileIfExists(file.path);
      }
    }
  }
}
async function deleteFileIfExists(path: string) {
  try {
    await fs.unlinkSync(path);
    // eslint-disable-next-line no-empty
  } catch (e) {}
}
