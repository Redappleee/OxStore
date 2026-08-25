import {useEffect,useState} from 'react';import {useSearchParams} from 'react-router-dom';import api from '../api';import ProductCard from '../components/ProductCard';
export default function Shop(){
  const [search,setSearch]=useSearchParams();
  const getCached=()=>{ try{ return JSON.parse(localStorage.getItem('oxstore_cached_shop_data')||'{"products":[],"pages":1}'); }catch{ return {products:[],pages:1}; } };
  const [data,setData]=useState(getCached);
  const [offline,setOffline]=useState(false);
  const [filters,setFilters]=useState({q:search.get('q')||'',category:'',gender:'',sort:'newest',page:1});

  useEffect(()=>{
    api.get('/products',{params:filters}).then(r=>{
      setData(r.data);
      setOffline(false);
      try{ localStorage.setItem('oxstore_cached_shop_data',JSON.stringify(r.data)); }catch{}
      setSearch(filters.q?{q:filters.q}:{});
    }).catch(()=>{
      if(!getCached().products?.length) setOffline(true);
    });
  },[filters,setSearch]);

  const change=(k,v)=>setFilters({...filters,[k]:v,page:1});

  return <main className="section"><div className="shop-head"><h1>The collection</h1><p>{data.total||0} pieces selected for you</p></div><div className="filters"><input value={filters.q} onChange={e=>change('q',e.target.value)} placeholder="Search"/><select value={filters.gender} onChange={e=>change('gender',e.target.value)}><option value="">All collections</option><option value="women">Women</option><option value="men">Men</option><option value="unisex">Unisex</option></select><select value={filters.sort} onChange={e=>change('sort',e.target.value)}><option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option></select></div>{offline&&!data.products.length?<p className="empty">Connecting to OxStore API…</p>:<><div className="grid">{data.products.map(p=><ProductCard key={p._id} product={p}/>)}</div>{!data.products.length&&<p className="empty">Nothing here yet. Try another search.</p>}</>}<div className="pagination">{Array.from({length:data.pages},(_,i)=><button className={filters.page===i+1?'selected':''} onClick={()=>change('page',i+1)} key={i}>{i+1}</button>)}</div></main>;
}
