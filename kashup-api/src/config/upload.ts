import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Déterminer le type depuis le body ou l'URL (req.path = chemin relatif au router, utiliser baseUrl/originalUrl pour les routes montées)
    const pathForType = [req.path, req.url, req.baseUrl, req.originalUrl].filter(Boolean).join(' ');
    let type = 'general';
    let partnerId: string | undefined;

    if (req.body?.type) {
      type = req.body.type;
    } else if (pathForType.includes('partner')) {
      type = 'partners';
      // Si c'est une mise à jour, utiliser l'ID du partenaire depuis les params ou l'URL
      if (req.params?.id) {
        partnerId = req.params.id;
      } else if (req.body?.partnerId) {
        partnerId = req.body.partnerId;
      } else {
        // Extraire l'ID depuis l'URL (ex: /partners/cmj8sdmge00014y78309dqsye ou /api/v1/partners/cmj8sdmge00014y78309dqsye)
        const urlToMatch = req.originalUrl || req.url || req.baseUrl || '';
        const patterns = [
          /\/partners\/([^\/\?]+)/,  // /partners/:id ou /api/v1/partners/:id
          /\/partners\/([a-zA-Z0-9_-]+)/,  // ID avec caractères alphanumériques
        ];
        for (const pattern of patterns) {
          const match = urlToMatch.match(pattern);
          if (match && match[1]) {
            partnerId = match[1];
            console.log(`[Multer] ID extrait depuis l'URL: ${partnerId} (pattern: ${pattern})`);
            break;
          }
        }
        
        if (!partnerId) {
          console.warn(`[Multer] Impossible d'extraire partnerId depuis l'URL: ${req.url}`);
        }
      }
    } else if (pathForType.includes('offer')) {
      type = 'offers';
    } else if (pathForType.includes('reward')) {
      type = 'rewards';
    } else if (pathForType.includes('gift-card')) {
      type = 'gift-cards';
    } else if (pathForType.includes('donation')) {
      type = 'donations';
    } else if (pathForType.includes('home-banner')) {
      type = 'home-banners';
    } else if (pathForType.includes('documents')) {
      type = 'documents';
      if (req.params?.id) partnerId = req.params.id;
    }
    
    // Pour les partenaires, créer un dossier temporaire (uploads/partners)
    // Les fichiers seront déplacés vers uploads/partners/:id après création
    // Pour les mises à jour (PATCH/PUT), utiliser uploads/partners/:id directement
    let typeDir: string;
    if (type === 'partners' && partnerId && (req.method === 'PATCH' || req.method === 'PUT')) {
      // Pour PATCH/PUT, utiliser le dossier du partenaire
      typeDir = path.join(uploadsDir, type, partnerId);
      console.log(`[Multer] ✅ Destination pour PATCH/PUT: ${typeDir}`);
      console.log(`[Multer]   - partnerId: ${partnerId}`);
      console.log(`[Multer]   - method: ${req.method}`);
      console.log(`[Multer]   - path: ${req.path}`);
      console.log(`[Multer]   - url: ${req.url}`);
      console.log(`[Multer]   - params:`, req.params);
    } else if (type === 'partners' && !partnerId && (req.method === 'PATCH' || req.method === 'PUT')) {
      // Si c'est PATCH/PUT mais qu'on n'a pas l'ID, utiliser le dossier temporaire et logger un avertissement
      typeDir = path.join(uploadsDir, type);
      console.warn(`[Multer] ⚠️ PATCH/PUT détecté mais partnerId non trouvé, utilisation du dossier temporaire: ${typeDir}`);
      console.warn(`[Multer]   - method: ${req.method}, path: ${req.path}, url: ${req.url}, params:`, req.params);
    } else if (type === 'documents' && partnerId) {
      // Documents partenaire : uploads/partners/:id/documents
      typeDir = path.join(uploadsDir, 'partners', partnerId, 'documents');
    } else {
      // Pour POST, utiliser le dossier temporaire (sera déplacé après création)
      typeDir = path.join(uploadsDir, type);
      console.log(`[Multer] Destination pour POST: ${typeDir}, method: ${req.method}, path: ${req.path}, url: ${req.url}`);
    }
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
      console.log(`[Multer] Dossier créé: ${typeDir}`);
    } else {
      console.log(`[Multer] Dossier existe déjà: ${typeDir}`);
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    const validImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extFromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const ext =
      validImageExts.includes(extFromName)
        ? extFromName
        : isImage
          ? (extFromMime[file.mimetype] || '.jpg')
          : extFromName || '';
    const uniqueName = `${randomUUID()}${ext}`;
    console.log(`[Multer] Nom de fichier généré: ${uniqueName} pour ${file.fieldname}, original: ${file.originalname}, mimetype: ${file.mimetype}`);
    cb(null, uniqueName);
  },
});

// Filtre pour accepter les images et les PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'application/pdf' // Pour les fichiers KBIS
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: images (JPEG, PNG, WebP, GIF) et PDF.`));
  }
};

// Filtre pour bannières accueil : champ 'image' = images, champ 'video' = vidéos
const homeBannerFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (file.fieldname === 'image' && imageMimes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'video' && videoMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type non autorisé: ${file.fieldname} accepte ${file.fieldname === 'image' ? 'images (JPEG, PNG, WebP, GIF)' : 'vidéos (MP4, WebM, MOV)'}. Reçu: ${file.mimetype}`));
  }
};

// Filtre pour documents partenaire : PDF, images, vidéos, Office
const documentFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: PDF, images, vidéos (MP4, WebM, MOV), DOC/DOCX.`));
  }
};

// Filtre strict pour n'accepter que le champ "logo" (images uniquement)
const logoFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Vérifier que le champ s'appelle bien "logo"
  if (file.fieldname !== 'logo') {
    return cb(new Error(`Champ de fichier inattendu: "${file.fieldname}". Seul le champ "logo" est autorisé pour POST /partners.`));
  }
  
  // Vérifier que c'est une image
  const allowedImageMimes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif'
  ];
  
  if (allowedImageMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé pour logo: ${file.mimetype}. Types acceptés: images (JPEG, PNG, WebP, GIF).`));
  }
};

// Configuration multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Configuration multer pour POST /partners (logo uniquement)
export const uploadLogoOnly = multer({
  storage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Configuration multer pour documents partenaire (PDF, images, vidéos, DOC/DOCX)
export const uploadDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (vidéos)
  }
});

// Configuration multer pour bannières accueil : image + vidéo (upload fichier, pas URL)
export const uploadHomeBanner = multer({
  storage,
  fileFilter: homeBannerFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (vidéos)
  }
});

// Wrapper pour capturer les erreurs Multer et les passer au middleware d'erreur
const wrapMulter = (multerMiddleware: any) => {
  return (req: any, res: any, next: any) => {
    // S'assurer que la réponse sera en JSON même si Multer échoue
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Intercepter res.send pour forcer JSON
    res.send = function(body: any) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        // Si le body n'est pas du JSON, le convertir
        if (typeof body !== 'string' || !body.startsWith('{')) {
          body = JSON.stringify({
            data: null,
            error: {
              message: typeof body === 'string' ? body : 'Erreur serveur',
              details: { code: 'MULTER_ERROR' }
            },
            meta: null
          });
        }
      }
      return originalSend.call(this, body);
    };
    
    // Intercepter res.json pour forcer Content-Type
    res.json = function(body: any) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalJson.call(this, body);
    };
    
    // Intercepter res.status pour s'assurer que le Content-Type est JSON
    res.status = function(code: number) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalStatus.call(this, code);
    };
    
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        // Logger l'erreur avant de la passer au middleware
        console.error('❌ Erreur Multer capturée:', {
          message: err.message,
          code: err.code,
          field: err.field,
          name: err.name
        });
        // Passer l'erreur au middleware d'erreur Express
        return next(err);
      }
      next();
    });
  };
};

// Middleware pour un seul fichier
export const uploadSingle = (fieldName: string) => wrapMulter(upload.single(fieldName));

// Middleware pour upload document partenaire (champ 'file')
export const uploadDocumentSingle = () => wrapMulter(uploadDocument.single('file'));

// Middleware pour logo uniquement (POST /partners)
export const uploadLogo = () => wrapMulter(uploadLogoOnly.single('logo'));

// Middleware pour plusieurs fichiers
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => wrapMulter(upload.array(fieldName, maxCount));

// Middleware pour plusieurs champs avec fichiers
export const uploadFields = (fields: multer.Field[]) => wrapMulter(upload.fields(fields));

// Middleware pour bannières accueil : champs 'image' et 'video' (optionnels)
export const uploadHomeBannerFields = () =>
  wrapMulter(uploadHomeBanner.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]));

// Fonction pour obtenir l'URL publique d'un fichier
export const getFileUrl = (filePath: string, baseUrl?: string): string => {
  // En production, vous devriez utiliser une URL CDN ou S3
  // Pour l'instant, on retourne une URL relative ou absolue selon baseUrl
  
  // Normaliser le chemin (supprimer le chemin absolu si présent)
  let normalizedPath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
  
  // Supprimer les slashes en début de chaîne
  normalizedPath = normalizedPath.replace(/^\/+/, '');
  
  // Si le chemin commence déjà par uploads/, ne pas ajouter /uploads/ devant
  // Éviter la duplication uploadsuploads
  let relativeUrl: string;
  if (normalizedPath.startsWith('uploads/')) {
    relativeUrl = `/${normalizedPath}`;
  } else if (normalizedPath.startsWith('/uploads/')) {
    // Si le chemin commence déjà par /uploads/, le garder tel quel
    relativeUrl = normalizedPath;
  } else {
    // Sinon, ajouter /uploads/ devant
    relativeUrl = `/uploads/${normalizedPath}`;
  }
  
  // S'assurer qu'il n'y a pas de duplication uploadsuploads
  relativeUrl = relativeUrl.replace(/\/uploadsuploads\//g, '/uploads/');
  
  // Si baseUrl est fourni, retourner une URL absolue
  if (baseUrl) {
    // S'assurer que baseUrl ne se termine pas par un slash
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    return `${cleanBaseUrl}${relativeUrl}`;
  }
  
  // Sinon, retourner une URL relative (sera résolue par rapport à l'origine de l'API)
  return relativeUrl;
};

// Fonction pour supprimer un fichier
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
  }
};

