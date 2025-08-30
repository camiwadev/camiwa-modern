// src/app/adapters/pb-upload.adapter.ts
import { FilePickerAdapter, FilePreviewModel, UploadResponse, UploadStatus } from 'ngx-awesome-uploader';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { GlobalService } from '../services/global.service';

type Purpose = 'certificate' | 'identity' | 'avatar' | 'other';

export class PocketbaseUploadAdapter implements FilePickerAdapter {

  constructor(
    private global: GlobalService,
    private opts: {
      collection?: string;     // por defecto 'images'
      fileField?: string;      // por defecto 'file'
      purpose?: Purpose;       // meta opcional
      onSaved?: (url: string, record: any) => void; // callback para setear en el form
    } = {}
  ) {}

  uploadFile(fileItem: FilePreviewModel): Observable<UploadResponse> {
        const collection = this.opts.collection ?? 'images';
    const fileField  = this.opts.fileField  ?? 'file';
    const purpose    = this.opts.purpose    ?? 'other';

    const fd = new FormData();
    // campo file de la colección
    fd.append(fileField, fileItem.file as File);
    // metadatos opcionales (ajusta a tu schema si existen)
    try { if (this.global.userId) fd.append('ownerId', this.global.userId); } catch {}
    fd.append('purpose', purpose);

    return from(this.global.pb.collection(collection).create(fd)).pipe(
      map((rec: any) => {
        // nombre del archivo según tu schema
        const fileName = Array.isArray(rec[fileField]) ? rec[fileField][0] : rec[fileField];
        const url = this.global.pb.getFileUrl(rec, fileName);

        // notificar al componente para setear el form
        this.opts.onSaved?.(url, rec);

        // respuesta requerida por ngx-awesome-uploader
        const resp: UploadResponse = {
          body: { id: rec.id, url, fileName },
          status: UploadStatus.UPLOADED   // <-- antes: 200
                  };
        return resp;
      })
    );
  }

  removeFile(fileItem: FilePreviewModel): Observable<any> {
    // si guardaste el id en body al subir, puedes borrarlo
    const id = (fileItem.uploadResponse?.body as any)?.id;
    if (!id) return from(Promise.resolve(true));
    const collection = this.opts.collection ?? 'images';
    return from(this.global.pb.collection(collection).delete(id));
  }
}
