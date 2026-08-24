const multer=require('multer'),{CloudinaryStorage}=require('multer-storage-cloudinary'),cloudinary=require('../config/cloudinary');
const storage=new CloudinaryStorage({cloudinary,params:{folder:'oxstore/products',allowed_formats:['jpg','jpeg','png','webp']}});
module.exports=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>cb(null,file.mimetype.startsWith('image/'))});
