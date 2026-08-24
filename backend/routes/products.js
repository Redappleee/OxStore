const router=require('express').Router(),Product=require('../models/Product'),cloudinary=require('../config/cloudinary'),upload=require('../middleware/upload'),{protect,admin}=require('../middleware/auth');
router.get('/suggest',async(req,res)=>{const q=(req.query.q||'').trim();if(q.length<2)return res.json([]);res.json(await Product.find({name:{$regex:q,$options:'i'}}).select('name images price').limit(6))});
router.get('/',async(req,res)=>{const {q,category,gender,minPrice,maxPrice,sort='newest',page=1,limit=12}=req.query,filter={};if(q)filter.$text={$search:q};if(category)filter.category=category;if(gender)filter.gender=gender;if(minPrice||maxPrice)filter.price={$gte:Number(minPrice)||0,$lte:Number(maxPrice)||Number.MAX_SAFE_INTEGER};const order={newest:{createdAt:-1},price_asc:{price:1},price_desc:{price:-1},rating:{rating:-1}}[sort]||{createdAt:-1};const skip=(Math.max(1,Number(page))-1)*Number(limit);const [products,total]=await Promise.all([Product.find(filter,q?{score:{$meta:'textScore'}}:{}).sort(q?{score:{$meta:'textScore'}}:order).skip(skip).limit(Number(limit)),Product.countDocuments(filter)]);res.json({products,total,page:Number(page),pages:Math.ceil(total/Number(limit))})});
router.get('/:id',async(req,res)=>{const product=await Product.findById(req.params.id);if(!product)return res.status(404).json({message:'Product not found'});res.json({product})});
const parseList=v=>{if(!v)return[];if(Array.isArray(v))return v;try{return JSON.parse(v)}catch{return String(v).split(',').map(s=>s.trim()).filter(Boolean)}};
router.post('/',protect,admin,upload.array('images',6),async(req,res)=>{const images=(req.files||[]).map(f=>({url:f.path,publicId:f.filename}));res.status(201).json({product:await Product.create({...req.body,images,sizes:parseList(req.body.sizes),colors:parseList(req.body.colors)})})});
router.patch('/:id',protect,admin,upload.array('images',6),async(req,res)=>{
  const product=await Product.findById(req.params.id);
  if(!product)return res.status(404).json({message:'Product not found'});
  const changes={...req.body};
  const toRemove=parseList(req.body.removeImages);
  if(toRemove.length){
    await Promise.all(toRemove.map(pid=>cloudinary.uploader.destroy(pid).catch(()=>{})));
    product.images=product.images.filter(img=>!toRemove.includes(img.publicId));
  }
  if(req.files?.length){
    const newImgs=req.files.map(f=>({url:f.path,publicId:f.filename}));
    product.images=[...product.images,...newImgs];
  }
  changes.images=product.images;
  for(const key of ['sizes','colors'])if(changes[key]!==undefined)changes[key]=parseList(changes[key]);
  delete changes.removeImages;
  Object.assign(product,changes);
  await product.save();
  res.json({product});
});
router.delete('/:id',protect,admin,async(req,res)=>{const product=await Product.findByIdAndDelete(req.params.id);if(!product)return res.status(404).json({message:'Product not found'});await Promise.all(product.images.map(i=>cloudinary.uploader.destroy(i.publicId)));res.status(204).end()});
module.exports=router;
