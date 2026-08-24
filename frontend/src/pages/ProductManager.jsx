import {useEffect,useState,useRef} from 'react';import api from '../api';import {inr} from '../fmt';

const blank={name:'',description:'',price:'',category:'',stock:'',gender:'unisex',sizes:'',colors:''};

function toFormValues(p){
  return {
    name:p.name||'',
    description:p.description||'',
    price:p.price||'',
    category:p.category||'',
    stock:p.stock||'',
    gender:p.gender||'unisex',
    sizes:(p.sizes||[]).join(', '),
    colors:(p.colors||[]).join(', '),
  };
}

export default function ProductManager(){
  const [products,setProducts]=useState([]);
  const [form,setForm]=useState(blank);
  const [files,setFiles]=useState();
  const [message,setMessage]=useState('');

  // edit modal state
  const [editProduct,setEditProduct]=useState(null);
  const [editForm,setEditForm]=useState(blank);
  const [removedIds,setRemovedIds]=useState([]); // publicIds marked for deletion
  const [newFiles,setNewFiles]=useState([]);      // File objects to add
  const [newPreviews,setNewPreviews]=useState([]); // object-URL previews
  const [editMessage,setEditMessage]=useState('');
  const [editLoading,setEditLoading]=useState(false);
  const modalRef=useRef();

  const load=()=>api.get('/products',{params:{limit:100}}).then(r=>setProducts(r.data.products));
  useEffect(()=>{load();},[]);

  // Revoke preview URLs on cleanup
  useEffect(()=>()=>newPreviews.forEach(URL.revokeObjectURL),[newPreviews]);

  // Close modal on outside click
  useEffect(()=>{
    if(!editProduct) return;
    const handler=(e)=>{if(modalRef.current&&!modalRef.current.contains(e.target))closeEdit();};
    document.addEventListener('mousedown',handler);
    return ()=>document.removeEventListener('mousedown',handler);
  },[editProduct]);

  // Lock body scroll when modal open
  useEffect(()=>{
    document.body.style.overflow=editProduct?'hidden':'';
    return ()=>{document.body.style.overflow='';};
  },[editProduct]);

  const openEdit=(p)=>{
    setEditProduct(p);
    setEditForm(toFormValues(p));
    setRemovedIds([]);
    setNewFiles([]);
    setNewPreviews([]);
    setEditMessage('');
  };
  const closeEdit=()=>{
    setEditProduct(null);
    setEditForm(blank);
    setRemovedIds([]);
    setNewFiles([]);
    newPreviews.forEach(URL.revokeObjectURL);
    setNewPreviews([]);
    setEditMessage('');
  };

  const toggleRemove=(publicId)=>{
    setRemovedIds(prev=>
      prev.includes(publicId)?prev.filter(id=>id!==publicId):[...prev,publicId]
    );
  };

  const handleAddFiles=(e)=>{
    const picked=Array.from(e.target.files||[]);
    const previews=picked.map(f=>URL.createObjectURL(f));
    setNewFiles(prev=>[...prev,...picked]);
    setNewPreviews(prev=>[...prev,...previews]);
    e.target.value=''; // allow re-selecting same file
  };

  const removeNewFile=(idx)=>{
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles(prev=>prev.filter((_,i)=>i!==idx));
    setNewPreviews(prev=>prev.filter((_,i)=>i!==idx));
  };

  const submitNew=async e=>{
    e.preventDefault();
    const body=new FormData();
    Object.entries(form).forEach(([k,v])=>body.append(k,['sizes','colors'].includes(k)?JSON.stringify(v.split(',').map(x=>x.trim()).filter(Boolean)):v));
    [...(files||[])].forEach(f=>body.append('images',f));
    try{await api.post('/products',body);setForm(blank);setFiles(null);setMessage('✓ Product published.');load();}
    catch(e){setMessage(e.response?.data?.message||'Unable to publish product');}
  };

  const submitEdit=async e=>{
    e.preventDefault();
    // Guard: don't allow removing all images unless new ones are being added
    const remainingExisting=(editProduct.images||[]).filter(img=>!removedIds.includes(img.publicId));
    if(remainingExisting.length===0&&newFiles.length===0){
      setEditMessage('A product must have at least one image.');
      return;
    }
    setEditLoading(true);setEditMessage('');
    const body=new FormData();
    Object.entries(editForm).forEach(([k,v])=>body.append(k,['sizes','colors'].includes(k)?JSON.stringify(v.split(',').map(x=>x.trim()).filter(Boolean)):v));
    body.append('removeImages',JSON.stringify(removedIds));
    newFiles.forEach(f=>body.append('images',f));
    try{
      await api.patch(`/products/${editProduct._id}`,body);
      setEditMessage('✓ Product updated.');
      load();
      setTimeout(closeEdit,900);
    }catch(e){setEditMessage(e.response?.data?.message||'Unable to update product');}
    finally{setEditLoading(false);}
  };

  const fieldLabel=(k)=>k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());

  return(
    <main className="section">
      <h1>Product manager</h1>

      {/* ── Add product form ── */}
      <form className="product-form" onSubmit={submitNew}>
        {Object.entries(form).map(([k,v])=>(
          <input key={k} required={!['sizes','colors'].includes(k)} value={v}
            type={['price','stock'].includes(k)?'number':'text'}
            placeholder={fieldLabel(k)}
            onChange={e=>setForm({...form,[k]:e.target.value})}/>
        ))}
        <input type="file" multiple accept="image/*" onChange={e=>setFiles(e.target.files)} required/>
        <button className="button">Publish product</button>
        {message&&<p style={{color:message.startsWith('✓')?'green':'red',margin:0}}>{message}</p>}
      </form>

      {/* ── Product list ── */}
      <div className="admin-products">
        {products.map(p=>(
          <div key={p._id}>
            <img src={p.images?.[0]?.url} alt=""/>
            <span>{p.name}<small>{inr(p.price)} · {p.stock} in stock</small></span>
            <button className="link" style={{marginRight:16}} onClick={()=>openEdit(p)}>Edit</button>
            <button className="link" onClick={async()=>{if(window.confirm(`Delete ${p.name}?`)){await api.delete(`/products/${p._id}`);load();}}}>Delete</button>
          </div>
        ))}
      </div>

      {/* ── Edit modal ── */}
      {editProduct&&(
        <div style={styles.overlay}>
          <div style={styles.modal} ref={modalRef}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit product</h2>
              <button style={styles.closeBtn} onClick={closeEdit} aria-label="Close">✕</button>
            </div>

            {/* ── Image management section ── */}
            <div style={{marginBottom:24}}>
              <p style={styles.sectionLabel}>Current images</p>
              <div style={styles.imgGrid}>
                {/* Existing images */}
                {(editProduct.images||[]).map((img)=>{
                  const marked=removedIds.includes(img.publicId);
                  return(
                    <div key={img.publicId} style={styles.imgWrap}>
                      <img src={img.url} alt="" style={{...styles.thumb,opacity:marked?0.3:1,outline:marked?'2px solid #c0392b':'none'}}/>
                      <button
                        type="button"
                        onClick={()=>toggleRemove(img.publicId)}
                        style={{...styles.imgBtn,background:marked?'#c0392b':'rgba(0,0,0,0.55)'}}
                        title={marked?'Undo remove':'Remove image'}>
                        {marked?'↩':'✕'}
                      </button>
                      {marked&&<span style={styles.removedBadge}>Will be removed</span>}
                    </div>
                  );
                })}

                {/* New image previews */}
                {newPreviews.map((src,i)=>(
                  <div key={`new-${i}`} style={styles.imgWrap}>
                    <img src={src} alt="" style={{...styles.thumb,outline:'2px solid #2ecc71'}}/>
                    <button type="button" onClick={()=>removeNewFile(i)} style={{...styles.imgBtn,background:'rgba(0,0,0,0.55)'}} title="Remove">✕</button>
                    <span style={{...styles.removedBadge,background:'#2ecc71',color:'#fff'}}>New</span>
                  </div>
                ))}

                {/* Add images button */}
                <label style={styles.addImgBox} title="Add images">
                  <span style={{fontSize:28,lineHeight:1,color:'var(--muted)'}}>+</span>
                  <span style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Add images</span>
                  <input type="file" multiple accept="image/*" onChange={handleAddFiles} style={{display:'none'}}/>
                </label>
              </div>
              <p style={{fontSize:11,color:'var(--muted)',margin:'8px 0 0'}}>
                Click ✕ on an image to mark it for removal. Click ↩ to undo. Images with a green border are newly added.
              </p>
            </div>

            {/* ── Text fields ── */}
            <form onSubmit={submitEdit} style={styles.editGrid}>
              {Object.entries(editForm).map(([k,v])=>(
                <div key={k} style={['description'].includes(k)?{gridColumn:'1/-1'}:{}}>
                  <label style={styles.label}>{fieldLabel(k)}</label>
                  {k==='description'
                    ?<textarea value={v} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={styles.textarea} rows={3}/>
                    :<input value={v} type={['price','stock'].includes(k)?'number':'text'}
                        style={styles.input}
                        onChange={e=>setEditForm({...editForm,[k]:e.target.value})}/>
                  }
                </div>
              ))}
              {editMessage&&<p style={{gridColumn:'1/-1',color:editMessage.startsWith('✓')?'green':'#c0392b',margin:0,fontSize:13}}>{editMessage}</p>}
              <div style={{gridColumn:'1/-1',display:'flex',gap:12,marginTop:8}}>
                <button className="button" disabled={editLoading} style={{flex:1}}>
                  {editLoading?'Saving…':'Save changes'}
                </button>
                <button type="button" className="button" onClick={closeEdit}
                  style={{flex:1,background:'transparent',color:'var(--ink)',border:'1px solid var(--line)'}}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const styles={
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'},
  modal:{background:'var(--paper)',width:'100%',maxWidth:740,maxHeight:'90vh',overflowY:'auto',padding:'32px',boxShadow:'0 24px 80px rgba(0,0,0,0.25)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{font:"26px 'Playfair Display'",margin:0},
  closeBtn:{border:0,background:'none',fontSize:20,cursor:'pointer',color:'var(--muted)',lineHeight:1},
  sectionLabel:{fontSize:11,letterSpacing:'0.8px',textTransform:'uppercase',color:'var(--muted)',margin:'0 0 10px'},
  imgGrid:{display:'flex',flexWrap:'wrap',gap:10,alignItems:'flex-start'},
  imgWrap:{position:'relative',flexShrink:0},
  thumb:{width:72,height:90,objectFit:'cover',background:'#e8e5e0',display:'block'},
  imgBtn:{position:'absolute',top:4,right:4,border:0,borderRadius:'50%',width:22,height:22,cursor:'pointer',color:'#fff',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1},
  removedBadge:{position:'absolute',bottom:0,left:0,right:0,background:'rgba(192,57,43,0.85)',color:'#fff',fontSize:9,textAlign:'center',padding:'2px 0',letterSpacing:'0.5px'},
  addImgBox:{width:72,height:90,border:'1px dashed var(--line)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,background:'transparent'},
  editGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px 24px'},
  label:{display:'block',fontSize:11,letterSpacing:'0.8px',textTransform:'uppercase',color:'var(--muted)',marginBottom:5},
  input:{width:'100%',border:0,borderBottom:'1px solid var(--line)',background:'transparent',padding:'9px 0',outline:'none',fontSize:14},
  textarea:{width:'100%',border:'1px solid var(--line)',background:'transparent',padding:'9px',outline:'none',fontSize:14,resize:'vertical',fontFamily:'inherit'},
};
