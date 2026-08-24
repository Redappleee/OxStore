import {useState} from 'react';import {Link,useNavigate,useParams} from 'react-router-dom';import api,{setAccessToken} from '../api';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function GoogleBtn({label}){
  return (
    <a
      href={`${API}/auth/google`}
      style={{
        display:'flex',alignItems:'center',justifyContent:'center',gap:10,
        width:'100%',border:'1px solid var(--line)',background:'#fff',
        padding:'13px 16px',cursor:'pointer',textDecoration:'none',
        color:'var(--ink)',fontSize:14,fontWeight:500,marginBottom:16,
        transition:'background 0.15s',
      }}
      onMouseEnter={e=>e.currentTarget.style.background='#f3f1ed'}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.2H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.8z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.2C9.6 35.6 16.3 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.2H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C42.5 36.2 44 30.5 44 24c0-1.3-.1-2.6-.4-3.8z"/>
      </svg>
      {label}
    </a>
  );
}

function Divider(){
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0 20px'}}>
      <div style={{flex:1,borderTop:'1px solid var(--line)'}}/>
      <span style={{fontSize:12,color:'var(--muted)'}}>or</span>
      <div style={{flex:1,borderTop:'1px solid var(--line)'}}/>
    </div>
  );
}

export function Login({setUser}){
  const [form,setForm]=useState({email:'',password:''}),[message,setMessage]=useState(''),nav=useNavigate();
  const submit=async e=>{e.preventDefault();try{const {data}=await api.post('/auth/login',form);setAccessToken(data.accessToken);setUser(data.user);nav('/')}catch(e){setMessage(e.response?.data?.message||'Could not sign in')}};
  const resend=async()=>{if(!form.email)return setMessage('Enter your email address first.');try{setMessage((await api.post('/auth/resend-verification',{email:form.email})).data.message)}catch{setMessage('Unable to resend verification email.')}};
  return (
    <Auth title="Welcome back">
      <GoogleBtn label="Continue with Google"/>
      <Divider/>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" required onChange={e=>setForm({...form,email:e.target.value})}/>
        <input type="password" placeholder="Password" required onChange={e=>setForm({...form,password:e.target.value})}/>
        <button className="button wide">Sign in</button>
        {message&&<p>{message}</p>}
        <button className="link" type="button" onClick={resend}>Resend verification email</button>
        <Link to="/forgot-password">Forgot password?</Link>
        <p>New here? <Link to="/register">Create an account</Link></p>
      </form>
    </Auth>
  );
}

export function Register(){
  const [form,setForm]=useState({name:'',email:'',password:''}),[message,setMessage]=useState('');
  const submit=async e=>{e.preventDefault();try{setMessage((await api.post('/auth/register',form)).data.message)}catch(e){setMessage(e.response?.data?.message||'Could not register')}};
  return (
    <Auth title="Create your account">
      <GoogleBtn label="Sign up with Google"/>
      <Divider/>
      <form onSubmit={submit}>
        {[['name','Your name','text'],['email','Email','email'],['password','Password (8+ characters)','password']].map(([k,p,t])=><input key={k} type={t} placeholder={p} minLength={k==='password'?8:undefined} required onChange={e=>setForm({...form,[k]:e.target.value})}/>)}
        <button className="button wide">Join OxStore</button>
        {message&&<p>{message}</p>}
        <p>Already a member? <Link to="/login">Sign in</Link></p>
      </form>
    </Auth>
  );
}

export function Forgot(){
  const [email,setEmail]=useState(''),[message,setMessage]=useState('');
  return <Auth title="Reset password"><form onSubmit={async e=>{e.preventDefault();setMessage((await api.post('/auth/forgot-password',{email})).data.message)}}><input type="email" placeholder="Email" required onChange={e=>setEmail(e.target.value)}/><button className="button wide">Send reset link</button>{message&&<p>{message}</p>}</form></Auth>;
}

export function Reset(){
  const {token}=useParams(),[password,setPassword]=useState(''),[message,setMessage]=useState('');
  const submit=async e=>{e.preventDefault();try{setMessage((await api.post(`/auth/reset-password/${token}`,{password})).data.message)}catch(e){setMessage(e.response?.data?.message||'Unable to reset password')}};
  return <Auth title="Choose a new password"><form onSubmit={submit}><input type="password" placeholder="New password" minLength="8" required onChange={e=>setPassword(e.target.value)}/><button className="button wide">Reset password</button>{message&&<p>{message}</p>}</form></Auth>;
}

function Auth({title,children}){return <main className="auth"><h1>{title}</h1>{children}</main>}
