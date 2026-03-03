import path from 'path';
import { Request, Response } from 'express';

export const serveAdminApp = (_req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../../public/admin/index.html');
  res.sendFile(filePath);
};


