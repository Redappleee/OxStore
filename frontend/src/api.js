import axios from 'axios';
const api=axios.create({baseURL:process.env.REACT_APP_API_URL||'http://localhost:5001/api',withCredentials:true});
let accessToken=localStorage.getItem('oxstore_access_token')||null,refreshing=null;

export const setAccessToken=t=>{
  accessToken=t;
  if(t){ localStorage.setItem('oxstore_access_token',t); }
  else { localStorage.removeItem('oxstore_access_token'); }
};

export const setUserSession=(u)=>{
  if(u){ localStorage.setItem('oxstore_user',JSON.stringify(u)); }
  else { localStorage.removeItem('oxstore_user'); }
};

api.interceptors.request.use(c=>{if(accessToken)c.headers.Authorization=`Bearer ${accessToken}`;return c});
api.interceptors.response.use(r=>r,async error=>{const req=error.config;if(error.response?.status===401&&!req._retried&&!req.url.includes('/auth/refresh')){req._retried=true;try{refreshing||=(async()=>{const {data}=await api.post('/auth/refresh');setAccessToken(data.accessToken);setUserSession(data.user);return data})().finally(()=>refreshing=null);await refreshing;req.headers.Authorization=`Bearer ${accessToken}`;return api(req)}catch(e){setAccessToken(null);setUserSession(null)}}return Promise.reject(error)});
export default api;
