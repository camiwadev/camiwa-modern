import { FilePreviewModel } from 'ngx-awesome-uploader';
import { Observable, from, map } from 'rxjs';
import { FilePickerAdapter } from 'ngx-awesome-uploader';
import { GlobalService } from './services/global.service';
import PocketBase from 'pocketbase';
import { HttpClient } from '@angular/common/http';
export class CertificatesAdapter extends FilePickerAdapter {
  image:any="";
  constructor(
    private http: HttpClient,
    public global:GlobalService
  ) {
    super();
  }
  public uploadFile(fileItem: FilePreviewModel) {
    // Instancia de PocketBase
    const pb = new PocketBase('https://db.camiwa.com:250');
    const formData = new FormData();
    formData.append('image', fileItem.file);
    formData.append('type', 'certificado'); // Cambia esto según el tipo de archivo
    // Si tienes el userId disponible, agrégalo aquí
    if (this.global?.userId) {
      formData.append('userId', this.global.userId);
    }
    return from(
      pb.collection('images').create(formData)
    ).pipe(
      map((res: any) => {
        this.global.newImage = true;
        const imageUrl = `https://db.camiwa.com:250/api/files/${res.collectionId}/${res.id}/${res.image}`;
        this.global.certificates.push(imageUrl);
        this.global.newUploaderImage = true;
        return res.id;
      })
    );
  }
  public removeFile(fileItem: any): Observable<any> {
    console.log(fileItem);
    const removeApi = 'https://db.camiwa.com:250/api/files/' + fileItem.id;
    return this.http.delete(removeApi);
  }
}