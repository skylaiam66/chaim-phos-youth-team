import { supabase } from './supabase';
const buckets = ['homepage','events','projects','shop','library','officials'] as const;
export async function uploadDirectorMedia(bucket: typeof buckets[number], file: File, old?: {path?:string}) {
  if (!supabase) throw new Error('Configure Supabase before uploading shared media.');
  if (!buckets.includes(bucket)) throw new Error('This media bucket is not permitted.');
  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();
  if(old?.path){const {error:removeError}=await supabase.storage.from(bucket).remove([old.path]);if(removeError)throw new Error(`Could not remove old media: ${removeError.message}`)}
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type || 'application/octet-stream'});
  if (error) throw error;
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { bucket, path, url, name:file.name, mimeType:file.type, version:crypto.randomUUID(), updatedAt:new Date().toISOString() };
}
export async function compressLocalImage(file: File, maxBytes=100*1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file); let scale = Math.min(1,900/Math.max(bitmap.width,bitmap.height));
  for(let pass=0;pass<6;pass++,scale*=.78){
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('Image processing is unavailable.')}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(let q=.84;q>=.18;q-=.11){const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not compress image.')),'image/jpeg',q));if(blob.size<=maxBytes){bitmap.close();return blob;}}
  }
  bitmap.close();throw new Error('Choose a smaller image; it could not be compressed below 100KB.');
}
export function blobToDataUrl(blob: Blob): Promise<string> { return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);}); }
