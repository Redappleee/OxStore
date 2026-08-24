import axios from 'axios';
const api=axios.create({baseURL:process.env.REACT_APP_API_URL||'http://localhost:5001/api',withCredentials:true});let accessToken=null,refreshing=null;
export const setAccessToken=t=>{accessToken=t};
api.interceptors.request.use(c=>{if(accessToken)c.headers.Authorization=`Bearer ${accessToken}`;return c});
api.interceptors.response.use(r=>r,async error=>{const req=error.config;if(error.response?.status===401&&!req._retried&&!req.url.includes('/auth/refresh')){req._retried=true;try{refreshing||=(async()=>{const {data}=await api.post('/auth/refresh');setAccessToken(data.accessToken);return data})().finally(()=>refreshing=null);await refreshing;req.headers.Authorization=`Bearer ${accessToken}`;return api(req)}catch(e){setAccessToken(null)}}return Promise.reject(error)});
export default api;
