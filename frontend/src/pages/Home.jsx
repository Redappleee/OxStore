import {Link} from 'react-router-dom';import {useEffect,useState} from 'react';import api from '../api';import ProductCard from '../components/ProductCard';
export default function Home(){
  const getCached=()=>{ try{ return JSON.parse(localStorage.getItem('oxstore_cached_home_products')||'[]'); }catch{ return []; } };
  const [products,setProducts]=useState(getCached);
  const [offline,setOffline]=useState(false);

  useEffect(()=>{
    api.get('/products',{params:{limit:4,sort:'newest'}}).then(r=>{
      setProducts(r.data.products);
      setOffline(false);
      try{ localStorage.setItem('oxstore_cached_home_products',JSON.stringify(r.data.products)); }catch{}
    }).catch(()=>{
      if(!getCached().length) setOffline(true);
    });
  },[]);

  return <><section className="hero"><div><p>THE AUTUMN EDIT / 2026</p><h1>Clothes with<br/><em>conviction.</em></h1><Link className="button light" to="/shop">Explore the collection</Link></div></section><section className="intro"><p>Quiet confidence, considered construction and pieces that stay in rotation. OxStore curates a modern wardrobe for every version of your day.</p></section><section className="section"><div className="section-title"><h2>New arrivals</h2><Link to="/shop">View all →</Link></div>{offline&&!products.length?<p className="empty">The storefront is running, but the OxStore API is connecting. Loading collection…</p>:<div className="grid">{products.map(p=><ProductCard product={p} key={p._id}/>)}</div>}</section></>;
}
