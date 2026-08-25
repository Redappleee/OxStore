import {useEffect,useState} from 'react';import {BrowserRouter,Routes,Route,Navigate,useNavigate} from 'react-router-dom';import {loadStripe} from '@stripe/stripe-js';import {Elements} from '@stripe/react-stripe-js';import api,{setAccessToken} from './api';import {CartProvider} from './context/CartContext';import {WishlistProvider} from './context/WishlistContext';import Navbar from './components/Navbar';import Home from './pages/Home';import Shop from './pages/Shop';import ProductDetail from './pages/ProductDetail';import CartPage from './pages/CartPage';import Checkout from './pages/Checkout';import Wishlist from './pages/Wishlist';import Orders from './pages/Orders';import Profile from './pages/Profile';import {Login,Register,Forgot,Reset} from './pages/Auth';import AdminDashboard from './pages/AdminDashboard';import ProductManager from './pages/ProductManager';
const stripe=loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY||'pk_test_replace_me');
const Protected=({user,children,admin=false})=>user&&( !admin||user.role==='admin')?children:<Navigate to="/login" replace/>;
function WelcomeSplash({ onComplete }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const timer1 = setTimeout(() => setFading(true), 700);
    const timer2 = setTimeout(onComplete, 1100);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onComplete]);

  return (
    <div className={`welcome-splash-overlay${fading ? ' fade-out' : ''}`}>
      <div className="welcome-splash-content">
        <h1 className="welcome-brand">OXSTORE</h1>
        <div className="welcome-line" />
        <p className="welcome-sub">MODERN ESSENTIALS, CONSIDERED</p>
      </div>
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [showSplash,setShowSplash]=useState(true);

  useEffect(()=>{
    api.get('/health').catch(()=>{});
    api.post('/auth/refresh').then(({data})=>{setAccessToken(data.accessToken);setUser(data.user)}).catch(()=>{});
  },[]);

  return (
    <BrowserRouter>
      {showSplash && <WelcomeSplash onComplete={()=>setShowSplash(false)} />}
      <CartProvider><WishlistProvider><Navbar user={user} setUser={setUser}/><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:id" element={<ProductDetail user={user}/>}/><Route path="/cart" element={<CartPage/>}/><Route path="/wishlist" element={<Protected user={user}><Wishlist/></Protected>}/><Route path="/checkout" element={<Protected user={user}><Elements stripe={stripe}><Checkout/></Elements></Protected>}/><Route path="/orders" element={<Protected user={user}><Orders/></Protected>}/><Route path="/profile" element={<Protected user={user}><Profile user={user} setUser={setUser}/></Protected>}/><Route path="/login" element={<Login setUser={setUser}/>}/><Route path="/register" element={<Register/>}/><Route path="/forgot-password" element={<Forgot/>}/><Route path="/reset-password/:token" element={<Reset/>}/><Route path="/verify-email/:token" element={<Verify/>}/><Route path="/auth/callback" element={<OAuthCallback setUser={setUser}/>}/><Route path="/admin" element={<Protected user={user} admin><AdminDashboard/></Protected>}/><Route path="/admin/products" element={<Protected user={user} admin><ProductManager/></Protected>}/></Routes><footer>© 2026 OXSTORE <span>Modern essentials, considered.</span></footer></WishlistProvider></CartProvider>
    </BrowserRouter>
  );
}
function Verify(){const [m,setM]=useState('Verifying your email…');useEffect(()=>{const token=window.location.pathname.split('/').pop();api.get(`/auth/verify-email/${token}`).then(r=>setM(r.data.message)).catch(e=>setM(e.response?.data?.message||'Verification failed'))},[]);return <main className="auth"><h1>{m}</h1></main>}
function OAuthCallback({setUser}){const nav=useNavigate();useEffect(()=>{const p=new URLSearchParams(window.location.search);const token=p.get('token');if(!token){nav('/login');return;}setAccessToken(token);setUser({id:p.get('id'),name:p.get('name'),email:p.get('email'),role:p.get('role'),avatar:p.get('avatar')||''});nav('/')},[]);return <div className="loader">OXSTORE</div>}
