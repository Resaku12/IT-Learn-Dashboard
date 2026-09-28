import type { ConfigurationData, Dashboard, StoredFile } from '../types';
const headers = {'Content-Type':'application/json'};
async function request<T>(url:string, init?:RequestInit):Promise<T>{
  const res=await fetch(url,init);
  if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error((data as {error?:string}).error||'Die Daten konnten nicht gespeichert werden. Bitte versuche es erneut.')}
  return res.json() as Promise<T>;
}
export const api={
  dashboard:()=>request<Dashboard>('/api/dashboard'),
  configuration:()=>request<ConfigurationData>('/api/configuration'),
  saveConfiguration:(data:unknown)=>request('/api/configuration',{method:'PUT',headers,body:JSON.stringify(data)}),
  create:<T>(resource:string,data:unknown)=>request<T>(`/api/${resource}`,{method:'POST',headers,body:JSON.stringify(data)}),
  update:<T>(resource:string,id:number,data:unknown)=>request<T>(`/api/${resource}/${id}`,{method:'PUT',headers,body:JSON.stringify(data)}),
  remove:(resource:string,id:number)=>request<{ok:boolean}>(`/api/${resource}/${id}`,{method:'DELETE'}),
  saveRelations:(type:string,id:number,ids:number[])=>request(`/api/relations/${type}/${id}`,{method:'PUT',headers,body:JSON.stringify({ids})}),
  files:(query='')=>request<StoredFile[]>(`/api/files${query?'?'+query:''}`),
  updateFile:(id:number,data:unknown)=>request<StoredFile>(`/api/files/${id}`,{method:'PUT',headers,body:JSON.stringify(data)}),
  search:(q:string)=>request<Record<string,unknown[]>>(`/api/search?q=${encodeURIComponent(q)}`),
  exportData:()=>request<Record<string,unknown>>('/api/export')
};
